import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { analyticsService } from '@/lib/services/analytics-service';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';

// GET /api/analytics/wellness - Get wellness analytics
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
    const days = parseInt(searchParams.get('days') || '30');
    const report = searchParams.get('report') === 'true';
    
    const dateRange = {
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    };

    let data;
    if (report) {
      // Generate detailed report
      data = await analyticsService.generateWellnessReport(session.user.id, dateRange);
    } else {
      // Get basic analytics
      const aggregateLevel = session.user.role === 'THERAPIST' ? 'therapist' : 'user';
      data = await analyticsService.getWellnessAnalytics(
        session.user.id,
        dateRange,
        aggregateLevel
      );
    }

    return NextResponse.json({
      success: true,
      data,
      dateRange,
    });

  } catch (error: any) {
    console.error('Error getting wellness analytics:', error);
    return NextResponse.json(
      { error: error.message || ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}