import { Router } from 'express';
import { validateBody, validateParams } from '../../middleware/validate';
import { authenticate, requireActiveSession } from '../../middleware/auth';
import { z } from 'zod';
import * as userController from './controller';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
});

const userIdSchema = z.object({
  id: z.string().uuid(),
});

// Get current user profile
router.get('/me', authenticate, requireActiveSession, userController.getProfile);

// Update current user profile
router.patch('/me', authenticate, requireActiveSession, validateBody(updateProfileSchema), userController.updateProfile);

// Delete current user account
router.delete('/me', authenticate, requireActiveSession, userController.deleteAccount);

// Get user by ID (Admin only - will add role check later)
router.get('/:id', authenticate, requireActiveSession, validateParams(userIdSchema), userController.getUserById);

export default router;