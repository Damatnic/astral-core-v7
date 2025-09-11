/**
 * Comprehensive Lazy Loading System
 * Central export for all lazy-loaded components and utilities
 */

// Re-export all lazy loading modules
export * from './AnalyticsLazy';
export * from './FeatureLazy';
export * from './PageLazy';
export * from './IntersectionLazy';

// Re-export existing lazy components
export * from '../dashboards/lazy';

// Utility functions for coordinated preloading
import { preloadAnalyticsComponents } from './AnalyticsLazy';
import { preloadAllFeatures } from './FeatureLazy';
import { preloadCriticalRoutes } from './PageLazy';
import { preloadDashboardComponent } from '../dashboards/lazy';

/**
 * Preload all critical components for logged-in users
 */
export const preloadCriticalComponents = (userRole?: string) => {
  // Always preload dashboard for the user's role
  if (userRole) {
    preloadDashboardComponent(userRole);
  }
  
  // Preload critical routes
  preloadCriticalRoutes();
  
  // Preload commonly used features
  preloadAllFeatures();
};

/**
 * Preload admin-specific components
 */
export const preloadAdminComponents = () => {
  preloadAnalyticsComponents();
  preloadDashboardComponent('ADMIN');
};

/**
 * Preload therapist-specific components
 */
export const preloadTherapistComponents = () => {
  preloadDashboardComponent('THERAPIST');
  // Add other therapist-specific components as needed
};

/**
 * Preload client-specific components
 */
export const preloadClientComponents = () => {
  preloadDashboardComponent('CLIENT');
  preloadCriticalRoutes();
};

/**
 * Smart preloading based on user activity patterns
 */
export const smartPreload = (userRole: string, currentPath: string) => {
  // Always preload user's dashboard
  preloadDashboardComponent(userRole);
  
  // Preload based on current location
  if (currentPath.includes('/dashboard')) {
    // User is on dashboard, preload likely next destinations
    preloadCriticalRoutes();
    
    if (userRole === 'ADMIN') {
      // Admin users often check analytics
      setTimeout(() => preloadAnalyticsComponents(), 2000);
    }
  }
  
};

/**
 * Preload components based on navigation intent (hover/focus)
 */
export const preloadOnNavIntent = (targetRoute: string, userRole?: string) => {
  if (targetRoute.includes('/analytics') && userRole === 'ADMIN') {
    preloadAnalyticsComponents();
  }
  
  
  if (targetRoute.includes('/dashboard') && userRole) {
    preloadDashboardComponent(userRole);
  }
};

/**
 * Cleanup function to clear any ongoing preload operations
 */
export const cleanupPreloading = () => {
  // This could be extended to cancel any pending dynamic imports
  // Currently just a placeholder for future implementation
};

/**
 * Performance monitoring for lazy loading
 */
export const lazyLoadingMetrics = {
  trackComponentLoad: (componentName: string, loadTime: number) => {
    if (typeof window !== 'undefined' && window.performance) {
      // Track lazy loading performance
      performance.mark(`lazy-${componentName}-loaded`);
      
      // Could send to analytics service
      console.info(`Lazy loaded ${componentName} in ${loadTime}ms`);
    }
  },
  
  trackPreloadSuccess: (componentName: string) => {
    if (typeof window !== 'undefined') {
      console.info(`Successfully preloaded ${componentName}`);
    }
  }
};