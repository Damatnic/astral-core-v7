/**
 * Lazy-loaded Billing Components
 * Code splitting for large billing components to improve initial bundle size
 */

'use client';

import React, { Suspense } from 'react';
import LoadingFallback from '@/components/ui/LoadingFallback';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load large billing components
const PaymentHistory = React.lazy(() => import('./PaymentHistory'));
const SubscriptionManager = React.lazy(() => import('./SubscriptionManager'));
const BillingDashboard = React.lazy(() => import('./BillingDashboard'));
const PaymentMethods = React.lazy(() => import('./PaymentMethods'));
const PaymentForm = React.lazy(() => import('./PaymentForm'));
const AppointmentPayment = React.lazy(() => import('./AppointmentPayment'));

// Higher-order component for consistent loading and error handling
const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage?: string
) => {
  const LazyComponent = (props: P) => (
    <ErrorBoundary>
      <Suspense
        fallback={
          <LoadingFallback
            variant='skeleton'
            size='lg'
            {...(loadingMessage && { message: loadingMessage })}
            className='min-h-[400px]'
          />
        }
      >
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  LazyComponent.displayName = `LazyLoaded(${Component.displayName || Component.name || 'Component'})`;

  return LazyComponent;
};

// Wrapped lazy components with proper loading states
export const LazyPaymentHistory = withLazyLoading(PaymentHistory, 'Loading payment history...');

export const LazySubscriptionManager = withLazyLoading(
  SubscriptionManager,
  'Loading subscription manager...'
);

export const LazyBillingDashboard = withLazyLoading(
  BillingDashboard,
  'Loading billing dashboard...'
);

export const LazyPaymentMethods = withLazyLoading(PaymentMethods, 'Loading payment methods...');

export const LazyPaymentForm = withLazyLoading(PaymentForm, 'Loading payment form...');

export const LazyAppointmentPayment = withLazyLoading(
  AppointmentPayment,
  'Loading appointment payment...'
);

// Convenience export for all lazy billing components
export const BillingComponents = {
  PaymentHistory: LazyPaymentHistory,
  SubscriptionManager: LazySubscriptionManager,
  BillingDashboard: LazyBillingDashboard,
  PaymentMethods: LazyPaymentMethods,
  PaymentForm: LazyPaymentForm,
  AppointmentPayment: LazyAppointmentPayment
} as const;

// Component for preloading billing components when needed
export const preloadBillingComponents = () => {
  // Preload all billing components
  import('./PaymentHistory');
  import('./SubscriptionManager');
  import('./BillingDashboard');
  import('./PaymentMethods');
  import('./PaymentForm');
  import('./AppointmentPayment');
};
