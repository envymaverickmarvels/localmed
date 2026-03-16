import knex from 'knex';
import { databaseConfig } from '../config';
import readline from 'readline';

async function reset() {
  console.log('⚠️  This will delete ALL data in the database!');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question('Are you sure? Type "yes" to continue: ', resolve);
  });

  rl.close();

  if (answer.toLowerCase() !== 'yes') {
    console.log('Operation cancelled');
    process.exit(0);
  }

  const db = knex(databaseConfig);

  try {
    console.log('Dropping all tables...');

    // Drop all tables in reverse order
    const tables = [
      'notification_preferences',
      'notifications',
      'delivery_tracking',
      'deliveries',
      'stock_holds',
      'reservation_items',
      'reservations',
      'prescriptions',
      'medicine_synonyms',
      'inventory',
      'medicines',
      'pharmacy_hours',
      'pharmacies',
      'otp_verifications',
      'sessions',
      'users',
      'audit_logs',
      'system_settings',
      'migrations',
    ];

    for (const table of tables) {
      await db.schema.dropTableIfExists(table);
      console.log(`Dropped table: ${table}`);
    }

    // Drop extensions (except PostGIS which requires special handling)
    await db.raw('DROP EXTENSION IF EXISTS pg_trgm CASCADE');
    await db.raw('DROP EXTENSION IF EXISTS unaccent CASCADE');
    await db.raw('DROP EXTENSION IF EXISTS btree_gin CASCADE');

    console.log('\nAll tables dropped successfully!');
    console.log('Run "npm run db:migrate" to recreate the schema');
    console.log('Run "npm run db:seed" to add sample data');

  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

reset();