/**
 * Comprehensive Performance Monitoring System
 * Tracks Web Vitals, bundle size, load times, and database performance
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url?: string;
  userId?: string;
  sessionId?: string;
}

interface WebVitals {
  CLS: number;
  FID: number;
  FCP: number;
  LCP: number;
  TTFB: number;
  INP?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeObservers();
  }

  private generateSessionId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return;

    // Navigation timing observer
    if ('PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordNavigationMetrics(navEntry);
          }
        }
      });

      try {
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (e) {
        console.warn('Navigation observer not supported:', e);
      }

      // Resource timing observer
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordResourceMetrics(resourceEntry);
          }
        }
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (e) {
        console.warn('Resource observer not supported:', e);
      }
    }
  }

  private recordNavigationMetrics(entry: PerformanceNavigationTiming) {
    const metrics: PerformanceMetric[] = [
      {
        name: 'TTFB',
        value: entry.responseStart - entry.requestStart,
        timestamp: Date.now(),
        url: window.location.pathname
      },
      {
        name: 'DOM_CONTENT_LOADED',
        value: entry.domContentLoadedEventEnd - entry.fetchStart,
        timestamp: Date.now(),
        url: window.location.pathname
      },
      {
        name: 'LOAD_EVENT',
        value: entry.loadEventEnd - entry.fetchStart,
        timestamp: Date.now(),
        url: window.location.pathname
      }
    ];

    metrics.forEach(metric => this.addMetric(metric));
  }

  private recordResourceMetrics(entry: PerformanceResourceTiming) {
    // Only track significant resources
    if (entry.transferSize > 10000 || entry.name.includes('.js') || entry.name.includes('.css')) {
      this.addMetric({
        name: 'RESOURCE_LOAD',
        value: entry.responseEnd - entry.requestStart,
        timestamp: Date.now(),
        url: entry.name
      });
    }
  }

  addMetric(metric: Omit<PerformanceMetric, 'sessionId'>) {
    this.metrics.push({
      ...metric,
      sessionId: this.sessionId
    } as PerformanceMetric);

    // Auto-flush metrics periodically
    if (this.metrics.length >= 50) {
      this.flush();
    }
  }

  recordWebVitals(vitals: Partial<WebVitals>) {
    Object.entries(vitals).forEach(([name, value]) => {
      if (value !== undefined && value !== null) {
        this.addMetric({
          name: `WEB_VITAL_${name}`,
          value: Number(value),
          timestamp: Date.now(),
          url: window.location.pathname
        });
      }
    });
  }

  recordCustomMetric(name: string, value: number, context?: Record<string, any>) {
    this.addMetric({
      name: `CUSTOM_${name.toUpperCase()}`,
      value,
      timestamp: Date.now(),
      url: window.location.pathname,
      ...context
    });
  }

  async flush() {
    if (this.metrics.length === 0) return;

    const payload = {
      sessionId: this.sessionId,
      metrics: [...this.metrics],
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    try {
      await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.metrics = [];
    } catch (error) {
      console.warn('Failed to send performance metrics:', error);
    }
  }

  dispose() {
    this.observers.forEach(observer => observer.disconnect());
    this.flush();
  }

  // Bundle analysis utilities
  getBundleInfo() {
    if (typeof window === 'undefined') return null;

    const scripts = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[];
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];

    return {
      scripts: scripts.map(script => ({
        src: script.src,
        async: script.async,
        defer: script.defer
      })),
      stylesheets: stylesheets.map(link => ({
        href: link.href,
        media: link.media
      })),
      timestamp: Date.now()
    };
  }
}

// Web Vitals integration
let webVitalsLoaded = false;

export const initWebVitals = async () => {
  if (webVitalsLoaded || typeof window === 'undefined') return;

  try {
    const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');
    
    const performanceMonitor = getPerformanceMonitor();
    
    getCLS((metric) => {
      performanceMonitor.recordWebVitals({ CLS: metric.value });
    });

    getFID((metric) => {
      performanceMonitor.recordWebVitals({ FID: metric.value });
    });

    getFCP((metric) => {
      performanceMonitor.recordWebVitals({ FCP: metric.value });
    });

    getLCP((metric) => {
      performanceMonitor.recordWebVitals({ LCP: metric.value });
    });

    getTTFB((metric) => {
      performanceMonitor.recordWebVitals({ TTFB: metric.value });
    });

    webVitalsLoaded = true;
  } catch (error) {
    console.warn('Web Vitals not available:', error);
  }
};

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export const getPerformanceMonitor = (): PerformanceMonitor => {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
};

// React hook for performance tracking
export const usePerformanceTracking = () => {
  const monitor = getPerformanceMonitor();

  return {
    recordMetric: (name: string, value: number, context?: Record<string, any>) => {
      monitor.recordCustomMetric(name, value, context);
    },
    recordWebVitals: (vitals: Partial<WebVitals>) => {
      monitor.recordWebVitals(vitals);
    },
    flush: () => monitor.flush(),
    getBundleInfo: () => monitor.getBundleInfo()
  };
};

// Performance decorators
export const withPerformanceTracking = <T extends (...args: any[]) => any>(
  fn: T,
  metricName: string
): T => {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = fn(...args);
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        getPerformanceMonitor().recordCustomMetric(metricName, duration);
      });
    } else {
      const duration = performance.now() - start;
      getPerformanceMonitor().recordCustomMetric(metricName, duration);
      return result;
    }
  }) as T;
};

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Initialize with a small delay to avoid blocking initial render
  setTimeout(() => {
    getPerformanceMonitor();
    initWebVitals();
  }, 100);
}