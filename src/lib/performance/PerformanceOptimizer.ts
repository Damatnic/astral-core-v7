// Advanced Performance Optimization System for Mental Health Platform
// Comprehensive performance monitoring, optimization, and testing

export interface PerformanceConfig {
  monitoring: {
    enabled: boolean;
    sampleRate: number; // 0-1
    enableWebVitals: boolean;
    enableCustomMetrics: boolean;
    enableUserTiming: boolean;
    enableResourceTiming: boolean;
    enableNavigationTiming: boolean;
  };
  optimization: {
    enableLazyLoading: boolean;
    enableCodeSplitting: boolean;
    enableImageOptimization: boolean;
    enableCaching: boolean;
    enableCompression: boolean;
    enablePreloading: boolean;
    enablePrefetching: boolean;
  };
  thresholds: {
    lcp: number; // Largest Contentful Paint (ms)
    fid: number; // First Input Delay (ms)
    cls: number; // Cumulative Layout Shift
    fcp: number; // First Contentful Paint (ms)
    ttfb: number; // Time to First Byte (ms)
    tti: number; // Time to Interactive (ms)
  };
  alerts: {
    enabled: boolean;
    thresholdExceeded: boolean;
    performanceDegradation: boolean;
    errorRateIncrease: boolean;
  };
}

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  name: string;
  value: number;
  unit: string;
  type: 'web_vital' | 'custom' | 'resource' | 'navigation' | 'user_timing';
  url: string;
  userAgent: string;
  connectionType?: string;
  deviceMemory?: number;
  metadata?: Record<string, any>;
}

export interface WebVitalsMetrics {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  tti: number | null;
}

export interface ResourcePerformance {
  name: string;
  type: string;
  size: number;
  duration: number;
  cached: boolean;
  protocol: string;
  timing: {
    dns: number;
    tcp: number;
    ssl: number;
    request: number;
    response: number;
  };
}

export interface NavigationPerformance {
  type: string;
  duration: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
}

export interface OptimizationStrategy {
  name: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  category: 'loading' | 'rendering' | 'interactivity' | 'stability';
  implementation: () => Promise<void>;
  enabled: boolean;
}

export interface PerformanceBudget {
  metrics: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
    tti: number;
  };
  resources: {
    javascript: number; // KB
    css: number; // KB
    images: number; // KB
    fonts: number; // KB
    total: number; // KB
  };
  requests: {
    total: number;
    javascript: number;
    css: number;
    images: number;
    fonts: number;
  };
}

export interface PerformanceReport {
  timestamp: number;
  url: string;
  score: number; // 0-100
  metrics: WebVitalsMetrics;
  resources: ResourcePerformance[];
  navigation: NavigationPerformance;
  opportunities: OptimizationOpportunity[];
  budget: {
    passed: boolean;
    violations: BudgetViolation[];
  };
  recommendations: PerformanceRecommendation[];
}

export interface OptimizationOpportunity {
  title: string;
  description: string;
  category: string;
  impact: number; // Estimated improvement in ms
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'high' | 'medium' | 'low';
  implementation: string;
  estimatedTime: string;
}

export interface BudgetViolation {
  metric: string;
  current: number;
  budget: number;
  violation: number;
  impact: 'critical' | 'major' | 'minor';
}

export interface PerformanceRecommendation {
  title: string;
  description: string;
  benefit: string;
  implementation: string[];
  priority: number;
  category: string;
}

export class PerformanceOptimizer {
  private config: PerformanceConfig;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private webVitals: WebVitalsMetrics = {
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    tti: null
  };
  private observers: Map<string, PerformanceObserver> = new Map();
  private optimizations: OptimizationStrategy[] = [];
  private budget: PerformanceBudget;

  constructor(config: PerformanceConfig, budget: PerformanceBudget) {
    this.config = config;
    this.budget = budget;
    this.initialize();
    this.setupOptimizations();
  }

  private initialize(): void {
    if (typeof window === 'undefined' || !this.config.monitoring.enabled) return;

    this.setupWebVitalsMonitoring();
    this.setupResourceMonitoring();
    this.setupNavigationMonitoring();
    this.setupUserTimingMonitoring();
    this.setupNetworkInformationAPI();
    this.setupMemoryAPI();
  }

  private setupWebVitalsMonitoring(): void {
    if (!this.config.monitoring.enableWebVitals) return;

    // Largest Contentful Paint
    this.observeMetric('largest-contentful-paint', (entries) => {
      for (const entry of entries) {
        this.webVitals.lcp = entry.startTime;
        this.recordMetric('LCP', entry.startTime, 'ms', 'web_vital');
      }
    });

    // First Input Delay
    this.observeMetric('first-input', (entries) => {
      for (const entry of entries) {
        const fid = (entry as any).processingStart - entry.startTime;
        this.webVitals.fid = fid;
        this.recordMetric('FID', fid, 'ms', 'web_vital');
      }
    });

    // Cumulative Layout Shift
    let clsValue = 0;
    this.observeMetric('layout-shift', (entries) => {
      for (const entry of entries) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          this.webVitals.cls = clsValue;
          this.recordMetric('CLS', clsValue, 'score', 'web_vital');
        }
      }
    });

    // First Contentful Paint
    this.observeMetric('paint', (entries) => {
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          this.webVitals.fcp = entry.startTime;
          this.recordMetric('FCP', entry.startTime, 'ms', 'web_vital');
        }
      }
    });

    // Time to First Byte
    if ('navigation' in performance) {
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navTiming) {
        const ttfb = navTiming.responseStart - navTiming.fetchStart;
        this.webVitals.ttfb = ttfb;
        this.recordMetric('TTFB', ttfb, 'ms', 'web_vital');
      }
    }
  }

  private setupResourceMonitoring(): void {
    if (!this.config.monitoring.enableResourceTiming) return;

    this.observeMetric('resource', (entries) => {
      for (const entry of entries) {
        const resource = entry as PerformanceResourceTiming;
        this.recordResourcePerformance(resource);
      }
    });
  }

  private setupNavigationMonitoring(): void {
    if (!this.config.monitoring.enableNavigationTiming) return;

    this.observeMetric('navigation', (entries) => {
      for (const entry of entries) {
        const navigation = entry as PerformanceNavigationTiming;
        this.recordNavigationPerformance(navigation);
      }
    });
  }

  private setupUserTimingMonitoring(): void {
    if (!this.config.monitoring.enableUserTiming) return;

    this.observeMetric('measure', (entries) => {
      for (const entry of entries) {
        this.recordMetric(entry.name, entry.duration, 'ms', 'user_timing');
      }
    });
  }

  private setupNetworkInformationAPI(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.recordMetric('NetworkSpeed', connection.downlink, 'Mbps', 'custom', {
        effectiveType: connection.effectiveType,
        rtt: connection.rtt
      });
    }
  }

  private setupMemoryAPI(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('JSHeapSize', memory.usedJSHeapSize, 'bytes', 'custom', {
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      });
    }
  }

  private observeMetric(entryType: string, callback: (entries: PerformanceEntryList) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        if (Math.random() <= this.config.monitoring.sampleRate) {
          callback(list.getEntries());
        }
      });
      
      observer.observe({ entryTypes: [entryType] });
      this.observers.set(entryType, observer);
    } catch (error) {
      console.warn(`Failed to observe ${entryType}:`, error);
    }
  }

  private recordMetric(
    name: string, 
    value: number, 
    unit: string, 
    type: PerformanceMetric['type'],
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateId(),
      timestamp: Date.now(),
      name,
      value,
      unit,
      type,
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata
    };

    // Add connection info if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      metric.connectionType = connection.effectiveType;
    }

    // Add device memory if available
    if ('deviceMemory' in navigator) {
      metric.deviceMemory = (navigator as any).deviceMemory;
    }

    // Store metric
    const key = `${type}_${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(metric);

    // Check thresholds
    this.checkThresholds(name, value);

    // Emit to external systems
    this.emitMetric(metric);
  }

  private recordResourcePerformance(resource: PerformanceResourceTiming): void {
    const resourcePerf: ResourcePerformance = {
      name: resource.name,
      type: resource.initiatorType,
      size: resource.transferSize || 0,
      duration: resource.duration,
      cached: resource.transferSize === 0,
      protocol: resource.nextHopProtocol || 'unknown',
      timing: {
        dns: resource.domainLookupEnd - resource.domainLookupStart,
        tcp: resource.connectEnd - resource.connectStart,
        ssl: resource.secureConnectionStart > 0 ? resource.connectEnd - resource.secureConnectionStart : 0,
        request: resource.responseStart - resource.requestStart,
        response: resource.responseEnd - resource.responseStart
      }
    };

    this.recordMetric(`Resource_${resource.initiatorType}`, resource.duration, 'ms', 'resource', resourcePerf);
  }

  private recordNavigationPerformance(navigation: PerformanceNavigationTiming): void {
    const navPerf: NavigationPerformance = {
      type: navigation.type,
      duration: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      loadComplete: navigation.loadEventEnd - navigation.fetchStart,
      firstPaint: 0, // Will be filled by paint observer
      firstContentfulPaint: 0, // Will be filled by paint observer
      largestContentfulPaint: 0, // Will be filled by LCP observer
      timeToInteractive: 0 // Calculated separately
    };

    this.recordMetric('NavigationDuration', navPerf.duration, 'ms', 'navigation', navPerf);
  }

  private checkThresholds(metric: string, value: number): void {
    if (!this.config.alerts.enabled) return;

    const thresholds = this.config.thresholds as any;
    const threshold = thresholds[metric.toLowerCase()];

    if (threshold && value > threshold) {
      this.createPerformanceAlert(metric, value, threshold);
    }
  }

  private createPerformanceAlert(metric: string, value: number, threshold: number): void {
    console.warn(`Performance threshold exceeded for ${metric}: ${value} > ${threshold}`);
    
    // Emit alert to monitoring systems
    this.emitAlert({
      type: 'threshold_exceeded',
      metric,
      value,
      threshold,
      timestamp: Date.now(),
      url: window.location.href
    });
  }

  private emitMetric(metric: PerformanceMetric): void {
    // Send to analytics/monitoring service
    if (this.config.monitoring.enabled) {
      // Implementation would send to external service
      console.debug('Performance metric:', metric);
    }
  }

  private emitAlert(alert: any): void {
    // Send alert to monitoring service
    console.warn('Performance alert:', alert);
  }

  // Optimization strategies
  private setupOptimizations(): void {
    this.optimizations = [
      {
        name: 'Lazy Loading Images',
        description: 'Load images only when they enter the viewport',
        impact: 'high',
        effort: 'low',
        category: 'loading',
        enabled: this.config.optimization.enableLazyLoading,
        implementation: this.implementLazyLoading.bind(this)
      },
      {
        name: 'Code Splitting',
        description: 'Split JavaScript bundles for better caching and loading',
        impact: 'high',
        effort: 'medium',
        category: 'loading',
        enabled: this.config.optimization.enableCodeSplitting,
        implementation: this.implementCodeSplitting.bind(this)
      },
      {
        name: 'Resource Preloading',
        description: 'Preload critical resources',
        impact: 'medium',
        effort: 'low',
        category: 'loading',
        enabled: this.config.optimization.enablePreloading,
        implementation: this.implementResourcePreloading.bind(this)
      },
      {
        name: 'Image Optimization',
        description: 'Optimize and compress images',
        impact: 'high',
        effort: 'medium',
        category: 'loading',
        enabled: this.config.optimization.enableImageOptimization,
        implementation: this.implementImageOptimization.bind(this)
      },
      {
        name: 'Aggressive Caching',
        description: 'Implement advanced caching strategies',
        impact: 'high',
        effort: 'medium',
        category: 'loading',
        enabled: this.config.optimization.enableCaching,
        implementation: this.implementAdvancedCaching.bind(this)
      }
    ];
  }

  private async implementLazyLoading(): Promise<void> {
    if ('IntersectionObserver' in window) {
      const images = document.querySelectorAll('img[data-src]');
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = img.dataset.src!;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    }
  }

  private async implementCodeSplitting(): Promise<void> {
    // Code splitting is typically handled at build time
    // This could trigger dynamic imports for certain features
    console.log('Code splitting optimization applied');
  }

  private async implementResourcePreloading(): Promise<void> {
    const criticalResources = [
      '/api/user/profile',
      '/fonts/main.woff2',
      '/images/hero.webp'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      
      if (resource.includes('/api/')) {
        link.as = 'fetch';
      } else if (resource.includes('.woff')) {
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      } else if (resource.includes('.webp') || resource.includes('.jpg')) {
        link.as = 'image';
      }
      
      document.head.appendChild(link);
    });
  }

  private async implementImageOptimization(): Promise<void> {
    // This would typically be handled at build time or by a service
    // Here we can add srcset for responsive images
    const images = document.querySelectorAll('img:not([srcset])');
    
    images.forEach(img => {
      const originalSrc = (img as HTMLImageElement).src;
      if (originalSrc && !originalSrc.includes('data:')) {
        // Add responsive image srcset
        (img as HTMLImageElement).srcset = `
          ${originalSrc}?w=320 320w,
          ${originalSrc}?w=640 640w,
          ${originalSrc}?w=1024 1024w
        `;
        (img as HTMLImageElement).sizes = '(max-width: 320px) 320px, (max-width: 640px) 640px, 1024px';
      }
    });
  }

  private async implementAdvancedCaching(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({
          type: 'ENABLE_AGGRESSIVE_CACHING'
        });
      } catch (error) {
        console.warn('Failed to enable aggressive caching:', error);
      }
    }
  }

  // Performance testing
  public async runPerformanceTest(): Promise<PerformanceReport> {
    const startTime = performance.now();
    
    // Collect current metrics
    const score = this.calculatePerformanceScore();
    const opportunities = this.identifyOptimizationOpportunities();
    const budgetViolations = this.checkPerformanceBudget();
    const recommendations = this.generateRecommendations();

    const report: PerformanceReport = {
      timestamp: Date.now(),
      url: window.location.href,
      score,
      metrics: { ...this.webVitals },
      resources: this.getResourcePerformanceData(),
      navigation: this.getNavigationPerformanceData(),
      opportunities,
      budget: {
        passed: budgetViolations.length === 0,
        violations: budgetViolations
      },
      recommendations
    };

    console.log('Performance test completed in', performance.now() - startTime, 'ms');
    return report;
  }

  private calculatePerformanceScore(): number {
    let score = 100;
    const metrics = this.webVitals;
    const thresholds = this.config.thresholds;

    // LCP scoring
    if (metrics.lcp !== null) {
      if (metrics.lcp > thresholds.lcp * 2) score -= 30;
      else if (metrics.lcp > thresholds.lcp) score -= 15;
    }

    // FID scoring
    if (metrics.fid !== null) {
      if (metrics.fid > thresholds.fid * 2) score -= 25;
      else if (metrics.fid > thresholds.fid) score -= 10;
    }

    // CLS scoring
    if (metrics.cls !== null) {
      if (metrics.cls > thresholds.cls * 2) score -= 25;
      else if (metrics.cls > thresholds.cls) score -= 10;
    }

    // FCP scoring
    if (metrics.fcp !== null) {
      if (metrics.fcp > thresholds.fcp * 2) score -= 20;
      else if (metrics.fcp > thresholds.fcp) score -= 10;
    }

    return Math.max(0, score);
  }

  private identifyOptimizationOpportunities(): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];
    const metrics = this.webVitals;
    const thresholds = this.config.thresholds;

    if (metrics.lcp && metrics.lcp > thresholds.lcp) {
      opportunities.push({
        title: 'Optimize Largest Contentful Paint',
        description: 'Reduce time to render the largest content element',
        category: 'loading',
        impact: metrics.lcp - thresholds.lcp,
        difficulty: 'medium',
        priority: 'high',
        implementation: 'Optimize images, preload resources, reduce server response times',
        estimatedTime: '2-4 hours'
      });
    }

    if (metrics.fid && metrics.fid > thresholds.fid) {
      opportunities.push({
        title: 'Reduce First Input Delay',
        description: 'Improve responsiveness to user interactions',
        category: 'interactivity',
        impact: metrics.fid - thresholds.fid,
        difficulty: 'hard',
        priority: 'high',
        implementation: 'Break up long tasks, optimize JavaScript execution',
        estimatedTime: '4-8 hours'
      });
    }

    if (metrics.cls && metrics.cls > thresholds.cls) {
      opportunities.push({
        title: 'Improve Cumulative Layout Shift',
        description: 'Reduce unexpected layout shifts',
        category: 'stability',
        impact: (metrics.cls - thresholds.cls) * 100,
        difficulty: 'medium',
        priority: 'medium',
        implementation: 'Set dimensions for images and ads, avoid inserting content',
        estimatedTime: '1-3 hours'
      });
    }

    return opportunities;
  }

  private checkPerformanceBudget(): BudgetViolation[] {
    const violations: BudgetViolation[] = [];
    const budget = this.budget;
    const metrics = this.webVitals;

    // Check metric budgets
    Object.entries(budget.metrics).forEach(([metric, budgetValue]) => {
      const currentValue = (metrics as any)[metric];
      if (currentValue && currentValue > budgetValue) {
        violations.push({
          metric,
          current: currentValue,
          budget: budgetValue,
          violation: currentValue - budgetValue,
          impact: currentValue > budgetValue * 2 ? 'critical' : 
                 currentValue > budgetValue * 1.5 ? 'major' : 'minor'
        });
      }
    });

    return violations;
  }

  private generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [
      {
        title: 'Enable Mental Health Optimized Caching',
        description: 'Cache frequently accessed mental health resources for offline access',
        benefit: 'Faster loading times and offline functionality for crisis situations',
        implementation: [
          'Cache emergency contact information',
          'Cache crisis intervention resources',
          'Cache recent journal entries',
          'Implement background sync for wellness data'
        ],
        priority: 1,
        category: 'Mental Health Specific'
      },
      {
        title: 'Optimize Wellness Dashboard Loading',
        description: 'Prioritize loading of critical mental health components',
        benefit: 'Faster access to mood tracking and crisis resources',
        implementation: [
          'Lazy load non-critical dashboard widgets',
          'Preload crisis support components',
          'Optimize mood tracking form rendering',
          'Cache wellness goals and progress data'
        ],
        priority: 2,
        category: 'User Experience'
      },
      {
        title: 'Implement Progressive Enhancement',
        description: 'Ensure core functionality works without JavaScript',
        benefit: 'Accessibility for users with disabilities and slow connections',
        implementation: [
          'Server-side render critical pages',
          'Provide fallbacks for interactive elements',
          'Ensure form submissions work without JS',
          'Progressive enhancement for animations'
        ],
        priority: 3,
        category: 'Accessibility'
      }
    ];

    return recommendations;
  }

  private getResourcePerformanceData(): ResourcePerformance[] {
    const resources: ResourcePerformance[] = [];
    
    if ('getEntriesByType' in performance) {
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      resourceEntries.forEach(entry => {
        resources.push({
          name: entry.name,
          type: entry.initiatorType,
          size: entry.transferSize || 0,
          duration: entry.duration,
          cached: entry.transferSize === 0,
          protocol: entry.nextHopProtocol || 'unknown',
          timing: {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
            request: entry.responseStart - entry.requestStart,
            response: entry.responseEnd - entry.responseStart
          }
        });
      });
    }
    
    return resources;
  }

  private getNavigationPerformanceData(): NavigationPerformance {
    const defaultNavigation: NavigationPerformance = {
      type: 'navigate',
      duration: 0,
      domContentLoaded: 0,
      loadComplete: 0,
      firstPaint: 0,
      firstContentfulPaint: this.webVitals.fcp || 0,
      largestContentfulPaint: this.webVitals.lcp || 0,
      timeToInteractive: this.webVitals.tti || 0
    };

    if ('getEntriesByType' in performance) {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      
      if (navEntries.length > 0) {
        const nav = navEntries[0];
        return {
          type: nav.type,
          duration: nav.loadEventEnd - nav.fetchStart,
          domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
          loadComplete: nav.loadEventEnd - nav.fetchStart,
          firstPaint: 0, // From paint entries
          firstContentfulPaint: this.webVitals.fcp || 0,
          largestContentfulPaint: this.webVitals.lcp || 0,
          timeToInteractive: this.webVitals.tti || 0
        };
      }
    }

    return defaultNavigation;
  }

  // Public API
  public async applyOptimizations(): Promise<void> {
    const enabledOptimizations = this.optimizations.filter(opt => opt.enabled);
    
    for (const optimization of enabledOptimizations) {
      try {
        await optimization.implementation();
        console.log(`Applied optimization: ${optimization.name}`);
      } catch (error) {
        console.error(`Failed to apply optimization ${optimization.name}:`, error);
      }
    }
  }

  public getMetrics(): Map<string, PerformanceMetric[]> {
    return new Map(this.metrics);
  }

  public getWebVitals(): WebVitalsMetrics {
    return { ...this.webVitals };
  }

  public markCustomTiming(name: string): void {
    if ('mark' in performance) {
      performance.mark(name);
    }
  }

  public measureCustomTiming(name: string, startMark: string, endMark?: string): void {
    if ('measure' in performance) {
      performance.measure(name, startMark, endMark);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics.clear();
  }
}