import { prisma } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { generateToken } from '../utils/tokens.js';
import { EmailService } from '../utils/email.js';
import { UserMetadata, AuthResponse } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Register a new user
 */
export async function signup(
  email: string,
  password: string,
  metadata?: UserMetadata,
  role: string = 'user'
): Promise<AuthResponse> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user and identity in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        userMetadata: metadata || {},
        role,
      },
    });

    // Create email identity
    await tx.identity.create({
      data: {
        userId: user.id,
        provider: 'email',
        providerId: email.toLowerCase(),
        identityData: {},
      },
    });

    return user;
  });

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: result.id,
    email: result.email,
    role: result.role,
  });

  const refreshToken = generateRefreshToken({
    userId: result.id,
    email: result.email,
    role: result.role,
  });

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: result.id,
      token: refreshToken,
      expiresAt,
    },
  });

  // Send verification email (optional)
  const verificationToken = generateToken();
  const expiresAtVerification = new Date();
  expiresAtVerification.setHours(expiresAtVerification.getHours() + 24); // 24 hours

  await prisma.emailVerificationToken.create({
    data: {
      userId: result.id,
      token: verificationToken,
      expiresAt: expiresAtVerification,
    },
  });

  // Send email (non-blocking)
  EmailService.sendVerificationEmail(result.email, verificationToken).catch((err) => {
    logger.error('Failed to send verification email:', err);
  });

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = result;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
}

/**
 * Sign in user
 */
export async function signin(
  email: string,
  password: string
): Promise<AuthResponse> {
  // Find user with email identity
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('User account is deactivated');
  }

  if (!user.passwordHash) {
    throw new Error('Please use OAuth to login');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
    },
  });

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string }> {
  // Verify refresh token
  const { verifyRefreshToken } = await import('../utils/jwt.js');
  const decoded = verifyRefreshToken(refreshToken);

  // Check if token exists and is valid in database
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!tokenRecord) {
    throw new Error('Invalid refresh token');
  }

  if (tokenRecord.revokedAt) {
    throw new Error('Refresh token has been revoked');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new Error('Refresh token has expired');
  }

  if (!tokenRecord.user.isActive) {
    throw new Error('User account is deactivated');
  }

  // Generate new access token
  const accessToken = generateAccessToken({
    userId: tokenRecord.user.id,
    email: tokenRecord.user.email,
    role: tokenRecord.user.role,
  });

  return { accessToken };
}

/**
 * Logout user (revoke refresh token)
 */
export async function logout(userId: string, refreshToken?: string): Promise<void> {
  if (refreshToken) {
    // Revoke specific token
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        token: refreshToken,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  } else {
    // Revoke all tokens for user
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}

/**
 * Request password reset
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    // Don't reveal if user exists (security best practice)
    return;
  }

  // Generate reset token
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

  // Delete old tokens
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // Create new token
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  // Send email
  EmailService.sendPasswordResetEmail(user.email, token).catch((err) => {
    logger.error('Failed to send password reset email:', err);
  });
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  // Find token
  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!tokenRecord) {
    throw new Error('Invalid or expired reset token');
  }

  if (tokenRecord.usedAt) {
    throw new Error('Reset token has already been used');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new Error('Reset token has expired');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password and mark token as used
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash },
    });

    await tx.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    // Revoke all refresh tokens for security
    await tx.refreshToken.updateMany({
      where: { userId: tokenRecord.userId },
      data: { revokedAt: new Date() },
    });
  });
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<void> {
  // Find token
  const tokenRecord = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!tokenRecord) {
    throw new Error('Invalid or expired verification token');
  }

  if (tokenRecord.usedAt) {
    throw new Error('Verification token has already been used');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new Error('Verification token has expired');
  }

  // Update user and mark token as used
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: tokenRecord.userId },
      data: { confirmedAt: new Date() },
    });

    await tx.emailVerificationToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });
  });
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  metadata: Partial<UserMetadata>
): Promise<Omit<import('@prisma/client').User, 'passwordHash'>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const currentMetadata = (user.userMetadata as UserMetadata) || {};
  const updatedMetadata = { ...currentMetadata, ...metadata };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      userMetadata: updatedMetadata,
    },
  });

  const { passwordHash: _, ...userWithoutPassword } = updated;
  return userWithoutPassword;
}
