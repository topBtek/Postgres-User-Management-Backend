import { User, Identity, RefreshToken } from '@prisma/client';

/**
 * Extended User type with relations
 */
export type UserWithRelations = User & {
  identities?: Identity[];
  refreshTokens?: RefreshToken[];
};

/**
 * User metadata structure (stored as JSONB)
 */
export interface UserMetadata {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  [key: string]: unknown;
}

/**
 * JWT Payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type?: 'access' | 'refresh';
}

/**
 * Auth response structure
 */
export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

/**
 * Request with authenticated user
 */
export interface AuthenticatedRequest extends Express.Request {
  user?: User;
  userId?: string;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  stack?: string;
}

/**
 * Success response structure
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}
