/**
 * Comprehensive Health Check API Endpoint
 * Monitors system health, database connectivity, and service availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, connectionPool } from '@/lib/database/connection-pool';
import { cache } from '@/lib/caching/cache-strategies';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    cache: HealthCheck;
    memory: HealthCheck;
    disk?: HealthCheck;
    external?: HealthCheck[];
  };
  performance: {
    responseTime: number;
    avgResponseTime?: number;
    dbQueryTime?: number;
  };
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: string;
  error?: string;
  metrics?: Record<string, any>;
}

// Cache health check results briefly to avoid overwhelming the system
const HEALTH_CHECK_CACHE_TTL = 10; // 10 seconds

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check if cached health status exists
    const cachedHealth = await cache.get<HealthStatus>('system_health');
    if (cachedHealth && Date.now() - new Date(cachedHealth.timestamp).getTime() < 30000) {
      // Return cached result if less than 30 seconds old
      return NextResponse.json(cachedHealth);
    }

    // Run health checks in parallel
    const [
      databaseHealth,
      cacheHealth,
      memoryHealth
    ] = await Promise.allSettled([
      checkDatabaseHealth(),
      checkCacheHealth(),
      checkMemoryHealth()
    ]);

    // Determine overall system status
    const checks = {
      database: getResultValue(databaseHealth, { status: 'unhealthy', responseTime: 0, error: 'Check failed' }),
      cache: getResultValue(cacheHealth, { status: 'unhealthy', responseTime: 0, error: 'Check failed' }),
      memory: getResultValue(memoryHealth, { status: 'unhealthy', responseTime: 0, error: 'Check failed' })
    };

    const overallStatus = determineOverallStatus(Object.values(checks));
    const responseTime = Date.now() - startTime;

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      performance: {
        responseTime,
        dbQueryTime: checks.database.responseTime
      }
    };

    // Cache the health status
    await cache.set('system_health', healthStatus, HEALTH_CHECK_CACHE_TTL);

    // Log health status to monitoring
    await logHealthStatus(healthStatus);

    // Return appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(healthStatus, { status: httpStatus });

  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorResponse: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: { status: 'unhealthy', responseTime: 0, error: 'Health check failed' },
        cache: { status: 'unhealthy', responseTime: 0, error: 'Health check failed' },
        memory: { status: 'unhealthy', responseTime: 0, error: 'Health check failed' }
      },
      performance: {
        responseTime: Date.now() - startTime
      }
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

// Database health check
async function checkDatabaseHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Use connection pool health check
    const healthResult = await connectionPool.getHealth();
    const responseTime = Date.now() - startTime;

    // Get additional database metrics
    const stats = connectionPool.getStats();
    
    return {
      status: healthResult.status,
      responseTime,
      details: healthResult.details,
      metrics: {
        connectionCount: stats.connectionCount,
        queryCount: stats.queryCount,
        slowQueryThreshold: stats.slowQueryThreshold
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Database check failed'
    };
  }
}

// Cache health check
async function checkCacheHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Test cache read/write
    const testKey = 'health_check_test';
    const testValue = { timestamp: Date.now() };
    
    await cache.set(testKey, testValue, 5); // 5 second TTL
    const retrieved = await cache.get(testKey);
    
    if (!retrieved || retrieved.timestamp !== testValue.timestamp) {
      throw new Error('Cache read/write test failed');
    }
    
    await cache.delete(testKey);
    
    const stats = cache.stats();
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
      metrics: {
        hitRate: stats.hitRate,
        size: stats.cacheStats.size,
        utilization: stats.cacheStats.utilization
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Cache check failed'
    };
  }
}

// Memory health check
async function checkMemoryHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const utilization = (heapUsedMB / heapTotalMB) * 100;
    
    // Determine status based on memory utilization
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (utilization < 70) {
      status = 'healthy';
    } else if (utilization < 85) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      responseTime: Date.now() - startTime,
      metrics: {
        heapUsed: Math.round(heapUsedMB),
        heapTotal: Math.round(heapTotalMB),
        utilization: Math.round(utilization),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Memory check failed'
    };
  }
}

// Helper function to extract value from settled promise
function getResultValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}

// Determine overall system status
function determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
  const unhealthyCount = checks.filter(check => check.status === 'unhealthy').length;
  const degradedCount = checks.filter(check => check.status === 'degraded').length;
  
  if (unhealthyCount > 0) {
    return 'unhealthy';
  } else if (degradedCount > 0) {
    return 'degraded';
  } else {
    return 'healthy';
  }
}

// Log health status to monitoring system
async function logHealthStatus(healthStatus: HealthStatus) {
  try {
    // Store health check result in database
    await prisma.healthCheck.create({
      data: {
        service: 'system',
        status: healthStatus.status.toUpperCase() as 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY',
        responseTime: healthStatus.performance.responseTime,
        details: JSON.stringify({
          checks: healthStatus.checks,
          performance: healthStatus.performance,
          uptime: healthStatus.uptime
        }),
        timestamp: new Date(healthStatus.timestamp)
      }
    });

    // Send to external monitoring if configured
    if (process.env.MONITORING_WEBHOOK_URL) {
      fetch(process.env.MONITORING_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'astral-core-v7',
          status: healthStatus.status,
          timestamp: healthStatus.timestamp,
          details: healthStatus
        })
      }).catch(error => {
        console.warn('Failed to send health status to monitoring webhook:', error);
      });
    }
  } catch (error) {
    console.warn('Failed to log health status:', error);
  }
}

// Additional endpoints for specific health checks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { check } = body;

    switch (check) {
      case 'database':
        const dbHealth = await checkDatabaseHealth();
        return NextResponse.json({ check: 'database', result: dbHealth });
        
      case 'cache':
        const cacheHealth = await checkCacheHealth();
        return NextResponse.json({ check: 'cache', result: cacheHealth });
        
      case 'memory':
        const memoryHealth = await checkMemoryHealth();
        return NextResponse.json({ check: 'memory', result: memoryHealth });
        
      default:
        return NextResponse.json(
          { error: 'Invalid health check type' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Health check request failed' },
      { status: 500 }
    );
  }
}