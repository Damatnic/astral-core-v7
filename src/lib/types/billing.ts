/**
 * Billing and Payment Type Definitions
 * Comprehensive type definitions and Zod schemas for payment processing
 */

import { z } from 'zod';
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

// =====================
// ZOD VALIDATION SCHEMAS
// =====================

// Customer schemas
export const createCustomerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  phone: z.string().optional(),
  address: z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required'),
    postal_code: z.string().min(1, 'Postal code is required'),
    country: z.string().length(2, 'Country must be 2-letter code').default('US')
  }).optional(),
  metadata: z.record(z.string(), z.string()).optional()
});

// Payment Intent schemas
export const createPaymentIntentSchema = z.object({
  amount: z.number().min(50, 'Minimum amount is $0.50').max(1000000, 'Maximum amount is $10,000'),
  currency: z.string().length(3, 'Currency must be 3-letter code').default('usd'),
  paymentMethodId: z.string().optional(),
  customerId: z.string().optional(),
  description: z.string().max(500, 'Description too long').optional(),
  appointmentId: z.string().optional(),
  therapistId: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  confirmImmediately: z.boolean().default(false)
});

export const confirmPaymentIntentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  paymentMethodId: z.string().optional(),
  returnUrl: z.string().url().optional()
});

// Subscription schemas
export const createSubscriptionSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  planType: z.enum(['BASIC', 'STANDARD', 'PREMIUM', 'FAMILY', 'GROUP', 'ENTERPRISE', 'THERAPY_PACKAGE']),
  paymentMethodId: z.string().optional(),
  trialPeriodDays: z.number().min(0).max(365).optional(),
  couponId: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional()
});

export const updateSubscriptionSchema = z.object({
  planType: z.enum(['BASIC', 'STANDARD', 'PREMIUM', 'FAMILY', 'GROUP', 'ENTERPRISE', 'THERAPY_PACKAGE']).optional(),
  paymentMethodId: z.string().optional(),
  prorationBehavior: z.enum(['create_prorations', 'none', 'always_invoice']).default('create_prorations'),
  metadata: z.record(z.string(), z.string()).optional()
});

export const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
  reason: z.string().max(500, 'Reason too long').optional(),
  feedback: z.string().max(1000, 'Feedback too long').optional()
});

// Payment Method schemas
export const setupIntentSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  paymentMethodTypes: z.array(z.enum(['card', 'us_bank_account'])).default(['card']),
  usage: z.enum(['off_session', 'on_session']).default('off_session'),
  returnUrl: z.string().url().optional()
});

export const attachPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  setAsDefault: z.boolean().default(false)
});

export const detachPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required')
});

// Refund schemas
export const createRefundSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  amount: z.number().min(1, 'Refund amount must be at least $0.01').optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  reverseTransfer: z.boolean().default(false)
});

// Invoice schemas
export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  description: z.string().max(500, 'Description too long').optional(),
  dueDate: z.string().datetime().or(z.date()).optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Line item description is required'),
    amount: z.number().min(1, 'Amount must be positive'),
    quantity: z.number().min(1, 'Quantity must be at least 1').default(1),
    metadata: z.record(z.string(), z.string()).optional()
  })).min(1, 'At least one line item is required'),
  metadata: z.record(z.string(), z.string()).optional()
});

// Webhook schemas
export const stripeWebhookSchema = z.object({
  id: z.string(),
  object: z.literal('event'),
  type: z.string(),
  data: z.object({
    object: z.record(z.string(), z.any())
  }),
  created: z.number(),
  livemode: z.boolean(),
  pending_webhooks: z.number(),
  request: z.object({
    id: z.string().nullable(),
    idempotency_key: z.string().nullable()
  }).nullable()
});

// Query parameter schemas
export const paymentHistoryQuerySchema = z.object({
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 100)).optional(),
  offset: z.string().transform(val => Math.max(parseInt(val) || 0, 0)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['REQUIRES_PAYMENT_METHOD', 'REQUIRES_CONFIRMATION', 'REQUIRES_ACTION', 'PROCESSING', 'REQUIRES_CAPTURE', 'CANCELED', 'SUCCEEDED', 'FAILED']).optional(),
  type: z.enum(['SUBSCRIPTION', 'ONE_TIME', 'SESSION_PAYMENT', 'SETUP_FEE', 'LATE_FEE', 'REFUND']).optional()
});

export const subscriptionQuerySchema = z.object({
  status: z.enum(['INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED']).optional(),
  planType: z.enum(['BASIC', 'STANDARD', 'PREMIUM', 'FAMILY', 'GROUP', 'ENTERPRISE', 'THERAPY_PACKAGE']).optional()
});

// Type inference from schemas
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type ConfirmPaymentIntentInput = z.infer<typeof confirmPaymentIntentSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type SetupIntentInput = z.infer<typeof setupIntentSchema>;
export type AttachPaymentMethodInput = z.infer<typeof attachPaymentMethodSchema>;
export type DetachPaymentMethodInput = z.infer<typeof detachPaymentMethodSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type StripeWebhookInput = z.infer<typeof stripeWebhookSchema>;
export type PaymentHistoryQuery = z.infer<typeof paymentHistoryQuerySchema>;
export type SubscriptionQuery = z.infer<typeof subscriptionQuerySchema>;

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

// =====================
// API RESPONSE TYPES
// =====================

export interface PaymentIntentResponse {
  success: boolean;
  payment?: Payment;
  paymentIntent: {
    id: string;
    client_secret: string | null;
    status: string;
    amount: number;
    currency: string;
  };
  message: string;
  error?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  subscription?: SubscriptionWithRelations;
  stripeSubscription?: import('stripe').Stripe.Subscription;
  message: string;
  error?: string;
}

export interface PaymentMethodResponse {
  success: boolean;
  paymentMethod?: PaymentMethod;
  paymentMethods?: PaymentMethod[];
  setupIntent?: {
    id: string;
    client_secret: string | null;
    status: string;
  };
  message: string;
  error?: string;
}

export interface RefundResponse {
  success: boolean;
  refund?: Refund;
  stripeRefund?: import('stripe').Stripe.Refund;
  message: string;
  error?: string;
}

export interface PaymentHistoryResponse {
  success: boolean;
  payments: PaymentWithRelations[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  error?: string;
}

export interface InvoiceResponse {
  success: boolean;
  invoice?: {
    id: string;
    number: string | null;
    status: string;
    amount_due: number;
    amount_paid: number;
    currency: string;
    due_date: number | null;
    pdf: string | null;
  };
  message: string;
  error?: string;
}

export interface CustomerResponse {
  success: boolean;
  customer?: Customer;
  stripeCustomer?: import('stripe').Stripe.Customer;
  message: string;
  error?: string;
}

// Webhook response types
export interface WebhookProcessedResponse {
  success: boolean;
  processed: boolean;
  eventType: string;
  message: string;
  actions?: string[];
  error?: string;
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
