import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../config/database';
import { getRedis } from '../../config/redis';
import { NotFoundError, BadRequestError, ConflictError } from '../../middleware/error-handling';

interface CreateReservationBody {
  pharmacyId: string;
  items: Array<{
    inventoryId: string;
    quantity: number;
  }>;
  notes?: string;
}

// Create a reservation with stock hold
export async function createReservation(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateReservationBody;
  const user = (req as any).user;
  const db = getDb();
  const redis = getRedis();

  // Verify pharmacy exists and is operational
  const pharmacy = await db('pharmacies')
    .where({ id: body.pharmacyId, verification_status: 'APPROVED', is_operational: true })
    .first();

  if (!pharmacy) {
    throw NotFoundError('Pharmacy');
  }

  // Verify all inventory items exist and have sufficient stock
  const inventoryItems = await db('inventory')
    .whereIn('id', body.items.map(i => i.inventoryId))
    .where('pharmacy_id', body.pharmacyId)
    .where('is_active', true);

  if (inventoryItems.length !== body.items.length) {
    throw BadRequestError('One or more inventory items not found');
  }

  // Check stock availability (including existing holds)
  for (const item of body.items) {
    const inventory = inventoryItems.find(i => i.id === item.inventoryId);
    if (!inventory || inventory.quantity < item.quantity) {
      throw BadRequestError(`Insufficient stock for item ${item.inventoryId}`);
    }

    // Check existing holds
    const holdsKey = `stock_holds:${item.inventoryId}`;
    const heldQuantity = await redis.get(holdsKey);
    const totalHeld = heldQuantity ? parseInt(heldQuantity) : 0;

    if (inventory.quantity - totalHeld < item.quantity) {
      throw ConflictError(`Not enough available stock for item ${item.inventoryId}. Some stock may be reserved.`);
    }
  }

  // Calculate total and create reservation
  const reservationId = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await db.transaction(async (trx) => {
    // Create reservation
    await trx('reservations').insert({
      id: reservationId,
      user_id: user.userId,
      pharmacy_id: body.pharmacyId,
      status: 'PENDING',
      notes: body.notes || null,
      expires_at: expiresAt,
    });

    let totalAmount = 0;

    // Create reservation items and hold stock
    for (const item of body.items) {
      const inventory = inventoryItems.find(i => i.id === item.inventoryId)!;
      const subtotal = inventory.price * item.quantity;
      totalAmount += subtotal;

      await trx('reservation_items').insert({
        id: uuidv4(),
        reservation_id: reservationId,
        inventory_id: item.inventoryId,
        medicine_id: inventory.medicine_id,
        quantity: item.quantity,
        price: inventory.price,
        subtotal,
      });

      // Create stock hold
      await trx('stock_holds').insert({
        id: uuidv4(),
        inventory_id: item.inventoryId,
        reservation_id: reservationId,
        quantity: item.quantity,
        expires_at: expiresAt,
      });

      // Update Redis hold counter
      const holdsKey = `stock_holds:${item.inventoryId}`;
      await redis.incrby(holdsKey, item.quantity);
      await redis.expire(holdsKey, 1800); // 30 minutes
    }

    // Update total amount
    await trx('reservations').where({ id: reservationId }).update({ total_amount: totalAmount });
  });

  // Set expiry in Redis for reservation
  await redis.setex(`reservation:${reservationId}`, 1800, 'active');

  const reservation = await db('reservations').where({ id: reservationId }).first();
  const items = await db('reservation_items').where({ reservation_id: reservationId });

  res.status(201).json({
    success: true,
    data: {
      reservation: {
        id: reservation.id,
        pharmacyId: reservation.pharmacy_id,
        status: reservation.status,
        totalAmount: reservation.total_amount,
        expiresAt: reservation.expires_at,
        items: items.map(i => ({
          id: i.id,
          inventoryId: i.inventory_id,
          medicineId: i.medicine_id,
          quantity: i.quantity,
          price: i.price,
          subtotal: i.subtotal,
        })),
      },
    },
  });
}

// Get user's reservations
export async function getMyReservations(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { status, page = 1, limit = 20 } = req.query as { status?: string; page?: number; limit?: number };
  const db = getDb();

  let query = db('reservations')
    .where('user_id', user.userId)
    .orderBy('created_at', 'desc');

  if (status) {
    query = query.where('status', status);
  }

  const [{ count }] = await query.clone().count('id as count');
  const total = Number(count);

  const reservations = await query.limit(limit).offset((page - 1) * limit);

  // Fetch items for each reservation
  const reservationIds = reservations.map(r => r.id);
  const allItems = await db('reservation_items')
    .whereIn('reservation_id', reservationIds)
    .join('medicines', 'reservation_items.medicine_id', 'medicines.id')
    .select('reservation_items.*', 'medicines.name as medicine_name');

  const itemsByReservation = allItems.reduce((acc, item) => {
    if (!acc[item.reservation_id]) acc[item.reservation_id] = [];
    acc[item.reservation_id].push({
      id: item.id,
      medicineId: item.medicine_id,
      medicineName: item.medicine_name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    });
    return acc;
  }, {} as Record<string, any[]>);

  res.json({
    success: true,
    data: {
      reservations: reservations.map(r => ({
        id: r.id,
        pharmacyId: r.pharmacy_id,
        status: r.status,
        totalAmount: r.total_amount,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
        items: itemsByReservation[r.id] || [],
      })),
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

// Get reservation by ID
export async function getReservationById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  const db = getDb();

  const reservation = await db('reservations')
    .where({ id })
    .first();

  if (!reservation) {
    throw NotFoundError('Reservation');
  }

  // Verify access
  if (reservation.user_id !== user.userId && reservation.pharmacy_id !== user.pharmacyId) {
    throw BadRequestError('Access denied');
  }

  const items = await db('reservation_items')
    .where('reservation_id', id)
    .join('medicines', 'reservation_items.medicine_id', 'medicines.id')
    .select('reservation_items.*', 'medicines.name as medicine_name', 'medicines.form', 'medicines.strength');

  const pharmacy = await db('pharmacies').where({ id: reservation.pharmacy_id }).first();

  res.json({
    success: true,
    data: {
      reservation: {
        id: reservation.id,
        pharmacyId: reservation.pharmacy_id,
        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.name,
          phone: pharmacy.phone,
          address: pharmacy.address,
        },
        status: reservation.status,
        totalAmount: reservation.total_amount,
        notes: reservation.notes,
        expiresAt: reservation.expires_at,
        createdAt: reservation.created_at,
        items: items.map(i => ({
          id: i.id,
          medicineId: i.medicine_id,
          medicineName: i.medicine_name,
          form: i.form,
          strength: i.strength,
          quantity: i.quantity,
          price: i.price,
          subtotal: i.subtotal,
        })),
      },
    },
  });
}

// Confirm reservation (Pharmacy Owner)
export async function confirmReservation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  const db = getDb();

  const reservation = await db('reservations').where({ id }).first();
  if (!reservation) {
    throw NotFoundError('Reservation');
  }

  if (reservation.status !== 'PENDING') {
    throw BadRequestError('Reservation is not in PENDING status');
  }

  // Update status
  await db('reservations')
    .where({ id })
    .update({
      status: 'CONFIRMED',
      confirmed_at: new Date(),
    });

  // Remove stock holds from Redis
  const holds = await db('stock_holds').where({ reservation_id: id });
  const redis = getRedis();

  for (const hold of holds) {
    await redis.del(`stock_holds:${hold.inventory_id}`);
  }

  // Release stock holds in database
  await db('stock_holds')
    .where({ reservation_id: id })
    .update({ released_at: new Date() });

  res.json({
    success: true,
    data: { message: 'Reservation confirmed' },
  });
}

// Cancel reservation
export async function cancelReservation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { notes } = req.body;
  const user = (req as any).user;
  const db = getDb();

  const reservation = await db('reservations').where({ id }).first();
  if (!reservation) {
    throw NotFoundError('Reservation');
  }

  if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) {
    throw BadRequestError('Cannot cancel this reservation');
  }

  // Update status
  await db('reservations')
    .where({ id })
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date(),
      cancellation_reason: notes || null,
    });

  // Release stock holds
  const holds = await db('stock_holds').where({ reservation_id: id });
  const redis = getRedis();

  for (const hold of holds) {
    await redis.del(`stock_holds:${hold.inventory_id}`);
  }

  await db('stock_holds')
    .where({ reservation_id: id })
    .update({ released_at: new_date() });

  // Restore inventory quantities
  for (const hold of holds) {
    await db('inventory')
      .where({ id: hold.inventory_id })
      .increment('quantity', hold.quantity);
  }

  res.json({
    success: true,
    data: { message: 'Reservation cancelled' },
  });
}

// Complete reservation (Pharmacy Owner)
export async function completeReservation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const db = getDb();

  const reservation = await db('reservations').where({ id }).first();
  if (!reservation) {
    throw NotFoundError('Reservation');
  }

  if (reservation.status !== 'CONFIRMED') {
    throw BadRequestError('Reservation must be CONFIRMED to complete');
  }

  await db('reservations')
    .where({ id })
    .update({
      status: 'COMPLETED',
      completed_at: new Date(),
    });

  res.json({
    success: true,
    data: { message: 'Reservation completed' },
  });
}

// Get pharmacy's reservations (Pharmacy Owner)
export async function getPharmacyReservations(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { status, page = 1, limit = 20 } = req.query as { status?: string; page?: number; limit?: number };
  const db = getDb();

  // Get pharmacy ID from user
  const pharmacy = await db('pharmacies').where({ owner_id: user.userId }).first();
  if (!pharmacy) {
    throw BadRequestError('No pharmacy associated with this account');
  }

  let query = db('reservations')
    .where('pharmacy_id', pharmacy.id)
    .orderBy('created_at', 'desc');

  if (status) {
    query = query.where('status', status);
  }

  const [{ count }] = await query.clone().count('id as count');
  const total = Number(count);

  const reservations = await query.limit(limit).offset((page - 1) * limit);

  // Get user details for each reservation
  const userIds = [...new Set(reservations.map(r => r.user_id))];
  const users = await db('users').whereIn('id', userIds).select('id', 'name', 'phone');

  res.json({
    success: true,
    data: {
      reservations: reservations.map(r => ({
        id: r.id,
        user: users.find(u => u.id === r.user_id),
        status: r.status,
        totalAmount: r.total_amount,
        notes: r.notes,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
      })),
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

// Extend reservation TTL
export async function extendReservation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  const db = getDb();
  const redis = getRedis();

  const reservation = await db('reservations').where({ id }).first();
  if (!reservation) {
    throw NotFoundError('Reservation');
  }

  if (reservation.user_id !== user.userId) {
    throw BadRequestError('Access denied');
  }

  if (reservation.status !== 'PENDING') {
    throw BadRequestError('Can only extend PENDING reservations');
  }

  // Extend by 15 minutes
  const newExpiresAt = new Date(reservation.expires_at.getTime() + 15 * 60 * 1000);

  await db('reservations')
    .where({ id })
    .update({ expires_at: newExpiresAt });

  // Extend stock holds
  await db('stock_holds')
    .where({ reservation_id: id })
    .update({ expires_at: newExpiresAt });

  // Extend Redis keys
  const holds = await db('stock_holds').where({ reservation_id: id });
  for (const hold of holds) {
    await redis.expire(`stock_holds:${hold.inventory_id}`, 900);
  }

  res.json({
    success: true,
    data: {
      message: 'Reservation extended',
      newExpiresAt,
    },
  });
}

function new_date(): Date {
  return new Date();
}