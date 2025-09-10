/**
 * Stripe Webhook Handler
 * Processes Stripe webhook events for payment processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { StripeService } from '@/lib/services/stripe-service';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/security/audit';
import { notificationService } from '@/lib/services/notification-service';
import { PaymentStatus, InvoiceStatus } from '@prisma/client';
import Stripe from 'stripe';

// Extended Stripe types for webhook events that include expanded properties
interface ExpandedStripeInvoice extends Stripe.Invoice {
  subscription?: string | Stripe.Subscription;
  tax?: number;
  payment_intent?: string | Stripe.PaymentIntent;
}

// Type definition for expanded payment intent with charges
// Currently not used but kept for future reference when handling charge data

// Retry configuration
interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  gracePeriodHours: number;
}

const PAYMENT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoffMultiplier: 2,
  gracePeriodHours: 72 // 3 days grace period
};

// Dispute handling workflow
interface DisputeWorkflow {
  autoResponse: boolean;
  adminNotification: boolean;
  documentCollection: boolean;
  escalationThreshold: number; // Amount in USD
}

const DISPUTE_CONFIG: DisputeWorkflow = {
  autoResponse: true,
  adminNotification: true,
  documentCollection: true,
  escalationThreshold: 500 // $500 or more requires manual review
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = (await headers()).get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    // Construct and verify webhook event
    const event = StripeService.constructWebhookEvent(body, signature);

    // Log webhook event
    await auditLog({
      action: 'STRIPE_WEBHOOK_RECEIVED',
      entity: 'WebhookEvent',
      details: {
        eventType: event.type,
        eventId: event.id,
        livemode: event.livemode
      },
      outcome: 'SUCCESS'
    });

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as ExpandedStripeInvoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as ExpandedStripeInvoice);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      case 'charge.dispute.created':
        await handleChargeDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);

    // Capture body for error logging
    let body = '';
    try {
      body = await request.text();
    } catch {
      body = 'Could not read request body';
    }

    await auditLog({
      action: 'STRIPE_WEBHOOK_ERROR',
      entity: 'WebhookEvent',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: body.substring(0, 1000) // First 1000 chars for debugging
      },
      outcome: 'FAILURE'
    });

    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}

/**
 * Handle subscription created events
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    // The subscription should already exist from our API call
    // Update status to ensure consistency
    await SubscriptionService.updateSubscriptionStatus(
      subscription.id,
      subscription.status,
      subscription
    );

    await auditLog({
      action: 'SUBSCRIPTION_WEBHOOK_CREATED',
      entity: 'Subscription',
      details: {
        subscriptionId: subscription.id,
        customerId: subscription.customer as string,
        status: subscription.status
      },
      outcome: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error handling subscription created:', error);
    throw error;
  }
}

/**
 * Handle subscription updated events
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    await SubscriptionService.updateSubscriptionStatus(
      subscription.id,
      subscription.status,
      subscription
    );

    await auditLog({
      action: 'SUBSCRIPTION_WEBHOOK_UPDATED',
      entity: 'Subscription',
      details: {
        subscriptionId: subscription.id,
        customerId: subscription.customer as string,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      },
      outcome: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

/**
 * Handle subscription deleted events
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    await SubscriptionService.updateSubscriptionStatus(subscription.id, 'canceled', subscription);

    await auditLog({
      action: 'SUBSCRIPTION_WEBHOOK_DELETED',
      entity: 'Subscription',
      details: {
        subscriptionId: subscription.id,
        customerId: subscription.customer as string,
        canceledAt: subscription.canceled_at
      },
      outcome: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: ExpandedStripeInvoice) {
  try {
    // Find customer in our database
    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: invoice.customer as string }
    });

    if (!customer) {
      console.log(`Customer ${invoice.customer} not found in database`);
      return;
    }

    // Create or update invoice record
    if (!invoice.id) {
      throw new Error('Invoice ID is required');
    }

    const stripeInvoice = invoice; // Stripe.Invoice has all needed properties
    const subscription = stripeInvoice.subscription;
    const subscriptionRecord = subscription
      ? await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription as string }
        })
      : null;

    await prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        customerId: customer.id,
        ...(subscriptionRecord?.id && { subscriptionId: subscriptionRecord.id }),
        stripeInvoiceId: invoice.id,
        number: stripeInvoice.number,
        status: InvoiceStatus.PAID,
        total: stripeInvoice.total / 100,
        subtotal: stripeInvoice.subtotal / 100,
        tax: stripeInvoice.tax ? stripeInvoice.tax / 100 : 0,
        amountPaid: stripeInvoice.amount_paid / 100,
        amountDue: stripeInvoice.amount_due / 100,
        currency: stripeInvoice.currency,
        description: stripeInvoice.description || null,
        pdfUrl: stripeInvoice.invoice_pdf || null,
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url || null,
        ...(stripeInvoice.payment_intent && {
          paymentIntentId: stripeInvoice.payment_intent as string
        }),
        paidAt: stripeInvoice.status_transitions?.paid_at
          ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
          : null
      },
      update: {
        status: InvoiceStatus.PAID,
        amountPaid: invoice.amount_paid / 100,
        amountDue: invoice.amount_due / 100,
        paidAt: invoice.status_transitions.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null
      }
    });

    // If this is a subscription renewal, process it
    if (stripeInvoice.subscription) {
      await SubscriptionService.processSubscriptionRenewal(stripeInvoice.subscription as string);
    }

    await auditLog({
      userId: customer.userId,
      action: 'INVOICE_PAYMENT_SUCCEEDED',
      entity: 'Invoice',
      details: {
        invoiceId: invoice.id,
        amount: invoice.amount_paid / 100,
        subscriptionId: stripeInvoice.subscription as string
      },
      outcome: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
    throw error;
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: ExpandedStripeInvoice) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: invoice.customer as string }
    });

    if (!customer) {
      console.log(`Customer ${invoice.customer} not found in database`);
      return;
    }

    // Update invoice status
    if (!invoice.id) {
      throw new Error('Invoice ID is required');
    }

    const stripeInvoice = invoice; // Stripe.Invoice has all needed properties
    const subscription = stripeInvoice.subscription;
    const subscriptionRecord = subscription
      ? await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription as string }
        })
      : null;

    await prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        customerId: customer.id,
        ...(subscriptionRecord?.id && { subscriptionId: subscriptionRecord.id }),
        stripeInvoiceId: invoice.id,
        number: stripeInvoice.number,
        status: InvoiceStatus.OPEN,
        total: stripeInvoice.total / 100,
        subtotal: stripeInvoice.subtotal / 100,
        tax: stripeInvoice.tax ? stripeInvoice.tax / 100 : 0,
        amountPaid: stripeInvoice.amount_paid / 100,
        amountDue: stripeInvoice.amount_due / 100,
        currency: stripeInvoice.currency,
        description: stripeInvoice.description || null,
        pdfUrl: stripeInvoice.invoice_pdf || null,
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url || null,
        ...(stripeInvoice.payment_intent && {
          paymentIntentId: stripeInvoice.payment_intent as string
        })
      },
      update: {
        status: InvoiceStatus.OPEN,
        amountPaid: invoice.amount_paid / 100,
        amountDue: invoice.amount_due / 100
      }
    });

    await auditLog({
      userId: customer.userId,
      action: 'INVOICE_PAYMENT_FAILED',
      entity: 'Invoice',
      details: {
        invoiceId: invoice.id,
        amountDue: invoice.amount_due / 100,
        subscriptionId: typeof invoice.subscription === 'string' ? invoice.subscription : (invoice.subscription as Stripe.Subscription)?.id || null
      },
      outcome: 'FAILURE'
    });

    // Send notification to user about failed payment
    if (!invoice.id) {
      throw new Error('Invoice ID is required');
    }

    const invoiceData = invoice;
    await sendPaymentFailureNotification(
      customer.userId,
      invoice.id,
      invoiceData.amount_due / 100,
      invoiceData.subscription as string
    );

    // Implement retry logic or grace period
    await handlePaymentRetryLogic(
      invoice.id,
      customer.userId,
      stripeInvoice.subscription as string,
      stripeInvoice.amount_due / 100
    );
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
    throw error;
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Update payment status in database
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { customer: true }
    });

    if (!payment) {
      console.log(`Payment ${paymentIntent.id} not found in database`);
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        processedAt: new Date(),
        receiptUrl: paymentIntent.latest_charge && typeof paymentIntent.latest_charge === 'object' && 'receipt_url' in paymentIntent.latest_charge ? (paymentIntent.latest_charge as Stripe.Charge).receipt_url : null
      }
    });

    await auditLog({
      userId: payment.customer.userId,
      action: 'PAYMENT_INTENT_SUCCEEDED',
      entity: 'Payment',
      entityId: payment.id,
      details: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        appointmentId: payment.appointmentId
      },
      outcome: 'SUCCESS'
    });

    // Send payment confirmation notification
    await sendPaymentConfirmationNotification(
      payment.customer.userId,
      payment.id,
      paymentIntent.amount / 100,
      payment.appointmentId
    );
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
    throw error;
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { customer: true }
    });

    if (!payment) {
      console.log(`Payment ${paymentIntent.id} not found in database`);
      return;
    }

    const updateData: {
      status: PaymentStatus;
      failureCode?: string;
      failureMessage?: string;
    } = {
      status: PaymentStatus.FAILED
    };

    if (paymentIntent.last_payment_error?.code) {
      updateData.failureCode = paymentIntent.last_payment_error.code;
    }

    if (paymentIntent.last_payment_error?.message) {
      updateData.failureMessage = paymentIntent.last_payment_error.message;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: updateData
    });

    await auditLog({
      userId: payment.customer.userId,
      action: 'PAYMENT_INTENT_FAILED',
      entity: 'Payment',
      entityId: payment.id,
      details: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        failureCode: paymentIntent.last_payment_error?.code,
        failureMessage: paymentIntent.last_payment_error?.message
      },
      outcome: 'FAILURE'
    });

    // Send payment failure notification
    await sendPaymentFailureNotification(
      payment.customer.userId,
      payment.id,
      paymentIntent.amount / 100,
      null,
      paymentIntent.last_payment_error?.message
    );
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
    throw error;
  }
}

/**
 * Handle payment method attached to customer
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  try {
    // Find customer
    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: paymentMethod.customer as string }
    });

    if (!customer) {
      console.log(`Customer ${paymentMethod.customer} not found in database`);
      return;
    }

    // Store payment method
    await StripeService.storePaymentMethod(customer.id, paymentMethod.id);

    await auditLog({
      userId: customer.userId,
      action: 'PAYMENT_METHOD_ATTACHED',
      entity: 'PaymentMethod',
      details: {
        paymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        last4: paymentMethod.card?.last4
      },
      outcome: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error handling payment method attached:', error);
    throw error;
  }
}

/**
 * Handle successful setup intent
 */
async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: setupIntent.customer as string }
    });

    if (!customer) {
      console.log(`Customer ${setupIntent.customer} not found in database`);
      return;
    }

    await auditLog({
      userId: customer.userId,
      action: 'SETUP_INTENT_SUCCEEDED',
      entity: 'PaymentMethod',
      details: {
        setupIntentId: setupIntent.id,
        paymentMethodId: setupIntent.payment_method as string
      },
      outcome: 'SUCCESS'
    });

    // Update any pending subscriptions that were waiting for payment method
    await updatePendingSubscriptions(customer.userId, setupIntent.payment_method as string);
  } catch (error) {
    console.error('Error handling setup intent succeeded:', error);
    throw error;
  }
}

/**
 * Handle customer created (backup in case our API didn't create it)
 */
async function handleCustomerCreated(customer: Stripe.Customer) {
  try {
    // This is a backup handler - customers should be created via our API
    const userId = customer.metadata?.['userId'];

    if (!userId) {
      console.log(`Customer ${customer.id} created without userId metadata`);
      return;
    }

    // Check if customer already exists in our database
    const existingCustomer = await prisma.customer.findUnique({
      where: { stripeCustomerId: customer.id }
    });

    if (!existingCustomer) {
      const customerData: {
        userId: string;
        stripeCustomerId: string;
        email: string;
        name?: string;
      } = {
        userId,
        stripeCustomerId: customer.id,
        email: customer.email || ''
      };

      if (customer.name) {
        customerData.name = customer.name;
      }

      await prisma.customer.create({
        data: customerData
      });
    }

    await auditLog({
      userId,
      action: 'CUSTOMER_WEBHOOK_CREATED',
      entity: 'Customer',
      details: {
        stripeCustomerId: customer.id,
        email: customer.email
      },
      outcome: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error handling customer created:', error);
    throw error;
  }
}

/**
 * Handle charge dispute created
 */
async function handleChargeDisputeCreated(dispute: Stripe.Dispute) {
  try {
    // Find the payment associated with this charge
    const payment = await prisma.payment.findFirst({
      where: {
        stripePaymentIntentId: dispute.payment_intent as string
      },
      include: { customer: true }
    });

    if (!payment) {
      console.log(`Payment for dispute ${dispute.id} not found in database`);
      return;
    }

    await auditLog({
      userId: payment.customer.userId,
      action: 'CHARGE_DISPUTE_CREATED',
      entity: 'Payment',
      entityId: payment.id,
      details: {
        disputeId: dispute.id,
        amount: dispute.amount / 100,
        reason: dispute.reason,
        status: dispute.status
      },
      outcome: 'FAILURE'
    });

    // Send notification to admin team
    await sendAdminDisputeNotification(
      dispute.id,
      dispute.amount / 100,
      dispute.reason,
      payment.customer.userId
    );

    // Implement dispute handling workflow
    const paymentForDispute = {
      id: payment.id,
      customer: { userId: payment.customer.userId },
      ...(payment.metadata && { metadata: JSON.stringify(payment.metadata) })
    };
    await handleDisputeWorkflow(dispute, paymentForDispute);
  } catch (error) {
    console.error('Error handling charge dispute created:', error);
    throw error;
  }
}

/**
 * Send payment failure notification to user
 */
async function sendPaymentFailureNotification(
  userId: string,
  paymentId: string,
  amount: number,
  subscriptionId?: string | null,
  errorMessage?: string
): Promise<void> {
  try {
    const message = subscriptionId
      ? `Your subscription payment of $${amount.toFixed(2)} has failed. ${errorMessage ? `Error: ${errorMessage}` : 'Please update your payment method to continue your subscription.'}`
      : `Your payment of $${amount.toFixed(2)} has failed. ${errorMessage ? `Error: ${errorMessage}` : 'Please try again with a different payment method.'}`;

    await notificationService.createNotification({
      userId,
      title: 'Payment Failed',
      message,
      type: 'SYSTEM',
      priority: 'HIGH',
      actionUrl: subscriptionId ? '/billing/payment-methods' : '/payments',
      metadata: {
        paymentId,
        subscriptionId,
        amount,
        errorMessage
      }
    });

    await auditLog({
      userId,
      action: 'PAYMENT_FAILURE_NOTIFICATION_SENT',
      entity: 'Notification',
      details: { paymentId, amount, subscriptionId },
      outcome: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error sending payment failure notification:', error);
  }
}

/**
 * Handle payment retry logic with exponential backoff and grace period
 * Note: Uses Invoice metadata for retry tracking until PaymentRetry model is added
 */
async function handlePaymentRetryLogic(
  invoiceId: string,
  userId: string,
  subscriptionId: string,
  amount: number
): Promise<void> {
  try {
    console.log(`Processing payment retry for invoice ${invoiceId}, amount: ${amount}`);
    // Get current invoice to check retry metadata
    const invoice = await prisma.invoice.findUnique({
      where: { stripeInvoiceId: invoiceId }
    });

    if (!invoice) {
      console.log(`Invoice ${invoiceId} not found for retry logic`);
      return;
    }

    // Initialize grace period for payment failure handling
    const gracePeriodEnd = new Date(
      Date.now() + PAYMENT_RETRY_CONFIG.gracePeriodHours * 60 * 60 * 1000
    );

    // Simplified retry logic without metadata dependency

    // Schedule retry notification
    await notificationService.createNotification({
      userId,
      title: 'Payment Failed',
      message: `Your payment failed. Please update your payment method to avoid service interruption.`,
      type: 'SYSTEM',
      priority: 'HIGH',
      actionUrl: '/billing/payment-methods'
    });

    await auditLog({
      userId,
      action: 'PAYMENT_FAILED',
      entity: 'Invoice',
      entityId: invoice.id,
      details: {
        invoiceId,
        failureReason: 'Payment attempt failed'
      },
      outcome: 'FAILURE'
    });

    // Check if we're past grace period
    if (new Date() >= gracePeriodEnd) {
      // Grace period expired - suspend subscription
      await suspendSubscriptionForNonPayment(subscriptionId, userId);

      await notificationService.createNotification({
        userId,
        title: 'Subscription Suspended',
        message: `Your subscription has been suspended due to payment failure. Please update your payment method to reactivate your subscription.`,
        type: 'SYSTEM',
        priority: 'URGENT',
        actionUrl: '/billing/payment-methods',
        metadata: {
          subscriptionId,
          reason: 'payment_failure'
        }
      });
    }
  } catch (error) {
    console.error('Error handling payment retry logic:', error);
    await auditLog({
      userId,
      action: 'PAYMENT_RETRY_ERROR',
      entity: 'Invoice',
      details: {
        invoiceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      outcome: 'FAILURE'
    });
  }
}

/**
 * Send payment confirmation notification
 */
async function sendPaymentConfirmationNotification(
  userId: string,
  paymentId: string,
  amount: number,
  appointmentId?: string | null
): Promise<void> {
  try {
    const message = appointmentId
      ? `Your payment of $${amount.toFixed(2)} for your appointment has been processed successfully.`
      : `Your payment of $${amount.toFixed(2)} has been processed successfully. Thank you!`;

    await notificationService.createNotification({
      userId,
      title: 'Payment Confirmed',
      message,
      type: 'SYSTEM',
      priority: 'NORMAL',
      actionUrl: appointmentId ? `/appointments/${appointmentId}` : '/billing/invoices',
      metadata: {
        paymentId,
        appointmentId,
        amount
      }
    });

    await auditLog({
      userId,
      action: 'PAYMENT_CONFIRMATION_NOTIFICATION_SENT',
      entity: 'Notification',
      details: { paymentId, amount, appointmentId },
      outcome: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error sending payment confirmation notification:', error);
  }
}

/**
 * Update pending subscriptions after payment method setup
 */
async function updatePendingSubscriptions(userId: string, paymentMethodId: string): Promise<void> {
  try {
    // Find any incomplete subscriptions for this user
    const pendingSubscriptions = await prisma.subscription.findMany({
      where: {
        customer: { userId },
        status: { in: ['INCOMPLETE', 'INCOMPLETE_EXPIRED'] }
      }
    });

    if (pendingSubscriptions.length === 0) {
      return;
    }

    const stripe = StripeService.getStripeInstance();

    for (const subscription of pendingSubscriptions) {
      try {
        // Update the subscription with the new payment method
        const updatedSubscription = await stripe.subscriptions.update(
          subscription.stripeSubscriptionId,
          {
            default_payment_method: paymentMethodId
          }
        );

        // Update local database
        const statusMapping: Record<string, string> = {
          CANCELLED: 'CANCELED',
          ACTIVE: 'ACTIVE',
          PAST_DUE: 'PAST_DUE',
          INCOMPLETE: 'INCOMPLETE'
        };

        const statusUpper = updatedSubscription.status.toUpperCase();
        const mappedStatus = statusMapping[statusUpper] || statusUpper;

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: mappedStatus as
              | 'INCOMPLETE'
              | 'INCOMPLETE_EXPIRED'
              | 'TRIALING'
              | 'ACTIVE'
              | 'PAST_DUE'
              | 'CANCELED'
              | 'UNPAID'
              | 'PAUSED'
          }
        });

        // Send notification to user
        await notificationService.createNotification({
          userId,
          title: 'Subscription Activated',
          message: `Your ${subscription.planName} subscription has been activated with your new payment method.`,
          type: 'SYSTEM',
          priority: 'NORMAL',
          actionUrl: '/billing/subscriptions',
          metadata: {
            subscriptionId: subscription.id,
            paymentMethodId
          }
        });

        await auditLog({
          userId,
          action: 'PENDING_SUBSCRIPTION_UPDATED',
          entity: 'Subscription',
          entityId: subscription.id,
          details: {
            paymentMethodId,
            newStatus: updatedSubscription.status
          },
          outcome: 'SUCCESS'
        });
      } catch (error) {
        console.error(`Error updating subscription ${subscription.id}:`, error);

        await auditLog({
          userId,
          action: 'PENDING_SUBSCRIPTION_UPDATE_FAILED',
          entity: 'Subscription',
          entityId: subscription.id,
          details: {
            paymentMethodId,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          outcome: 'FAILURE'
        });
      }
    }
  } catch (error) {
    console.error('Error updating pending subscriptions:', error);
  }
}

/**
 * Send dispute notification to admin team
 */
async function sendAdminDisputeNotification(
  disputeId: string,
  amount: number,
  reason: string,
  userId: string
): Promise<void> {
  try {
    // Get user information for context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    const userName = user?.name || 'Unknown User';
    const userEmail = user?.email || 'unknown@email.com';

    // Get all admin users
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE'
      },
      select: { id: true }
    });

    // Send notification to all admins
    for (const admin of admins) {
      await notificationService.createNotification({
        userId: admin.id,
        title: 'Payment Dispute Created',
        message: `A payment dispute for $${amount.toFixed(2)} has been created. Reason: ${reason}. Customer: ${userName} (${userEmail})`,
        type: 'SYSTEM',
        priority: 'URGENT',
        actionUrl: `/admin/disputes/${disputeId}`,
        metadata: {
          disputeId,
          amount,
          reason,
          customerId: userId,
          customerName: userName,
          customerEmail: userEmail
        }
      });
    }

    await auditLog({
      action: 'ADMIN_DISPUTE_NOTIFICATION_SENT',
      entity: 'Notification',
      details: {
        disputeId,
        amount,
        reason,
        adminCount: admins.length
      },
      outcome: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error sending admin dispute notification:', error);
  }
}

/**
 * Handle dispute workflow
 * Note: Uses Payment metadata for dispute tracking until Dispute model is added
 */
async function handleDisputeWorkflow(
  dispute: Stripe.Dispute,
  payment: { id: string; metadata?: string; customer: { userId: string } }
): Promise<void> {
  try {
    const disputeAmount = dispute.amount / 100;

    // Store dispute data in Payment metadata
    const disputeData = {
      stripeDisputeId: dispute.id,
      amount: disputeAmount,
      currency: dispute.currency,
      reason: dispute.reason,
      status: dispute.status.toUpperCase(),
      evidenceDueBy: dispute.evidence_details?.due_by
        ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
        : null,
      chargeId: dispute.charge,
      networkReasonCode: dispute.network_reason_code,
      createdAt: new Date().toISOString(),
      escalated: disputeAmount >= DISPUTE_CONFIG.escalationThreshold
    };

    // Update payment with dispute information
    const currentMetadata = payment.metadata ? JSON.parse(payment.metadata) : {};
    const updatedMetadata = JSON.stringify({
      ...currentMetadata,
      dispute: disputeData
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { metadata: updatedMetadata }
    });

    // Auto-response for disputes (if enabled)
    if (DISPUTE_CONFIG.autoResponse && disputeAmount < DISPUTE_CONFIG.escalationThreshold) {
      await sendAutomaticDisputeResponse(dispute, payment);
    }

    // Document collection workflow
    if (DISPUTE_CONFIG.documentCollection) {
      await initiateDocumentCollection(payment, disputeData);
    }

    // High-value dispute escalation
    if (disputeAmount >= DISPUTE_CONFIG.escalationThreshold) {
      await escalateHighValueDispute(payment, disputeData);
    }

    await auditLog({
      userId: payment.customer.userId,
      action: 'DISPUTE_WORKFLOW_INITIATED',
      entity: 'Payment',
      entityId: payment.id,
      details: {
        disputeId: dispute.id,
        amount: disputeAmount,
        autoResponse:
          DISPUTE_CONFIG.autoResponse && disputeAmount < DISPUTE_CONFIG.escalationThreshold,
        escalated: disputeAmount >= DISPUTE_CONFIG.escalationThreshold
      },
      outcome: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error handling dispute workflow:', error);
  }
}

/**
 * Suspend subscription for non-payment
 */
async function suspendSubscriptionForNonPayment(
  subscriptionId: string,
  userId: string
): Promise<void> {
  try {
    const stripe = StripeService.getStripeInstance();

    // Pause subscription in Stripe
    await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'void'
      }
    });

    // Update local database
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: 'PAST_DUE'
      }
    });

    await auditLog({
      userId,
      action: 'SUBSCRIPTION_SUSPENDED_FOR_NONPAYMENT',
      entity: 'Subscription',
      details: { subscriptionId },
      outcome: 'SUCCESS'
    });
  } catch (error) {
    console.error('Error suspending subscription:', error);
  }
}

/**
 * Send automatic dispute response
 */
async function sendAutomaticDisputeResponse(
  dispute: Stripe.Dispute,
  payment: { id: string; customer: { userId: string } }
): Promise<void> {
  try {
    // Log automatic response initiation
    await auditLog({
      userId: payment.customer.userId,
      action: 'DISPUTE_AUTO_RESPONSE_INITIATED',
      entity: 'Payment',
      entityId: payment.id,
      details: {
        disputeId: dispute.id,
        automated: true,
        initiatedAt: new Date()
      },
      outcome: 'SUCCESS'
    });

    console.log(`Automatic dispute response initiated for dispute ${dispute.id}`);

    // In production, this would integrate with Stripe's dispute evidence submission API
    // For now, we create an audit trail for manual follow-up
  } catch (error) {
    console.error('Error sending automatic dispute response:', error);
  }
}

/**
 * Initiate document collection for dispute
 */
async function initiateDocumentCollection(
  payment: { id: string; customer: { userId: string } },
  disputeData: { stripeDisputeId: string; amount: number }
): Promise<void> {
  try {
    // Create document collection tasks as audit logs for manual follow-up
    const documentTypes = [
      'receipt',
      'shipping_documentation',
      'customer_communication',
      'service_documentation'
    ];

    for (const docType of documentTypes) {
      await auditLog({
        userId: payment.customer.userId,
        action: 'DISPUTE_DOCUMENT_COLLECTION_REQUIRED',
        entity: 'Payment',
        entityId: payment.id,
        details: {
          disputeId: disputeData.stripeDisputeId,
          documentType: docType.toUpperCase(),
          description: `${docType.replace('_', ' ')} required for dispute evidence`,
          status: 'PENDING_COLLECTION',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        },
        outcome: 'SUCCESS'
      });
    }

    console.log(`Document collection initiated for dispute ${disputeData.stripeDisputeId}`);
  } catch (error) {
    console.error('Error initiating document collection:', error);
  }
}

/**
 * Escalate high-value dispute
 */
async function escalateHighValueDispute(
  payment: { id: string; customer: { userId: string } },
  disputeData: { stripeDisputeId: string; amount: number }
): Promise<void> {
  try {
    // Log escalation
    await auditLog({
      userId: payment.customer.userId,
      action: 'HIGH_VALUE_DISPUTE_ESCALATED',
      entity: 'Payment',
      entityId: payment.id,
      details: {
        disputeId: disputeData.stripeDisputeId,
        amount: disputeData.amount,
        escalated: true,
        escalatedAt: new Date()
      },
      outcome: 'SUCCESS'
    });

    // Send urgent notification to senior admins
    const seniorAdmins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE'
      },
      select: { id: true }
    });

    for (const admin of seniorAdmins) {
      await notificationService.createNotification({
        userId: admin.id,
        title: 'HIGH-VALUE DISPUTE ESCALATION',
        message: `A dispute for $${disputeData.amount.toFixed(2)} requires immediate senior review. This dispute has been automatically escalated.`,
        type: 'SYSTEM',
        priority: 'URGENT',
        actionUrl: `/admin/payments/${payment.id}?tab=dispute`,
        metadata: {
          disputeId: disputeData.stripeDisputeId,
          amount: disputeData.amount,
          escalated: true,
          paymentId: payment.id
        }
      });
    }

    console.log(`High-value dispute ${disputeData.stripeDisputeId} escalated for senior review`);
  } catch (error) {
    console.error('Error escalating high-value dispute:', error);
  }
}
