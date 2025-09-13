import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import os from 'os';

// Production metrics endpoint for monitoring
export async function GET(request: NextRequest) {
  try {
    // Check authorization header for monitoring service
    const headersList = headers();
    const authHeader = headersList.get('x-monitoring-key');
    
    // In production, verify monitoring key
    if (process.env.NODE_ENV === 'production') {
      const monitoringKey = process.env.MONITORING_API_KEY;
      if (!monitoringKey || authHeader !== monitoringKey) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Collect system metrics
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const loadAverage = os.loadavg();
    const cpuUsage = process.cpuUsage();
    
    // Application metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      uptime: {
        seconds: uptime,
        formatted: formatUptime(uptime)
      },
      memory: {
        rss: formatBytes(memoryUsage.rss),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        external: formatBytes(memoryUsage.external),
        percentUsed: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        loadAverage: {
          '1min': loadAverage[0]?.toFixed(2),
          '5min': loadAverage[1]?.toFixed(2),
          '15min': loadAverage[2]?.toFixed(2)
        }
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV || 'development'
      },
      application: {
        name: 'Astral Core v7',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        features: {
          auth: 'Auth0',
          database: 'PostgreSQL',
          encryption: 'AES-256-GCM',
          compliance: 'HIPAA'
        }
      },
      endpoints: {
        health: '/api/health',
        status: '/api/status',
        metrics: '/api/monitoring/metrics',
        errors: '/api/monitoring/errors'
      }
    };

    return NextResponse.json(metrics, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('Metrics collection error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to collect metrics',
        status: 'error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Helper functions
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}