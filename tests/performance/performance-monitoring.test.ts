/**
 * Performance Monitoring System Tests
 * Comprehensive tests for all performance monitoring features
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  memory: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 20000000,
    jsHeapSizeLimit: 100000000
  }
};

// Mock PerformanceObserver
const mockPerformanceObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => [])
}));

// Setup global mocks
(global as { performance: unknown }).performance = mockPerformance;
(global as { PerformanceObserver: unknown }).PerformanceObserver = mockPerformanceObserver;
(global as { Notification: unknown }).Notification = {
  permission: 'default',
  requestPermission: jest.fn(() => Promise.resolve('granted'))
};

// Mock window and navigation
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    location: {
      href: 'https://test.com/page',
      pathname: '/page'
    },
    navigator: {
      userAgent: 'test-user-agent'
    },
    fetch: jest.fn()
  },
  writable: true
});

// Import after mocks are set up
import {
  getPerformanceMetricsCollector,
  getWebVitalsMonitor,
  getErrorMonitor,
  getDatabaseMonitor,
  PerformanceUtils
} from '../../src/lib/performance';

describe('Performance Monitoring System', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset performance mock data
    mockPerformance.now.mockReturnValue(Date.now());
    mockPerformance.getEntriesByType.mockReturnValue([]);
  });

  afterEach(() => {
    // Clean up any performance observers
    jest.clearAllMocks();
  });

  describe('Performance Metrics Collector', () => {
    test('should initialize metrics collector', () => {
      const collector = getPerformanceMetricsCollector();
      expect(collector).toBeDefined();
      expect(collector.getWebVitals).toBeInstanceOf(Function);
      expect(collector.generateReport).toBeInstanceOf(Function);
    });

    test('should track API calls', () => {
      const collector = getPerformanceMetricsCollector();

      collector.trackApiCall('/api/test', 'GET', 150, 200, 1024);

      const metrics = collector.getApiMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        endpoint: '/api/test',
        method: 'GET',
        responseTime: 150,
        status: 200,
        size: 1024
      });
    });

    test('should generate performance report', () => {
      const collector = getPerformanceMetricsCollector();

      // Mock navigation timing
      mockPerformance.getEntriesByType.mockReturnValue([
        {
          entryType: 'navigation',
          loadEventEnd: 2000,
          navigationStart: 0
        }
      ]);

      const report = collector.generateReport();

      expect(report).toHaveProperty('webVitals');
      expect(report).toHaveProperty('apiMetrics');
      expect(report).toHaveProperty('memoryMetrics');
      expect(report).toHaveProperty('pageLoadTime');
      expect(report).toHaveProperty('timestamp');
    });

    test('should calculate Web Vitals score', () => {
      const collector = getPerformanceMetricsCollector();
      const score = collector.getWebVitalsScore();

      expect(score).toHaveProperty('score');
      expect(score).toHaveProperty('grade');
      expect(score).toHaveProperty('issues');
      expect(typeof score.score).toBe('number');
      expect(typeof score.grade).toBe('string');
      expect(Array.isArray(score.issues)).toBe(true);
    });
  });

  describe('Web Vitals Monitor', () => {
    test('should initialize Web Vitals monitor', () => {
      const monitor = getWebVitalsMonitor();
      expect(monitor).toBeDefined();
      expect(monitor.getVitals).toBeInstanceOf(Function);
      expect(monitor.subscribe).toBeInstanceOf(Function);
    });

    test('should subscribe to vitals updates', () => {
      const monitor = getWebVitalsMonitor();
      const callback = jest.fn();

      const unsubscribe = monitor.subscribe(callback);
      expect(typeof unsubscribe).toBe('function');

      // Cleanup
      unsubscribe();
    });

    test('should calculate vitals score', () => {
      const monitor = getWebVitalsMonitor();
      const score = monitor.getVitalsScore();

      expect(score).toHaveProperty('overall');
      expect(score).toHaveProperty('grade');
      expect(score).toHaveProperty('details');
      expect(typeof score.overall).toBe('number');
    });

    test('should generate insights', () => {
      const monitor = getWebVitalsMonitor();
      const insights = monitor.getInsights();

      expect(Array.isArray(insights)).toBe(true);
    });
  });

  describe('Error Monitor', () => {
    test('should initialize error monitor', () => {
      const monitor = getErrorMonitor();
      expect(monitor).toBeDefined();
      expect(monitor.captureError).toBeInstanceOf(Function);
      expect(monitor.getErrors).toBeInstanceOf(Function);
    });

    test('should capture errors', () => {
      const monitor = getErrorMonitor();

      monitor.captureError({
        message: 'Test error',
        type: 'javascript',
        severity: 'high'
      });

      const errors = monitor.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        message: 'Test error',
        type: 'javascript',
        severity: 'high'
      });
    });

    test('should generate error patterns', () => {
      const monitor = getErrorMonitor();

      // Add multiple similar errors
      for (let i = 0; i < 5; i++) {
        monitor.captureError({
          message: 'TypeError: Cannot read property',
          type: 'javascript',
          severity: 'medium'
        });
      }

      const patterns = monitor.getErrorPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('count');
      expect(patterns[0].count).toBeGreaterThan(1);
    });

    test('should subscribe to error events', () => {
      const monitor = getErrorMonitor();
      const callback = jest.fn();

      const unsubscribe = monitor.subscribe(callback);

      monitor.captureError({
        message: 'Test subscription error',
        type: 'custom',
        severity: 'low'
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test subscription error'
        })
      );

      unsubscribe();
    });

    test('should generate error statistics', () => {
      const monitor = getErrorMonitor();

      monitor.captureError({
        message: 'Critical error',
        type: 'javascript',
        severity: 'critical'
      });

      const stats = monitor.getErrorStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('bySeverity');
      expect(stats).toHaveProperty('byType');
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.bySeverity.critical).toBeGreaterThan(0);
    });
  });

  describe('Database Monitor', () => {
    test('should initialize database monitor', () => {
      const monitor = getDatabaseMonitor();
      expect(monitor).toBeDefined();
      expect(monitor.trackQuery).toBeInstanceOf(Function);
      expect(monitor.getQueries).toBeInstanceOf(Function);
    });

    test('should track database queries', () => {
      const monitor = getDatabaseMonitor();

      const query = monitor.trackQuery({
        query: 'SELECT * FROM users WHERE id = ?',
        operation: 'SELECT',
        duration: 25,
        rows: 1,
        table: 'users',
        success: true
      });

      expect(query).toHaveProperty('id');
      expect(query.query).toBe('SELECT * FROM users WHERE id = ?');
      expect(query.duration).toBe(25);

      const queries = monitor.getQueries();
      expect(queries).toHaveLength(1);
    });

    test('should detect slow queries', () => {
      const monitor = getDatabaseMonitor();

      monitor.trackQuery({
        query: 'SELECT * FROM large_table',
        operation: 'SELECT',
        duration: 2000,
        rows: 10000,
        table: 'large_table',
        success: true
      });

      const slowQueries = monitor.getSlowQueries(1000);
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].duration).toBe(2000);
    });

    test('should generate database insights', () => {
      const monitor = getDatabaseMonitor();

      // Add some slow queries
      for (let i = 0; i < 3; i++) {
        monitor.trackQuery({
          query: `SELECT * FROM table${i}`,
          operation: 'SELECT',
          duration: 1500,
          rows: 100,
          table: `table${i}`,
          success: true
        });
      }

      const insights = monitor.generateInsights();

      expect(Array.isArray(insights)).toBe(true);

      if (insights.length > 0) {
        expect(insights[0]).toHaveProperty('type');
        expect(insights[0]).toHaveProperty('severity');
        expect(insights[0]).toHaveProperty('message');
        expect(insights[0]).toHaveProperty('recommendation');
      }
    });

    test('should calculate database statistics', () => {
      const monitor = getDatabaseMonitor();

      monitor.trackQuery({
        query: 'SELECT * FROM users',
        operation: 'SELECT',
        duration: 100,
        rows: 10,
        table: 'users',
        success: true
      });

      monitor.trackQuery({
        query: 'INSERT INTO logs',
        operation: 'INSERT',
        duration: 50,
        rows: 1,
        table: 'logs',
        success: true
      });

      const stats = monitor.getStats();

      expect(stats).toHaveProperty('totalQueries', 2);
      expect(stats).toHaveProperty('averageDuration');
      expect(stats).toHaveProperty('queryDistribution');
      expect(stats.queryDistribution.SELECT).toBe(1);
      expect(stats.queryDistribution.INSERT).toBe(1);
    });
  });

  describe('Performance Utils', () => {
    test('should format duration correctly', () => {
      expect(PerformanceUtils.formatDuration(500)).toBe('500ms');
      expect(PerformanceUtils.formatDuration(1500)).toBe('1.50s');
      expect(PerformanceUtils.formatDuration(2000)).toBe('2.00s');
    });

    test('should format bytes correctly', () => {
      expect(PerformanceUtils.formatBytes(0)).toBe('0 B');
      expect(PerformanceUtils.formatBytes(1024)).toBe('1 KB');
      expect(PerformanceUtils.formatBytes(1048576)).toBe('1 MB');
      expect(PerformanceUtils.formatBytes(1073741824)).toBe('1 GB');
    });

    test('should calculate percentiles', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      expect(PerformanceUtils.calculatePercentile(values, 50)).toBe(5);
      expect(PerformanceUtils.calculatePercentile(values, 90)).toBe(9);
      expect(PerformanceUtils.calculatePercentile(values, 95)).toBe(10);
      expect(PerformanceUtils.calculatePercentile([], 50)).toBe(0);
    });

    test('should get performance grade', () => {
      expect(PerformanceUtils.getPerformanceGrade(95)).toBe('A');
      expect(PerformanceUtils.getPerformanceGrade(85)).toBe('B');
      expect(PerformanceUtils.getPerformanceGrade(75)).toBe('C');
      expect(PerformanceUtils.getPerformanceGrade(65)).toBe('D');
      expect(PerformanceUtils.getPerformanceGrade(55)).toBe('F');
    });

    test('should debounce function calls', done => {
      const mockFn = jest.fn();
      const debouncedFn = PerformanceUtils.debounce(mockFn, 100);

      debouncedFn('test1');
      debouncedFn('test2');
      debouncedFn('test3');

      // Should not be called immediately
      expect(mockFn).not.toHaveBeenCalled();

      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('test3');
        done();
      }, 150);
    });

    test('should throttle function calls', done => {
      const mockFn = jest.fn();
      const throttledFn = PerformanceUtils.throttle(mockFn, 100);

      throttledFn('test1');
      throttledFn('test2');
      throttledFn('test3');

      // Should be called once immediately
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test1');

      setTimeout(() => {
        throttledFn('test4');
        expect(mockFn).toHaveBeenCalledTimes(2);
        expect(mockFn).toHaveBeenCalledWith('test4');
        done();
      }, 150);
    });
  });

  describe('Integration Tests', () => {
    test('should handle multiple monitoring systems together', () => {
      const metricsCollector = getPerformanceMetricsCollector();
      getWebVitalsMonitor();
      const errorMonitor = getErrorMonitor();
      const databaseMonitor = getDatabaseMonitor();

      // Track some data across systems
      metricsCollector.trackApiCall('/api/users', 'GET', 120, 200, 2048);

      errorMonitor.captureError({
        message: 'Integration test error',
        type: 'custom',
        severity: 'low'
      });

      databaseMonitor.trackQuery({
        query: 'SELECT * FROM users',
        operation: 'SELECT',
        duration: 80,
        rows: 5,
        table: 'users',
        success: true
      });

      // Verify all systems have data
      expect(metricsCollector.getApiMetrics()).toHaveLength(1);
      expect(errorMonitor.getErrors()).toHaveLength(1);
      expect(databaseMonitor.getQueries()).toHaveLength(1);
    });

    test('should generate comprehensive performance report', () => {
      const metricsCollector = getPerformanceMetricsCollector();

      // Add some test data
      metricsCollector.trackApiCall('/api/test1', 'GET', 100, 200, 1024);
      metricsCollector.trackApiCall('/api/test2', 'POST', 200, 201, 2048);

      const report = metricsCollector.generateReport();

      expect(report).toHaveProperty('webVitals');
      expect(report).toHaveProperty('apiMetrics');
      expect(report).toHaveProperty('memoryMetrics');
      expect(report).toHaveProperty('pageLoadTime');
      expect(report).toHaveProperty('resourceCounts');
      expect(report).toHaveProperty('bundleSize');
      expect(report).toHaveProperty('timestamp');

      expect(report.apiMetrics).toHaveLength(2);
    });

    test('should handle error scenarios gracefully', () => {
      const errorMonitor = getErrorMonitor();

      // Test with invalid data
      expect(() => {
        errorMonitor.captureError({
          message: '',
          type: 'javascript',
          severity: 'low'
        });
      }).not.toThrow();

      // Test with null/undefined values
      expect(() => {
        errorMonitor.captureError({
          message: 'Test error',
          type: 'custom',
          severity: 'medium',
          context: undefined
        });
      }).not.toThrow();
    });
  });
});
