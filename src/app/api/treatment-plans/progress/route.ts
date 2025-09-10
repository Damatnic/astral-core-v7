import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { treatmentPlanService } from '@/lib/services/treatment-plan-service';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';
import { z } from 'zod';

const progressSchema = z.object({
  planId: z.string(),
  goalId: z.string().optional(),
  objectiveId: z.string().optional(),
  progress: z.number().min(0).max(100),
  notes: z.string().optional(),
  evidenceData: z.any().optional(),
});

// POST /api/treatment-plans/progress - Update progress
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const validated = progressSchema.parse(body);

    if (!validated.goalId && !validated.objectiveId) {
      return NextResponse.json(
        { error: 'Either goalId or objectiveId must be provided' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const updatedPlan = await treatmentPlanService.updateProgress(
      validated.planId,
      session.user.id,
      validated
    );

    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully',
      data: updatedPlan,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: error.message || ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}