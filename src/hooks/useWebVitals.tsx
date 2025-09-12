/**
 * Web Vitals Optimization Hook
 * Tracks and optimizes Core Web Vitals performance metrics
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePerformanceTracking } from './usePerformanceTracking';

// Web Vitals metric types
interface WebVitalsMetric {
  name: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  entries: PerformanceEntry[];
}

interface WebVitalsState {
  cls: WebVitalsMetric | null;
  fcp: WebVitalsMetric | null;
  fid: WebVitalsMetric | null;
  lcp: WebVitalsMetric | null;
  ttfb: WebVitalsMetric | null;
  inp: WebVitalsMetric | null;
}

// Thresholds for Web Vitals ratings
const WEB_VITALS_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 600, poor: 1500 },
  INP: { good: 200, poor: 500 },
} as const;

// Get rating based on thresholds
const getRating = (name: keyof typeof WEB_VITALS_THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds = WEB_VITALS_THRESHOLDS[name];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
};

export const useWebVitals = () => {
  const [vitals, setVitals] = useState<WebVitalsState>({
    cls: null,
    fcp: null,
    fid: null,
    lcp: null,
    ttfb: null,
    inp: null,
  });

  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const performanceTracking = usePerformanceTracking();
  const metricsReported = useRef<Set<string>>(new Set());

  // Initialize Web Vitals tracking
  useEffect(() => {
    let webVitalsPromise: Promise<any> | null = null;

    const initWebVitals = async () => {
      try {
        // Dynamic import to avoid SSR issues and reduce bundle size
        const webVitals = await import('web-vitals');
        setIsSupported(true);

        // Create metric handler
        const handleMetric = (metric: WebVitalsMetric) => {
          const rating = getRating(metric.name, metric.value);
          const enhancedMetric = { ...metric, rating };

          // Update state
          setVitals(prev => ({
            ...prev,
            [metric.name.toLowerCase()]: enhancedMetric
          }));

          // Report to performance tracking (avoid duplicates)
          const metricKey = `${metric.name}-${metric.id}`;
          if (!metricsReported.current.has(metricKey)) {
            metricsReported.current.add(metricKey);
            
            performanceTracking.recordMetric(
              `web_vital_${metric.name.toLowerCase()}`,
              metric.value,
              {
                rating,
                url: window.location.pathname,
                timestamp: Date.now()
              }
            );

            // Send to monitoring API
            sendToMonitoringAPI(enhancedMetric);
          }

          // Trigger performance optimizations for poor metrics
          if (rating === 'poor') {
            handlePoorPerformance(enhancedMetric);
          }
        };

        // Initialize all Web Vitals
        webVitals.getCLS(handleMetric, { reportAllChanges: false });
        webVitals.getFCP(handleMetric);
        webVitals.getFID(handleMetric);
        webVitals.getLCP(handleMetric, { reportAllChanges: false });
        webVitals.getTTFB(handleMetric);

        // INP is newer and might not be available
        if ('getINP' in webVitals) {
          (webVitals as any).getINP(handleMetric);
        }

        console.info('Web Vitals tracking initialized');
      } catch (error) {
        console.warn('Web Vitals not available:', error);
        setIsSupported(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Only initialize on client side
    if (typeof window !== 'undefined') {
      webVitalsPromise = initWebVitals();
    } else {
      setIsLoading(false);
    }

    return () => {
      // Cleanup if needed
      if (webVitalsPromise) {
        webVitalsPromise.catch(() => {});
      }
    };
  }, []);

  // Send metrics to monitoring API
  const sendToMonitoringAPI = async (metric: WebVitalsMetric) => {
    try {
      await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'web-vitals',
          data: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            sessionId: performanceTracking.getSessionId?.() || 'unknown',
            vitals: {
              [metric.name.toLowerCase()]: metric.value
            },
            metadata: {
              timestamp: Date.now(),
              rating: metric.rating,
              entries: metric.entries.length,
              connectionType: (navigator as any).connection?.effectiveType || 'unknown',
              deviceMemory: (navigator as any).deviceMemory || 'unknown',
            }
          }
        })
      });
    } catch (error) {
      console.debug('Failed to send Web Vitals to API:', error);
    }
  };

  // Handle poor performance by triggering optimizations
  const handlePoorPerformance = (metric: WebVitalsMetric) => {
    console.warn(`Poor ${metric.name} detected:`, metric);

    switch (metric.name) {
      case 'LCP':
        // Largest Contentful Paint optimization
        optimizeLCP();
        break;
      case 'FID':
        // First Input Delay optimization
        optimizeFID();
        break;
      case 'CLS':
        // Cumulative Layout Shift optimization
        optimizeCLS();
        break;
      case 'FCP':
        // First Contentful Paint optimization
        optimizeFCP();
        break;
      case 'TTFB':
        // Time to First Byte optimization
        optimizeTTFB();
        break;
      case 'INP':
        // Interaction to Next Paint optimization
        optimizeINP();
        break;
    }
  };

  // Optimization strategies for different metrics
  const optimizeLCP = () => {
    // Preload critical resources
    const images = document.querySelectorAll('img[data-priority="high"]');
    images.forEach(img => {
      if (img instanceof HTMLImageElement && img.loading !== 'eager') {
        img.loading = 'eager';
      }
    });

    // Report optimization attempt
    performanceTracking.recordMetric('lcp_optimization_attempted', 1);
  };

  const optimizeFID = () => {
    // Defer non-critical JavaScript
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        // Move heavy operations to idle time
        const heavyScripts = document.querySelectorAll('script[data-defer="true"]');
        heavyScripts.forEach(script => {
          if (script instanceof HTMLScriptElement) {
            script.defer = true;
          }
        });
      });
    }

    performanceTracking.recordMetric('fid_optimization_attempted', 1);
  };

  const optimizeCLS = () => {
    // Add size attributes to images without dimensions
    const images = document.querySelectorAll('img:not([width]):not([height])');
    images.forEach(img => {
      if (img instanceof HTMLImageElement) {
        // Set placeholder dimensions to prevent layout shift
        if (!img.style.aspectRatio && !img.width && !img.height) {
          img.style.aspectRatio = '16/9'; // Default aspect ratio
        }
      }
    });

    performanceTracking.recordMetric('cls_optimization_attempted', 1);
  };

  const optimizeFCP = () => {
    // Optimize critical CSS
    const criticalCSS = document.querySelector('style[data-critical]');
    if (criticalCSS) {
      criticalCSS.remove();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/css/critical.css';
      link.media = 'print';
      link.onload = () => { link.media = 'all'; };
      document.head.appendChild(link);
    }

    performanceTracking.recordMetric('fcp_optimization_attempted', 1);
  };

  const optimizeTTFB = () => {
    // Enable keep-alive for future requests
    if ('fetch' in window) {
      const originalFetch = window.fetch;
      window.fetch = (input: RequestInfo, init?: RequestInit) => {
        return originalFetch(input, {
          ...init,
          keepalive: true,
          ...(init || {})
        });
      };
    }

    performanceTracking.recordMetric('ttfb_optimization_attempted', 1);
  };

  const optimizeINP = () => {
    // Add passive event listeners for better responsiveness
    const scrollElements = document.querySelectorAll('[data-scroll-optimization]');
    scrollElements.forEach(element => {
      const existingListeners = (element as any)._listeners || [];
      if (!existingListeners.includes('scroll-optimized')) {
        element.addEventListener('scroll', () => {}, { passive: true });
        (element as any)._listeners = [...existingListeners, 'scroll-optimized'];
      }
    });

    performanceTracking.recordMetric('inp_optimization_attempted', 1);
  };

  // Get overall performance score
  const getPerformanceScore = (): number => {
    const scores = Object.values(vitals).filter(Boolean).map(metric => {
      if (!metric) return 0;
      switch (metric.rating) {
        case 'good': return 100;
        case 'needs-improvement': return 65;
        case 'poor': return 25;
        default: return 0;
      }
    });

    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };

  // Get recommendations based on current metrics
  const getRecommendations = (): string[] => {
    const recommendations: string[] = [];
    
    if (vitals.lcp && vitals.lcp.rating === 'poor') {
      recommendations.push('Optimize images and preload critical resources to improve LCP');
    }
    
    if (vitals.cls && vitals.cls.rating === 'poor') {
      recommendations.push('Add size attributes to images and reserve space for dynamic content');
    }
    
    if (vitals.fid && vitals.fid.rating === 'poor') {
      recommendations.push('Reduce JavaScript execution time and use code splitting');
    }

    if (vitals.ttfb && vitals.ttfb.rating === 'poor') {
      recommendations.push('Optimize server response time and use CDN');
    }

    return recommendations;
  };

  return {
    // State
    vitals,
    isSupported,
    isLoading,
    
    // Computed values
    performanceScore: getPerformanceScore(),
    recommendations: getRecommendations(),
    
    // Methods
    triggerOptimization: (metric: keyof WebVitalsState) => {
      const metricData = vitals[metric];
      if (metricData) {
        handlePoorPerformance(metricData);
      }
    },
    
    // Export data for analysis
    exportData: () => ({
      vitals: Object.fromEntries(
        Object.entries(vitals)
          .filter(([_, metric]) => metric !== null)
          .map(([name, metric]) => [name, {
            value: metric?.value,
            rating: metric?.rating,
            timestamp: Date.now()
          }])
      ),
      performanceScore: getPerformanceScore(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
    })
  };
};

export default useWebVitals;