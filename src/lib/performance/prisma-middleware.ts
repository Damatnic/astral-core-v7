/**
 * Prisma Performance Monitoring Middleware
 * Tracks database query performance and integrates with monitoring system
 */

import { Prisma } from '@prisma/client';
import { getDatabaseMonitor } from './db-monitoring';

interface QueryContext {
  userId?: string;
  endpoint?: string;
  sessionId?: string;
}

// Store context for the current request
let currentContext: QueryContext = {};

export function setQueryContext(context: QueryContext) {
  currentContext = { ...context };
}

export function clearQueryContext() {
  currentContext = {};
}

export function createPerformanceMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const start = performance.now();
    const monitor = getDatabaseMonitor();
    
    // Extract operation and model info
    const operation = params.action.toUpperCase();
    const model = params.model || 'unknown';
    const query = generateQueryString(params);

    try {
      const result = await next(params);
      const duration = performance.now() - start;
      
      // Determine number of rows affected
      let rows = 0;
      if (Array.isArray(result)) {
        rows = result.length;
      } else if (result && typeof result === 'object') {
        if ('count' in result && typeof result.count === 'number') {
          rows = result.count;
        } else {
          rows = 1;
        }
      }

      // Track successful query
      monitor.trackQuery({
        query,
        operation: operation as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT' | 'CREATE' | 'DROP',
        duration,
        rows,
        table: model,
        userId: currentContext.userId,
        endpoint: currentContext.endpoint,
        success: true,
        timestamp: Date.now()
      });

      // Log slow queries in development
      if (process.env.NODE_ENV === 'development' && duration > 1000) {
        console.warn(`🐌 Slow query detected (${duration.toFixed(2)}ms):`, {
          operation,
          model,
          query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
          duration: `${duration.toFixed(2)}ms`,
          rows
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Track failed query
      monitor.trackQuery({
        query,
        operation: operation as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT' | 'CREATE' | 'DROP',
        duration,
        rows: 0,
        table: model,
        userId: currentContext.userId,
        endpoint: currentContext.endpoint,
        success: false,
        errorMessage,
        timestamp: Date.now()
      });

      // Log database errors
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ Database error (${duration.toFixed(2)}ms):`, {
          operation,
          model,
          error: errorMessage,
          duration: `${duration.toFixed(2)}ms`
        });
      }

      throw error;
    }
  };
}

function generateQueryString(params: Prisma.MiddlewareParams): string {
  const { action, model, args } = params;
  
  // Generate a representative query string
  let queryStr = `${action.toUpperCase()}`;
  
  if (model) {
    queryStr += ` ${model}`;
  }

  // Add basic info about the operation
  if (args) {
    if (action === 'findMany' || action === 'findFirst') {
      if (args.where) {
        const whereKeys = Object.keys(args.where);
        if (whereKeys.length > 0) {
          queryStr += ` WHERE ${whereKeys.join(', ')}`;
        }
      }
      
      if (args.orderBy) {
        queryStr += ` ORDER BY ${JSON.stringify(args.orderBy)}`;
      }
      
      if (args.take) {
        queryStr += ` LIMIT ${args.take}`;
      }
      
      if (args.skip) {
        queryStr += ` OFFSET ${args.skip}`;
      }
    } else if (action === 'create') {
      if (args.data) {
        const dataKeys = Object.keys(args.data);
        queryStr += ` (${dataKeys.join(', ')})`;
      }
    } else if (action === 'update' || action === 'updateMany') {
      if (args.where) {
        const whereKeys = Object.keys(args.where);
        queryStr += ` WHERE ${whereKeys.join(', ')}`;
      }
      if (args.data) {
        const dataKeys = Object.keys(args.data);
        queryStr += ` SET ${dataKeys.join(', ')}`;
      }
    } else if (action === 'delete' || action === 'deleteMany') {
      if (args.where) {
        const whereKeys = Object.keys(args.where);
        queryStr += ` WHERE ${whereKeys.join(', ')}`;
      }
    }
  }

  return queryStr;
}

// Helper for Next.js API routes to set context
export function withQueryContext<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: QueryContext
) {
  return async (...args: T): Promise<R> => {
    setQueryContext(context);
    try {
      const result = await fn(...args);
      return result;
    } finally {
      clearQueryContext();
    }
  };
}

// Express/Next.js middleware to extract context from request
export function extractQueryContextFromRequest(req: { headers?: Record<string, string>; url?: string; [key: string]: unknown }): QueryContext {
  const context: QueryContext = {};
  
  // Extract user ID from various sources
  if (req.user?.id) {
    context.userId = req.user.id;
  } else if (req.session?.user?.id) {
    context.userId = req.session.user.id;
  } else if (req.auth?.userId) {
    context.userId = req.auth.userId;
  }
  
  // Extract endpoint from URL
  if (req.url) {
    context.endpoint = req.url.split('?')[0]; // Remove query params
  } else if (req.originalUrl) {
    context.endpoint = req.originalUrl.split('?')[0];
  }
  
  // Extract or generate session ID
  if (req.sessionID) {
    context.sessionId = req.sessionID;
  } else if (req.headers['x-session-id']) {
    context.sessionId = req.headers['x-session-id'];
  }
  
  return context;
}

// Performance analysis helpers
export function analyzeQueryPerformance(queries: Record<string, unknown>[]) {
  if (queries.length === 0) return null;

  const totalDuration = queries.reduce((sum, q) => sum + q.duration, 0);
  const averageDuration = totalDuration / queries.length;
  const slowQueries = queries.filter(q => q.duration > 1000);
  const errorRate = queries.filter(q => !q.success).length / queries.length;
  
  // Group by operation
  const operationStats = queries.reduce((acc, query) => {
    if (!acc[query.operation]) {
      acc[query.operation] = { count: 0, totalDuration: 0 };
    }
    acc[query.operation].count++;
    acc[query.operation].totalDuration += query.duration;
    return acc;
  }, {} as Record<string, { count: number; totalDuration: number }>);

  // Group by table
  const tableStats = queries.reduce((acc, query) => {
    const table = query.table || 'unknown';
    if (!acc[table]) {
      acc[table] = { count: 0, totalDuration: 0, operations: new Set() };
    }
    acc[table].count++;
    acc[table].totalDuration += query.duration;
    acc[table].operations.add(query.operation);
    return acc;
  }, {} as Record<string, { count: number; totalDuration: number; operations: Set<string> }>);

  // Identify potential N+1 patterns
  const potentialNPlusOne = [];
  const queryPatterns = queries.reduce((acc, query) => {
    const pattern = `${query.operation}:${query.table}`;
    if (!acc[pattern]) {
      acc[pattern] = { count: 0, queries: [] };
    }
    acc[pattern].count++;
    acc[pattern].queries.push(query);
    return acc;
  }, {} as Record<string, { count: number; queries: Record<string, unknown>[] }>);

  Object.entries(queryPatterns).forEach(([pattern, data]) => {
    if (data.count > 10 && data.queries[0].operation === 'SELECT') {
      // Check if queries are happening in quick succession
      const sortedQueries = data.queries.sort((a, b) => a.timestamp - b.timestamp);
      const timeSpan = sortedQueries[sortedQueries.length - 1].timestamp - sortedQueries[0].timestamp;
      
      if (timeSpan < 5000) { // Within 5 seconds
        potentialNPlusOne.push({
          pattern,
          count: data.count,
          timeSpan,
          averageDuration: data.queries.reduce((sum, q) => sum + q.duration, 0) / data.count
        });
      }
    }
  });

  return {
    summary: {
      totalQueries: queries.length,
      totalDuration,
      averageDuration,
      slowQueryCount: slowQueries.length,
      errorRate: errorRate * 100,
      fastestQuery: Math.min(...queries.map(q => q.duration)),
      slowestQuery: Math.max(...queries.map(q => q.duration))
    },
    operationStats: Object.entries(operationStats).map(([op, stats]) => ({
      operation: op,
      count: stats.count,
      averageDuration: stats.totalDuration / stats.count,
      percentage: (stats.count / queries.length) * 100
    })).sort((a, b) => b.count - a.count),
    tableStats: Object.entries(tableStats).map(([table, stats]) => ({
      table,
      count: stats.count,
      averageDuration: stats.totalDuration / stats.count,
      operations: Array.from(stats.operations)
    })).sort((a, b) => b.averageDuration - a.averageDuration),
    slowQueries: slowQueries.sort((a, b) => b.duration - a.duration).slice(0, 10),
    potentialNPlusOne,
    recommendations: generateRecommendations({
      averageDuration,
      slowQueryCount: slowQueries.length,
      errorRate,
      potentialNPlusOne: potentialNPlusOne.length
    })
  };
}

function generateRecommendations(stats: {
  averageDuration: number;
  slowQueryCount: number;
  errorRate: number;
  potentialNPlusOne: number;
}) {
  const recommendations = [];

  if (stats.averageDuration > 500) {
    recommendations.push({
      priority: 'high',
      message: `Average query duration is ${stats.averageDuration.toFixed(2)}ms. Consider optimizing slow queries.`,
      action: 'Add database indexes, optimize WHERE clauses, or consider caching'
    });
  }

  if (stats.slowQueryCount > 5) {
    recommendations.push({
      priority: 'medium',
      message: `Found ${stats.slowQueryCount} slow queries (>1s). Review and optimize these queries.`,
      action: 'Analyze query execution plans and add appropriate indexes'
    });
  }

  if (stats.errorRate > 5) {
    recommendations.push({
      priority: 'high',
      message: `Database error rate is ${stats.errorRate.toFixed(1)}%. Investigation needed.`,
      action: 'Review error logs and fix database connectivity or query issues'
    });
  }

  if (stats.potentialNPlusOne > 0) {
    recommendations.push({
      priority: 'high',
      message: `Detected ${stats.potentialNPlusOne} potential N+1 query patterns.`,
      action: 'Implement eager loading or batch queries to reduce database round trips'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      message: 'Database performance looks healthy!',
      action: 'Continue monitoring for any performance degradation'
    });
  }

  return recommendations;
}