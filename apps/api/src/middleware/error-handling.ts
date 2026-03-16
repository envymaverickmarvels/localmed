import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export interface AppError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;
}

export class HttpError extends Error implements AppError {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common errors
export const BadRequestError = (message: string, details?: Record<string, unknown>) =>
  new HttpError(400, 'BAD_REQUEST', message, details);

export const UnauthorizedError = (message: string = 'Unauthorized') =>
  new HttpError(401, 'UNAUTHORIZED', message);

export const ForbiddenError = (message: string = 'Forbidden') =>
  new HttpError(403, 'FORBIDDEN', message);

export const NotFoundError = (resource: string = 'Resource') =>
  new HttpError(404, 'NOT_FOUND', `${resource} not found`);

export const ConflictError = (message: string) =>
  new HttpError(409, 'CONFLICT', message);

export const ValidationError = (message: string, details?: Record<string, unknown>) =>
  new HttpError(422, 'VALIDATION_ERROR', message, details);

export const InternalError = (message: string = 'Internal server error') =>
  new HttpError(500, 'INTERNAL_ERROR', message);

// Error handler middleware
export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: Record<string, unknown> | undefined;

  if (error instanceof HttpError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid request data';
    details = error.errors;
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error:', {
      error: error.message,
      stack: error.stack,
      statusCode,
    });
  } else {
    logger.warn('Client error:', {
      error: error.message,
      statusCode,
      code,
    });
  }

  // Send response
  const response: Record<string, unknown> = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error = { ...response.error, details };
  }

  res.status(statusCode).json(response);
}

// Not found handler
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
}