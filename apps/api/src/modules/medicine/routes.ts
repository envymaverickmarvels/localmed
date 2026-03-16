import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate';
import { authenticate, requireActiveSession, requireRole } from '../../middleware/auth';
import { z } from 'zod';
import * as medicineController from './controller';

const router = Router();

// Validation schemas
const createMedicineSchema = z.object({
  name: z.string().min(1).max(500),
  genericName: z.string().max(500).optional(),
  brandName: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  form: z.enum(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'INHALER', 'POWDER', 'CREAM', 'GEL', 'OTHER']),
  strength: z.string().max(100).optional(),
  manufacturer: z.string().max(255).optional(),
  schedule: z.enum(['OTC', 'H1', 'H', 'X']).default('OTC'),
  description: z.string().optional(),
  usageInstructions: z.string().optional(),
  storageInstructions: z.string().optional(),
  sideEffects: z.array(z.string()).optional(),
  drugInteractions: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
});

const updateMedicineSchema = createMedicineSchema.partial();

const searchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  category: z.string().optional(),
  form: z.enum(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'INHALER', 'POWDER', 'CREAM', 'GEL', 'OTHER']).optional(),
  schedule: z.enum(['OTC', 'H1', 'H', 'X']).optional(),
});

const medicineIdSchema = z.object({
  id: z.string().uuid(),
});

// Public routes
router.get('/search', validateQuery(searchQuerySchema), medicineController.search);
router.get('/suggestions', medicineController.getSuggestions);
router.get('/:id', validateParams(medicineIdSchema), medicineController.getById);

// Protected routes - Admin only
router.post('/', authenticate, requireActiveSession, requireRole('ADMIN'), validateBody(createMedicineSchema), medicineController.create);
router.patch('/:id', authenticate, requireActiveSession, requireRole('ADMIN'), validateParams(medicineIdSchema), validateBody(updateMedicineSchema), medicineController.update);
router.delete('/:id', authenticate, requireActiveSession, requireRole('ADMIN'), validateParams(medicineIdSchema), medicineController.deleteMedicine);

export default router;