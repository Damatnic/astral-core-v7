/**
 * Authentication Configuration Unit Tests
 * Tests the NextAuth configuration and authentication flows
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { compare } from 'bcryptjs';
import { authOptions } from '../config';
import { setupTestEnvironment } from '../../../../tests/utils/test-helpers';
import { mockUsers } from '../../../../tests/utils/test-fixtures';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('@/lib/db/prisma');
jest.mock('@/lib/security/audit');

const mockCompare = compare as jest.MockedFunction<typeof compare>;

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  }
};

// Mock audit service
const mockAudit = {
  logSuccess: jest.fn(),
  logFailure: jest.fn()
};

// Mock modules
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));

jest.mock('@/lib/security/audit', () => ({
  audit: mockAudit
}));

describe('Authentication Configuration', () => {
  beforeEach(() => {
    setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Credentials Provider', () => {
    const credentialsProvider = authOptions.providers.find(
      provider => provider.id === 'credentials'
    );

    test('should authenticate valid user credentials', async () => {
      // Arrange
      const mockUser = {
        ...mockUsers.client,
        password: '$2a$12$hashedPassword',
        status: 'ACTIVE',
        lockedUntil: null,
        loginAttempts: 0
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockCompare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      // Act
      const result = await credentialsProvider?.authorize?.({
        email: 'client@astralcore.test',
        password: 'password123'
      }, {} as any);

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'client@astralcore.test' },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          role: true,
          status: true,
          lockedUntil: true,
          loginAttempts: true
        }
      });

      expect(mockCompare).toHaveBeenCalledWith('password123', mockUser.password);
      expect(mockAudit.logSuccess).toHaveBeenCalledWith(
        'LOGIN',
        'User',
        mockUser.id,
        { method: 'credentials' },
        mockUser.id
      );
    });

    test('should reject invalid credentials', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        credentialsProvider?.authorize?.({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        }, {} as any)
      ).rejects.toThrow('Invalid credentials');

      expect(mockAudit.logFailure).toHaveBeenCalledWith(
        'LOGIN',
        'User',
        'Invalid credentials',
        undefined
      );
    });

    test('should reject user with wrong password', async () => {
      // Arrange
      const mockUser = {
        ...mockUsers.client,
        password: '$2a$12$hashedPassword',
        status: 'ACTIVE',
        lockedUntil: null,
        loginAttempts: 2
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockCompare.mockResolvedValue(false);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        credentialsProvider?.authorize?.({
          email: 'client@astralcore.test',
          password: 'wrongpassword'
        }, {} as any)
      ).rejects.toThrow('Invalid credentials');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { loginAttempts: 3 }
      });
    });

    test('should lock account after max login attempts', async () => {
      // Arrange
      const mockUser = {
        ...mockUsers.client,
        password: '$2a$12$hashedPassword',
        status: 'ACTIVE',
        lockedUntil: null,
        loginAttempts: 4 // One less than max (5)
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockCompare.mockResolvedValue(false);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        credentialsProvider?.authorize?.({
          email: 'client@astralcore.test',
          password: 'wrongpassword'
        }, {} as any)
      ).rejects.toThrow('Invalid credentials');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          loginAttempts: 0,
          lockedUntil: expect.any(Date)
        }
      });
    });

    test('should reject locked user account', async () => {
      // Arrange
      const mockUser = {
        ...mockUsers.client,
        password: '$2a$12$hashedPassword',
        status: 'ACTIVE',
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        loginAttempts: 0
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        credentialsProvider?.authorize?.({
          email: 'client@astralcore.test',
          password: 'password123'
        }, {} as any)
      ).rejects.toThrow('Account is locked. Please try again later.');

      expect(mockAudit.logFailure).toHaveBeenCalledWith(
        'LOGIN',
        'User',
        'Account locked',
        mockUser.id
      );
    });

    test('should reject inactive user account', async () => {
      // Arrange
      const mockUser = {
        ...mockUsers.client,
        password: '$2a$12$hashedPassword',
        status: 'INACTIVE',
        lockedUntil: null,
        loginAttempts: 0
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        credentialsProvider?.authorize?.({
          email: 'client@astralcore.test',
          password: 'password123'
        }, {} as any)
      ).rejects.toThrow('Account is not active');

      expect(mockAudit.logFailure).toHaveBeenCalledWith(
        'LOGIN',
        'User',
        'Account status: INACTIVE',
        mockUser.id
      );
    });

    test('should reset login attempts on successful login', async () => {
      // Arrange
      const mockUser = {
        ...mockUsers.client,
        password: '$2a$12$hashedPassword',
        status: 'ACTIVE',
        lockedUntil: null,
        loginAttempts: 3
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockCompare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      // Act
      await credentialsProvider?.authorize?.({
        email: 'client@astralcore.test',
        password: 'password123'
      }, {} as any);

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          loginAttempts: 0,
          lockedUntil: null,
          lastLogin: expect.any(Date)
        }
      });
    });

    test('should reject missing credentials', async () => {
      // Act & Assert
      await expect(
        credentialsProvider?.authorize?.({
          email: '',
          password: 'password123'
        }, {} as any)
      ).rejects.toThrow('Invalid credentials');

      await expect(
        credentialsProvider?.authorize?.({
          email: 'test@example.com',
          password: ''
        }, {} as any)
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('OAuth Providers', () => {
    test('should configure Google provider correctly', () => {
      const googleProvider = authOptions.providers.find(
        provider => provider.id === 'google'
      );

      expect(googleProvider).toBeDefined();
      expect(googleProvider?.options?.clientId).toBe(process.env.GOOGLE_CLIENT_ID);
      expect(googleProvider?.options?.clientSecret).toBe(process.env.GOOGLE_CLIENT_SECRET);
    });

    test('should configure GitHub provider correctly', () => {
      const githubProvider = authOptions.providers.find(
        provider => provider.id === 'github'
      );

      expect(githubProvider).toBeDefined();
      expect(githubProvider?.options?.clientId).toBe(process.env.GITHUB_ID);
      expect(githubProvider?.options?.clientSecret).toBe(process.env.GITHUB_SECRET);
    });
  });

  describe('Callbacks', () => {
    test('should handle OAuth sign in callback', async () => {
      // Arrange
      const user = {
        email: 'oauth@example.com',
        name: 'OAuth User',
        id: 'oauth_123'
      };
      const account = {
        provider: 'google'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(user);

      // Act
      const result = await authOptions.callbacks?.signIn?.({ 
        user, 
        account 
      } as any);

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: user.email,
          name: user.name,
          image: null,
          role: 'CLIENT',
          emailVerified: expect.any(Date)
        }
      });
    });

    test('should handle existing OAuth user sign in', async () => {
      // Arrange
      const user = {
        email: 'existing@example.com',
        name: 'Existing User',
        id: 'existing_123'
      };
      const account = {
        provider: 'google'
      };
      const existingUser = { ...mockUsers.client, email: user.email };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      // Act
      const result = await authOptions.callbacks?.signIn?.({ 
        user, 
        account 
      } as any);

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockAudit.logSuccess).toHaveBeenCalledWith(
        'LOGIN',
        'User',
        existingUser.id,
        { method: 'google' },
        existingUser.id
      );
    });

    test('should update JWT token', async () => {
      // Arrange
      const token = {};
      const user = { id: 'user_123', role: 'CLIENT' };

      // Act
      const result = await authOptions.callbacks?.jwt?.({ 
        token, 
        user 
      } as any);

      // Assert
      expect(result).toEqual({
        id: user.id,
        role: user.role
      });
    });

    test('should update session from token', async () => {
      // Arrange
      const session = {
        user: {
          id: '',
          role: ''
        }
      };
      const token = {
        id: 'token_user_123',
        role: 'THERAPIST'
      };

      // Act
      const result = await authOptions.callbacks?.session?.({ 
        session, 
        token 
      } as any);

      // Assert
      expect(result).toEqual({
        user: {
          id: token.id,
          role: token.role
        }
      });
    });

    test('should handle redirect callback', async () => {
      // Test various redirect scenarios
      const baseUrl = 'http://localhost:3000';

      // Default redirect to dashboard
      let result = await authOptions.callbacks?.redirect?.({ 
        url: baseUrl, 
        baseUrl 
      });
      expect(result).toBe(`${baseUrl}/dashboard`);

      // Relative URL
      result = await authOptions.callbacks?.redirect?.({ 
        url: '/profile', 
        baseUrl 
      });
      expect(result).toBe(`${baseUrl}/profile`);

      // Same origin URL
      result = await authOptions.callbacks?.redirect?.({ 
        url: `${baseUrl}/settings`, 
        baseUrl 
      });
      expect(result).toBe(`${baseUrl}/settings`);

      // External URL (should redirect to base)
      result = await authOptions.callbacks?.redirect?.({ 
        url: 'https://external.com', 
        baseUrl 
      });
      expect(result).toBe(baseUrl);
    });
  });

  describe('Events', () => {
    test('should log signOut event', async () => {
      // Arrange
      const token = { id: 'user_123' };

      // Act
      await authOptions.events?.signOut?.({ token } as any);

      // Assert
      expect(mockAudit.logSuccess).toHaveBeenCalledWith(
        'LOGOUT',
        'User',
        'user_123',
        undefined,
        'user_123'
      );
    });
  });

  describe('Configuration', () => {
    test('should have correct session configuration', () => {
      expect(authOptions.session?.strategy).toBe('jwt');
      expect(authOptions.session?.maxAge).toBe(24 * 60 * 60); // 24 hours
    });

    test('should have correct JWT configuration', () => {
      expect(authOptions.jwt?.maxAge).toBe(24 * 60 * 60); // 24 hours
    });

    test('should have correct pages configuration', () => {
      expect(authOptions.pages?.signIn).toBe('/auth/login');
      expect(authOptions.pages?.signOut).toBe('/auth/logout');
      expect(authOptions.pages?.error).toBe('/auth/error');
      expect(authOptions.pages?.verifyRequest).toBe('/auth/verify');
      expect(authOptions.pages?.newUser).toBe('/onboarding');
    });

    test('should have secret configured', () => {
      expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET);
    });

    test('should enable debug in development', () => {
      process.env.NODE_ENV = 'development';
      expect(authOptions.debug).toBe(true);
    });
  });
});