/**
 * Lazy-loaded Large Components
 * Code splitting for large utility and form components
 */

'use client';

import React, { Suspense } from 'react';
import LoadingFallback from '../ui/LoadingFallback';
import { ErrorBoundary } from '../ErrorBoundary';

// Lazy load large components
const MfaSetup = React.lazy(() => import('../MfaSetup'));
const FileUpload = React.lazy(() => import('../FileUpload'));
const NotificationBell = React.lazy(() => import('../NotificationBell'));

// Higher-order component for consistent loading
const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage: string,
  minHeight: string = 'min-h-[300px]'
) => {
  const LazyComponent = (props: P) => (
    <ErrorBoundary>
      <Suspense
        fallback={
          <LoadingFallback
            variant='skeleton'
            size='md'
            message={loadingMessage}
            className={minHeight}
          />
        }
      >
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  LazyComponent.displayName = `Lazy(${Component.displayName || Component.name || 'Component'})`;

  return LazyComponent;
};

// Wrapped lazy components
export const LazyMfaSetup = withLazyLoading(MfaSetup, 'Loading MFA setup...', 'min-h-[400px]');

export const LazyFileUpload = withLazyLoading(
  FileUpload,
  'Loading file upload...',
  'min-h-[200px]'
);

export const LazyNotificationBell = withLazyLoading(
  NotificationBell,
  'Loading notifications...',
  'min-h-[50px]'
);

// Preload functions
export const preloadMfaSetup = () => import('../MfaSetup');
export const preloadFileUpload = () => import('../FileUpload');
export const preloadNotificationBell = () => import('../NotificationBell');

// Convenience exports
export const LargeComponents = {
  MfaSetup: LazyMfaSetup,
  FileUpload: LazyFileUpload,
  NotificationBell: LazyNotificationBell
} as const;
