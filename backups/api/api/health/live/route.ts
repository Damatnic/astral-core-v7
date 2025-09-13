import { NextResponse } from 'next/server';

/**
 * Liveness Probe Endpoint
 * Ultra-fast liveness check for Kubernetes/Docker health checks
 * Returns 200 if the application process is alive
 */

export async function GET() {
  return NextResponse.json({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid,
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024), // MB
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) // MB
    }
  });
}