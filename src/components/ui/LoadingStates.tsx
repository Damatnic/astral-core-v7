/**
 * Loading States Components
 * Comprehensive loading states for various UI patterns
 */

'use client';

import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
}

export const LoadingSpinner = ({
  size = 'md',
  color = 'primary',
  className
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400',
    secondary: 'border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-400',
    white: 'border-gray-300 border-t-white'
  };

  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export const LoadingOverlay = ({
  isLoading,
  children,
  message = 'Loading...',
  className
}: LoadingOverlayProps) => {
  return (
    <div className={clsx('relative', className)}>
      {children}
      {isLoading && (
        <div className='absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-10 rounded-lg'>
          <div className='flex flex-col items-center space-y-3'>
            <LoadingSpinner size='lg' />
            <p className='text-sm text-gray-600 dark:text-gray-400'>{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

interface FullPageLoadingProps {
  message?: string;
  className?: string;
}

export const FullPageLoading = ({ message = 'Loading...', className }: FullPageLoadingProps) => (
  <div
    className={clsx(
      'min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center',
      className
    )}
  >
    <div className='text-center'>
      <LoadingSpinner size='lg' />
      <p className='mt-4 text-lg text-gray-600 dark:text-gray-400'>{message}</p>
    </div>
  </div>
);

interface LoadingCardProps {
  title?: string;
  message?: string;
  className?: string;
}

export const LoadingCard = ({ title, message = 'Loading...', className }: LoadingCardProps) => (
  <div className={clsx('bg-white dark:bg-gray-800 p-6 rounded-lg shadow', className)}>
    <div className='flex items-center justify-center py-8'>
      <div className='text-center'>
        <LoadingSpinner size='lg' />
        {title && (
          <h3 className='mt-4 text-lg font-semibold text-gray-900 dark:text-white'>{title}</h3>
        )}
        <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>{message}</p>
      </div>
    </div>
  </div>
);

interface ButtonLoadingProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
}

export const ButtonLoading = ({
  isLoading,
  loadingText,
  children,
  className
}: ButtonLoadingProps) => (
  <span className={className}>
    {isLoading && <LoadingSpinner size='sm' className='mr-2' />}
    {isLoading && loadingText ? loadingText : children}
  </span>
);

interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const InlineLoading = ({
  message = 'Loading...',
  size = 'sm',
  className
}: InlineLoadingProps) => (
  <div className={clsx('flex items-center space-x-2', className)}>
    <LoadingSpinner size={size} />
    <span className='text-sm text-gray-600 dark:text-gray-400'>{message}</span>
  </div>
);

interface LoadingListProps {
  count?: number;
  className?: string;
}

export const LoadingList = ({ count = 3, className }: LoadingListProps) => (
  <div className={clsx('space-y-3', className)}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className='animate-pulse'>
        <div className='flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg'>
          <div className='w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full' />
          <div className='flex-1'>
            <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2' />
            <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2' />
          </div>
        </div>
      </div>
    ))}
  </div>
);

interface LoadingDotsProps {
  className?: string;
}

export const LoadingDots = ({ className }: LoadingDotsProps) => (
  <div className={clsx('flex space-x-1', className)}>
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className='w-2 h-2 bg-current rounded-full animate-pulse'
        style={{
          animationDelay: `${index * 0.2}s`,
          animationDuration: '1.4s'
        }}
      />
    ))}
  </div>
);

interface ProgressBarProps {
  progress: number;
  message?: string;
  className?: string;
}

export const ProgressBar = ({ progress, message, className }: ProgressBarProps) => (
  <div className={clsx('space-y-2', className)}>
    <div className='flex justify-between text-sm text-gray-600 dark:text-gray-400'>
      <span>{message}</span>
      <span>{Math.round(progress)}%</span>
    </div>
    <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
      <div
        className='bg-blue-600 h-2 rounded-full transition-all duration-300'
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  </div>
);

interface PulsingLoadingProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle';
}

export const PulsingLoading = ({ className, variant = 'card' }: PulsingLoadingProps) => {
  const variantClasses = {
    card: 'h-32 rounded-lg',
    text: 'h-4 rounded',
    circle: 'w-12 h-12 rounded-full'
  };

  return (
    <div
      className={clsx(
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        variantClasses[variant],
        className
      )}
    />
  );
};

const LoadingComponents = {
  LoadingSpinner,
  LoadingOverlay,
  FullPageLoading,
  LoadingCard,
  ButtonLoading,
  InlineLoading,
  LoadingList,
  LoadingDots,
  ProgressBar,
  PulsingLoading
};

export default LoadingComponents;
