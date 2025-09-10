/**
 * Loading Fallback Component
 * Provides consistent loading states for lazy-loaded components
 */

'use client';

import { clsx } from 'clsx';

interface LoadingFallbackProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton' | 'pulse';
  message?: string;
}

const LoadingSpinner = ({ size }: { size: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400 ${sizeClasses[size]}`} />
  );
};

const LoadingSkeleton = ({ size }: { size: 'sm' | 'md' | 'lg' }) => {
  const heightClasses = {
    sm: 'h-20',
    md: 'h-40',
    lg: 'h-60'
  };

  return (
    <div className={clsx('animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg', heightClasses[size])}>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
      </div>
    </div>
  );
};

const LoadingPulse = ({ size }: { size: 'sm' | 'md' | 'lg' }) => {
  const heightClasses = {
    sm: 'h-20',
    md: 'h-40',
    lg: 'h-60'
  };

  return (
    <div className={clsx('animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center', heightClasses[size])}>
      <div className="text-gray-400 dark:text-gray-500">Loading...</div>
    </div>
  );
};

export default function LoadingFallback({ 
  className, 
  size = 'md', 
  variant = 'spinner',
  message = 'Loading...'
}: LoadingFallbackProps) {
  const renderLoadingVariant = () => {
    switch (variant) {
      case 'skeleton':
        return <LoadingSkeleton size={size} />;
      case 'pulse':
        return <LoadingPulse size={size} />;
      case 'spinner':
      default:
        return (
          <div className="flex flex-col items-center justify-center space-y-3 py-8">
            <LoadingSpinner size={size} />
            {message && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className={clsx('w-full', className)}>
      {renderLoadingVariant()}
    </div>
  );
}