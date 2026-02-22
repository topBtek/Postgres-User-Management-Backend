import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, SuccessResponse } from '../types/index.js';
import * as authService from '../services/authService.js';
import { logger } from '../utils/logger.js';

/**
 * Sign up a new user
 */
export async function signup(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, metadata, role } = req.body;

    // Only allow admin role assignment if user is admin
    const assignedRole = req.user && req.user.role === 'admin' ? (role || 'user') : 'user';

    const result = await authService.signup(email, password, metadata, assignedRole);

    const response: SuccessResponse = {
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: result,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Sign in user
 */
export async function signin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    const result = await authService.signin(email, password);

    const response: SuccessResponse = {
      success: true,
      message: 'Login successful',
      data: result,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token
 */
export async function refresh(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
      return;
    }

    const result = await authService.refreshAccessToken(refreshToken);

    const response: SuccessResponse = {
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Logout user
 */
export async function logout(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const userId = req.userId || req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    await authService.logout(userId, refreshToken);

    const response: SuccessResponse = {
      success: true,
      message: 'Logout successful',
      data: {},
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user profile
 */
export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const response: SuccessResponse = {
      success: true,
      data: { user: req.user },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Update user profile
 */
export async function updateMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId || req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { metadata } = req.body;

    const updatedUser = await authService.updateProfile(userId, metadata);

    const response: SuccessResponse = {
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Request password reset
 */
export async function forgotPassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    // Don't reveal if user exists (security best practice)
    await authService.forgotPassword(email);

    const response: SuccessResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      data: {},
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, password } = req.body;

    await authService.resetPassword(token, password);

    const response: SuccessResponse = {
      success: true,
      message: 'Password reset successfully',
      data: {},
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token } = req.body;

    await authService.verifyEmail(token);

    const response: SuccessResponse = {
      success: true,
      message: 'Email verified successfully',
      data: {},
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}
