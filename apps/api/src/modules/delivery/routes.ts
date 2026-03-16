import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate';
import { authenticate, requireActiveSession, requireRole } from '../../middleware/auth';
import { z } from 'zod';
import * as deliveryController from './controller';

const router = Router();

// Validation schemas
const createDeliverySchema = z.object({
  reservationId: z.string().uuid(),
  deliveryAddress: z.string().min(10),
  deliveryLatitude: z.number().min(-90).max(90),
  deliveryLongitude: z.number().min(-180).max(180),
  deliveryNotes: z.string().max(500).optional(),
});

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const deliveryIdSchema = z.object({
  id: z.string().uuid(),
});

const listDeliveriesSchema = z.object({
  status: z.enum(['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

// Create delivery request (User)
router.post('/', authenticate, requireActiveSession, validateBody(createDeliverySchema), deliveryController.createDelivery);

// Get my deliveries (User)
router.get('/my', authenticate, requireActiveSession, validateQuery(listDeliveriesSchema), deliveryController.getMyDeliveries);

// Get available deliveries for riders
router.get('/available', authenticate, requireActiveSession, requireRole('RIDER'), deliveryController.getAvailableDeliveries);

// Accept delivery (Rider)
router.post('/:id/accept', authenticate, requireActiveSession, requireRole('RIDER'), validateParams(deliveryIdSchema), deliveryController.acceptDelivery);

// Update rider location
router.post('/:id/location', authenticate, requireActiveSession, requireRole('RIDER'), validateParams(deliveryIdSchema), validateBody(updateLocationSchema), deliveryController.updateRiderLocation);

// Pickup delivery (Rider)
router.post('/:id/pickup', authenticate, requireActiveSession, requireRole('RIDER'), validateParams(deliveryIdSchema), deliveryController.pickupDelivery);

// Complete delivery (Rider)
router.post('/:id/complete', authenticate, requireActiveSession, requireRole('RIDER'), validateParams(deliveryIdSchema), deliveryController.completeDelivery);

// Get delivery details
router.get('/:id', authenticate, requireActiveSession, validateParams(deliveryIdSchema), deliveryController.getDeliveryById);

// Cancel delivery
router.post('/:id/cancel', authenticate, requireActiveSession, validateParams(deliveryIdSchema), deliveryController.cancelDelivery);

// Track delivery
router.get('/:id/track', authenticate, requireActiveSession, validateParams(deliveryIdSchema), deliveryController.trackDelivery);

export default router;