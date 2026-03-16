import { createReservationExpiryWorker } from './reservation-expiry.worker';
import { createNotificationWorker } from './notification.worker';
import { createPrescriptionOcrWorker } from './prescription-ocr.worker';
import { logger } from '../config/logger';

export type Worker = ReturnType<typeof createReservationExpiryWorker>;

let workers: Worker[] = [];

export function startWorkers(): void {
  logger.info('Starting background workers...');

  try {
    const reservationWorker = createReservationExpiryWorker();
    workers.push(reservationWorker as any);
    logger.info('Reservation expiry worker started');

    const notificationWorker = createNotificationWorker();
    workers.push(notificationWorker as any);
    logger.info('Notification worker started');

    const ocrWorker = createPrescriptionOcrWorker();
    workers.push(ocrWorker as any);
    logger.info('Prescription OCR worker started');

    logger.info('All workers started successfully');
  } catch (error) {
    logger.error('Failed to start workers:', error);
    throw error;
  }
}

export async function stopWorkers(): Promise<void> {
  logger.info('Stopping background workers...');

  const closePromises = workers.map(worker => worker.close());
  await Promise.all(closePromises);

  workers = [];
  logger.info('All workers stopped');
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down workers...');
  await stopWorkers();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down workers...');
  await stopWorkers();
});