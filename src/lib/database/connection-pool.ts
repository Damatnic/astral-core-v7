/**
 * Database Connection Pool Optimization
 * Manages Prisma client connections for optimal performance
 */

import { PrismaClient } from '@prisma/client';

// Global variable to store Prisma client instance
declare global {
  var __prisma__: PrismaClient | undefined;
}

// Connection pool configuration
const POOL_CONFIG = {
  // Maximum number of database connections
  datasourceUrl: process.env.DATABASE_URL,
  
  // Connection pool settings (these go in DATABASE_URL params)
  connectionLimit: process.env.NODE_ENV === 'production' ? 10 : 5,
  poolTimeout: 60, // seconds
  transactionOptions: {
    maxWait: 5000, // 5 seconds
    timeout: 10000, // 10 seconds
  },
  
  // Query optimization
  queryEngineType: 'binary' as const,
  
  // Logging configuration
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] as const
    : ['error'] as const
};

// Enhanced Prisma client with connection pooling
class EnhancedPrismaClient extends PrismaClient {
  private static instance: EnhancedPrismaClient;
  private connectionCount = 0;
  private queryCount = 0;
  private slowQueryThreshold = 1000; // ms

  constructor() {
    super({
      datasourceUrl: POOL_CONFIG.datasourceUrl,
      log: POOL_CONFIG.log,
      transactionOptions: POOL_CONFIG.transactionOptions,
    });

    // Add query performance monitoring
    this.$use(async (params, next) => {
      const start = Date.now();
      this.queryCount++;
      
      try {
        const result = await next(params);
        const duration = Date.now() - start;
        
        // Log slow queries
        if (duration > this.slowQueryThreshold) {
          console.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`, {
            model: params.model,
            action: params.action,
            duration,
            args: params.args
          });
        }
        
        // Track performance metrics
        if (typeof window === 'undefined' && duration > 100) {
          // Server-side performance tracking
          this.trackQueryPerformance(params, duration);
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        console.error(`Query failed: ${params.model}.${params.action} after ${duration}ms`, error);
        throw error;
      }
    });

    // Connection event handlers
    this.$on('beforeExit', () => {
      console.info('Prisma client disconnecting...');
    });
  }

  static getInstance(): EnhancedPrismaClient {
    if (!EnhancedPrismaClient.instance) {
      EnhancedPrismaClient.instance = new EnhancedPrismaClient();
    }
    return EnhancedPrismaClient.instance;
  }

  private trackQueryPerformance(params: any, duration: number) {
    // This could be enhanced to send metrics to monitoring system
    const metric = {
      operation: `${params.model}.${params.action}`,
      duration,
      timestamp: new Date(),
      table: params.model
    };

    // In production, this could send to a monitoring service
    if (process.env.NODE_ENV === 'development') {
      console.debug('Query performance:', metric);
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number; details?: string }> {
    const start = Date.now();
    
    try {
      await this.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      
      return {
        status: responseTime < 1000 ? 'healthy' : 'unhealthy',
        responseTime,
        details: responseTime > 1000 ? 'Slow database response' : undefined
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  // Get connection statistics
  getStats() {
    return {
      connectionCount: this.connectionCount,
      queryCount: this.queryCount,
      slowQueryThreshold: this.slowQueryThreshold
    };
  }

  // Optimized batch operations
  async batchCreate<T>(model: any, data: T[], batchSize: number = 100): Promise<void> {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await model.createMany({
        data: batch,
        skipDuplicates: true
      });
    }
  }

  // Connection cleanup
  async cleanup() {
    try {
      await this.$disconnect();
      console.info('Database connections closed successfully');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
  }
}

// Singleton pattern for Prisma client
function createPrismaClient(): EnhancedPrismaClient {
  if (process.env.NODE_ENV === 'production') {
    // In production, use a single instance
    return EnhancedPrismaClient.getInstance();
  } else {
    // In development, use global variable to avoid creating multiple instances during hot reloads
    if (!global.__prisma__) {
      global.__prisma__ = EnhancedPrismaClient.getInstance();
    }
    return global.__prisma__;
  }
}

// Export the optimized Prisma client
export const prisma = createPrismaClient();

// Connection pool utilities
export const connectionPool = {
  // Get health status
  async getHealth() {
    return await prisma.healthCheck();
  },

  // Get connection statistics
  getStats() {
    return prisma.getStats();
  },

  // Batch operations
  async batchCreate<T>(model: any, data: T[], batchSize?: number) {
    return await prisma.batchCreate(model, data, batchSize);
  },

  // Manual cleanup (useful for tests or graceful shutdown)
  async cleanup() {
    return await prisma.cleanup();
  }
};

// Query optimization helpers
export const queryOptimizer = {
  // Find queries with proper indexing hints
  async optimizedFind(model: any, where: any, options: any = {}) {
    const defaultOptions = {
      // Use cursor-based pagination for better performance
      take: options.take || 50,
      orderBy: options.orderBy || { createdAt: 'desc' },
      // Include only necessary fields
      select: options.select,
    };

    return await model.findMany({
      where,
      ...defaultOptions,
      ...options
    });
  },

  // Optimized user queries with proper includes
  async findUserWithRelations(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        },
        // Only load recent notifications
        notifications: {
          where: { isRead: false },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
  },

  // Optimized performance metrics query
  async getRecentPerformanceMetrics(limit: number = 100, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await prisma.performanceMetric.findMany({
      where: {
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        url: true,
        vitals: true,
        timestamp: true,
        userId: true
      }
    });
  }
};

// Process cleanup on shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await connectionPool.cleanup();
  });

  process.on('SIGINT', async () => {
    await connectionPool.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await connectionPool.cleanup();
    process.exit(0);
  });
}

export default prisma;