/**
 * UI Components Index
 * Centralized exports for all UI components
 */

// Core UI Components
export { default as Button } from './Button';
export type { ButtonProps } from './Button';

export { default as Card } from './Card';
export { CardHeader, CardTitle, CardContent } from './Card';

export { default as Input } from './Input';

// Loading Components
export { default as LoadingFallback } from './LoadingFallback';

export {
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
} from './LoadingStates';

// Skeleton Loaders
export {
  default as Skeleton,
  DashboardCardSkeleton,
  PaymentFormSkeleton,
  AppointmentListSkeleton,
  BillingSummarySkeleton,
  TableSkeleton,
  ListItemSkeleton,
  ChartSkeleton
} from './SkeletonLoader';

// Error Components
export {
  ErrorDisplay,
  NetworkError,
  PermissionError,
  ValidationError,
  SuccessDisplay
} from './ErrorDisplay';

// Error Boundaries
export { ErrorBoundary } from '../ErrorBoundary';
export {
  EnhancedErrorBoundary,
  CompactErrorBoundary,
  withErrorBoundary,
  useErrorHandler
} from '../EnhancedErrorBoundary';

// Hooks
export { default as useErrorHandling, useAsyncOperation, useFormSubmission } from '../../hooks/useErrorHandling';