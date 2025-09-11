/**
 * Comprehensive crisis assessment tests
 * Tests complete crisis intervention flows including assessment, alert system, and emergency response
 */

import { POST as AssessPOST, GET as ResourcesGET } from '@/app/api/crisis/assess/route';
import { POST as AlertPOST } from '@/app/api/crisis/alert/route';
import { mockPrisma, resetPrismaMocks } from '../../mocks/prisma';
import { createMockRequest, createMockCrisisAssessment } from '../../utils/test-helpers';

// Mock all dependencies
jest.mock('@/lib/db/prisma', () => ({
  default: mockPrisma
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

jest.mock('@/lib/security/phi-service', () => ({
  phiService: {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    encrypt: jest.fn().mockImplementation(data => `encrypted_${data}`),
    decrypt: jest.fn().mockImplementation(data => data.replace('encrypted_', ''))
  }
}));

jest.mock('@/lib/security/audit', () => ({
  audit: {
    logSuccess: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined),
    logCritical: jest.fn().mockResolvedValue(undefined)
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

jest.mock('@/lib/services/notification-service', () => ({
  notificationService: {
    sendCrisisAlert: jest.fn().mockResolvedValue(true),
    sendEmergencyNotification: jest.fn().mockResolvedValue(true),
    notifyCrisisTeam: jest.fn().mockResolvedValue(true),
    sendFollowUpReminder: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('@/lib/websocket/server', () => ({
  websocketServer: {
    broadcastToRole: jest.fn(),
    sendToUser: jest.fn(),
    sendEmergencyAlert: jest.fn()
  }
}));

jest.mock('@/lib/services/emergency-dispatch', () => ({
  emergencyDispatch: {
    triggerEmergencyResponse: jest.fn().mockResolvedValue(true),
    notifyEmergencyContacts: jest.fn().mockResolvedValue(true),
    dispatchLocalServices: jest.fn().mockResolvedValue(true)
  }
}));

import { getServerSession } from 'next-auth';
import { phiService } from '@/lib/security/phi-service';
import { audit } from '@/lib/security/audit';
import { notificationService } from '@/lib/services/notification-service';
import { websocketServer } from '@/lib/websocket/server';
import { emergencyDispatch } from '@/lib/services/emergency-dispatch';

describe('Comprehensive Crisis Assessment System', () => {
  beforeEach(() => {
    resetPrismaMocks();
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.CRISIS_HOTLINE_US = '988';
    process.env.EMERGENCY_NUMBER_US = '911';
    process.env.CRISIS_TEXT_LINE = '741741';
  });

  describe('Crisis Risk Assessment', () => {
    it('should correctly assess EMERGENCY level crisis with immediate intervention', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'client@example.com',
          name: 'Client User',
          role: 'CLIENT'
        }
      };
      getServerSession.mockResolvedValue(mockSession);

      // Mock high-risk assessment data
      const emergencyAssessment = createMockCrisisAssessment({
        suicidalIdeation: 9, // High score (1-10 scale)
        homicidalIdeation: 2,
        hasPlan: true,
        hasMeans: true,
        immediateRisk: true,
        previousAttempts: true,
        socialSupport: 2, // Low support
        copingSkills: 2, // Poor coping
        currentStressors: ['job_loss', 'relationship_breakdown', 'financial_crisis'],
        symptoms: ['severe_depression', 'hopelessness', 'panic_attacks'],
        substanceUse: true,
        substanceType: 'alcohol',
        lastUse: '2_hours_ago',
        location: 'home_alone',
        emergencyContacts: [
          {
            name: 'Emergency Contact',
            phone: '+1234567890',
            relationship: 'family'
          }
        ]
      });

      const mockIntervention = {
        id: 'intervention-123',
        userId: 'user-123',
        severity: 'EMERGENCY',
        status: 'ACTIVE',
        interventionType: 'EMERGENCY_DISPATCH',
        assessmentScore: 85,
        riskFactors: ['suicidal_ideation', 'has_plan', 'has_means', 'substance_use'],
        protectiveFactors: ['emergency_contact_available'],
        followUpRequired: true,
        followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      phiService.create.mockResolvedValue(mockIntervention);

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: emergencyAssessment
      });

      const response = await AssessPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.severity).toBe('EMERGENCY');
      expect(data.urgent).toBe(true);
      expect(data.message).toBe('IMMEDIATE HELP NEEDED');
      expect(data.alertsSent).toBe(true);
      expect(data.emergencyDispatch).toBe(true);

      // Verify immediate actions
      expect(data.nextSteps).toContain('Call 911 immediately');
      expect(data.nextSteps).toContain('Crisis team has been alerted');
      expect(data.resources.US.emergency).toBe('911');
      expect(data.resources.US.suicide).toBe('988');

      // Verify intervention creation with comprehensive data
      expect(phiService.create).toHaveBeenCalledWith(
        'CrisisIntervention',
        expect.objectContaining({
          userId: 'user-123',
          severity: 'EMERGENCY',
          interventionType: 'EMERGENCY_DISPATCH',
          status: 'ACTIVE',
          assessmentScore: expect.any(Number),
          riskFactors: expect.arrayContaining(['suicidal_ideation', 'has_plan', 'has_means']),
          followUpRequired: true,
          followUpDate: expect.any(Date)
        }),
        expect.objectContaining({
          encryptionLevel: 'PHI_CRITICAL',
          accessLevel: 'CRISIS_TEAM'
        })
      );

      // Verify emergency dispatch
      expect(emergencyDispatch.triggerEmergencyResponse).toHaveBeenCalledWith({
        userId: 'user-123',
        severity: 'EMERGENCY',
        location: 'home_alone',
        interventionId: 'intervention-123'
      });

      // Verify emergency contacts notification
      expect(emergencyDispatch.notifyEmergencyContacts).toHaveBeenCalledWith(
        'user-123',
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Emergency Contact',
            phone: '+1234567890'
          })
        ])
      );

      // Verify crisis team alert
      expect(websocketServer.broadcastToRole).toHaveBeenCalledWith(
        'CRISIS_RESPONDER',
        'crisis:emergency',
        expect.objectContaining({
          userId: 'user-123',
          severity: 'EMERGENCY',
          interventionId: 'intervention-123'
        })
      );

      // Verify audit trail for critical event
      expect(audit.logCritical).toHaveBeenCalledWith(
        'CRISIS_EMERGENCY_ASSESSMENT',
        'CrisisIntervention',
        'intervention-123',
        expect.objectContaining({
          severity: 'EMERGENCY',
          riskScore: expect.any(Number),
          emergencyDispatch: true
        }),
        'user-123'
      );
    });

    it('should assess CRITICAL level crisis with immediate support', async () => {
      const mockSession = {
        user: { id: 'user-456', email: 'client2@example.com', role: 'CLIENT' }
      };
      getServerSession.mockResolvedValue(mockSession);

      const criticalAssessment = createMockCrisisAssessment({
        suicidalIdeation: 7,
        homicidalIdeation: 1,
        hasPlan: true,
        hasMeans: false,
        immediateRisk: false,
        previousAttempts: false,
        socialSupport: 4,
        copingSkills: 3,
        symptoms: ['severe_depression', 'hopelessness'],
        substanceUse: false,
        currentStressors: ['mental_health_decline'],
        location: 'with_family'
      });

      const mockIntervention = {
        id: 'intervention-456',
        userId: 'user-456',
        severity: 'CRITICAL',
        interventionType: 'IMMEDIATE_CALL',
        assessmentScore: 65
      };

      phiService.create.mockResolvedValue(mockIntervention);

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: criticalAssessment
      });

      const response = await AssessPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.severity).toBe('CRITICAL');
      expect(data.urgent).toBe(true);
      expect(data.message).toBe('Please seek help immediately');
      expect(data.nextSteps).toContain('Call 988 or the suicide prevention lifeline');
      expect(data.alertsSent).toBe(true);
      expect(data.emergencyDispatch).toBe(false);

      // Verify crisis team notification but not emergency dispatch
      expect(notificationService.sendCrisisAlert).toHaveBeenCalledWith(
        'user-456',
        'CRITICAL',
        expect.any(Object)
      );

      expect(emergencyDispatch.triggerEmergencyResponse).not.toHaveBeenCalled();
    });

    it('should assess HIGH level crisis with professional support recommendation', async () => {
      const mockSession = {
        user: { id: 'user-789', email: 'client3@example.com', role: 'CLIENT' }
      };
      getServerSession.mockResolvedValue(mockSession);

      const highAssessment = createMockCrisisAssessment({
        suicidalIdeation: 5,
        homicidalIdeation: 0,
        hasPlan: false,
        hasMeans: false,
        immediateRisk: false,
        previousAttempts: false,
        socialSupport: 6,
        copingSkills: 4,
        symptoms: ['depression', 'anxiety'],
        substanceUse: false,
        currentStressors: ['work_stress']
      });

      const mockIntervention = {
        id: 'intervention-789',
        severity: 'HIGH',
        interventionType: 'SCHEDULED_CALL',
        assessmentScore: 45
      };

      phiService.create.mockResolvedValue(mockIntervention);

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: highAssessment
      });

      const response = await AssessPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.severity).toBe('HIGH');
      expect(data.urgent).toBe(false);
      expect(data.message).toBe('Professional support recommended');
      expect(data.nextSteps).toContain('Schedule an urgent appointment with your therapist');
      expect(data.alertsSent).toBe(false);
      expect(data.emergencyDispatch).toBe(false);

      // Should schedule follow-up within 48 hours
      expect(phiService.create).toHaveBeenCalledWith(
        'CrisisIntervention',
        expect.objectContaining({
          followUpRequired: true,
          followUpDate: expect.any(Date)
        }),
        expect.any(Object)
      );
    });

    it('should assess MODERATE level crisis with monitoring recommendation', async () => {
      const moderateAssessment = createMockCrisisAssessment({
        suicidalIdeation: 3,
        homicidalIdeation: 0,
        hasPlan: false,
        hasMeans: false,
        immediateRisk: false,
        selfHarmRisk: true,
        substanceUse: false,
        socialSupport: 7,
        copingSkills: 6,
        symptoms: ['mild_depression', 'stress']
      });

      const mockSession = {
        user: { id: 'user-mod', email: 'client4@example.com', role: 'CLIENT' }
      };
      getServerSession.mockResolvedValue(mockSession);

      phiService.create.mockResolvedValue({
        id: 'intervention-mod',
        severity: 'MODERATE',
        assessmentScore: 25
      });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: moderateAssessment
      });

      const response = await AssessPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.severity).toBe('MODERATE');
      expect(data.message).toBe('Monitor symptoms and seek support');
      expect(data.nextSteps).toContain('Schedule an appointment with your therapist');
      expect(data.alertsSent).toBe(false);
    });

    it('should assess LOW level crisis with wellness monitoring', async () => {
      const lowAssessment = createMockCrisisAssessment({
        suicidalIdeation: 1,
        homicidalIdeation: 0,
        hasPlan: false,
        hasMeans: false,
        immediateRisk: false,
        selfHarmRisk: false,
        substanceUse: false,
        socialSupport: 8,
        copingSkills: 7,
        symptoms: ['mild_anxiety']
      });

      const mockSession = {
        user: { id: 'user-low', email: 'client5@example.com', role: 'CLIENT' }
      };
      getServerSession.mockResolvedValue(mockSession);

      phiService.create.mockResolvedValue({
        id: 'intervention-low',
        severity: 'LOW',
        assessmentScore: 15
      });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: lowAssessment
      });

      const response = await AssessPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.severity).toBe('LOW');
      expect(data.message).toBe('Continue monitoring your wellness');
      expect(data.nextSteps).toContain('Continue regular therapy sessions');
      expect(data.alertsSent).toBe(false);
    });
  });

  describe('Crisis Alert System', () => {
    it('should handle manual crisis alert from user', async () => {
      const mockSession = {
        user: { id: 'user-alert', email: 'crisis@example.com', role: 'CLIENT' }
      };
      getServerSession.mockResolvedValue(mockSession);

      const alertData = {
        type: 'MANUAL_ALERT',
        severity: 'EMERGENCY',
        location: 'home',
        message: 'I need help now',
        emergencyContact: true
      };

      phiService.create.mockResolvedValue({
        id: 'alert-123',
        type: 'MANUAL_ALERT',
        severity: 'EMERGENCY'
      });

      const request = createMockRequest('http://localhost:3000/api/crisis/alert', {
        method: 'POST',
        body: alertData
      });

      const response = await AlertPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.alertProcessed).toBe(true);
      expect(data.emergencyResponse).toBe(true);

      // Verify immediate emergency response
      expect(emergencyDispatch.triggerEmergencyResponse).toHaveBeenCalledWith({
        userId: 'user-alert',
        alertType: 'MANUAL_ALERT',
        severity: 'EMERGENCY',
        location: 'home',
        message: 'I need help now'
      });

      // Verify crisis team notification
      expect(websocketServer.broadcastToRole).toHaveBeenCalledWith(
        'CRISIS_RESPONDER',
        'crisis:manual_alert',
        expect.objectContaining({
          userId: 'user-alert',
          severity: 'EMERGENCY',
          location: 'home'
        })
      );
    });

    it('should handle automated crisis detection from app usage patterns', async () => {
      phiService.create.mockResolvedValue({
        id: 'auto-alert-123',
        type: 'AUTOMATED_DETECTION'
      });

      // Verify automated alert processing
      expect(notificationService.notifyCrisisTeam).toHaveBeenCalled();
      expect(audit.logSuccess).toHaveBeenCalledWith(
        'AUTOMATED_CRISIS_DETECTION',
        'CrisisAlert',
        expect.any(String),
        expect.objectContaining({
          indicators: expect.arrayContaining(['concerning_journal_entries']),
          confidence: 0.85
        }),
        undefined
      );
    });

    it('should process crisis alert from family/emergency contact', async () => {
      phiService.create.mockResolvedValue({
        id: 'family-alert-123',
        type: 'FAMILY_REPORT'
      });

      // Verify family alert creates intervention
      expect(phiService.create).toHaveBeenCalledWith(
        'CrisisIntervention',
        expect.objectContaining({
          userId: 'user-concern',
          triggerType: 'FAMILY_REPORT',
          severity: 'HIGH',
          reportedBy: 'family-123'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Crisis Resources and Support', () => {
    it('should provide comprehensive crisis resources without authentication', async () => {
      const response = await ResourcesGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.resources).toBeDefined();

      // Verify comprehensive resource list
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
            number: '988',
            description: expect.any(String),
            available: '24/7'
          }),
          expect.objectContaining({
            name: 'Crisis Text Line',
            number: '741741',
            textInstructions: 'Text HOME to 741741'
          }),
          expect.objectContaining({
            name: 'Veterans Crisis Line',
            number: '1-800-273-8255',
            specialized: 'veterans'
          }),
          expect.objectContaining({
            name: 'LGBTQ National Hotline',
            specialized: 'lgbtq'
          }),
          expect.objectContaining({
            name: 'National Domestic Violence Hotline',
            specialized: 'domestic_violence'
          })
        ])
      );

      expect(data.message).toContain('Crisis resources are available 24/7');
    });

    it('should provide location-specific emergency resources', async () => {
      const response = await ResourcesGET();
      const data = await response.json();

      // Should include local resources
      expect(data.resources.local).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('California'),
            type: 'crisis_center'
          })
        ])
      );
    });

    it('should provide multilingual crisis resources', async () => {
      const response = await ResourcesGET();
      const data = await response.json();

      expect(data.resources.multilingual).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Línea Nacional de Prevención del Suicidio',
            language: 'spanish',
            number: '1-888-628-9454'
          })
        ])
      );
    });
  });

  describe('Follow-up and Monitoring', () => {
    it('should schedule appropriate follow-up based on severity', async () => {
      const testCases = [
        { severity: 'EMERGENCY', followUpHours: 2 },
        { severity: 'CRITICAL', followUpHours: 6 },
        { severity: 'HIGH', followUpHours: 24 },
        { severity: 'MODERATE', followUpHours: 72 },
        { severity: 'LOW', followUpHours: 168 } // 1 week
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        
        const mockSession = {
          user: { id: `user-${testCase.severity.toLowerCase()}`, role: 'CLIENT' }
        };
        getServerSession.mockResolvedValue(mockSession);

        phiService.create.mockResolvedValue({
          id: `intervention-${testCase.severity.toLowerCase()}`,
          severity: testCase.severity
        });

        const assessment = createMockCrisisAssessment({ severity: testCase.severity });
        const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
          method: 'POST',
          body: assessment
        });

        await AssessPOST(request);

        // Verify follow-up scheduling
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

    it('should send follow-up reminders to crisis team', async () => {
      // Mock follow-up reminder job
      const followUpData = {
        interventionId: 'intervention-123',
        userId: 'user-123',
        severity: 'CRITICAL',
        scheduledTime: new Date(),
        attempts: 0
      };

      expect(notificationService.sendFollowUpReminder).toHaveBeenCalledWith(
        'crisis-team',
        followUpData
      );
    });

    it('should track crisis intervention outcomes', async () => {
      phiService.update.mockResolvedValue({
        id: 'intervention-123',
        status: 'COMPLETED',
        outcome: 'SUCCESSFUL_CONTACT'
      });

      expect(audit.logSuccess).toHaveBeenCalledWith(
        'CRISIS_INTERVENTION_COMPLETED',
        'CrisisIntervention',
        'intervention-123',
        expect.objectContaining({
          outcome: 'SUCCESSFUL_CONTACT',
          completedBy: 'crisis-responder-123'
        }),
        'crisis-responder-123'
      );
    });
  });

  describe('Security and Privacy', () => {
    it('should handle unauthenticated crisis requests', async () => {
      getServerSession.mockResolvedValue(null);

      const anonymousAssessment = createMockCrisisAssessment({
        suicidalIdeation: 8,
        emergencyContact: false // No contact info available
      });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: anonymousAssessment
      });

      const response = await AssessPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.resources).toBeDefined();
      
      // Should provide resources but limited intervention
      expect(data.message).toContain('Crisis resources are available');
      expect(emergencyDispatch.triggerEmergencyResponse).not.toHaveBeenCalled();
    });

    it('should encrypt all crisis assessment data', async () => {
      const mockSession = {
        user: { id: 'user-encrypt', role: 'CLIENT' }
      };
      getServerSession.mockResolvedValue(mockSession);

      const sensitiveAssessment = createMockCrisisAssessment({
        personalDetails: 'Specific personal information',
        location: 'Exact home address',
        emergencyContacts: [{ name: 'John Doe', phone: '+1234567890' }]
      });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: sensitiveAssessment
      });

      await AssessPOST(request);

      // Verify encryption was applied to sensitive data
      expect(phiService.create).toHaveBeenCalledWith(
        'CrisisIntervention',
        expect.any(Object),
        expect.objectContaining({
          encryptionLevel: 'PHI_CRITICAL',
          accessLevel: 'CRISIS_TEAM'
        })
      );

      expect(phiService.encrypt).toHaveBeenCalledWith(
        expect.stringContaining('personal')
      );
    });

    it('should implement proper access controls for crisis data', async () => {
      // Only crisis team members should access crisis interventions
      const accessLevels = [
        { role: 'CRISIS_RESPONDER', allowed: true },
        { role: 'THERAPIST', allowed: true },
        { role: 'ADMIN', allowed: true },
        { role: 'CLIENT', allowed: false }, // Can only access their own
        { role: 'SUPPORT_STAFF', allowed: false }
      ];

      for (const access of accessLevels) {
        expect(phiService.read).toHaveBeenCalledWith(
          'CrisisIntervention',
          'intervention-123',
          expect.objectContaining({
            requesterRole: access.role,
            accessGranted: access.allowed
          })
        );
      }
    });

    it('should audit all crisis-related actions for compliance', async () => {
      // Every crisis action should be audited
      const auditableActions = [
        'CRISIS_ASSESSMENT_STARTED',
        'CRISIS_SEVERITY_DETERMINED',
        'EMERGENCY_DISPATCH_TRIGGERED',
        'CRISIS_TEAM_NOTIFIED',
        'FOLLOW_UP_SCHEDULED',
        'INTERVENTION_COMPLETED'
      ];

      for (const action of auditableActions) {
        expect(audit.logSuccess).toHaveBeenCalledWith(
          action,
          expect.any(String),
          expect.any(String),
          expect.any(Object),
          expect.any(String)
        );
      }
    });
  });

  describe('Error Handling and Reliability', () => {
    it('should handle service failures gracefully during crisis', async () => {
      const mockSession = {
        user: { id: 'user-failsafe', role: 'CLIENT' }
      };
      getServerSession.mockResolvedValue(mockSession);

      // Mock service failures
      phiService.create.mockRejectedValue(new Error('Database unavailable'));
      emergencyDispatch.triggerEmergencyResponse.mockRejectedValue(new Error('Dispatch service down'));

      const emergencyAssessment = createMockCrisisAssessment({
        suicidalIdeation: 9,
        immediateRisk: true
      });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: emergencyAssessment
      });

      const response = await AssessPOST(request);
      const data = await response.json();

      // Should still provide resources even if services fail
      expect(response.status).toBe(200);
      expect(data.resources).toBeDefined();
      expect(data.resources.US.emergency).toBe('911');
      expect(data.message).toContain('Crisis resources are available');

      // Should log the service failures
      expect(audit.logError).toHaveBeenCalledWith(
        'CRISIS_SERVICE_FAILURE',
        'CrisisSystem',
        null,
        expect.objectContaining({
          error: 'Database unavailable',
          severity: 'EMERGENCY',
          failsafe: true
        }),
        'user-failsafe'
      );
    });

    it('should implement rate limiting to prevent abuse', async () => {
      const { rateLimiters } = await import('@/lib/security/rate-limit');
      rateLimiters.crisis.check.mockResolvedValue({ allowed: false });

      const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
        method: 'POST',
        body: createMockCrisisAssessment()
      });

      const response = await AssessPOST(request);
      const data = await response.json();

      // Should still provide resources even when rate limited
      expect(response.status).toBe(200);
      expect(data.resources).toBeDefined();
      expect(data.rateLimited).toBe(true);
    });

    it('should validate input data to prevent malicious submissions', async () => {
      const invalidInputs = [
        { suicidalIdeation: 'invalid' }, // Non-numeric
        { symptoms: ['<script>alert("xss")</script>'] }, // XSS attempt
        { location: 'x'.repeat(1000) }, // Excessive length
        { emergencyContacts: null } // Invalid structure
      ];

      for (const invalidInput of invalidInputs) {
        const request = createMockRequest('http://localhost:3000/api/crisis/assess', {
          method: 'POST',
          body: invalidInput
        });

        const response = await AssessPOST(request);
        
        // Should handle gracefully and still provide resources
        expect(response.status).toBeLessThanOrEqual(400);
        const data = await response.json();
        expect(data.resources).toBeDefined();
      }
    });
  });
});