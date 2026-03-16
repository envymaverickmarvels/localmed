import { Worker, Job } from 'bullmq';
import { getRedis } from '../config/redis';
import { getDb } from '../config/database';
import { QUEUE_NAMES, ReservationExpiryJob } from './queues';

export function createReservationExpiryWorker(): Worker<ReservationExpiryJob> {
  const worker = new Worker<ReservationExpiryJob>(
    QUEUE_NAMES.RESERVATION_EXPIRY,
    async (job: Job<ReservationExpiryJob>) => {
      const { reservationId } = job.data;
      console.log(`Processing reservation expiry for: ${reservationId}`);

      const db = getDb();

      // Get reservation
      const reservation = await db('reservations').where({ id: reservationId }).first();

      if (!reservation) {
        console.log(`Reservation ${reservationId} not found, skipping`);
        return;
      }

      // Only expire if still pending
      if (reservation.status !== 'PENDING') {
        console.log(`Reservation ${reservationId} is ${reservation.status}, skipping expiry`);
        return;
      }

      // Check if expired
      const now = new Date();
      if (new Date(reservation.expires_at) > now) {
        console.log(`Reservation ${reservationId} not yet expired, skipping`);
        return;
      }

      // Use transaction to update status and release stock holds
      await db.transaction(async (trx) => {
        // Update reservation status
        await trx('reservations')
          .where({ id: reservationId })
          .update({ status: 'EXPIRED', updated_at: new Date() });

        // Get stock holds
        const holds = await trx('stock_holds').where({ reservation_id: reservationId });

        // Release stock holds and restore inventory
        for (const hold of holds) {
          await trx('stock_holds')
            .where({ id: hold.id })
            .update({ released_at: new Date() });

          await trx('inventory')
            .where({ id: hold.inventory_id })
            .increment('quantity', hold.quantity);
        }

        console.log(`Reservation ${reservationId} expired successfully`);
      });
    },
    {
      connection: getRedis(),
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Reservation expiry job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Reservation expiry job ${job?.id} failed:`, err);
  });

  return worker;
}