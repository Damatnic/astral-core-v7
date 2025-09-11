/**
 * Prisma Performance Monitoring Middleware
 * Tracks database query performance and integrates with monitoring system
 */

import { getDatabaseMonitor } from './db-monitoring';
import { logWarning, logError } from '@/lib/logger';

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

export function createPerformanceMiddleware() {
  return async (params: unknown, next: (params: unknown) => Promise<unknown>) => {
    const start = performance.now();
    const monitor = getDatabaseMonitor();

    // Extract operation and model info
    const paramsObj = params as Record<string, unknown>;
    const operation = (paramsObj['action'] as string)?.toUpperCase() || 'unknown';
    const model = (paramsObj['model'] as string) || 'unknown';
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
      const queryMetric: Record<string, unknown> = {
        query,
        operation: operation as
          | 'SELECT'
          | 'INSERT'
          | 'UPDATE'
          | 'DELETE'
          | 'UPSERT'
          | 'CREATE'
          | 'DROP',
        duration,
        rows,
        table: model,
        success: true,
        timestamp: Date.now()
      };

      if (currentContext.userId) queryMetric['userId'] = currentContext.userId;
      if (currentContext.endpoint) queryMetric['endpoint'] = currentContext.endpoint;

      monitor.trackQuery(queryMetric);

      // Log slow queries in development
      if (process.env.NODE_ENV === 'development' && duration > 1000) {
        logWarning(`🐌 Slow query detected (${duration.toFixed(2)}ms)`, 'PrismaMiddleware', {
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
      const errorMetric: Record<string, unknown> = {
        query,
        operation: operation as
          | 'SELECT'
          | 'INSERT'
          | 'UPDATE'
          | 'DELETE'
          | 'UPSERT'
          | 'CREATE'
          | 'DROP',
        duration,
        rows: 0,
        table: model,
        success: false,
        errorMessage,
        timestamp: Date.now()
      };

      if (currentContext.userId) errorMetric['userId'] = currentContext.userId;
      if (currentContext.endpoint) errorMetric['endpoint'] = currentContext.endpoint;

      monitor.trackQuery(errorMetric);

      // Log database errors
      if (process.env.NODE_ENV === 'development') {
        logError(`❌ Database error (${duration.toFixed(2)}ms)`, new Error(errorMessage), 'PrismaMiddleware', {
          operation,
          model,
          duration: `${duration.toFixed(2)}ms`
        });
      }

      throw error;
    }
  };
}

function generateQueryString(params: unknown): string {
  const paramsObj = params as Record<string, unknown>;
  const action = String(paramsObj['action'] || 'unknown');
  const model = String(paramsObj['model'] || 'unknown');

  return `${action.toUpperCase()} ${model}`;
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
export function extractQueryContextFromRequest(req: {
  headers?: Record<string, string>;
  url?: string;
  [key: string]: unknown;
}): QueryContext {
  const context: QueryContext = {};

  // Simplified to avoid complex type issues
  if (req.url) {
    const endpoint = req.url.split('?')[0]; // Remove query params
    if (endpoint) context.endpoint = endpoint;
  }

  return context;
}

// Performance analysis helpers
export function analyzeQueryPerformance(queries: Record<string, unknown>[]) {
  if (queries.length === 0) return null;

  // Simple analysis with proper type handling
  const queryCount = queries.length;
  const durations = queries.map(q => Number(q['duration']) || 0).filter(d => d > 0);
  const totalDuration = durations.reduce((sum, d) => sum + d, 0);
  const averageDuration = durations.length > 0 ? totalDuration / durations.length : 0;
  const slowQueryCount = durations.filter(d => d > 1000).length;
  const errorCount = queries.filter(q => q['success'] === false).length;
  const errorRate = queryCount > 0 ? errorCount / queryCount : 0;

  return {
    totalQueries: queryCount,
    totalDuration,
    averageDuration,
    errorRate,
    slowQueryCount,
    fastestQuery: durations.length > 0 ? Math.min(...durations) : 0,
    slowestQuery: durations.length > 0 ? Math.max(...durations) : 0
  };
}
