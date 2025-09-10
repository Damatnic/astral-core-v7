import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import prisma from '@/lib/db/prisma';
import { MfaMethod } from '@prisma/client';
import { audit } from '@/lib/security/audit';
import { notificationService } from './notification-service';
import { phiService } from '@/lib/security/phi-service';

interface MfaSetupResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface VerificationResult {
  success: boolean;
  message: string;
  remainingAttempts?: number;
}

export class MfaService {
  private readonly APP_NAME = 'Astral Core';
  private readonly MAX_VERIFICATION_ATTEMPTS = 3;
  private readonly CODE_EXPIRY_MINUTES = 5;
  private readonly BACKUP_CODE_COUNT = 10;
  private verificationAttempts: Map<string, number> = new Map();
  private sentCodes: Map<string, { code: string; expires: Date }> = new Map();

  // Setup TOTP (Time-based One-Time Password)
  async setupTotp(userId: string): Promise<MfaSetupResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${this.APP_NAME} (${user.email})`,
        issuer: this.APP_NAME,
        length: 32,
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => this.hashBackupCode(code))
      );

      // Store encrypted secret temporarily (not saved until verified)
      const encryptedSecret = await phiService.encryptField(secret.base32);

      // Store in temporary table or cache
      // For now, we'll return it to be stored after verification
      
      await audit.logSuccess(
        'MFA_SETUP_INITIATED',
        'User',
        userId,
        { method: 'TOTP' },
        userId
      );

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      console.error('Error setting up TOTP:', error);
      throw error;
    }
  }

  // Enable MFA after verification
  async enableMfa(
    userId: string,
    method: MfaMethod,
    secret: string,
    verificationCode: string,
    backupCodes?: string[]
  ): Promise<boolean> {
    try {
      // Verify the code first
      const isValid = await this.verifyTotp(secret, verificationCode);
      
      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      // Encrypt secret for storage
      const encryptedSecret = await phiService.encryptField(secret);
      
      // Hash backup codes
      const hashedBackupCodes = backupCodes
        ? await Promise.all(backupCodes.map(code => this.hashBackupCode(code)))
        : [];

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaMethod: method,
          mfaSecret: encryptedSecret,
          mfaBackupCodes: hashedBackupCodes,
          mfaVerified: true,
        },
      });

      await audit.logSuccess(
        'MFA_ENABLED',
        'User',
        userId,
        { method },
        userId
      );

      // Send confirmation notification
      await notificationService.createNotification({
        userId,
        title: 'Two-Factor Authentication Enabled',
        message: 'Your account is now protected with two-factor authentication',
        type: 'SYSTEM',
        priority: 'HIGH',
      });

      return true;
    } catch (error) {
      console.error('Error enabling MFA:', error);
      throw error;
    }
  }

  // Verify TOTP code
  async verifyTotp(secret: string, token: string): Promise<boolean> {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time steps before/after
      });
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return false;
    }
  }

  // Verify MFA during login
  async verifyMfa(
    userId: string,
    code: string,
    isBackupCode: boolean = false
  ): Promise<VerificationResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          mfaSecret: true,
          mfaMethod: true,
          mfaBackupCodes: true,
          mfaEnabled: true,
        },
      });

      if (!user || !user.mfaEnabled) {
        return {
          success: false,
          message: 'MFA not enabled for this user',
        };
      }

      // Track verification attempts
      const attempts = this.verificationAttempts.get(userId) || 0;
      if (attempts >= this.MAX_VERIFICATION_ATTEMPTS) {
        await this.handleExcessiveAttempts(userId);
        return {
          success: false,
          message: 'Too many failed attempts. Account temporarily locked.',
        };
      }

      let verified = false;

      if (isBackupCode) {
        verified = await this.verifyBackupCode(userId, code);
      } else {
        switch (user.mfaMethod) {
          case 'TOTP':
            if (user.mfaSecret) {
              const decryptedSecret = await phiService.decryptField(user.mfaSecret);
              verified = await this.verifyTotp(decryptedSecret, code);
            }
            break;
          case 'SMS':
            verified = await this.verifySmsCode(userId, code);
            break;
          case 'EMAIL':
            verified = await this.verifyEmailCode(userId, code);
            break;
        }
      }

      if (verified) {
        this.verificationAttempts.delete(userId);
        
        await audit.logSuccess(
          'MFA_VERIFICATION_SUCCESS',
          'User',
          userId,
          { method: user.mfaMethod, isBackupCode },
          userId
        );

        return {
          success: true,
          message: 'MFA verification successful',
        };
      } else {
        this.verificationAttempts.set(userId, attempts + 1);
        
        await audit.logFailure(
          'MFA_VERIFICATION_FAILED',
          'User',
          userId,
          'Invalid MFA code',
          { attemptsRemaining: this.MAX_VERIFICATION_ATTEMPTS - attempts - 1 },
          userId
        );

        return {
          success: false,
          message: 'Invalid code',
          remainingAttempts: this.MAX_VERIFICATION_ATTEMPTS - attempts - 1,
        };
      }
    } catch (error) {
      console.error('Error verifying MFA:', error);
      return {
        success: false,
        message: 'Verification failed',
      };
    }
  }

  // Send SMS code
  async sendSmsCode(userId: string, phoneNumber: string): Promise<void> {
    try {
      const code = this.generateNumericCode();
      const expires = new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000);

      // Store code temporarily
      this.sentCodes.set(`sms:${userId}`, { code, expires });

      // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
      console.log(`Would send SMS to ${phoneNumber}: Your verification code is ${code}`);

      // For development, also create a notification
      await notificationService.createNotification({
        userId,
        title: 'SMS Verification Code',
        message: `Your verification code is: ${code}`,
        type: 'SYSTEM',
        priority: 'HIGH',
      });

      await audit.logSuccess(
        'MFA_SMS_SENT',
        'User',
        userId,
        { phoneNumber: phoneNumber.slice(-4) },
        userId
      );
    } catch (error) {
      console.error('Error sending SMS code:', error);
      throw error;
    }
  }

  // Send email code
  async sendEmailCode(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const code = this.generateNumericCode();
      const expires = new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000);

      // Store code temporarily
      this.sentCodes.set(`email:${userId}`, { code, expires });

      // In production, send actual email
      console.log(`Would send email to ${user.email}: Your verification code is ${code}`);

      // For development, create notification
      await notificationService.createNotification({
        userId,
        title: 'Email Verification Code',
        message: `Your verification code is: ${code}`,
        type: 'SYSTEM',
        priority: 'HIGH',
      });

      await audit.logSuccess(
        'MFA_EMAIL_SENT',
        'User',
        userId,
        { email: user.email },
        userId
      );
    } catch (error) {
      console.error('Error sending email code:', error);
      throw error;
    }
  }

  // Verify SMS code
  private async verifySmsCode(userId: string, code: string): Promise<boolean> {
    const storedData = this.sentCodes.get(`sms:${userId}`);
    
    if (!storedData) {
      return false;
    }

    if (new Date() > storedData.expires) {
      this.sentCodes.delete(`sms:${userId}`);
      return false;
    }

    const isValid = storedData.code === code;
    if (isValid) {
      this.sentCodes.delete(`sms:${userId}`);
    }

    return isValid;
  }

  // Verify email code
  private async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    const storedData = this.sentCodes.get(`email:${userId}`);
    
    if (!storedData) {
      return false;
    }

    if (new Date() > storedData.expires) {
      this.sentCodes.delete(`email:${userId}`);
      return false;
    }

    const isValid = storedData.code === code;
    if (isValid) {
      this.sentCodes.delete(`email:${userId}`);
    }

    return isValid;
  }

  // Verify backup code
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { mfaBackupCodes: true },
      });

      if (!user || !user.mfaBackupCodes) {
        return false;
      }

      // Check if code matches any stored backup code
      for (let i = 0; i < user.mfaBackupCodes.length; i++) {
        const isMatch = await this.compareBackupCode(code, user.mfaBackupCodes[i]);
        if (isMatch) {
          // Remove used backup code
          const newBackupCodes = [...user.mfaBackupCodes];
          newBackupCodes.splice(i, 1);
          
          await prisma.user.update({
            where: { id: userId },
            data: { mfaBackupCodes: newBackupCodes },
          });

          // Notify user that backup code was used
          await notificationService.createNotification({
            userId,
            title: 'Backup Code Used',
            message: `A backup code was used to access your account. ${newBackupCodes.length} codes remaining.`,
            type: 'SYSTEM',
            priority: 'HIGH',
          });

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }

  // Disable MFA
  async disableMfa(userId: string, password: string): Promise<boolean> {
    try {
      // Verify password first (implement password verification)
      // ... password verification logic ...

      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaMethod: null,
          mfaSecret: null,
          mfaBackupCodes: [],
          mfaVerified: false,
        },
      });

      await audit.logSuccess(
        'MFA_DISABLED',
        'User',
        userId,
        {},
        userId
      );

      await notificationService.createNotification({
        userId,
        title: 'Two-Factor Authentication Disabled',
        message: 'Two-factor authentication has been removed from your account',
        type: 'SYSTEM',
        priority: 'HIGH',
      });

      return true;
    } catch (error) {
      console.error('Error disabling MFA:', error);
      throw error;
    }
  }

  // Generate new backup codes
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => this.hashBackupCode(code))
      );

      await prisma.user.update({
        where: { id: userId },
        data: { mfaBackupCodes: hashedBackupCodes },
      });

      await audit.logSuccess(
        'MFA_BACKUP_CODES_REGENERATED',
        'User',
        userId,
        { count: backupCodes.length },
        userId
      );

      return backupCodes;
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw error;
    }
  }

  // Check if user has MFA enabled
  async isMfaEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    return user?.mfaEnabled || false;
  }

  // Get MFA status
  async getMfaStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaMethod: true,
        mfaVerified: true,
        mfaBackupCodes: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      enabled: user.mfaEnabled,
      method: user.mfaMethod,
      verified: user.mfaVerified,
      backupCodesRemaining: user.mfaBackupCodes?.length || 0,
    };
  }

  // Helper methods
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      codes.push(this.generateAlphanumericCode());
    }
    return codes;
  }

  private generateNumericCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateAlphanumericCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i === 3) code += '-'; // Format as XXXX-XXXX
    }
    return code;
  }

  private async hashBackupCode(code: string): Promise<string> {
    return crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');
  }

  private async compareBackupCode(code: string, hash: string): Promise<boolean> {
    const codeHash = await this.hashBackupCode(code);
    return codeHash === hash;
  }

  private async handleExcessiveAttempts(userId: string) {
    // Lock account temporarily
    const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: lockUntil },
    });

    await audit.logFailure(
      'MFA_EXCESSIVE_ATTEMPTS',
      'User',
      userId,
      'Account locked due to excessive MFA attempts',
      { lockedUntil: lockUntil },
      userId
    );

    // Send security alert
    await notificationService.createNotification({
      userId,
      title: 'Security Alert',
      message: 'Multiple failed MFA attempts detected. Your account has been temporarily locked.',
      type: 'SYSTEM',
      priority: 'URGENT',
    });
  }

  // Clean up expired codes periodically
  cleanupExpiredCodes() {
    const now = new Date();
    for (const [key, data] of this.sentCodes.entries()) {
      if (data.expires < now) {
        this.sentCodes.delete(key);
      }
    }
  }
}

export const mfaService = new MfaService();

// Cleanup expired codes every 5 minutes
setInterval(() => {
  mfaService.cleanupExpiredCodes();
}, 5 * 60 * 1000);