/**
 * Payment Methods Management Component
 * Allows users to view, add, and manage their saved payment methods
 */

'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { clsx } from 'clsx';

// Initialize Stripe
const stripePromise = loadStripe(process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']!);

interface PaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PaymentMethodsProps {
  className?: string;
  onPaymentMethodAdded?: () => void;
  onPaymentMethodRemoved?: () => void;
}

const AddPaymentMethodForm = ({
  onSuccess,
  onCancel
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card information not found.');
      return;
    }

    setIsProcessing(true);

    try {
      // Create setup intent
      const response = await fetch('/api/payments/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }

      const { setupIntent } = await response.json();

      // Confirm setup intent
      const { error: confirmError, setupIntent: confirmedSetup } = await stripe.confirmCardSetup(
        setupIntent.client_secret,
        {
          payment_method: {
            card: cardElement
          }
        }
      );

      if (confirmError) {
        setError(confirmError.message || 'Failed to save payment method');
        return;
      }

      // Save payment method to database
      const saveResponse = await fetch('/api/payments/payment-methods', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethodId: confirmedSetup?.payment_method,
          setAsDefault: true
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save payment method');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        '::placeholder': {
          color: '#aab7c4'
        },
        iconColor: '#666EE8'
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    }
  };

  return (
    <Card>
      <div className='p-6'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
          Add Payment Method
        </h3>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
              Card Information
            </label>
            <div className='p-3 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700'>
              <CardElement options={cardElementOptions} />
            </div>
          </div>

          {error && (
            <div className='p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800'>
              <p className='text-sm text-red-800 dark:text-red-200'>{error}</p>
            </div>
          )}

          <div className='flex space-x-3'>
            <Button
              type='button'
              variant='secondary'
              onClick={onCancel}
              className='flex-1'
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              variant='primary'
              className='flex-1'
              isLoading={isProcessing}
              disabled={!stripe || isProcessing}
            >
              {isProcessing ? 'Saving...' : 'Save Card'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};

const PaymentMethodCard = ({
  paymentMethod,
  onSetDefault,
  onRemove
}: {
  paymentMethod: PaymentMethod;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const getBrandIcon = (brand: string) => {
    const iconClass = 'h-8 w-12 object-contain';

    switch (brand.toLowerCase()) {
      case 'visa':
        return (
          <div
            className={clsx(
              iconClass,
              'bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold'
            )}
          >
            VISA
          </div>
        );
      case 'mastercard':
        return (
          <div
            className={clsx(
              iconClass,
              'bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold'
            )}
          >
            MC
          </div>
        );
      case 'amex':
        return (
          <div
            className={clsx(
              iconClass,
              'bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold'
            )}
          >
            AMEX
          </div>
        );
      case 'discover':
        return (
          <div
            className={clsx(
              iconClass,
              'bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold'
            )}
          >
            DISC
          </div>
        );
      default:
        return (
          <div
            className={clsx(
              iconClass,
              'bg-gray-500 rounded text-white text-xs flex items-center justify-center font-bold'
            )}
          >
            CARD
          </div>
        );
    }
  };

  const handleSetDefault = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/payments/payment-methods', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.stripePaymentMethodId,
          isDefault: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update payment method');
      }

      onSetDefault(paymentMethod.id);
    } catch (error) {
      console.error('Error setting default payment method:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    setIsRemoving(true);
    try {
      const response = await fetch(
        `/api/payments/payment-methods?paymentMethodId=${paymentMethod.stripePaymentMethodId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove payment method');
      }

      onRemove(paymentMethod.id);
    } catch (error) {
      console.error('Error removing payment method:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  if (!paymentMethod.card) {
    return null;
  }

  return (
    <Card className='relative'>
      <div className='p-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            {getBrandIcon(paymentMethod.card.brand)}
            <div>
              <p className='text-sm font-medium text-gray-900 dark:text-white'>
                •••• •••• •••• {paymentMethod.card.last4}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {paymentMethod.card.brand.toUpperCase()} • Expires {paymentMethod.card.exp_month}/
                {paymentMethod.card.exp_year}
              </p>
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            {paymentMethod.isDefault && (
              <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'>
                Default
              </span>
            )}

            <div className='flex space-x-1'>
              {!paymentMethod.isDefault && (
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={handleSetDefault}
                  isLoading={isUpdating}
                  disabled={isUpdating || isRemoving}
                >
                  Set Default
                </Button>
              )}

              <Button
                size='sm'
                variant='danger'
                onClick={handleRemove}
                isLoading={isRemoving}
                disabled={isUpdating || isRemoving}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const PaymentMethods = ({
  className,
  onPaymentMethodAdded,
  onPaymentMethodRemoved
}: PaymentMethodsProps) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payments/payment-methods');
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }
      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const handlePaymentMethodAdded = () => {
    setShowAddForm(false);
    fetchPaymentMethods();
    onPaymentMethodAdded?.();
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(prev =>
      prev.map(pm => ({
        ...pm,
        isDefault: pm.id === id
      }))
    );
  };

  const handleRemove = (id: string) => {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
    onPaymentMethodRemoved?.();
  };

  if (isLoading) {
    return (
      <div className={clsx('space-y-4', className)}>
        <div className='animate-pulse'>
          <div className='h-6 bg-gray-200 rounded w-1/4 mb-4 dark:bg-gray-700'></div>
          <div className='space-y-3'>
            {[1, 2].map(i => (
              <div key={i} className='h-20 bg-gray-200 rounded dark:bg-gray-700'></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-6', className)}>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Payment Methods</h2>
        {!showAddForm && (
          <Button variant='primary' onClick={() => setShowAddForm(true)}>
            Add Payment Method
          </Button>
        )}
      </div>

      {error && (
        <div className='p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800'>
          <p className='text-sm text-red-800 dark:text-red-200'>{error}</p>
        </div>
      )}

      {showAddForm && (
        <Elements stripe={stripePromise}>
          <AddPaymentMethodForm
            onSuccess={handlePaymentMethodAdded}
            onCancel={() => setShowAddForm(false)}
          />
        </Elements>
      )}

      {paymentMethods.length === 0 && !showAddForm ? (
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
                d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
              />
            </svg>
            <h3 className='mt-2 text-sm font-medium text-gray-900 dark:text-white'>
              No payment methods
            </h3>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              Add a payment method to make payments for therapy sessions.
            </p>
            <div className='mt-6'>
              <Button variant='primary' onClick={() => setShowAddForm(true)}>
                Add Payment Method
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className='space-y-3'>
          {paymentMethods.map(paymentMethod => (
            <PaymentMethodCard
              key={paymentMethod.id}
              paymentMethod={paymentMethod}
              onSetDefault={handleSetDefault}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentMethods;
