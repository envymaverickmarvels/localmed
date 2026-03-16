import knex from 'knex';
import { config, databaseConfig } from '../config';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  const db = knex(databaseConfig);

  try {
    // Test connection
    await db.raw('SELECT 1');
    console.log('Connected to database');

    // Check if migrations table exists
    const migrationsTableExists = await db.schema.hasTable('migrations');

    if (!migrationsTableExists) {
      await db.schema.createTable('migrations', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.timestamp('run_at').defaultTo(db.fn.now());
      });
      console.log('Created migrations table');
    }

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Get already run migrations
    const runMigrations = await db('migrations').pluck('name');
    const pendingMigrations = migrationFiles.filter(f => !runMigrations.includes(f));

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Running ${pendingMigrations.length} migration(s)...`);

    // Run each migration
    for (const migrationFile of pendingMigrations) {
      console.log(`Running migration: ${migrationFile}`);
      const migrationPath = path.join(migrationsDir, migrationFile);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      await db.raw(sql);
      await db('migrations').insert({ name: migrationFile });

      console.log(`Completed: ${migrationFile}`);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigrations();