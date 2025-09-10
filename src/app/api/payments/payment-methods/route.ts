/**
 * Payment Methods API
 * Handles payment method management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { StripeService } from '@/lib/services/stripe-service';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/security/rate-limit';
import { auditLog } from '@/lib/security/audit';
import { z } from 'zod';

// Validation schemas
const setupIntentSchema = z.object({
  returnUrl: z.string().url().optional()
});

const attachPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
  setAsDefault: z.boolean().optional()
});

const updatePaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
  isDefault: z.boolean().optional()
});

/**
 * GET /api/payments/payment-methods
 * Get user's saved payment methods
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'payment-methods-read', 20, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's customer record
    const customer = await prisma.customer.findUnique({
      where: { userId }
    });

    if (!customer) {
      return NextResponse.json({
        paymentMethods: [],
        success: true
      });
    }

    // Get payment methods from database
    const dbPaymentMethods = await prisma.paymentMethod.findMany({
      where: {
        customerId: customer.id,
        isActive: true
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
    });

    // Get fresh data from Stripe for active payment methods
    const stripePaymentMethods = await StripeService.getPaymentMethods(customer.id);

    // Combine database and Stripe data
    const paymentMethods = dbPaymentMethods.map(dbMethod => {
      const stripeMethod = stripePaymentMethods.find(
        sm => sm.id === dbMethod.stripePaymentMethodId
      );

      return {
        id: dbMethod.id,
        stripePaymentMethodId: dbMethod.stripePaymentMethodId,
        type: dbMethod.type,
        card: dbMethod.card ? JSON.parse(dbMethod.card) : null,
        isDefault: dbMethod.isDefault,
        isActive: dbMethod.isActive,
        createdAt: dbMethod.createdAt,
        // Include fresh Stripe data if available
        stripeData: stripeMethod || null
      };
    });

    await auditLog({
      userId,
      action: 'PAYMENT_METHODS_RETRIEVED',
      entity: 'PaymentMethod',
      details: {
        count: paymentMethods.length,
        customerId: customer.id
      },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      paymentMethods,
      success: true
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    await auditLog({
      userId: session?.user?.id,
      action: 'PAYMENT_METHODS_RETRIEVAL_FAILED',
      entity: 'PaymentMethod',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      outcome: 'FAILURE'
    });

    console.error('Error retrieving payment methods:', error);
    return NextResponse.json({ error: 'Failed to retrieve payment methods' }, { status: 500 });
  }
}

/**
 * POST /api/payments/payment-methods
 * Create setup intent for adding new payment method
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'setup-intent-create', 10, 300000);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many setup attempts' }, { status: 429 });
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validation
    const validationResult = setupIntentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    // Get or create customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let customer = user.customer;
    if (!customer) {
      const customerResult = await StripeService.createCustomer({
        userId: user.id,
        email: user.email,
        name: user.name || undefined
      });
      customer = customerResult.customer;
    }

    // Create setup intent
    const setupIntent = await StripeService.createSetupIntent(customer.id);

    await auditLog({
      userId,
      action: 'SETUP_INTENT_CREATED_API',
      entity: 'PaymentMethod',
      details: {
        setupIntentId: setupIntent.id,
        customerId: customer.id
      },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      setupIntent: {
        id: setupIntent.id,
        client_secret: setupIntent.client_secret,
        status: setupIntent.status
      },
      success: true,
      message: 'Setup intent created successfully'
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    await auditLog({
      userId: session?.user?.id,
      action: 'SETUP_INTENT_CREATION_FAILED',
      entity: 'PaymentMethod',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      outcome: 'FAILURE'
    });

    console.error('Error creating setup intent:', error);
    return NextResponse.json({ error: 'Failed to create setup intent' }, { status: 500 });
  }
}

/**
 * PUT /api/payments/payment-methods
 * Attach payment method or update default
 */
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'payment-method-update', 10, 300000);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many update attempts' }, { status: 429 });
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Check if this is an attach or update operation
    if (body.paymentMethodId && !body.isDefault) {
      // Attach new payment method
      const validationResult = attachPaymentMethodSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validationResult.error.errors
          },
          { status: 400 }
        );
      }

      const { paymentMethodId, setAsDefault } = validationResult.data;

      // Get customer
      const customer = await prisma.customer.findUnique({
        where: { userId }
      });

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      // Store payment method
      const paymentMethod = await StripeService.storePaymentMethod(customer.id, paymentMethodId);

      // Set as default if requested
      if (setAsDefault) {
        // Remove default from other payment methods
        await prisma.paymentMethod.updateMany({
          where: {
            customerId: customer.id,
            isDefault: true
          },
          data: { isDefault: false }
        });

        // Set new default
        await prisma.paymentMethod.update({
          where: { id: paymentMethod.id },
          data: { isDefault: true }
        });
      }

      await auditLog({
        userId,
        action: 'PAYMENT_METHOD_ATTACHED',
        entity: 'PaymentMethod',
        entityId: paymentMethod.id,
        details: {
          paymentMethodId,
          setAsDefault
        },
        outcome: 'SUCCESS'
      });

      return NextResponse.json({
        paymentMethod,
        success: true,
        message: 'Payment method added successfully'
      });
    } else {
      // Update existing payment method
      const validationResult = updatePaymentMethodSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validationResult.error.errors
          },
          { status: 400 }
        );
      }

      const { paymentMethodId, isDefault } = validationResult.data;

      // Get customer and payment method
      const customer = await prisma.customer.findUnique({
        where: { userId }
      });

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          customerId: customer.id,
          stripePaymentMethodId: paymentMethodId
        }
      });

      if (!paymentMethod) {
        return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
      }

      // Update default status
      if (isDefault !== undefined) {
        if (isDefault) {
          // Remove default from other payment methods
          await prisma.paymentMethod.updateMany({
            where: {
              customerId: customer.id,
              isDefault: true
            },
            data: { isDefault: false }
          });
        }

        // Update this payment method
        await prisma.paymentMethod.update({
          where: { id: paymentMethod.id },
          data: { isDefault }
        });
      }

      await auditLog({
        userId,
        action: 'PAYMENT_METHOD_UPDATED',
        entity: 'PaymentMethod',
        entityId: paymentMethod.id,
        details: {
          paymentMethodId,
          isDefault
        },
        outcome: 'SUCCESS'
      });

      return NextResponse.json({
        success: true,
        message: 'Payment method updated successfully'
      });
    }
  } catch (error) {
    const session = await getServerSession(authOptions);

    await auditLog({
      userId: session?.user?.id,
      action: 'PAYMENT_METHOD_UPDATE_FAILED',
      entity: 'PaymentMethod',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      outcome: 'FAILURE'
    });

    console.error('Error updating payment method:', error);
    return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 });
  }
}

/**
 * DELETE /api/payments/payment-methods/{id}
 * Remove payment method
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'payment-method-delete', 5, 300000);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many delete attempts' }, { status: 429 });
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const paymentMethodId = searchParams.get('paymentMethodId');

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 });
    }

    // Get customer and payment method
    const customer = await prisma.customer.findUnique({
      where: { userId }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        customerId: customer.id,
        stripePaymentMethodId: paymentMethodId
      }
    });

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // Detach from Stripe
    const stripe = StripeService.getStripeInstance();
    await stripe.paymentMethods.detach(paymentMethodId);

    // Mark as inactive in database (don't delete for audit purposes)
    await prisma.paymentMethod.update({
      where: { id: paymentMethod.id },
      data: {
        isActive: false,
        isDefault: false
      }
    });

    await auditLog({
      userId,
      action: 'PAYMENT_METHOD_REMOVED',
      entity: 'PaymentMethod',
      entityId: paymentMethod.id,
      details: { paymentMethodId },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      success: true,
      message: 'Payment method removed successfully'
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    await auditLog({
      userId: session?.user?.id,
      action: 'PAYMENT_METHOD_REMOVAL_FAILED',
      entity: 'PaymentMethod',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      outcome: 'FAILURE'
    });

    console.error('Error removing payment method:', error);
    return NextResponse.json({ error: 'Failed to remove payment method' }, { status: 500 });
  }
}
