import { Router } from 'express';
import { validateBody } from '../../middleware/validate';
import { z } from 'zod';
import * as authController from './controller';
import { authenticate, requireActiveSession, requireRole } from '../../middleware/auth';

const router = Router();

// Validation schemas
const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  purpose: z.enum(['LOGIN', 'REGISTRATION', 'PASSWORD_RESET', 'PHONE_VERIFY']).default('LOGIN'),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
  name: z.string().min(2).max(100).optional(), // Required for registration
  email: z.string().email().optional(),
});

const registerSchema = z.object({
  phone: z.string().min(10).max(15),
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'PHARMACY_OWNER', 'RIDER']).default('USER'),
});

const loginSchema = z.object({
  phone: z.string().min(10).max(15),
  password: z.string().min(6).optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const logoutSchema = z.object({
  allDevices: z.boolean().optional().default(false),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

// Public routes
router.post('/send-otp', validateBody(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', validateBody(verifyOtpSchema), authController.verifyOtp);
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh-token', validateBody(refreshTokenSchema), authController.refreshToken);

// Protected routes
router.post('/logout', authenticate, requireActiveSession, validateBody(logoutSchema), authController.logout);
router.get('/me', authenticate, requireActiveSession, authController.getProfile);
router.patch('/me', authenticate, requireActiveSession, validateBody(updateProfileSchema), authController.updateProfile);
router.post('/change-password', authenticate, requireActiveSession, validateBody(changePasswordSchema), authController.changePassword);
router.post('/verify-phone', authenticate, requireActiveSession, authController.sendPhoneVerification);
router.post('/verify-email', authenticate, requireActiveSession, authController.sendEmailVerification);

// Admin routes
router.get('/sessions', authenticate, requireActiveSession, authController.getSessions);
router.delete('/sessions/:sessionId', authenticate, requireActiveSession, authController.revokeSession);

export default router;