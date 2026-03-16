import { Worker, Job } from 'bullmq';
import { getRedis } from '../../config/redis';
import { getDb } from '../../config/database';
import { logger } from '../../config/logger';
import { smsService, pushService } from '../external/notification.service';
import { QUEUE_NAMES, NotificationJob } from './queues';

export function createNotificationWorker(): Worker<NotificationJob> {
  const worker = new Worker<NotificationJob>(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job: Job<NotificationJob>) => {
      const { userId, type, title, message, data, channels } = job.data;
      logger.info(`Processing notification for user ${userId}: ${type}`);

      const db = getDb();
      const results: string[] = [];

      // Always create in-app notification
      if (channels.includes('IN_APP')) {
        await db('notifications').insert({
          id: require('uuid').v4(),
          user_id: userId,
          type,
          title,
          message,
          data: data ? JSON.stringify(data) : null,
          channels: JSON.stringify(channels),
          is_read: false,
          sent_at: new Date(),
        });
        results.push('IN_APP');
      }

      // Get user details for SMS/Push
      const user = await db('users').where({ id: userId }).first();

      if (!user) {
        logger.warn(`User ${userId} not found`);
        return results;
      }

      // Send SMS
      if (channels.includes('SMS') && user.phone) {
        try {
          const smsResult = await smsService.sendSms({
            mobile: user.phone,
            message: `${title}: ${message}`,
          });
          if (smsResult.success) {
            results.push('SMS');
          }
        } catch (error) {
          logger.error('Failed to send SMS notification', { error, userId });
        }
      }

      // Send Push notification
      if (channels.includes('PUSH')) {
        try {
          // Get user's FCM tokens
          const tokens = await db('push_tokens')
            .where({ user_id: userId, is_active: true })
            .pluck('token');

          for (const token of tokens) {
            await pushService.sendPush({
              token,
              title,
              body: message,
              data: data ? JSON.stringify(data) : undefined,
            });
          }

          if (tokens.length > 0) {
            results.push('PUSH');
          }
        } catch (error) {
          logger.error('Failed to send Push notification', { error, userId });
        }
      }

      // Send Email
      if (channels.includes('EMAIL') && user.email) {
        // TODO: Integrate with email service
        logger.info('Email notification queued', { userId, email: user.email });
        results.push('EMAIL');
      }

      logger.info(`Notification job ${job.id} completed`, { results });
      return results;
    },
    {
      connection: getRedis(),
      concurrency: 10,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Notification job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Notification job ${job?.id} failed:`, err);
  });

  return worker;
}

// Notification helper functions
export async function sendReservationCreatedNotification(
  userId: string,
  pharmacyId: string,
  reservationId: string
): Promise<void> {
  const db = getDb();
  const { queueNotification } = await import('./queues');

  const pharmacy = await db('pharmacies').where({ id: pharmacyId }).first();

  await queueNotification({
    userId,
    type: 'RESERVATION_CREATED',
    title: 'Reservation Created',
    message: `Your reservation at ${pharmacy?.name || 'pharmacy'} has been created. Please confirm within 30 minutes.`,
    data: { reservationId, pharmacyId },
    channels: ['IN_APP', 'PUSH'],
  });
}

export async function sendReservationConfirmedNotification(
  userId: string,
  pharmacyId: string,
  reservationId: string
): Promise<void> {
  const db = getDb();
  const { queueNotification } = await import('./queues');

  const pharmacy = await db('pharmacies').where({ id: pharmacyId }).first();

  await queueNotification({
    userId,
    type: 'RESERVATION_CONFIRMED',
    title: 'Reservation Confirmed',
    message: `${pharmacy?.name || 'Pharmacy'} has confirmed your reservation. Please pick up within 30 minutes.`,
    data: { reservationId, pharmacyId },
    channels: ['IN_APP', 'SMS', 'PUSH'],
  });
}

export async function sendReservationCancelledNotification(
  userId: string,
  pharmacyId: string,
  reservationId: string,
  reason?: string
): Promise<void> {
  const db = getDb();
  const { queueNotification } = await import('./queues');

  const pharmacy = await db('pharmacies').where({ id: pharmacyId }).first();

  await queueNotification({
    userId,
    type: 'RESERVATION_CANCELLED',
    title: 'Reservation Cancelled',
    message: reason
      ? `Your reservation at ${pharmacy?.name || 'pharmacy'} has been cancelled: ${reason}`
      : `Your reservation at ${pharmacy?.name || 'pharmacy'} has been cancelled.`,
    data: { reservationId, pharmacyId },
    channels: ['IN_APP', 'SMS', 'PUSH'],
  });
}

export async function sendDeliveryAssignedNotification(
  userId: string,
  deliveryId: string,
  riderName: string
): Promise<void> {
  const { queueNotification } = await import('./queues');

  await queueNotification({
    userId,
    type: 'DELIVERY_ASSIGNED',
    title: 'Rider Assigned',
    message: `${riderName} has been assigned to deliver your order.`,
    data: { deliveryId },
    channels: ['IN_APP', 'PUSH'],
  });
}

export async function sendDeliveryStartedNotification(
  userId: string,
  deliveryId: string
): Promise<void> {
  const { queueNotification } = await import('./queues');

  await queueNotification({
    userId,
    type: 'DELIVERY_STARTED',
    title: 'Order On The Way',
    message: 'Your order is on the way! Track your delivery in the app.',
    data: { deliveryId },
    channels: ['IN_APP', 'PUSH'],
  });
}

export async function sendDeliveryCompletedNotification(
  userId: string,
  deliveryId: string
): Promise<void> {
  const { queueNotification } = await import('./queues');

  await queueNotification({
    userId,
    type: 'DELIVERY_COMPLETED',
    title: 'Order Delivered',
    message: 'Your order has been delivered. Thank you for using LocalMed!',
    data: { deliveryId },
    channels: ['IN_APP', 'SMS', 'PUSH'],
  });
}

export async function sendPrescriptionProcessedNotification(
  userId: string,
  prescriptionId: string,
  medicineCount: number
): Promise<void> {
  const { queueNotification } = await import('./queues');

  await queueNotification({
    userId,
    type: 'PRESCRIPTION_PROCESSED',
    title: 'Prescription Processed',
    message: `Your prescription has been processed. ${medicineCount} medicine(s) found.`,
    data: { prescriptionId },
    channels: ['IN_APP', 'PUSH'],
  });
}

export async function sendLowStockAlert(
  pharmacyId: string,
  medicineName: string,
  currentStock: number
): Promise<void> {
  const db = getDb();
  const { queueNotification } = await import('./queues');

  const pharmacy = await db('pharmacies').where({ id: pharmacyId }).first();

  if (!pharmacy) return;

  // Get pharmacy owner
  const owner = await db('users').where({ id: pharmacy.owner_id }).first();

  if (!owner) return;

  await queueNotification({
    userId: owner.id,
    type: 'LOW_STOCK',
    title: 'Low Stock Alert',
    message: `${medicineName} is running low (${currentStock} units remaining).`,
    data: { pharmacyId, medicineName, currentStock },
    channels: ['IN_APP', 'PUSH'],
  });
}