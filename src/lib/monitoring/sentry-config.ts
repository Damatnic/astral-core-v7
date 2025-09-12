/**
 * Sentry Configuration for Production Error Tracking
 * Comprehensive error monitoring and performance tracking
 */

import React from 'react';
import * as Sentry from '@sentry/nextjs';

// Sentry configuration
const SENTRY_CONFIG = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay sampling
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out development errors
    if (process.env.NODE_ENV !== 'production') {
      console.error('Sentry Event:', event, hint);
    }

    // Don't send certain types of errors to Sentry
    const error = hint.originalException;
    
    if (error && typeof error === 'object' && 'message' in error) {
      const message = error.message as string;
      
      // Filter out common non-actionable errors
      const ignoredErrors = [
        'ResizeObserver loop limit exceeded',
        'Script error',
        'Network request failed',
        'ChunkLoadError',
        'Loading chunk',
        'Non-Error promise rejection captured'
      ];
      
      if (ignoredErrors.some(ignored => message.includes(ignored))) {
        return null;
      }
    }

    // Add additional context for mental health platform
    if (event.tags) {
      event.tags.platform = 'astral-core';
      event.tags.deployment = process.env.VERCEL_ENV || 'unknown';
    }

    return event;
  },

  beforeSendTransaction(event) {
    // Filter out certain transactions in production
    if (process.env.NODE_ENV === 'production') {
      // Don't track health check endpoints
      if (event.transaction?.includes('/api/health') || 
          event.transaction?.includes('/api/status')) {
        return null;
      }
    }

    return event;
  },

  // Additional options
  debug: process.env.NODE_ENV === 'development',
  integrations: [
    // Sentry will auto-detect and configure integrations
  ],
  
  // Custom tags for mental health platform context
  initialScope: {
    tags: {
      component: 'astral-core-v7',
      platform: 'mental-health',
      framework: 'nextjs'
    },
  },
};

// Initialize Sentry only if DSN is provided
export const initializeSentry = () => {
  if (!SENTRY_CONFIG.dsn) {
    console.warn('Sentry DSN not provided, error tracking disabled');
    return;
  }

  try {
    Sentry.init(SENTRY_CONFIG);
    console.info('Sentry initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
};

// Enhanced error capture utilities
export const errorTracking = {
  // Capture errors with context
  captureError: (error: Error, context?: Record<string, any>) => {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, String(value));
        });
        scope.setContext('additional_info', context);
      }
      
      scope.setLevel('error');
      Sentry.captureException(error);
    });
  },

  // Capture critical errors (e.g., security issues, data loss)
  captureCriticalError: (error: Error, context?: Record<string, any>) => {
    Sentry.withScope((scope) => {
      scope.setLevel('fatal');
      scope.setTag('severity', 'critical');
      
      if (context) {
        scope.setContext('critical_context', context);
      }
      
      Sentry.captureException(error);
    });
  },

  // Capture user actions for debugging
  captureUserAction: (action: string, userId?: string, metadata?: Record<string, any>) => {
    Sentry.addBreadcrumb({
      message: action,
      category: 'user_action',
      level: 'info',
      data: {
        userId,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  },

  // Capture performance issues
  capturePerformanceIssue: (metric: string, value: number, threshold: number, context?: Record<string, any>) => {
    if (value > threshold) {
      Sentry.withScope((scope) => {
        scope.setTag('performance_issue', metric);
        scope.setContext('performance_data', {
          metric,
          value,
          threshold,
          ...context
        });
        
        Sentry.captureMessage(`Performance issue: ${metric} (${value}ms > ${threshold}ms)`, 'warning');
      });
    }
  },

  // Capture database performance issues
  captureSlowQuery: (query: string, duration: number, model?: string) => {
    Sentry.withScope((scope) => {
      scope.setTag('slow_query', model || 'unknown');
      scope.setContext('query_info', {
        query: query.substring(0, 500), // Truncate long queries
        duration,
        model,
        timestamp: new Date().toISOString()
      });
      
      Sentry.captureMessage(`Slow database query detected: ${duration}ms`, 'warning');
    });
  },

  // Set user context for debugging
  setUserContext: (userId: string, email?: string, role?: string) => {
    Sentry.setUser({
      id: userId,
      email,
      role,
    });
  },

  // Clear user context (e.g., on logout)
  clearUserContext: () => {
    Sentry.setUser(null);
  },

  // Add custom tags
  addTag: (key: string, value: string) => {
    Sentry.setTag(key, value);
  },

  // Create performance transactions
  startTransaction: (name: string, operation: string) => {
    return Sentry.startTransaction({
      name,
      op: operation,
      tags: {
        platform: 'astral-core'
      }
    });
  }
};

// React error boundary integration
export const withSentryErrorBoundary = (Component: React.ComponentType<any>) => {
  return Sentry.withErrorBoundary(Component, {
    fallback: ({ error, resetError }) => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">
            We're sorry, but an unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={resetError}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    ),
    beforeCapture: (scope, error, errorInfo) => {
      scope.setTag('errorBoundary', true);
      scope.setContext('errorInfo', errorInfo);
    }
  });
};

// API route wrapper for error tracking
export const withSentryAPIWrapper = (handler: any) => {
  return async (req: any, res: any) => {
    try {
      return await handler(req, res);
    } catch (error) {
      // Capture API errors with request context
      Sentry.withScope((scope) => {
        scope.setTag('api_error', true);
        scope.setContext('request', {
          url: req.url,
          method: req.method,
          headers: req.headers,
          query: req.query,
          // Don't log request body for security reasons
        });
        
        Sentry.captureException(error);
      });
      
      throw error;
    }
  };
};

// Custom hooks for React components
export const useSentryUser = (user: { id: string; email?: string; role?: string }) => {
  React.useEffect(() => {
    errorTracking.setUserContext(user.id, user.email, user.role);
    
    return () => {
      errorTracking.clearUserContext();
    };
  }, [user.id, user.email, user.role]);
};

// Performance monitoring utilities
export const performanceMonitoring = {
  // Measure component render time
  measureComponent: (componentName: string) => {
    const transaction = errorTracking.startTransaction(
      `Component: ${componentName}`,
      'ui.render'
    );
    
    return {
      finish: () => transaction.finish(),
      setTag: (key: string, value: string) => transaction.setTag(key, value),
      setData: (key: string, value: any) => transaction.setData(key, value)
    };
  },

  // Measure API call performance
  measureAPICall: (endpoint: string, method: string) => {
    const transaction = errorTracking.startTransaction(
      `API: ${method} ${endpoint}`,
      'http.client'
    );
    
    return {
      finish: () => transaction.finish(),
      setStatus: (status: string) => transaction.setStatus(status),
      setHttpStatus: (code: number) => transaction.setHttpStatus(code)
    };
  }
};

// Initialize on import if in browser
if (typeof window !== 'undefined') {
  initializeSentry();
}

export default Sentry;