import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';

/**
 * Role-Based Access Control middleware
 * @param allowedRoles - Roles that are allowed to access the route
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user is admin
 */
export const isAdmin = authorize('admin');

/**
 * Middleware to check if user is admin or the resource owner
 */
export function isAdminOrOwner(getUserId: (req: AuthenticatedRequest) => string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userRole = req.user.role;
    const userId = req.user.id;
    const resourceUserId = getUserId(req);

    if (userRole === 'admin' || userId === resourceUserId) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources or be an admin.',
    });
  };
}
