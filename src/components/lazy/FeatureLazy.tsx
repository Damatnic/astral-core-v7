/**
 * Lazy-loaded Feature Components
 * Code splitting for non-critical feature components
 */

'use client';

import React, { Suspense } from 'react';
import LoadingFallback from '../ui/LoadingFallback';
import { ErrorBoundary } from '../ErrorBoundary';

// Lazy load large feature components
const MfaSetup = React.lazy(() => import('../MfaSetup'));
const FileUpload = React.lazy(() => import('../FileUpload'));
const NotificationBell = React.lazy(() => import('../NotificationBell'));
const PresenceIndicator = React.lazy(() => import('../PresenceIndicator'));

// Higher-order component for feature loading
const withFeatureLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage?: string,
  loadingSize: 'sm' | 'md' | 'lg' = 'md'
) => {
  const LazyFeatureComponent = (props: P) => (
    <ErrorBoundary>
      <Suspense
        fallback={
          <LoadingFallback
            variant='skeleton'
            size={loadingSize}
            {...(loadingMessage && { message: loadingMessage })}
            className='min-h-[200px]'
          />
        }
      >
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  LazyFeatureComponent.displayName = `LazyFeature(${
    Component.displayName || Component.name || 'Component'
  })`;

  return LazyFeatureComponent;
};

// Lightweight wrapper for small interactive components
const withInteractiveLoading = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const LazyInteractiveComponent = (props: P) => (
    <Suspense
      fallback={
        <div className="animate-pulse bg-gray-200 rounded-lg w-8 h-8" />
      }
    >
      <Component {...props} />
    </Suspense>
  );

  LazyInteractiveComponent.displayName = `LazyInteractive(${
    Component.displayName || Component.name || 'Component'
  })`;

  return LazyInteractiveComponent;
};

// Wrapped lazy feature components
export const LazyMfaSetup = withFeatureLoading(
  MfaSetup,
  'Loading MFA setup...',
  'lg'
);

export const LazyFileUpload = withFeatureLoading(
  FileUpload,
  'Loading file upload...',
  'md'
);

// Interactive components with minimal loading states
export const LazyNotificationBell = withInteractiveLoading(NotificationBell);
export const LazyPresenceIndicator = withInteractiveLoading(PresenceIndicator);

// Preload functions for better UX
export const preloadMfaSetup = () => import('../MfaSetup');
export const preloadFileUpload = () => import('../FileUpload');
export const preloadNotificationBell = () => import('../NotificationBell');
export const preloadPresenceIndicator = () => import('../PresenceIndicator');

// Preload all feature components
export const preloadAllFeatures = () => {
  preloadMfaSetup();
  preloadFileUpload();
  preloadNotificationBell();
  preloadPresenceIndicator();
};

// Convenience export for all feature components
export const FeatureComponents = {
  MfaSetup: LazyMfaSetup,
  FileUpload: LazyFileUpload,
  NotificationBell: LazyNotificationBell,
  PresenceIndicator: LazyPresenceIndicator
} as const;

// Component selector for dynamic loading
export const getFeatureComponent = (type: keyof typeof FeatureComponents) => {
  return FeatureComponents[type];
};