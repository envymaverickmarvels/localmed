import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate';
import { authenticate, requireActiveSession, requireRole } from '../../middleware/auth';
import { z } from 'zod';
import * as adminController from './controller';

const router = Router();

// All routes require ADMIN role
router.use(authenticate, requireActiveSession, requireRole('ADMIN'));

// Validation schemas
const userIdSchema = z.object({
  id: z.string().uuid(),
});

const pharmacyIdSchema = z.object({
  id: z.string().uuid(),
});

const listUsersSchema = z.object({
  role: z.enum(['USER', 'PHARMACY_OWNER', 'RIDER', 'ADMIN']).optional(),
  isActive: z.string().transform(Boolean).optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

const listPharmaciesSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  city: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

const verifyPharmacySchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().max(500).optional(),
});

// User management
router.get('/users', validateQuery(listUsersSchema), adminController.listUsers);
router.get('/users/:id', validateParams(userIdSchema), adminController.getUser);
router.patch('/users/:id/activate', validateParams(userIdSchema), adminController.activateUser);
router.patch('/users/:id/deactivate', validateParams(userIdSchema), adminController.deactivateUser);
router.patch('/users/:id/role', validateParams(userIdSchema), validateBody(z.object({ role: z.enum(['USER', 'PHARMACY_OWNER', 'RIDER', 'ADMIN']) })), adminController.updateUserRole);

// Pharmacy management
router.get('/pharmacies', validateQuery(listPharmaciesSchema), adminController.listPharmacies);
router.get('/pharmacies/:id', validateParams(pharmacyIdSchema), adminController.getPharmacy);
router.patch('/pharmacies/:id/verify', validateParams(pharmacyIdSchema), validateBody(verifyPharmacySchema), adminController.verifyPharmacy);

// Dashboard stats
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/users-by-role', adminController.getUsersByRole);
router.get('/dashboard/reservations-by-status', adminController.getReservationsByStatus);

export default router;