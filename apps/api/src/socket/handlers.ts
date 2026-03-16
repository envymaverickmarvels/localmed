import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { config } from '../../config';
import { getRedis } from '../../config/redis';
import { getDb } from '../../config/database';
import { logger } from '../../config/logger';

interface SocketData {
  userId: string;
  role: string;
  pharmacyId?: string;
}

// Track connected sockets
const userSockets = new Map<string, Set<string>>();
const pharmacySockets = new Map<string, Set<string>>();
const deliverySockets = new Map<string, Set<string>>();

export function setupSocketHandlers(io: Server): void {
  // Authentication middleware
  io.use(async (socket: Socket & { data: SocketData }, next) => {
    const token = socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = verify(token, config.JWT_SECRET) as {
        userId: string;
        role: string;
        sessionId: string
      };

      // Verify session in Redis
      const redis = getRedis();
      const sessionKey = `session:${decoded.userId}:${decoded.sessionId}`;
      const sessionExists = await redis.exists(sessionKey);

      if (!sessionExists) {
        return next(new Error('Session expired'));
      }

      // Attach user data to socket
      socket.data = {
        userId: decoded.userId,
        role: decoded.role,
      };

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket & { data: SocketData }) => {
    const { userId, role } = socket.data;
    logger.info(`Socket connected: ${socket.id} (User: ${userId}, Role: ${role})`);

    // Track user connections
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle pharmacy room joining (for pharmacy owners)
    socket.on('join:pharmacy', async (pharmacyId: string) => {
      try {
        // Verify user owns this pharmacy
        if (role === 'PHARMACY_OWNER') {
          const db = getDb();
          const pharmacy = await db('pharmacies')
            .where({ id: pharmacyId, owner_id: userId })
            .first();

          if (pharmacy) {
            socket.join(`pharmacy:${pharmacyId}`);
            socket.data.pharmacyId = pharmacyId;

            if (!pharmacySockets.has(pharmacyId)) {
              pharmacySockets.set(pharmacyId, new Set());
            }
            pharmacySockets.get(pharmacyId)!.add(socket.id);

            logger.info(`Socket ${socket.id} joined pharmacy room: ${pharmacyId}`);
          }
        }
      } catch (error) {
        logger.error('Error joining pharmacy room', { error, socketId: socket.id });
      }
    });

    // Handle delivery tracking
    socket.on('track:delivery', (deliveryId: string) => {
      socket.join(`delivery:${deliveryId}`);
      logger.info(`Socket ${socket.id} tracking delivery: ${deliveryId}`);
    });

    socket.on('stop:delivery', (deliveryId: string) => {
      socket.leave(`delivery:${deliveryId}`);
      logger.info(`Socket ${socket.id} stopped tracking delivery: ${deliveryId}`);
    });

    // Handle rider location updates
    socket.on('rider:location', async (data: { deliveryId: string; latitude: number; longitude: number }) => {
      try {
        // Verify user is the assigned rider
        if (role !== 'RIDER') return;

        const db = getDb();
        const delivery = await db('deliveries')
          .where({ id: data.deliveryId, rider_id: userId })
          .first();

        if (!delivery) return;

        // Store location in database
        await db.raw(`
          INSERT INTO delivery_tracking (delivery_id, rider_location, recorded_at)
          VALUES (?, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, NOW())
        `, [data.deliveryId, data.longitude, data.latitude]);

        // Broadcast to all users tracking this delivery
        io.to(`delivery:${data.deliveryId}`).emit('delivery:location', {
          deliveryId: data.deliveryId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error handling rider location', { error });
      }
    });

    // Handle pharmacy owner accepting reservations
    socket.on('reservation:confirmed', async (data: { reservationId: string }) => {
      // Emit to user who made the reservation
      const db = getDb();
      const reservation = await db('reservations').where({ id: data.reservationId }).first();

      if (reservation) {
        io.to(`user:${reservation.user_id}`).emit('reservation:confirmed', {
          reservationId: data.reservationId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);

      // Remove from user sockets
      userSockets.get(userId)?.delete(socket.id);

      // Remove from pharmacy sockets
      if (socket.data.pharmacyId) {
        pharmacySockets.get(socket.data.pharmacyId)?.delete(socket.id);
      }

      // Clean up empty sets
      if (userSockets.get(userId)?.size === 0) {
        userSockets.delete(userId);
      }
    });
  });
}

// Helper functions for emitting events
export function emitToUser(io: Server, userId: string, event: string, data: any): void {
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToPharmacy(io: Server, pharmacyId: string, event: string, data: any): void {
  io.to(`pharmacy:${pharmacyId}`).emit(event, data);
}

export function emitToDelivery(io: Server, deliveryId: string, event: string, data: any): void {
  io.to(`delivery:${deliveryId}`).emit(event, data);
}

// Broadcast to all pharmacy owners
export function broadcastToPharmacyOwners(io: Server, event: string, data: any): void {
  // Get all connected pharmacy owner sockets and emit
  for (const [pharmacyId] of pharmacySockets) {
    io.to(`pharmacy:${pharmacyId}`).emit(event, data);
  }
}

// Check if user is connected
export function isUserConnected(userId: string): boolean {
  return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
}

// Get online users count
export function getOnlineUsersCount(): number {
  return userSockets.size;
}

// Get online pharmacies count
export function getOnlinePharmaciesCount(): number {
  return pharmacySockets.size;
}