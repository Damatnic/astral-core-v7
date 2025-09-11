/**
 * Subscription Manager Component
 * Handles therapy plan subscriptions and billing
 */

'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import PaymentForm from './PaymentForm';
import { PaymentErrorBoundary } from '@/components/PaymentErrorBoundary';
import { clsx } from 'clsx';

// Initialize Stripe
const stripePromise = loadStripe(process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']!);

interface TherapyPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  sessionsIncluded: number;
  duration: string;
  features: string[];
  trialPeriodDays: number | null;
  setupFee: number | null;
  isActive: boolean;
}

interface Subscription {
  id: string;
  stripeSubscriptionId: string;
  status: string;
  planName: string;
  amount: number;
  currency: string;
  interval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt: string | null;
  canceledAt: string | null;
  trialEnd: string | null;
}

interface SubscriptionManagerProps {
  className?: string;
}

const TherapyPlanCard = ({
  plan,
  isCurrentPlan,
  onSelect,
  isLoading
}: {
  plan: TherapyPlan;
  isCurrentPlan?: boolean;
  onSelect: (plan: TherapyPlan) => void;
  isLoading?: boolean;
}) => {
  const formatPrice = (
    amount: number,
    currency: string,
    interval: string,
    intervalCount: number
  ) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);

    let intervalText = interval;
    if (intervalCount > 1) {
      intervalText = `${intervalCount} ${interval}s`;
    }

    return `${formatted}/${intervalText}`;
  };

  return (
    <Card
      className={clsx(
        'relative transition-all duration-200',
        isCurrentPlan ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:shadow-lg'
      )}
    >
      <div className='p-6'>
        {isCurrentPlan && (
          <div className='absolute -top-3 left-1/2 transform -translate-x-1/2'>
            <span className='inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-white'>
              Current Plan
            </span>
          </div>
        )}

        <div className='text-center mb-6'>
          <h3 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>{plan.name}</h3>
          <p className='text-gray-600 dark:text-gray-400 text-sm mb-4'>{plan.description}</p>
          <div className='text-3xl font-bold text-gray-900 dark:text-white'>
            {formatPrice(plan.amount, plan.currency, plan.interval, plan.intervalCount)}
          </div>
          {plan.trialPeriodDays && (
            <p className='text-sm text-green-600 dark:text-green-400 mt-1'>
              {plan.trialPeriodDays}-day free trial
            </p>
          )}
        </div>

        <div className='space-y-3 mb-6'>
          <div className='flex justify-between text-sm'>
            <span className='text-gray-600 dark:text-gray-400'>Sessions Included:</span>
            <span className='font-medium text-gray-900 dark:text-white'>
              {plan.sessionsIncluded}
            </span>
          </div>
          <div className='flex justify-between text-sm'>
            <span className='text-gray-600 dark:text-gray-400'>Duration:</span>
            <span className='font-medium text-gray-900 dark:text-white'>{plan.duration}</span>
          </div>
          {plan.setupFee && (
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600 dark:text-gray-400'>Setup Fee:</span>
              <span className='font-medium text-gray-900 dark:text-white'>${plan.setupFee}</span>
            </div>
          )}
        </div>

        <ul className='space-y-2 mb-6'>
          {plan.features.map((feature, index) => (
            <li key={index} className='flex items-start'>
              <svg
                className='h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                  clipRule='evenodd'
                />
              </svg>
              <span className='text-sm text-gray-600 dark:text-gray-400'>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          variant={isCurrentPlan ? 'secondary' : 'primary'}
          fullWidth
          onClick={() => onSelect(plan)}
          disabled={isCurrentPlan || isLoading}
          {...(isLoading !== undefined && { isLoading })}
        >
          {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
        </Button>
      </div>
    </Card>
  );
};

const CurrentSubscriptionCard = ({
  subscription,
  onCancel,
  onResume,
  isCanceling,
  isResuming
}: {
  subscription: Subscription;
  onCancel: () => void;
  onResume: () => void;
  isCanceling: boolean;
  isResuming: boolean;
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  const getStatusBadge = (status: string, cancelAt: string | null) => {
    if (cancelAt) {
      return (
        <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'>
          Canceling
        </span>
      );
    }

    switch (status.toLowerCase()) {
      case 'active':
        return (
          <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'>
            Active
          </span>
        );
      case 'trialing':
        return (
          <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
            Trial
          </span>
        );
      case 'past_due':
        return (
          <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'>
            Past Due
          </span>
        );
      case 'canceled':
        return (
          <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'>
            Canceled
          </span>
        );
      default:
        return (
          <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'>
            {status}
          </span>
        );
    }
  };

  return (
    <Card>
      <div className='p-6'>
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
            Current Subscription
          </h2>
          {getStatusBadge(subscription.status, subscription.cancelAt)}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='space-y-4'>
            <div>
              <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
                {subscription.planName}
              </h3>
              <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                {formatPrice(subscription.amount, subscription.currency)}/{subscription.interval}
              </p>
            </div>

            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-gray-600 dark:text-gray-400'>Current Period:</span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {formatDate(subscription.currentPeriodStart)} -{' '}
                  {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>

              {subscription.trialEnd && (
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-600 dark:text-gray-400'>Trial Ends:</span>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {formatDate(subscription.trialEnd)}
                  </span>
                </div>
              )}

              {subscription.cancelAt && (
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-600 dark:text-gray-400'>Cancels On:</span>
                  <span className='font-medium text-orange-600 dark:text-orange-400'>
                    {formatDate(subscription.cancelAt)}
                  </span>
                </div>
              )}

              {subscription.canceledAt && (
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-600 dark:text-gray-400'>Canceled On:</span>
                  <span className='font-medium text-gray-600 dark:text-gray-400'>
                    {formatDate(subscription.canceledAt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className='space-y-3'>
            {subscription.cancelAt ? (
              <div className='space-y-3'>
                <div className='p-3 bg-orange-50 border border-orange-200 rounded-md dark:bg-orange-900/20 dark:border-orange-800'>
                  <p className='text-sm text-orange-800 dark:text-orange-200'>
                    Your subscription will be canceled at the end of the current billing period.
                    You&apos;ll continue to have access until {formatDate(subscription.cancelAt)}.
                  </p>
                </div>
                <Button
                  variant='primary'
                  fullWidth
                  onClick={onResume}
                  isLoading={isResuming}
                  disabled={isResuming}
                >
                  Reactivate Subscription
                </Button>
              </div>
            ) : subscription.status !== 'canceled' ? (
              <div className='space-y-3'>
                <Button variant='secondary' fullWidth>
                  Change Plan
                </Button>
                <Button
                  variant='danger'
                  fullWidth
                  onClick={onCancel}
                  isLoading={isCanceling}
                  disabled={isCanceling}
                >
                  Cancel Subscription
                </Button>
              </div>
            ) : (
              <div className='p-3 bg-gray-50 border border-gray-200 rounded-md dark:bg-gray-900/20 dark:border-gray-700'>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  This subscription has been canceled.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

const SubscriptionManager = ({ className }: SubscriptionManagerProps) => {
  const [therapyPlans, setTherapyPlans] = useState<TherapyPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TherapyPlan | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch therapy plans and subscription in parallel
      const [plansResponse, subscriptionResponse] = await Promise.all([
        fetch('/api/payments/therapy-plans'),
        fetch('/api/payments/subscriptions')
      ]);

      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setTherapyPlans(plansData.therapyPlans || []);
      }

      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        setCurrentSubscription(subscriptionData.subscription);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePlanSelect = async (plan: TherapyPlan) => {
    if (currentSubscription) {
      // Handle plan change
      // This would require additional UI for plan changes
      return;
    }

    setSelectedPlan(plan);
    setIsSubscribing(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          therapyPlanId: plan.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const data = await response.json();

      if (data.setupIntent) {
        setClientSecret(data.setupIntent.client_secret);
        setShowPaymentForm(true);
      } else {
        // Subscription created successfully
        await fetchData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentForm(false);
    setClientSecret(null);
    setSelectedPlan(null);
    await fetchData();
  };

  const handlePaymentError = (error: string) => {
    setError(error);
    setShowPaymentForm(false);
    setClientSecret(null);
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;

    if (
      !confirm(
        'Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.'
      )
    ) {
      return;
    }

    setIsCanceling(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/subscriptions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: currentSubscription.stripeSubscriptionId,
          cancelAtPeriodEnd: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!currentSubscription) return;

    setIsResuming(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/subscriptions/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: currentSubscription.stripeSubscriptionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resume subscription');
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume subscription');
    } finally {
      setIsResuming(false);
    }
  };

  if (isLoading) {
    return (
      <div className={clsx('space-y-6', className)}>
        <div className='animate-pulse'>
          <div className='h-8 bg-gray-200 rounded w-1/3 mb-6 dark:bg-gray-700'></div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {[1, 2, 3].map(i => (
              <div key={i} className='h-96 bg-gray-200 rounded dark:bg-gray-700'></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showPaymentForm && clientSecret && selectedPlan) {
    return (
      <div className={clsx('max-w-md mx-auto', className)}>
        <Elements stripe={stripePromise}>
          <PaymentForm
            clientSecret={clientSecret}
            amount={selectedPlan.amount}
            currency={selectedPlan.currency}
            description={`${selectedPlan.name} subscription`}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={() => {
              setShowPaymentForm(false);
              setClientSecret(null);
              setSelectedPlan(null);
            }}
            requiresBillingDetails={true}
          />
        </Elements>
      </div>
    );
  }

  return (
    <PaymentErrorBoundary onRetry={() => window.location.reload()}>
      <div className={clsx('space-y-6', className)}>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            Subscription Management
          </h1>
        </div>

      {error && (
        <div className='p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800'>
          <p className='text-sm text-red-800 dark:text-red-200'>{error}</p>
        </div>
      )}

      {currentSubscription && (
        <CurrentSubscriptionCard
          subscription={currentSubscription}
          onCancel={handleCancelSubscription}
          onResume={handleResumeSubscription}
          isCanceling={isCanceling}
          isResuming={isResuming}
        />
      )}

      <div>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>
          {currentSubscription ? 'Available Plans' : 'Choose Your Plan'}
        </h2>

        {therapyPlans.length === 0 ? (
          <Card>
            <div className='p-8 text-center'>
              <p className='text-gray-500 dark:text-gray-400'>
                No therapy plans are currently available.
              </p>
            </div>
          </Card>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {therapyPlans.map(plan => (
              <TherapyPlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={currentSubscription?.planName === plan.name}
                onSelect={handlePlanSelect}
                isLoading={isSubscribing && selectedPlan?.id === plan.id}
              />
            ))}
          </div>
        )}
      </div>
      </div>
    </PaymentErrorBoundary>
  );
};

export default SubscriptionManager;
