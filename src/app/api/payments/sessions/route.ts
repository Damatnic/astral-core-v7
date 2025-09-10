/**
 * Session Payment API
 * Handles one-time payments for therapy sessions
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
const createPaymentSchema = z.object({
  appointmentId: z.string().min(1),
  amount: z.number().min(1).max(10000), // Max $10,000 per session
  paymentMethodId: z.string().optional(),
  savePaymentMethod: z.boolean().optional()
});

const refundPaymentSchema = z.object({
  paymentIntentId: z.string().min(1),
  amount: z.number().min(0.01).optional(),
  reason: z.string().optional()
});

/**
 * POST /api/payments/sessions
 * Create payment intent for session payment
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'session-payment', 5, 300000);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many payment attempts' }, { status: 429 });
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validation
    const validationResult = createPaymentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { appointmentId, amount, paymentMethodId, savePaymentMethod } = validationResult.data;

    // Verify appointment belongs to user and is valid for payment
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        OR: [{ userId: userId }, { therapistId: userId }]
      },
      include: {
        user: true,
        therapist: {
          include: {
            therapistProfile: true
          }
        },
        payments: true
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found or unauthorized' }, { status: 404 });
    }

    // Check if appointment is in a valid state for payment
    if (!['SCHEDULED', 'CONFIRMED', 'COMPLETED'].includes(appointment.status)) {
      return NextResponse.json(
        { error: 'Appointment is not in a valid state for payment' },
        { status: 400 }
      );
    }

    // Check if payment already exists for this appointment
    const existingPayment = appointment.payments.find(p =>
      ['SUCCEEDED', 'PROCESSING', 'REQUIRES_CONFIRMATION'].includes(p.status)
    );

    if (existingPayment) {
      return NextResponse.json(
        { error: 'Payment already exists for this appointment' },
        { status: 400 }
      );
    }

    // Determine who is paying (client pays for the session)
    const payingUserId = appointment.userId; // Client pays

    // Get or create customer
    const customer = await StripeService.getOrCreateCustomer(
      payingUserId,
      appointment.user.email,
      appointment.user.name || undefined
    );

    // Create payment intent
    const { payment, paymentIntent } = await StripeService.createPaymentIntent({
      customerId: customer.id,
      amount,
      paymentMethodId,
      description: `Therapy session payment - ${appointment.scheduledAt.toDateString()}`,
      appointmentId,
      metadata: {
        appointmentId,
        therapistId: appointment.therapistId,
        sessionDate: appointment.scheduledAt.toISOString()
      }
    });

    // If saving payment method, attach it to customer
    if (savePaymentMethod && paymentMethodId) {
      try {
        await StripeService.storePaymentMethod(customer.id, paymentMethodId);
      } catch (error) {
        console.warn('Failed to save payment method:', error);
        // Don't fail the payment creation for this
      }
    }

    await auditLog({
      userId,
      action: 'SESSION_PAYMENT_CREATED',
      entity: 'Payment',
      entityId: payment.id,
      details: {
        appointmentId,
        amount,
        paymentIntentId: paymentIntent.id,
        payingUserId
      },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      payment,
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status
      },
      success: true,
      message: 'Payment intent created successfully'
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    await auditLog({
      userId: session?.user?.id,
      action: 'SESSION_PAYMENT_CREATION_FAILED',
      entity: 'Payment',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      outcome: 'FAILURE'
    });

    console.error('Error creating session payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

/**
 * GET /api/payments/sessions
 * Get payment history for user's sessions
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'payment-history', 20, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's customer record
    const customer = await prisma.customer.findUnique({
      where: { userId }
    });

    if (!customer) {
      return NextResponse.json({
        payments: [],
        total: 0,
        success: true
      });
    }

    // Get payment history
    const payments = await prisma.payment.findMany({
      where: {
        customerId: customer.id,
        type: 'SESSION_PAYMENT'
      },
      include: {
        appointment: {
          include: {
            therapist: {
              select: {
                name: true,
                therapistProfile: {
                  select: {
                    specializations: true
                  }
                }
              }
            }
          }
        },
        refunds: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    // Get total count
    const totalCount = await prisma.payment.count({
      where: {
        customerId: customer.id,
        type: 'SESSION_PAYMENT'
      }
    });

    await auditLog({
      userId,
      action: 'PAYMENT_HISTORY_RETRIEVED',
      entity: 'Payment',
      details: {
        limit,
        offset,
        totalCount
      },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      payments,
      total: totalCount,
      success: true
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    await auditLog({
      userId: session?.user?.id,
      action: 'PAYMENT_HISTORY_RETRIEVAL_FAILED',
      entity: 'Payment',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      outcome: 'FAILURE'
    });

    console.error('Error retrieving payment history:', error);
    return NextResponse.json({ error: 'Failed to retrieve payment history' }, { status: 500 });
  }
}

/**
 * POST /api/payments/sessions/refund
 * Process refund for session payment (therapist or admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'payment-refund', 3, 300000);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many refund attempts' }, { status: 429 });
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Check authorization - only therapists and admins can process refunds
    if (!['THERAPIST', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    // Validation
    const validationResult = refundPaymentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { paymentIntentId, amount, reason } = validationResult.data;

    // Get payment details
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      include: {
        customer: true,
        appointment: true
      }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Additional authorization check for therapists
    if (userRole === 'THERAPIST') {
      if (!payment.appointment || payment.appointment.therapistId !== userId) {
        return NextResponse.json(
          { error: 'You can only refund payments for your own appointments' },
          { status: 403 }
        );
      }
    }

    // Check if payment is refundable
    if (payment.status !== 'SUCCEEDED') {
      return NextResponse.json({ error: 'Payment is not in a refundable state' }, { status: 400 });
    }

    // Process refund
    const { refund } = await StripeService.createRefund(paymentIntentId, amount, reason);

    await auditLog({
      userId,
      action: 'SESSION_PAYMENT_REFUNDED',
      entity: 'Refund',
      entityId: refund.id,
      details: {
        paymentIntentId,
        refundAmount: amount || payment.amount,
        reason,
        originalPaymentAmount: payment.amount
      },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      refund,
      success: true,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    await auditLog({
      userId: session?.user?.id,
      action: 'SESSION_PAYMENT_REFUND_FAILED',
      entity: 'Refund',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      outcome: 'FAILURE'
    });

    console.error('Error processing refund:', error);
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 });
  }
}
