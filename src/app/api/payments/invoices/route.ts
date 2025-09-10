/**
 * Invoices API
 * Handles invoice retrieval and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { StripeService } from '@/lib/services/stripe-service';
import { prisma } from '@/lib/db';
import { rateLimiter } from '@/lib/security/rate-limit';
import { auditLog } from '@/lib/security/audit';
import Stripe from 'stripe';

/**
 * GET /api/payments/invoices
 * Get user's invoices
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.check('invoices-read');
    if (!rateLimitResult.allowed) {
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

    // Get user's customer record
    const customer = await prisma.customer.findUnique({
      where: { userId }
    });

    if (!customer) {
      return NextResponse.json({
        invoices: [],
        success: true
      });
    }

    // Get invoices from database
    const dbInvoices = await prisma.invoice.findMany({
      where: {
        customerId: customer.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    // Get fresh invoices from Stripe if needed
    let stripeInvoices: Stripe.Invoice[] = [];
    try {
      stripeInvoices = await StripeService.getInvoices(customer.id, limit);
    } catch (error) {
      console.warn('Failed to fetch invoices from Stripe:', error);
      // Continue with database invoices only
    }

    // Combine and deduplicate invoices
    const invoicesMap = new Map();

    // Add database invoices
    dbInvoices.forEach(invoice => {
      invoicesMap.set(invoice.stripeInvoiceId, {
        id: invoice.id,
        stripeInvoiceId: invoice.stripeInvoiceId,
        number: invoice.number,
        status: invoice.status,
        total: invoice.total,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        amountPaid: invoice.amountPaid,
        amountDue: invoice.amountDue,
        currency: invoice.currency,
        description: invoice.description,
        pdfUrl: invoice.pdfUrl,
        hostedInvoiceUrl: invoice.hostedInvoiceUrl,
        dueDate: invoice.dueDate?.toISOString(),
        paidAt: invoice.paidAt?.toISOString(),
        createdAt: invoice.createdAt.toISOString(),
        source: 'database'
      });
    });

    // Add fresh Stripe invoices (overwrite if exists)
    stripeInvoices.forEach(stripeInvoice => {
      const stripeInvoiceAny = stripeInvoice as Stripe.Invoice & { tax?: number };
      invoicesMap.set(stripeInvoice.id, {
        id: `stripe_${stripeInvoice.id}`,
        stripeInvoiceId: stripeInvoice.id,
        number: stripeInvoice.number,
        status: (stripeInvoice.status || 'draft').toUpperCase(),
        total: stripeInvoice.total / 100,
        subtotal: stripeInvoice.subtotal / 100,
        tax: stripeInvoiceAny.tax ? stripeInvoiceAny.tax / 100 : 0,
        amountPaid: stripeInvoice.amount_paid / 100,
        amountDue: stripeInvoice.amount_due / 100,
        currency: stripeInvoice.currency,
        description: stripeInvoice.description,
        pdfUrl: stripeInvoice.invoice_pdf,
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
        dueDate: stripeInvoice.due_date
          ? new Date(stripeInvoice.due_date * 1000).toISOString()
          : null,
        paidAt: stripeInvoice.status_transitions?.paid_at
          ? new Date(stripeInvoice.status_transitions.paid_at * 1000).toISOString()
          : null,
        createdAt: new Date(stripeInvoice.created * 1000).toISOString(),
        source: 'stripe'
      });
    });

    const invoices = Array.from(invoicesMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    await auditLog({
      userId,
      action: 'INVOICES_RETRIEVED',
      entity: 'Invoice',
      details: {
        count: invoices.length,
        limit
      },
      outcome: 'SUCCESS'
    });

    return NextResponse.json({
      invoices,
      success: true
    });
  } catch (error) {
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      await auditLog({
        userId: session.user.id,
        action: 'INVOICES_RETRIEVAL_FAILED',
        entity: 'Invoice',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        outcome: 'FAILURE'
      });
    }

    console.error('Error retrieving invoices:', error);
    return NextResponse.json({ error: 'Failed to retrieve invoices' }, { status: 500 });
  }
}
