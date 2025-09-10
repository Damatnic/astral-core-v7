import { POST, GET } from '@/app/api/crisis/assess/route';
import { getServerSession } from 'next-auth';
import { 
  createAPIRequest, 
  createAuthenticatedSession,
  createPHIMock,
  testAPIEndpoint
} from '../../../utils/api-test-helpers';
import { mockPrisma, resetPrismaMocks } from '../../../mocks/prisma';
import type { CrisisSeverity, InterventionType } from '@prisma/client';
import type { CrisisAssessmentInput } from '@/lib/types/crisis';

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
  phiService: createPHIMock()
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

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const { phiService } = require('@/lib/security/phi-service');
const { audit } = require('@/lib/security/audit');
const { rateLimiters } = require('@/lib/security/rate-limit');

describe('Crisis Assessment Algorithm Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMocks();
    
    // Default session setup
    mockedGetServerSession.mockResolvedValue(createAuthenticatedSession({
      id: 'user-123',
      role: 'CLIENT'
    }));

    // Default PHI service setup
    phiService.create.mockResolvedValue({
      id: 'intervention-123',
      userId: 'user-123',
      severity: 'MODERATE'
    });
  });

  describe('Crisis Severity Determination Algorithm', () => {
    const createAssessmentData = (overrides: Partial<CrisisAssessmentInput> = {}): CrisisAssessmentInput => ({
      symptoms: ['anxiety', 'depression'],
      suicidalIdeation: false,
      homicidalIdeation: false,
      selfHarmRisk: false,
      substanceUse: false,
      hasSupport: true,
      hasPlan: false,
      hasMeans: false,
      immediateRisk: false,
      ...overrides
    });

    it('should classify as EMERGENCY when immediate risk is present', async () => {
      const assessmentData = createAssessmentData({
        immediateRisk: true,
        suicidalIdeation: false,
        hasPlan: false,
        hasMeans: false
      });

      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.severity).toBe('EMERGENCY');
      expect(responseData.urgent).toBe(true);
      expect(responseData.message).toBe('IMMEDIATE HELP NEEDED');
      expect(responseData.nextSteps).toContain('Call 911 immediately');
      expect(responseData.alertsSent).toBe(true);
    });

    it('should classify as EMERGENCY when suicidal ideation with plan and means', async () => {
      const assessmentData = createAssessmentData({
        suicidalIdeation: true,
        hasPlan: true,
        hasMeans: true,
        immediateRisk: false
      });

      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.severity).toBe('EMERGENCY');
      expect(responseData.urgent).toBe(true);
      expect(responseData.nextSteps).toContain('Call 911 immediately');
    });

    it('should classify as CRITICAL when suicidal ideation with plan OR means', async () => {
      // Test with plan but no means
      const assessmentData1 = createAssessmentData({
        suicidalIdeation: true,
        hasPlan: true,
        hasMeans: false,
        immediateRisk: false
      });

      const request1 = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData1
      });

      const response1 = await POST(request1);
      const responseData1 = await response1.json();

      expect(responseData1.severity).toBe('CRITICAL');
      expect(responseData1.urgent).toBe(true);
      expect(responseData1.message).toBe('Please seek help immediately');
      expect(responseData1.nextSteps).toContain('Call 988 or the suicide prevention lifeline');

      // Test with means but no plan
      const assessmentData2 = createAssessmentData({
        suicidalIdeation: true,
        hasPlan: false,
        hasMeans: true,
        immediateRisk: false
      });

      const request2 = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData2
      });

      const response2 = await POST(request2);
      const responseData2 = await response2.json();

      expect(responseData2.severity).toBe('CRITICAL');
    });

    it('should classify as HIGH when suicidal or homicidal ideation without plan/means', async () => {
      // Test suicidal ideation only
      const assessmentData1 = createAssessmentData({
        suicidalIdeation: true,
        homicidalIdeation: false,
        hasPlan: false,
        hasMeans: false
      });

      const request1 = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData1
      });

      const response1 = await POST(request1);
      const responseData1 = await response1.json();

      expect(responseData1.severity).toBe('HIGH');
      expect(responseData1.message).toBe('Professional support recommended');
      expect(responseData1.nextSteps).toContain('Schedule an urgent appointment with your therapist');

      // Test homicidal ideation only
      const assessmentData2 = createAssessmentData({
        suicidalIdeation: false,
        homicidalIdeation: true,
        hasPlan: false,
        hasMeans: false
      });

      const request2 = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData2
      });

      const response2 = await POST(request2);
      const responseData2 = await response2.json();

      expect(responseData2.severity).toBe('HIGH');
    });

    it('should classify as MODERATE when self-harm risk or substance use present', async () => {
      // Test self-harm risk
      const assessmentData1 = createAssessmentData({
        selfHarmRisk: true,
        substanceUse: false
      });

      const request1 = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData1
      });

      const response1 = await POST(request1);
      const responseData1 = await response1.json();

      expect(responseData1.severity).toBe('MODERATE');
      expect(responseData1.message).toBe('Monitor symptoms and seek support');

      // Test substance use
      const assessmentData2 = createAssessmentData({
        selfHarmRisk: false,
        substanceUse: true
      });

      const request2 = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData2
      });

      const response2 = await POST(request2);
      const responseData2 = await response2.json();

      expect(responseData2.severity).toBe('MODERATE');
    });

    it('should classify as LOW when no significant risk factors present', async () => {
      const assessmentData = createAssessmentData({
        symptoms: ['mild anxiety'],
        suicidalIdeation: false,
        homicidalIdeation: false,
        selfHarmRisk: false,
        substanceUse: false,
        hasSupport: true
      });

      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.severity).toBe('LOW');
      expect(responseData.urgent).toBeUndefined();
      expect(responseData.message).toBe('Continue monitoring your wellness');
      expect(responseData.nextSteps).toContain('Continue regular therapy sessions');
    });
  });

  describe('Intervention Type Assignment Algorithm', () => {
    interface SeverityInterventionTestCase {
      severity: CrisisSeverity;
      expectedIntervention: InterventionType;
      description: string;
    }

    const testCases: SeverityInterventionTestCase[] = [
      {
        severity: 'EMERGENCY',
        expectedIntervention: 'EMERGENCY_DISPATCH',
        description: 'should assign EMERGENCY_DISPATCH for EMERGENCY severity'
      },
      {
        severity: 'CRITICAL',
        expectedIntervention: 'CALL',
        description: 'should assign CALL for CRITICAL severity'
      },
      {
        severity: 'HIGH',
        expectedIntervention: 'VIDEO',
        description: 'should assign VIDEO for HIGH severity'
      },
      {
        severity: 'MODERATE',
        expectedIntervention: 'CHAT',
        description: 'should assign CHAT for MODERATE severity'
      },
      {
        severity: 'LOW',
        expectedIntervention: 'REFERRAL',
        description: 'should assign REFERRAL for LOW severity'
      }
    ];

    testCases.forEach(({ severity, expectedIntervention, description }) => {
      it(description, async () => {
        const assessmentData = createAssessmentData({
          severity: severity as any // Type assertion for test
        });

        const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
          method: 'POST',
          body: assessmentData
        });

        await POST(request);

        // Verify PHI service was called with correct intervention type
        expect(phiService.create).toHaveBeenCalledWith(
          'CrisisIntervention',
          expect.objectContaining({
            interventionType: expectedIntervention
          }),
          expect.any(Object)
        );
      });
    });
  });

  describe('Follow-up Requirements Algorithm', () => {
    it('should require follow-up for severity levels above LOW', async () => {
      const severities: CrisisSeverity[] = ['EMERGENCY', 'CRITICAL', 'HIGH', 'MODERATE'];

      for (const severity of severities) {
        jest.clearAllMocks();

        const assessmentData = createAssessmentData();
        if (severity === 'EMERGENCY') {
          assessmentData.immediateRisk = true;
        } else if (severity === 'CRITICAL') {
          assessmentData.suicidalIdeation = true;
          assessmentData.hasPlan = true;
        } else if (severity === 'HIGH') {
          assessmentData.suicidalIdeation = true;
        } else if (severity === 'MODERATE') {
          assessmentData.selfHarmRisk = true;
        }

        const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
          method: 'POST',
          body: assessmentData
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
      }
    });

    it('should not require follow-up for LOW severity', async () => {
      const assessmentData = createAssessmentData({
        symptoms: ['mild stress']
      });

      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      await POST(request);

      expect(phiService.create).toHaveBeenCalledWith(
        'CrisisIntervention',
        expect.objectContaining({
          followUpRequired: false,
          followUpDate: null
        }),
        expect.any(Object)
      );
    });

    it('should schedule follow-up within 24 hours for high-risk cases', async () => {
      const now = Date.now();
      const assessmentData = createAssessmentData({
        suicidalIdeation: true
      });

      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      await POST(request);

      const callArgs = phiService.create.mock.calls[0][1];
      const followUpDate = callArgs.followUpDate;

      expect(followUpDate).toBeInstanceOf(Date);
      const followUpTime = followUpDate.getTime();
      const expectedTime = now + 24 * 60 * 60 * 1000;
      
      // Allow 1 second tolerance
      expect(Math.abs(followUpTime - expectedTime)).toBeLessThan(1000);
    });
  });

  describe('Complex Risk Scenario Testing', () => {
    it('should handle multiple risk factors correctly', async () => {
      const assessmentData = createAssessmentData({
        suicidalIdeation: true,
        selfHarmRisk: true,
        substanceUse: true,
        hasSupport: false,
        hasPlan: false,
        hasMeans: false
      });

      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const responseData = await response.json();

      // Suicidal ideation should take precedence over self-harm/substance use
      expect(responseData.severity).toBe('HIGH');
      expect(responseData.nextSteps).toContain('Schedule an urgent appointment with your therapist');
    });

    it('should prioritize immediate risk over other factors', async () => {
      const assessmentData = createAssessmentData({
        immediateRisk: true,
        suicidalIdeation: false, // Even without suicidal ideation
        hasPlan: false,
        hasMeans: false
      });

      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.severity).toBe('EMERGENCY');
    });

    it('should handle edge case where only means are available', async () => {
      const assessmentData = createAssessmentData({
        suicidalIdeation: false,
        hasPlan: false,
        hasMeans: true, // Means available but no ideation or plan
        immediateRisk: false
      });

      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const responseData = await response.json();

      // Should be LOW since no ideation
      expect(responseData.severity).toBe('LOW');
    });
  });

  describe('Resource and Next Steps Algorithm', () => {
    it('should provide appropriate resources for each severity level', async () => {
      const severityTests = [
        {
          setup: { immediateRisk: true },
          expectedSeverity: 'EMERGENCY',
          shouldHaveUrgentSteps: true,
          shouldHaveAlerts: true
        },
        {
          setup: { suicidalIdeation: true, hasPlan: true },
          expectedSeverity: 'CRITICAL',
          shouldHaveUrgentSteps: true,
          shouldHaveAlerts: true
        },
        {
          setup: { suicidalIdeation: true },
          expectedSeverity: 'HIGH',
          shouldHaveUrgentSteps: false,
          shouldHaveAlerts: false
        },
        {
          setup: { selfHarmRisk: true },
          expectedSeverity: 'MODERATE',
          shouldHaveUrgentSteps: false,
          shouldHaveAlerts: false
        }
      ];

      for (const test of severityTests) {
        jest.clearAllMocks();

        const assessmentData = createAssessmentData(test.setup);
        const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
          method: 'POST',
          body: assessmentData
        });

        const response = await POST(request);
        const responseData = await response.json();

        expect(responseData.severity).toBe(test.expectedSeverity);
        expect(responseData.resources).toBeDefined();
        expect(responseData.resources.US.suicide).toBe('988');
        expect(responseData.nextSteps).toBeInstanceOf(Array);
        expect(responseData.nextSteps.length).toBeGreaterThan(0);

        if (test.shouldHaveUrgentSteps) {
          expect(responseData.urgent).toBe(true);
        }

        if (test.shouldHaveAlerts) {
          expect(responseData.alertsSent).toBe(true);
        }
      }
    });

    it('should always include crisis resources in response', async () => {
      const assessmentData = createAssessmentData();
      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.resources).toEqual({
        US: {
          suicide: '988',
          suicideAlt: '1-800-273-8255',
          crisis: '741741',
          emergency: '911'
        },
        resources: expect.arrayContaining([
          expect.objectContaining({
            name: 'National Suicide Prevention Lifeline',
            number: '988'
          }),
          expect.objectContaining({
            name: 'Crisis Text Line',
            number: '741741'
          })
        ])
      });
    });
  });

  describe('Data Storage and Audit Algorithm', () => {
    it('should create intervention record with correct data', async () => {
      const assessmentData = createAssessmentData({
        symptoms: ['anxiety', 'panic attacks'],
        triggerEvent: 'Work stress',
        suicidalIdeation: true
      });

      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      await POST(request);

      expect(phiService.create).toHaveBeenCalledWith(
        'CrisisIntervention',
        {
          userId: 'user-123',
          severity: 'HIGH',
          triggerEvent: 'Work stress',
          symptoms: ['anxiety', 'panic attacks'],
          interventionType: 'VIDEO',
          status: 'ACTIVE',
          followUpRequired: true,
          followUpDate: expect.any(Date),
          resourcesProvided: [
            'National Suicide Prevention Lifeline',
            'Crisis Text Line',
            'Veterans Crisis Line'
          ]
        },
        {
          userId: 'user-123',
          userRole: 'CLIENT',
          resourceType: 'CrisisIntervention'
        }
      );
    });

    it('should create audit log for crisis assessment', async () => {
      const assessmentData = createAssessmentData({
        immediateRisk: true
      });

      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      await POST(request);

      expect(audit.logSuccess).toHaveBeenCalledWith(
        'CRISIS_ASSESSMENT',
        'CrisisIntervention',
        'intervention-123',
        {
          severity: 'EMERGENCY',
          immediateRisk: true,
          interventionType: 'EMERGENCY_DISPATCH'
        },
        'user-123'
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidData = {
        symptoms: [], // Empty symptoms array should fail validation
        suicidalIdeation: 'invalid' // Should be boolean
      };

      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: invalidData
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation error');
      expect(responseData.resources).toBeDefined(); // Should still provide resources
    });

    it('should provide resources even when rate limited', async () => {
      rateLimiters.crisis.check.mockResolvedValue({ allowed: false });

      const assessmentData = createAssessmentData({
        immediateRisk: true
      });

      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(429);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Too many requests');
      expect(responseData.resources).toBeDefined();
    });

    it('should handle unauthenticated requests', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const assessmentData = createAssessmentData();
      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should provide resources even in server errors', async () => {
      phiService.create.mockRejectedValue(new Error('Database error'));

      const assessmentData = createAssessmentData();
      const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: assessmentData
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('An error occurred, but help is available');
      expect(responseData.resources).toBeDefined();
      expect(audit.logError).toHaveBeenCalled();
    });
  });

  describe('GET endpoint - Crisis Resources', () => {
    it('should return crisis resources without authentication', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const response = await GET();
      const responseData = await response.json();

      expect(responseData.success).toBe(true);
      expect(responseData.resources).toBeDefined();
      expect(responseData.message).toBe('Crisis resources are available 24/7');
    });
  });
});

// Helper function to create test assessment data
const createAssessmentData = (overrides: Partial<CrisisAssessmentInput> = {}): CrisisAssessmentInput => ({
  symptoms: ['anxiety', 'depression'],
  suicidalIdeation: false,
  homicidalIdeation: false,
  selfHarmRisk: false,
  substanceUse: false,
  hasSupport: true,
  hasPlan: false,
  hasMeans: false,
  immediateRisk: false,
  ...overrides
});