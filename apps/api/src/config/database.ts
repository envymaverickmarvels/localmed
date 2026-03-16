import knex, { Knex } from 'knex';
import { Model } from 'objection';
import { config, databaseConfig } from './config';

let db: Knex | null = null;

export async function setupDatabase(): Promise<Knex> {
  if (db) {
    return db;
  }

  db = knex(databaseConfig);

  // Test connection
  try {
    await db.raw('SELECT 1');
    console.log('Database connection established');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }

  // Configure Objection.js to use Knex
  Model.knex(db);

  return db;
}

export function getDb(): Knex {
  if (!db) {
    throw new Error('Database not initialized. Call setupDatabase first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
    console.log('Database connection closed');
  }
}

// Transaction helper
export async function transaction<T>(callback: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
  const database = getDb();
  return database.transaction(callback);
}

// Query builder shortcuts
export const queryBuilder = {
  users: () => getDb()<import('./types').UserRecord>('users'),
  pharmacies: () => getDb()<import('./types').PharmacyRecord>('pharmacies'),
  medicines: () => getDb()<import('./types').MedicineRecord>('medicines'),
  inventory: () => getDb()<import('./types').InventoryRecord>('inventory'),
  reservations: () => getDb()<import('./types').ReservationRecord>('reservations'),
  reservationItems: () => getDb()<import('./types').ReservationItemRecord>('reservation_items'),
  deliveries: () => getDb()<import('./types').DeliveryRecord>('deliveries'),
  prescriptions: () => getDb()<import('./types').PrescriptionRecord>('prescriptions'),
  notifications: () => getDb()<import('./types').NotificationRecord>('notifications'),
};