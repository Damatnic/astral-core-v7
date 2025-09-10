/**
 * Performance Monitoring System - Main Export
 * Comprehensive performance monitoring for Astral Core v7
 */

// Core monitoring systems
export {
  getPerformanceMetricsCollector,
  usePerformanceMetrics,
  logPerformanceMetrics,
  type CoreWebVitals,
  type ApiPerformanceMetric,
  type DatabaseMetric,
  type MemoryMetric,
  type PerformanceReport
} from './metrics';

export {
  getWebVitalsMonitor,
  useWebVitals,
  sendVitalsToAnalytics,
  logWebVitals,
  type WebVital,
  type WebVitalsData,
  type WebVitalsInsight
} from './web-vitals';

export {
  getErrorMonitor,
  useErrorMonitoring,
  requestNotificationPermission,
  captureCustomError,
  logErrorReport,
  type ErrorEvent,
  type ErrorPattern,
  type AlertRule
} from './error-monitoring';

export {
  getDatabaseMonitor,
  useDatabaseMonitoring,
  createPrismaMiddleware,
  logDatabaseReport,
  type QueryMetric,
  type DatabaseInsight,
  type DatabaseStats
} from './db-monitoring';

// Prisma middleware
export {
  createPerformanceMiddleware,
  setQueryContext,
  clearQueryContext,
  withQueryContext,
  extractQueryContextFromRequest,
  analyzeQueryPerformance
} from './prisma-middleware';

// Bundle analyzer (existing)
export {
  getBundleAnalyzer,
  useBundleAnalyzer,
  logPerformanceReport
} from './bundle-analyzer';

// Provider and HOCs
export {
  PerformanceProvider,
  usePerformanceContext,
  withPerformanceMonitoring,
  usePerformanceTracking,
  useComponentPerformance
} from '../providers/PerformanceProvider';

// React components
export { default as PerformanceDashboard } from '../../components/performance/PerformanceDashboard';
export { default as WebVitalsMonitor } from '../../components/performance/WebVitalsMonitor';
export { default as ErrorMonitor } from '../../components/performance/ErrorMonitor';
export { default as DatabaseMonitor } from '../../components/performance/DatabaseMonitor';

// Utility functions
export const PerformanceUtils = {
  formatDuration: (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  },

  formatBytes: (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  calculatePercentile: (values: number[], percentile: number) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  },

  getPerformanceGrade: (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  },

  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// Performance monitoring configuration
export interface PerformanceConfig {
  enableMetrics?: boolean;
  enableWebVitals?: boolean;
  enableErrorMonitoring?: boolean;
  enableDatabaseMonitoring?: boolean;
  enableAnalytics?: boolean;
  enableNotifications?: boolean;
  analyticsEndpoint?: string;
  debugMode?: boolean;
  thresholds?: {
    slowQueryMs?: number;
    slowComponentMs?: number;
    errorRateThreshold?: number;
    memoryUsageThreshold?: number;
  };
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableMetrics: true,
  enableWebVitals: true,
  enableErrorMonitoring: true,
  enableDatabaseMonitoring: true,
  enableAnalytics: true,
  enableNotifications: false,
  analyticsEndpoint: '/api/analytics/performance',
  debugMode: process.env.NODE_ENV === 'development',
  thresholds: {
    slowQueryMs: 1000,
    slowComponentMs: 100,
    errorRateThreshold: 0.05,
    memoryUsageThreshold: 0.8
  }
};

// Initialize all performance monitoring systems
export function initializePerformanceMonitoring(config: PerformanceConfig = {}) {
  const finalConfig = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  
  if (typeof window === 'undefined') {
    console.warn('Performance monitoring can only be initialized on the client side');
    return;
  }

  console.log('🚀 Initializing Astral Core Performance Monitoring System');

  try {
    // Initialize metrics collector
    if (finalConfig.enableMetrics) {
      getPerformanceMetricsCollector();
      console.log('✅ Performance metrics collector initialized');
    }

    // Initialize Web Vitals monitoring
    if (finalConfig.enableWebVitals) {
      getWebVitalsMonitor();
      console.log('✅ Web Vitals monitor initialized');
    }

    // Initialize error monitoring
    if (finalConfig.enableErrorMonitoring) {
      const errorMonitor = getErrorMonitor();
      
      if (finalConfig.enableNotifications) {
        requestNotificationPermission();
      }
      
      console.log('✅ Error monitor initialized');
    }

    // Initialize database monitoring
    if (finalConfig.enableDatabaseMonitoring) {
      getDatabaseMonitor();
      console.log('✅ Database monitor initialized');
    }

    // Set up global error handlers
    if (finalConfig.enableErrorMonitoring) {
      const errorMonitor = getErrorMonitor();
      
      window.addEventListener('unhandledrejection', (event) => {
        errorMonitor.captureError({
          message: `Unhandled Promise Rejection: ${event.reason}`,
          type: 'unhandledrejection',
          severity: 'high'
        });
      });

      window.addEventListener('error', (event) => {
        if (event.error) {
          errorMonitor.captureError({
            message: event.error.message,
            stack: event.error.stack,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            type: 'javascript',
            severity: 'high'
          });
        }
      });
    }

    // Log success
    console.log('🎉 Performance monitoring system initialized successfully');
    
    if (finalConfig.debugMode) {
      console.log('🔍 Debug mode enabled - detailed logging active');
      
      // Log performance summary every 30 seconds in debug mode
      setInterval(() => {
        logPerformanceMetrics();
        logWebVitals();
        logErrorReport();
        logDatabaseReport();
      }, 30000);
    }

  } catch (error) {
    console.error('❌ Failed to initialize performance monitoring:', error);
  }
}

// Export types for external use
export type {
  PerformanceConfig
};