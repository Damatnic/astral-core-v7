/**
 * Lazy-loaded Page Components
 * Code splitting for large page components to reduce initial bundle size
 */

'use client';

import React, { Suspense } from 'react';
import LoadingFallback from '@/components/ui/LoadingFallback';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Create lazy loading wrappers for page components
const createLazyPageComponent = (importPath: string, loadingMessage: string) => {
  const LazyComponent = React.lazy(() => import(importPath));

  const LazyPageWrapper = (props: Record<string, unknown>) => (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <LoadingFallback
                variant='skeleton'
                size='lg'
                message={loadingMessage}
                className='min-h-[600px]'
              />
            </div>
          </div>
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  LazyPageWrapper.displayName = `LazyPage(${importPath})`;
  return LazyPageWrapper;
};

// Define preload functions
export const preloadJournalPage = () => import('@/app/journal/page');
export const preloadWellnessPage = () => import('@/app/wellness/page');

// Create utility function for route-based code splitting
export const createRouteComponent = (path: string) => {
  switch (path) {
    case '/journal':
      return createLazyPageComponent('@/app/journal/page', 'Loading journal...');
    case '/wellness':
      return createLazyPageComponent('@/app/wellness/page', 'Loading wellness tracker...');
    default:
      return null;
  }
};

// Dynamic page loader with preloading
export const loadPageComponent = (path: string) => {
  // Preload the component
  switch (path) {
    case '/journal':
      preloadJournalPage();
      break;
    case '/wellness':
      preloadWellnessPage();
      break;
  }

  return createRouteComponent(path);
};
