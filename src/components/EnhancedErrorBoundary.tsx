'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/lib/logger';
import { LoadingSpinner } from './ui/LoadingStates';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  retryMessage?: string;
  showErrorDetails?: boolean;
  context?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  isRetrying: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeout?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0,
      isRetrying: false
    };
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error securely
    logError('Enhanced Error Boundary caught an error', error, this.props.context || 'EnhancedErrorBoundary', {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      retryCount: this.state.retryCount,
      context: this.props.context
    });

    // Store error info for display
    this.setState({ errorInfo });

    // Call optional onError handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState({ isRetrying: true });
    
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: this.state.retryCount + 1,
        isRetrying: false
      });
    }, 1000);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReportError = () => {
    const { error, errorInfo } = this.state;
    if (error) {
      // Could integrate with error reporting service here
      logError('User reported error', error, 'EnhancedErrorBoundary', {
        componentStack: errorInfo?.componentStack,
        userReported: true,
        context: this.props.context
      });
      
      // Show confirmation
      alert('Error report sent. Thank you for helping us improve!');
    }
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI or default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { enableRetry = true, maxRetries = 3, retryMessage, showErrorDetails = false } = this.props;
      const { error, errorInfo, retryCount, isRetrying } = this.state;
      const canRetry = enableRetry && retryCount < maxRetries;

      return (
        <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
          <div className='sm:mx-auto sm:w-full sm:max-w-lg'>
            <div className='bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10'>
              <div className='text-center'>
                <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20'>
                  <svg
                    className='h-6 w-6 text-red-600 dark:text-red-400'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth='1.5'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z'
                    />
                  </svg>
                </div>
                
                <h3 className='mt-2 text-lg font-medium text-gray-900 dark:text-white'>
                  Something went wrong
                </h3>
                
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                  {retryMessage || "We've encountered an unexpected error. Our team has been notified."}
                </p>

                {showErrorDetails && error && (
                  <details className='mt-4 text-left'>
                    <summary className='cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'>
                      Error Details
                    </summary>
                    <div className='mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-800 dark:text-gray-200'>
                      <div><strong>Error:</strong> {error.message}</div>
                      {errorInfo && (
                        <div className='mt-2'>
                          <strong>Component Stack:</strong>
                          <pre className='whitespace-pre-wrap'>{errorInfo.componentStack}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {retryCount > 0 && (
                  <p className='mt-2 text-xs text-amber-600 dark:text-amber-400'>
                    Retry attempt {retryCount} of {maxRetries}
                  </p>
                )}
                
                <div className='mt-6 space-y-3'>
                  <div className='flex space-x-3'>
                    {canRetry && (
                      <button
                        type='button'
                        onClick={this.handleRetry}
                        disabled={isRetrying}
                        className='flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50'
                      >
                        {isRetrying ? (
                          <>
                            <LoadingSpinner size='sm' color='white' className='mr-2' />
                            Retrying...
                          </>
                        ) : (
                          'Try Again'
                        )}
                      </button>
                    )}
                    
                    <button
                      type='button'
                      onClick={this.handleReload}
                      className='flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    >
                      Reload Page
                    </button>
                  </div>
                  
                  <button
                    type='button'
                    onClick={this.handleReportError}
                    className='text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline'
                  >
                    Report this error
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Compact error boundary for smaller components
interface CompactErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  context?: string;
}

interface CompactErrorState {
  hasError: boolean;
}

export class CompactErrorBoundary extends Component<CompactErrorBoundaryProps, CompactErrorState> {
  constructor(props: CompactErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): CompactErrorState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError('Compact Error Boundary caught an error', error, this.props.context || 'CompactErrorBoundary', {
      componentStack: errorInfo.componentStack
    });

    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800'>
          <div className='flex items-start'>
            <div className='flex-shrink-0'>
              <svg className='h-5 w-5 text-red-400' viewBox='0 0 20 20' fill='currentColor'>
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
            <div className='ml-3'>
              <h3 className='text-sm font-medium text-red-800 dark:text-red-200'>
                Something went wrong
              </h3>
              <p className='text-sm text-red-700 dark:text-red-300 mt-1'>
                This component couldn't load properly. Try refreshing the page.
              </p>
              <div className='mt-2'>
                <button
                  onClick={() => window.location.reload()}
                  className='text-sm underline text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100'
                >
                  Refresh page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for function components to handle errors
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: string, context?: string) => {
    logError('Handled error in component', error, context || 'useErrorHandler', { 
      errorInfo,
      context 
    });
  };
};

// Higher-order component for easy error boundary wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    enableRetry?: boolean;
    context?: string;
    compact?: boolean;
  }
) => {
  const WrappedComponent = (props: P) => {
    const ErrorBoundaryComponent = options?.compact ? CompactErrorBoundary : EnhancedErrorBoundary;
    
    return (
      <ErrorBoundaryComponent 
        fallback={options?.fallback}
        enableRetry={options?.enableRetry}
        context={options?.context || Component.displayName || Component.name}
      >
        <Component {...props} />
      </ErrorBoundaryComponent>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default EnhancedErrorBoundary;