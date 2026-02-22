import { randomBytes } from 'crypto';

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a UUID-like token for email verification and password reset
 */
export function generateToken(): string {
  return generateSecureToken(32);
}
