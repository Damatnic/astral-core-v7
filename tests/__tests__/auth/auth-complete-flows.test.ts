/**
 * Comprehensive authentication flow tests
 * Tests complete authentication journeys including registration, login, MFA, password reset
 */

import { POST as LoginPOST } from '@/app/api/auth/login/route';
import { POST as RegisterPOST } from '@/app/api/auth/register/route';
import { POST as ForgotPasswordPOST } from '@/app/api/auth/forgot-password/route';
import { POST as ResetPasswordPOST } from '@/app/api/auth/reset-password/route';
import { mockPrisma, resetPrismaMocks } from '../../mocks/prisma';
import { createMockRequest, createMockUser } from '../../utils/test-helpers';

// Mock all external dependencies
jest.mock('@/lib/db/prisma', () => ({
  default: mockPrisma
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_123'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn().mockReturnValue({ userId: 'user-123', email: 'test@example.com' })
}));

jest.mock('@/lib/security/encryption', () => ({
  encryption: {
    generateToken: jest.fn().mockReturnValue('mock-token-123'),
    hashPassword: jest.fn().mockReturnValue('hashed_password_123'),
    verifyPassword: jest.fn().mockReturnValue(true)
  }
}));

jest.mock('@/lib/security/audit', () => ({
  audit: {
    logSuccess: jest.fn().mockResolvedValue(undefined),
    logFailure: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('@/lib/security/rate-limit', () => ({
  rateLimiters: {
    auth: {
      getIdentifier: jest.fn().mockReturnValue('test-ip'),
      check: jest.fn().mockResolvedValue({ allowed: true, remaining: 10 })
    },
    passwordReset: {
      getIdentifier: jest.fn().mockReturnValue('test-ip'),
      check: jest.fn().mockResolvedValue({ allowed: true, remaining: 5 })
    }
  }
}));

jest.mock('@/lib/services/notification-service', () => ({
  notificationService: {
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true)
  }
}));

// Import mocked modules
import { hash, compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { audit } from '@/lib/security/audit';
import { notificationService } from '@/lib/services/notification-service';

describe('Complete Authentication Flows', () => {
  beforeEach(() => {
    resetPrismaMocks();
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  });

  describe('User Registration Flow', () => {
    it('should complete full registration workflow for new client user', async () => {
      // Setup: User doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Mock successful user creation
      const newUser = createMockUser({
        id: 'user-123',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'CLIENT',
        isActive: false, // Requires verification
        emailVerified: null
      });
      mockPrisma.user.create.mockResolvedValue(newUser);

      // Mock profile creation
      mockPrisma.profile.create.mockResolvedValue({
        id: 'profile-123',
        userId: 'user-123',
        firstName: 'New',
        lastName: 'User',
        phone: '+1234567890',
        dateOfBirth: new Date('1990-01-01'),
        emergencyContact: {
          name: 'Emergency Contact',
          phone: '+0987654321',
          relationship: 'Family'
        }
      });

      const registrationData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        name: 'New User',
        role: 'CLIENT',
        profile: {
          firstName: 'New',
          lastName: 'User',
          phone: '+1234567890',
          dateOfBirth: '1990-01-01',
          emergencyContact: {
            name: 'Emergency Contact',
            phone: '+0987654321',
            relationship: 'Family'
          }
        }
      };

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: registrationData
      });

      const response = await RegisterPOST(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Registration successful');
      expect(data.user.email).toBe('newuser@example.com');
      expect(data.verificationRequired).toBe(true);

      // Verify user was created with correct data
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newuser@example.com',
          name: 'New User',
          role: 'CLIENT',
          isActive: false,
          verificationToken: 'mock-token-123'
        })
      });

      // Verify profile was created
      expect(mockPrisma.profile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          firstName: 'New',
          lastName: 'User'
        })
      });

      // Verify verification email was sent
      expect(notificationService.sendVerificationEmail).toHaveBeenCalledWith(
        'newuser@example.com',
        'New User',
        'mock-token-123'
      );

      // Verify audit log
      expect(audit.logSuccess).toHaveBeenCalledWith(
        'USER_REGISTRATION',
        'User',
        'user-123',
        expect.objectContaining({ role: 'CLIENT' }),
        undefined
      );
    });

    it('should complete therapist registration with additional validation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const newTherapist = createMockUser({
        id: 'therapist-123',
        email: 'therapist@example.com',
        name: 'Dr. Therapist',
        role: 'THERAPIST',
        isActive: false
      });
      mockPrisma.user.create.mockResolvedValue(newTherapist);

      // Mock therapist profile creation
      mockPrisma.therapistProfile.create.mockResolvedValue({
        id: 'therapist-profile-123',
        userId: 'therapist-123',
        licenseNumber: 'LIC123456',
        licenseState: 'CA',
        specializations: ['ANXIETY', 'DEPRESSION'],
        yearsExperience: 5,
        education: 'PhD in Clinical Psychology',
        bio: 'Experienced therapist'
      });

      const therapistRegistrationData = {
        email: 'therapist@example.com',
        password: 'TherapistPass123!',
        name: 'Dr. Therapist',
        role: 'THERAPIST',
        profile: {
          firstName: 'Doctor',
          lastName: 'Therapist',
          phone: '+1234567890'
        },
        therapistProfile: {
          licenseNumber: 'LIC123456',
          licenseState: 'CA',
          specializations: ['ANXIETY', 'DEPRESSION'],
          yearsExperience: 5,
          education: 'PhD in Clinical Psychology',
          bio: 'Experienced therapist'
        }
      };

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: therapistRegistrationData
      });

      const response = await RegisterPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user.role).toBe('THERAPIST');
      expect(data.requiresApproval).toBe(true);

      // Verify therapist profile creation
      expect(mockPrisma.therapistProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'therapist-123',
          licenseNumber: 'LIC123456',
          specializations: ['ANXIETY', 'DEPRESSION']
        })
      });
    });

    it('should reject registration with existing email', async () => {
      // Setup: User already exists
      const existingUser = createMockUser({ email: 'existing@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'existing@example.com',
          password: 'Password123!',
          name: 'Existing User',
          role: 'CLIENT'
        }
      });

      const response = await RegisterPOST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('User already exists');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should validate input data and reject invalid registration', async () => {
      const invalidRequest = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'invalid-email',
          password: '123', // Too short
          name: '', // Empty name
          role: 'INVALID_ROLE'
        }
      });

      const response = await RegisterPOST(invalidRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('User Login Flow', () => {
    it('should complete successful login flow for verified user', async () => {
      const existingUser = createMockUser({
        id: 'user-123',
        email: 'user@example.com',
        password: 'hashed_password_123',
        isActive: true,
        emailVerified: new Date(),
        mfaEnabled: false
      });
      
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'user@example.com',
          password: 'UserPassword123!'
        }
      });

      const response = await LoginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBe('mock_jwt_token');
      expect(data.user.email).toBe('user@example.com');
      expect(data.requiresMfa).toBe(false);

      // Verify password comparison
      expect(compare).toHaveBeenCalledWith('UserPassword123!', 'hashed_password_123');

      // Verify JWT creation
      expect(sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          email: 'user@example.com',
          role: 'CLIENT'
        }),
        'test-secret',
        expect.objectContaining({ expiresIn: '24h' })
      );

      // Verify last login update
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { lastLoginAt: expect.any(Date) }
      });

      // Verify audit log
      expect(audit.logSuccess).toHaveBeenCalledWith(
        'USER_LOGIN',
        'User',
        'user-123',
        expect.objectContaining({ loginMethod: 'email_password' }),
        'user-123'
      );
    });

    it('should handle MFA-enabled user login', async () => {
      const mfaUser = createMockUser({
        id: 'user-mfa-123',
        email: 'mfa@example.com',
        mfaEnabled: true,
        mfaSecret: 'base32_secret'
      });
      
      mockPrisma.user.findUnique.mockResolvedValue(mfaUser);

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'mfa@example.com',
          password: 'Password123!'
        }
      });

      const response = await LoginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.requiresMfa).toBe(true);
      expect(data.mfaToken).toBeDefined();
      expect(data.token).toBeUndefined(); // No full token until MFA verification
    });

    it('should reject login with invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!'
        }
      });

      const response = await LoginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid credentials');

      // Verify audit log for failed attempt
      expect(audit.logFailure).toHaveBeenCalledWith(
        'USER_LOGIN_FAILED',
        'User',
        null,
        expect.objectContaining({ 
          email: 'nonexistent@example.com',
          reason: 'user_not_found'
        }),
        undefined
      );
    });

    it('should reject login for unverified user', async () => {
      const unverifiedUser = createMockUser({
        email: 'unverified@example.com',
        isActive: false,
        emailVerified: null
      });
      
      mockPrisma.user.findUnique.mockResolvedValue(unverifiedUser);

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'unverified@example.com',
          password: 'Password123!'
        }
      });

      const response = await LoginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Account not verified');
      expect(data.verificationRequired).toBe(true);
    });

    it('should reject login for inactive user', async () => {
      const inactiveUser = createMockUser({
        email: 'inactive@example.com',
        isActive: false,
        emailVerified: new Date(),
        deactivatedAt: new Date()
      });
      
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'inactive@example.com',
          password: 'Password123!'
        }
      });

      const response = await LoginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Account has been deactivated');
    });
  });

  describe('Password Reset Flow', () => {
    it('should complete password reset request for existing user', async () => {
      const existingUser = createMockUser({
        id: 'user-123',
        email: 'user@example.com',
        isActive: true
      });
      
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        passwordResetToken: 'reset-token-123',
        passwordResetExpires: new Date(Date.now() + 3600000) // 1 hour
      });

      const request = createMockRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'user@example.com' }
      });

      const response = await ForgotPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Password reset email sent');

      // Verify reset token was set
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
        data: expect.objectContaining({
          passwordResetToken: 'mock-token-123',
          passwordResetExpires: expect.any(Date)
        })
      });

      // Verify email was sent
      expect(notificationService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Test User',
        'mock-token-123'
      );

      // Verify audit log
      expect(audit.logSuccess).toHaveBeenCalledWith(
        'PASSWORD_RESET_REQUESTED',
        'User',
        'user-123',
        expect.objectContaining({ email: 'user@example.com' }),
        undefined
      );
    });

    it('should complete password reset with valid token', async () => {
      const userWithResetToken = createMockUser({
        id: 'user-123',
        email: 'user@example.com',
        passwordResetToken: 'valid-reset-token',
        passwordResetExpires: new Date(Date.now() + 1800000) // 30 minutes from now
      });
      
      mockPrisma.user.findFirst.mockResolvedValue(userWithResetToken);
      mockPrisma.user.update.mockResolvedValue({
        ...userWithResetToken,
        password: 'new_hashed_password',
        passwordResetToken: null,
        passwordResetExpires: null
      });

      const request = createMockRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: {
          token: 'valid-reset-token',
          password: 'NewSecurePassword123!'
        }
      });

      const response = await ResetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Password reset successful');

      // Verify password was hashed and updated
      expect(hash).toHaveBeenCalledWith('NewSecurePassword123!', 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          password: 'hashed_password_123',
          passwordResetToken: null,
          passwordResetExpires: null
        })
      });

      // Verify audit log
      expect(audit.logSuccess).toHaveBeenCalledWith(
        'PASSWORD_RESET_COMPLETED',
        'User',
        'user-123',
        expect.objectContaining({ method: 'token_reset' }),
        'user-123'
      );
    });

    it('should reject password reset with expired token', async () => {
      const userWithExpiredToken = createMockUser({
        passwordResetToken: 'expired-token',
        passwordResetExpires: new Date(Date.now() - 3600000) // 1 hour ago
      });
      
      mockPrisma.user.findFirst.mockResolvedValue(userWithExpiredToken);

      const request = createMockRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: {
          token: 'expired-token',
          password: 'NewPassword123!'
        }
      });

      const response = await ResetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid or expired reset token');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should reject password reset with invalid token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: {
          token: 'invalid-token',
          password: 'NewPassword123!'
        }
      });

      const response = await ResetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid or expired reset token');
    });

    it('should handle forgot password for non-existent email gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'nonexistent@example.com' }
      });

      const response = await ForgotPasswordPOST(request);
      const data = await response.json();

      // Should return success to prevent email enumeration
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Password reset email sent');

      // But should not actually send email or update database
      expect(notificationService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should enforce rate limiting on login attempts', async () => {
      const { rateLimiters } = await import('@/lib/security/rate-limit');
      rateLimiters.auth.check.mockResolvedValue({ allowed: false, remaining: 0 });

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'user@example.com',
          password: 'Password123!'
        }
      });

      const response = await LoginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many attempts');
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting on password reset requests', async () => {
      const { rateLimiters } = await import('@/lib/security/rate-limit');
      rateLimiters.passwordReset.check.mockResolvedValue({ allowed: false, remaining: 0 });

      const request = createMockRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'user@example.com' }
      });

      const response = await ForgotPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should log security events for audit trail', async () => {
      // Multiple failed login attempts
      mockPrisma.user.findUnique.mockResolvedValue(null);

      for (let i = 0; i < 3; i++) {
        const request = createMockRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: {
            email: 'attacker@example.com',
            password: 'WrongPassword123!'
          }
        });

        await LoginPOST(request);
      }

      // Verify multiple failed attempts were logged
      expect(audit.logFailure).toHaveBeenCalledTimes(3);
      expect(audit.logFailure).toHaveBeenCalledWith(
        'USER_LOGIN_FAILED',
        'User',
        null,
        expect.objectContaining({
          email: 'attacker@example.com',
          reason: 'user_not_found'
        }),
        undefined
      );
    });
  });

  describe('Input Validation and Error Handling', () => {
    it('should validate email format in all auth endpoints', async () => {
      const invalidEmailTests = [
        'invalid-email',
        'user@',
        '@example.com',
        'user.example.com',
        ''
      ];

      for (const invalidEmail of invalidEmailTests) {
        const request = createMockRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: {
            email: invalidEmail,
            password: 'Password123!'
          }
        });

        const response = await LoginPOST(request);
        expect(response.status).toBe(400);
      }
    });

    it('should validate password strength in registration', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'Password',
        'PASSWORD123',
        'password123',
        'Pass1!'
      ];

      for (const weakPassword of weakPasswords) {
        const request = createMockRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: weakPassword,
            name: 'Test User',
            role: 'CLIENT'
          }
        });

        const response = await RegisterPOST(request);
        expect(response.status).toBe(400);
      }
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'user@example.com',
          password: 'Password123!'
        }
      });

      const response = await LoginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');

      // Verify error was logged
      expect(audit.logError).toHaveBeenCalledWith(
        'AUTH_DATABASE_ERROR',
        'Database',
        null,
        expect.objectContaining({ error: 'Database connection failed' }),
        undefined
      );
    });

    it('should handle external service failures gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      notificationService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service down'));

      const request = createMockRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'user@example.com' }
      });

      const response = await ForgotPasswordPOST(request);
      await response.json();

      // Should still return success to user but log the error
      expect(response.status).toBe(200);
      expect(audit.logError).toHaveBeenCalledWith(
        'EMAIL_SERVICE_ERROR',
        'EmailService',
        null,
        expect.objectContaining({ error: 'Email service down' }),
        undefined
      );
    });
  });
});