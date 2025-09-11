import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Readiness Probe Endpoint
 * Fast readiness check for Kubernetes/Docker health checks
 * Returns 200 if the application is ready to serve traffic
 */

export async function GET() {
  try {
    // Quick database connectivity check
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'not ready',
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}