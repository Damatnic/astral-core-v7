import { POST, GET } from '@/app/api/crisis/assess/route';
import {
  createMockRequest,
  createMockSession,
  createMockCrisisAssessment
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

jest.mock('@/lib/security/rate-limit', () => ({
  rateLimiters: {
    crisis: {
      getIdentifier: jest.fn().mockReturnValue('test-identifier'),
      check: jest.fn().mockResolvedValue({ allowed: true })
    }
  }
}));

jest.mock('@/lib/logger', () => ({
  logError: jest.fn()
}));

import { getServerSession } from 'next-auth';
import { phiService } from '@/lib/security/phi-service';

describe('/api/crisis/assess', () => {
  beforeEach(() => {
    resetPrismaMocks();
    jest.clearAllMocks();
  });

  describe('POST - Crisis Assessment', () => {
    it('should assess emergency level crisis correctly', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const crisisIntervention = {
        id: 'intervention-123',
        userId: session.user.id,
        severity: 'EMERGENCY',
        status: 'ACTIVE'
      };

      phiService.create.mockResolvedValue(crisisIntervention);

      const assessmentData = createMockCrisisAssessment({
        suicidalIdeation: true,
        homicidalIdeation: false,
        hasPlan: true,
        hasMeans: true,
        immediateRisk: true,
        symptoms: ['hopelessness', 'severe_depression', 'panic']
      });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.severity).toBe('EMERGENCY');
      expect(data.urgent).toBe(true);
      expect(data.message).toBe('IMMEDIATE HELP NEEDED');
      expect(data.nextSteps).toContain('Call 911 immediately');
      expect(data.resources.US.emergency).toBe('911');
      expect(data.alertsSent).toBe(true);

      expect(phiService.create).toHaveBeenCalledWith(
        'CrisisIntervention',
        expect.objectContaining({
          userId: session.user.id,
          severity: 'EMERGENCY',
          interventionType: 'EMERGENCY_DISPATCH',
          status: 'ACTIVE',
          followUpRequired: true
        }),
        expect.any(Object)
      );
    });

    it('should assess critical level crisis correctly', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      phiService.create.mockResolvedValue({ id: 'intervention-123', severity: 'CRITICAL' });

      const assessmentData = createMockCrisisAssessment({
        suicidalIdeation: true,
        homicidalIdeation: false,
        hasPlan: true,
        hasMeans: false,
        immediateRisk: false,
        symptoms: ['severe_depression', 'hopelessness']
      });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.severity).toBe('CRITICAL');
      expect(data.urgent).toBe(true);
      expect(data.message).toBe('Please seek help immediately');
      expect(data.nextSteps).toContain('Call 988 or the suicide prevention lifeline');
      expect(data.alertsSent).toBe(true);
    });

    it('should assess high level crisis correctly', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      phiService.create.mockResolvedValue({ id: 'intervention-123', severity: 'HIGH' });

      const assessmentData = createMockCrisisAssessment({
        suicidalIdeation: true,
        homicidalIdeation: false,
        hasPlan: false,
        hasMeans: false,
        immediateRisk: false,
        symptoms: ['depression', 'anxiety']
      });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.severity).toBe('HIGH');
      expect(data.urgent).toBeFalsy();
      expect(data.message).toBe('Professional support recommended');
      expect(data.nextSteps).toContain('Schedule an urgent appointment with your therapist');
      expect(data.alertsSent).toBeFalsy();
    });

    it('should assess moderate level crisis correctly', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      phiService.create.mockResolvedValue({ id: 'intervention-123', severity: 'MODERATE' });

      const assessmentData = createMockCrisisAssessment({
        suicidalIdeation: false,
        homicidalIdeation: false,
        hasPlan: false,
        hasMeans: false,
        immediateRisk: false,
        selfHarmRisk: true,
        substanceUse: false,
        symptoms: ['mild_depression', 'stress']
      });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.severity).toBe('MODERATE');
      expect(data.message).toBe('Monitor symptoms and seek support');
      expect(data.nextSteps).toContain('Schedule an appointment with your therapist');
    });

    it('should assess low level crisis correctly', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      phiService.create.mockResolvedValue({ id: 'intervention-123', severity: 'LOW' });

      const assessmentData = createMockCrisisAssessment({
        suicidalIdeation: false,
        homicidalIdeation: false,
        hasPlan: false,
        hasMeans: false,
        immediateRisk: false,
        selfHarmRisk: false,
        substanceUse: false,
        symptoms: ['mild_anxiety']
      });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.severity).toBe('LOW');
      expect(data.message).toBe('Continue monitoring your wellness');
      expect(data.nextSteps).toContain('Continue regular therapy sessions');
    });

    it('should require authentication', async () => {
      getServerSession.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: createMockCrisisAssessment()
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(phiService.create).not.toHaveBeenCalled();
    });

    it('should handle rate limiting gracefully', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const { rateLimiters } = await import('@/lib/security/rate-limit');
      rateLimiters.crisis.check.mockResolvedValue({ allowed: false });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: createMockCrisisAssessment()
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Too many requests');
      expect(data.resources).toBeDefined(); // Should still provide crisis resources
      expect(data.resources.US.emergency).toBe('911');
    });

    it('should handle validation errors', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: {
          // Invalid/missing required fields
          invalidField: 'invalid'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
      expect(data.resources).toBeDefined(); // Should still provide crisis resources
    });

    it('should log crisis assessment for audit', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const { audit } = await import('@/lib/security/audit');
      phiService.create.mockResolvedValue({ id: 'intervention-123', severity: 'HIGH' });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: createMockCrisisAssessment()
      });

      await POST(request);

      expect(audit.logSuccess).toHaveBeenCalledWith(
        'CRISIS_ASSESSMENT',
        'CrisisIntervention',
        'intervention-123',
        expect.objectContaining({
          severity: expect.any(String),
          interventionType: expect.any(String)
        }),
        session.user.id
      );
    });

    it('should handle service errors gracefully', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      phiService.create.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: createMockCrisisAssessment()
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('An error occurred, but help is available');
      expect(data.resources).toBeDefined(); // Should still provide crisis resources
    });

    it('should determine intervention type based on severity', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      const testCases = [
        { severity: 'EMERGENCY', expectedType: 'EMERGENCY_DISPATCH' },
        { severity: 'CRITICAL', expectedType: 'CALL' },
        { severity: 'HIGH', expectedType: 'VIDEO' },
        { severity: 'MODERATE', expectedType: 'CHAT' },
        { severity: 'LOW', expectedType: 'REFERRAL' }
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        phiService.create.mockResolvedValue({
          id: 'intervention-123',
          severity: testCase.severity
        });

        const assessmentData = createMockCrisisAssessment({
          severity: testCase.severity
        });

        const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
          method: 'POST',
          body: assessmentData
        });

        await POST(request);

        expect(phiService.create).toHaveBeenCalledWith(
          'CrisisIntervention',
          expect.objectContaining({
            interventionType: testCase.expectedType
          }),
          expect.any(Object)
        );
      }
    });
  });

  describe('GET - Crisis Resources', () => {
    it('should return crisis resources without authentication', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.resources).toBeDefined();
      expect(data.resources.US.suicide).toBe('988');
      expect(data.resources.US.emergency).toBe('911');
      expect(data.resources.resources).toBeInstanceOf(Array);
      expect(data.message).toContain('Crisis resources are available 24/7');
    });

    it('should include all required crisis resources', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.resources.US).toEqual(
        expect.objectContaining({
          suicide: '988',
          suicideAlt: '1-800-273-8255',
          crisis: '741741',
          emergency: '911'
        })
      );

      expect(data.resources.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'National Suicide Prevention Lifeline',
            number: '988'
          }),
          expect.objectContaining({
            name: 'Crisis Text Line',
            number: '741741'
          }),
          expect.objectContaining({
            name: 'Veterans Crisis Line',
            number: '1-800-273-8255'
          })
        ])
      );
    });
  });

  describe('Crisis severity determination', () => {
    it('should correctly determine emergency severity', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      phiService.create.mockImplementation((type, data) =>
        Promise.resolve({
          id: 'intervention-123',
          ...data
        })
      );

      const emergencyScenarios = [
        { immediateRisk: true, suicidalIdeation: false, hasPlan: false, hasMeans: false },
        { immediateRisk: false, suicidalIdeation: true, hasPlan: true, hasMeans: true }
      ];

      for (const scenario of emergencyScenarios) {
        jest.clearAllMocks();

        const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
          method: 'POST',
          body: createMockCrisisAssessment(scenario)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.severity).toBe('EMERGENCY');
      }
    });

    it('should set appropriate follow-up dates', async () => {
      const session = createMockSession();
      getServerSession.mockResolvedValue(session);

      phiService.create.mockImplementation((type, data) =>
        Promise.resolve({
          id: 'intervention-123',
          ...data
        })
      );

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: createMockCrisisAssessment({
          severity: 'HIGH'
        })
      });

      await POST(request);

      expect(phiService.create).toHaveBeenCalledWith(
        'CrisisIntervention',
        expect.objectContaining({
          followUpRequired: true,
          followUpDate: expect.any(Date)
        }),
        expect.any(Object)
      );
    });
  });
});
