import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate';
import { authenticate, requireActiveSession, requireRole } from '../../middleware/auth';
import { z } from 'zod';
import * as pharmacyController from './controller';

const router = Router();

// Validation schemas
const createPharmacySchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  phone: z.string().min(10).max(15),
  email: z.string().email().optional(),
  address: z.string().min(5),
  landmark: z.string().optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().min(6).max(10),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  licenseNumber: z.string().min(5).max(100),
  deliveryAvailable: z.boolean().optional().default(false),
  deliveryRadius: z.number().min(1).max(50).optional(),
});

const updatePharmacySchema = createPharmacySchema.partial();

const operatingHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  is24Hours: z.boolean().optional().default(false),
  isClosed: z.boolean().optional().default(false),
});

const setOperatingHoursSchema = z.object({
  hours: z.array(operatingHoursSchema),
});

const searchPharmacySchema = z.object({
  latitude: z.string().transform(Number),
  longitude: z.string().transform(Number),
  radius: z.string().transform(Number).optional().default('5'),
  open: z.string().transform(Boolean).optional(),
  delivery: z.string().transform(Boolean).optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

const pharmacyIdSchema = z.object({
  id: z.string().uuid(),
});

// Public routes
router.get('/search', validateQuery(searchPharmacySchema), pharmacyController.searchPharmacies);
router.get('/:id', validateParams(pharmacyIdSchema), pharmacyController.getPharmacyById);
router.get('/:id/hours', validateParams(pharmacyIdSchema), pharmacyController.getOperatingHours);

// Protected routes - Pharmacy Owner
router.post('/', authenticate, requireActiveSession, requireRole('PHARMACY_OWNER'), validateBody(createPharmacySchema), pharmacyController.createPharmacy);
router.patch('/:id', authenticate, requireActiveSession, requireRole('PHARMACY_OWNER'), validateParams(pharmacyIdSchema), validateBody(updatePharmacySchema), pharmacyController.updatePharmacy);
router.put('/:id/hours', authenticate, requireActiveSession, requireRole('PHARMACY_OWNER'), validateParams(pharmacyIdSchema), validateBody(setOperatingHoursSchema), pharmacyController.setOperatingHours);
router.get('/my/pharmacies', authenticate, requireActiveSession, requireRole('PHARMACY_OWNER'), pharmacyController.getMyPharmacies);

// Admin routes
router.patch('/:id/verify', authenticate, requireActiveSession, requireRole('ADMIN'), validateParams(pharmacyIdSchema), pharmacyController.verifyPharmacy);
router.get('/admin/all', authenticate, requireActiveSession, requireRole('ADMIN'), pharmacyController.getAllPharmacies);

export default router;