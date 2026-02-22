import express from 'express';
import authRoutes from './authRoutes.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Protected route example
router.get('/protected', authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'This is a protected route',
    user: {
      id: (req as any).user?.id,
      email: (req as any).user?.email,
      role: (req as any).user?.role,
    },
  });
});

// Mount route modules
router.use('/auth', authRoutes);

export default router;
