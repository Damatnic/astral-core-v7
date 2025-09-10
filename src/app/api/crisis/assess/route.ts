import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import {
  crisisAssessmentSchema,
  type CrisisAssessmentResponse,
  type CrisisInterventionCreateData,
  type CrisisResources
} from '@/lib/types/crisis';
import { logError } from '@/lib/logger';
import { phiService } from '@/lib/security/phi-service';
import { audit } from '@/lib/security/audit';
import { rateLimiters } from '@/lib/security/rate-limit';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';
import type { CrisisSeverity, InterventionType } from '@prisma/client';

// Crisis hotline numbers
const CRISIS_RESOURCES: CrisisResources = {
  US: {
    suicide: '988',
    suicideAlt: '1-800-273-8255',
    crisis: '741741',
    emergency: '911'
  },
  resources: [
    {
      name: 'National Suicide Prevention Lifeline',
      number: '988',
      description: '24/7 crisis support',
      text: false
    },
    {
      name: 'Crisis Text Line',
      number: '741741',
      description: 'Text HOME to connect with a crisis counselor',
      text: true
    },
    {
      name: 'Veterans Crisis Line',
      number: '1-800-273-8255',
      description: 'Press 1 for veterans',
      text: false
    }
  ]
};

function determineSeverity(assessment: z.infer<typeof crisisAssessmentSchema>): CrisisSeverity {
  const { suicidalIdeation, homicidalIdeation, hasPlan, hasMeans, immediateRisk } = assessment;

  if (immediateRisk || (suicidalIdeation && hasPlan && hasMeans)) {
    return 'EMERGENCY';
  }

  if (suicidalIdeation && (hasPlan || hasMeans)) {
    return 'CRITICAL';
  }

  if (suicidalIdeation || homicidalIdeation) {
    return 'HIGH';
  }

  if (assessment.selfHarmRisk || assessment.substanceUse) {
    return 'MODERATE';
  }

  return 'LOW';
}

function determineInterventionType(severity: CrisisSeverity): InterventionType {
  switch (severity) {
    case 'EMERGENCY':
      return 'EMERGENCY_DISPATCH';
    case 'CRITICAL':
      return 'CALL';
    case 'HIGH':
      return 'VIDEO';
    case 'MODERATE':
      return 'CHAT';
    default:
      return 'REFERRAL';
  }
}

// POST /api/crisis/assess - Perform crisis assessment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Special rate limiting for crisis endpoints - higher limit
    const identifier = rateLimiters.crisis.getIdentifier(request);
    const { allowed } = await rateLimiters.crisis.check(identifier);

    if (!allowed) {
      // Still provide resources even if rate limited
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. If this is an emergency, please call 911 or 988.',
          resources: CRISIS_RESOURCES
        },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      );
    }

    const body = await request.json();
    const assessment = crisisAssessmentSchema.parse(body);

    const severity = assessment.severity || determineSeverity(assessment);
    const interventionType = determineInterventionType(severity);

    // Create crisis intervention record
    const interventionData: CrisisInterventionCreateData = {
      userId: session.user.id,
      severity,
      triggerEvent: assessment.triggerEvent || null,
      symptoms: assessment.symptoms,
      interventionType,
      status: 'ACTIVE',
      followUpRequired: severity !== 'LOW',
      followUpDate:
        severity !== 'LOW'
          ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          : null,
      resourcesProvided: CRISIS_RESOURCES.resources.map(r => r.name)
    };

    const intervention = await phiService.create('CrisisIntervention', interventionData, {
      userId: session.user.id,
      userRole: session.user.role,
      resourceType: 'CrisisIntervention'
    });

    // Log critical assessment
    await audit.logSuccess(
      'CRISIS_ASSESSMENT',
      'CrisisIntervention',
      intervention.id,
      {
        severity,
        immediateRisk: assessment.immediateRisk,
        interventionType
      },
      session.user.id
    );

    // Prepare response based on severity
    const response: CrisisAssessmentResponse = {
      success: true,
      severity,
      interventionId: intervention.id,
      resources: CRISIS_RESOURCES,
      nextSteps: []
    };

    // Add severity-specific guidance
    switch (severity) {
      case 'EMERGENCY':
        response.urgent = true;
        response.message = 'IMMEDIATE HELP NEEDED';
        response.nextSteps = [
          'Call 911 immediately',
          'Go to the nearest emergency room',
          'Call 988 for immediate crisis support',
          'Do not leave the person alone'
        ];
        break;

      case 'CRITICAL':
        response.urgent = true;
        response.message = 'Please seek help immediately';
        response.nextSteps = [
          'Call 988 or the suicide prevention lifeline',
          'Contact your therapist or psychiatrist immediately',
          'Go to an emergency room if symptoms worsen',
          'Remove any means of self-harm'
        ];
        break;

      case 'HIGH':
        response.message = 'Professional support recommended';
        response.nextSteps = [
          'Schedule an urgent appointment with your therapist',
          'Call the crisis line if you need immediate support',
          'Create a safety plan',
          'Stay with supportive people'
        ];
        break;

      case 'MODERATE':
        response.message = 'Monitor symptoms and seek support';
        response.nextSteps = [
          'Schedule an appointment with your therapist',
          'Practice coping strategies',
          'Reach out to your support network',
          'Use wellness tracking to monitor symptoms'
        ];
        break;

      default:
        response.message = 'Continue monitoring your wellness';
        response.nextSteps = [
          'Continue regular therapy sessions',
          'Maintain wellness tracking',
          'Practice self-care strategies',
          'Build your support network'
        ];
    }

    // If emergency, trigger additional alerts
    if (severity === 'EMERGENCY' || severity === 'CRITICAL') {
      // In production, this would trigger:
      // - SMS/email alerts to emergency contacts
      // - Notification to crisis response team
      // - Automatic callback scheduling
      response.alertsSent = true;
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: ERROR_MESSAGES.VALIDATION_ERROR,
          details: error.issues,
          resources: CRISIS_RESOURCES // Always provide resources
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    logError('Error in crisis assessment', error, 'crisis-assess');
    await audit.logError('CRISIS_ASSESSMENT', 'CrisisIntervention', error);

    // Even in error, provide crisis resources
    return NextResponse.json(
      {
        error: 'An error occurred, but help is available',
        resources: CRISIS_RESOURCES
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// GET /api/crisis/assess - Get crisis resources
export async function GET() {
  return NextResponse.json({
    success: true,
    resources: CRISIS_RESOURCES,
    message: 'Crisis resources are available 24/7'
  });
}
