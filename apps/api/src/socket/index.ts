import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { config } from '../config';
import { getRedis } from '../config/redis';

interface SocketData {
  userId: string;
  role: string;
  pharmacyId?: string;
}

// Store socket connections
const userSockets = new Map<string, Set<string>>();
const pharmacySockets = new Map<string, Set<string>>();

export function setupSocketHandlers(io: Server): void {
  // Authentication middleware
  io.use(async (socket: Socket & { data: SocketData }, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = verify(token, config.JWT_SECRET) as { userId: string; role: string; sessionId: string };

      // Verify session in Redis
      const redis = getRedis();
      const sessionKey = `session:${decoded.userId}:${decoded.sessionId}`;
      const sessionExists = await redis.exists(sessionKey);

      if (!sessionExists) {
        return next(new Error('Session expired'));
      }

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
    console.log(`Socket connected: ${socket.id} (User: ${socket.data.userId})`);

    // Track user connections
    if (!userSockets.has(socket.data.userId)) {
      userSockets.set(socket.data.userId, new Set());
    }
    userSockets.get(socket.data.userId)!.add(socket.id);

    // Join user's personal room for notifications
    socket.join(`user:${socket.data.userId}`);

    // Handle pharmacy room joining (for pharmacy owners)
    socket.on('join:pharmacy', (pharmacyId: string) => {
      socket.join(`pharmacy:${pharmacyId}`);
      socket.data.pharmacyId = pharmacyId;

      if (!pharmacySockets.has(pharmacyId)) {
        pharmacySockets.set(pharmacyId, new Set());
      }
      pharmacySockets.get(pharmacyId)!.add(socket.id);

      console.log(`Socket ${socket.id} joined pharmacy room: ${pharmacyId}`);
    });

    // Handle leaving pharmacy room
    socket.on('leave:pharmacy', (pharmacyId: string) => {
      socket.leave(`pharmacy:${pharmacyId}`);
      pharmacySockets.get(pharmacyId)?.delete(socket.id);
      console.log(`Socket ${socket.id} left pharmacy room: ${pharmacyId}`);
    });

    // Handle delivery tracking
    socket.on('track:delivery', (deliveryId: string) => {
      socket.join(`delivery:${deliveryId}`);
      console.log(`Socket ${socket.id} tracking delivery: ${deliveryId}`);
    });

    // Handle stopping delivery tracking
    socket.on('stop:delivery', (deliveryId: string) => {
      socket.leave(`delivery:${deliveryId}`);
      console.log(`Socket ${socket.id} stopped tracking delivery: ${deliveryId}`);
    });

    // Handle rider location updates
    socket.on('rider:location', async (data: { deliveryId: string; latitude: number; longitude: number }) => {
      // Broadcast to all users tracking this delivery
      io.to(`delivery:${data.deliveryId}`).emit('delivery:location', {
        deliveryId: data.deliveryId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);

      // Remove from user sockets
      userSockets.get(socket.data.userId)?.delete(socket.id);

      // Remove from pharmacy sockets
      if (socket.data.pharmacyId) {
        pharmacySockets.get(socket.data.pharmacyId)?.delete(socket.id);
      }
    });
  });
}

// Helper functions to emit events
export function emitToUser(io: Server, userId: string, event: string, data: any): void {
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToPharmacy(io: Server, pharmacyId: string, event: string, data: any): void {
  io.to(`pharmacy:${pharmacyId}`).emit(event, data);
}

export function emitToDelivery(io: Server, deliveryId: string, event: string, data: any): void {
  io.to(`delivery:${deliveryId}`).emit(event, data);
}