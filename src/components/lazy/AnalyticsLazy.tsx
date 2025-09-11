/**
 * Lazy-loaded Analytics Components
 * Code splitting for analytics dashboard and related heavy components
 */

'use client';

import React, { Suspense } from 'react';
import LoadingFallback from '@/components/ui/LoadingFallback';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load large analytics components
const AnalyticsDashboard = React.lazy(() => import('@/components/AnalyticsDashboard'));
const PerformanceDashboard = React.lazy(() => 
  import('@/components/performance/PerformanceDashboard')
);
const WebVitalsMonitor = React.lazy(() => 
  import('@/components/performance/WebVitalsMonitor')
);
const DatabaseMonitor = React.lazy(() => 
  import('@/components/performance/DatabaseMonitor')
);
const ErrorMonitor = React.lazy(() => 
  import('@/components/performance/ErrorMonitor')
);

// Higher-order component for consistent loading and error handling
const withAnalyticsLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage?: string,
  minHeight: string = 'min-h-[500px]'
) => {
  const LazyAnalyticsComponent = (props: P) => (
    <ErrorBoundary>
      <Suspense
        fallback={
          <LoadingFallback
            variant='skeleton'
            size='lg'
            {...(loadingMessage && { message: loadingMessage })}
            className={minHeight}
          />
        }
      >
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  LazyAnalyticsComponent.displayName = `LazyAnalytics(${
    Component.displayName || Component.name || 'Component'
  })`;

  return LazyAnalyticsComponent;
};

// Wrapped lazy analytics components
export const LazyAnalyticsDashboard = withAnalyticsLoading(
  AnalyticsDashboard,
  'Loading analytics dashboard...',
  'min-h-[600px]'
);

export const LazyPerformanceDashboard = withAnalyticsLoading(
  PerformanceDashboard,
  'Loading performance dashboard...',
  'min-h-[700px]'
);

export const LazyWebVitalsMonitor = withAnalyticsLoading(
  WebVitalsMonitor,
  'Loading web vitals monitor...',
  'min-h-[400px]'
);

export const LazyDatabaseMonitor = withAnalyticsLoading(
  DatabaseMonitor,
  'Loading database monitor...',
  'min-h-[400px]'
);

export const LazyErrorMonitor = withAnalyticsLoading(
  ErrorMonitor,
  'Loading error monitor...',
  'min-h-[400px]'
);

// Preload functions for better UX
export const preloadAnalyticsComponents = () => {
  // Preload all analytics components when user is likely to need them
  import('@/components/AnalyticsDashboard');
  import('@/components/performance/PerformanceDashboard');
  import('@/components/performance/WebVitalsMonitor');
  import('@/components/performance/DatabaseMonitor');
  import('@/components/performance/ErrorMonitor');
};

// Specific preload functions
export const preloadAnalyticsDashboard = () => import('@/components/AnalyticsDashboard');
export const preloadPerformanceDashboard = () => import('@/components/performance/PerformanceDashboard');
export const preloadWebVitalsMonitor = () => import('@/components/performance/WebVitalsMonitor');
export const preloadDatabaseMonitor = () => import('@/components/performance/DatabaseMonitor');
export const preloadErrorMonitor = () => import('@/components/performance/ErrorMonitor');

// Convenience export for all analytics components
export const AnalyticsComponents = {
  Analytics: LazyAnalyticsDashboard,
  Performance: LazyPerformanceDashboard,
  WebVitals: LazyWebVitalsMonitor,
  Database: LazyDatabaseMonitor,
  Error: LazyErrorMonitor
} as const;

// Component selector for dynamic loading
export const getAnalyticsComponent = (type: keyof typeof AnalyticsComponents) => {
  return AnalyticsComponents[type];
};