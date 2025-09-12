/**
 * Database Query Performance Monitoring
 * Tracks and analyzes database query performance with insights
 */

'use client';

import { logWarning, logError, logDebug } from '../logger';

export interface QueryMetric {
  id: string;
  query: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT' | 'CREATE' | 'DROP';
  duration: number;
  timestamp: number;
  rows: number;
  table?: string;
  userId?: string;
  endpoint?: string;
  success: boolean;
  errorMessage?: string;
  executionPlan?: Record<string, unknown>;
  cacheHit?: boolean;
}

export interface QueryPattern {
  pattern: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  slowestDuration: number;
  operation: string;
  table?: string;
  firstOccurrence: number;
  lastOccurrence: number;
}

export interface DatabaseInsight {
  type: 'slow-query' | 'frequent-query' | 'n-plus-one' | 'full-table-scan' | 'cache-miss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
  queries: QueryMetric[];
  impact: number; // 0-100 score
}

export interface DatabaseStats {
  totalQueries: number;
  averageDuration: number;
  slowestQueries: QueryMetric[];
  queryDistribution: {
    SELECT: number;
    INSERT: number;
    UPDATE: number;
    DELETE: number;
    UPSERT: number;
    CREATE: number;
    DROP: number;
  };
  tableStats: Map<
    string,
    {
      queries: number;
      totalDuration: number;
      averageDuration: number;
    }
  >;
  performanceTrends: {
    timeframe: string;
    averageDuration: number;
    queryCount: number;
  }[];
  cacheHitRate: number;
}

class DatabaseMonitor {
  private queries: QueryMetric[] = [];
  private patterns: Map<string, QueryPattern> = new Map();
  private subscribers: ((metric: QueryMetric) => void)[] = [];
  private alertThresholds = {
    slowQueryMs: 1000,
    frequentQueryCount: 100,
    cacheHitRateThreshold: 0.8
  };

  constructor() {
    this.setupPeriodicAnalysis();
  }

  private setupPeriodicAnalysis() {
    // Run analysis every 5 minutes
    if (typeof window !== 'undefined') {
      setInterval(
        () => {
          this.analyzePerformance();
        },
        5 * 60 * 1000
      );
    }
  }

  private generateQueryId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\$\d+/g, '$?') // Replace parameter placeholders
      .replace(/IN\s*\([^)]+\)/gi, 'IN (?)') // Replace IN clauses
      .replace(/VALUES\s*\([^)]+\)/gi, 'VALUES (?)') // Replace VALUES clauses
      .replace(/['"][^'"]*['"]/g, '?') // Replace string literals
      .replace(/\b\d+\b/g, '?') // Replace numeric literals
      .trim()
      .toLowerCase();
  }

  private extractOperation(query: string): QueryMetric['operation'] {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.startsWith('select')) return 'SELECT';
    if (normalizedQuery.startsWith('insert')) return 'INSERT';
    if (normalizedQuery.startsWith('update')) return 'UPDATE';
    if (normalizedQuery.startsWith('delete')) return 'DELETE';
    if (normalizedQuery.startsWith('upsert')) return 'UPSERT';
    if (normalizedQuery.startsWith('create')) return 'CREATE';
    if (normalizedQuery.startsWith('drop')) return 'DROP';

    return 'SELECT'; // Default fallback
  }

  private extractTable(query: string): string | undefined {
    const normalizedQuery = query.trim().toLowerCase();

    // Extract table name for different operations
    const patterns = [
      /from\s+([`"]?)(\w+)\1/i, // SELECT ... FROM table
      /into\s+([`"]?)(\w+)\1/i, // INSERT INTO table
      /update\s+([`"]?)(\w+)\1/i, // UPDATE table
      /delete\s+from\s+([`"]?)(\w+)\1/i, // DELETE FROM table
      /table\s+([`"]?)(\w+)\1/i // CREATE/DROP TABLE table
    ];

    for (const pattern of patterns) {
      const match = normalizedQuery.match(pattern);
      if (match) {
        return match[2];
      }
    }

    return undefined;
  }

  private updateQueryPatterns(metric: QueryMetric) {
    const normalizedQuery = this.normalizeQuery(metric.query);
    const pattern = `${metric.operation}:${normalizedQuery}`;

    if (this.patterns.has(pattern)) {
      const existing = this.patterns.get(pattern)!;
      existing.count++;
      existing.totalDuration += metric.duration;
      existing.averageDuration = existing.totalDuration / existing.count;
      existing.slowestDuration = Math.max(existing.slowestDuration, metric.duration);
      existing.lastOccurrence = metric.timestamp;
    } else {
      this.patterns.set(pattern, {
        pattern: normalizedQuery,
        count: 1,
        totalDuration: metric.duration,
        averageDuration: metric.duration,
        slowestDuration: metric.duration,
        operation: metric.operation,
        table: metric.table || 'unknown',
        firstOccurrence: metric.timestamp,
        lastOccurrence: metric.timestamp
      });
    }
  }

  private analyzePerformance() {
    const insights = this.generateInsights();

    if (process.env.NODE_ENV === 'development' && insights.length > 0) {
      console.group('Database Performance Insights');
      insights.forEach(insight => {
        logWarning(`${insight.type}: ${insight.message}`, 'DatabaseMonitor', { recommendation: insight.recommendation });
      });
      console.groupEnd();
    }
  }

  public trackQuery(queryData: Partial<QueryMetric>): QueryMetric {
    const metric: QueryMetric = {
      id: this.generateQueryId(),
      query: queryData.query || '',
      operation: queryData.operation || this.extractOperation(queryData.query || ''),
      duration: queryData.duration || 0,
      timestamp: queryData.timestamp || Date.now(),
      rows: queryData.rows || 0,
      success: queryData.success !== undefined ? queryData.success : true,
      ...(queryData.table
        ? { table: queryData.table }
        : this.extractTable(queryData.query || '')
          ? { table: this.extractTable(queryData.query || '')! }
          : {}),
      ...(queryData.userId && { userId: queryData.userId }),
      ...(queryData.endpoint && { endpoint: queryData.endpoint }),
      ...(queryData.errorMessage && { errorMessage: queryData.errorMessage }),
      ...(queryData.executionPlan && { executionPlan: queryData.executionPlan }),
      ...(queryData.cacheHit !== undefined && { cacheHit: queryData.cacheHit })
    };

    this.queries.push(metric);
    this.updateQueryPatterns(metric);
    this.notifySubscribers(metric);

    // Keep only last 5000 queries
    if (this.queries.length > 5000) {
      this.queries = this.queries.slice(-2500);
    }

    // Log slow queries in development
    if (
      process.env.NODE_ENV === 'development' &&
      metric.duration > this.alertThresholds.slowQueryMs
    ) {
      logWarning(`Slow query detected (${metric.duration}ms)`, 'DatabaseMonitor', { query: metric.query });
    }

    return metric;
  }

  private notifySubscribers(metric: QueryMetric) {
    this.subscribers.forEach(callback => {
      try {
        callback(metric);
      } catch (e) {
        logError('Error in database monitor subscriber', e, 'DatabaseMonitor');
      }
    });
  }

  public getQueries(): QueryMetric[] {
    return [...this.queries];
  }

  public getRecentQueries(count = 100): QueryMetric[] {
    return this.queries.slice(-count);
  }

  public getSlowQueries(thresholdMs = 1000): QueryMetric[] {
    return this.queries.filter(q => q.duration >= thresholdMs);
  }

  public getQueryPatterns(): QueryPattern[] {
    return Array.from(this.patterns.values()).sort((a, b) => b.averageDuration - a.averageDuration);
  }

  public getStats(): DatabaseStats {
    if (this.queries.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowestQueries: [],
        queryDistribution: {
          SELECT: 0,
          INSERT: 0,
          UPDATE: 0,
          DELETE: 0,
          UPSERT: 0,
          CREATE: 0,
          DROP: 0
        },
        tableStats: new Map(),
        performanceTrends: [],
        cacheHitRate: 0
      };
    }

    const totalDuration = this.queries.reduce((sum, q) => sum + q.duration, 0);
    const averageDuration = totalDuration / this.queries.length;

    const slowestQueries = [...this.queries].sort((a, b) => b.duration - a.duration).slice(0, 10);

    const queryDistribution = {
      SELECT: 0,
      INSERT: 0,
      UPDATE: 0,
      DELETE: 0,
      UPSERT: 0,
      CREATE: 0,
      DROP: 0
    };

    this.queries.forEach(query => {
      queryDistribution[query.operation]++;
    });

    const tableStats = new Map<
      string,
      { queries: number; totalDuration: number; averageDuration: number }
    >();

    this.queries.forEach(query => {
      if (query.table) {
        const existing = tableStats.get(query.table) || {
          queries: 0,
          totalDuration: 0,
          averageDuration: 0
        };
        existing.queries++;
        existing.totalDuration += query.duration;
        existing.averageDuration = existing.totalDuration / existing.queries;
        tableStats.set(query.table, existing);
      }
    });

    // Performance trends over time (last 24 hours in 1-hour buckets)
    const now = Date.now();
    const performanceTrends = [];

    for (let i = 23; i >= 0; i--) {
      const bucketStart = now - (i + 1) * 60 * 60 * 1000;
      const bucketEnd = now - i * 60 * 60 * 1000;

      const bucketQueries = this.queries.filter(
        q => q.timestamp >= bucketStart && q.timestamp < bucketEnd
      );

      if (bucketQueries.length > 0) {
        const bucketAvgDuration =
          bucketQueries.reduce((sum, q) => sum + q.duration, 0) / bucketQueries.length;
        performanceTrends.push({
          timeframe: new Date(bucketStart).toISOString().substring(11, 16),
          averageDuration: Math.round(bucketAvgDuration * 100) / 100,
          queryCount: bucketQueries.length
        });
      }
    }

    // Cache hit rate
    const queriesWithCacheInfo = this.queries.filter(q => q.cacheHit !== undefined);
    const cacheHits = queriesWithCacheInfo.filter(q => q.cacheHit).length;
    const cacheHitRate =
      queriesWithCacheInfo.length > 0 ? cacheHits / queriesWithCacheInfo.length : 0;

    return {
      totalQueries: this.queries.length,
      averageDuration,
      slowestQueries,
      queryDistribution,
      tableStats,
      performanceTrends,
      cacheHitRate
    };
  }

  public generateInsights(): DatabaseInsight[] {
    const insights: DatabaseInsight[] = [];
    const stats = this.getStats();
    const patterns = this.getQueryPatterns();

    // Slow query detection
    const slowQueries = this.getSlowQueries(this.alertThresholds.slowQueryMs);
    if (slowQueries.length > 0) {
      insights.push({
        type: 'slow-query',
        severity: slowQueries.length > 10 ? 'critical' : slowQueries.length > 5 ? 'high' : 'medium',
        message: `Found ${slowQueries.length} slow queries (>${this.alertThresholds.slowQueryMs}ms)`,
        recommendation:
          'Consider adding indexes, optimizing WHERE clauses, or restructuring queries',
        queries: slowQueries.slice(0, 5),
        impact: Math.min(100, slowQueries.length * 10)
      });
    }

    // Frequent query detection
    const frequentQueries = patterns.filter(
      p => p.count >= this.alertThresholds.frequentQueryCount
    );
    if (frequentQueries.length > 0) {
      insights.push({
        type: 'frequent-query',
        severity: 'medium',
        message: `Found ${frequentQueries.length} frequently executed query patterns`,
        recommendation:
          'Consider caching results or optimizing these queries as they run frequently',
        queries: this.queries
          .filter(q => frequentQueries.some(fq => this.normalizeQuery(q.query) === fq.pattern))
          .slice(0, 5),
        impact: Math.min(100, frequentQueries.reduce((sum, fq) => sum + fq.count, 0) / 10)
      });
    }

    // N+1 query detection (simplified heuristic)
    const recentQueries = this.getRecentQueries(200);
    const groupedByEndpoint = recentQueries.reduce(
      (acc, query) => {
        if (query.endpoint) {
          if (!acc[query.endpoint]) {
            acc[query.endpoint] = [];
          }
          acc[query.endpoint]!.push(query);
        }
        return acc;
      },
      {} as Record<string, QueryMetric[]>
    );

    Object.entries(groupedByEndpoint).forEach(([endpoint, queries]) => {
      if (queries.length > 20) {
        const selectQueries = queries.filter(q => q.operation === 'SELECT');
        const uniquePatterns = new Set(selectQueries.map(q => this.normalizeQuery(q.query)));

        if (uniquePatterns.size === 1 && selectQueries.length > 10) {
          insights.push({
            type: 'n-plus-one',
            severity: 'high',
            message: `Potential N+1 query pattern detected on ${endpoint} (${selectQueries.length} similar queries)`,
            recommendation:
              'Consider using JOIN queries or eager loading to reduce the number of database round trips',
            queries: selectQueries.slice(0, 5),
            impact: Math.min(100, selectQueries.length * 2)
          });
        }
      }
    });

    // Cache hit rate analysis
    if (stats.cacheHitRate < this.alertThresholds.cacheHitRateThreshold && stats.cacheHitRate > 0) {
      insights.push({
        type: 'cache-miss',
        severity: stats.cacheHitRate < 0.5 ? 'high' : 'medium',
        message: `Low cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`,
        recommendation:
          'Review caching strategy and consider caching more frequently accessed data',
        queries: this.queries.filter(q => q.cacheHit === false).slice(0, 5),
        impact: Math.round((1 - stats.cacheHitRate) * 100)
      });
    }

    return insights.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  public subscribe(callback: (metric: QueryMetric) => void): () => void {
    this.subscribers.push(callback);

    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  public setAlertThresholds(thresholds: Partial<typeof this.alertThresholds>) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  public clearQueries() {
    this.queries = [];
    this.patterns.clear();
  }

  public exportData(): {
    queries: QueryMetric[];
    patterns: QueryPattern[];
    stats: DatabaseStats;
    insights: DatabaseInsight[];
    timestamp: number;
  } {
    return {
      queries: this.getQueries(),
      patterns: this.getQueryPatterns(),
      stats: this.getStats(),
      insights: this.generateInsights(),
      timestamp: Date.now()
    };
  }
}

// Singleton instance
let databaseMonitor: DatabaseMonitor | null = null;

export function getDatabaseMonitor(): DatabaseMonitor {
  if (!databaseMonitor) {
    databaseMonitor = new DatabaseMonitor();
  }
  return databaseMonitor;
}

// React hook
export function useDatabaseMonitoring() {
  const monitor = getDatabaseMonitor();

  return {
    trackQuery: monitor.trackQuery.bind(monitor),
    queries: monitor.getQueries(),
    recentQueries: monitor.getRecentQueries(),
    slowQueries: monitor.getSlowQueries(),
    patterns: monitor.getQueryPatterns(),
    stats: monitor.getStats(),
    insights: monitor.generateInsights(),
    subscribe: monitor.subscribe.bind(monitor),
    exportData: monitor.exportData.bind(monitor)
  };
}

// Utility functions for Prisma integration
export function createPrismaMiddleware() {
  return async (
    params: { model?: string; action: string; args: unknown },
    next: (params: unknown) => Promise<unknown>
  ) => {
    const start = performance.now();
    const monitor = getDatabaseMonitor();

    try {
      const result = await next(params);
      const duration = performance.now() - start;

      monitor.trackQuery({
        query: `${params.action} on ${params.model}`,
        operation: params.action.toUpperCase() as
          | 'SELECT'
          | 'INSERT'
          | 'UPDATE'
          | 'DELETE'
          | 'UPSERT'
          | 'CREATE'
          | 'DROP',
        duration,
        rows: Array.isArray(result) ? result.length : result ? 1 : 0,
        ...(params.model && { table: params.model }),
        success: true
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;

      monitor.trackQuery({
        query: `${params.action} on ${params.model}`,
        operation: params.action.toUpperCase() as
          | 'SELECT'
          | 'INSERT'
          | 'UPDATE'
          | 'DELETE'
          | 'UPSERT'
          | 'CREATE'
          | 'DROP',
        duration,
        rows: 0,
        ...(params.model && { table: params.model }),
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  };
}

// Development helper
export function logDatabaseReport() {
  if (process.env.NODE_ENV === 'development') {
    const monitor = getDatabaseMonitor();
    const data = monitor.exportData();

    console.group('Database Performance Report');
    logDebug('Database Performance Report', 'DatabaseMonitor', {
      totalQueries: data.stats.totalQueries,
      averageDuration: `${data.stats.averageDuration.toFixed(2)}ms`,
      cacheHitRate: `${(data.stats.cacheHitRate * 100).toFixed(1)}%`,
      slowestQueries: data.stats.slowestQueries.slice(0, 3),
      insights: data.insights
    });
    console.groupEnd();
  }
}
