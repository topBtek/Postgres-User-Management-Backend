import express from 'express';
import { z } from 'zod';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, refreshLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  metadata: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    avatar_url: z.string().url().optional(),
    phone: z.string().optional(),
  }).optional(),
  role: z.enum(['user', 'admin']).optional(),
});

const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const updateProfileSchema = z.object({
  metadata: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    avatar_url: z.string().url().optional(),
    phone: z.string().optional(),
  }).optional(),
});

// Routes
router.post(
  '/signup',
  authLimiter,
  validate(signupSchema, 'body'),
  authController.signup
);

router.post(
  '/signin',
  authLimiter,
  validate(signinSchema, 'body'),
  authController.signin
);

router.post(
  '/refresh',
  refreshLimiter,
  validate(refreshSchema, 'body'),
  authController.refresh
);

router.post(
  '/logout',
  authenticate,
  validate(logoutSchema, 'body'),
  authController.logout
);

router.get(
  '/me',
  authenticate,
  authController.getMe
);

router.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema, 'body'),
  authController.updateMe
);

router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema, 'body'),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema, 'body'),
  authController.resetPassword
);

router.post(
  '/verify-email',
  validate(verifyEmailSchema, 'body'),
  authController.verifyEmail
);

export default router;
