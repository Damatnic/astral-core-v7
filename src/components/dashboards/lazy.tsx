/**
 * Lazy-loaded Dashboard Components
 * Code splitting for dashboard components based on user role
 */

'use client';

import React, { Suspense } from 'react';
import LoadingFallback from '@/components/ui/LoadingFallback';
import ErrorBoundary from '@/components/ErrorBoundary';

// Lazy load dashboard components
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
const TherapistDashboard = React.lazy(() => import('./TherapistDashboard'));
const ClientDashboard = React.lazy(() => import('./ClientDashboard'));

// Higher-order component for consistent loading and error handling
const withDashboardLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage?: string
) => {
  const LazyDashboard = (props: P) => (
    <ErrorBoundary>
      <Suspense 
        fallback={
          <LoadingFallback 
            variant="skeleton" 
            size="lg" 
            message={loadingMessage}
            className="min-h-[600px]"
          />
        }
      >
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  LazyDashboard.displayName = `LazyDashboard(${Component.displayName || Component.name || 'Component'})`;
  
  return LazyDashboard;
};

// Wrapped lazy dashboard components
export const LazyAdminDashboard = withDashboardLoading(
  AdminDashboard, 
  'Loading admin dashboard...'
);

export const LazyTherapistDashboard = withDashboardLoading(
  TherapistDashboard, 
  'Loading therapist dashboard...'
);

export const LazyClientDashboard = withDashboardLoading(
  ClientDashboard, 
  'Loading client dashboard...'
);

// Dashboard factory function for dynamic loading
export const getDashboardComponent = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return LazyAdminDashboard;
    case 'THERAPIST':
      return LazyTherapistDashboard;
    case 'CLIENT':
      return LazyClientDashboard;
    default:
      return LazyClientDashboard;
  }
};

// Preload function for dashboard components
export const preloadDashboardComponent = (role: string) => {
  switch (role) {
    case 'ADMIN':
      import('./AdminDashboard');
      break;
    case 'THERAPIST':
      import('./TherapistDashboard');
      break;
    case 'CLIENT':
      import('./ClientDashboard');
      break;
    default:
      import('./ClientDashboard');
      break;
  }
};

// Convenience export for all dashboard components
export const DashboardComponents = {
  Admin: LazyAdminDashboard,
  Therapist: LazyTherapistDashboard,
  Client: LazyClientDashboard
} as const;