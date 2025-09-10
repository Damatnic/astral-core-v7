/**
 * Performance Analytics API Endpoint
 * Collects and stores performance metrics from the client
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Performance metrics interface
interface PerformanceMetrics {
  vitals?: {
    [key: string]: {
      value: number;
      rating: string;
    };
  };
  url?: string;
  timestamp?: number;
  userAgent?: string;
  sessionId?: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PerformanceMetrics = await request.json();

    // Validate required fields
    if (!body.timestamp || !body.url) {
      return NextResponse.json(
        { error: 'Missing required fields: timestamp, url' },
        { status: 400 }
      );
    }

    // Extract basic info
    const userAgent = body.userAgent || request.headers.get('user-agent') || 'unknown';
    const timestamp = new Date(body.timestamp);
    const url = body.url;

    // Get client IP for basic analytics (optional)
    const clientIP =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Store performance data
    const performanceRecord = await prisma.performanceMetric.create({
      data: {
        url,
        timestamp,
        userAgent,
        clientIP,
        sessionId: typeof body.sessionId === 'string' ? body.sessionId : null,
        userId: typeof body.userId === 'string' ? body.userId : null,
        vitals: body.vitals ? JSON.stringify(body.vitals) : null,
        metadata: {
          vitalsCount: body.vitals ? Object.keys(body.vitals).length : 0,
          hasWebVitals: Boolean(body.vitals)
        }
      }
    });

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance metrics stored:', {
        id: performanceRecord.id,
        url,
        vitalsCount: body.vitals ? Object.keys(body.vitals).length : 0
      });
    }

    return NextResponse.json({
      success: true,
      id: performanceRecord.id
    });
  } catch (error) {
    console.error('Error storing performance metrics:', error);

    return NextResponse.json(
      {
        error: 'Failed to store performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const url = searchParams.get('url');
    const since = searchParams.get('since');

    // Build query filters
    const where: Record<string, unknown> = {};

    if (url) {
      where['url'] = {
        contains: url
      };
    }

    if (since) {
      where['timestamp'] = {
        gte: new Date(since)
      };
    }

    // Fetch performance data
    const records = await prisma.performanceMetric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 100), // Cap at 100
      skip: offset,
      select: {
        id: true,
        url: true,
        timestamp: true,
        vitals: true,
        metadata: true,
        userAgent: true,
        sessionId: true
      }
    });

    // Get aggregated statistics
    const stats = await prisma.performanceMetric.aggregate({
      where,
      _count: {
        id: true
      }
    });

    // Calculate Web Vitals statistics if available
    const vitalsStats = await calculateVitalsStats(where);

    return NextResponse.json({
      records: records.map(record => ({
        ...record,
        vitals: record.vitals ? JSON.parse(record.vitals as string) : null
      })),
      stats: {
        totalRecords: stats._count.id,
        ...vitalsStats
      },
      pagination: {
        limit,
        offset,
        hasMore: stats._count.id > offset + limit
      }
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate Web Vitals statistics
async function calculateVitalsStats(where: Record<string, unknown>) {
  try {
    const records = await prisma.performanceMetric.findMany({
      where: {
        ...where,
        vitals: {
          not: null
        }
      },
      select: {
        vitals: true,
        timestamp: true
      },
      orderBy: { timestamp: 'desc' },
      take: 1000 // Last 1000 records for stats
    });

    if (records.length === 0) {
      return {
        vitalsRecords: 0,
        averages: {},
        ratings: {}
      };
    }

    const vitalsData: { [key: string]: { values: number[]; ratings: string[] } } = {};

    // Parse and collect vitals data
    records.forEach(record => {
      if (record.vitals) {
        const vitals = JSON.parse(record.vitals as string);
        Object.entries(vitals).forEach(([metric, data]) => {
          const vitalData = data as { value: number; rating: string };
          if (!vitalsData[metric]) {
            vitalsData[metric] = { values: [], ratings: [] };
          }
          vitalsData[metric].values.push(vitalData.value);
          vitalsData[metric].ratings.push(vitalData.rating);
        });
      }
    });

    // Calculate averages and rating distributions
    const averages: { [key: string]: number } = {};
    const ratings: { [key: string]: { [rating: string]: number } } = {};

    Object.entries(vitalsData).forEach(([metric, data]) => {
      // Calculate average
      averages[metric] = data.values.reduce((sum, val) => sum + val, 0) / data.values.length;

      // Calculate rating distribution
      ratings[metric] = data.ratings.reduce(
        (acc, rating) => {
          acc[rating] = (acc[rating] || 0) + 1;
          return acc;
        },
        {} as { [rating: string]: number }
      );
    });

    return {
      vitalsRecords: records.length,
      averages,
      ratings
    };
  } catch (error) {
    console.error('Error calculating vitals stats:', error);
    return {
      vitalsRecords: 0,
      averages: {},
      ratings: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function is only used internally in this route
