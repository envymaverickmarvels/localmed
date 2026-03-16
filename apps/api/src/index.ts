import 'dotenv/config';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { logger } from './config/logger';
import { setupDatabase, closeDatabase } from './config/database';
import { setupRedis, closeRedis } from './config/redis';
import { errorHandler, notFoundHandler } from './middleware/error-handling';
import { requestLogger } from './middleware/request-logger';
import { setupRoutes } from './routes';
import { setupSocketHandlers } from './socket';
import { setupQueues, closeQueues } from './jobs/queues';
import { startWorkers, stopWorkers } from './workers';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: config.corsOrigins,
    credentials: true,
  },
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api', setupRoutes());

// Static files for uploaded prescriptions
app.use('/uploads', express.static('uploads'));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Socket setup
setupSocketHandlers(io);

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');

  // Stop accepting new connections
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Stop workers
  await stopWorkers();

  // Close queues
  await closeQueues();

  // Close database
  await closeDatabase();

  // Close Redis
  await closeRedis();

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start() {
  try {
    // Initialize database
    await setupDatabase();
    logger.info('Database connected');

    // Initialize Redis
    await setupRedis();
    logger.info('Redis connected');

    // Initialize queues
    await setupQueues();
    logger.info('Queues initialized');

    // Start background workers
    startWorkers();

    // Start HTTP server
    const PORT = config.port;
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        env: config.nodeEnv,
        cors: config.corsOrigins,
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app, io };