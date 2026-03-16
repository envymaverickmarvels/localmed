import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../config/database';

// Get notifications
export async function getNotifications(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { unreadOnly = false, type, page = 1, limit = 20 } = req.query as any;
  const db = getDb();

  let query = db('notifications')
    .where('user_id', user.userId)
    .orderBy('created_at', 'desc');

  if (unreadOnly === 'true') {
    query = query.where('is_read', false);
  }

  if (type) {
    query = query.where('type', type);
  }

  const [{ count }] = await query.clone().count('id as count');
  const total = Number(count);

  const notifications = await query.limit(limit).offset((page - 1) * limit);

  res.json({
    success: true,
    data: {
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
        isRead: n.is_read,
        readAt: n.read_at,
        createdAt: n.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    },
  });
}

// Mark notifications as read
export async function markAsRead(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { ids } = req.body;
  const db = getDb();

  if (ids && ids.length > 0) {
    await db('notifications')
      .where('user_id', user.userId)
      .whereIn('id', ids)
      .update({
        is_read: true,
        read_at: new Date(),
      });
  } else {
    // Mark all as read if no specific IDs provided
    await db('notifications')
      .where('user_id', user.userId)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: new Date(),
      });
  }

  res.json({
    success: true,
    data: { message: 'Notifications marked as read' },
  });
}

// Mark all as read
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const db = getDb();

  await db('notifications')
    .where('user_id', user.userId)
    .where('is_read', false)
    .update({
      is_read: true,
      read_at: new Date(),
    });

  res.json({
    success: true,
    data: { message: 'All notifications marked as read' },
  });
}

// Get notification preferences
export async function getPreferences(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const db = getDb();

  const preferences = await db('notification_preferences')
    .where('user_id', user.userId);

  res.json({
    success: true,
    data: { preferences },
  });
}

// Update notification preferences
export async function updatePreferences(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { notificationType, channels, isEnabled } = req.body;
  const db = getDb();

  // Upsert preference
  await db('notification_preferences')
    .insert({
      id: uuidv4(),
      user_id: user.userId,
      notification_type: notificationType,
      channels: JSON.stringify(channels),
      is_enabled: isEnabled,
    })
    .onConflict(['user_id', 'notification_type'])
    .merge();

  res.json({
    success: true,
    data: { message: 'Notification preferences updated' },
  });
}

// Get unread count
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const db = getDb();

  const result = await db('notifications')
    .where('user_id', user.userId)
    .where('is_read', false)
    .count('id as count')
    .first();

  res.json({
    success: true,
    data: {
      unreadCount: result?.count || 0,
    },
  });
}

// Helper function to create a notification (internal use)
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, unknown>,
  channels: string[] = ['IN_APP']
): Promise<string> {
  const db = getDb();
  const notificationId = uuidv4();

  await db('notifications').insert({
    id: notificationId,
    user_id: userId,
    type,
    title,
    message,
    data: data ? JSON.stringify(data) : null,
    channels: JSON.stringify(channels),
    is_read: false,
  });

  return notificationId;
}