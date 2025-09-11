'use client';

/**
 * Performance Tracking Hook
 * Monitors and tracks lazy loading performance metrics
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  componentLoadTime: number;
  bundleSize?: number;
  renderTime: number;
  interactionTime?: number;
}

interface UsePerformanceTrackingOptions {
  componentName: string;
  trackBundleSize?: boolean;
  trackInteraction?: boolean;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

interface FirstInputPerformanceEntry extends PerformanceEntry {
  processingStart: number;
  startTime: number;
}

interface LayoutShiftPerformanceEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

export const usePerformanceTracking = ({
  componentName,
  trackBundleSize = false,
  trackInteraction = false,
  onMetrics
}: UsePerformanceTrackingOptions) => {
  const startTimeRef = useRef<number>(0);
  const renderStartRef = useRef<number>(0);
  const componentMountedRef = useRef(false);

  // Start tracking when component begins loading
  const startTracking = useCallback(() => {
    if (typeof window !== 'undefined') {
      startTimeRef.current = performance.now();
      renderStartRef.current = performance.now();
      performance.mark(`${componentName}-load-start`);
    }
  }, [componentName]);

  // Track component load completion
  const trackLoadComplete = useCallback(() => {
    if (!startTimeRef.current) return;
    
    const loadTime = performance.now() - startTimeRef.current;
    
    if (typeof window !== 'undefined') {
      performance.mark(`${componentName}-load-end`);
      performance.measure(
        `${componentName}-load-time`,
        `${componentName}-load-start`,
        `${componentName}-load-end`
      );
    }
    
    return loadTime;
  }, [componentName]);

  // Track render completion
  const trackRenderComplete = useCallback(() => {
    if (!renderStartRef.current) return;
    
    const renderTime = performance.now() - renderStartRef.current;
    
    if (typeof window !== 'undefined') {
      performance.mark(`${componentName}-render-end`);
    }
    
    return renderTime;
  }, [componentName]);

  // Track first interaction
  const trackInteractionTime = useCallback(() => {
    if (!trackInteraction || !startTimeRef.current) return;
    
    const interactionTime = performance.now() - startTimeRef.current;
    
    if (typeof window !== 'undefined') {
      performance.mark(`${componentName}-interaction`);
    }
    
    return interactionTime;
  }, [componentName, trackInteraction]);

  // Get bundle size information
  const getBundleSize = useCallback(async () => {
    if (!trackBundleSize || typeof window === 'undefined') return;
    
    try {
      // Use Resource Timing API to estimate bundle size
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const relevantResources = resources.filter(resource => 
        resource.name.includes(componentName.toLowerCase()) ||
        resource.name.includes('chunk')
      );
      
      const totalSize = relevantResources.reduce((total, resource) => {
        return total + (resource.transferSize || 0);
      }, 0);
      
      return totalSize;
    } catch (error) {
      console.warn('Could not calculate bundle size:', error);
      return undefined;
    }
  }, [componentName, trackBundleSize]);

  // Effect to handle component mount and unmount
  useEffect(() => {
    componentMountedRef.current = true;
    
    const renderTime = trackRenderComplete();
    const loadTime = trackLoadComplete();
    
    // Collect metrics asynchronously
    const collectMetrics = async () => {
      const bundleSize = await getBundleSize();
      
      if (loadTime !== undefined && renderTime !== undefined) {
        const metrics: PerformanceMetrics = {
          componentLoadTime: loadTime,
          renderTime,
          ...(bundleSize && { bundleSize })
        };
        
        // Call the metrics callback if provided
        onMetrics?.(metrics);
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.group(`🚀 Performance Metrics: ${componentName}`);
          console.log(`Load Time: ${loadTime.toFixed(2)}ms`);
          console.log(`Render Time: ${renderTime.toFixed(2)}ms`);
          if (bundleSize) {
            console.log(`Bundle Size: ${(bundleSize / 1024).toFixed(2)}KB`);
          }
          console.groupEnd();
        }
      }
    };
    
    collectMetrics();
    
    return () => {
      componentMountedRef.current = false;
      
      // Clean up performance marks
      if (typeof window !== 'undefined') {
        try {
          performance.clearMarks(`${componentName}-load-start`);
          performance.clearMarks(`${componentName}-load-end`);
          performance.clearMarks(`${componentName}-render-end`);
          performance.clearMarks(`${componentName}-interaction`);
          performance.clearMeasures(`${componentName}-load-time`);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [componentName, trackLoadComplete, trackRenderComplete, getBundleSize, onMetrics]);

  return {
    startTracking,
    trackLoadComplete,
    trackRenderComplete,
    trackInteractionTime,
    isComponentMounted: componentMountedRef.current
  };
};

/**
 * Higher-order component to automatically track performance
 */
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
  options: Omit<UsePerformanceTrackingOptions, 'componentName'> = {}
) => {
  const PerformanceTrackedComponent = (props: P) => {
    const { startTracking } = usePerformanceTracking({
      componentName,
      ...options
    });
    
    // Start tracking immediately
    useEffect(() => {
      startTracking();
    }, [startTracking]);
    
    return <Component {...props} />;
  };
  
  PerformanceTrackedComponent.displayName = `PerformanceTracked(${componentName})`;
  
  return PerformanceTrackedComponent;
};

/**
 * Hook for tracking Core Web Vitals
 */
export const useWebVitalsTracking = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Track Largest Contentful Paint (LCP)
    const observeLCP = () => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          if (lastEntry && process.env.NODE_ENV === 'development') {
            console.log(`LCP: ${lastEntry.startTime.toFixed(2)}ms`);
          }
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        
        return () => observer.disconnect();
      } catch (error) {
        console.warn('LCP tracking not supported:', error);
        return undefined;
      }
    };
    
    // Track First Input Delay (FID)
    const observeFID = () => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (process.env.NODE_ENV === 'development') {
              const fidEntry = entry as FirstInputPerformanceEntry;
              const fidValue = fidEntry.processingStart - fidEntry.startTime;
              console.log(`FID: ${fidValue}ms`);
            }
          });
        });
        
        observer.observe({ entryTypes: ['first-input'] });
        
        return () => observer.disconnect();
      } catch (error) {
        console.warn('FID tracking not supported:', error);
        return undefined;
      }
    };
    
    // Track Cumulative Layout Shift (CLS)
    const observeCLS = () => {
      try {
        let clsValue = 0;
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const clsEntry = entry as LayoutShiftPerformanceEntry;
            if (!clsEntry.hadRecentInput) {
              clsValue += clsEntry.value;
            }
          });
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`CLS: ${clsValue.toFixed(4)}`);
          }
        });
        
        observer.observe({ entryTypes: ['layout-shift'] });
        
        return () => observer.disconnect();
      } catch (error) {
        console.warn('CLS tracking not supported:', error);
        return undefined;
      }
    };
    
    const cleanup = [observeLCP(), observeFID(), observeCLS()].filter(Boolean);
    
    return () => {
      cleanup.forEach(fn => fn?.());
    };
  }, []);
};