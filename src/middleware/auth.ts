import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication middleware
 * Verifies JWT access token and attaches user to request
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided. Authorization header must be in format: Bearer <token>',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        confirmedAt: true,
        createdAt: true,
        updatedAt: true,
        userMetadata: true,
        isActive: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User account is deactivated',
      });
      return;
    }

    // Attach user to request
    req.user = user as typeof user & { passwordHash?: never };
    req.userId = decoded.userId;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    const message =
      error instanceof Error ? error.message : 'Invalid or expired token';

    res.status(401).json({
      success: false,
      message,
    });
  }
}
