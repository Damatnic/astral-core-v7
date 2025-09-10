/**
 * Stripe Service - HIPAA-compliant payment processing
 * Handles all Stripe API interactions for the Astral Core mental health platform
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { encryption } from '@/lib/security/encryption';
import { auditLog } from '@/lib/security/audit';

// Initialize Stripe with API version and configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
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
   * Create a new Stripe customer and store in database
   */
  static async createCustomer(data: CreateCustomerData): Promise<{ customer: any; stripeCustomer: Stripe.Customer }> {
    try {
      // Create Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        address: data.address,
        metadata: {
          userId: data.userId,
          ...data.metadata,
        },
      });

      // Store customer in database with encrypted sensitive data
      const encryptedEmail = encryption.encrypt(data.email);
      const customer = await prisma.customer.create({
        data: {
          userId: data.userId,
          stripeCustomerId: stripeCustomer.id,
          email: encryptedEmail,
          name: data.name,
          address: data.address ? JSON.stringify(data.address) : null,
        },
      });

      // Audit log
      await auditLog({
        userId: data.userId,
        action: 'CUSTOMER_CREATED',
        entity: 'Customer',
        entityId: customer.id,
        details: { stripeCustomerId: stripeCustomer.id },
        outcome: 'SUCCESS',
      });

      return { customer, stripeCustomer };
    } catch (error) {
      await auditLog({
        userId: data.userId,
        action: 'CUSTOMER_CREATE_FAILED',
        entity: 'Customer',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Get or create customer for user
   */
  static async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<any> {
    // Check if customer already exists
    let customer = await prisma.customer.findUnique({
      where: { userId },
    });

    if (!customer) {
      const result = await this.createCustomer({ userId, email, name });
      customer = result.customer;
    }

    return customer;
  }

  /**
   * Create a subscription for therapy plans
   */
  static async createSubscription(data: CreateSubscriptionData): Promise<{ subscription: any; stripeSubscription: Stripe.Subscription }> {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
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
        expand: ['latest_invoice.payment_intent'],
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
          status: stripeSubscription.status as any,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          planType: this.determinePlanType(product.name),
          planName: product.name,
          amount: price.unit_amount! / 100,
          currency: price.currency,
          interval: price.recurring?.interval || 'month',
          intervalCount: price.recurring?.interval_count || 1,
          trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
          trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
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
        outcome: 'SUCCESS',
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
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Create payment intent for one-time payments (session fees)
   */
  static async createPaymentIntent(data: CreatePaymentIntentData): Promise<{ payment: any; paymentIntent: Stripe.PaymentIntent }> {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
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
          ...data.metadata,
        },
        confirm: data.paymentMethodId ? true : false,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/payment-complete`,
      });

      // Store payment in database
      const payment = await prisma.payment.create({
        data: {
          customerId: data.customerId,
          appointmentId: data.appointmentId,
          stripePaymentIntentId: paymentIntent.id,
          amount: data.amount,
          currency: data.currency || 'usd',
          status: paymentIntent.status as any,
          type: data.appointmentId ? 'SESSION_PAYMENT' : 'ONE_TIME',
          description: data.description,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
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
        outcome: 'SUCCESS',
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
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Update subscription (change plan, quantity, etc.)
   */
  static async updateSubscription(data: UpdateSubscriptionData): Promise<{ subscription: any; stripeSubscription: Stripe.Subscription }> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: data.subscriptionId },
        include: { customer: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get current subscription from Stripe
      const currentSubscription = await stripe.subscriptions.retrieve(data.subscriptionId);
      
      const updateData: Stripe.SubscriptionUpdateParams = {
        proration_behavior: data.prorationBehavior || 'create_prorations',
      };

      if (data.priceId) {
        updateData.items = [{
          id: currentSubscription.items.data[0].id,
          price: data.priceId,
          quantity: data.quantity || 1,
        }];
      }

      const stripeSubscription = await stripe.subscriptions.update(data.subscriptionId, updateData);

      // Update subscription in database
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: stripeSubscription.status as any,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          ...(data.priceId && {
            stripePriceId: data.priceId,
            // Get updated price details
          }),
        },
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
        outcome: 'SUCCESS',
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
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<{ subscription: any; stripeSubscription: Stripe.Subscription }> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        include: { customer: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });

      // Update subscription in database
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: stripeSubscription.status as any,
          cancelAt: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : null,
        },
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
        outcome: 'SUCCESS',
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
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Create setup intent for saving payment methods
   */
  static async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customer.stripeCustomerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      // Audit log
      await auditLog({
        userId: customer.userId,
        action: 'SETUP_INTENT_CREATED',
        entity: 'PaymentMethod',
        details: { setupIntentId: setupIntent.id },
        outcome: 'SUCCESS',
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
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Store payment method in database
   */
  static async storePaymentMethod(customerId: string, stripePaymentMethodId: string): Promise<any> {
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
      
      const storedPaymentMethod = await prisma.paymentMethod.create({
        data: {
          customerId,
          stripePaymentMethodId,
          type: paymentMethod.type.toUpperCase() as any,
          card: paymentMethod.card ? JSON.stringify({
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            exp_month: paymentMethod.card.exp_month,
            exp_year: paymentMethod.card.exp_year,
          }) : null,
        },
      });

      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      
      // Audit log
      await auditLog({
        userId: customer?.userId,
        action: 'PAYMENT_METHOD_STORED',
        entity: 'PaymentMethod',
        entityId: storedPaymentMethod.id,
        details: { stripePaymentMethodId },
        outcome: 'SUCCESS',
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
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Process refund
   */
  static async createRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<{ refund: any; stripeRefund: Stripe.Refund }> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        include: { customer: true },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        ...(amount && { amount: Math.round(amount * 100) }),
        ...(reason && { reason: reason as Stripe.RefundCreateParams.Reason }),
      };

      const stripeRefund = await stripe.refunds.create(refundData);

      // Store refund in database
      const refund = await prisma.refund.create({
        data: {
          paymentId: payment.id,
          stripeRefundId: stripeRefund.id,
          amount: stripeRefund.amount / 100,
          currency: stripeRefund.currency,
          reason: reason as any || 'REQUESTED_BY_CUSTOMER',
          status: stripeRefund.status.toUpperCase() as any,
          receiptNumber: stripeRefund.receipt_number,
        },
      });

      // Update payment record
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          refunded: true,
          refundedAmount: stripeRefund.amount / 100,
        },
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
        outcome: 'SUCCESS',
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
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Get customer's payment methods
   */
  static async getPaymentMethods(customerId: string): Promise<any[]> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.stripeCustomerId,
      type: 'card',
    });

    return paymentMethods.data;
  }

  /**
   * Get subscription details
   */
  static async getSubscription(subscriptionId: string): Promise<{ subscription: any; stripeSubscription: Stripe.Subscription }> {
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: { customer: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price', 'latest_invoice'],
    });

    return { subscription, stripeSubscription };
  }

  /**
   * Get customer's invoices
   */
  static async getInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const invoices = await stripe.invoices.list({
      customer: customer.stripeCustomerId,
      limit,
      expand: ['data.subscription'],
    });

    return invoices.data;
  }

  /**
   * Helper method to determine plan type from product name
   */
  private static determinePlanType(productName: string): any {
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
   * Construct Stripe webhook event from raw body
   */
  static constructWebhookEvent(body: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }

  /**
   * Get Stripe instance for direct API calls
   */
  static getStripeInstance(): Stripe {
    return stripe;
  }
}

export { stripe };