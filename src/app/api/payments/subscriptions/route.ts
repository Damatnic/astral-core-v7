/**
 * Subscription Management API
 * Handles subscription operations for therapy plans
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { rateLimit } from '@/lib/security/rate-limit';
import { auditLog } from '@/lib/security/audit';
import { z } from 'zod';

// Validation schemas
const createSubscriptionSchema = z.object({
  therapyPlanId: z.string().min(1),
  paymentMethodId: z.string().optional(),
  couponCode: z.string().optional()
});

const updateSubscriptionSchema = z.object({
  newTherapyPlanId: z.string().min(1),
  prorationBehavior: z.enum(['create_prorations', 'none', 'always_invoice']).optional()
});

const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
  cancelAtPeriodEnd: z.boolean().optional(),
  cancellationReason: z.string().optional()
});

/**
 * GET /api/payments/subscriptions
 * Get user's current subscription
 */
export async function GET(_request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit.check('subscription-read');
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's subscription
    const subscription = await SubscriptionService.getUserSubscription(userId);

    await auditLog({
      userId,
      action: 'SUBSCRIPTION_RETRIEVED',
      entity: 'Subscription',
      details: { hasSubscription: !!subscription },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      subscription,
      success: true
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    await auditLog({
      userId: session?.user?.id,
      action: 'SUBSCRIPTION_RETRIEVAL_FAILED',
      entity: 'Subscription',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      outcome: 'FAILURE'
    });

    console.error('Error retrieving subscription:', error);
    return NextResponse.json({ error: 'Failed to retrieve subscription' }, { status: 500 });
  }
}

/**
 * POST /api/payments/subscriptions
 * Create a new subscription
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit.check('subscription-create');
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many subscription attempts' }, { status: 429 });
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validation
    const validationResult = createSubscriptionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { therapyPlanId, paymentMethodId, couponCode } = validationResult.data;

    // Check if user already has an active subscription
    const existingSubscription = await SubscriptionService.getUserSubscription(userId);
    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      );
    }

    // Create subscription
    const result = await SubscriptionService.subscribeToTherapyPlan(
      userId,
      therapyPlanId,
      paymentMethodId,
      couponCode
    );

    await auditLog({
      userId,
      action: 'SUBSCRIPTION_CREATED_VIA_API',
      entity: 'Subscription',
      entityId: result.subscription.id,
      details: {
        therapyPlanId,
        hasPaymentMethod: !!paymentMethodId,
        couponCode
      },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      subscription: result.subscription,
      setupIntent: result.setupIntent,
      success: true,
      message: paymentMethodId
        ? 'Subscription created successfully'
        : 'Subscription created. Please complete payment setup.'
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    await auditLog({
      userId: session?.user?.id,
      action: 'SUBSCRIPTION_CREATION_FAILED_API',
      entity: 'Subscription',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      outcome: 'FAILURE'
    });

    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

/**
 * PUT /api/payments/subscriptions
 * Update subscription (change plan)
 */
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit.check('subscription-update');
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many update attempts' }, { status: 429 });
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validation
    const validationResult = updateSubscriptionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { newTherapyPlanId, prorationBehavior } = validationResult.data;

    // Update subscription
    const updatedSubscription = await SubscriptionService.changeSubscriptionPlan(
      userId,
      newTherapyPlanId,
      prorationBehavior
    );

    await auditLog({
      userId,
      action: 'SUBSCRIPTION_UPDATED_VIA_API',
      entity: 'Subscription',
      details: {
        newTherapyPlanId,
        prorationBehavior
      },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      subscription: updatedSubscription,
      success: true,
      message: 'Subscription updated successfully'
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    await auditLog({
      userId: session?.user?.id,
      action: 'SUBSCRIPTION_UPDATE_FAILED_API',
      entity: 'Subscription',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      outcome: 'FAILURE'
    });

    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payments/subscriptions
 * Cancel subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit.check('subscription-cancel');
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many cancellation attempts' }, { status: 429 });
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validation
    const validationResult = cancelSubscriptionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { subscriptionId, cancelAtPeriodEnd, cancellationReason } = validationResult.data;

    // Cancel subscription
    const canceledSubscription = await SubscriptionService.cancelSubscription(
      userId,
      subscriptionId,
      cancelAtPeriodEnd ?? true,
      cancellationReason
    );

    await auditLog({
      userId,
      action: 'SUBSCRIPTION_CANCELED_VIA_API',
      entity: 'Subscription',
      details: {
        subscriptionId,
        cancelAtPeriodEnd,
        cancellationReason
      },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      subscription: canceledSubscription,
      success: true,
      message: cancelAtPeriodEnd
        ? 'Subscription will be canceled at the end of the billing period'
        : 'Subscription canceled immediately'
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    await auditLog({
      userId: session?.user?.id,
      action: 'SUBSCRIPTION_CANCELLATION_FAILED_API',
      entity: 'Subscription',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      outcome: 'FAILURE'
    });

    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
