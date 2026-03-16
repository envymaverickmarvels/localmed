import { Router } from 'express';
import { validateBody, validateParams } from '../../middleware/validate';
import { authenticate, requireActiveSession } from '../../middleware/auth';
import { z } from 'zod';
import * as prescriptionController from './controller';

const router = Router();

// Validation schemas
const uploadPrescriptionSchema = z.object({
  // Image will be uploaded via multipart/form-data
});

const prescriptionIdSchema = z.object({
  id: z.string().uuid(),
});

const searchPharmaciesFromPrescriptionSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(1).max(50).optional().default(5),
});

// Upload prescription
router.post('/upload', authenticate, requireActiveSession, prescriptionController.uploadPrescription);

// Get my prescriptions
router.get('/my', authenticate, requireActiveSession, prescriptionController.getMyPrescriptions);

// Get prescription by ID
router.get('/:id', authenticate, requireActiveSession, validateParams(prescriptionIdSchema), prescriptionController.getPrescriptionById);

// Search pharmacies from prescription
router.post('/:id/search-pharmacies', authenticate, requireActiveSession, validateParams(prescriptionIdSchema), validateBody(searchPharmaciesFromPrescriptionSchema), prescriptionController.searchPharmaciesFromPrescription);

// Delete prescription
router.delete('/:id', authenticate, requireActiveSession, validateParams(prescriptionIdSchema), prescriptionController.deletePrescription);

export default router;