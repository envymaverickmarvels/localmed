import { Router } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { z } from 'zod';
import * as searchController from './controller';

const router = Router();

// Validation schemas
const searchQuerySchema = z.object({
  q: z.string().min(1),
  latitude: z.string().transform(Number),
  longitude: z.string().transform(Number),
  radius: z.string().transform(Number).optional().default('5'),
  open: z.string().transform(Boolean).optional(),
  hasStock: z.string().transform(Boolean).optional(),
  delivery: z.string().transform(Boolean).optional(),
  minPrice: z.string().transform(Number).optional(),
  maxPrice: z.string().transform(Number).optional(),
  sortBy: z.enum(['distance', 'price', 'rating']).optional().default('distance'),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

const nearbyPharmaciesSchema = z.object({
  latitude: z.string().transform(Number),
  longitude: z.string().transform(Number),
  radius: z.string().transform(Number).optional().default('5'),
  open: z.string().transform(Boolean).optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

// Search for medicine availability
router.get('/medicine', validateQuery(searchQuerySchema), optionalAuth, searchController.searchMedicineAvailability);

// Get nearby pharmacies
router.get('/pharmacies/nearby', validateQuery(nearbyPharmaciesSchema), searchController.getNearbyPharmacies);

// Emergency search (extended radius, priority 24/7 pharmacies)
router.post('/emergency', authenticate, validateBody(searchQuerySchema), searchController.emergencySearch);

export default router;