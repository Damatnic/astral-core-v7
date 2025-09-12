/**
 * Lazy-loaded Analytics Dashboard
 * Code splitting for the analytics dashboard component
 */

'use client';

import React, { Suspense } from 'react';
import LoadingFallback from '../ui/LoadingFallback';
import { ErrorBoundary } from '../ErrorBoundary';

// Lazy load the analytics dashboard
const AnalyticsDashboard = React.lazy(() => import('../AnalyticsDashboard'));

// Higher-order component for analytics loading
const withAnalyticsLoading = <P extends object>(Component: React.ComponentType<P>) => {
  const LazyAnalytics = (props: P) => (
    <ErrorBoundary>
      <Suspense
        fallback={
          <LoadingFallback
            variant='skeleton'
            size='lg'
            message='Loading analytics dashboard...'
            className='min-h-[500px]'
          />
        }
      >
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  LazyAnalytics.displayName = `LazyAnalytics(${Component.displayName || Component.name || 'Component'})`;

  return LazyAnalytics;
};

// Wrapped lazy analytics dashboard
export const LazyAnalyticsDashboard = withAnalyticsLoading(AnalyticsDashboard);

// Preload function for analytics
export const preloadAnalyticsDashboard = () => {
  import('../AnalyticsDashboard');
};

export default LazyAnalyticsDashboard;
