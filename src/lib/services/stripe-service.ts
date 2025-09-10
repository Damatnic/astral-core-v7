/**
 * Stripe Service - HIPAA-compliant payment processing
 * Handles all Stripe API interactions for the Astral Core mental health platform
 */

import Stripe from 'stripe';
import prisma from '@/lib/db/prisma';
import { encryption } from '@/lib/security/encryption';
import { auditLog } from '@/lib/security/audit';
import type {
  CreateCustomerResponse,
  CreateSubscriptionResponse,
  CreatePaymentIntentResponse,
  UpdateSubscriptionResponse,
  CancelSubscriptionResponse,
  CreateRefundResponse,
  GetSubscriptionResponse,
  Customer,
  Subscription,
  Payment,
  PaymentMethod,
  SubscriptionPlanType,
  PaymentMethodType,
  CustomerWithRelations,
  SubscriptionWithRelations,
  PaymentWithRelations
} from '@/lib/types/billing';

// Initialize Stripe with API version and configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true
});

export interface CreateCustomerData {
  userId: string;
  email: string;
  name?: string;
  phone?: string;
  address?: Stripe.CustomerCreateParams.Address;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionData {
  customerId: string;
  priceId: string;
  trialPeriodDays?: number;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentData {
  customerId: string;
  amount: number;
  currency?: string;
  paymentMethodId?: string;
  description?: string;
  appointmentId?: string;
  metadata?: Record<string, string>;
}

export interface UpdateSubscriptionData {
  subscriptionId: string;
  priceId?: string;
  quantity?: number;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

export class StripeService {
  /**
   * Create a new Stripe customer and store in database with HIPAA-compliant encryption
   * @param {CreateCustomerData} data - Customer creation data
   * @param {string} data.userId - Internal user ID to link to customer
   * @param {string} data.email - Customer email address (will be encrypted in database)
   * @param {string} [data.name] - Customer full name
   * @param {string} [data.phone] - Customer phone number
   * @param {Stripe.CustomerCreateParams.Address} [data.address] - Customer billing address
   * @param {Record<string, string>} [data.metadata] - Additional metadata to store
   * @returns {Promise<CreateCustomerResponse>} Object containing database customer record and Stripe customer
   * @throws {Error} If customer creation fails in Stripe or database
   * @example
   * ```typescript
   * const result = await StripeService.createCustomer({
   *   userId: 'user_123',
   *   email: 'patient@example.com',
   *   name: 'John Doe'
   * });
   * console.log(result.customer.id); // Database customer ID
   * console.log(result.stripeCustomer.id); // Stripe customer ID
   * ```
   */
  static async createCustomer(data: CreateCustomerData): Promise<CreateCustomerResponse> {
    try {
      // Create Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        address: data.address,
        metadata: {
          userId: data.userId,
          ...data.metadata
        }
      });

      // Store customer in database with encrypted sensitive data
      const encryptedEmail = encryption.encrypt(data.email);
      const customer = await prisma.customer.create({
        data: {
          userId: data.userId,
          stripeCustomerId: stripeCustomer.id,
          email: encryptedEmail,
          name: data.name,
          address: data.address ? JSON.stringify(data.address) : null
        }
      });

      // Audit log
      await auditLog({
        userId: data.userId,
        action: 'CUSTOMER_CREATED',
        entity: 'Customer',
        entityId: customer.id,
        details: { stripeCustomerId: stripeCustomer.id },
        outcome: 'SUCCESS'
      });

      return { customer, stripeCustomer };
    } catch (error) {
      await auditLog({
        userId: data.userId,
        action: 'CUSTOMER_CREATE_FAILED',
        entity: 'Customer',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        outcome: 'FAILURE'
      });
      throw error;
    }
  }

  /**
   * Get existing customer or create new one if doesn't exist
   * @param {string} userId - Internal user ID to lookup customer
   * @param {string} email - Customer email for creating new customer if needed
   * @param {string} [name] - Customer name for creating new customer if needed
   * @returns {Promise<Customer>} Database customer record
   * @throws {Error} If customer creation fails
   * @example
   * ```typescript
   * const customer = await StripeService.getOrCreateCustomer(
   *   'user_123',
   *   'patient@example.com',
   *   'John Doe'
   * );
   * ```
   */
  static async getOrCreateCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<Customer> {
    // Check if customer already exists
    let customer = await prisma.customer.findUnique({
      where: { userId }
    });

    if (!customer) {
      const result = await this.createCustomer({ userId, email, name });
      customer = result.customer;
    }

    return customer;
  }

  /**
   * Create a recurring subscription for therapy plans with automatic billing
   * @param {CreateSubscriptionData} data - Subscription creation data
   * @param {string} data.customerId - Database customer ID
   * @param {string} data.priceId - Stripe price ID for the subscription plan
   * @param {number} [data.trialPeriodDays] - Number of trial days before billing starts
   * @param {string} [data.paymentMethodId] - Default payment method for subscription
   * @param {Record<string, string>} [data.metadata] - Additional metadata
   * @returns {Promise<CreateSubscriptionResponse>} Object containing database subscription and Stripe subscription
   * @throws {Error} If customer not found or subscription creation fails
   * @example
   * ```typescript
   * const result = await StripeService.createSubscription({
   *   customerId: 'cust_123',
   *   priceId: 'price_therapy_basic',
   *   trialPeriodDays: 7,
   *   paymentMethodId: 'pm_123'
   * });
   * ```
   */
  static async createSubscription(
    data: CreateSubscriptionData
  ): Promise<CreateSubscriptionResponse> {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Create Stripe subscription
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customer.stripeCustomerId,
        items: [{ price: data.priceId }],
        metadata: data.metadata || {},
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent']
      };

      if (data.trialPeriodDays) {
        subscriptionData.trial_period_days = data.trialPeriodDays;
      }

      if (data.paymentMethodId) {
        subscriptionData.default_payment_method = data.paymentMethodId;
      }

      const stripeSubscription = await stripe.subscriptions.create(subscriptionData);

      // Get price details for plan information
      const price = await stripe.prices.retrieve(data.priceId, { expand: ['product'] });
      const product = price.product as Stripe.Product;

      // Store subscription in database
      const subscription = await prisma.subscription.create({
        data: {
          customerId: data.customerId,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: data.priceId,
          stripeProductId: product.id,
          status: stripeSubscription.status,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          planType: this.determinePlanType(product.name),
          planName: product.name,
          amount: price.unit_amount! / 100,
          currency: price.currency,
          interval: price.recurring?.interval || 'month',
          intervalCount: price.recurring?.interval_count || 1,
          trialStart: stripeSubscription.trial_start
            ? new Date(stripeSubscription.trial_start * 1000)
            : null,
          trialEnd: stripeSubscription.trial_end
            ? new Date(stripeSubscription.trial_end * 1000)
            : null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null
        }
      });

      // Audit log
      await auditLog({
        userId: customer.userId,
        action: 'SUBSCRIPTION_CREATED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: {
          stripeSubscriptionId: stripeSubscription.id,
          priceId: data.priceId,
          amount: price.unit_amount! / 100
        },
        outcome: 'SUCCESS'
      });

      return { subscription, stripeSubscription };
    } catch (error) {
      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      await auditLog({
        userId: customer?.userId,
        action: 'SUBSCRIPTION_CREATE_FAILED',
        entity: 'Subscription',
        details: {
          customerId: data.customerId,
          priceId: data.priceId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE'
      });
      throw error;
    }
  }

  /**
   * Create payment intent for one-time payments such as session fees or appointment charges
   * @param {CreatePaymentIntentData} data - Payment intent creation data
   * @param {string} data.customerId - Database customer ID
   * @param {number} data.amount - Payment amount in dollars (will be converted to cents)
   * @param {string} [data.currency='usd'] - Payment currency code
   * @param {string} [data.paymentMethodId] - Specific payment method to use
   * @param {string} [data.description] - Payment description for customer
   * @param {string} [data.appointmentId] - Associated appointment ID for session payments
   * @param {Record<string, string>} [data.metadata] - Additional metadata
   * @returns {Promise<CreatePaymentIntentResponse>} Object containing database payment record and Stripe payment intent
   * @throws {Error} If customer not found or payment intent creation fails
   * @example
   * ```typescript
   * const result = await StripeService.createPaymentIntent({
   *   customerId: 'cust_123',
   *   amount: 150.00,
   *   description: 'Therapy session fee',
   *   appointmentId: 'appt_456'
   * });
   * ```
   */
  static async createPaymentIntent(
    data: CreatePaymentIntentData
  ): Promise<CreatePaymentIntentResponse> {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency || 'usd',
        customer: customer.stripeCustomerId,
        payment_method: data.paymentMethodId,
        description: data.description,
        metadata: {
          userId: customer.userId,
          appointmentId: data.appointmentId || '',
          ...data.metadata
        },
        confirm: data.paymentMethodId ? true : false,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/payment-complete`
      });

      // Store payment in database
      const payment = await prisma.payment.create({
        data: {
          customerId: data.customerId,
          appointmentId: data.appointmentId,
          stripePaymentIntentId: paymentIntent.id,
          amount: data.amount,
          currency: data.currency || 'usd',
          status: paymentIntent.status,
          type: data.appointmentId ? 'SESSION_PAYMENT' : 'ONE_TIME',
          description: data.description,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null
        }
      });

      // Audit log
      await auditLog({
        userId: customer.userId,
        action: 'PAYMENT_INTENT_CREATED',
        entity: 'Payment',
        entityId: payment.id,
        details: {
          stripePaymentIntentId: paymentIntent.id,
          amount: data.amount,
          appointmentId: data.appointmentId
        },
        outcome: 'SUCCESS'
      });

      return { payment, paymentIntent };
    } catch (error) {
      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      await auditLog({
        userId: customer?.userId,
        action: 'PAYMENT_INTENT_CREATE_FAILED',
        entity: 'Payment',
        details: {
          customerId: data.customerId,
          amount: data.amount,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE'
      });
      throw error;
    }
  }

  /**
   * Update existing subscription to change plan, billing cycle, or other parameters
   * @param {UpdateSubscriptionData} data - Subscription update data
   * @param {string} data.subscriptionId - Stripe subscription ID to update
   * @param {string} [data.priceId] - New price ID to switch to
   * @param {number} [data.quantity] - New quantity for the subscription
   * @param {'create_prorations'|'none'|'always_invoice'} [data.prorationBehavior='create_prorations'] - How to handle prorations
   * @returns {Promise<UpdateSubscriptionResponse>} Object containing updated database subscription and Stripe subscription
   * @throws {Error} If subscription not found or update fails
   * @example
   * ```typescript
   * const result = await StripeService.updateSubscription({
   *   subscriptionId: 'sub_123',
   *   priceId: 'price_premium_plan',
   *   prorationBehavior: 'create_prorations'
   * });
   * ```
   */
  static async updateSubscription(
    data: UpdateSubscriptionData
  ): Promise<UpdateSubscriptionResponse> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: data.subscriptionId },
        include: { customer: true }
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get current subscription from Stripe
      const currentSubscription = await stripe.subscriptions.retrieve(data.subscriptionId);

      const updateData: Stripe.SubscriptionUpdateParams = {
        proration_behavior: data.prorationBehavior || 'create_prorations'
      };

      if (data.priceId) {
        updateData.items = [
          {
            id: currentSubscription.items.data[0].id,
            price: data.priceId,
            quantity: data.quantity || 1
          }
        ];
      }

      const stripeSubscription = await stripe.subscriptions.update(data.subscriptionId, updateData);

      // Update subscription in database
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: stripeSubscription.status,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          ...(data.priceId && {
            stripePriceId: data.priceId
            // Get updated price details
          })
        }
      });

      // Audit log
      await auditLog({
        userId: subscription.customer.userId,
        action: 'SUBSCRIPTION_UPDATED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: {
          stripeSubscriptionId: data.subscriptionId,
          newPriceId: data.priceId,
          quantity: data.quantity
        },
        outcome: 'SUCCESS'
      });

      return { subscription: updatedSubscription, stripeSubscription };
    } catch (error) {
      await auditLog({
        action: 'SUBSCRIPTION_UPDATE_FAILED',
        entity: 'Subscription',
        details: {
          subscriptionId: data.subscriptionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE'
      });
      throw error;
    }
  }

  /**
   * Cancel a subscription, either immediately or at the end of current billing period
   * @param {string} subscriptionId - Stripe subscription ID to cancel
   * @param {boolean} [cancelAtPeriodEnd=true] - Whether to cancel at period end (true) or immediately (false)
   * @returns {Promise<CancelSubscriptionResponse>} Object containing updated subscription records
   * @throws {Error} If subscription not found or cancellation fails
   * @example
   * ```typescript
   * // Cancel at end of billing period
   * await StripeService.cancelSubscription('sub_123', true);
   * 
   * // Cancel immediately
   * await StripeService.cancelSubscription('sub_123', false);
   * ```
   */
  static async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<CancelSubscriptionResponse> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        include: { customer: true }
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd
      });

      // Update subscription in database
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: stripeSubscription.status,
          cancelAt: stripeSubscription.cancel_at
            ? new Date(stripeSubscription.cancel_at * 1000)
            : null
        }
      });

      // Audit log
      await auditLog({
        userId: subscription.customer.userId,
        action: 'SUBSCRIPTION_CANCELED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: {
          stripeSubscriptionId: subscriptionId,
          cancelAtPeriodEnd
        },
        outcome: 'SUCCESS'
      });

      return { subscription: updatedSubscription, stripeSubscription };
    } catch (error) {
      await auditLog({
        action: 'SUBSCRIPTION_CANCEL_FAILED',
        entity: 'Subscription',
        details: {
          subscriptionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE'
      });
      throw error;
    }
  }

  /**
   * Create setup intent to allow customers to securely save payment methods for future use
   * @param {string} customerId - Database customer ID
   * @returns {Promise<Stripe.SetupIntent>} Stripe setup intent for frontend payment method collection
   * @throws {Error} If customer not found or setup intent creation fails
   * @example
   * ```typescript
   * const setupIntent = await StripeService.createSetupIntent('cust_123');
   * // Pass setupIntent.client_secret to frontend for payment method setup
   * ```
   */
  static async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customer.stripeCustomerId,
        payment_method_types: ['card'],
        usage: 'off_session'
      });

      // Audit log
      await auditLog({
        userId: customer.userId,
        action: 'SETUP_INTENT_CREATED',
        entity: 'PaymentMethod',
        details: { setupIntentId: setupIntent.id },
        outcome: 'SUCCESS'
      });

      return setupIntent;
    } catch (error) {
      await auditLog({
        action: 'SETUP_INTENT_CREATE_FAILED',
        entity: 'PaymentMethod',
        details: {
          customerId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE'
      });
      throw error;
    }
  }

  /**
   * Store payment method details in database for record keeping and display
   * @param {string} customerId - Database customer ID
   * @param {string} stripePaymentMethodId - Stripe payment method ID to store
   * @returns {Promise<PaymentMethod>} Database payment method record
   * @throws {Error} If payment method retrieval or storage fails
   * @example
   * ```typescript
   * const paymentMethod = await StripeService.storePaymentMethod(
   *   'cust_123',
   *   'pm_card_visa_4242'
   * );
   * ```
   */
  static async storePaymentMethod(
    customerId: string,
    stripePaymentMethodId: string
  ): Promise<PaymentMethod> {
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);

      const storedPaymentMethod = await prisma.paymentMethod.create({
        data: {
          customerId,
          stripePaymentMethodId,
          type: paymentMethod.type.toUpperCase() as PaymentMethodType,
          card: paymentMethod.card
            ? JSON.stringify({
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                exp_month: paymentMethod.card.exp_month,
                exp_year: paymentMethod.card.exp_year
              })
            : null
        }
      });

      const customer = await prisma.customer.findUnique({ where: { id: customerId } });

      // Audit log
      await auditLog({
        userId: customer?.userId,
        action: 'PAYMENT_METHOD_STORED',
        entity: 'PaymentMethod',
        entityId: storedPaymentMethod.id,
        details: { stripePaymentMethodId },
        outcome: 'SUCCESS'
      });

      return storedPaymentMethod;
    } catch (error) {
      await auditLog({
        action: 'PAYMENT_METHOD_STORE_FAILED',
        entity: 'PaymentMethod',
        details: {
          customerId,
          stripePaymentMethodId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE'
      });
      throw error;
    }
  }

  /**
   * Process a refund for a completed payment, either full or partial
   * @param {string} paymentIntentId - Stripe payment intent ID to refund
   * @param {number} [amount] - Specific amount to refund (omit for full refund)
   * @param {string} [reason] - Reason for refund (duplicate, fraudulent, requested_by_customer)
   * @returns {Promise<CreateRefundResponse>} Object containing database refund record and Stripe refund
   * @throws {Error} If payment not found or refund processing fails
   * @example
   * ```typescript
   * // Full refund
   * const fullRefund = await StripeService.createRefund('pi_123');
   * 
   * // Partial refund
   * const partialRefund = await StripeService.createRefund(
   *   'pi_123',
   *   50.00,
   *   'requested_by_customer'
   * );
   * ```
   */
  static async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<CreateRefundResponse> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        include: { customer: true }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        ...(amount && { amount: Math.round(amount * 100) }),
        ...(reason && { reason: reason as Stripe.RefundCreateParams.Reason })
      };

      const stripeRefund = await stripe.refunds.create(refundData);

      // Store refund in database
      const refund = await prisma.refund.create({
        data: {
          paymentId: payment.id,
          stripeRefundId: stripeRefund.id,
          amount: stripeRefund.amount / 100,
          currency: stripeRefund.currency,
          reason:
            (reason as keyof typeof import('@prisma/client').RefundReason) ||
            'REQUESTED_BY_CUSTOMER',
          status: stripeRefund.status.toUpperCase() as import('@prisma/client').RefundStatus,
          receiptNumber: stripeRefund.receipt_number
        }
      });

      // Update payment record
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          refunded: true,
          refundedAmount: stripeRefund.amount / 100
        }
      });

      // Audit log
      await auditLog({
        userId: payment.customer.userId,
        action: 'REFUND_CREATED',
        entity: 'Refund',
        entityId: refund.id,
        details: {
          stripeRefundId: stripeRefund.id,
          amount: stripeRefund.amount / 100,
          paymentIntentId
        },
        outcome: 'SUCCESS'
      });

      return { refund, stripeRefund };
    } catch (error) {
      await auditLog({
        action: 'REFUND_CREATE_FAILED',
        entity: 'Refund',
        details: {
          paymentIntentId,
          amount,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE'
      });
      throw error;
    }
  }

  /**
   * Retrieve all saved payment methods for a customer
   * @param {string} customerId - Database customer ID
   * @returns {Promise<Stripe.PaymentMethod[]>} Array of customer's payment methods from Stripe
   * @throws {Error} If customer not found
   * @example
   * ```typescript
   * const paymentMethods = await StripeService.getPaymentMethods('cust_123');
   * paymentMethods.forEach(pm => {
   *   console.log(`${pm.card?.brand} ending in ${pm.card?.last4}`);
   * });
   * ```
   */
  static async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.stripeCustomerId,
      type: 'card'
    });

    return paymentMethods.data;
  }

  /**
   * Retrieve detailed subscription information from both database and Stripe
   * @param {string} subscriptionId - Stripe subscription ID
   * @returns {Promise<GetSubscriptionResponse>} Object containing database and Stripe subscription details
   * @throws {Error} If subscription not found
   * @example
   * ```typescript
   * const result = await StripeService.getSubscription('sub_123');
   * console.log(result.subscription.status); // Database status
   * console.log(result.stripeSubscription.current_period_end); // Stripe details
   * ```
   */
  static async getSubscription(subscriptionId: string): Promise<GetSubscriptionResponse> {
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: { customer: true }
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price', 'latest_invoice']
    });

    return { subscription, stripeSubscription };
  }

  /**
   * Retrieve customer's invoice history from Stripe
   * @param {string} customerId - Database customer ID
   * @param {number} [limit=10] - Maximum number of invoices to retrieve
   * @returns {Promise<Stripe.Invoice[]>} Array of customer invoices from Stripe
   * @throws {Error} If customer not found
   * @example
   * ```typescript
   * const invoices = await StripeService.getInvoices('cust_123', 5);
   * invoices.forEach(invoice => {
   *   console.log(`Invoice ${invoice.number}: $${invoice.amount_paid / 100}`);
   * });
   * ```
   */
  static async getInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const invoices = await stripe.invoices.list({
      customer: customer.stripeCustomerId,
      limit,
      expand: ['data.subscription']
    });

    return invoices.data;
  }

  /**
   * Helper method to determine subscription plan type from Stripe product name
   * @param {string} productName - Stripe product name to analyze
   * @returns {SubscriptionPlanType} Mapped plan type for internal use
   * @private
   * @example
   * ```typescript
   * const planType = StripeService.determinePlanType('Premium Therapy Plan');
   * // Returns: 'PREMIUM'
   * ```
   */
  private static determinePlanType(productName: string): SubscriptionPlanType {
    const name = productName.toLowerCase();

    if (name.includes('basic')) return 'BASIC';
    if (name.includes('premium')) return 'PREMIUM';
    if (name.includes('family')) return 'FAMILY';
    if (name.includes('group')) return 'GROUP';
    if (name.includes('enterprise')) return 'ENTERPRISE';
    if (name.includes('therapy')) return 'THERAPY_PACKAGE';

    return 'STANDARD';
  }

  /**
   * Construct and verify Stripe webhook event from request body and signature
   * @param {string | Buffer} body - Raw request body from Stripe webhook
   * @param {string} signature - Stripe-Signature header value
   * @returns {Stripe.Event} Verified Stripe event object
   * @throws {Error} If webhook secret not configured or event verification fails
   * @example
   * ```typescript
   * const event = StripeService.constructWebhookEvent(
   *   request.body,
   *   request.headers['stripe-signature']
   * );
   * 
   * if (event.type === 'payment_intent.succeeded') {
   *   // Handle successful payment
   * }
   * ```
   */
  static constructWebhookEvent(body: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }

  /**
   * Get configured Stripe instance for advanced API operations not covered by service methods
   * @returns {Stripe} Configured Stripe client instance
   * @example
   * ```typescript
   * const stripe = StripeService.getStripeInstance();
   * const balance = await stripe.balance.retrieve();
   * ```
   */
  static getStripeInstance(): Stripe {
    return stripe;
  }
}

export { stripe };
