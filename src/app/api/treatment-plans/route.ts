import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { treatmentPlanService, treatmentPlanSchema } from '@/lib/services/treatment-plan-service';
import { rateLimiter } from '@/lib/security/rate-limit';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants/index';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';

// GET /api/treatment-plans - Get treatment plans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const planId = searchParams.get('planId');

    // Rate limiting
    const rateLimitResult = await rateLimiter.check(`treatment-plans:${session.user.id}`);
    const allowed = rateLimitResult.allowed;
    if (!allowed) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.RATE_LIMIT },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      );
    }

    // Get specific plan
    if (planId) {
      const plan = await treatmentPlanService.getTreatmentPlan(planId, session.user.id);
      return NextResponse.json({
        success: true,
        data: plan
      });
    }

    // Get plans for a specific client
    if (clientId) {
      const plans = await treatmentPlanService.getClientTreatmentPlans(clientId, session.user.id);
      return NextResponse.json({
        success: true,
        data: plans
      });
    }

    // Get all plans for the current user
    let plans;
    if (session.user.role === 'THERAPIST') {
      // Get therapist's profile
      const therapistProfile = await prisma.therapistProfile.findUnique({
        where: { userId: session.user.id }
      });

      if (!therapistProfile) {
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      // Get all plans for this therapist
      plans = await prisma.treatmentPlan.findMany({
        where: { therapistId: therapistProfile.id },
        include: {
          client: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (session.user.role === 'CLIENT') {
      // Get client's profile
      const clientProfile = await prisma.clientProfile.findFirst({
        where: { userId: session.user.id }
      });

      if (!clientProfile) {
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      plans = await treatmentPlanService.getClientTreatmentPlans(clientProfile.id, session.user.id);
    } else {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    return NextResponse.json({
      success: true,
      data: plans
    });
  } catch (error: unknown) {
    console.error('Error fetching treatment plans:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// POST /api/treatment-plans - Create treatment plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Only therapists can create treatment plans
    if (session.user.role !== 'THERAPIST') {
      return NextResponse.json(
        { error: 'Only therapists can create treatment plans' },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    const validated = treatmentPlanSchema.parse(body);

    // Get therapist profile
    const therapistProfile = await prisma.therapistProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!therapistProfile) {
      return NextResponse.json(
        { error: 'Therapist profile not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Create treatment plan
    const plan = await treatmentPlanService.createTreatmentPlan({
      ...validated,
      therapistId: therapistProfile.id,
      clientId: body.clientId,
      startDate: new Date(validated.startDate),
      reviewDate: new Date(validated.reviewDate)
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Treatment plan created successfully',
        data: plan
      },
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    console.error('Error creating treatment plan:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// PUT /api/treatment-plans - Update treatment plan
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Only therapists can update treatment plans
    if (session.user.role !== 'THERAPIST') {
      return NextResponse.json(
        { error: 'Only therapists can update treatment plans' },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const body = await request.json();

    // Get therapist profile
    const therapistProfile = await prisma.therapistProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!therapistProfile) {
      return NextResponse.json(
        { error: 'Therapist profile not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Update treatment plan
    const updatedPlan = await treatmentPlanService.updateTreatmentPlan(
      planId,
      therapistProfile.id,
      body
    );

    return NextResponse.json({
      success: true,
      message: 'Treatment plan updated successfully',
      data: updatedPlan
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    console.error('Error updating treatment plan:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
