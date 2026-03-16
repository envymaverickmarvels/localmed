import { Queue, Worker, Job } from 'bullmq';
import { getRedis } from '../config/redis';

// Job types
export interface ReservationExpiryJob {
  reservationId: string;
}

export interface NotificationJob {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels: string[];
}

export interface PrescriptionOcrJob {
  prescriptionId: string;
  imageUrl: string;
}

export interface DeliveryLocationJob {
  deliveryId: string;
  latitude: number;
  longitude: number;
}

// Queue names
export const QUEUE_NAMES = {
  RESERVATION_EXPIRY: 'reservation-expiry',
  NOTIFICATIONS: 'notifications',
  PRESCRIPTION_OCR: 'prescription-ocr',
  DELIVERY_LOCATION: 'delivery-location',
} as const;

// Create queues
let reservationExpiryQueue: Queue<ReservationExpiryJob> | null = null;
let notificationQueue: Queue<NotificationJob> | null = null;
let prescriptionOcrQueue: Queue<PrescriptionOcrJob> | null = null;

export async function setupQueues(): Promise<void> {
  const connection = getRedis();

  reservationExpiryQueue = new Queue<ReservationExpiryJob>(QUEUE_NAMES.RESERVATION_EXPIRY, {
    connection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });

  notificationQueue = new Queue<NotificationJob>(QUEUE_NAMES.NOTIFICATIONS, {
    connection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });

  prescriptionOcrQueue = new Queue<PrescriptionOcrJob>(QUEUE_NAMES.PRESCRIPTION_OCR, {
    connection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });

  console.log('BullMQ queues initialized');
}

export function getReservationExpiryQueue(): Queue<ReservationExpiryJob> {
  if (!reservationExpiryQueue) {
    throw new Error('Queues not initialized. Call setupQueues first.');
  }
  return reservationExpiryQueue;
}

export function getNotificationQueue(): Queue<NotificationJob> {
  if (!notificationQueue) {
    throw new Error('Queues not initialized. Call setupQueues first.');
  }
  return notificationQueue;
}

export function getPrescriptionOcrQueue(): Queue<PrescriptionOcrJob> {
  if (!prescriptionOcrQueue) {
    throw new Error('Queues not initialized. Call setupQueues first.');
  }
  return prescriptionOcrQueue;
}

// Queue a reservation expiry job
export async function queueReservationExpiry(reservationId: string, delayMs: number): Promise<void> {
  const queue = getReservationExpiryQueue();
  await queue.add(
    'expire-reservation',
    { reservationId },
    { delay: delayMs }
  );
}

// Queue a notification job
export async function queueNotification(job: NotificationJob): Promise<void> {
  const queue = getNotificationQueue();
  await queue.add('send-notification', job);
}

// Queue a prescription OCR job
export async function queuePrescriptionOcr(prescriptionId: string, imageUrl: string): Promise<void> {
  const queue = getPrescriptionOcrQueue();
  await queue.add('process-prescription', { prescriptionId, imageUrl });
}