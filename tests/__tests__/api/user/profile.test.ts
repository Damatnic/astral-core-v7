import { GET, PUT } from '@/app/api/user/profile/route';
import { createMockRequest, createMockSession, createMockUser } from '../../../utils/test-helpers';
import { mockPrisma, resetPrismaMocks } from '../../../mocks/prisma';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

jest.mock('@/lib/auth/config', () => ({
  authOptions: {}
}));

jest.mock('@/lib/db/prisma', () => ({
  default: mockPrisma
}));

jest.mock('@/lib/security/phi-service', () => ({
  phiService: {
    read: jest.fn(),
    update: jest.fn()
  }
}));

jest.mock('@/lib/security/audit', () => ({
  audit: {
    logSuccess: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('@/lib/logger', () => ({
  logError: jest.fn()
}));

import { getServerSession } from 'next-auth';
import { phiService } from '@/lib/security/phi-service';

describe('/api/user/profile', () => {

  beforeEach(() => {
    resetPrismaMocks();
    jest.clearAllMocks();
  });

  describe('GET - Get User Profile', () => {
    it('should return user profile successfully', async () => {
      const session = createMockSession();
      const userData = createMockUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      });

      getServerSession.mockResolvedValue(session);
      phiService.read.mockResolvedValue(userData);

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(
        expect.objectContaining({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role
        })
      );

      expect(phiService.read).toHaveBeenCalledWith(
        'User',
        session.user.id,
        expect.objectContaining({
          userId: session.user.id,
          userRole: session.user.role
        })
      );
    });

    it('should require authentication', async () => {
      getServerSession.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(phiService.read).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);
      phiService.read.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should handle service errors', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);
      phiService.read.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('PUT - Update User Profile', () => {
    it('should update user profile successfully', async () => {
      const session = createMockSession();
      const updatedUserData = createMockUser({
        id: session.user.id,
        name: 'Updated Name',
        phone: '+1234567890'
      });

      getServerSession.mockResolvedValue(session);
      phiService.update.mockResolvedValue(updatedUserData);

      const updateData = {
        name: 'Updated Name',
        phone: '+1234567890',
        preferredLanguage: 'en',
        timezone: 'America/New_York'
      };

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: updateData
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(updatedUserData.name);
      expect(data.data.phone).toBe(updatedUserData.phone);

      expect(phiService.update).toHaveBeenCalledWith(
        'User',
        session.user.id,
        expect.objectContaining(updateData),
        expect.objectContaining({
          userId: session.user.id,
          userRole: session.user.role
        })
      );
    });

    it('should validate update data', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const invalidUpdateData = {
        name: '', // Invalid: empty name
        email: 'invalid-email', // Invalid: bad email format
        phone: '123' // Invalid: too short
      };

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: invalidUpdateData
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
      expect(phiService.update).not.toHaveBeenCalled();
    });

    it('should require authentication for updates', async () => {
      getServerSession.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: { name: 'New Name' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(phiService.update).not.toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      const session = createMockSession();
      const updatedUserData = createMockUser({
        id: session.user.id,
        name: 'Partially Updated Name'
      });

      getServerSession.mockResolvedValue(session);
      phiService.update.mockResolvedValue(updatedUserData);

      const partialUpdateData = {
        name: 'Partially Updated Name'
        // Only updating name, not other fields
      };

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: partialUpdateData
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Partially Updated Name');

      expect(phiService.update).toHaveBeenCalledWith(
        'User',
        session.user.id,
        partialUpdateData,
        expect.any(Object)
      );
    });

    it('should prevent updating sensitive fields', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const maliciousUpdateData = {
        name: 'Valid Name',
        role: 'ADMIN', // Should not be allowed
        id: 'different-user-id', // Should not be allowed
        createdAt: new Date() // Should not be allowed
      };

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: maliciousUpdateData
      });

      const response = await PUT(request);
      const data = await response.json();

      // Should either reject the request or filter out dangerous fields
      if (response.status === 200) {
        expect(phiService.update).toHaveBeenCalledWith(
          'User',
          session.user.id,
          expect.not.objectContaining({
            role: 'ADMIN',
            id: 'different-user-id'
          }),
          expect.any(Object)
        );
      } else {
        expect(response.status).toBe(400);
        expect(data.error).toContain('validation');
      }
    });

    it('should handle concurrent update conflicts', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      // Simulate version conflict or optimistic locking failure
      phiService.update.mockRejectedValue(new Error('Version conflict'));

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: { name: 'Updated Name' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should log profile updates for audit trail', async () => {
      const session = createMockSession();
      const updatedUserData = createMockUser();

      getServerSession.mockResolvedValue(session);
      phiService.update.mockResolvedValue(updatedUserData);

      const { audit } = await import('@/lib/security/audit');

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: { name: 'Updated Name' }
      });

      await PUT(request);

      expect(audit.logSuccess).toHaveBeenCalledWith(
        'UPDATE_PROFILE',
        'User',
        session.user.id,
        expect.objectContaining({
          updatedFields: expect.any(Array)
        }),
        session.user.id
      );
    });
  });

  describe('Profile Security', () => {
    it('should not expose sensitive information', async () => {
      const session = createMockSession();
      const userData = createMockUser({
        password: 'hashed_password',
        resetToken: 'secret_token',
        mfaSecret: 'secret_mfa'
      });

      getServerSession.mockResolvedValue(session);
      phiService.read.mockResolvedValue(userData);

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.data).not.toHaveProperty('password');
      expect(data.data).not.toHaveProperty('resetToken');
      expect(data.data).not.toHaveProperty('mfaSecret');
    });

    it('should validate user can only access their own profile', async () => {
      const session = createMockSession({ user: { id: 'user-123' } });
      getServerSession.mockResolvedValue(session);

      // Verify that the service is called with the session user ID, not any other ID
      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'GET'
      });

      await GET(request);

      expect(phiService.read).toHaveBeenCalledWith(
        'User',
        'user-123', // Should match session user ID
        expect.objectContaining({
          userId: 'user-123'
        })
      );
    });

    it('should handle rate limiting for profile updates', async () => {
      // This would typically be implemented in the actual service
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      // Simulate too many update attempts
      phiService.update.mockRejectedValue(new Error('Rate limit exceeded'));

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: { name: 'Spam Update' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Profile Data Validation', () => {
    it('should validate phone number format', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const invalidPhoneNumbers = [
        '123',
        'not-a-phone',
        '1234567890123456', // too long
        '+' // incomplete
      ];

      for (const phone of invalidPhoneNumbers) {
        const request = createMockRequest('http://localhost:3000/api/user/profile', {
          method: 'PUT',
          body: { phone }
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Validation error');
      }
    });

    it('should validate timezone format', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const invalidTimezones = ['Invalid/Timezone', 'UTC+99', 'not-a-timezone'];

      for (const timezone of invalidTimezones) {
        const request = createMockRequest('http://localhost:3000/api/user/profile', {
          method: 'PUT',
          body: { timezone }
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Validation error');
      }
    });

    it('should accept valid profile updates', async () => {
      const session = createMockSession();
      const updatedUserData = createMockUser();

      getServerSession.mockResolvedValue(session);
      phiService.update.mockResolvedValue(updatedUserData);

      const validUpdateData = {
        name: 'Valid User Name',
        phone: '+1-555-123-4567',
        preferredLanguage: 'en',
        timezone: 'America/New_York',
        dateOfBirth: '1990-01-01'
      };

      const request = createMockRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: validUpdateData
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
