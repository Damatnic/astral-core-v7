
import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  InformationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/solid';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending';

interface AccessibleStatusIndicatorProps {
  status: StatusType;
  message: string;
  size?: 'sm' | 'md' | 'lg';
  includeText?: boolean;
  className?: string;
}

export function AccessibleStatusIndicator({ 
  status, 
  message, 
  size = 'md',
  includeText = true,
  className = '' 
}: AccessibleStatusIndicatorProps) {
  const config = {
    success: {
      icon: CheckCircleIcon,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-700',
      pattern: '✓', // Backup visual pattern
      ariaLabel: 'Success'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-700',
      pattern: '⚠', // Backup visual pattern
      ariaLabel: 'Warning'
    },
    error: {
      icon: XCircleIcon,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-700',
      pattern: '✗', // Backup visual pattern
      ariaLabel: 'Error'
    },
    info: {
      icon: InformationCircleIcon,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-700',
      pattern: 'ℹ', // Backup visual pattern
      ariaLabel: 'Information'
    },
    pending: {
      icon: ClockIcon,
      color: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-700',
      pattern: '⏳', // Backup visual pattern
      ariaLabel: 'Pending'
    }
  };

  const statusConfig = config[status];
  const Icon = statusConfig.icon;
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div 
      className={`flex items-center gap-2 p-2 rounded-lg border ${statusConfig.bg} ${statusConfig.border} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`${statusConfig.ariaLabel}: ${message}`}
    >
      {/* Icon with color */}
      <Icon 
        className={`${sizeClasses[size]} ${statusConfig.color}`}
        aria-hidden="true"
      />
      
      {/* Text pattern as backup for color-blind users */}
      <span 
        className="sr-only sm:not-sr-only font-mono text-sm"
        aria-hidden="true"
      >
        {statusConfig.pattern}
      </span>
      
      {/* Message text */}
      {includeText && (
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {message}
        </span>
      )}
    </div>
  );
}

export default AccessibleStatusIndicator;