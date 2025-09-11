/**
 * Subscription Management Service
 * High-level service for managing therapy subscriptions and billing
 */

import { prisma } from '@/lib/db';
import { StripeService, CreateSubscriptionData } from './stripe-service';
import { auditLog } from '@/lib/security/audit';
import type { TherapyPlan, Subscription, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import { logInfo } from '@/lib/logger';

// Helper function to map Stripe status to Prisma enum
function mapStripeStatusToPrisma(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    incomplete: 'INCOMPLETE',
    incomplete_expired: 'INCOMPLETE_EXPIRED',
    trialing: 'TRIALING',
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    unpaid: 'UNPAID',
    paused: 'PAUSED'
  };
  return statusMap[stripeStatus] || 'ACTIVE';
}

export interface TherapyPlanData {
  name: string;
  description: string;
  amount: number;
  currency?: string;
  interval: 'month' | 'year';
  intervalCount?: number;
  sessionsIncluded: number;
  duration: string;
  features: string[];
  trialPeriodDays?: number;
  setupFee?: number;
}

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  churnRate: number;
  trialConversions: number;
  planDistribution: Record<string, number>;
}

export interface TherapyPlanWithStripeData extends TherapyPlan {
  product: Stripe.Product;
  price: Stripe.Price;
}

export interface SubscriptionWithSetupIntent {
  subscription: Subscription;
  setupIntent?: Stripe.SetupIntent;
}

export interface UserSubscriptionDetails extends Subscription {
  stripeData: Stripe.Subscription;
  customer?: unknown; // Using unknown to handle both Prisma Customer and Stripe Customer types
  subscriptionItems?: unknown[]; // Using unknown[] for mixed subscription item types
}

/**
 * High-level subscription management service for therapy plans and billing
 * Integrates with Stripe for payment processing and maintains local subscription state
 * Provides comprehensive subscription lifecycle management with audit logging
 */
export class SubscriptionService {
  /**
   * Create a new therapy plan with Stripe product and pricing integration
   * Creates both Stripe product/price and local database record for therapy plans
   * @param {TherapyPlanData} data - Therapy plan configuration data
   * @param {string} data.name - Plan display name
   * @param {string} data.description - Plan description
   * @param {number} data.amount - Plan price in dollars
   * @param {'month'|'year'} data.interval - Billing interval
   * @param {number} data.sessionsIncluded - Number of therapy sessions included
   * @param {string[]} data.features - List of plan features
   * @returns {Promise<TherapyPlanWithStripeData>} Created plan with Stripe product and price data
   * @throws {Error} If Stripe operations fail or database save fails
   * @example
   * ```typescript
   * const plan = await SubscriptionService.createTherapyPlan({
   *   name: 'Basic Therapy Plan',
   *   description: 'Monthly therapy sessions',
   *   amount: 99.99,
   *   interval: 'month',
   *   sessionsIncluded: 4,
   *   features: ['Video sessions', '24/7 chat support']
   * });
   * ```
   */
  static async createTherapyPlan(data: TherapyPlanData): Promise<TherapyPlanWithStripeData> {
    try {
      const stripe = StripeService.getStripeInstance();

      // Create product in Stripe
      const product = await stripe.products.create({
        name: data.name,
        description: data.description,
        metadata: {
          sessionsIncluded: data.sessionsIncluded.toString(),
          duration: data.duration,
          features: JSON.stringify(data.features)
        }
      });

      // Create price in Stripe
      const priceCreateParams: Stripe.PriceCreateParams = {
        product: product.id,
        unit_amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency || 'usd',
        recurring: {
          interval: data.interval as Stripe.PriceCreateParams.Recurring.Interval,
          interval_count: data.intervalCount || 1,
          ...(data.trialPeriodDays !== undefined && { trial_period_days: data.trialPeriodDays })
        },
        metadata: {
          planType: 'therapy_plan'
        }
      };

      const price = await stripe.prices.create(priceCreateParams);

      // Store in database
      const therapyPlanData = {
        name: data.name,
        description: data.description,
        stripePriceId: price.id,
        stripeProductId: product.id,
        amount: data.amount,
        currency: data.currency || 'usd',
        interval: data.interval,
        intervalCount: data.intervalCount || 1,
        sessionsIncluded: data.sessionsIncluded,
        duration: data.duration,
        features: data.features,
        trialPeriodDays: data.trialPeriodDays ?? null,
        setupFee: data.setupFee ?? null
      };

      const therapyPlan = await prisma.therapyPlan.create({
        data: therapyPlanData
      });

      await auditLog({
        action: 'THERAPY_PLAN_CREATED',
        entity: 'TherapyPlan',
        entityId: therapyPlan.id,
        details: {
          stripePriceId: price.id,
          stripeProductId: product.id,
          amount: data.amount
        },
        outcome: 'SUCCESS'
      });

      return {
        ...therapyPlan,
        product,
        price
      } as TherapyPlanWithStripeData;
    } catch (error) {
      await auditLog({
        action: 'THERAPY_PLAN_CREATE_FAILED',
        entity: 'TherapyPlan',
        details: {
          planName: data.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE'
      });
      throw error;
    }
  }

  /**
   * Subscribe user to a therapy plan with optional payment method
   * Creates Stripe subscription and handles payment setup if needed
   * @param {string} userId - User ID to create subscription for
   * @param {string} therapyPlanId - Database ID of therapy plan to subscribe to
   * @param {string} [paymentMethodId] - Stripe payment method ID for immediate billing
   * @param {string} [couponCode] - Optional coupon code for discounts
   * @returns {Promise<SubscriptionWithSetupIntent>} Created subscription with optional setup intent
   * @throws {Error} If user/plan not found, plan inactive, or Stripe operations fail
   * @example
   * ```typescript
   * const result = await SubscriptionService.subscribeToTherapyPlan(
   *   'user_123',
   *   'plan_456',
   *   'pm_card_visa',
   *   'WELCOME10'
   * );
   * if (result.setupIntent) {
   *   // Payment method setup required
   * }
   * ```
   */
  static async subscribeToTherapyPlan(
    userId: string,
    therapyPlanId: string,
    paymentMethodId?: string,
    couponCode?: string
  ): Promise<SubscriptionWithSetupIntent> {
    try {
      // Get user and therapy plan
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { customer: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const therapyPlan = await prisma.therapyPlan.findUnique({
        where: { id: therapyPlanId }
      });

      if (!therapyPlan || !therapyPlan.isActive) {
        throw new Error('Therapy plan not found or inactive');
      }

      // Get or create customer
      let customer = user.customer;
      if (!customer) {
        const customerResult = await StripeService.createCustomer({
          userId: user.id,
          email: user.email,
          ...(user.name && { name: user.name })
        });
        customer = customerResult.customer;
      }

      // Create subscription data
      const subscriptionData: CreateSubscriptionData = {
        customerId: customer.id,
        priceId: therapyPlan.stripePriceId,
        ...(therapyPlan.trialPeriodDays && { trialPeriodDays: therapyPlan.trialPeriodDays }),
        ...(paymentMethodId && { paymentMethodId }),
        metadata: {
          therapyPlanId,
          userId,
          ...(couponCode && { couponCode })
        }
      };

      // Create subscription
      const { subscription, stripeSubscription } =
        await StripeService.createSubscription(subscriptionData);

      // If no payment method provided, create setup intent
      let setupIntent;
      if (!paymentMethodId && stripeSubscription.status === 'incomplete') {
        setupIntent = await StripeService.createSetupIntent(customer.id);
      }

      await auditLog({
        userId,
        action: 'USER_SUBSCRIBED_TO_THERAPY_PLAN',
        entity: 'Subscription',
        entityId: subscription.id,
        details: {
          therapyPlanId,
          subscriptionId: subscription.stripeSubscriptionId,
          amount: therapyPlan.amount
        },
        outcome: 'SUCCESS'
      });

      return {
        subscription,
        ...(setupIntent && { setupIntent })
      } as SubscriptionWithSetupIntent;
    } catch (error) {
      await auditLog({
        userId,
        action: 'THERAPY_PLAN_SUBSCRIPTION_FAILED',
        entity: 'Subscription',
        details: {
          therapyPlanId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE'
      });
      throw error;
    }
  }

  /**
   * Change user's active subscription to a different therapy plan
   * Handles prorations and billing adjustments through Stripe
   * @param {string} userId - User ID whose subscription to modify
   * @param {string} newTherapyPlanId - Database ID of new therapy plan
   * @param {'create_prorations'|'none'|'always_invoice'} [prorationBehavior='create_prorations'] - How to handle billing changes
   * @returns {Promise<Subscription>} Updated subscription record
   * @throws {Error} If no active subscription found or new plan is inactive
   * @example
   * ```typescript
   * const updated = await SubscriptionService.changeSubscriptionPlan(
   *   'user_123',
   *   'premium_plan_789',
   *   'create_prorations'
   * );
   * ```
   */
  static async changeSubscriptionPlan(
    userId: string,
    newTherapyPlanId: string,
    prorationBehavior: 'create_prorations' | 'none' | 'always_invoice' = 'create_prorations'
  ): Promise<Subscription> {
    try {
      // Get current active subscription
      const currentSubscription = await prisma.subscription.findFirst({
        where: {
          customer: { userId },
          status: { in: ['ACTIVE', 'TRIALING'] }
        },
        include: { customer: true }
      });

      if (!currentSubscription) {
        throw new Error('No active subscription found');
      }

      // Get new therapy plan
      const newTherapyPlan = await prisma.therapyPlan.findUnique({
        where: { id: newTherapyPlanId }
      });

      if (!newTherapyPlan || !newTherapyPlan.isActive) {
        throw new Error('New therapy plan not found or inactive');
      }

      // Update subscription
      const { subscription } = await StripeService.updateSubscription({
        subscriptionId: currentSubscription.stripeSubscriptionId,
        priceId: newTherapyPlan.stripePriceId,
        prorationBehavior
      });

      // Update local database
      await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          stripePriceId: newTherapyPlan.stripePriceId,
          stripeProductId: newTherapyPlan.stripeProductId,
          planName: newTherapyPlan.name,
          amount: newTherapyPlan.amount,
          metadata: JSON.stringify({ therapyPlanId: newTherapyPlanId })
        }
      });

      await auditLog({
        userId,
        action: 'SUBSCRIPTION_PLAN_CHANGED',
        entity: 'Subscription',
        entityId: currentSubscription.id,
        details: {
          oldPlanId: currentSubscription.metadata,
          newTherapyPlanId,
          prorationBehavior
        },
        outcome: 'SUCCESS'
      });

      return subscription;
    } catch (error) {
      await auditLog({
        userId,
        action: 'SUBSCRIPTION_PLAN_CHANGE_FAILED',
        entity: 'Subscription',
        details: {
          newTherapyPlanId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE'
      });
      throw error;
    }
  }

  /**
   * Cancel user's subscription with optional immediate or end-of-period cancellation
   * Provides flexibility in cancellation timing for better user experience
   * @param {string} userId - User ID requesting cancellation
   * @param {string} subscriptionId - Stripe subscription ID to cancel
   * @param {boolean} [cancelAtPeriodEnd=true] - Whether to cancel immediately or at period end
   * @param {string} [cancellationReason] - Optional reason for cancellation tracking
   * @returns {Promise<Subscription>} Updated subscription with cancellation details
   * @throws {Error} If subscription not found or not owned by user
   * @example
   * ```typescript
   * // Cancel at end of billing period
   * const cancelled = await SubscriptionService.cancelSubscription(
   *   'user_123',
   *   'sub_stripe_id',
   *   true,
   *   'User requested cancellation'
   * );
   * ```
   */
  static async cancelSubscription(
    userId: string,
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
    cancellationReason?: string
  ): Promise<Subscription> {
    try {
      // Verify subscription belongs to user
      const subscription = await prisma.subscription.findFirst({
        where: {
          stripeSubscriptionId: subscriptionId,
          customer: { userId }
        },
        include: { customer: true }
      });

      if (!subscription) {
        throw new Error('Subscription not found or not owned by user');
      }

      // Cancel subscription
      const { subscription: updatedSubscription } = await StripeService.cancelSubscription(
        subscriptionId,
        cancelAtPeriodEnd
      );

      await auditLog({
        userId,
        action: 'SUBSCRIPTION_CANCELED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: {
          subscriptionId,
          cancelAtPeriodEnd,
          cancellationReason
        },
        outcome: 'SUCCESS'
      });

      return updatedSubscription;
    } catch (error) {
      await auditLog({
        userId,
        action: 'SUBSCRIPTION_CANCELLATION_FAILED',
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
   * Resume a subscription that was set to cancel at period end
   * Allows users to reactivate their subscription before cancellation takes effect
   * @param {string} userId - User ID requesting resumption
   * @param {string} subscriptionId - Stripe subscription ID to resume
   * @returns {Promise<Stripe.Subscription>} Updated Stripe subscription object
   * @throws {Error} If subscription not found or not owned by user
   * @example
   * ```typescript
   * const resumed = await SubscriptionService.resumeSubscription(
   *   'user_123',
   *   'sub_stripe_id'
   * );
   * ```
   */
  static async resumeSubscription(
    userId: string,
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          stripeSubscriptionId: subscriptionId,
          customer: { userId }
        },
        include: { customer: true }
      });

      if (!subscription) {
        throw new Error('Subscription not found or not owned by user');
      }

      const stripe = StripeService.getStripeInstance();
      const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });

      // Update local database
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: mapStripeStatusToPrisma(stripeSubscription.status),
          cancelAt: null
        }
      });

      await auditLog({
        userId,
        action: 'SUBSCRIPTION_RESUMED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: { subscriptionId },
        outcome: 'SUCCESS'
      });

      return stripeSubscription;
    } catch (error) {
      await auditLog({
        userId,
        action: 'SUBSCRIPTION_RESUME_FAILED',
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
   * Get comprehensive subscription details for a user
   * Combines local database data with real-time Stripe subscription information
   * @param {string} userId - User ID to get subscription for
   * @returns {Promise<UserSubscriptionDetails | null>} Complete subscription details or null if no active subscription
   * @example
   * ```typescript
   * const subscription = await SubscriptionService.getUserSubscription('user_123');
   * if (subscription) {
   *   console.log(`Plan: ${subscription.planName}`);
   *   console.log(`Status: ${subscription.status}`);
   *   console.log(`Next billing: ${subscription.stripeData.current_period_end}`);
   * }
   * ```
   */
  static async getUserSubscription(userId: string): Promise<UserSubscriptionDetails | null> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        customer: { userId },
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] }
      },
      include: {
        customer: true,
        subscriptionItems: true
      }
    });

    if (!subscription) {
      return null;
    }

    // Get Stripe subscription details for real-time data
    const { stripeSubscription } = await StripeService.getSubscription(
      subscription.stripeSubscriptionId
    );

    return {
      ...subscription,
      stripeData: stripeSubscription
    };
  }

  /**
   * Get all active therapy plans available for subscription
   * Returns plans sorted by price for consistent ordering
   * @returns {Promise<TherapyPlan[]>} Array of active therapy plans sorted by price
   * @example
   * ```typescript
   * const plans = await SubscriptionService.getAvailableTherapyPlans();
   * plans.forEach(plan => {
   *   console.log(`${plan.name}: $${plan.amount}/${plan.interval}`);
   * });
   * ```
   */
  static async getAvailableTherapyPlans(): Promise<TherapyPlan[]> {
    return prisma.therapyPlan.findMany({
      where: { isActive: true },
      orderBy: { amount: 'asc' }
    });
  }

  /**
   * Generate comprehensive subscription analytics for business intelligence
   * Provides key metrics including revenue, churn, and plan distribution
   * @param {Date} [startDate] - Optional start date for analytics period
   * @param {Date} [endDate] - Optional end date for analytics period
   * @returns {Promise<SubscriptionAnalytics>} Complete analytics dashboard data
   * @example
   * ```typescript
   * const analytics = await SubscriptionService.getSubscriptionAnalytics(
   *   new Date('2024-01-01'),
   *   new Date('2024-12-31')
   * );
   * console.log(`Monthly Revenue: $${analytics.monthlyRevenue}`);
   * console.log(`Churn Rate: ${analytics.churnRate}%`);
   * ```
   */
  static async getSubscriptionAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<SubscriptionAnalytics> {
    const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};

    // Total subscriptions
    const totalSubscriptions = await prisma.subscription.count({
      where: dateFilter
    });

    // Active subscriptions
    const activeSubscriptions = await prisma.subscription.count({
      where: {
        status: { in: ['ACTIVE', 'TRIALING'] },
        ...dateFilter
      }
    });

    // Monthly revenue from active subscriptions
    const activeSubscriptionsData = await prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIALING'] },
        ...dateFilter
      },
      select: { amount: true, interval: true, intervalCount: true }
    });

    const monthlyRevenue = activeSubscriptionsData.reduce((total, sub) => {
      let monthlyAmount = sub.amount;
      if (sub.interval === 'year') {
        monthlyAmount = sub.amount / 12;
      } else if (sub.interval === 'month' && sub.intervalCount > 1) {
        monthlyAmount = sub.amount / sub.intervalCount;
      }
      return total + monthlyAmount;
    }, 0);

    // Plan distribution
    const planDistribution = await prisma.subscription.groupBy({
      by: ['planType'],
      where: {
        status: { in: ['ACTIVE', 'TRIALING'] },
        ...dateFilter
      },
      _count: { id: true }
    });

    const planDistributionObj: Record<string, number> = {};
    planDistribution.forEach(item => {
      planDistributionObj[item.planType] = item._count.id;
    });

    // Trial conversions (approximation)
    const trialSubscriptions = await prisma.subscription.count({
      where: {
        trialEnd: { not: null },
        status: 'ACTIVE',
        ...dateFilter
      }
    });

    return {
      totalSubscriptions,
      activeSubscriptions,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      churnRate:
        totalSubscriptions > 0
          ? ((totalSubscriptions - activeSubscriptions) / totalSubscriptions) * 100
          : 0,
      trialConversions: trialSubscriptions,
      planDistribution: planDistributionObj
    };
  }

  /**
   * Process subscription renewal and update local records
   * Synchronizes local subscription data with Stripe after renewal
   * @param {string} subscriptionId - Stripe subscription ID that renewed
   * @returns {Promise<void>}
   * @throws {Error} If subscription not found or update fails
   * @example
   * ```typescript
   * // Called from Stripe webhook handler
   * await SubscriptionService.processSubscriptionRenewal('sub_stripe_id');
   * ```
   */
  static async processSubscriptionRenewal(subscriptionId: string): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        include: { customer: true }
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get updated Stripe subscription
      const { stripeSubscription } = await StripeService.getSubscription(subscriptionId);

      // Update local database
      const stripeSubData = stripeSubscription as Stripe.Subscription & {
        current_period_start: number;
        current_period_end: number;
      };
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: mapStripeStatusToPrisma(stripeSubscription.status),
          currentPeriodStart: new Date(stripeSubData.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubData.current_period_end * 1000)
        }
      });

      await auditLog({
        userId: subscription.customer.userId,
        action: 'SUBSCRIPTION_RENEWED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: {
          subscriptionId,
          newPeriodEnd: stripeSubData.current_period_end
        },
        outcome: 'SUCCESS'
      });
    } catch (error) {
      await auditLog({
        action: 'SUBSCRIPTION_RENEWAL_FAILED',
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
   * Handle subscription status updates from Stripe webhooks
   * Synchronizes subscription status changes from Stripe to local database
   * @param {string} subscriptionId - Stripe subscription ID to update
   * @param {string} status - New subscription status from Stripe
   * @param {Stripe.Event.Data.Object} [eventData] - Additional event data from Stripe webhook
   * @returns {Promise<void>}
   * @throws {Error} If subscription update fails
   * @example
   * ```typescript
   * // Called from Stripe webhook handler
   * await SubscriptionService.updateSubscriptionStatus(
   *   'sub_stripe_id',
   *   'active',
   *   stripeEvent.data.object
   * );
   * ```
   */
  static async updateSubscriptionStatus(
    subscriptionId: string,
    status: string,
    eventData?: Stripe.Event.Data.Object
  ): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        include: { customer: true }
      });

      if (!subscription) {
        logInfo(`Subscription ${subscriptionId} not found in database`, 'SubscriptionService');
        return;
      }

      const updateData: Partial<Subscription> = {
        status: status.toUpperCase() as SubscriptionStatus
      };

      // Handle specific status updates
      const eventDataTyped = eventData as Record<string, unknown>;
      if (status === 'canceled' && eventDataTyped) {
        const canceledAt = eventDataTyped['canceled_at'] as number | undefined;
        updateData.canceledAt = canceledAt ? new Date(canceledAt * 1000) : new Date();
      }

      if (eventDataTyped?.['current_period_start'] && eventDataTyped?.['current_period_end']) {
        const periodStart = eventDataTyped['current_period_start'] as number;
        const periodEnd = eventDataTyped['current_period_end'] as number;
        updateData.currentPeriodStart = new Date(periodStart * 1000);
        updateData.currentPeriodEnd = new Date(periodEnd * 1000);
      }

      // Use type assertion to bypass exactOptionalPropertyTypes
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: updateData as never
      });

      await auditLog({
        userId: subscription.customer.userId,
        action: 'SUBSCRIPTION_STATUS_UPDATED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: {
          subscriptionId,
          newStatus: status,
          eventType: eventDataTyped?.['type'] as string | undefined
        },
        outcome: 'SUCCESS'
      });
    } catch (error) {
      await auditLog({
        action: 'SUBSCRIPTION_STATUS_UPDATE_FAILED',
        entity: 'Subscription',
        details: {
          subscriptionId,
          newStatus: status,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE'
      });
      throw error;
    }
  }
}
