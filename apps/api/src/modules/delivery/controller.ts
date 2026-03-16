import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../middleware/error-handling';

interface CreateDeliveryBody {
  reservationId: string;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryNotes?: string;
}

// Create delivery request
export async function createDelivery(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateDeliveryBody;
  const user = (req as any).user;
  const db = getDb();

  // Verify reservation
  const reservation = await db('reservations').where({ id: body.reservationId }).first();
  if (!reservation) {
    throw NotFoundError('Reservation');
  }

  if (reservation.user_id !== user.userId) {
    throw ForbiddenError('You do not have permission to create delivery for this reservation');
  }

  if (reservation.status !== 'CONFIRMED') {
    throw BadRequestError('Reservation must be confirmed before requesting delivery');
  }

  // Check if delivery already exists
  const existingDelivery = await db('deliveries').where({ reservation_id: body.reservationId }).first();
  if (existingDelivery) {
    throw BadRequestError('Delivery already exists for this reservation');
  }

  // Get pharmacy address
  const pharmacy = await db('pharmacies').where({ id: reservation.pharmacy_id }).first();
  if (!pharmacy) {
    throw NotFoundError('Pharmacy');
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Create delivery
  const deliveryId = uuidv4();
  await db.raw(`
    INSERT INTO deliveries (
      id, reservation_id, status, pickup_address, delivery_address,
      delivery_location, otp, created_at, updated_at
    ) VALUES (
      ?, ?, 'PENDING', ?, ?,
      ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
      ?, NOW(), NOW()
    )
  `, [
    deliveryId,
    body.reservationId,
    `${pharmacy.address}, ${pharmacy.city}, ${pharmacy.state} - ${pharmacy.pincode}`,
    body.deliveryAddress,
    body.deliveryLongitude,
    body.deliveryLatitude,
    otp,
  ]);

  // Update delivery notes if provided
  if (body.deliveryNotes) {
    await db('deliveries').where({ id: deliveryId }).update({ delivery_notes: body.deliveryNotes });
  }

  const delivery = await db('deliveries').where({ id: deliveryId }).first();

  res.status(201).json({
    success: true,
    data: {
      delivery: {
        id: delivery.id,
        reservationId: delivery.reservation_id,
        status: delivery.status,
        pickupAddress: delivery.pickup_address,
        deliveryAddress: delivery.delivery_address,
        otp: otp, // Only show to user who created
      },
    },
  });
}

// Get my deliveries (User)
export async function getMyDeliveries(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { status, page = 1, limit = 20 } = req.query as any;
  const db = getDb();

  let query = db('deliveries as d')
    .join('reservations as r', 'd.reservation_id', 'r.id')
    .join('pharmacies as p', 'r.pharmacy_id', 'p.id')
    .select([
      'd.id',
      'd.status',
      'd.pickup_address',
      'd.delivery_address',
      'd.estimated_delivery_at',
      'd.created_at',
      'p.id as pharmacy_id',
      'p.name as pharmacy_name',
    ])
    .where('r.user_id', user.userId)
    .orderBy('d.created_at', 'desc');

  if (status) {
    query = query.where('d.status', status);
  }

  const [{ count }] = await query.clone().count('d.id as count');
  const total = Number(count);

  const deliveries = await query.limit(limit).offset((page - 1) * limit);

  res.json({
    success: true,
    data: {
      deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    },
  });
}

// Get available deliveries for riders
export async function getAvailableDeliveries(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { page = 1, limit = 20 } = req.query as any;
  const db = getDb();

  // Get pending deliveries that haven't been assigned
  const deliveries = await db('deliveries as d')
    .join('reservations as r', 'd.reservation_id', 'r.id')
    .join('pharmacies as p', 'r.pharmacy_id', 'p.id')
    .select([
      'd.id',
      'd.pickup_address',
      'd.created_at',
      'p.id as pharmacy_id',
      'p.name as pharmacy_name',
      'p.address as pharmacy_address',
      'p.phone as pharmacy_phone',
      db.raw('ST_AsGeoJSON(p.location)::json as pharmacy_location'),
    ])
    .where('d.status', 'PENDING')
    .whereNull('d.rider_id')
    .orderBy('d.created_at', 'asc')
    .limit(limit)
    .offset((page - 1) * limit);

  res.json({
    success: true,
    data: { deliveries },
  });
}

// Accept delivery (Rider)
export async function acceptDelivery(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  const db = getDb();

  const delivery = await db('deliveries').where({ id }).first();
  if (!delivery) {
    throw NotFoundError('Delivery');
  }

  if (delivery.status !== 'PENDING') {
    throw BadRequestError('Delivery is not available');
  }

  if (delivery.rider_id) {
    throw BadRequestError('Delivery already assigned');
  }

  // Assign to rider
  await db('deliveries').where({ id }).update({
    rider_id: user.userId,
    status: 'ASSIGNED',
    updated_at: new Date(),
  });

  // Get full delivery details
  const updatedDelivery = await db('deliveries as d')
    .join('reservations as r', 'd.reservation_id', 'r.id')
    .join('pharmacies as p', 'r.pharmacy_id', 'p.id')
    .join('users as u', 'r.user_id', 'u.id')
    .select([
      'd.*',
      'p.name as pharmacy_name',
      'p.phone as pharmacy_phone',
      'u.name as customer_name',
      'u.phone as customer_phone',
    ])
    .where('d.id', id)
    .first();

  res.json({
    success: true,
    data: {
      delivery: {
        id: updatedDelivery.id,
        status: updatedDelivery.status,
        pickupAddress: updatedDelivery.pickup_address,
        deliveryAddress: updatedDelivery.delivery_address,
        otp: updatedDelivery.otp,
        pharmacy: {
          name: updatedDelivery.pharmacy_name,
          phone: updatedDelivery.pharmacy_phone,
        },
        customer: {
          name: updatedDelivery.customer_name,
          phone: updatedDelivery.customer_phone,
        },
      },
    },
  });
}

// Update rider location
export async function updateRiderLocation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { latitude, longitude } = req.body;
  const user = (req as any).user;
  const db = getDb();

  const delivery = await db('deliveries').where({ id }).first();
  if (!delivery) {
    throw NotFoundError('Delivery');
  }

  if (delivery.rider_id !== user.userId) {
    throw ForbiddenError('You are not assigned to this delivery');
  }

  // Store location update
  await db.raw(`
    INSERT INTO delivery_tracking (delivery_id, rider_location, recorded_at)
    VALUES (?, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, NOW())
  `, [id, longitude, latitude]);

  res.json({ success: true });
}

// Pickup delivery (Rider)
export async function pickupDelivery(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  const db = getDb();

  const delivery = await db('deliveries').where({ id }).first();
  if (!delivery) {
    throw NotFoundError('Delivery');
  }

  if (delivery.rider_id !== user.userId) {
    throw ForbiddenError('You are not assigned to this delivery');
  }

  if (delivery.status !== 'ASSIGNED') {
    throw BadRequestError('Delivery must be in ASSIGNED status to pickup');
  }

  await db('deliveries').where({ id }).update({
    status: 'PICKED_UP',
    updated_at: new Date(),
  });

  res.json({
    success: true,
    data: { message: 'Delivery picked up' },
  });
}

// Complete delivery (Rider)
export async function completeDelivery(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  const db = getDb();

  const delivery = await db('deliveries').where({ id }).first();
  if (!delivery) {
    throw NotFoundError('Delivery');
  }

  if (delivery.rider_id !== user.userId) {
    throw ForbiddenError('You are not assigned to this delivery');
  }

  if (delivery.status !== 'IN_TRANSIT') {
    throw BadRequestError('Delivery must be in IN_TRANSIT status to complete');
  }

  await db('deliveries').where({ id }).update({
    status: 'DELIVERED',
    actual_delivery_at: new Date(),
    updated_at: new Date(),
  });

  // Update reservation status
  await db('reservations').where({ id: delivery.reservation_id }).update({
    status: 'COMPLETED',
    completed_at: new Date(),
  });

  res.json({
    success: true,
    data: { message: 'Delivery completed' },
  });
}

// Get delivery details
export async function getDeliveryById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  const db = getDb();

  const delivery = await db('deliveries as d')
    .join('reservations as r', 'd.reservation_id', 'r.id')
    .join('pharmacies as p', 'r.pharmacy_id', 'p.id')
    .leftJoin('users as rider', 'd.rider_id', 'rider.id')
    .select([
      'd.*',
      'p.name as pharmacy_name',
      'p.phone as pharmacy_phone',
      'p.address as pharmacy_address',
      'rider.name as rider_name',
      'rider.phone as rider_phone',
    ])
    .where('d.id', id)
    .first();

  if (!delivery) {
    throw NotFoundError('Delivery');
  }

  // Verify access
  const isCustomer = delivery.reservation_id && await db('reservations').where({ id: delivery.reservation_id, user_id: user.userId }).first();
  const isRider = delivery.rider_id === user.userId;
  const isPharmacyOwner = await db('pharmacies').where({ id: delivery.pharmacy_id, owner_id: user.userId }).first();

  if (!isCustomer && !isRider && !isPharmacyOwner) {
    throw ForbiddenError('You do not have access to this delivery');
  }

  res.json({
    success: true,
    data: { delivery },
  });
}

// Cancel delivery
export async function cancelDelivery(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  const db = getDb();

  const delivery = await db('deliveries').where({ id }).first();
  if (!delivery) {
    throw NotFoundError('Delivery');
  }

  if (!['PENDING', 'ASSIGNED'].includes(delivery.status)) {
    throw BadRequestError('Cannot cancel delivery in current status');
  }

  await db('deliveries').where({ id }).update({
    status: 'CANCELLED',
    updated_at: new Date(),
  });

  res.json({
    success: true,
    data: { message: 'Delivery cancelled' },
  });
}

// Track delivery
export async function trackDelivery(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const db = getDb();

  const delivery = await db('deliveries').where({ id }).first();
  if (!delivery) {
    throw NotFoundError('Delivery');
  }

  // Get recent locations
  const locations = await db('delivery_tracking')
    .select([
      db.raw('ST_AsGeoJSON(rider_location)::json as location'),
      'recorded_at',
    ])
    .where({ delivery_id: id })
    .orderBy('recorded_at', 'desc')
    .limit(50);

  res.json({
    success: true,
    data: {
      delivery: {
        id: delivery.id,
        status: delivery.status,
      },
      tracking: locations.map(l => ({
        location: l.location,
        recordedAt: l.recorded_at,
      })),
    },
  });
}