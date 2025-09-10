/**
 * Subscription Management Service
 * High-level service for managing therapy subscriptions and billing
 */

import { prisma } from '@/lib/db';
import { StripeService, CreateSubscriptionData } from './stripe-service';
import { auditLog } from '@/lib/security/audit';

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

export class SubscriptionService {
  /**
   * Create a new therapy plan (product and price in Stripe)
   */
  static async createTherapyPlan(data: TherapyPlanData): Promise<any> {
    try {
      const stripe = StripeService.getStripeInstance();

      // Create product in Stripe
      const product = await stripe.products.create({
        name: data.name,
        description: data.description,
        metadata: {
          sessionsIncluded: data.sessionsIncluded.toString(),
          duration: data.duration,
          features: JSON.stringify(data.features),
        },
      });

      // Create price in Stripe
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency || 'usd',
        recurring: {
          interval: data.interval,
          interval_count: data.intervalCount || 1,
          trial_period_days: data.trialPeriodDays,
        },
        metadata: {
          planType: 'therapy_plan',
        },
      });

      // Store in database
      const therapyPlan = await prisma.therapyPlan.create({
        data: {
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
          trialPeriodDays: data.trialPeriodDays,
          setupFee: data.setupFee,
        },
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
        outcome: 'SUCCESS',
      });

      return { therapyPlan, product, price };
    } catch (error) {
      await auditLog({
        action: 'THERAPY_PLAN_CREATE_FAILED',
        entity: 'TherapyPlan',
        details: { 
          planName: data.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Subscribe user to therapy plan
   */
  static async subscribeToTherapyPlan(
    userId: string,
    therapyPlanId: string,
    paymentMethodId?: string,
    couponCode?: string
  ): Promise<{ subscription: any; setupIntent?: any }> {
    try {
      // Get user and therapy plan
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { customer: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const therapyPlan = await prisma.therapyPlan.findUnique({
        where: { id: therapyPlanId },
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
          name: user.name || undefined,
        });
        customer = customerResult.customer;
      }

      // Create subscription data
      const subscriptionData: CreateSubscriptionData = {
        customerId: customer.id,
        priceId: therapyPlan.stripePriceId,
        trialPeriodDays: therapyPlan.trialPeriodDays || undefined,
        paymentMethodId,
        metadata: {
          therapyPlanId,
          userId,
          ...(couponCode && { couponCode }),
        },
      };

      // Create subscription
      const { subscription, stripeSubscription } = await StripeService.createSubscription(subscriptionData);

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
        outcome: 'SUCCESS',
      });

      return { subscription, setupIntent };
    } catch (error) {
      await auditLog({
        userId,
        action: 'THERAPY_PLAN_SUBSCRIPTION_FAILED',
        entity: 'Subscription',
        details: { 
          therapyPlanId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Change user's subscription plan
   */
  static async changeSubscriptionPlan(
    userId: string,
    newTherapyPlanId: string,
    prorationBehavior: 'create_prorations' | 'none' | 'always_invoice' = 'create_prorations'
  ): Promise<any> {
    try {
      // Get current active subscription
      const currentSubscription = await prisma.subscription.findFirst({
        where: {
          customer: { userId },
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
        include: { customer: true },
      });

      if (!currentSubscription) {
        throw new Error('No active subscription found');
      }

      // Get new therapy plan
      const newTherapyPlan = await prisma.therapyPlan.findUnique({
        where: { id: newTherapyPlanId },
      });

      if (!newTherapyPlan || !newTherapyPlan.isActive) {
        throw new Error('New therapy plan not found or inactive');
      }

      // Update subscription
      const { subscription } = await StripeService.updateSubscription({
        subscriptionId: currentSubscription.stripeSubscriptionId,
        priceId: newTherapyPlan.stripePriceId,
        prorationBehavior,
      });

      // Update local database
      await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          stripePriceId: newTherapyPlan.stripePriceId,
          stripeProductId: newTherapyPlan.stripeProductId,
          planName: newTherapyPlan.name,
          amount: newTherapyPlan.amount,
          metadata: JSON.stringify({ therapyPlanId: newTherapyPlanId }),
        },
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
        outcome: 'SUCCESS',
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
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Cancel user's subscription
   */
  static async cancelSubscription(
    userId: string,
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
    cancellationReason?: string
  ): Promise<any> {
    try {
      // Verify subscription belongs to user
      const subscription = await prisma.subscription.findFirst({
        where: {
          stripeSubscriptionId: subscriptionId,
          customer: { userId },
        },
        include: { customer: true },
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
        outcome: 'SUCCESS',
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
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Resume canceled subscription
   */
  static async resumeSubscription(userId: string, subscriptionId: string): Promise<any> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          stripeSubscriptionId: subscriptionId,
          customer: { userId },
        },
        include: { customer: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found or not owned by user');
      }

      const stripe = StripeService.getStripeInstance();
      const stripeSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      // Update local database
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: stripeSubscription.status as any,
          cancelAt: null,
        },
      });

      await auditLog({
        userId,
        action: 'SUBSCRIPTION_RESUMED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: { subscriptionId },
        outcome: 'SUCCESS',
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
        outcome: 'FAILURE',
      });
      throw error;
    }
  }

  /**
   * Get user's subscription details
   */
  static async getUserSubscription(userId: string): Promise<any> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        customer: { userId },
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
      },
      include: {
        customer: true,
        subscriptionItems: true,
      },
    });

    if (!subscription) {
      return null;
    }

    // Get Stripe subscription details for real-time data
    const { stripeSubscription } = await StripeService.getSubscription(subscription.stripeSubscriptionId);

    return {
      ...subscription,
      stripeData: stripeSubscription,
    };
  }

  /**
   * Get available therapy plans
   */
  static async getAvailableTherapyPlans(): Promise<any[]> {
    return prisma.therapyPlan.findMany({
      where: { isActive: true },
      orderBy: { amount: 'asc' },
    });
  }

  /**
   * Get subscription analytics (admin only)
   */
  static async getSubscriptionAnalytics(startDate?: Date, endDate?: Date): Promise<SubscriptionAnalytics> {
    const dateFilter = startDate && endDate 
      ? { createdAt: { gte: startDate, lte: endDate } }
      : {};

    // Total subscriptions
    const totalSubscriptions = await prisma.subscription.count({
      where: dateFilter,
    });

    // Active subscriptions
    const activeSubscriptions = await prisma.subscription.count({
      where: {
        status: { in: ['ACTIVE', 'TRIALING'] },
        ...dateFilter,
      },
    });

    // Monthly revenue from active subscriptions
    const activeSubscriptionsData = await prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIALING'] },
        ...dateFilter,
      },
      select: { amount: true, interval: true, intervalCount: true },
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
        ...dateFilter,
      },
      _count: { id: true },
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
        ...dateFilter,
      },
    });

    return {
      totalSubscriptions,
      activeSubscriptions,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      churnRate: totalSubscriptions > 0 ? 
        ((totalSubscriptions - activeSubscriptions) / totalSubscriptions) * 100 : 0,
      trialConversions: trialSubscriptions,
      planDistribution: planDistributionObj,
    };
  }

  /**
   * Process subscription renewal
   */
  static async processSubscriptionRenewal(subscriptionId: string): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        include: { customer: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get updated Stripe subscription
      const { stripeSubscription } = await StripeService.getSubscription(subscriptionId);

      // Update local database
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: stripeSubscription.status as any,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        },
      });

      await auditLog({
        userId: subscription.customer.userId,
        action: 'SUBSCRIPTION_RENEWED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: { 
          subscriptionId,
          newPeriodEnd: stripeSubscription.current_period_end
        },
        outcome: 'SUCCESS',
      });
    } catch (error) {
      await auditLog({
        action: 'SUBSCRIPTION_RENEWAL_FAILED',
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
   * Handle subscription status updates from webhooks
   */
  static async updateSubscriptionStatus(subscriptionId: string, status: string, eventData?: any): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        include: { customer: true },
      });

      if (!subscription) {
        console.log(`Subscription ${subscriptionId} not found in database`);
        return;
      }

      const updateData: any = { status: status.toUpperCase() };

      // Handle specific status updates
      if (status === 'canceled' && eventData) {
        updateData.canceledAt = eventData.canceled_at ? new Date(eventData.canceled_at * 1000) : new Date();
      }

      if (eventData?.current_period_start && eventData?.current_period_end) {
        updateData.currentPeriodStart = new Date(eventData.current_period_start * 1000);
        updateData.currentPeriodEnd = new Date(eventData.current_period_end * 1000);
      }

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: updateData,
      });

      await auditLog({
        userId: subscription.customer.userId,
        action: 'SUBSCRIPTION_STATUS_UPDATED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: { 
          subscriptionId,
          newStatus: status,
          eventType: eventData?.type
        },
        outcome: 'SUCCESS',
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
        outcome: 'FAILURE',
      });
      throw error;
    }
  }
}