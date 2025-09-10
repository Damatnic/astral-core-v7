/**
 * Billing Components Export
 * Central export point for all billing and payment components
 * Includes both lazy-loaded and direct imports for flexibility
 */

// Direct imports (for server-side rendering or immediate loading)
export { default as BillingDashboard } from './BillingDashboard';
export { default as PaymentForm } from './PaymentForm';
export { default as PaymentMethods } from './PaymentMethods';
export { default as PaymentHistory } from './PaymentHistory';
export { default as SubscriptionManager } from './SubscriptionManager';
export { default as AppointmentPayment } from './AppointmentPayment';

// Lazy-loaded components (recommended for client-side)
export {
  LazyBillingDashboard,
  LazyPaymentForm,
  LazyPaymentMethods,
  LazyPaymentHistory,
  LazySubscriptionManager,
  LazyAppointmentPayment,
  BillingComponents,
  preloadBillingComponents
} from './lazy';

// Type exports
export type { default as BillingDashboardProps } from './BillingDashboard';
export type { default as PaymentFormProps } from './PaymentForm';
export type { default as PaymentMethodsProps } from './PaymentMethods';
export type { default as PaymentHistoryProps } from './PaymentHistory';
export type { default as SubscriptionManagerProps } from './SubscriptionManager';
export type { default as AppointmentPaymentProps } from './AppointmentPayment';
