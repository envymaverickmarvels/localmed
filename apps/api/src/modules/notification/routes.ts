import { Router } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { authenticate, requireActiveSession } from '../../middleware/auth';
import { z } from 'zod';
import * as notificationController from './controller';

const router = Router();

// Validation schemas
const listNotificationsSchema = z.object({
  unreadOnly: z.string().transform(Boolean).optional().default('false'),
  type: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
});

const updatePreferencesSchema = z.object({
  notificationType: z.string(),
  channels: z.array(z.enum(['IN_APP', 'PUSH', 'SMS', 'EMAIL'])),
  isEnabled: z.boolean(),
});

// Get my notifications
router.get('/', authenticate, requireActiveSession, validateQuery(listNotificationsSchema), notificationController.getNotifications);

// Mark notifications as read
router.post('/mark-read', authenticate, requireActiveSession, validateBody(markReadSchema), notificationController.markAsRead);

// Mark all as read
router.post('/mark-all-read', authenticate, requireActiveSession, notificationController.markAllAsRead);

// Get notification preferences
router.get('/preferences', authenticate, requireActiveSession, notificationController.getPreferences);

// Update notification preferences
router.put('/preferences', authenticate, requireActiveSession, validateBody(updatePreferencesSchema), notificationController.updatePreferences);

// Get unread count
router.get('/unread-count', authenticate, requireActiveSession, notificationController.getUnreadCount);

export default router;