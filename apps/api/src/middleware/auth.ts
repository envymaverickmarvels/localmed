import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from './error-handling';
import { getRedis } from '../config/redis';

export interface JwtPayload {
  userId: string;
  role: string;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(UnauthorizedError('No token provided'));
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch {
    next(UnauthorizedError('Invalid or expired token'));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      next(UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(user.role)) {
      next(UnauthorizedError('Insufficient permissions'));
      return;
    }

    next();
  };
}

export async function requireActiveSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    next(UnauthorizedError('Authentication required'));
    return;
  }

  try {
    const redis = getRedis();
    const sessionKey = `session:${user.userId}:${user.sessionId}`;
    const sessionExists = await redis.exists(sessionKey);

    if (!sessionExists) {
      next(UnauthorizedError('Session expired or revoked'));
      return;
    }

    next();
  } catch {
    next(UnauthorizedError('Failed to verify session'));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    (req as AuthenticatedRequest).user = decoded;
  } catch {
    // Token is invalid, but we continue without authentication
  }

  next();
}