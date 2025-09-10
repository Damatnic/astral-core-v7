/**
 * Payment History Component
 * Displays payment history, invoices, and transaction details
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { clsx } from 'clsx';

interface Payment {
  id: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  description: string | null;
  receiptUrl: string | null;
  processedAt: string | null;
  createdAt: string;
  appointment?: {
    id: string;
    scheduledAt: string;
    therapist: {
      name: string;
      therapistProfile?: {
        specializations: string[];
      };
    };
  };
  refunds: Refund[];
}

interface Refund {
  id: string;
  stripeRefundId: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  receiptNumber: string | null;
  createdAt: string;
}

interface Invoice {
  id: string;
  stripeInvoiceId: string;
  number: string | null;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  description: string | null;
  pdfUrl: string | null;
  hostedInvoiceUrl: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface PaymentHistoryProps {
  className?: string;
  showInvoices?: boolean;
}

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'requires_confirmation':
      case 'requires_action':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'failed':
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        getStatusStyles(status)
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace('_', ' ')}
    </span>
  );
};

const PaymentTypeIcon = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case 'session_payment':
      return (
        <div className='flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center dark:bg-blue-900'>
          <svg
            className='w-5 h-5 text-blue-600 dark:text-blue-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
            />
          </svg>
        </div>
      );
    case 'subscription':
      return (
        <div className='flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center dark:bg-purple-900'>
          <svg
            className='w-5 h-5 text-purple-600 dark:text-purple-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
            />
          </svg>
        </div>
      );
    case 'refund':
      return (
        <div className='flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center dark:bg-red-900'>
          <svg
            className='w-5 h-5 text-red-600 dark:text-red-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z'
            />
          </svg>
        </div>
      );
    default:
      return (
        <div className='flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center dark:bg-gray-900'>
          <svg
            className='w-5 h-5 text-gray-600 dark:text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
            />
          </svg>
        </div>
      );
  }
};

const PaymentCard = ({ payment }: { payment: Payment }) => {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentTitle = (payment: Payment) => {
    if (payment.type === 'SESSION_PAYMENT' && payment.appointment) {
      return `Therapy Session - ${payment.appointment.therapist.name}`;
    }
    return payment.description || 'Payment';
  };

  const getPaymentSubtitle = (payment: Payment) => {
    if (payment.type === 'SESSION_PAYMENT' && payment.appointment) {
      const sessionDate = new Date(payment.appointment.scheduledAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return `Session on ${sessionDate}`;
    }
    return payment.type.replace('_', ' ').toLowerCase();
  };

  return (
    <Card>
      <div className='p-6'>
        <div className='flex items-start space-x-4'>
          <PaymentTypeIcon type={payment.type} />

          <div className='flex-1 min-w-0'>
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                  {getPaymentTitle(payment)}
                </p>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  {getPaymentSubtitle(payment)}
                </p>
              </div>

              <div className='flex flex-col items-end space-y-1'>
                <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                  {formatAmount(payment.amount, payment.currency)}
                </p>
                <PaymentStatusBadge status={payment.status} />
              </div>
            </div>

            <div className='mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400'>
              <span>{formatDate(payment.createdAt)}</span>
              <div className='flex space-x-2'>
                {payment.receiptUrl && (
                  <a
                    href={payment.receiptUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200'
                  >
                    Receipt
                  </a>
                )}
                {payment.refunds.length > 0 && (
                  <span className='text-orange-600 dark:text-orange-400'>Partially Refunded</span>
                )}
              </div>
            </div>

            {payment.refunds.length > 0 && (
              <div className='mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md dark:bg-orange-900/20 dark:border-orange-800'>
                <h4 className='text-xs font-medium text-orange-800 dark:text-orange-200 mb-1'>
                  Refunds
                </h4>
                {payment.refunds.map(refund => (
                  <div
                    key={refund.id}
                    className='flex justify-between text-xs text-orange-700 dark:text-orange-300'
                  >
                    <span>{formatDate(refund.createdAt)}</span>
                    <span>-{formatAmount(refund.amount, refund.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

const InvoiceCard = ({ invoice }: { invoice: Invoice }) => {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'uncollectible':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'void':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card>
      <div className='p-6'>
        <div className='flex items-start justify-between'>
          <div>
            <div className='flex items-center space-x-2'>
              <h3 className='text-sm font-medium text-gray-900 dark:text-white'>
                Invoice {invoice.number || invoice.stripeInvoiceId.slice(-8).toUpperCase()}
              </h3>
              <span
                className={clsx(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                  getStatusStyles(invoice.status)
                )}
              >
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </div>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              {invoice.description || 'Subscription invoice'}
            </p>
            <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
              Created: {formatDate(invoice.createdAt)}
            </p>
          </div>

          <div className='text-right'>
            <p className='text-lg font-semibold text-gray-900 dark:text-white'>
              {formatAmount(invoice.total, invoice.currency)}
            </p>
            {invoice.tax > 0 && (
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                Tax: {formatAmount(invoice.tax, invoice.currency)}
              </p>
            )}
          </div>
        </div>

        <div className='mt-4 flex items-center justify-between'>
          <div className='text-xs text-gray-500 dark:text-gray-400'>
            {invoice.status === 'paid' && invoice.paidAt && (
              <span>Paid on {formatDate(invoice.paidAt)}</span>
            )}
            {invoice.status === 'open' && invoice.dueDate && (
              <span>Due {formatDate(invoice.dueDate)}</span>
            )}
          </div>

          <div className='flex space-x-2'>
            {invoice.pdfUrl && (
              <a
                href={invoice.pdfUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-xs'
              >
                Download PDF
              </a>
            )}
            {invoice.hostedInvoiceUrl && (
              <a
                href={invoice.hostedInvoiceUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-xs'
              >
                View Invoice
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

const PaymentHistory = ({ className, showInvoices = true }: PaymentHistoryProps) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'invoices'>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/payments/sessions?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }
      const data = await response.json();
      setPayments(data.payments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    }
  };

  const fetchInvoices = useCallback(async () => {
    if (!showInvoices) return;

    try {
      const response = await fetch('/api/payments/invoices?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.warn('Failed to load invoices:', err);
      // Don't set error for invoices as they might not be available
    }
  }, [showInvoices]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchPayments(), fetchInvoices()]);
      setIsLoading(false);
    };

    loadData();
  }, [showInvoices, fetchInvoices]);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch =
      searchTerm === '' ||
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.appointment?.therapist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.stripePaymentIntentId.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      searchTerm === '' ||
      invoice.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.number?.includes(searchTerm) ||
      invoice.stripeInvoiceId.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className={clsx('space-y-6', className)}>
        <div className='animate-pulse'>
          <div className='h-8 bg-gray-200 rounded w-1/4 mb-6 dark:bg-gray-700'></div>
          <div className='space-y-4'>
            {[1, 2, 3].map(i => (
              <div key={i} className='h-32 bg-gray-200 rounded dark:bg-gray-700'></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-6', className)}>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Payment History</h1>
      </div>

      {error && (
        <div className='p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800'>
          <p className='text-sm text-red-800 dark:text-red-200'>{error}</p>
        </div>
      )}

      {showInvoices && (
        <div className='flex space-x-1 bg-gray-100 p-1 rounded-lg dark:bg-gray-800'>
          <button
            className={clsx(
              'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors',
              activeTab === 'payments'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            )}
            onClick={() => setActiveTab('payments')}
          >
            Payments ({payments.length})
          </button>
          <button
            className={clsx(
              'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors',
              activeTab === 'invoices'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            )}
            onClick={() => setActiveTab('invoices')}
          >
            Invoices ({invoices.length})
          </button>
        </div>
      )}

      <div className='flex flex-col sm:flex-row gap-4'>
        <div className='flex-1'>
          <Input
            type='text'
            placeholder='Search payments...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className='px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
        >
          <option value='all'>All Status</option>
          <option value='succeeded'>Succeeded</option>
          <option value='processing'>Processing</option>
          <option value='requires_action'>Requires Action</option>
          <option value='failed'>Failed</option>
        </select>
      </div>

      <div className='space-y-4'>
        {activeTab === 'payments' ? (
          filteredPayments.length === 0 ? (
            <Card>
              <div className='p-8 text-center'>
                <svg
                  className='mx-auto h-12 w-12 text-gray-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
                  />
                </svg>
                <h3 className='mt-2 text-sm font-medium text-gray-900 dark:text-white'>
                  No payments found
                </h3>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter.'
                    : "You haven't made any payments yet."}
                </p>
              </div>
            </Card>
          ) : (
            filteredPayments.map(payment => <PaymentCard key={payment.id} payment={payment} />)
          )
        ) : filteredInvoices.length === 0 ? (
          <Card>
            <div className='p-8 text-center'>
              <svg
                className='mx-auto h-12 w-12 text-gray-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                />
              </svg>
              <h3 className='mt-2 text-sm font-medium text-gray-900 dark:text-white'>
                No invoices found
              </h3>
              <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter.'
                  : "You don't have any invoices yet."}
              </p>
            </div>
          </Card>
        ) : (
          filteredInvoices.map(invoice => <InvoiceCard key={invoice.id} invoice={invoice} />)
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
