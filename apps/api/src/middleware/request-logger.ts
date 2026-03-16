import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, logStream } from '../config/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  // Generate request ID
  req.id = uuidv4();
  req.startTime = Date.now();

  // Log request
  const logData = {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };

  logger.info('Incoming request', logData);

  // Log response time on finish
  _res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: _res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}

export { logStream };