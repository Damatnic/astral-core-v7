import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { analyticsService } from '@/lib/services/analytics-service';
import { rateLimiter } from '@/lib/security/rate-limit';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';

// GET /api/analytics/dashboard - Get dashboard analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Rate limiting
    const allowed = await rateLimiter.checkLimit(
      `analytics:${session.user.id}`,
      30,
      300000 // 5 minutes
    );
    if (!allowed) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.RATE_LIMIT },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    // Validate days parameter
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Days parameter must be between 1 and 365' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const dateRange = {
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    };

    const analytics = await analyticsService.getDashboardAnalytics(
      session.user.id,
      session.user.role,
      dateRange
    );

    return NextResponse.json({
      success: true,
      data: analytics,
      dateRange,
    });

  } catch (error: any) {
    console.error('Error getting dashboard analytics:', error);
    return NextResponse.json(
      { error: error.message || ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}