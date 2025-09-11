/**
 * Lazy-loaded Page Components
 * Route-level code splitting for major application pages
 */

'use client';

import React, { Suspense } from 'react';
import LoadingFallback from '@/components/ui/LoadingFallback';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Higher-order component for page-level loading
const withPageLoading = <P extends object>(
  Component: React.ComponentType<P>,
  pageName: string,
  minHeight: string = 'min-h-screen'
) => {
  const LazyPageComponent = (props: P) => (
    <ErrorBoundary
      fallback={
        <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
          <div className='sm:mx-auto sm:w-full sm:max-w-md'>
            <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
              <div className='text-center'>
                <h3 className='text-lg font-medium text-gray-900'>{pageName} Error</h3>
                <p className='mt-2 text-sm text-gray-600'>
                  Unable to load the {pageName.toLowerCase()} page. Please try refreshing.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700'
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <Suspense
        fallback={
          <LoadingFallback
            variant='skeleton'
            size='lg'
            message={`Loading ${pageName.toLowerCase()}...`}
            className={minHeight}
          />
        }
      >
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  LazyPageComponent.displayName = `LazyPage(${pageName})`;

  return LazyPageComponent;
};

// Create lazy loading wrapper for wellness page
export const createLazyWellnessPage = () => {
  const WellnessPage = React.lazy(() => import('@/app/wellness/page'));
  return withPageLoading(WellnessPage, 'Wellness');
};

// Create lazy loading wrapper for journal page  
export const createLazyJournalPage = () => {
  const JournalPage = React.lazy(() => import('@/app/journal/page'));
  return withPageLoading(JournalPage, 'Journal');
};

// Preload functions for key pages
export const preloadWellnessPage = () => import('@/app/wellness/page');
export const preloadJournalPage = () => import('@/app/journal/page');

// Critical route preloading - call this on login success
export const preloadCriticalRoutes = () => {
  // Preload the most commonly accessed pages
  preloadWellnessPage();
  preloadJournalPage();
};

// Navigation-based preloading - call this on hover/focus of nav links
export const preloadOnNavigation = (route: string) => {
  switch (route) {
    case '/wellness':
      preloadWellnessPage();
      break;
    case '/journal':
      preloadJournalPage();
      break;
    default:
      break;
  }
};

// Convenience exports
export const PageComponents = {
  Wellness: createLazyWellnessPage(),
  Journal: createLazyJournalPage()
} as const;