import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../middleware/error-handling';

interface PharmacySearchParams {
  latitude: number;
  longitude: number;
  radius: number;
  open?: boolean;
  delivery?: boolean;
  page: number;
  limit: number;
}

// Search for medicine availability across pharmacies
export async function searchMedicineAvailability(req: Request, res: Response): Promise<void> {
  const params = req.query as unknown as {
    q: string;
    latitude: number;
    longitude: number;
    radius: number;
    open?: boolean;
    hasStock?: boolean;
    delivery?: boolean;
    minPrice?: number;
    maxPrice?: number;
    sortBy: 'distance' | 'price' | 'rating';
    page: number;
    limit: number;
  };

  const db = getDb();
  const offset = (params.page - 1) * params.limit;

  // First, find the medicine
  const medicine = await db('medicines')
    .where('is_active', true)
    .whereRaw('LOWER(name) LIKE ?', [`%${params.q.toLowerCase()}%`])
    .orWhereRaw('LOWER(generic_name) LIKE ?', [`%${params.q.toLowerCase()}%`])
    .first();

  if (!medicine) {
    res.json({
      success: true,
      data: {
        medicine: null,
        pharmacies: [],
        pagination: { page: params.page, limit: params.limit, total: 0, totalPages: 0, hasMore: false },
      },
    });
    return;
  }

  // Build the query to find pharmacies with this medicine in stock
  // Using PostGIS for geospatial queries
  let query = db('pharmacies as p')
    .join('inventory as i', 'p.id', 'i.pharmacy_id')
    .join('pharmacy_hours as ph', 'p.id', 'ph.pharmacy_id')
    .select([
      'p.id',
      'p.name',
      'p.phone',
      'p.address',
      'p.city',
      'p.state',
      'p.pincode',
      'p.rating',
      'p.total_ratings',
      'p.delivery_available',
      'p.delivery_radius_km',
      'i.price',
      'i.mrp',
      'i.discount_percent',
      'i.quantity',
      db.raw('ST_AsGeoJSON(p.location)::json as location'),
      db.raw(`ST_Distance(
        p.location,
        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
      ) / 1000 as distance_km`, [params.longitude, params.latitude]),
    ])
    .where('i.medicine_id', medicine.id)
    .where('i.is_active', true)
    .where('i.quantity', '>', 0)
    .where('p.verification_status', 'APPROVED')
    .where('p.is_operational', true)
    .whereRaw(`ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
      ?
    )`, [params.longitude, params.latitude, params.radius * 1000]);

  // Apply filters
  if (params.open) {
    // Filter for open pharmacies - would need to check current time against operating hours
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    query = query
      .where('ph.day_of_week', dayOfWeek)
      .whereRaw(`(ph.is_24_hours = TRUE OR (
        ph.is_closed = FALSE AND
        ph.open_time <= ? AND
        ph.close_time >= ?
      ))`, [currentTime, currentTime]);
  }

  if (params.delivery) {
    query = query.where('p.delivery_available', true);
  }

  if (params.minPrice !== undefined) {
    query = query.where('i.price', '>=', params.minPrice);
  }

  if (params.maxPrice !== undefined) {
    query = query.where('i.price', '<=', params.maxPrice);
  }

  // Apply sorting
  switch (params.sortBy) {
    case 'price':
      query = query.orderBy('i.price', 'asc');
      break;
    case 'rating':
      query = query.orderBy('p.rating', 'desc');
      break;
    case 'distance':
    default:
      query = query.orderBy('distance_km', 'asc');
      break;
  }

  // Get total count
  const countQuery = query.clone();
  const [{ count }] = await countQuery.count('p.id as count');
  const total = Number(count);

  // Get paginated results
  const results = await query.limit(params.limit).offset(offset);

  res.json({
    success: true,
    data: {
      medicine: {
        id: medicine.id,
        name: medicine.name,
        genericName: medicine.generic_name,
        brandName: medicine.brand_name,
        form: medicine.form,
        strength: medicine.strength,
      },
      pharmacies: results.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        address: r.address,
        city: r.city,
        distance: Number(r.distance_km).toFixed(2),
        location: typeof r.location === 'string' ? JSON.parse(r.location) : r.location,
        rating: r.rating,
        totalRatings: r.total_ratings,
        deliveryAvailable: r.delivery_available,
        deliveryRadius: r.delivery_radius_km,
        inventory: {
          price: r.price,
          mrp: r.mrp,
          discountPercent: r.discount_percent,
          quantity: r.quantity,
        },
      })),
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

// Get nearby pharmacies
export async function getNearbyPharmacies(req: Request, res: Response): Promise<void> {
  const params = req.query as unknown as PharmacySearchParams & { open?: boolean };
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
      'total_ratings',
      'delivery_available',
      'delivery_radius_km',
      db.raw('ST_AsGeoJSON(location)::json as location'),
      db.raw(`ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
      ) / 1000 as distance_km`, [params.longitude, params.latitude]),
    ])
    .where('verification_status', 'APPROVED')
    .where('is_operational', true)
    .whereRaw(`ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
      ?
    )`, [params.longitude, params.latitude, params.radius * 1000])
    .orderBy('distance_km', 'asc');

  if (params.open) {
    // Join with pharmacy_hours to check if open
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    query = query
      .join('pharmacy_hours as ph', 'pharmacies.id', 'ph.pharmacy_id')
      .where('ph.day_of_week', dayOfWeek)
      .whereRaw(`(ph.is_24_hours = TRUE OR (
        ph.is_closed = FALSE AND
        ph.open_time <= ? AND
        ph.close_time >= ?
      ))`, [currentTime, currentTime]);
  }

  const [{ count }] = await query.clone().count('pharmacies.id as count');
  const total = Number(count);

  const pharmacies = await query.limit(params.limit).offset(offset);

  res.json({
    success: true,
    data: {
      pharmacies: pharmacies.map(p => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        address: p.address,
        city: p.city,
        distance: Number(p.distance_km).toFixed(2),
        location: typeof p.location === 'string' ? JSON.parse(p.location) : p.location,
        rating: p.rating,
        totalRatings: p.total_ratings,
        deliveryAvailable: p.delivery_available,
        deliveryRadius: p.delivery_radius_km,
      })),
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

// Emergency search with extended radius and 24/7 prioritization
export async function emergencySearch(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    q: string;
    latitude: number;
    longitude: number;
    radius?: number;
  };

  const db = getDb();

  // Use extended radius (up to 100km for emergencies)
  const searchRadius = Math.min(body.radius || 50, 100);

  // Find medicine
  const medicine = await db('medicines')
    .where('is_active', true)
    .whereRaw('LOWER(name) LIKE ?', [`%${body.q.toLowerCase()}%`])
    .orWhereRaw('LOWER(generic_name) LIKE ?', [`%${body.q.toLowerCase()}%`])
    .first();

  if (!medicine) {
    res.json({
      success: true,
      data: {
        medicine: null,
        pharmacies: [],
        isEmergency: true,
        message: 'Medicine not found in catalog. Please try alternative names.',
      },
    });
    return;
  }

  // Find pharmacies with 24/7 hours prioritized
  const results = await db('pharmacies as p')
    .join('inventory as i', 'p.id', 'i.pharmacy_id')
    .join('pharmacy_hours as ph', 'p.id', 'ph.pharmacy_id')
    .select([
      'p.id',
      'p.name',
      'p.phone',
      'p.address',
      'p.city',
      'p.rating',
      'p.delivery_available',
      'i.price',
      'i.quantity',
      'ph.is_24_hours',
      db.raw(`ST_Distance(
        p.location,
        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
      ) / 1000 as distance_km`, [body.longitude, body.latitude]),
    ])
    .where('i.medicine_id', medicine.id)
    .where('i.is_active', true)
    .where('i.quantity', '>', 0)
    .where('p.verification_status', 'APPROVED')
    .where('p.is_operational', true)
    .whereRaw(`ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
      ?
    )`, [body.longitude, body.latitude, searchRadius * 1000])
    .orderByRaw('ph.is_24_hours DESC, distance_km ASC')
    .limit(20);

  res.json({
    success: true,
    data: {
      medicine: {
        id: medicine.id,
        name: medicine.name,
      },
      pharmacies: results.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        address: r.address,
        city: r.city,
        distance: Number(r.distance_km).toFixed(2),
        price: r.price,
        quantity: r.quantity,
        is24Hours: r.is_24_hours,
        deliveryAvailable: r.delivery_available,
      })),
      isEmergency: true,
      searchRadius: searchRadius,
    },
  });
}