/**
 * Therapy Plans API
 * Handles therapy plan management (admin) and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { SubscriptionService, TherapyPlanData } from '@/lib/services/subscription-service';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/security/rate-limit';
import { auditLog } from '@/lib/security/audit';
import { z } from 'zod';

// Validation schemas
const createTherapyPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  amount: z.number().min(1).max(10000),
  currency: z.string().optional().default('usd'),
  interval: z.enum(['month', 'year']),
  intervalCount: z.number().min(1).max(12).optional().default(1),
  sessionsIncluded: z.number().min(1).max(100),
  duration: z.string().min(1).max(50),
  features: z.array(z.string()).min(1),
  trialPeriodDays: z.number().min(1).max(90).optional(),
  setupFee: z.number().min(0).max(1000).optional()
});

const updateTherapyPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(1000).optional(),
  features: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional()
});

/**
 * GET /api/payments/therapy-plans
 * Get available therapy plans
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit.check('therapy-plans-read');
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Get session for potential admin access
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN';

    // Determine filter based on user role
    const whereClause = includeInactive && isAdmin ? {} : { isActive: true };

    // Get therapy plans
    const therapyPlans = await prisma.therapyPlan.findMany({
      where: whereClause,
      orderBy: [{ isActive: 'desc' }, { amount: 'asc' }]
    });

    // Add analytics for admin users
    let analytics = null;
    if (isAdmin && session?.user?.id) {
      try {
        analytics = await SubscriptionService.getSubscriptionAnalytics();
      } catch (error) {
        console.warn('Failed to fetch subscription analytics:', error);
      }
    }

    if (session?.user?.id) {
      await auditLog({
        userId: session.user.id,
        action: 'THERAPY_PLANS_RETRIEVED',
        entity: 'TherapyPlan',
        details: {
          count: therapyPlans.length,
          includeInactive,
          isAdmin
        },
        outcome: 'SUCCESS'
      });
    }

    return NextResponse.json({
      therapyPlans,
      analytics,
      success: true
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      await auditLog({
        userId: session.user.id,
        action: 'THERAPY_PLANS_RETRIEVAL_FAILED',
        entity: 'TherapyPlan',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        outcome: 'FAILURE'
      });
    }

    console.error('Error retrieving therapy plans:', error);
    return NextResponse.json({ error: 'Failed to retrieve therapy plans' }, { status: 500 });
  }
}

/**
 * POST /api/payments/therapy-plans
 * Create new therapy plan (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit.check('therapy-plan-create');
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many creation attempts' }, { status: 429 });
    }

    // Authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validation
    const validationResult = createTherapyPlanSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { trialPeriodDays, setupFee, ...baseData } = validationResult.data;
    const planData: TherapyPlanData = {
      ...baseData,
      ...(trialPeriodDays !== undefined && { trialPeriodDays }),
      ...(setupFee !== undefined && { setupFee })
    };

    // Create therapy plan
    const result = await SubscriptionService.createTherapyPlan(planData);
    const therapyPlan = (result as any).therapyPlan || result;
    const { product, price } = result;

    await auditLog({
      userId,
      action: 'THERAPY_PLAN_CREATED_VIA_API',
      entity: 'TherapyPlan',
      entityId: therapyPlan.id,
      details: {
        planName: planData.name,
        amount: planData.amount,
        stripePriceId: price.id,
        stripeProductId: product.id
      },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      therapyPlan,
      success: true,
      message: 'Therapy plan created successfully'
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      await auditLog({
        userId: session.user.id,
        action: 'THERAPY_PLAN_CREATION_FAILED_API',
        entity: 'TherapyPlan',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        outcome: 'FAILURE'
      });
    }

    console.error('Error creating therapy plan:', error);
    return NextResponse.json({ error: 'Failed to create therapy plan' }, { status: 500 });
  }
}

/**
 * PUT /api/payments/therapy-plans
 * Update therapy plan (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit.check('therapy-plan-update');
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many update attempts' }, { status: 429 });
    }

    // Authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validation
    const validationResult = updateTherapyPlanSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { id, ...restData } = validationResult.data;

    // Filter out undefined values for exactOptionalPropertyTypes
    const updateData: any = {};
    for (const [key, value] of Object.entries(restData)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    // Check if therapy plan exists
    const existingPlan = await prisma.therapyPlan.findUnique({
      where: { id }
    });

    if (!existingPlan) {
      return NextResponse.json({ error: 'Therapy plan not found' }, { status: 404 });
    }

    // Update therapy plan
    const updatedPlan = await prisma.therapyPlan.update({
      where: { id },
      data: updateData
    });

    // If updating Stripe product info is needed (for name/description changes)
    if (updateData.name || updateData.description) {
      try {
        const stripe = await import('stripe').then(
          Stripe =>
            new Stripe.default(process.env['STRIPE_SECRET_KEY']!, {
              apiVersion: '2025-08-27.basil'
            })
        );

        await stripe.products.update(existingPlan.stripeProductId, {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.description && { description: updateData.description }),
          ...(updateData.features && {
            metadata: {
              features: JSON.stringify(updateData.features)
            }
          })
        });
      } catch (stripeError) {
        console.warn('Failed to update Stripe product:', stripeError);
        // Continue with database update even if Stripe update fails
      }
    }

    await auditLog({
      userId,
      action: 'THERAPY_PLAN_UPDATED_VIA_API',
      entity: 'TherapyPlan',
      entityId: id,
      details: {
        oldData: existingPlan,
        newData: updateData
      },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      therapyPlan: updatedPlan,
      success: true,
      message: 'Therapy plan updated successfully'
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      await auditLog({
        userId: session.user.id,
        action: 'THERAPY_PLAN_UPDATE_FAILED_API',
        entity: 'TherapyPlan',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        outcome: 'FAILURE'
      });
    }

    console.error('Error updating therapy plan:', error);
    return NextResponse.json({ error: 'Failed to update therapy plan' }, { status: 500 });
  }
}

/**
 * DELETE /api/payments/therapy-plans/{id}
 * Deactivate therapy plan (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit.check('therapy-plan-delete');
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many delete attempts' }, { status: 429 });
    }

    // Authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Check if therapy plan exists
    const existingPlan = await prisma.therapyPlan.findUnique({
      where: { id: planId }
    });

    if (!existingPlan) {
      return NextResponse.json({ error: 'Therapy plan not found' }, { status: 404 });
    }

    // Check if plan has active subscriptions
    const activeSubscriptions = await prisma.subscription.count({
      where: {
        stripeProductId: existingPlan.stripeProductId,
        status: { in: ['ACTIVE', 'TRIALING'] }
      }
    });

    if (activeSubscriptions > 0) {
      return NextResponse.json(
        {
          error: 'Cannot deactivate therapy plan with active subscriptions',
          activeSubscriptions
        },
        { status: 400 }
      );
    }

    // Deactivate therapy plan (don't delete for audit purposes)
    const deactivatedPlan = await prisma.therapyPlan.update({
      where: { id: planId },
      data: { isActive: false }
    });

    // Deactivate Stripe product
    try {
      const stripe = await import('stripe').then(
        Stripe =>
          new Stripe.default(process.env['STRIPE_SECRET_KEY']!, {
            apiVersion: '2025-08-27.basil'
          })
      );

      await stripe.products.update(existingPlan.stripeProductId, {
        active: false
      });
    } catch (stripeError) {
      console.warn('Failed to deactivate Stripe product:', stripeError);
      // Continue with database update even if Stripe update fails
    }

    await auditLog({
      userId,
      action: 'THERAPY_PLAN_DEACTIVATED_VIA_API',
      entity: 'TherapyPlan',
      entityId: planId,
      details: {
        planName: existingPlan.name,
        activeSubscriptions
      },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      therapyPlan: deactivatedPlan,
      success: true,
      message: 'Therapy plan deactivated successfully'
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      await auditLog({
        userId: session.user.id,
        action: 'THERAPY_PLAN_DEACTIVATION_FAILED_API',
        entity: 'TherapyPlan',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        outcome: 'FAILURE'
      });
    }

    console.error('Error deactivating therapy plan:', error);
    return NextResponse.json({ error: 'Failed to deactivate therapy plan' }, { status: 500 });
  }
}
