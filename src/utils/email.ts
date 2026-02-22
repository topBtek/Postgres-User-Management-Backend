import { logger } from './logger.js';

/**
 * Email service interface
 * In production, integrate with services like SendGrid, AWS SES, or Nodemailer
 */
export class EmailService {
  /**
   * Send email verification link
   */
  static async sendVerificationEmail(
    email: string,
    token: string
  ): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
    
    // In production, send actual email
    // For now, log it for development
    logger.info('Email verification link:', {
      to: email,
      url: verificationUrl,
    });

    // Simulate email sending
    if (process.env.NODE_ENV === 'development') {
      console.log('\n=== EMAIL VERIFICATION ===');
      console.log(`To: ${email}`);
      console.log(`Link: ${verificationUrl}`);
      console.log('========================\n');
    }
  }

  /**
   * Send password reset link
   */
  static async sendPasswordResetEmail(
    email: string,
    token: string
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
    
    logger.info('Password reset link:', {
      to: email,
      url: resetUrl,
    });

    // Simulate email sending
    if (process.env.NODE_ENV === 'development') {
      console.log('\n=== PASSWORD RESET ===');
      console.log(`To: ${email}`);
      console.log(`Link: ${resetUrl}`);
      console.log('====================\n');
    }
  }
}
