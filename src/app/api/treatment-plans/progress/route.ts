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
  evidenceData: z.record(z.string(), z.unknown()).optional()
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

    // Filter out undefined values for exactOptionalPropertyTypes
    const progressData = {
      planId: validated.planId,
      progress: validated.progress,
      ...(validated.goalId && { goalId: validated.goalId }),
      ...(validated.objectiveId && { objectiveId: validated.objectiveId }),
      ...(validated.notes && { notes: validated.notes }),
      ...(validated.evidenceData && { evidenceData: validated.evidenceData })
    };

    const updatedPlan = await treatmentPlanService.updateProgress(
      progressData.planId,
      session.user.id,
      progressData
    );

    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully',
      data: updatedPlan
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION_ERROR, details: error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
