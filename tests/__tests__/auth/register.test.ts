import { POST } from '@/app/api/auth/register/route';
import { NextRequest } from 'next/server';
import { createMockRequest, createMockUser, mockApiResponse } from '../../utils/test-helpers';
import { mockPrisma, resetPrismaMocks, mockPrismaImplementations } from '../../mocks/prisma';

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  default: mockPrisma
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_123')
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
      getIdentifier: jest.fn().mockReturnValue('test-identifier'),
      check: jest.fn().mockResolvedValue({ allowed: true })
    }
  }
}));

jest.mock('@/lib/security/encryption', () => ({
  encryption: {
    generateToken: jest.fn().mockReturnValue('mock-verification-token')
  }
}));

jest.mock('@/lib/logger', () => ({
  logError: jest.fn()
}));

describe('/api/auth/register', () => {
  beforeEach(() => {
    resetPrismaMocks();
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should successfully register a new user', async () => {
      const userData = createMockUser({
        email: 'newuser@example.com',
        name: 'New User'
      });

      // Mock user doesn't exist
      mockPrismaImplementations.user.findUniqueNotFound();

      // Mock user creation
      mockPrismaImplementations.user.createSuccess(userData);

      // Mock verification token creation
      mockPrisma.verificationToken.create.mockResolvedValue({
        identifier: userData.email,
        token: 'mock-verification-token',
        expires: new Date()
      });

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'newuser@example.com',
          name: 'New User',
          password: 'SecurePass123!'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        id: userData.id,
        email: userData.email,
        name: userData.name
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' }
      });
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should reject registration if email already exists', async () => {
      const existingUser = createMockUser({
        email: 'existing@example.com'
      });

      mockPrismaImplementations.user.findUniqueSuccess(existingUser);

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'existing@example.com',
          name: 'Test User',
          password: 'SecurePass123!'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBeFalsy();
      expect(data.error).toBe('Email already exists');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should reject registration with invalid email format', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'invalid-email',
          name: 'Test User',
          password: 'SecurePass123!'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should reject registration with weak password', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          name: 'Test User',
          password: '123' // Too weak
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should reject registration when rate limited', async () => {
      const { rateLimiters } = require('@/lib/security/rate-limit');
      rateLimiters.auth.check.mockResolvedValue({ allowed: false });

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          name: 'Test User',
          password: 'SecurePass123!'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('rate limit');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaImplementations.user.findUniqueNotFound();
      mockPrisma.user.create.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          name: 'Test User',
          password: 'SecurePass123!'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.success).toBeFalsy();
    });

    it('should properly hash password before saving', async () => {
      const { hash } = require('bcryptjs');

      mockPrismaImplementations.user.findUniqueNotFound();
      mockPrismaImplementations.user.createSuccess(createMockUser());
      mockPrisma.verificationToken.create.mockResolvedValue({
        identifier: 'test@example.com',
        token: 'mock-token',
        expires: new Date()
      });

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          name: 'Test User',
          password: 'PlainTextPassword'
        }
      });

      await POST(request);

      expect(hash).toHaveBeenCalledWith('PlainTextPassword', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          password: 'hashed_password_123'
        })
      });
    });

    it('should create verification token for new user', async () => {
      const userData = createMockUser();

      mockPrismaImplementations.user.findUniqueNotFound();
      mockPrismaImplementations.user.createSuccess(userData);
      mockPrisma.verificationToken.create.mockResolvedValue({
        identifier: userData.email,
        token: 'mock-verification-token',
        expires: new Date()
      });

      const request = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: userData.email,
          name: userData.name,
          password: 'SecurePass123!'
        }
      });

      await POST(request);

      expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith({
        data: {
          identifier: userData.email,
          token: 'mock-verification-token',
          expires: expect.any(Date)
        }
      });
    });
  });
});
