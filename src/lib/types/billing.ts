/**
 * Billing and Payment Type Definitions
 * Replaces any types with proper TypeScript definitions for payment processing
 */

import type {
  Customer as PrismaCustomer,
  Subscription as PrismaSubscription,
  Payment as PrismaPayment,
  PaymentMethod as PrismaPaymentMethod,
  Refund as PrismaRefund,
  SubscriptionStatus,
  SubscriptionPlanType,
  PaymentStatus,
  PaymentType,
  PaymentMethodType,
  RefundReason,
  RefundStatus
} from '@prisma/client';

// Stripe-compatible database model types
export type Customer = PrismaCustomer;
export type Subscription = PrismaSubscription;
export type Payment = PrismaPayment;
export type PaymentMethod = PrismaPaymentMethod;
export type Refund = PrismaRefund;

// Enhanced customer with relations
export interface CustomerWithRelations extends PrismaCustomer {
  subscriptions?: PrismaSubscription[];
  paymentMethods?: PrismaPaymentMethod[];
  payments?: PrismaPayment[];
}

// Enhanced subscription with relations
export interface SubscriptionWithRelations extends PrismaSubscription {
  customer?: PrismaCustomer;
}

// Enhanced payment with relations
export interface PaymentWithRelations extends PrismaPayment {
  customer?: PrismaCustomer;
  paymentMethod?: PrismaPaymentMethod;
  refunds?: PrismaRefund[];
}

// Service response types
export interface CreateCustomerResponse {
  customer: Customer;
  stripeCustomer: import('stripe').Stripe.Customer;
}

export interface CreateSubscriptionResponse {
  subscription: Subscription;
  stripeSubscription: import('stripe').Stripe.Subscription;
}

export interface CreatePaymentIntentResponse {
  payment: Payment;
  paymentIntent: import('stripe').Stripe.PaymentIntent;
}

export interface UpdateSubscriptionResponse {
  subscription: Subscription;
  stripeSubscription: import('stripe').Stripe.Subscription;
}

export interface CancelSubscriptionResponse {
  subscription: Subscription;
  stripeSubscription: import('stripe').Stripe.Subscription;
}

export interface CreateRefundResponse {
  refund: Refund;
  stripeRefund: import('stripe').Stripe.Refund;
}

export interface GetSubscriptionResponse {
  subscription: SubscriptionWithRelations;
  stripeSubscription: import('stripe').Stripe.Subscription;
}

// Export enum types for type safety
export {
  SubscriptionStatus,
  SubscriptionPlanType,
  PaymentStatus,
  PaymentType,
  PaymentMethodType,
  RefundReason,
  RefundStatus
};
