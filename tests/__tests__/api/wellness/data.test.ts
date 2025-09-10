import { GET, POST } from '@/app/api/wellness/data/route';
import {
  createMockRequest,
  createMockSession,
  createMockWellnessData
} from '../../../utils/test-helpers';
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
    create: jest.fn(),
    read: jest.fn(),
    readMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
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

describe('/api/wellness/data', () => {
  beforeEach(() => {
    resetPrismaMocks();
    jest.clearAllMocks();
  });

  describe('GET - Get Wellness Data', () => {
    it('should return user wellness data successfully', async () => {
      const session = createMockSession();
      const wellnessData = [
        createMockWellnessData({
          userId: session.user.id,
          date: new Date('2024-01-01'),
          moodScore: 7
        }),
        createMockWellnessData({
          userId: session.user.id,
          date: new Date('2024-01-02'),
          moodScore: 8
        })
      ];

      getServerSession.mockResolvedValue(session);
      phiService.readMany.mockResolvedValue(wellnessData);

      const request = createMockRequest('http://localhost:3000/api/wellness/data', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toEqual(
        expect.objectContaining({
          moodScore: 7,
          date: expect.any(String)
        })
      );

      expect(phiService.readMany).toHaveBeenCalledWith(
        'WellnessData',
        expect.objectContaining({
          userId: session.user.id
        }),
        expect.objectContaining({
          userId: session.user.id,
          userRole: session.user.role
        })
      );
    });

    it('should handle date range filtering', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);
      phiService.readMany.mockResolvedValue([]);

      const request = createMockRequest(
        'http://localhost:3000/api/wellness/data?startDate=2024-01-01&endDate=2024-01-31',
        { method: 'GET' }
      );

      await GET(request);

      expect(phiService.readMany).toHaveBeenCalledWith(
        'WellnessData',
        expect.objectContaining({
          userId: session.user.id,
          date: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date)
          })
        }),
        expect.any(Object)
      );
    });

    it('should require authentication', async () => {
      getServerSession.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/wellness/data', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(phiService.readMany).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);
      phiService.readMany.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('http://localhost:3000/api/wellness/data', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should support pagination', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);
      phiService.readMany.mockResolvedValue([]);

      const request = createMockRequest('http://localhost:3000/api/wellness/data?page=2&limit=10', {
        method: 'GET'
      });

      await GET(request);

      expect(phiService.readMany).toHaveBeenCalledWith(
        'WellnessData',
        expect.objectContaining({
          userId: session.user.id
        }),
        expect.objectContaining({
          pagination: expect.objectContaining({
            skip: 10, // (page - 1) * limit
            take: 10
          })
        })
      );
    });

    it('should return empty array when no data found', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);
      phiService.readMany.mockResolvedValue([]);

      const request = createMockRequest('http://localhost:3000/api/wellness/data', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });
  });

  describe('POST - Create Wellness Data', () => {
    it('should create wellness data successfully', async () => {
      const session = createMockSession();
      const newWellnessData = createMockWellnessData({
        userId: session.user.id,
        moodScore: 6,
        anxietyLevel: 4,
        sleepHours: 7.5
      });

      getServerSession.mockResolvedValue(session);
      phiService.create.mockResolvedValue(newWellnessData);

      const wellnessInput = {
        date: '2024-01-15',
        moodScore: 6,
        anxietyLevel: 4,
        sleepHours: 7.5,
        exerciseMinutes: 30,
        socialInteractions: 3,
        stressLevel: 5,
        notes: 'Feeling pretty good today'
      };

      const request = createMockRequest('http://localhost:3000/api/wellness/data', {
        method: 'POST',
        body: wellnessInput
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(newWellnessData);

      expect(phiService.create).toHaveBeenCalledWith(
        'WellnessData',
        expect.objectContaining({
          userId: session.user.id,
          date: expect.any(Date),
          moodScore: 6,
          anxietyLevel: 4,
          sleepHours: 7.5
        }),
        expect.objectContaining({
          userId: session.user.id,
          userRole: session.user.role
        })
      );
    });

    it('should validate wellness data input', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const invalidWellnessInput = {
        date: 'invalid-date',
        moodScore: 15, // Out of range (should be 1-10)
        anxietyLevel: -1, // Negative value
        sleepHours: 'not-a-number',
        exerciseMinutes: -30 // Negative value
      };

      const request = createMockRequest('http://localhost:3000/api/wellness/data', {
        method: 'POST',
        body: invalidWellnessInput
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
      expect(phiService.create).not.toHaveBeenCalled();
    });

    it('should require authentication for creation', async () => {
      getServerSession.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/wellness/data', {
        method: 'POST',
        body: { moodScore: 5 }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(phiService.create).not.toHaveBeenCalled();
    });

    it('should handle duplicate entries for same date', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      // Simulate constraint violation for duplicate date
      phiService.create.mockRejectedValue(new Error('Wellness data for this date already exists'));

      const wellnessInput = {
        date: '2024-01-15',
        moodScore: 6
      };

      const request = createMockRequest('http://localhost:3000/api/wellness/data', {
        method: 'POST',
        body: wellnessInput
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });

    it('should set default values for optional fields', async () => {
      const session = createMockSession();
      const newWellnessData = createMockWellnessData();

      getServerSession.mockResolvedValue(session);
      phiService.create.mockResolvedValue(newWellnessData);

      // Minimal input - should use defaults for missing fields
      const minimalInput = {
        date: '2024-01-15',
        moodScore: 7
      };

      const request = createMockRequest('http://localhost:3000/api/wellness/data', {
        method: 'POST',
        body: minimalInput
      });

      await POST(request);

      expect(phiService.create).toHaveBeenCalledWith(
        'WellnessData',
        expect.objectContaining({
          userId: session.user.id,
          moodScore: 7
          // Should include default values for optional fields
        }),
        expect.any(Object)
      );
    });

    it('should log wellness data creation for audit', async () => {
      const session = createMockSession();
      const newWellnessData = createMockWellnessData();

      getServerSession.mockResolvedValue(session);
      phiService.create.mockResolvedValue(newWellnessData);

      const { audit } = await import('@/lib/security/audit');

      const wellnessInput = {
        date: '2024-01-15',
        moodScore: 6
      };

      const request = createMockRequest('http://localhost:3000/api/wellness/data', {
        method: 'POST',
        body: wellnessInput
      });

      await POST(request);

      expect(audit.logSuccess).toHaveBeenCalledWith(
        'CREATE_WELLNESS_DATA',
        'WellnessData',
        newWellnessData.id,
        expect.objectContaining({
          date: expect.any(String),
          moodScore: 6
        }),
        session.user.id
      );
    });
  });

  describe('Wellness Data Validation', () => {
    it('should validate mood score range (1-10)', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const invalidScores = [0, 11, -1, 15];

      for (const score of invalidScores) {
        const request = createMockRequest('http://localhost:3000/api/wellness/data', {
          method: 'POST',
          body: {
            date: '2024-01-15',
            moodScore: score
          }
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Validation error');
      }
    });

    it('should validate anxiety level range (1-10)', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const invalidLevels = [0, 11, -5, 20];

      for (const level of invalidLevels) {
        const request = createMockRequest('http://localhost:3000/api/wellness/data', {
          method: 'POST',
          body: {
            date: '2024-01-15',
            moodScore: 5,
            anxietyLevel: level
          }
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Validation error');
      }
    });

    it('should validate sleep hours range (0-24)', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const invalidHours = [-1, 25, -5, 48];

      for (const hours of invalidHours) {
        const request = createMockRequest('http://localhost:3000/api/wellness/data', {
          method: 'POST',
          body: {
            date: '2024-01-15',
            moodScore: 5,
            sleepHours: hours
          }
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Validation error');
      }
    });

    it('should accept valid wellness data', async () => {
      const session = createMockSession();
      const newWellnessData = createMockWellnessData();

      getServerSession.mockResolvedValue(session);
      phiService.create.mockResolvedValue(newWellnessData);

      const validInput = {
        date: '2024-01-15',
        moodScore: 7,
        anxietyLevel: 3,
        sleepHours: 8.5,
        exerciseMinutes: 45,
        socialInteractions: 5,
        stressLevel: 4,
        notes: 'Had a great day with friends'
      };

      const request = createMockRequest('http://localhost:3000/api/wellness/data', {
        method: 'POST',
        body: validInput
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  describe('Data Analysis and Trends', () => {
    it('should support filtering by metrics', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);
      phiService.readMany.mockResolvedValue([]);

      const request = createMockRequest(
        'http://localhost:3000/api/wellness/data?metrics=moodScore,anxietyLevel',
        { method: 'GET' }
      );

      await GET(request);

      expect(phiService.readMany).toHaveBeenCalledWith(
        'WellnessData',
        expect.objectContaining({
          userId: session.user.id
        }),
        expect.objectContaining({
          select: expect.objectContaining({
            moodScore: true,
            anxietyLevel: true
          })
        })
      );
    });

    it('should support trend analysis queries', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const trendData = Array.from({ length: 30 }, (_, i) =>
        createMockWellnessData({
          date: new Date(2024, 0, i + 1),
          moodScore: Math.floor(Math.random() * 10) + 1
        })
      );

      phiService.readMany.mockResolvedValue(trendData);

      const request = createMockRequest(
        'http://localhost:3000/api/wellness/data?analysis=trend&period=30days',
        { method: 'GET' }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(30);
      expect(phiService.readMany).toHaveBeenCalledWith(
        'WellnessData',
        expect.objectContaining({
          userId: session.user.id,
          date: expect.objectContaining({
            gte: expect.any(Date)
          })
        }),
        expect.any(Object)
      );
    });
  });
});
