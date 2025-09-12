/**
 * Performance Optimization Utilities
 * Provides tools for optimizing app performance and monitoring
 */

import { cache } from 'react';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  duration: number;
  timestamp: number;
  name: string;
  metadata?: Record<string, unknown>;
}

/**
 * Memory cache with TTL support
 */
export class MemoryCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly defaultTTL: number = 300000) {} // 5 minutes default

  /**
   * Get value from cache
   */
  public get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) return undefined;
    
    if (Date.now() > item.expires) {
      this.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  /**
   * Set value in cache with optional TTL
   */
  public set(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    
    // Clear existing timer if present
    this.clearTimer(key);
    
    this.cache.set(key, { value, expires });
    
    // Set auto-cleanup timer
    const timer = setTimeout(() => this.delete(key), ttl || this.defaultTTL);
    this.timers.set(key, timer);
  }

  /**
   * Delete value from cache
   */
  public delete(key: string): boolean {
    this.clearTimer(key);
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  public get size(): number {
    return this.cache.size;
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    maxSize?: number;
    ttl?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const {
    maxSize = 100,
    ttl = 300000, // 5 minutes
    keyGenerator = (...args) => JSON.stringify(args)
  } = options;

  const cache = new Map<string, { value: ReturnType<T>; expires: number }>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);

    if (cached && Date.now() < cached.expires) {
      return cached.value;
    }

    const result = fn(...args);
    
    // Implement LRU if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, {
      value: result,
      expires: Date.now() + ttl
    });

    return result;
  }) as T;
}

/**
 * Lazy load component or module
 */
export function lazyLoad<T>(
  loader: () => Promise<T>,
  options: {
    timeout?: number;
    fallback?: T;
  } = {}
): () => Promise<T> {
  const { timeout = 10000, fallback } = options;
  let promise: Promise<T> | null = null;

  return async () => {
    if (!promise) {
      promise = Promise.race([
        loader(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Lazy load timeout')), timeout)
        )
      ]).catch(error => {
        promise = null; // Reset on error
        if (fallback !== undefined) {
          return fallback;
        }
        throw error;
      });
    }

    return promise;
  };
}

/**
 * Batch operations for better performance
 */
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    private readonly processor: (items: T[]) => Promise<R[]>,
    private readonly options: {
      maxBatchSize?: number;
      maxWaitTime?: number;
      onError?: (error: Error) => void;
    } = {}
  ) {}

  /**
   * Add item to batch
   */
  public async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.batch.push(item);

      const processBatch = async () => {
        if (this.processing) return;
        
        this.processing = true;
        const currentBatch = [...this.batch];
        this.batch = [];

        try {
          const results = await this.processor(currentBatch);
          // Assuming results are in the same order as batch
          resolve(results[currentBatch.indexOf(item)]);
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Batch processing failed');
          this.options.onError?.(err);
          reject(err);
        } finally {
          this.processing = false;
        }
      };

      // Process immediately if batch is full
      if (this.batch.length >= (this.options.maxBatchSize || 10)) {
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = null;
        }
        processBatch();
      } else if (!this.timer) {
        // Set timer for max wait time
        this.timer = setTimeout(() => {
          this.timer = null;
          processBatch();
        }, this.options.maxWaitTime || 100);
      }
    });
  }

  /**
   * Force process current batch
   */
  public async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.batch.length > 0) {
      const currentBatch = [...this.batch];
      this.batch = [];
      await this.processor(currentBatch);
    }
  }
}

/**
 * Performance monitor
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics: number;

  constructor(maxMetrics = 1000) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * Measure function execution time
   */
  public async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.record({
        name,
        duration,
        timestamp: Date.now(),
        metadata
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.record({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, error: true }
      });
      
      throw error;
    }
  }

  /**
   * Record performance metric
   */
  private record(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only latest metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Get performance statistics
   */
  public getStats(name?: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const filtered = name 
      ? this.metrics.filter(m => m.name === name)
      : this.metrics;

    if (filtered.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const durations = filtered.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);

    return {
      count: durations.length,
      average: sum / durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      p50: this.percentile(durations, 0.5),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99)
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Clear all metrics
   */
  public clear(): void {
    this.metrics = [];
  }
}

/**
 * Virtual scrolling helper
 */
export function calculateVisibleItems<T>(
  items: T[],
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  overscan = 3
): {
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  offsetY: number;
} {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  return {
    visibleItems: items.slice(startIndex, endIndex + 1),
    startIndex,
    endIndex,
    offsetY: startIndex * itemHeight
  };
}

/**
 * Request idle callback polyfill
 */
export const requestIdleCallback = 
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (callback: IdleRequestCallback) => setTimeout(callback, 1);

export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : clearTimeout;

/**
 * Defer non-critical work
 */
export function deferWork(
  work: () => void,
  options: { timeout?: number } = {}
): number {
  return requestIdleCallback(work, options) as number;
}

/**
 * React cache wrapper for server components
 */
export const cachedFetch = cache(async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.statusText}`);
  }
  return response.json();
});

/**
 * Image optimization helper
 */
export function getOptimizedImageUrl(
  src: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
  } = {}
): string {
  const params = new URLSearchParams();
  
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.quality) params.set('q', options.quality.toString());
  if (options.format) params.set('fm', options.format);
  
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}${params.toString()}`;
}

/**
 * Connection speed detector
 */
export function getConnectionSpeed(): 'slow' | 'medium' | 'fast' | 'unknown' {
  if (typeof window === 'undefined' || !('connection' in navigator)) {
    return 'unknown';
  }

  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType;

  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'slow';
    case '3g':
      return 'medium';
    case '4g':
      return 'fast';
    default:
      return 'unknown';
  }
}

/**
 * Intersection observer for lazy loading
 */
export function createLazyLoadObserver(
  onIntersect: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        onIntersect(entry);
      }
    });
  }, {
    rootMargin: '50px',
    threshold: 0.01,
    ...options
  });
}

export default {
  MemoryCache,
  debounce,
  throttle,
  memoize,
  lazyLoad,
  BatchProcessor,
  PerformanceMonitor,
  calculateVisibleItems,
  requestIdleCallback,
  cancelIdleCallback,
  deferWork,
  cachedFetch,
  getOptimizedImageUrl,
  getConnectionSpeed,
  createLazyLoadObserver
};