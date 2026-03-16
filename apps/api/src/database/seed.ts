import knex from 'knex';
import { databaseConfig } from '../config';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  const db = knex(databaseConfig);

  try {
    console.log('Starting database seeding...');

    // Create admin user
    const adminId = uuidv4();
    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    await db('users').insert({
      id: adminId,
      phone: '9999999999',
      email: 'admin@localmed.com',
      name: 'Admin User',
      role: 'ADMIN',
      password_hash: adminPasswordHash,
      is_phone_verified: true,
      is_email_verified: true,
      is_active: true,
    }).onConflict('phone').ignore();
    console.log('Created admin user');

    // Create sample pharmacy owner
    const pharmacyOwnerId = uuidv4();
    await db('users').insert({
      id: pharmacyOwnerId,
      phone: '8888888888',
      email: 'pharmacy@example.com',
      name: 'John Pharmacy',
      role: 'PHARMACY_OWNER',
      password_hash: await bcrypt.hash('password123', 10),
      is_phone_verified: true,
      is_email_verified: true,
      is_active: true,
    }).onConflict('phone').ignore();
    console.log('Created pharmacy owner user');

    // Create sample user
    const userId = uuidv4();
    await db('users').insert({
      id: userId,
      phone: '7777777777',
      email: 'user@example.com',
      name: 'Regular User',
      role: 'USER',
      password_hash: await bcrypt.hash('password123', 10),
      is_phone_verified: true,
      is_email_verified: true,
      is_active: true,
    }).onConflict('phone').ignore();
    console.log('Created regular user');

    // Insert sample medicines
    const medicines = [
      {
        id: uuidv4(),
        name: 'Paracetamol 500mg',
        generic_name: 'Acetaminophen',
        brand_name: 'Crocin',
        category: 'Pain Relief',
        form: 'TABLET',
        strength: '500mg',
        manufacturer: 'GSK',
        schedule: 'OTC',
        description: 'Used for relief of mild to moderate pain and fever',
      },
      {
        id: uuidv4(),
        name: 'Azithromycin 500mg',
        generic_name: 'Azithromycin',
        brand_name: 'Azee',
        category: 'Antibiotic',
        form: 'TABLET',
        strength: '500mg',
        manufacturer: 'Cipla',
        schedule: 'H1',
        description: 'Antibiotic used to treat various bacterial infections',
      },
      {
        id: uuidv4(),
        name: 'Omeprazole 20mg',
        generic_name: 'Omeprazole',
        brand_name: 'Omez',
        category: 'Gastric',
        form: 'CAPSULE',
        strength: '20mg',
        manufacturer: 'Dr Reddys',
        schedule: 'OTC',
        description: 'Proton pump inhibitor for acid-related disorders',
      },
      {
        id: uuidv4(),
        name: 'Metformin 500mg',
        generic_name: 'Metformin',
        brand_name: 'Glycomet',
        category: 'Diabetes',
        form: 'TABLET',
        strength: '500mg',
        manufacturer: 'USV',
        schedule: 'H1',
        description: 'First-line medication for type 2 diabetes',
      },
      {
        id: uuidv4(),
        name: 'Cetirizine 10mg',
        generic_name: 'Cetirizine',
        brand_name: 'Cetcip',
        category: 'Allergy',
        form: 'TABLET',
        strength: '10mg',
        manufacturer: 'Cipla',
        schedule: 'OTC',
        description: 'Antihistamine used for allergies',
      },
    ];

    for (const medicine of medicines) {
      await db('medicines').insert(medicine).onConflict('id').ignore();
    }
    console.log(`Created ${medicines.length} sample medicines`);

    // Create sample pharmacy with PostGIS location
    const pharmacyId = uuidv4();
    await db.raw(`
      INSERT INTO pharmacies (
        id, owner_id, name, phone, address, city, state, pincode,
        location, license_number, verification_status, is_operational, delivery_available
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
        ?, ?, ?, ?
      )
    `, [
      pharmacyId,
      pharmacyOwnerId,
      'HealthFirst Pharmacy',
      '01123456789',
      '123 Main Street, Connaught Place',
      'New Delhi',
      'Delhi',
      '110001',
      77.2167, // longitude
      28.6315, // latitude
      'DL-PHARM-12345',
      'APPROVED',
      true,
      true,
    ]);
    console.log('Created sample pharmacy');

    // Add pharmacy operating hours
    const days = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
    for (const day of days) {
      await db('pharmacy_hours').insert({
        pharmacy_id: pharmacyId,
        day_of_week: day,
        open_time: day === 0 ? '10:00' : '09:00',
        close_time: day === 0 ? '18:00' : '21:00',
        is_24_hours: false,
        is_closed: false,
      });
    }
    console.log('Created pharmacy operating hours');

    // Add inventory for pharmacy
    for (const medicine of medicines) {
      await db('inventory').insert({
        id: uuidv4(),
        pharmacy_id: pharmacyId,
        medicine_id: medicine.id,
        quantity: Math.floor(Math.random() * 100) + 10,
        price: Math.floor(Math.random() * 100) + 10,
        mrp: Math.floor(Math.random() * 150) + 20,
        batch_number: `BATCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      });
    }
    console.log('Created inventory for pharmacy');

    console.log('Database seeding completed successfully!');
    console.log('\nSample credentials:');
    console.log('Admin: phone=9999999999, password=admin123');
    console.log('Pharmacy Owner: phone=8888888888, password=password123');
    console.log('User: phone=7777777777, password=password123');

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

seed();