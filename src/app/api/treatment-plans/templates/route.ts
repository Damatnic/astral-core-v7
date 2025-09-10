import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { treatmentPlanService } from '@/lib/services/treatment-plan-service';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';

// GET /api/treatment-plans/templates - Get treatment plan templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Only therapists can access templates
    if (session.user.role !== 'THERAPIST') {
      return NextResponse.json(
        { error: 'Only therapists can access templates' },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { searchParams } = new URL(request.url);
    const condition = searchParams.get('condition');

    const templates = await treatmentPlanService.getTemplates(condition || undefined);

    return NextResponse.json({
      success: true,
      data: templates
    });
  } catch (error: unknown) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
