import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../middleware/error-handling';

interface CreatePharmacyBody {
  name: string;
  description?: string;
  phone: string;
  email?: string;
  address: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  licenseNumber: string;
  deliveryAvailable?: boolean;
  deliveryRadius?: number;
}

interface UpdatePharmacyBody extends Partial<CreatePharmacyBody> {}

// Create pharmacy (Pharmacy Owner)
export async function createPharmacy(req: Request, res: Response): Promise<void> {
  const body = req.body as CreatePharmacyBody;
  const user = (req as any).user;
  const db = getDb();

  // Check if user already has a pharmacy
  const existingPharmacy = await db('pharmacies').where({ owner_id: user.userId }).first();
  if (existingPharmacy) {
    throw BadRequestError('You already have a registered pharmacy');
  }

  const pharmacyId = uuidv4();

  // Create pharmacy with PostGIS location
  await db.raw(`
    INSERT INTO pharmacies (
      id, owner_id, name, description, phone, email, address, landmark,
      city, state, pincode, location, license_number, verification_status,
      is_operational, delivery_available, delivery_radius_km
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
      ?, 'PENDING', true, ?, ?
    )
  `, [
    pharmacyId,
    user.userId,
    body.name,
    body.description || null,
    body.phone,
    body.email || null,
    body.address,
    body.landmark || null,
    body.city,
    body.state,
    body.pincode,
    body.longitude,
    body.latitude,
    body.licenseNumber,
    body.deliveryAvailable ?? false,
    body.deliveryRadius ?? null,
  ]);

  // Create default operating hours (9 AM - 9 PM)
  const days = [0, 1, 2, 3, 4, 5, 6];
  for (const day of days) {
    await db('pharmacy_hours').insert({
      id: uuidv4(),
      pharmacy_id: pharmacyId,
      day_of_week: day,
      open_time: '09:00',
      close_time: '21:00',
      is_24_hours: false,
      is_closed: day === 0, // Sunday closed by default
    });
  }

  const pharmacy = await db('pharmacies').where({ id: pharmacyId }).first();

  res.status(201).json({
    success: true,
    data: {
      pharmacy: {
        id: pharmacy.id,
        name: pharmacy.name,
        phone: pharmacy.phone,
        address: pharmacy.address,
        city: pharmacy.city,
        state: pharmacy.state,
        pincode: pharmacy.pincode,
        verificationStatus: pharmacy.verification_status,
      },
    },
  });
}

// Update pharmacy
export async function updatePharmacy(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const body = req.body as UpdatePharmacyBody;
  const user = (req as any).user;
  const db = getDb();

  const pharmacy = await db('pharmacies').where({ id }).first();
  if (!pharmacy) {
    throw NotFoundError('Pharmacy');
  }

  if (pharmacy.owner_id !== user.userId) {
    throw ForbiddenError('You do not have permission to update this pharmacy');
  }

  const updates: Record<string, any> = { updated_at: new Date() };

  if (body.name) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description || null;
  if (body.phone) updates.phone = body.phone;
  if (body.email !== undefined) updates.email = body.email || null;
  if (body.address) updates.address = body.address;
  if (body.landmark !== undefined) updates.landmark = body.landmark || null;
  if (body.city) updates.city = body.city;
  if (body.state) updates.state = body.state;
  if (body.pincode) updates.pincode = body.pincode;
  if (body.deliveryAvailable !== undefined) updates.delivery_available = body.deliveryAvailable;
  if (body.deliveryRadius !== undefined) updates.delivery_radius_km = body.deliveryRadius;

  if (body.latitude !== undefined && body.longitude !== undefined) {
    await db.raw(`
      UPDATE pharmacies
      SET location = ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, updated_at = NOW()
      WHERE id = ?
    `, [body.longitude, body.latitude, id]);
  }

  if (Object.keys(updates).length > 1) {
    await db('pharmacies').where({ id }).update(updates);
  }

  const updatedPharmacy = await db('pharmacies').where({ id }).first();

  res.json({
    success: true,
    data: { pharmacy: updatedPharmacy },
  });
}

// Get pharmacy by ID
export async function getPharmacyById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const db = getDb();

  const pharmacy = await db('pharmacies')
    .select([
      '*',
      db.raw('ST_AsGeoJSON(location)::json as location'),
    ])
    .where({ id })
    .first();

  if (!pharmacy) {
    throw NotFoundError('Pharmacy');
  }

  // Get operating hours
  const hours = await db('pharmacy_hours')
    .where({ pharmacy_id: id })
    .orderBy('day_of_week');

  res.json({
    success: true,
    data: {
      pharmacy: {
        id: pharmacy.id,
        name: pharmacy.name,
        description: pharmacy.description,
        phone: pharmacy.phone,
        email: pharmacy.email,
        address: pharmacy.address,
        landmark: pharmacy.landmark,
        city: pharmacy.city,
        state: pharmacy.state,
        pincode: pharmacy.pincode,
        location: pharmacy.location,
        licenseNumber: pharmacy.license_number,
        verificationStatus: pharmacy.verification_status,
        isOperational: pharmacy.is_operational,
        deliveryAvailable: pharmacy.delivery_available,
        deliveryRadius: pharmacy.delivery_radius_km,
        rating: pharmacy.rating,
        totalRatings: pharmacy.total_ratings,
        operatingHours: hours.map(h => ({
          dayOfWeek: h.day_of_week,
          openTime: h.open_time,
          closeTime: h.close_time,
          is24Hours: h.is_24_hours,
          isClosed: h.is_closed,
        })),
      },
    },
  });
}

// Get operating hours
export async function getOperatingHours(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const db = getDb();

  const hours = await db('pharmacy_hours')
    .where({ pharmacy_id: id })
    .orderBy('day_of_week');

  res.json({
    success: true,
    data: { hours },
  });
}

// Set operating hours
export async function setOperatingHours(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { hours } = req.body as { hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; is24Hours: boolean; isClosed: boolean }> };
  const user = (req as any).user;
  const db = getDb();

  const pharmacy = await db('pharmacies').where({ id }).first();
  if (!pharmacy) {
    throw NotFoundError('Pharmacy');
  }

  if (pharmacy.owner_id !== user.userId) {
    throw ForbiddenError('You do not have permission to update this pharmacy');
  }

  // Delete existing hours and insert new ones
  await db.transaction(async (trx) => {
    await trx('pharmacy_hours').where({ pharmacy_id: id }).delete();

    for (const hour of hours) {
      await trx('pharmacy_hours').insert({
        id: uuidv4(),
        pharmacy_id: id,
        day_of_week: hour.dayOfWeek,
        open_time: hour.openTime,
        close_time: hour.closeTime,
        is_24_hours: hour.is24Hours,
        is_closed: hour.isClosed,
      });
    }
  });

  const updatedHours = await db('pharmacy_hours').where({ pharmacy_id: id }).orderBy('day_of_week');

  res.json({
    success: true,
    data: { hours: updatedHours },
  });
}

// Get my pharmacies (Pharmacy Owner)
export async function getMyPharmacies(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const db = getDb();

  const pharmacies = await db('pharmacies')
    .select([
      '*',
      db.raw('ST_AsGeoJSON(location)::json as location'),
    ])
    .where({ owner_id: user.userId });

  res.json({
    success: true,
    data: { pharmacies },
  });
}

// Search pharmacies
export async function searchPharmacies(req: Request, res: Response): Promise<void> {
  const params = req.query as unknown as {
    latitude: number;
    longitude: number;
    radius: number;
    open?: boolean;
    delivery?: boolean;
    page: number;
    limit: number;
  };

  const db = getDb();
  const offset = (params.page - 1) * params.limit;

  let query = db('pharmacies')
    .select([
      'id',
      'name',
      'phone',
      'address',
      'city',
      'state',
      'pincode',
      'rating',
      'delivery_available',
      db.raw('ST_AsGeoJSON(location)::json as location'),
      db.raw(`ST_Distance(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) / 1000 as distance_km`, [params.longitude, params.latitude]),
    ])
    .where('verification_status', 'APPROVED')
    .where('is_operational', true)
    .whereRaw(`ST_DWithin(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)`, [params.longitude, params.latitude, params.radius * 1000]);

  if (params.delivery) {
    query = query.where('delivery_available', true);
  }

  const [{ count }] = await query.clone().count('id as count');
  const total = Number(count);

  const pharmacies = await query.orderBy('distance_km', 'asc').limit(params.limit).offset(offset);

  res.json({
    success: true,
    data: {
      pharmacies,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
        hasMore: params.page * params.limit < total,
      },
    },
  });
}

// Verify pharmacy (Admin)
export async function verifyPharmacy(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  const user = (req as any).user;
  const db = getDb();

  const pharmacy = await db('pharmacies').where({ id }).first();
  if (!pharmacy) {
    throw NotFoundError('Pharmacy');
  }

  if (pharmacy.verification_status !== 'PENDING') {
    throw BadRequestError('Pharmacy is not in PENDING status');
  }

  const updates: Record<string, any> = {
    verification_status: status,
    verified_by: user.userId,
    verified_at: new Date(),
    updated_at: new Date(),
  };

  if (status === 'REJECTED' && rejectionReason) {
    updates.rejection_reason = rejectionReason;
  }

  await db('pharmacies').where({ id }).update(updates);

  res.json({
    success: true,
    data: { message: `Pharmacy ${status.toLowerCase()}` },
  });
}

// Get all pharmacies (Admin)
export async function getAllPharmacies(req: Request, res: Response): Promise<void> {
  const { status, city, page = 1, limit = 20 } = req.query as { status?: string; city?: string; page: number; limit: number };
  const db = getDb();

  let query = db('pharmacies').select([
    '*',
    db.raw('ST_AsGeoJSON(location)::json as location'),
  ]);

  if (status) {
    query = query.where('verification_status', status);
  }

  if (city) {
    query = query.where('city', 'ilike', city);
  }

  const [{ count }] = await query.clone().count('id as count');
  const total = Number(count);

  const pharmacies = await query.orderBy('created_at', 'desc').limit(limit).offset((page - 1) * limit);

  res.json({
    success: true,
    data: {
      pharmacies,
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