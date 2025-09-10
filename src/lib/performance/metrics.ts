/**
 * Performance Metrics Collection System
 * Comprehensive monitoring for Core Web Vitals, API performance, and system metrics
 */

'use client';

export interface CoreWebVitals {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  inp: number; // Interaction to Next Paint
}

export interface ApiPerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  status: number;
  timestamp: number;
  size: number;
  cached: boolean;
}

export interface DatabaseMetric {
  query: string;
  duration: number;
  timestamp: number;
  rows: number;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
}

export interface MemoryMetric {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

export interface PerformanceReport {
  webVitals: Partial<CoreWebVitals>;
  apiMetrics: ApiPerformanceMetric[];
  memoryMetrics: MemoryMetric[];
  pageLoadTime: number;
  resourceCounts: {
    scripts: number;
    stylesheets: number;
    images: number;
    fonts: number;
  };
  bundleSize: number;
  timestamp: number;
}

class PerformanceMetricsCollector {
  private webVitals: Partial<CoreWebVitals> = {};
  private apiMetrics: ApiPerformanceMetric[] = [];
  private memoryMetrics: MemoryMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined' || this.isInitialized) return;

    this.isInitialized = true;
    this.setupWebVitalsMonitoring();
    this.setupMemoryMonitoring();
    this.setupResourceMonitoring();
    this.setupNavigationMonitoring();
  }

  private setupWebVitalsMonitoring() {
    // First Contentful Paint (FCP)
    this.observePerformanceEntry('paint', entry => {
      if (entry.name === 'first-contentful-paint') {
        this.webVitals.fcp = entry.startTime;
      }
    });

    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', entry => {
      this.webVitals.lcp = entry.startTime;
    });

    // First Input Delay (FID) & Interaction to Next Paint (INP)
    this.observePerformanceEntry('first-input', entry => {
      const inputEntry = entry as PerformanceEventTiming;
      this.webVitals.fid = inputEntry.processingStart - entry.startTime;
    });

    // Layout Shift (CLS)
    this.observePerformanceEntry('layout-shift', entry => {
      const layoutEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
      if (!layoutEntry.hadRecentInput) {
        this.webVitals.cls = (this.webVitals.cls || 0) + (layoutEntry.value || 0);
      }
    });

    // Time to First Byte (TTFB)
    this.observePerformanceEntry('navigation', entry => {
      const navigationEntry = entry as PerformanceNavigationTiming;
      this.webVitals.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
    });
  }

  private setupMemoryMonitoring() {
    if ('memory' in performance) {
      const collectMemoryMetrics = () => {
        const memory = (
          performance as unknown as {
            memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
          }
        ).memory;
        this.memoryMetrics.push({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        });

        // Keep only last 100 entries
        if (this.memoryMetrics.length > 100) {
          this.memoryMetrics = this.memoryMetrics.slice(-50);
        }
      };

      // Collect memory metrics every 30 seconds
      setInterval(collectMemoryMetrics, 30000);
      collectMemoryMetrics(); // Initial collection
    }
  }

  private setupResourceMonitoring() {
    this.observePerformanceEntry('resource', entry => {
      const resourceEntry = entry as PerformanceResourceTiming;

      // Track API calls
      if (resourceEntry.name.includes('/api/')) {
        this.apiMetrics.push({
          endpoint: this.extractEndpoint(resourceEntry.name),
          method: 'GET', // Default, can be enhanced with actual method
          responseTime: resourceEntry.responseEnd - resourceEntry.requestStart,
          status: 200, // Default, can be enhanced with actual status
          timestamp: Date.now(),
          size: resourceEntry.transferSize || resourceEntry.encodedBodySize || 0,
          cached: resourceEntry.transferSize === 0 && resourceEntry.encodedBodySize > 0
        });

        // Keep only last 200 API metrics
        if (this.apiMetrics.length > 200) {
          this.apiMetrics = this.apiMetrics.slice(-100);
        }
      }
    });
  }

  private setupNavigationMonitoring() {
    this.observePerformanceEntry('navigation', entry => {
      const navigationEntry = entry as PerformanceNavigationTiming;

      // Additional navigation metrics can be collected here
      console.log('Page load complete:', {
        loadTime: navigationEntry.loadEventEnd - navigationEntry.fetchStart,
        domContentLoaded: navigationEntry.domContentLoadedEventEnd - navigationEntry.fetchStart,
        firstByte: navigationEntry.responseStart - navigationEntry.requestStart
      });
    });
  }

  private observePerformanceEntry(entryType: string, callback: (entry: PerformanceEntry) => void) {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          callback(entry);
        }
      });

      observer.observe({ entryTypes: [entryType] });
      this.observers.set(entryType, observer);
    } catch (e) {
      console.warn(`Failed to observe ${entryType}:`, e);
    }
  }

  private extractEndpoint(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/');
      const apiIndex = pathParts.indexOf('api');
      return apiIndex !== -1 ? pathParts.slice(apiIndex).join('/') : url;
    } catch {
      return url;
    }
  }

  // Public methods
  public getWebVitals(): Partial<CoreWebVitals> {
    return { ...this.webVitals };
  }

  public getApiMetrics(): ApiPerformanceMetric[] {
    return [...this.apiMetrics];
  }

  public getMemoryMetrics(): MemoryMetric[] {
    return [...this.memoryMetrics];
  }

  public getLatestMemoryUsage(): MemoryMetric | null {
    return this.memoryMetrics.length > 0
      ? this.memoryMetrics[this.memoryMetrics.length - 1] || null
      : null;
  }

  public getApiPerformanceSummary() {
    if (this.apiMetrics.length === 0) {
      return { averageResponseTime: 0, totalRequests: 0, slowestEndpoints: [] };
    }

    const averageResponseTime =
      this.apiMetrics.reduce((sum, metric) => sum + metric.responseTime, 0) /
      this.apiMetrics.length;
    const endpointGroups = this.apiMetrics.reduce(
      (groups, metric) => {
        if (!groups[metric.endpoint]) {
          groups[metric.endpoint] = { total: 0, count: 0, slowest: 0 };
        }
        const group = groups[metric.endpoint]!;
        group.total += metric.responseTime;
        group.count++;
        group.slowest = Math.max(group.slowest, metric.responseTime);
        return groups;
      },
      {} as Record<string, { total: number; count: number; slowest: number }>
    );

    const slowestEndpoints = Object.entries(endpointGroups)
      .map(([endpoint, stats]) => ({
        endpoint,
        averageTime: stats.total / stats.count,
        slowestTime: stats.slowest,
        requests: stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);

    return {
      averageResponseTime,
      totalRequests: this.apiMetrics.length,
      slowestEndpoints
    };
  }

  public generateReport(): PerformanceReport {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource');

    const resourceCounts = {
      scripts: resources.filter(r => r.name.includes('.js')).length,
      stylesheets: resources.filter(r => r.name.includes('.css')).length,
      images: resources.filter(r => /\.(jpg|jpeg|png|gif|webp|svg)/.test(r.name)).length,
      fonts: resources.filter(r => /\.(woff|woff2|ttf|eot)/.test(r.name)).length
    };

    const bundleSize = resources
      .filter(r => r.name.includes('chunks') || r.name.includes('.js'))
      .reduce((total, r) => {
        const resourceTiming = r as PerformanceResourceTiming;
        return total + (resourceTiming.transferSize || resourceTiming.encodedBodySize || 0);
      }, 0);

    return {
      webVitals: this.getWebVitals(),
      apiMetrics: this.getApiMetrics(),
      memoryMetrics: this.getMemoryMetrics(),
      pageLoadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      resourceCounts,
      bundleSize,
      timestamp: Date.now()
    };
  }

  public trackApiCall(
    endpoint: string,
    method: string,
    responseTime: number,
    status: number,
    size: number
  ) {
    this.apiMetrics.push({
      endpoint,
      method,
      responseTime,
      status,
      timestamp: Date.now(),
      size,
      cached: false
    });

    // Keep only last 200 API metrics
    if (this.apiMetrics.length > 200) {
      this.apiMetrics = this.apiMetrics.slice(-100);
    }
  }

  public getWebVitalsScore(): { score: number; grade: string; issues: string[] } {
    const vitals = this.getWebVitals();
    let score = 100;
    const issues: string[] = [];

    // FCP scoring (good: <1.8s, needs improvement: 1.8s-3s, poor: >3s)
    if (vitals.fcp !== undefined) {
      if (vitals.fcp > 3000) {
        score -= 20;
        issues.push('First Contentful Paint is slow (>3s)');
      } else if (vitals.fcp > 1800) {
        score -= 10;
        issues.push('First Contentful Paint needs improvement (>1.8s)');
      }
    }

    // LCP scoring (good: <2.5s, needs improvement: 2.5s-4s, poor: >4s)
    if (vitals.lcp !== undefined) {
      if (vitals.lcp > 4000) {
        score -= 25;
        issues.push('Largest Contentful Paint is poor (>4s)');
      } else if (vitals.lcp > 2500) {
        score -= 15;
        issues.push('Largest Contentful Paint needs improvement (>2.5s)');
      }
    }

    // FID scoring (good: <100ms, needs improvement: 100ms-300ms, poor: >300ms)
    if (vitals.fid !== undefined) {
      if (vitals.fid > 300) {
        score -= 20;
        issues.push('First Input Delay is poor (>300ms)');
      } else if (vitals.fid > 100) {
        score -= 10;
        issues.push('First Input Delay needs improvement (>100ms)');
      }
    }

    // CLS scoring (good: <0.1, needs improvement: 0.1-0.25, poor: >0.25)
    if (vitals.cls !== undefined) {
      if (vitals.cls > 0.25) {
        score -= 20;
        issues.push('Cumulative Layout Shift is poor (>0.25)');
      } else if (vitals.cls > 0.1) {
        score -= 10;
        issues.push('Cumulative Layout Shift needs improvement (>0.1)');
      }
    }

    let grade: string;
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return { score: Math.max(0, score), grade, issues };
  }

  public cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Singleton instance
let metricsCollector: PerformanceMetricsCollector | null = null;

export function getPerformanceMetricsCollector(): PerformanceMetricsCollector {
  if (!metricsCollector) {
    metricsCollector = new PerformanceMetricsCollector();
  }
  return metricsCollector;
}

// React hook
export function usePerformanceMetrics() {
  const collector = getPerformanceMetricsCollector();

  return {
    webVitals: collector.getWebVitals(),
    apiMetrics: collector.getApiMetrics(),
    memoryMetrics: collector.getMemoryMetrics(),
    generateReport: () => collector.generateReport(),
    trackApiCall: collector.trackApiCall.bind(collector),
    getWebVitalsScore: () => collector.getWebVitalsScore(),
    getApiPerformanceSummary: () => collector.getApiPerformanceSummary(),
    getLatestMemoryUsage: () => collector.getLatestMemoryUsage()
  };
}

// Development helper
export function logPerformanceMetrics() {
  if (process.env.NODE_ENV === 'development') {
    const collector = getPerformanceMetricsCollector();
    const report = collector.generateReport();
    const vitalsScore = collector.getWebVitalsScore();

    console.group('Performance Metrics Report');
    console.log('Web Vitals Score:', `${vitalsScore.score}/100 (${vitalsScore.grade})`);
    console.log('Web Vitals:', report.webVitals);
    console.log('Page Load Time:', `${report.pageLoadTime.toFixed(2)}ms`);
    console.log('Bundle Size:', `${(report.bundleSize / 1024).toFixed(2)}KB`);
    console.log('API Performance:', collector.getApiPerformanceSummary());
    console.log('Memory Usage:', collector.getLatestMemoryUsage());
    console.log('Issues:', vitalsScore.issues);
    console.groupEnd();
  }
}
