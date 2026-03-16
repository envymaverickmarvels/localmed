import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../middleware/error-handling';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for prescription uploads
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'prescriptions');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const uploadPrescriptionMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
}).single('prescription');

// Upload prescription
export async function uploadPrescription(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const db = getDb();

  if (!req.file) {
    throw BadRequestError('No prescription file uploaded');
  }

  const prescriptionId = uuidv4();
  const imageUrl = `/uploads/prescriptions/${req.file.filename}`;

  await db('prescriptions').insert({
    id: prescriptionId,
    user_id: user.userId,
    image_url: imageUrl,
    status: 'UPLOADED',
  });

  // In production, this would trigger a background job for OCR processing
  // For now, we'll just return the prescription ID
  // The actual OCR processing would be done via a Bull queue job

  res.status(201).json({
    success: true,
    data: {
      prescription: {
        id: prescriptionId,
        imageUrl,
        status: 'UPLOADED',
        message: 'Prescription uploaded successfully. Processing will begin shortly.',
      },
    },
  });
}

// Get my prescriptions
export async function getMyPrescriptions(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { status, page = 1, limit = 20 } = req.query as any;
  const db = getDb();

  let query = db('prescriptions')
    .where('user_id', user.userId)
    .orderBy('created_at', 'desc');

  if (status) {
    query = query.where('status', status);
  }

  const [{ count }] = await query.clone().count('id as count');
  const total = Number(count);

  const prescriptions = await query.limit(limit).offset((page - 1) * limit);

  res.json({
    success: true,
    data: {
      prescriptions: prescriptions.map(p => ({
        id: p.id,
        imageUrl: p.image_url,
        ocrText: p.ocr_text,
        extractedMedicines: p.extracted_medicines,
        confidence: p.confidence,
        status: p.status,
        errorMessage: p.error_message,
        createdAt: p.created_at,
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

// Get prescription by ID
export async function getPrescriptionById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  const db = getDb();

  const prescription = await db('prescriptions').where({ id }).first();

  if (!prescription) {
    throw NotFoundError('Prescription');
  }

  if (prescription.user_id !== user.userId) {
    throw BadRequestError('You do not have access to this prescription');
  }

  res.json({
    success: true,
    data: {
      prescription: {
        id: prescription.id,
        imageUrl: prescription.image_url,
        ocrText: prescription.ocr_text,
        extractedMedicines: prescription.extracted_medicines,
        confidence: prescription.confidence,
        status: prescription.status,
        errorMessage: prescription.error_message,
        createdAt: prescription.created_at,
      },
    },
  });
}

// Search pharmacies from prescription
export async function searchPharmaciesFromPrescription(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { latitude, longitude, radius = 5 } = req.body;
  const user = (req as any).user;
  const db = getDb();

  const prescription = await db('prescriptions').where({ id }).first();

  if (!prescription) {
    throw NotFoundError('Prescription');
  }

  if (prescription.user_id !== user.userId) {
    throw BadRequestError('You do not have access to this prescription');
  }

  if (prescription.status !== 'PROCESSED') {
    throw BadRequestError('Prescription is still being processed');
  }

  const extractedMedicines = prescription.extracted_medicines || [];

  if (extractedMedicines.length === 0) {
    res.json({
      success: true,
      data: {
        medicines: [],
        pharmacies: [],
        message: 'No medicines were extracted from this prescription',
      },
    });
    return;
  }

  // Find matching medicines in the database
  const medicineNames = extractedMedicines.map((m: any) => m.name || m);

  // For each extracted medicine, find pharmacies with stock
  const results = [];

  for (const med of extractedMedicines) {
    const medicineName = typeof med === 'string' ? med : med.name;

    // Find medicine in catalog
    const medicine = await db('medicines')
      .where('is_active', true)
      .whereRaw('LOWER(name) LIKE ?', [`%${medicineName.toLowerCase()}%`])
      .orWhereRaw('LOWER(generic_name) LIKE ?', [`%${medicineName.toLowerCase()}%`])
      .first();

    if (!medicine) {
      results.push({
        searchName: medicineName,
        medicine: null,
        pharmacies: [],
      });
      continue;
    }

    // Find pharmacies with this medicine
    const pharmacies = await db('pharmacies as p')
      .join('inventory as i', 'p.id', 'i.pharmacy_id')
      .select([
        'p.id',
        'p.name',
        'p.phone',
        'p.address',
        'p.city',
        'p.rating',
        'i.price',
        'i.quantity',
        db.raw('ST_Distance(p.location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) / 1000 as distance_km', [longitude, latitude]),
      ])
      .where('i.medicine_id', medicine.id)
      .where('i.quantity', '>', 0)
      .where('i.is_active', true)
      .where('p.verification_status', 'APPROVED')
      .where('p.is_operational', true)
      .whereRaw(`ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)`, [longitude, latitude, radius * 1000])
      .orderBy('distance_km', 'asc')
      .limit(5);

    results.push({
      searchName: medicineName,
      medicine: {
        id: medicine.id,
        name: medicine.name,
        genericName: medicine.generic_name,
        form: medicine.form,
        strength: medicine.strength,
      },
      pharmacies: pharmacies.map(p => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        address: p.address,
        city: p.city,
        distance: Number(p.distance_km).toFixed(2),
        rating: p.rating,
        price: p.price,
        quantity: p.quantity,
      })),
    });
  }

  res.json({
    success: true,
    data: {
      results,
    },
  });
}

// Delete prescription
export async function deletePrescription(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = (req as any).user;
  const db = getDb();

  const prescription = await db('prescriptions').where({ id }).first();

  if (!prescription) {
    throw NotFoundError('Prescription');
  }

  if (prescription.user_id !== user.userId) {
    throw BadRequestError('You do not have access to this prescription');
  }

  // Delete the file
  if (prescription.image_url) {
    const filePath = path.join(process.cwd(), prescription.image_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await db('prescriptions').where({ id }).delete();

  res.json({
    success: true,
    data: { message: 'Prescription deleted successfully' },
  });
}