/**
 * Billing Dashboard Component
 * Comprehensive billing and payment management interface
 */
/**
 * Billing Dashboard Component
 * Comprehensive billing and payment management interface
 */

'use client';

import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { clsx } from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SubscriptionManager from './SubscriptionManager';
import PaymentMethods from './PaymentMethods';
import PaymentHistory from './PaymentHistory';

interface BillingDashboardProps {
  className?: string;
  defaultTab?: 'subscription' | 'payment-methods' | 'history';
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface BillingSummary {
  currentSubscription: {
    planName: string;
    amount: number;
    currency: string;
    status: string;
    nextBilling: string;
  } | null;
  totalSpent: number;
  paymentsThisMonth: number;
  upcomingPayments: number;
  savedPaymentMethods: number;
}

const BillingSummaryCard = ({ summary }: { summary: BillingSummary | null }) => {
  const formatAmount = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!summary) {
    return (
      <Card>
        <div className='p-6 animate-pulse'>
          <div className='h-4 bg-gray-200 rounded w-1/4 mb-4 dark:bg-gray-700'></div>
          <div className='space-y-3'>
            <div className='h-3 bg-gray-200 rounded w-full dark:bg-gray-700'></div>
            <div className='h-3 bg-gray-200 rounded w-3/4 dark:bg-gray-700'></div>
            <div className='h-3 bg-gray-200 rounded w-1/2 dark:bg-gray-700'></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className='p-6'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-6'>
          Billing Summary
        </h3>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {/* Current Subscription */}
          <div className='space-y-2'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>Current Plan</p>
            {summary.currentSubscription ? (
              <div>
                <p className='text-lg font-semibold text-gray-900 dark:text-white'>
                  {summary.currentSubscription.planName}
                </p>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  {formatAmount(
                    summary.currentSubscription.amount,
                    summary.currentSubscription.currency
                  )}
                  /month
                </p>
                <p className='text-xs text-green-600 dark:text-green-400'>
                  Next billing: {formatDate(summary.currentSubscription.nextBilling)}
                </p>
              </div>
            ) : (
              <p className='text-lg text-gray-500 dark:text-gray-400'>No active plan</p>
            )}
          </div>

          {/* Total Spent */}
          <div className='space-y-2'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>Total Spent</p>
            <p className='text-lg font-semibold text-gray-900 dark:text-white'>
              {formatAmount(summary.totalSpent)}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>All time</p>
          </div>

          {/* This Month */}
          <div className='space-y-2'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>This Month</p>
            <p className='text-lg font-semibold text-gray-900 dark:text-white'>
              {formatAmount(summary.paymentsThisMonth)}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Current month</p>
          </div>

          {/* Payment Methods */}
          <div className='space-y-2'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>Payment Methods</p>
            <p className='text-lg font-semibold text-gray-900 dark:text-white'>
              {summary.savedPaymentMethods}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Saved cards</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
          <div className='flex flex-wrap gap-2'>
            {!summary.currentSubscription && (
              <Button size='sm' variant='primary'>
                Choose a Plan
              </Button>
            )}
            {summary.savedPaymentMethods === 0 && (
              <Button size='sm' variant='secondary'>
                Add Payment Method
              </Button>
            )}
            <Button size='sm' variant='ghost'>
              Download Invoices
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

const BillingDashboard = ({ className, defaultTab = 'subscription' }: BillingDashboardProps) => {
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    {
      id: 'subscription',
      name: 'Subscription',
      icon: (
        <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
          />
        </svg>
      )
    },
    {
      id: 'payment-methods',
      name: 'Payment Methods',
      icon: (
        <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
          />
        </svg>
      )
    },
    {
      id: 'history',
      name: 'Payment History',
      icon: (
        <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
          />
        </svg>
      )
    }
  ];

  const defaultTabIndex = tabs.findIndex(tab => tab.id === defaultTab);

  const fetchBillingSummary = async () => {
    try {
      // Fetch summary data from multiple endpoints
      const [subscriptionRes, paymentMethodsRes, paymentsRes] = await Promise.all([
        fetch('/api/payments/subscriptions'),
        fetch('/api/payments/payment-methods'),
        fetch('/api/payments/sessions?limit=100')
      ]);

      const subscriptionData = subscriptionRes.ok ? await subscriptionRes.json() : null;
      const paymentMethodsData = paymentMethodsRes.ok ? await paymentMethodsRes.json() : null;
      const paymentsData = paymentsRes.ok ? await paymentsRes.json() : null;

      // Calculate summary
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

      const totalSpent =
        paymentsData?.payments?.reduce((total: number, payment: Payment) => {
          return payment.status === 'succeeded' ? total + payment.amount : total;
        }, 0) || 0;

      const paymentsThisMonth =
        paymentsData?.payments?.reduce((total: number, payment: Payment) => {
          const paymentDate = new Date(payment.createdAt);
          return payment.status === 'succeeded' && paymentDate >= startOfMonth
            ? total + payment.amount
            : total;
        }, 0) || 0;

      const summary: BillingSummary = {
        currentSubscription: subscriptionData?.subscription
          ? {
              planName: subscriptionData.subscription.planName,
              amount: subscriptionData.subscription.amount,
              currency: subscriptionData.subscription.currency,
              status: subscriptionData.subscription.status,
              nextBilling: subscriptionData.subscription.currentPeriodEnd
            }
          : null,
        totalSpent,
        paymentsThisMonth,
        upcomingPayments: 0, // Would need to calculate from subscription data
        savedPaymentMethods: paymentMethodsData?.paymentMethods?.length || 0
      };

      setBillingSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing summary');
    } finally {
    }
  };

  useEffect(() => {
    fetchBillingSummary();
  }, []);

  const handleDataUpdate = () => {
    // Refresh summary when data changes
    fetchBillingSummary();
  };

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Billing & Payments</h1>
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
            Manage your subscription, payment methods, and billing history
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className='p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800'>
          <div className='flex'>
            <svg className='h-5 w-5 text-red-400 mr-2' viewBox='0 0 20 20' fill='currentColor'>
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                clipRule='evenodd'
              />
            </svg>
            <div>
              <h3 className='text-sm font-medium text-red-800 dark:text-red-200'>
                Error loading billing data
              </h3>
              <p className='text-sm text-red-700 dark:text-red-300 mt-1'>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Billing Summary */}
      <BillingSummaryCard summary={billingSummary} />

      {/* Main Content Tabs */}
      <Tab.Group defaultIndex={Math.max(0, defaultTabIndex)}>
        <Tab.List className='flex space-x-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800'>
          {tabs.map(tab => (
            <Tab
              key={tab.id}
              className={({ selected }: { selected: boolean }) =>
                clsx(
                  'flex items-center space-x-2 w-full rounded-md py-2.5 px-4 text-sm font-medium leading-5 transition-all',
                  'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                  selected
                    ? 'bg-white text-blue-700 shadow dark:bg-gray-700 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-white/[0.12] hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                )
              }
            >
              {tab.icon}
              <span>{tab.name}</span>
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className='mt-6'>
          {/* Subscription Tab */}
          <Tab.Panel className='focus:outline-none'>
            <SubscriptionManager />
          </Tab.Panel>

          {/* Payment Methods Tab */}
          <Tab.Panel className='focus:outline-none'>
            <PaymentMethods
              onPaymentMethodAdded={handleDataUpdate}
              onPaymentMethodRemoved={handleDataUpdate}
            />
          </Tab.Panel>

          {/* Payment History Tab */}
          <Tab.Panel className='focus:outline-none'>
            <PaymentHistory showInvoices={true} />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {/* Security Notice */}
      <Card>
        <div className='p-4 bg-blue-50 dark:bg-blue-900/20'>
          <div className='flex items-start'>
            <svg
              className='h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z'
                clipRule='evenodd'
              />
            </svg>
            <div className='text-sm'>
              <h4 className='text-blue-800 dark:text-blue-200 font-medium mb-1'>
                Secure Payment Processing
              </h4>
              <p className='text-blue-700 dark:text-blue-300'>
                All payment information is securely processed through Stripe and encrypted according
                to HIPAA compliance standards. We never store your full payment card information on
                our servers. Your data is protected with enterprise-grade security.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BillingDashboard;
