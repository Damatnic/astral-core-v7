/**
 * Skeleton Loader Components
 * Provides consistent skeleton loading states for different content types
 */

'use client';

import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  variant?: 'text' | 'rect' | 'circle' | 'card';
}

const Skeleton = ({
  className,
  width = '100%',
  height = '1rem',
  rounded = false,
  variant = 'rect'
}: SkeletonProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circle':
        return 'rounded-full';
      case 'card':
        return 'h-32 rounded-lg';
      case 'rect':
      default:
        return rounded ? 'rounded-lg' : 'rounded';
    }
  };

  return (
    <div
      className={clsx('animate-pulse bg-gray-200 dark:bg-gray-700', getVariantStyles(), className)}
      style={{ width, height: variant === 'text' || variant === 'circle' ? height : undefined }}
    />
  );
};

// Dashboard Card Skeleton
export const DashboardCardSkeleton = ({ className }: { className?: string }) => (
  <div className={clsx('bg-white dark:bg-gray-800 p-6 rounded-lg shadow', className)}>
    <div className='animate-pulse'>
      <div className='flex items-center justify-between mb-4'>
        <Skeleton variant='text' width='60%' />
        <Skeleton variant='circle' width='2rem' height='2rem' />
      </div>
      <div className='space-y-3'>
        <Skeleton variant='text' width='100%' />
        <Skeleton variant='text' width='80%' />
        <Skeleton variant='text' width='40%' />
      </div>
      <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'>
        <Skeleton variant='text' width='30%' />
      </div>
    </div>
  </div>
);

// Payment Form Skeleton
export const PaymentFormSkeleton = ({ className }: { className?: string }) => (
  <div
    className={clsx('max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow', className)}
  >
    <div className='animate-pulse space-y-6'>
      <div>
        <Skeleton variant='text' width='50%' height='1.5rem' className='mb-2' />
        <Skeleton variant='text' width='30%' height='2rem' />
      </div>

      <div className='space-y-4'>
        <div>
          <Skeleton variant='text' width='40%' className='mb-2' />
          <Skeleton variant='rect' height='3rem' />
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <Skeleton variant='rect' height='3rem' />
          <Skeleton variant='rect' height='3rem' />
        </div>

        <Skeleton variant='rect' height='3rem' />

        <div className='grid grid-cols-3 gap-4'>
          <Skeleton variant='rect' height='3rem' />
          <Skeleton variant='rect' height='3rem' />
          <Skeleton variant='rect' height='3rem' />
        </div>
      </div>

      <div>
        <Skeleton variant='text' width='30%' className='mb-2' />
        <Skeleton variant='rect' height='3rem' />
      </div>

      <Skeleton variant='rect' height='3rem' />
    </div>
  </div>
);

// Appointment List Skeleton
export const AppointmentListSkeleton = ({
  count = 3,
  className
}: {
  count?: number;
  className?: string;
}) => (
  <div className={clsx('space-y-3', className)}>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className='border-l-4 border-gray-200 dark:border-gray-600 pl-4 py-3 animate-pulse'
      >
        <Skeleton variant='text' width='60%' className='mb-2' />
        <Skeleton variant='text' width='40%' className='mb-1' />
        <Skeleton variant='text' width='30%' />
      </div>
    ))}
  </div>
);

// Billing Summary Skeleton
export const BillingSummarySkeleton = ({ className }: { className?: string }) => (
  <div className={clsx('bg-white dark:bg-gray-800 p-6 rounded-lg shadow', className)}>
    <div className='animate-pulse'>
      <Skeleton variant='text' width='40%' height='1.5rem' className='mb-6' />

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className='space-y-2'>
            <Skeleton variant='text' width='50%' />
            <Skeleton variant='text' width='70%' height='1.5rem' />
            <Skeleton variant='text' width='40%' />
          </div>
        ))}
      </div>

      <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
        <div className='flex flex-wrap gap-2'>
          <Skeleton variant='rect' width='120px' height='2rem' />
          <Skeleton variant='rect' width='140px' height='2rem' />
          <Skeleton variant='rect' width='110px' height='2rem' />
        </div>
      </div>
    </div>
  </div>
);

// Table Skeleton
export const TableSkeleton = ({
  rows = 5,
  cols = 4,
  className
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) => (
  <div className={clsx('bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden', className)}>
    <div className='animate-pulse'>
      {/* Header */}
      <div className='px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600'>
        <div className='grid gap-4' style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, index) => (
            <Skeleton key={index} variant='text' width='60%' />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className='px-6 py-4 border-b border-gray-200 dark:border-gray-600 last:border-b-0'
        >
          <div className='grid gap-4' style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton key={colIndex} variant='text' width={colIndex === 0 ? '80%' : '60%'} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// List Item Skeleton
export const ListItemSkeleton = ({
  count = 3,
  showAvatar = false,
  className
}: {
  count?: number;
  showAvatar?: boolean;
  className?: string;
}) => (
  <div className={clsx('space-y-4', className)}>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className='flex items-start space-x-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow animate-pulse'
      >
        {showAvatar && <Skeleton variant='circle' width='2.5rem' height='2.5rem' />}
        <div className='flex-1 space-y-2'>
          <Skeleton variant='text' width='60%' />
          <Skeleton variant='text' width='100%' />
          <Skeleton variant='text' width='30%' />
        </div>
      </div>
    ))}
  </div>
);

// Chart Skeleton
export const ChartSkeleton = ({ className }: { className?: string }) => (
  <div className={clsx('bg-white dark:bg-gray-800 p-6 rounded-lg shadow', className)}>
    <div className='animate-pulse'>
      <div className='flex items-center justify-between mb-6'>
        <Skeleton variant='text' width='40%' height='1.5rem' />
        <Skeleton variant='rect' width='100px' height='2rem' />
      </div>

      <div className='h-64 flex items-end space-x-2'>
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton
            key={index}
            variant='rect'
            className='flex-1'
            height={`${Math.random() * 60 + 20}%`}
          />
        ))}
      </div>

      <div className='mt-4 flex justify-center space-x-4'>
        <div className='flex items-center space-x-2'>
          <Skeleton variant='rect' width='1rem' height='1rem' />
          <Skeleton variant='text' width='60px' />
        </div>
        <div className='flex items-center space-x-2'>
          <Skeleton variant='rect' width='1rem' height='1rem' />
          <Skeleton variant='text' width='80px' />
        </div>
      </div>
    </div>
  </div>
);

export default Skeleton;
