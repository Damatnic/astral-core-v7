import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { rateLimiters } from '../../../../lib/security/rate-limit';
import { logError, logInfo, toError } from '../../../../lib/logger';
import prisma from '../../../../lib/db/prisma';
import { z } from 'zod';
import { ErrorSeverity, ErrorType } from '@prisma/client';
import { sendAlert } from '../../../../lib/services/alerting';
import { ErrorSeverity as AlertSeverity } from '../../../../lib/utils/error-handling';

/**
 * Error Tracking API Endpoint
 * Comprehensive error collection and monitoring for production systems
 * Stores errors in database for analysis and alerting
 */

const ErrorSchema = z.object({
  message: z.string().min(1).max(1000),
  stack: z.string().optional(),
  filename: z.string().optional(),
  lineno: z.number().int().optional(),
  colno: z.number().int().optional(),
  type: z.enum(['javascript', 'unhandledrejection', 'resource', 'network', 'custom']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  url: z.string().url(),
  userAgent: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  performanceImpact: z.object({
    beforeError: z.object({
      memoryUsage: z.object({
        usedJSHeapSize: z.number(),
        totalJSHeapSize: z.number()
      }).optional(),
      timing: z.object({
        loadEventEnd: z.number()
      }).optional(),
      resourceCount: z.number().optional()
    }),
    afterError: z.object({
      memoryUsage: z.object({
        usedJSHeapSize: z.number(),
        totalJSHeapSize: z.number()
      }).optional(),
      timing: z.object({
        loadEventEnd: z.number()
      }).optional(),
      resourceCount: z.number().optional()
    })
  }).optional()
});

// POST: Log error event
export async function POST(request: NextRequest) {
  try {
    // Rate limiting for error reporting
    const identifier = rateLimiters.api.getIdentifier(request);
    const { allowed, remaining, resetTime } = await rateLimiters.api.check(identifier);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for error reporting' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': resetTime.toISOString()
          }
        }
      );
    }

    const body = await request.json();
    const validatedData = ErrorSchema.parse(body);

    // Get user information if authenticated
    const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET']! });
    const userId = token?.id as string | undefined;

    // Store error in database
    const errorRecord = await prisma.errorLog.create({
      data: {
        message: validatedData.message,
        stack: validatedData.stack || null,
        filename: validatedData.filename || null,
        lineno: validatedData.lineno || null,
        colno: validatedData.colno || null,
        type: validatedData.type.toUpperCase() as 'JAVASCRIPT' | 'UNHANDLED_REJECTION' | 'RESOURCE' | 'NETWORK' | 'CUSTOM',
        severity: validatedData.severity.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        url: validatedData.url,
        userAgent: validatedData.userAgent,
        userId: userId || null,
        context: validatedData.context ? JSON.stringify(validatedData.context) : null,
        performanceImpact: validatedData.performanceImpact ? JSON.stringify(validatedData.performanceImpact) : null,
        timestamp: new Date(),
        resolved: false
      }
    });

    // Log critical errors for immediate attention
    if (validatedData.severity === 'critical') {
      logInfo('Critical error reported', 'ErrorTracking', {
        errorId: errorRecord.id,
        message: validatedData.message,
        userId,
        url: validatedData.url
      });

      // Trigger alerting system for critical errors
      const alertSeverity = validatedData.severity === 'CRITICAL' ? AlertSeverity.CRITICAL :
                           validatedData.severity === 'HIGH' ? AlertSeverity.HIGH :
                           validatedData.severity === 'MEDIUM' ? AlertSeverity.MEDIUM :
                           AlertSeverity.LOW;
      
      await sendAlert({
        severity: alertSeverity,
        errorId: errorRecord.id,
        message: validatedData.message,
        userId,
        url: validatedData.url || undefined,
        stackTrace: validatedData.stack || undefined,
        metadata: validatedData.metadata || undefined,
        timestamp: new Date().toISOString()
      });
    }

    logInfo('Error logged successfully', 'ErrorTracking', {
      errorId: errorRecord.id,
      severity: validatedData.severity,
      type: validatedData.type
    });

    return NextResponse.json(
      {
        success: true,
        errorId: errorRecord.id,
        message: 'Error logged successfully'
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTime.toISOString()
        }
      }
    );

  } catch (error) {
    logError('Failed to log error', toError(error), 'ErrorTracking');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid error data format',
          details: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error while logging error' },
      { status: 500 }
    );
  }
}

// GET: Retrieve error statistics and recent errors (admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET']! });
    
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || '24h';
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const severity = url.searchParams.get('severity');

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    
    switch (timeframe) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build filter conditions
    const whereClause = {
      timestamp: {
        gte: startTime
      },
      ...(severity && { severity: severity.toUpperCase() as ErrorSeverity })
    };

    // Get error statistics
    const [totalErrors, errorsBySeverity, errorsByType, recentErrors] = await Promise.all([
      // Total error count
      prisma.errorLog.count({
        where: whereClause
      }),

      // Errors grouped by severity
      prisma.errorLog.groupBy({
        by: ['severity'],
        where: whereClause,
        _count: {
          severity: true
        }
      }),

      // Errors grouped by type
      prisma.errorLog.groupBy({
        by: ['type'],
        where: whereClause,
        _count: {
          type: true
        }
      }),

      // Recent error details
      prisma.errorLog.findMany({
        where: whereClause,
        orderBy: {
          timestamp: 'desc'
        },
        take: limit,
        select: {
          id: true,
          message: true,
          type: true,
          severity: true,
          url: true,
          timestamp: true,
          userId: true,
          resolved: true,
          filename: true
        }
      })
    ]);

    // Get error patterns (most common error messages)
    const errorPatterns = await prisma.errorLog.groupBy({
      by: ['message'],
      where: whereClause,
      _count: {
        message: true
      },
      orderBy: {
        _count: {
          message: 'desc'
        }
      },
      take: 10
    });

    // Get affected users count
    const affectedUsers = await prisma.errorLog.groupBy({
      by: ['userId'],
      where: {
        ...whereClause,
        userId: {
          not: null
        }
      },
      _count: {
        userId: true
      }
    });

    return NextResponse.json({
      timeframe,
      statistics: {
        total: totalErrors,
        bySeverity: errorsBySeverity.reduce((acc: Record<string, number>, item: { severity: ErrorSeverity; _count: { severity: number } }) => {
          acc[item.severity] = item._count.severity;
          return acc;
        }, {} as Record<string, number>),
        byType: errorsByType.reduce((acc: Record<string, number>, item: { type: ErrorType; _count: { type: number } }) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {} as Record<string, number>),
        affectedUsers: affectedUsers.length,
        topPatterns: errorPatterns.map((pattern: { message: string; _count: { message: number } }) => ({
          message: pattern.message,
          count: pattern._count.message
        }))
      },
      recentErrors,
      generated: now.toISOString()
    });

  } catch (error) {
    logError('Failed to retrieve error statistics', toError(error), 'ErrorTracking');

    return NextResponse.json(
      { error: 'Failed to retrieve error data' },
      { status: 500 }
    );
  }
}

// PATCH: Mark error as resolved (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET']! });
    
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { errorIds, resolved } = body;

    if (!Array.isArray(errorIds) || typeof resolved !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected errorIds array and resolved boolean' },
        { status: 400 }
      );
    }

    const updatedErrors = await prisma.errorLog.updateMany({
      where: {
        id: {
          in: errorIds
        }
      },
      data: {
        resolved,
        resolvedBy: token.id as string,
        resolvedAt: resolved ? new Date() : null
      }
    });

    logInfo('Error resolution status updated', 'ErrorTracking', {
      updatedCount: updatedErrors.count,
      resolved,
      adminId: token.id
    });

    return NextResponse.json({
      success: true,
      updatedCount: updatedErrors.count,
      message: `${updatedErrors.count} errors marked as ${resolved ? 'resolved' : 'unresolved'}`
    });

  } catch (error) {
    logError('Failed to update error resolution status', toError(error), 'ErrorTracking');

    return NextResponse.json(
      { error: 'Failed to update error status' },
      { status: 500 }
    );
  }
}