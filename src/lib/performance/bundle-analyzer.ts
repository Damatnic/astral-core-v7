/**
 * Bundle Analyzer Utility
 * Monitors and reports on bundle size and loading performance
 */

'use client';

interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  components: string[];
  timestamp: number;
}

interface ChunkInfo {
  name: string;
  size: number;
  loaded: boolean;
  loadTime?: number;
}

class BundleAnalyzer {
  private metrics: PerformanceMetrics[] = [];
  private chunks: Map<string, ChunkInfo> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor navigation timing
    if ('performance' in window && 'getEntriesByType' in performance) {
      this.setupResourceObserver();
      this.setupNavigationObserver();
    }
  }

  private setupResourceObserver() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource' && entry.name.includes('chunks')) {
          this.trackChunkLoad(entry as PerformanceResourceTiming);
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
    this.observers.set('resource', observer);
  }

  private setupNavigationObserver() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          this.trackPageLoad(entry as PerformanceNavigationTiming);
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });
    this.observers.set('navigation', observer);
  }

  private trackChunkLoad(entry: PerformanceResourceTiming) {
    const chunkName = this.extractChunkName(entry.name);
    const size = entry.transferSize || entry.encodedBodySize || 0;
    const loadTime = entry.duration;

    this.chunks.set(chunkName, {
      name: chunkName,
      size,
      loaded: true,
      loadTime
    });

    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Chunk loaded: ${chunkName}, Size: ${this.formatSize(size)}, Load time: ${loadTime.toFixed(2)}ms`
      );
    }
  }

  private trackPageLoad(entry: PerformanceNavigationTiming) {
    const loadTime = entry.duration;
    const components = Array.from(this.chunks.keys());

    this.metrics.push({
      bundleSize: this.getTotalBundleSize(),
      loadTime,
      components,
      timestamp: Date.now()
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Page load complete: ${loadTime.toFixed(2)}ms, Bundle size: ${this.formatSize(this.getTotalBundleSize())}`
      );
    }
  }

  private extractChunkName(url: string): string {
    const match = url.match(/([^\/]+)\.chunk\.js$/);
    return match?.[1] ?? 'unknown';
  }

  private getTotalBundleSize(): number {
    return Array.from(this.chunks.values()).reduce((total, chunk) => total + chunk.size, 0);
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Public methods
  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public getChunkInfo(): ChunkInfo[] {
    return Array.from(this.chunks.values());
  }

  public getCurrentBundleSize(): number {
    return this.getTotalBundleSize();
  }

  public getFormattedBundleSize(): string {
    return this.formatSize(this.getTotalBundleSize());
  }

  public trackComponentLoad(componentName: string, startTime: number) {
    const loadTime = performance.now() - startTime;

    if (process.env.NODE_ENV === 'development') {
      console.log(`Component loaded: ${componentName}, Load time: ${loadTime.toFixed(2)}ms`);
    }

    return loadTime;
  }

  public generateReport(): {
    totalSize: string;
    loadTime: number;
    chunkCount: number;
    largestChunks: ChunkInfo[];
    recommendations: string[];
  } {
    const chunks = this.getChunkInfo();
    const largestChunks = chunks.sort((a, b) => b.size - a.size).slice(0, 5);

    const recommendations: string[] = [];

    // Generate recommendations
    if (this.getTotalBundleSize() > 1024 * 1024) {
      recommendations.push('Consider implementing more aggressive code splitting');
    }

    if (largestChunks.some(chunk => chunk.size > 500 * 1024)) {
      recommendations.push('Some chunks are over 500KB - consider breaking them down further');
    }

    const avgLoadTime =
      this.metrics.length > 0
        ? this.metrics.reduce((sum, m) => sum + m.loadTime, 0) / this.metrics.length
        : 0;

    if (avgLoadTime > 3000) {
      recommendations.push('Average load time is over 3 seconds - optimize critical path');
    }

    return {
      totalSize: this.getFormattedBundleSize(),
      loadTime: avgLoadTime,
      chunkCount: chunks.length,
      largestChunks,
      recommendations
    };
  }

  public exportData(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        chunks: Array.from(this.chunks.entries()),
        report: this.generateReport()
      },
      null,
      2
    );
  }

  public cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Singleton instance
let bundleAnalyzer: BundleAnalyzer | null = null;

export function getBundleAnalyzer(): BundleAnalyzer {
  if (!bundleAnalyzer) {
    bundleAnalyzer = new BundleAnalyzer();
  }
  return bundleAnalyzer;
}

// Hook for React components
export function useBundleAnalyzer() {
  const analyzer = getBundleAnalyzer();

  return {
    trackComponentLoad: analyzer.trackComponentLoad.bind(analyzer),
    getCurrentBundleSize: analyzer.getCurrentBundleSize.bind(analyzer),
    getFormattedBundleSize: analyzer.getFormattedBundleSize.bind(analyzer),
    generateReport: analyzer.generateReport.bind(analyzer)
  };
}

// Development helper
export function logPerformanceReport() {
  if (process.env.NODE_ENV === 'development') {
    const analyzer = getBundleAnalyzer();
    const report = analyzer.generateReport();

    console.group('Bundle Performance Report');
    console.log('Total Bundle Size:', report.totalSize);
    console.log('Average Load Time:', report.loadTime.toFixed(2) + 'ms');
    console.log('Chunk Count:', report.chunkCount);
    console.log('Largest Chunks:', report.largestChunks);
    console.log('Recommendations:', report.recommendations);
    console.groupEnd();
  }
}
