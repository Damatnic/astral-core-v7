import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { rateLimiters } from '@/lib/security/rate-limit';
import { logInfo, logError } from '@/lib/logger';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

/**
 * Performance Monitoring API Endpoint
 * Comprehensive performance metrics collection for Web Vitals and custom metrics
 * Stores metrics in database for analysis and alerting
 */

const WebVitalsSchema = z.object({
  fcp: z.number().optional(),
  lcp: z.number().optional(),
  fid: z.number().optional(),
  cls: z.number().optional(),
  ttfb: z.number().optional(),
  inp: z.number().optional()
});

const PerformanceMetricSchema = z.object({
  url: z.string().url(),
  userAgent: z.string(),
  sessionId: z.string().optional(),
  vitals: WebVitalsSchema,
  metadata: z.object({
    connectionType: z.string().optional(),
    deviceMemory: z.number().optional(),
    hardwareConcurrency: z.number().optional(),
    timestamp: z.number(),
    timeOrigin: z.number().optional(),
    pageLoadTime: z.number().optional(),
    domContentLoadedTime: z.number().optional(),
    resourceCount: z.object({
      scripts: z.number().optional(),
      stylesheets: z.number().optional(),
      images: z.number().optional(),
      fonts: z.number().optional()
    }).optional(),
    bundleSize: z.number().optional(),
    memoryUsage: z.object({
      usedJSHeapSize: z.number(),
      totalJSHeapSize: z.number(),
      jsHeapSizeLimit: z.number()
    }).optional()
  }).optional()
});

const CustomMetricSchema = z.object({
  name: z.string().min(1).max(100),
  value: z.number(),
  unit: z.string().max(20),
  tags: z.record(z.string()).optional(),
  timestamp: z.number().optional()
});

// POST: Submit performance metrics
export async function POST(request: NextRequest) {
  try {
    // Rate limiting for performance metrics
    const identifier = rateLimiters.api.getIdentifier(request);
    const { allowed, remaining, resetTime } = await rateLimiters.api.check(identifier);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for performance metrics' },
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
    const { type, data } = body;

    // Get user information if authenticated
    const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET']! });
    const userId = token?.id as string | undefined;

    if (type === 'web-vitals') {
      const validatedData = PerformanceMetricSchema.parse(data);

      // Store performance metric in database
      const performanceRecord = await prisma.performanceMetric.create({
        data: {
          url: validatedData.url,
          userAgent: validatedData.userAgent,
          sessionId: validatedData.sessionId || null,
          userId: userId || null,
          vitals: JSON.stringify(validatedData.vitals),
          metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
          timestamp: validatedData.metadata?.timestamp ? new Date(validatedData.metadata.timestamp) : new Date(),
          clientIP: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
        }
      });

      // Check for performance issues and create alerts
      await checkPerformanceThresholds(validatedData, performanceRecord.id, userId);

      logInfo('Web vitals metrics stored', 'PerformanceMonitoring', {
        metricId: performanceRecord.id,
        url: validatedData.url,
        userId,
        vitals: validatedData.vitals
      });

      return NextResponse.json({
        success: true,
        metricId: performanceRecord.id,
        message: 'Performance metrics stored successfully'
      });

    } else if (type === 'custom-metric') {
      const validatedData = CustomMetricSchema.parse(data);

      // Store custom metric
      const systemMetric = await prisma.systemMetric.create({
        data: {
          metricType: validatedData.name,
          value: validatedData.value,
          unit: validatedData.unit,
          timestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
          source: userId || 'anonymous',
          labels: validatedData.tags ? JSON.stringify(validatedData.tags) : null
        }
      });

      logInfo('Custom metric stored', 'PerformanceMonitoring', {
        metricId: systemMetric.id,
        name: validatedData.name,
        value: validatedData.value,
        userId
      });

      return NextResponse.json({
        success: true,
        metricId: systemMetric.id,
        message: 'Custom metric stored successfully'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid metric type. Supported types: web-vitals, custom-metric' },
        { status: 400 }
      );
    }

  } catch (error) {
    logError('Failed to store performance metrics', 'PerformanceMonitoring', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid performance data format',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error while storing metrics' },
      { status: 500 }
    );
  }
}

// GET: Retrieve performance analytics (admin/therapist only)
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET']! });
    
    if (!token || !['ADMIN', 'THERAPIST'].includes(token.role as string)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin or Therapist access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || '24h';
    const metricType = url.searchParams.get('type') || 'web-vitals';
    const limit = parseInt(url.searchParams.get('limit') || '1000');

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

    if (metricType === 'web-vitals') {
      // Get web vitals analytics
      const metrics = await prisma.performanceMetric.findMany({
        where: {
          timestamp: {
            gte: startTime
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit,
        select: {
          id: true,
          url: true,
          vitals: true,
          metadata: true,
          timestamp: true,
          userId: true
        }
      });

      // Parse and aggregate vitals
      const vitalsData = metrics.map(metric => ({
        ...metric,
        vitals: metric.vitals ? JSON.parse(metric.vitals) : {},
        metadata: metric.metadata ? JSON.parse(metric.metadata) : {}
      }));

      // Calculate aggregated statistics
      const aggregations = calculateWebVitalsAggregations(vitalsData);

      return NextResponse.json({
        timeframe,
        total: metrics.length,
        aggregations,
        recentMetrics: vitalsData.slice(0, 50), // Return last 50 for details
        generated: now.toISOString()
      });

    } else if (metricType === 'custom') {
      // Get custom metrics
      const metrics = await prisma.systemMetric.findMany({
        where: {
          timestamp: {
            gte: startTime
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit
      });

      // Group by metric type
      const groupedMetrics = metrics.reduce((acc, metric) => {
        if (!acc[metric.metricType]) {
          acc[metric.metricType] = [];
        }
        acc[metric.metricType].push({
          value: metric.value,
          unit: metric.unit,
          timestamp: metric.timestamp,
          labels: metric.labels ? JSON.parse(metric.labels) : {}
        });
        return acc;
      }, {} as Record<string, any[]>);

      return NextResponse.json({
        timeframe,
        total: metrics.length,
        metricTypes: Object.keys(groupedMetrics),
        metrics: groupedMetrics,
        generated: now.toISOString()
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid metric type. Supported types: web-vitals, custom' },
        { status: 400 }
      );
    }

  } catch (error) {
    logError('Failed to retrieve performance analytics', 'PerformanceMonitoring', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to retrieve performance data' },
      { status: 500 }
    );
  }
}

// Helper function to check performance thresholds and trigger alerts
async function checkPerformanceThresholds(
  data: z.infer<typeof PerformanceMetricSchema>,
  metricId: string,
  userId?: string
) {
  const vitals = data.vitals;
  const alerts: Array<{ severity: string; message: string; metric: string; value: number }> = [];

  // Check Core Web Vitals thresholds
  if (vitals.lcp && vitals.lcp > 4000) {
    alerts.push({
      severity: 'ERROR',
      message: 'Poor Largest Contentful Paint detected',
      metric: 'LCP',
      value: vitals.lcp
    });
  } else if (vitals.lcp && vitals.lcp > 2500) {
    alerts.push({
      severity: 'WARNING',
      message: 'Needs improvement - Largest Contentful Paint',
      metric: 'LCP',
      value: vitals.lcp
    });
  }

  if (vitals.fid && vitals.fid > 300) {
    alerts.push({
      severity: 'ERROR',
      message: 'Poor First Input Delay detected',
      metric: 'FID',
      value: vitals.fid
    });
  }

  if (vitals.cls && vitals.cls > 0.25) {
    alerts.push({
      severity: 'ERROR',
      message: 'Poor Cumulative Layout Shift detected',
      metric: 'CLS',
      value: vitals.cls
    });
  }

  if (vitals.fcp && vitals.fcp > 3000) {
    alerts.push({
      severity: 'WARNING',
      message: 'Slow First Contentful Paint detected',
      metric: 'FCP',
      value: vitals.fcp
    });
  }

  // Create alert records for significant issues
  for (const alert of alerts) {
    if (alert.severity === 'ERROR') {
      try {
        const alertRule = await prisma.alertRule.findFirst({
          where: {
            name: `Performance Alert - ${alert.metric}`,
            isActive: true
          }
        });

        if (alertRule) {
          await prisma.alert.create({
            data: {
              ruleId: alertRule.id,
              title: alert.message,
              message: `Performance issue detected: ${alert.metric} value of ${alert.value}ms/score is above threshold`,
              severity: alert.severity as any,
              metadata: JSON.stringify({
                metricId,
                userId,
                url: data.url,
                metric: alert.metric,
                value: alert.value
              })
            }
          });
        }
      } catch (error) {
        logError('Failed to create performance alert', 'PerformanceMonitoring', {
          error: error instanceof Error ? error.message : 'Unknown error',
          alert
        });
      }
    }
  }
}

// Helper function to calculate Web Vitals aggregations
function calculateWebVitalsAggregations(vitalsData: any[]) {
  const vitalsKeys = ['fcp', 'lcp', 'fid', 'cls', 'ttfb', 'inp'];
  const aggregations: Record<string, any> = {};

  for (const key of vitalsKeys) {
    const values = vitalsData
      .map(d => d.vitals[key])
      .filter(v => v !== undefined && v !== null && !isNaN(v));

    if (values.length > 0) {
      const sorted = values.sort((a, b) => a - b);
      aggregations[key] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((sum, v) => sum + v, 0) / values.length,
        median: sorted[Math.floor(sorted.length / 2)],
        p75: sorted[Math.floor(sorted.length * 0.75)],
        p90: sorted[Math.floor(sorted.length * 0.90)],
        p95: sorted[Math.floor(sorted.length * 0.95)]
      };
    }
  }

  return aggregations;
}