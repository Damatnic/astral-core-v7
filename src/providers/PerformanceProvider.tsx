/**
 * Performance Monitoring Provider
 * Global performance monitoring integration for the application
 */

'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { getPerformanceMetricsCollector } from '@/lib/performance/metrics';
import { getWebVitalsMonitor, sendVitalsToAnalytics } from '@/lib/performance/web-vitals';
import { getErrorMonitor, requestNotificationPermission } from '@/lib/performance/error-monitoring';
import { getDatabaseMonitor } from '@/lib/performance/db-monitoring';

interface PerformanceContextType {
  metricsCollector: ReturnType<typeof getPerformanceMetricsCollector>;
  webVitalsMonitor: ReturnType<typeof getWebVitalsMonitor>;
  errorMonitor: ReturnType<typeof getErrorMonitor>;
  databaseMonitor: ReturnType<typeof getDatabaseMonitor>;
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

export function usePerformanceContext() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformanceContext must be used within a PerformanceProvider');
  }
  return context;
}

interface PerformanceProviderProps {
  children: React.ReactNode;
  enableAnalytics?: boolean;
  enableNotifications?: boolean;
  analyticsEndpoint?: string;
  debugMode?: boolean;
}

export function PerformanceProvider({
  children,
  enableAnalytics = true,
  enableNotifications = true,
  analyticsEndpoint = '/api/analytics/performance',
  debugMode = false
}: PerformanceProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize all monitoring systems
    const metricsCollector = getPerformanceMetricsCollector();
    const webVitalsMonitor = getWebVitalsMonitor();
    const errorMonitor = getErrorMonitor();
    const databaseMonitor = getDatabaseMonitor();

    // Set up Web Vitals analytics
    if (enableAnalytics) {
      const unsubscribe = webVitalsMonitor.subscribe((vitals) => {
        // Send vitals to analytics after a delay to ensure all metrics are collected
        setTimeout(() => {
          sendVitalsToAnalytics(vitals, analyticsEndpoint);
        }, 2000);
      });

      // Clean up subscription on unmount
      return () => {
        unsubscribe();
      };
    }

    // Request notification permissions for error alerts
    if (enableNotifications) {
      requestNotificationPermission();
    }

    // Set up API monitoring interceptor
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      
      window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method || 'GET';
        const startTime = performance.now();

        try {
          const response = await originalFetch(input, init);
          const duration = performance.now() - startTime;
          
          // Track API performance
          if (url.includes('/api/')) {
            metricsCollector.trackApiCall(
              url,
              method,
              duration,
              response.status,
              parseInt(response.headers.get('content-length') || '0')
            );
          }

          return response;
        } catch (error) {
          const duration = performance.now() - startTime;
          
          // Track failed API calls
          if (url.includes('/api/')) {
            metricsCollector.trackApiCall(
              url,
              method,
              duration,
              0, // Error status
              0
            );

            // Also capture as error
            errorMonitor.captureError({
              message: `API Error: ${method} ${url}`,
              type: 'network',
              severity: 'high',
              context: {
                url,
                method,
                duration,
                error: error instanceof Error ? error.message : String(error)
              }
            });
          }

          throw error;
        }
      };

      // Restore original fetch on cleanup
      return () => {
        window.fetch = originalFetch;
      };
    }

    // Debug mode logging
    if (debugMode && process.env.NODE_ENV === 'development') {
      const logPerformanceData = () => {
        const webVitalsData = webVitalsMonitor.exportData();
        const errorData = errorMonitor.exportData();
        const dbData = databaseMonitor.exportData();
        
        console.group('Performance Debug Report');
        console.log('Web Vitals:', webVitalsData);
        console.log('Errors:', errorData);
        console.log('Database:', dbData);
        console.groupEnd();
      };

      // Log performance data every 30 seconds in debug mode
      const debugInterval = setInterval(logPerformanceData, 30000);
      
      return () => {
        clearInterval(debugInterval);
      };
    }

    // Return undefined if no cleanup is needed
    return undefined;
  }, [enableAnalytics, enableNotifications, analyticsEndpoint, debugMode]);

  const contextValue: PerformanceContextType = {
    metricsCollector: getPerformanceMetricsCollector(),
    webVitalsMonitor: getWebVitalsMonitor(),
    errorMonitor: getErrorMonitor(),
    databaseMonitor: getDatabaseMonitor()
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
}

// Higher-order component for performance monitoring
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  return function PerformanceMonitoredComponent(props: P) {
    const startTime = useRef(performance.now());
    const { errorMonitor } = usePerformanceContext();

    useEffect(() => {
      const loadTime = performance.now() - startTime.current;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`${name} rendered in ${loadTime.toFixed(2)}ms`);
      }

      // Track slow component renders
      if (loadTime > 100) {
        console.warn(`Slow component render: ${name} took ${loadTime.toFixed(2)}ms`);
      }
    });

    // Error boundary functionality
    useEffect(() => {
      const handleError = (error: Error) => {
        errorMonitor.captureError({
          message: `Component Error in ${name}: ${error.message}`,
          ...(error.stack && { stack: error.stack }),
          type: 'javascript',
          severity: 'high',
          context: {
            componentName: name,
            props: process.env.NODE_ENV === 'development' ? props : undefined
          }
        });
      };

      const errorHandler = (event: ErrorEvent) => {
        if (event.error) {
          handleError(event.error);
        }
      };

      window.addEventListener('error', errorHandler);

      return () => {
        window.removeEventListener('error', errorHandler);
      };
    }, [errorMonitor, props]);

    return <WrappedComponent {...props} />;
  };
}

// Hook for tracking custom performance events
export function usePerformanceTracking() {
  const { metricsCollector, errorMonitor, databaseMonitor } = usePerformanceContext();

  const trackCustomEvent = (eventName: string, duration: number, metadata?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Custom event: ${eventName} took ${duration}ms`, metadata);
    }

    // Log slow custom events as potential performance issues
    if (duration > 1000) {
      errorMonitor.captureError({
        message: `Slow custom event: ${eventName} took ${duration}ms`,
        type: 'custom',
        severity: duration > 5000 ? 'high' : 'medium',
        context: {
          eventName,
          duration,
          metadata
        }
      });
    }
  };

  const trackAsyncOperation = async function<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      trackCustomEvent(operationName, duration, { success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      errorMonitor.captureError({
        message: `Async operation failed: ${operationName}`,
        type: 'custom',
        severity: 'high',
        context: {
          operationName,
          duration,
          error: error instanceof Error ? error.message : String(error)
        }
      });

      throw error;
    }
  };

  return {
    trackCustomEvent,
    trackAsyncOperation,
    trackApiCall: metricsCollector.trackApiCall,
    captureError: errorMonitor.captureError,
    trackQuery: databaseMonitor.trackQuery
  };
}

// Component performance measurement hook
export function useComponentPerformance(componentName: string) {
  const renderStartTime = useRef(performance.now());
  const mountTime = useRef<number | null>(null);
  const { errorMonitor } = usePerformanceContext();

  useEffect(() => {
    // Track mount time
    mountTime.current = performance.now();
    const totalMountTime = mountTime.current - renderStartTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} mounted in ${totalMountTime.toFixed(2)}ms`);
    }

    // Track slow mounts
    if (totalMountTime > 200) {
      errorMonitor.captureError({
        message: `Slow component mount: ${componentName} took ${totalMountTime.toFixed(2)}ms`,
        type: 'custom',
        severity: totalMountTime > 1000 ? 'high' : 'medium',
        context: {
          componentName,
          mountTime: totalMountTime,
          phase: 'mount'
        }
      });
    }

    return () => {
      if (mountTime.current) {
        const unmountTime = performance.now();
        const totalLifetime = unmountTime - mountTime.current;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`${componentName} was mounted for ${totalLifetime.toFixed(2)}ms`);
        }
      }
    };
  }, [componentName, errorMonitor]);

  const trackRerender = () => {
    const rerenderTime = performance.now() - renderStartTime.current;
    
    if (process.env.NODE_ENV === 'development' && rerenderTime > 50) {
      console.warn(`${componentName} slow rerender: ${rerenderTime.toFixed(2)}ms`);
    }
    
    renderStartTime.current = performance.now();
  };

  return { trackRerender };
}