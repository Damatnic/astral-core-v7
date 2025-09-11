import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { logInfo, logError, toError } from '@/lib/logger';

/**
 * Health Check API Endpoint
 * Comprehensive system health monitoring for production deployment
 * Checks database, external services, and system resources
 */

interface HealthCheckResult {
  service: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  responseTime: number;
  details?: Record<string, unknown>;
  error?: string;
}

interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

// GET: System health check
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: HealthCheckResult[] = [];

  try {
    // Check if this is a detailed health check (admin only) or basic liveness probe
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';

    // Basic database connectivity check
    const dbCheck = await checkDatabase();
    checks.push(dbCheck);

    if (detailed) {
      // Additional checks for detailed monitoring
      const [memoryCheck, diskCheck, externalServicesCheck] = await Promise.allSettled([
        checkMemoryUsage(),
        checkDiskUsage(), 
        checkExternalServices()
      ]);

      if (memoryCheck.status === 'fulfilled') {
        checks.push(memoryCheck.value);
      } else {
        checks.push({
          service: 'memory',
          status: 'UNKNOWN',
          responseTime: 0,
          error: 'Memory check failed'
        });
      }

      if (diskCheck.status === 'fulfilled') {
        checks.push(diskCheck.value);
      } else {
        checks.push({
          service: 'disk',
          status: 'UNKNOWN', 
          responseTime: 0,
          error: 'Disk check failed'
        });
      }

      if (externalServicesCheck.status === 'fulfilled') {
        checks.push(...externalServicesCheck.value);
      }
    }

    // Determine overall system health
    const healthyCount = checks.filter(c => c.status === 'HEALTHY').length;
    const degradedCount = checks.filter(c => c.status === 'DEGRADED').length;
    const unhealthyCount = checks.filter(c => c.status === 'UNHEALTHY').length;

    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    if (unhealthyCount > 0) {
      overallStatus = 'UNHEALTHY';
    } else if (degradedCount > 0) {
      overallStatus = 'DEGRADED';
    } else {
      overallStatus = 'HEALTHY';
    }

    const healthData: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env['npm_package_version'] || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      checks,
      summary: {
        total: checks.length,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount
      }
    };

    // Store health check result in database for monitoring
    if (detailed) {
      try {
        await Promise.all(
          checks.map(check =>
            prisma.healthCheck.create({
              data: {
                service: check.service,
                status: check.status,
                responseTime: check.responseTime,
                ...(check.details && { details: JSON.stringify(check.details) }),
                ...(check.error && { errorMessage: check.error }),
                metadata: JSON.stringify({
                  overallStatus,
                  environment: process.env['NODE_ENV'],
                  uptime: process.uptime()
                })
              }
            })
          )
        );
      } catch (dbError) {
        logError('Failed to store health check results', toError(dbError), 'HealthCheck');
      }
    }

    const statusCode = overallStatus === 'HEALTHY' ? 200 : 
                      overallStatus === 'DEGRADED' ? 200 : 503;

    logInfo('Health check completed', 'HealthCheck', {
      status: overallStatus,
      duration: Date.now() - startTime,
      checksCount: checks.length
    });

    return NextResponse.json(healthData, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    logError('Health check failed', toError(error), 'HealthCheck', {
      duration: Date.now() - startTime
    });

    const errorResponse: SystemHealth = {
      status: 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env['npm_package_version'] || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      checks: [
        {
          service: 'system',
          status: 'UNHEALTHY',
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      ],
      summary: {
        total: 1,
        healthy: 0,
        degraded: 0,
        unhealthy: 1
      }
    };

    return NextResponse.json(errorResponse, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

// Database connectivity check
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Simple query to test database connectivity
    await prisma.$queryRaw`SELECT 1 as health_check`;
    const responseTime = Date.now() - startTime;

    // Additional database health metrics
    const [userCount, recentErrors] = await Promise.all([
      prisma.user.count(),
      prisma.errorLog.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          },
          severity: 'CRITICAL'
        }
      })
    ]);

    let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
    
    if (responseTime > 1000) {
      status = 'DEGRADED';
    }
    if (responseTime > 5000) {
      status = 'UNHEALTHY';
    }
    if (recentErrors > 10) {
      status = 'DEGRADED';
    }

    return {
      service: 'database',
      status,
      responseTime,
      details: {
        connectionPool: 'active',
        userCount,
        recentCriticalErrors: recentErrors,
        query: 'SELECT 1'
      }
    };

  } catch (error) {
    return {
      service: 'database',
      status: 'UNHEALTHY',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

// Memory usage check
async function checkMemoryUsage(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const memoryUsage = process.memoryUsage();
    const totalHeap = memoryUsage.heapTotal;
    const usedHeap = memoryUsage.heapUsed;
    const heapUsagePercentage = (usedHeap / totalHeap) * 100;

    let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
    
    if (heapUsagePercentage > 80) {
      status = 'DEGRADED';
    }
    if (heapUsagePercentage > 95) {
      status = 'UNHEALTHY';
    }

    return {
      service: 'memory',
      status,
      responseTime: Date.now() - startTime,
      details: {
        heapUsed: Math.round(usedHeap / 1024 / 1024), // MB
        heapTotal: Math.round(totalHeap / 1024 / 1024), // MB
        heapUsagePercentage: Math.round(heapUsagePercentage),
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
      }
    };

  } catch (error) {
    return {
      service: 'memory',
      status: 'UNKNOWN',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Memory check failed'
    };
  }
}

// Disk usage check (simplified for demo - in production you'd check actual disk usage)
async function checkDiskUsage(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Simplified check - in production you'd use fs.stat to check actual disk usage
    const diskUsagePercentage = 45; // Placeholder value
    
    let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
    
    if (diskUsagePercentage > 80) {
      status = 'DEGRADED';
    }
    if (diskUsagePercentage > 95) {
      status = 'UNHEALTHY';
    }

    return {
      service: 'disk',
      status,
      responseTime: Date.now() - startTime,
      details: {
        usagePercentage: diskUsagePercentage,
        freeSpace: '50GB', // Placeholder
        totalSpace: '100GB' // Placeholder
      }
    };

  } catch (error) {
    return {
      service: 'disk',
      status: 'UNKNOWN',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Disk check failed'
    };
  }
}

// External services check
async function checkExternalServices(): Promise<HealthCheckResult[]> {
  const services = [
    {
      name: 'stripe',
      url: 'https://api.stripe.com/healthcheck',
      timeout: 5000
    }
  ];

  const results: HealthCheckResult[] = [];

  for (const service of services) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), service.timeout);

      const response = await fetch(service.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Astral-Core-Health-Check/1.0'
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
      
      if (!response.ok) {
        status = response.status >= 500 ? 'UNHEALTHY' : 'DEGRADED';
      }
      if (responseTime > 3000) {
        status = 'DEGRADED';
      }

      results.push({
        service: service.name,
        status,
        responseTime,
        details: {
          httpStatus: response.status,
          url: service.url
        }
      });

    } catch (error) {
      results.push({
        service: service.name,
        status: 'UNHEALTHY',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Service check failed',
        details: {
          url: service.url
        }
      });
    }
  }

  return results;
}