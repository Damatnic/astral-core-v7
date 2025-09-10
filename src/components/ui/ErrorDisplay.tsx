/**
 * Error Display Components
 * Consistent error messaging and recovery options
 */

'use client';

import { clsx } from 'clsx';
import { LoadingSpinner } from './LoadingStates';

interface ErrorDisplayProps {
  error: string;
  title?: string;
  variant?: 'banner' | 'card' | 'inline' | 'toast';
  size?: 'sm' | 'md' | 'lg';
  onRetry?: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
  showIcon?: boolean;
  className?: string;
  context?: string;
}

export const ErrorDisplay = ({
  error,
  title = 'Error',
  variant = 'banner',
  size = 'md',
  onRetry,
  onDismiss,
  isRetrying = false,
  showIcon = true,
  className,
  context
}: ErrorDisplayProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return 'bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg shadow-sm';
      case 'inline':
        return 'border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20 pl-4';
      case 'toast':
        return 'bg-red-600 text-white rounded-lg shadow-lg';
      case 'banner':
      default:
        return 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'p-3 text-sm';
      case 'lg':
        return 'p-6 text-base';
      case 'md':
      default:
        return 'p-4 text-sm';
    }
  };

  const getTextColor = () => {
    return variant === 'toast' ? 'text-white' : 'text-red-800 dark:text-red-200';
  };

  const getErrorIcon = () => {
    if (variant === 'toast') {
      return 'text-white';
    }
    return 'text-red-400 dark:text-red-500';
  };

  return (
    <div className={clsx(getVariantStyles(), getSizeStyles(), className)} role="alert" aria-live="polite">
      <div className="flex items-start">
        {showIcon && (
          <div className="flex-shrink-0">
            <svg
              className={clsx('h-5 w-5', getErrorIcon())}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
        
        <div className={clsx('flex-1', showIcon && 'ml-3')}>
          <h3 className={clsx('text-sm font-medium', getTextColor())}>
            {title}
          </h3>
          
          <div className={clsx('mt-1', getTextColor())}>
            <p className="text-sm" id="error-message">{error}</p>
            
            {context && (
              <p className="text-xs mt-1 opacity-75" id="error-context">Context: {context}</p>
            )}
          </div>

          {(onRetry || onDismiss) && (
            <div className="mt-3 flex space-x-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  disabled={isRetrying}
                  className={clsx(
                    'text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50',
                    variant === 'toast' 
                      ? 'text-white hover:text-red-100' 
                      : 'text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300'
                  )}
                  aria-describedby="error-message"
                  aria-label={isRetrying ? 'Retrying to load content' : 'Retry loading content'}
                >
                  {isRetrying ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      Retrying...
                    </div>
                  ) : (
                    'Try again'
                  )}
                </button>
              )}
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={clsx(
                    'text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
                    variant === 'toast' 
                      ? 'text-white hover:text-red-100' 
                      : 'text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300'
                  )}
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {/* Close button for toast variant */}
        {variant === 'toast' && onDismiss && (
          <div className="ml-3 flex-shrink-0">
            <button
              onClick={onDismiss}
              className="text-white hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600 rounded-md p-1"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Network Error Component
interface NetworkErrorProps {
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export const NetworkError = ({ onRetry, isRetrying, className }: NetworkErrorProps) => (
  <ErrorDisplay
    error="Unable to connect to the server. Please check your internet connection and try again."
    title="Connection Error"
    variant="card"
    {...(onRetry && { onRetry })}
    {...(isRetrying !== undefined && { isRetrying })}
    {...(className && { className })}
    context="Network"
  />
);

// Permission Error Component  
interface PermissionErrorProps {
  action?: string;
  className?: string;
}

export const PermissionError = ({ action = 'perform this action', className }: PermissionErrorProps) => (
  <ErrorDisplay
    error={`You don't have permission to ${action}. Please contact your administrator if you believe this is an error.`}
    title="Access Denied"
    variant="card"
    {...(className && { className })}
    context="Permissions"
  />
);

// Validation Error Component
interface ValidationErrorProps {
  errors: Record<string, string>;
  title?: string;
  className?: string;
}

export const ValidationError = ({ 
  errors, 
  title = 'Please correct the following errors', 
  className 
}: ValidationErrorProps) => (
  <div className={clsx('bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4', className)}>
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{title}</h3>
        <div className="mt-2 text-sm text-red-700 dark:text-red-300">
          <ul className="list-disc pl-5 space-y-1">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>
                <strong>{field}:</strong> {error}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </div>
);

// Success Message Component (for completeness)
interface SuccessDisplayProps {
  message: string;
  title?: string;
  onDismiss?: () => void;
  className?: string;
}

export const SuccessDisplay = ({ 
  message, 
  title = 'Success', 
  onDismiss, 
  className 
}: SuccessDisplayProps) => (
  <div className={clsx('bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4', className)}>
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-green-800 dark:text-green-200">{title}</h3>
        <p className="mt-1 text-sm text-green-700 dark:text-green-300">{message}</p>
      </div>
      
      {onDismiss && (
        <div className="ml-3 flex-shrink-0">
          <button
            onClick={onDismiss}
            className="text-green-400 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-green-50 rounded-md p-1"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  </div>
);

export default ErrorDisplay;