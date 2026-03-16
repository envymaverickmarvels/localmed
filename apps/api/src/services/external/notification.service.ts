import { getDb } from '../../config/database';
import { getRedis } from '../../config/redis';
import { logger } from '../../config/logger';

// SMS Service - MSG91 Integration
export interface SmsConfig {
  apiKey: string;
  senderId: string;
  route: string;
}

const SMS_CONFIG: SmsConfig = {
  apiKey: process.env.MSG91_API_KEY || '',
  senderId: process.env.MSG91_SENDER_ID || 'LOCALMED',
  route: process.env.MSG91_ROUTE || '4',
};

export interface SmsPayload {
  mobile: string;
  message: string;
  otp?: string;
  templateId?: string;
}

export class SmsService {
  private enabled: boolean;

  constructor() {
    this.enabled = !!SMS_CONFIG.apiKey;
  }

  async sendSms(payload: SmsPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.enabled) {
      logger.warn('SMS service not configured. Message not sent:', payload);
      return { success: false, error: 'SMS service not configured' };
    }

    // Format phone number
    const mobile = payload.mobile.startsWith('+91') ? payload.mobile.slice(3) : payload.mobile;

    try {
      const response = await fetch('https://api.msg91.com/api/v2/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': SMS_CONFIG.apiKey,
        },
        body: JSON.stringify({
          route: SMS_CONFIG.route,
          sender: SMS_CONFIG.senderId,
          numbers: mobile,
          message: payload.message,
          ...(payload.templateId && { template_id: payload.templateId }),
          ...(payload.otp && { otp: payload.otp }),
        }),
      });

      const data = await response.json();

      if (response.ok && data.type === 'success') {
        logger.info('SMS sent successfully', { mobile, messageId: data.messageId });
        return { success: true, messageId: data.messageId };
      }

      logger.error('SMS failed', { mobile, error: data });
      return { success: false, error: data.message || 'SMS failed' };
    } catch (error) {
      logger.error('SMS service error', { error, mobile });
      return { success: false, error: 'SMS service error' };
    }
  }

  async sendOtp(phone: string, otp: string): Promise<{ success: boolean }> {
    const message = `Your LocalMed verification code is ${otp}. Valid for 5 minutes. Do not share this code.`;
    const result = await this.sendSms({
      mobile: phone,
      message,
      otp,
    });

    return { success: result.success };
  }

  async sendReservationConfirmation(phone: string, pharmacyName: string, reservationId: string): Promise<{ success: boolean }> {
    const message = `Your reservation at ${pharmacyName} is confirmed. Reservation ID: ${reservationId.slice(0, 8)}. Please pick up within 30 minutes. - LocalMed`;
    return this.sendSms({ mobile: phone, message });
  }

  async sendDeliveryUpdate(phone: string, status: string, riderName?: string): Promise<{ success: boolean }> {
    const messages: Record<string, string> = {
      ASSIGNED: `Your delivery has been assigned to ${riderName || 'a rider'}. - LocalMed`,
      PICKED_UP: `Your order has been picked up and is on the way. - LocalMed`,
      DELIVERED: `Your order has been delivered. Thank you for using LocalMed!`,
    };

    const message = messages[status] || `Your delivery status: ${status}. - LocalMed`;
    return this.sendSms({ mobile: phone, message });
  }
}

// Push Notification Service - Firebase Cloud Messaging
export interface PushConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class PushService {
  private enabled: boolean;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.enabled = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  }

  private async getAccessToken(): Promise<string | null> {
    if (!this.enabled) return null;

    // Check if token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // In production, use google-auth-library or firebase-admin
      // For now, we'll use a placeholder
      const response = await fetch(
        `https://oauth2.googleapis.com/token?grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${this.generateJwt()}`,
        { method: 'POST' }
      );

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get FCM access token', { error });
      return null;
    }
  }

  private generateJwt(): string {
    // In production, use proper JWT library with RSA signing
    // This is a placeholder
    return '';
  }

  async sendPush(payload: PushPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.enabled) {
      logger.warn('Push notification service not configured', payload);
      return { success: false, error: 'Push service not configured' };
    }

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Failed to authenticate with FCM' };
    }

    try {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: payload.token,
              notification: {
                title: payload.title,
                body: payload.body,
              },
              data: payload.data,
            },
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        logger.info('Push notification sent', { token: payload.token, messageId: data.name });
        return { success: true, messageId: data.name };
      }

      logger.error('Push notification failed', { error: data });
      return { success: false, error: data.error?.message || 'Push failed' };
    } catch (error) {
      logger.error('Push service error', { error });
      return { success: false, error: 'Push service error' };
    }
  }

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    const db = getDb();

    // Get user's FCM tokens from database (would need to add tokens table)
    const tokens = await db('push_tokens').where({ user_id: userId, is_active: true }).pluck('token');

    for (const token of tokens) {
      await this.sendPush({ token, title, body, data });
    }
  }
}

// In-App Notification Service
export class InAppNotificationService {
  async create(userId: string, type: string, title: string, message: string, data?: Record<string, unknown>): Promise<string> {
    const db = getDb();
    const notificationId = require('uuid').v4();

    await db('notifications').insert({
      id: notificationId,
      user_id: userId,
      type,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
      channels: JSON.stringify(['IN_APP']),
      is_read: false,
    });

    // Publish to Redis for real-time delivery
    const redis = getRedis();
    await redis.publish(`notifications:${userId}`, JSON.stringify({
      id: notificationId,
      type,
      title,
      message,
      data,
      createdAt: new Date().toISOString(),
    }));

    return notificationId;
  }

  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    const db = getDb();
    await db('notifications')
      .where('user_id', userId)
      .whereIn('id', notificationIds)
      .update({
        is_read: true,
        read_at: new Date(),
      });
  }

  async markAllAsRead(userId: string): Promise<void> {
    const db = getDb();
    await db('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: new Date(),
      });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const db = getDb();
    const result = await db('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .count('id as count')
      .first();

    return Number(result?.count || 0);
  }

  async getNotifications(userId: string, options: {
    unreadOnly?: boolean;
    type?: string;
    page: number;
    limit: number;
  }): Promise<{ notifications: any[]; total: number; hasMore: boolean }> {
    const db = getDb();
    const offset = (options.page - 1) * options.limit;

    let query = db('notifications')
      .where('user_id', userId)
      .orderBy('created_at', 'desc');

    if (options.unreadOnly) {
      query = query.where('is_read', false);
    }

    if (options.type) {
      query = query.where('type', options.type);
    }

    const [{ count }] = await query.clone().count('id as count');
    const total = Number(count);

    const notifications = await query
      .limit(options.limit)
      .offset(offset);

    return {
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data ? JSON.parse(n.data) : null,
        isRead: n.is_read,
        readAt: n.read_at,
        createdAt: n.created_at,
      })),
      total,
      hasMore: offset + notifications.length < total,
    };
  }
}

// Export singleton instances
export const smsService = new SmsService();
export const pushService = new PushService();
export const inAppService = new InAppNotificationService();