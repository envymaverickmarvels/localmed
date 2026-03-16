import { Request, Response } from 'express';
import { getDb } from '../../config/database';
import { NotFoundError } from '../../middleware/error-handling';

// List users
export async function listUsers(req: Request, res: Response): Promise<void> {
  const { role, isActive, search, page = 1, limit = 20 } = req.query as any;
  const db = getDb();

  let query = db('users').select(['id', 'phone', 'email', 'name', 'role', 'is_phone_verified', 'is_email_verified', 'is_active', 'created_at']);

  if (role) {
    query = query.where('role', role);
  }

  if (isActive !== undefined) {
    query = query.where('is_active', isActive === 'true');
  }

  if (search) {
    query = query.whereRaw('(name ILIKE ? OR email ILIKE ? OR phone ILIKE ?)', [`%${search}%`, `%${search}%`, `%${search}%`]);
  }

  const [{ count }] = await query.clone().count('id as count');
  const total = Number(count);

  const users = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset((page - 1) * limit);

  res.json({
    success: true,
    data: {
      users,
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

// Get user by ID
export async function getUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const db = getDb();

  const user = await db('users').where({ id }).first();

  if (!user) {
    throw NotFoundError('User');
  }

  // Get associated data based on role
  let additionalData: any = {};

  if (user.role === 'PHARMACY_OWNER') {
    const pharmacies = await db('pharmacies').where({ owner_id: id });
    additionalData.pharmacies = pharmacies;
  }

  if (user.role === 'RIDER') {
    const deliveries = await db('deliveries').where({ rider_id: id }).count('id as count').first();
    additionalData.totalDeliveries = deliveries?.count || 0;
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        isPhoneVerified: user.is_phone_verified,
        isEmailVerified: user.is_email_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
      },
      ...additionalData,
    },
  });
}

// Activate user
export async function activateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const db = getDb();

  await db('users').where({ id }).update({ is_active: true, updated_at: new Date() });

  res.json({
    success: true,
    data: { message: 'User activated' },
  });
}

// Deactivate user
export async function deactivateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const db = getDb();

  await db('users').where({ id }).update({ is_active: false, updated_at: new Date() });
  await db('sessions').where({ user_id: id }).delete();

  res.json({
    success: true,
    data: { message: 'User deactivated' },
  });
}

// Update user role
export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { role } = req.body;
  const db = getDb();

  await db('users').where({ id }).update({ role, updated_at: new Date() });

  res.json({
    success: true,
    data: { message: 'User role updated' },
  });
}

// List pharmacies (admin)
export async function listPharmacies(req: Request, res: Response): Promise<void> {
  const { status, city, page = 1, limit = 20 } = req.query as any;
  const db = getDb();

  let query = db('pharmacies as p')
    .join('users as u', 'p.owner_id', 'u.id')
    .select([
      'p.*',
      'u.name as owner_name',
      'u.phone as owner_phone',
      'u.email as owner_email',
    ]);

  if (status) {
    query = query.where('p.verification_status', status);
  }

  if (city) {
    query = query.where('p.city', 'ilike', `%${city}%`);
  }

  const [{ count }] = await query.clone().count('p.id as count');
  const total = Number(count);

  const pharmacies = await query
    .orderBy('p.created_at', 'desc')
    .limit(limit)
    .offset((page - 1) * limit);

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

// Get pharmacy (admin)
export async function getPharmacy(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const db = getDb();

  const pharmacy = await db('pharmacies as p')
    .join('users as u', 'p.owner_id', 'u.id')
    .select([
      'p.*',
      'u.name as owner_name',
      'u.phone as owner_phone',
      'u.email as owner_email',
    ])
    .where('p.id', id)
    .first();

  if (!pharmacy) {
    throw NotFoundError('Pharmacy');
  }

  // Get operating hours
  const hours = await db('pharmacy_hours').where({ pharmacy_id: id }).orderBy('day_of_week');

  // Get inventory count
  const inventoryCount = await db('inventory').where({ pharmacy_id: id }).count('id as count').first();

  // Get reservation stats
  const reservationStats = await db('reservations')
    .where({ pharmacy_id: id })
    .select([
      db.raw('COUNT(*) FILTER (WHERE status = ?) as pending', ['PENDING']),
      db.raw('COUNT(*) FILTER (WHERE status = ?) as confirmed', ['CONFIRMED']),
      db.raw('COUNT(*) FILTER (WHERE status = ?) as completed', ['COMPLETED']),
      db.raw('COUNT(*) FILTER (WHERE status = ?) as cancelled', ['CANCELLED']),
    ])
    .first();

  res.json({
    success: true,
    data: {
      pharmacy,
      operatingHours: hours,
      inventoryCount: inventoryCount?.count || 0,
      reservationStats,
    },
  });
}

// Verify pharmacy (admin)
export async function verifyPharmacy(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  const admin = (req as any).user;
  const db = getDb();

  await db('pharmacies').where({ id }).update({
    verification_status: status,
    verified_by: admin.userId,
    verified_at: new Date(),
    rejection_reason: status === 'REJECTED' ? rejectionReason : null,
    updated_at: new Date(),
  });

  res.json({
    success: true,
    data: { message: `Pharmacy ${status.toLowerCase()}` },
  });
}

// Dashboard stats
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const db = getDb();

  const [users, pharmacies, medicines, reservations] = await Promise.all([
    db('users').count('id as count').first(),
    db('pharmacies').count('id as count').first(),
    db('medicines').where({ is_active: true }).count('id as count').first(),
    db('reservations').count('id as count').first(),
  ]);

  const activePharmacies = await db('pharmacies')
    .where({ verification_status: 'APPROVED', is_operational: true })
    .count('id as count')
    .first();

  const pendingReservations = await db('reservations')
    .where({ status: 'PENDING' })
    .count('id as count')
    .first();

  const todayReservations = await db('reservations')
    .whereRaw('DATE(created_at) = CURRENT_DATE')
    .count('id as count')
    .first();

  res.json({
    success: true,
    data: {
      totalUsers: users?.count || 0,
      totalPharmacies: pharmacies?.count || 0,
      activePharmacies: activePharmacies?.count || 0,
      totalMedicines: medicines?.count || 0,
      totalReservations: reservations?.count || 0,
      pendingReservations: pendingReservations?.count || 0,
      todayReservations: todayReservations?.count || 0,
    },
  });
}

// Users by role
export async function getUsersByRole(req: Request, res: Response): Promise<void> {
  const db = getDb();

  const usersByRole = await db('users')
    .select('role')
    .count('id as count')
    .groupBy('role');

  res.json({
    success: true,
    data: { usersByRole },
  });
}

// Reservations by status
export async function getReservationsByStatus(req: Request, res: Response): Promise<void> {
  const db = getDb();

  const reservationsByStatus = await db('reservations')
    .select('status')
    .count('id as count')
    .groupBy('status');

  res.json({
    success: true,
    data: { reservationsByStatus },
  });
}