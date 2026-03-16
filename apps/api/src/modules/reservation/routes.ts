import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate';
import { authenticate, requireActiveSession } from '../../middleware/auth';
import { z } from 'zod';
import * as reservationController from './controller';

const router = Router();

// Validation schemas
const reservationItemSchema = z.object({
  inventoryId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

const createReservationSchema = z.object({
  pharmacyId: z.string().uuid(),
  items: z.array(reservationItemSchema).min(1),
  notes: z.string().max(500).optional(),
});

const updateReservationSchema = z.object({
  notes: z.string().max(500).optional(),
});

const reservationIdSchema = z.object({
  id: z.string().uuid(),
});

const listReservationsSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED']).optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

// Create reservation (User)
router.post('/', authenticate, requireActiveSession, validateBody(createReservationSchema), reservationController.createReservation);

// Get user's reservations
router.get('/my', authenticate, requireActiveSession, validateQuery(listReservationsSchema), reservationController.getMyReservations);

// Get reservation by ID
router.get('/:id', authenticate, requireActiveSession, validateParams(reservationIdSchema), reservationController.getReservationById);

// Confirm reservation (Pharmacy Owner)
router.post('/:id/confirm', authenticate, requireActiveSession, validateParams(reservationIdSchema), reservationController.confirmReservation);

// Cancel reservation
router.post('/:id/cancel', authenticate, requireActiveSession, validateParams(reservationIdSchema), validateBody(updateReservationSchema), reservationController.cancelReservation);

// Complete reservation (Pharmacy Owner)
router.post('/:id/complete', authenticate, requireActiveSession, validateParams(reservationIdSchema), reservationController.completeReservation);

// Get pharmacy's reservations (Pharmacy Owner)
router.get('/pharmacy/:pharmacyId', authenticate, requireActiveSession, validateQuery(listReservationsSchema), reservationController.getPharmacyReservations);

// Extend reservation TTL
router.post('/:id/extend', authenticate, requireActiveSession, validateParams(reservationIdSchema), reservationController.extendReservation);

export default router;