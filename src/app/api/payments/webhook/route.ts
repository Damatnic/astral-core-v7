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
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
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
      outcome: 'SUCCESS',
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
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
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
    
    await auditLog({
      action: 'STRIPE_WEBHOOK_ERROR',
      entity: 'WebhookEvent',
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        body: body?.substring(0, 1000) // First 1000 chars for debugging
      },
      outcome: 'FAILURE',
    });

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
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
      outcome: 'SUCCESS',
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
      outcome: 'SUCCESS',
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
    await SubscriptionService.updateSubscriptionStatus(
      subscription.id,
      'canceled',
      subscription
    );

    await auditLog({
      action: 'SUBSCRIPTION_WEBHOOK_DELETED',
      entity: 'Subscription',
      details: { 
        subscriptionId: subscription.id,
        customerId: subscription.customer as string,
        canceledAt: subscription.canceled_at
      },
      outcome: 'SUCCESS',
    });
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    // Find customer in our database
    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (!customer) {
      console.log(`Customer ${invoice.customer} not found in database`);
      return;
    }

    // Create or update invoice record
    await prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        customerId: customer.id,
        subscriptionId: invoice.subscription ? 
          (await prisma.subscription.findUnique({
            where: { stripeSubscriptionId: invoice.subscription as string }
          }))?.id : undefined,
        stripeInvoiceId: invoice.id,
        number: invoice.number,
        status: 'PAID',
        total: invoice.total / 100,
        subtotal: invoice.subtotal / 100,
        tax: invoice.tax ? invoice.tax / 100 : 0,
        amountPaid: invoice.amount_paid / 100,
        amountDue: invoice.amount_due / 100,
        currency: invoice.currency,
        description: invoice.description,
        pdfUrl: invoice.invoice_pdf,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        paymentIntentId: invoice.payment_intent as string,
        paidAt: invoice.status_transitions.paid_at ? 
          new Date(invoice.status_transitions.paid_at * 1000) : null,
      },
      update: {
        status: 'PAID',
        amountPaid: invoice.amount_paid / 100,
        amountDue: invoice.amount_due / 100,
        paidAt: invoice.status_transitions.paid_at ? 
          new Date(invoice.status_transitions.paid_at * 1000) : null,
      },
    });

    // If this is a subscription renewal, process it
    if (invoice.subscription) {
      await SubscriptionService.processSubscriptionRenewal(invoice.subscription as string);
    }

    await auditLog({
      userId: customer.userId,
      action: 'INVOICE_PAYMENT_SUCCEEDED',
      entity: 'Invoice',
      details: { 
        invoiceId: invoice.id,
        amount: invoice.amount_paid / 100,
        subscriptionId: invoice.subscription as string
      },
      outcome: 'SUCCESS',
    });
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
    throw error;
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (!customer) {
      console.log(`Customer ${invoice.customer} not found in database`);
      return;
    }

    // Update invoice status
    await prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        customerId: customer.id,
        subscriptionId: invoice.subscription ? 
          (await prisma.subscription.findUnique({
            where: { stripeSubscriptionId: invoice.subscription as string }
          }))?.id : undefined,
        stripeInvoiceId: invoice.id,
        number: invoice.number,
        status: 'OPEN',
        total: invoice.total / 100,
        subtotal: invoice.subtotal / 100,
        tax: invoice.tax ? invoice.tax / 100 : 0,
        amountPaid: invoice.amount_paid / 100,
        amountDue: invoice.amount_due / 100,
        currency: invoice.currency,
        description: invoice.description,
        pdfUrl: invoice.invoice_pdf,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        paymentIntentId: invoice.payment_intent as string,
      },
      update: {
        status: 'OPEN',
        amountPaid: invoice.amount_paid / 100,
        amountDue: invoice.amount_due / 100,
      },
    });

    await auditLog({
      userId: customer.userId,
      action: 'INVOICE_PAYMENT_FAILED',
      entity: 'Invoice',
      details: { 
        invoiceId: invoice.id,
        amountDue: invoice.amount_due / 100,
        subscriptionId: invoice.subscription as string
      },
      outcome: 'FAILURE',
    });

    // TODO: Send notification to user about failed payment
    // TODO: Implement retry logic or grace period
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
      include: { customer: true },
    });

    if (!payment) {
      console.log(`Payment ${paymentIntent.id} not found in database`);
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCEEDED',
        processedAt: new Date(),
        receiptUrl: paymentIntent.charges.data[0]?.receipt_url,
      },
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
      outcome: 'SUCCESS',
    });

    // TODO: Send payment confirmation notification
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
      include: { customer: true },
    });

    if (!payment) {
      console.log(`Payment ${paymentIntent.id} not found in database`);
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failureCode: paymentIntent.last_payment_error?.code,
        failureMessage: paymentIntent.last_payment_error?.message,
      },
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
      outcome: 'FAILURE',
    });

    // TODO: Send payment failure notification
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
      where: { stripeCustomerId: paymentMethod.customer as string },
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
      outcome: 'SUCCESS',
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
      where: { stripeCustomerId: setupIntent.customer as string },
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
      outcome: 'SUCCESS',
    });

    // TODO: Update any pending subscriptions that were waiting for payment method
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
    const userId = customer.metadata?.userId;
    
    if (!userId) {
      console.log(`Customer ${customer.id} created without userId metadata`);
      return;
    }

    // Check if customer already exists in our database
    const existingCustomer = await prisma.customer.findUnique({
      where: { stripeCustomerId: customer.id },
    });

    if (!existingCustomer) {
      await prisma.customer.create({
        data: {
          userId,
          stripeCustomerId: customer.id,
          email: customer.email || '',
          name: customer.name,
        },
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
      outcome: 'SUCCESS',
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
        stripePaymentIntentId: dispute.payment_intent as string,
      },
      include: { customer: true },
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
      outcome: 'FAILURE',
    });

    // TODO: Send notification to admin team
    // TODO: Implement dispute handling workflow
  } catch (error) {
    console.error('Error handling charge dispute created:', error);
    throw error;
  }
}