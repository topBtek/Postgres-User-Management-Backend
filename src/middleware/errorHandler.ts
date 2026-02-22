import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((error) => ({
        field: error.path.join('.'),
        message: error.message,
      })),
    };

    res.status(400).json(response);
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const response: ErrorResponse = {
        success: false,
        message: 'Unique constraint violation',
        errors: [
          {
            field: err.meta?.target as string || 'unknown',
            message: 'This value already exists',
          },
        ],
      };
      res.status(409).json(response);
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Record not found',
      });
      return;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: err.message || 'Invalid token',
    });
    return;
  }

  // Default error response
  const statusCode = (err as { statusCode?: number }).statusCode || 500;
  const response: ErrorResponse = {
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFound(req: Request, res: Response, next: NextFunction): void {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  (error as { statusCode: number }).statusCode = 404;
  next(error);
}
