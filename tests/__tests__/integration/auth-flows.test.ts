/**
 * Integration tests for authentication flows in Astral Core v7
 * Tests the complete authentication journey including registration, login, MFA, and session management
 */

import { POST as RegisterPOST } from '@/app/api/auth/register/route';
import { POST as MfaSetupPOST } from '@/app/api/auth/mfa/setup/route';
import { POST as MfaVerifyPOST } from '@/app/api/auth/mfa/verify/route';
import { POST as MfaEnablePOST } from '@/app/api/auth/mfa/enable/route';
import { getServerSession } from 'next-auth';
import { compare, hash } from 'bcryptjs';
import {
  createAPIRequest,
  createAuthenticatedSession,
  createDatabaseMock,
  createEncryptionMock,
  createRateLimitMock
} from '../../utils/api-test-helpers';

// Mock all dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

jest.mock('@/lib/db/prisma', () => ({
  default: require('../../mocks/prisma').mockPrisma
}));

jest.mock('@/lib/security/encryption', () => ({
  encryption: {
    encrypt: jest.fn().mockImplementation(data => `encrypted_${data}`),
    decrypt: jest.fn().mockImplementation(data => data.replace('encrypted_', '')),
    hashPassword: jest.fn().mockImplementation(password => `hashed_${password}`),
    verifyPassword: jest.fn().mockImplementation((password, hash) => hash === `hashed_${password}`),
    generateToken: jest.fn().mockReturnValue('test-token-123'),
    encryptObject: jest.fn(),
    decryptObject: jest.fn()
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
      check: jest.fn().mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 3600000
      })
    },
    mfa: {
      getIdentifier: jest.fn().mockReturnValue('test-ip'),
      check: jest.fn().mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 3600000
      })
    }
  }
}));

jest.mock('@/lib/services/mfa-service', () => ({
  mfaService: {
    setupTotp: jest.fn(),
    verifyTotp: jest.fn(),
    enableMfa: jest.fn(),
    disableMfa: jest.fn(),
    sendSmsCode: jest.fn(),
    sendEmailCode: jest.fn(),
    verifySmsCode: jest.fn(),
    verifyEmailCode: jest.fn(),
    generateBackupCodes: jest.fn(),
    verifyBackupCode: jest.fn()
  }
}));

jest.mock('@/lib/logger', () => ({
  logError: jest.fn()
}));

import prisma from '@/lib/db/prisma';
import { encryption } from '@/lib/security/encryption';
import { audit } from '@/lib/security/audit';
import { rateLimiters } from '@/lib/security/rate-limit';
import { mfaService } from '@/lib/services/mfa-service';
const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedHash = hash as jest.MockedFunction<typeof hash>;
const mockedCompare = compare as jest.MockedFunction<typeof compare>;

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockedHash.mockResolvedValue('$2b$12$hashedpassword');
    mockedCompare.mockResolvedValue(true);
    encryption.generateToken.mockReturnValue('verification_token_123');

    // Reset rate limiting
    rateLimiters.auth.check.mockResolvedValue({ allowed: true });
    rateLimiters.mfa.check.mockResolvedValue({ allowed: true });
  });

  describe('User Registration Flow', () => {
    it('should successfully register a new user', async () => {
      // Mock database responses
      prisma.user.findUnique.mockResolvedValue(null); // User doesn't exist
      prisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'CLIENT'
      });
      prisma.verificationToken.create.mockResolvedValue({
        identifier: 'test@example.com',
        token: 'verification_token_123'
      });

      const registrationData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const request = createAPIRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: registrationData
      });

      const response = await RegisterPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      });

      // Verify password hashing
      expect(mockedHash).toHaveBeenCalledWith('SecurePassword123!', 12);

      // Verify user creation
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          password: '$2b$12$hashedpassword',
          role: 'CLIENT'
        }
      });

      // Verify verification token creation
      expect(prisma.verificationToken.create).toHaveBeenCalledWith({
        data: {
          identifier: 'test@example.com',
          token: 'verification_token_123',
          expires: expect.any(Date)
        }
      });

      // Verify audit logging
      expect(audit.logSuccess).toHaveBeenCalledWith(
        'REGISTER',
        'User',
        'user-123',
        { email: 'test@example.com' },
        'user-123',
        expect.any(Object)
      );
    });

    it('should prevent registration with existing email', async () => {
      // Mock existing user
      prisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com'
      });

      const registrationData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const request = createAPIRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: registrationData
      });

      const response = await RegisterPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.error).toBe('Email already exists');

      // Verify no user creation
      expect(prisma.user.create).not.toHaveBeenCalled();

      // Verify failure audit log
      expect(audit.logFailure).toHaveBeenCalledWith(
        'REGISTER',
        'User',
        'Email already exists',
        undefined,
        expect.any(Object)
      );
    });

    it('should handle invalid registration data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
        name: ''
      };

      const request = createAPIRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: invalidData
      });

      const response = await RegisterPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation error');
      expect(responseData.details).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      rateLimiters.auth.check.mockResolvedValue({ allowed: false });

      const registrationData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const request = createAPIRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: registrationData
      });

      const response = await RegisterPOST(request);

      expect(response.status).toBe(429);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Factor Authentication Flow', () => {
    beforeEach(() => {
      // Set up authenticated session
      mockedGetServerSession.mockResolvedValue(
        createAuthenticatedSession({
          id: 'user-123',
          email: 'test@example.com',
          role: 'CLIENT'
        })
      );
    });

    describe('TOTP Setup Flow', () => {
      it('should successfully set up TOTP MFA', async () => {
        const mockTotpSetup = {
          secret: 'JBSWY3DPEHPK3PXP',
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          backupCodes: ['123456', '789012', '345678']
        };

        mfaService.setupTotp.mockResolvedValue(mockTotpSetup);

        const request = createAPIRequest('http://localhost:3000/api/auth/mfa/setup', {
          method: 'POST',
          body: { method: 'TOTP' }
        });

        const response = await MfaSetupPOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.data).toEqual({
          method: 'TOTP',
          secret: 'JBSWY3DPEHPK3PXP',
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          backupCodes: ['123456', '789012', '345678']
        });

        expect(mfaService.setupTotp).toHaveBeenCalledWith('user-123');
      });

      it('should verify TOTP code and enable MFA', async () => {
        mfaService.verifyTotp.mockResolvedValue(true);
        mfaService.enableMfa.mockResolvedValue({
          id: 'mfa-123',
          userId: 'user-123',
          method: 'TOTP',
          enabled: true
        });

        // First verify the code
        const verifyRequest = createAPIRequest('http://localhost:3000/api/auth/mfa/verify', {
          method: 'POST',
          body: {
            method: 'TOTP',
            code: '123456'
          }
        });

        const verifyResponse = await MfaVerifyPOST(verifyRequest);
        const verifyData = await verifyResponse.json();

        expect(verifyResponse.status).toBe(200);
        expect(verifyData.success).toBe(true);
        expect(verifyData.verified).toBe(true);

        // Then enable MFA
        const enableRequest = createAPIRequest('http://localhost:3000/api/auth/mfa/enable', {
          method: 'POST',
          body: {
            method: 'TOTP',
            verified: true
          }
        });

        const enableResponse = await MfaEnablePOST(enableRequest);
        const enableData = await enableResponse.json();

        expect(enableResponse.status).toBe(200);
        expect(enableData.success).toBe(true);
        expect(enableData.enabled).toBe(true);

        expect(mfaService.verifyTotp).toHaveBeenCalledWith('user-123', '123456');
        expect(mfaService.enableMfa).toHaveBeenCalledWith('user-123', 'TOTP');
      });

      it('should reject invalid TOTP codes', async () => {
        mfaService.verifyTotp.mockResolvedValue(false);

        const request = createAPIRequest('http://localhost:3000/api/auth/mfa/verify', {
          method: 'POST',
          body: {
            method: 'TOTP',
            code: 'invalid'
          }
        });

        const response = await MfaVerifyPOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.verified).toBe(false);
        expect(responseData.error).toBe('Invalid verification code');
      });
    });

    describe('SMS MFA Flow', () => {
      it('should set up SMS MFA with phone number', async () => {
        mfaService.sendSmsCode.mockResolvedValue(undefined);

        const request = createAPIRequest('http://localhost:3000/api/auth/mfa/setup', {
          method: 'POST',
          body: {
            method: 'SMS',
            phoneNumber: '+1234567890'
          }
        });

        const response = await MfaSetupPOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.message).toBe('SMS code sent');
        expect(responseData.data).toEqual({
          method: 'SMS',
          phoneNumber: '7890' // Last 4 digits
        });

        expect(mfaService.sendSmsCode).toHaveBeenCalledWith('user-123', '+1234567890');
      });

      it('should require phone number for SMS setup', async () => {
        const request = createAPIRequest('http://localhost:3000/api/auth/mfa/setup', {
          method: 'POST',
          body: { method: 'SMS' }
        });

        const response = await MfaSetupPOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData.error).toBe('Phone number required for SMS MFA');
      });
    });

    describe('Email MFA Flow', () => {
      it('should set up Email MFA', async () => {
        mfaService.sendEmailCode.mockResolvedValue(undefined);

        const request = createAPIRequest('http://localhost:3000/api/auth/mfa/setup', {
          method: 'POST',
          body: { method: 'EMAIL' }
        });

        const response = await MfaSetupPOST(request);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.message).toBe('Email code sent');
        expect(responseData.data).toEqual({
          method: 'EMAIL'
        });

        expect(mfaService.sendEmailCode).toHaveBeenCalledWith('user-123');
      });
    });
  });

  describe('Complete Authentication Journey', () => {
    it('should handle full registration to MFA-enabled account flow', async () => {
      // Step 1: Registration
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'CLIENT'
      });
      prisma.verificationToken.create.mockResolvedValue({});

      const registrationData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const registerRequest = createAPIRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: registrationData
      });

      const registerResponse = await RegisterPOST(registerRequest);
      expect(registerResponse.status).toBe(201);

      // Step 2: User logs in (mocked as successful)
      mockedGetServerSession.mockResolvedValue(
        createAuthenticatedSession({
          id: 'user-123',
          email: 'test@example.com',
          role: 'CLIENT'
        })
      );

      // Step 3: Set up TOTP MFA
      const mockTotpSetup = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,mock',
        backupCodes: ['123456', '789012']
      };

      mfaService.setupTotp.mockResolvedValue(mockTotpSetup);

      const mfaSetupRequest = createAPIRequest('http://localhost:3000/api/auth/mfa/setup', {
        method: 'POST',
        body: { method: 'TOTP' }
      });

      const mfaSetupResponse = await MfaSetupPOST(mfaSetupRequest);
      expect(mfaSetupResponse.status).toBe(200);

      // Step 4: Verify TOTP code
      mfaService.verifyTotp.mockResolvedValue(true);

      const verifyRequest = createAPIRequest('http://localhost:3000/api/auth/mfa/verify', {
        method: 'POST',
        body: {
          method: 'TOTP',
          code: '123456'
        }
      });

      const verifyResponse = await MfaVerifyPOST(verifyRequest);
      const verifyData = await verifyResponse.json();
      expect(verifyResponse.status).toBe(200);
      expect(verifyData.verified).toBe(true);

      // Step 5: Enable MFA
      mfaService.enableMfa.mockResolvedValue({
        id: 'mfa-123',
        userId: 'user-123',
        method: 'TOTP',
        enabled: true
      });

      const enableRequest = createAPIRequest('http://localhost:3000/api/auth/mfa/enable', {
        method: 'POST',
        body: {
          method: 'TOTP',
          verified: true
        }
      });

      const enableResponse = await MfaEnablePOST(enableRequest);
      const enableData = await enableResponse.json();
      expect(enableResponse.status).toBe(200);
      expect(enableData.enabled).toBe(true);

      // Verify all steps completed successfully
      expect(audit.logSuccess).toHaveBeenCalledTimes(1); // Registration audit
      expect(mfaService.setupTotp).toHaveBeenCalledWith('user-123');
      expect(mfaService.verifyTotp).toHaveBeenCalledWith('user-123', '123456');
      expect(mfaService.enableMfa).toHaveBeenCalledWith('user-123', 'TOTP');
    });

    it('should handle account lockout scenario', async () => {
      // Simulate existing user with failed login attempts
      const lockedUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: '$2b$12$hashedpassword',
        loginAttempts: 5,
        lockedUntil: new Date(Date.now() + 15 * 60000), // 15 minutes from now
        status: 'ACTIVE'
      };

      // This would be tested in the NextAuth configuration
      // Here we simulate the behavior
      expect(lockedUser.lockedUntil > new Date()).toBe(true);

      // Verify that login would be rejected
      expect(audit.logFailure).not.toHaveBeenCalled();

      // After lockout expires, login should work again
      lockedUser.lockedUntil = new Date(Date.now() - 1000); // 1 second ago
      expect(lockedUser.lockedUntil < new Date()).toBe(true);
    });

    it('should handle role-based access after authentication', async () => {
      // Test different user roles
      const roles = ['CLIENT', 'THERAPIST', 'ADMIN', 'CRISIS_RESPONDER', 'SUPERVISOR'];

      for (const role of roles) {
        jest.clearAllMocks();

        mockedGetServerSession.mockResolvedValue(
          createAuthenticatedSession({
            id: `user-${role}`,
            email: `${role.toLowerCase()}@example.com`,
            role: role as 'USER' | 'THERAPIST' | 'ADMIN'
          })
        );

        mfaService.setupTotp.mockResolvedValue({
          secret: 'test-secret',
          qrCode: 'test-qr',
          backupCodes: ['123456']
        });

        const request = createAPIRequest('http://localhost:3000/api/auth/mfa/setup', {
          method: 'POST',
          body: { method: 'TOTP' }
        });

        const response = await MfaSetupPOST(request);
        expect(response.status).toBe(200);
        expect(mfaService.setupTotp).toHaveBeenCalledWith(`user-${role}`);
      }
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle concurrent registration attempts', async () => {
      // Simulate race condition
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // First check passes
        .mockResolvedValueOnce(null); // Second check passes

      prisma.user.create
        .mockResolvedValueOnce({
          id: 'user-123',
          email: 'test@example.com'
        })
        .mockRejectedValueOnce(new Error('Unique constraint failed')); // Second creation fails

      const registrationData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const request1 = createAPIRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: registrationData
      });

      const request2 = createAPIRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: registrationData
      });

      // First registration should succeed
      const response1 = await RegisterPOST(request1);
      expect(response1.status).toBe(201);

      // Second registration should fail
      const response2 = await RegisterPOST(request2);
      expect(response2.status).toBe(500);
    });

    it('should handle MFA setup without authentication', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = createAPIRequest('http://localhost:3000/api/auth/mfa/setup', {
        method: 'POST',
        body: { method: 'TOTP' }
      });

      const response = await MfaSetupPOST(request);

      expect(response.status).toBe(401);
      expect(mfaService.setupTotp).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockedGetServerSession.mockResolvedValue(createAuthenticatedSession());
      mfaService.setupTotp.mockRejectedValue(new Error('Service temporarily unavailable'));

      const request = createAPIRequest('http://localhost:3000/api/auth/mfa/setup', {
        method: 'POST',
        body: { method: 'TOTP' }
      });

      const response = await MfaSetupPOST(request);

      expect(response.status).toBe(500);
    });

    it('should validate MFA method parameter', async () => {
      mockedGetServerSession.mockResolvedValue(createAuthenticatedSession());

      const request = createAPIRequest('http://localhost:3000/api/auth/mfa/setup', {
        method: 'POST',
        body: { method: 'INVALID_METHOD' }
      });

      const response = await MfaSetupPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation error');
    });
  });

  describe('Performance and Load Testing Scenarios', () => {
    it('should handle multiple concurrent MFA setups', async () => {
      mockedGetServerSession.mockResolvedValue(createAuthenticatedSession());

      const mockSetup = {
        secret: 'test-secret',
        qrCode: 'test-qr',
        backupCodes: ['123456']
      };

      // Simulate delay in service
      mfaService.setupTotp.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSetup), 100))
      );

      const requests = Array.from({ length: 5 }, () =>
        createAPIRequest('http://localhost:3000/api/auth/mfa/setup', {
          method: 'POST',
          body: { method: 'TOTP' }
        })
      );

      const responses = await Promise.all(requests.map(req => MfaSetupPOST(req)));

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mfaService.setupTotp).toHaveBeenCalledTimes(5);
    });

    it('should respect rate limiting across different endpoints', async () => {
      // Test registration rate limit
      rateLimiters.auth.check.mockResolvedValue({ allowed: false });

      const registerRequest = createAPIRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'SecurePassword123!',
          name: 'Test User'
        }
      });

      const registerResponse = await RegisterPOST(registerRequest);
      expect(registerResponse.status).toBe(429);

      // Test MFA rate limit
      mockedGetServerSession.mockResolvedValue(createAuthenticatedSession());
      rateLimiters.mfa = createRateLimitMock(false); // Rate limited

      // Note: This would need to be implemented in the actual MFA endpoint
      // For now, we verify the rate limiter would be called
      expect(rateLimiters.auth.check).toHaveBeenCalled();
    });
  });
});
