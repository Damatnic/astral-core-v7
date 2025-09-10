/**
 * Payment Form Component
 * Secure payment form using Stripe Elements for HIPAA compliance
 */

'use client';

import { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { PaymentIntent } from '@stripe/stripe-js';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/LoadingStates';
import { PaymentFormSkeleton } from '@/components/ui/SkeletonLoader';
import { clsx } from 'clsx';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  clientSecret?: string;
  amount: number;
  currency?: string;
  description?: string;
  onSuccess?: (paymentIntent: PaymentIntent) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  requiresBillingDetails?: boolean;
  className?: string;
}

interface BillingDetails {
  name: string;
  email: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

const PaymentFormContent = ({
  clientSecret,
  amount,
  currency = 'usd',
  description,
  onSuccess,
  onError,
  onCancel,
  requiresBillingDetails = false
}: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [billingDetails, setBillingDetails] = useState<BillingDetails>({
    name: '',
    email: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!stripe || !elements || !clientSecret) {
      setErrorMessage('Payment system not ready. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setErrorMessage('Card information not found. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Validating payment information...');
    setProgress(10);

    // Validate billing details if required
    if (requiresBillingDetails) {
      const errors: Record<string, string> = {};
      if (!billingDetails.name.trim()) errors.name = 'Name is required';
      if (!billingDetails.email.trim()) errors.email = 'Email is required';
      if (!billingDetails.address.line1.trim()) errors['address.line1'] = 'Address is required';
      if (!billingDetails.address.city.trim()) errors['address.city'] = 'City is required';
      if (!billingDetails.address.state.trim()) errors['address.state'] = 'State is required';
      if (!billingDetails.address.postal_code.trim()) errors['address.postal_code'] = 'ZIP code is required';
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setIsProcessing(false);
        setProcessingStep('');
        setProgress(0);
        return;
      }
    }
    
    setValidationErrors({});
    
    try {
      setProcessingStep('Preparing payment...');
      setProgress(30);
      
      // Add small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProcessingStep('Processing payment...');
      setProgress(60);
      
      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          ...(requiresBillingDetails && {
            billing_details: billingDetails
          })
        }
      });
      
      setProgress(90);

      if (error) {
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        onError?.(error.message || 'Payment failed');
        setProgress(0);
      } else if (paymentIntent) {
        setProcessingStep('Payment successful!');
        setProgress(100);
        
        // Brief delay to show success state
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        onSuccess?.(paymentIntent);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
      setProgress(0);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const updateBillingDetails = (field: string, value: string) => {
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '');
      setBillingDetails(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Show loading skeleton while Stripe is initializing
  useEffect(() => {
    if (!stripe || !elements) {
      setIsStripeLoading(true);
    } else {
      setIsStripeLoading(false);
    }
  }, [stripe, elements]);

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
    },
    hidePostalCode: !requiresBillingDetails
  };

  const getFieldError = (field: string) => validationErrors[field];

  if (isStripeLoading) {
    return <PaymentFormSkeleton />;
  }

  return (
    <Card className='max-w-md mx-auto'>
      <div className='p-6'>
        <div className='mb-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
            Complete Payment
          </h3>
          {description && (
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>{description}</p>
          )}
          <p className='text-2xl font-bold text-gray-900 dark:text-white'>
            {formatAmount(amount, currency)}
          </p>
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="mb-4">
            <ProgressBar 
              progress={progress} 
              message={processingStep}
              className="mb-2"
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-4'>
          {requiresBillingDetails && (
            <div className='space-y-4'>
              <h4 className='text-md font-medium text-gray-900 dark:text-white'>
                Billing Information
              </h4>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <Input
                    type='text'
                    placeholder='Full Name'
                    value={billingDetails.name}
                    onChange={e => updateBillingDetails('name', e.target.value)}
                    required
                    className={getFieldError('name') ? 'border-red-500' : ''}
                  />
                  {getFieldError('name') && (
                    <p className="text-red-500 text-xs mt-1">{getFieldError('name')}</p>
                  )}
                </div>
                <div>
                  <Input
                    type='email'
                    placeholder='Email Address'
                    value={billingDetails.email}
                    onChange={e => updateBillingDetails('email', e.target.value)}
                    required
                    className={getFieldError('email') ? 'border-red-500' : ''}
                  />
                  {getFieldError('email') && (
                    <p className="text-red-500 text-xs mt-1">{getFieldError('email')}</p>
                  )}
                </div>
              </div>

              <Input
                type='text'
                placeholder='Address Line 1'
                value={billingDetails.address.line1}
                onChange={e => updateBillingDetails('address.line1', e.target.value)}
                required
              />

              <Input
                type='text'
                placeholder='Address Line 2 (Optional)'
                value={billingDetails.address.line2}
                onChange={e => updateBillingDetails('address.line2', e.target.value)}
              />

              <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
                <Input
                  type='text'
                  placeholder='City'
                  value={billingDetails.address.city}
                  onChange={e => updateBillingDetails('address.city', e.target.value)}
                  required
                />
                <Input
                  type='text'
                  placeholder='State'
                  value={billingDetails.address.state}
                  onChange={e => updateBillingDetails('address.state', e.target.value)}
                  required
                />
                <Input
                  type='text'
                  placeholder='ZIP Code'
                  value={billingDetails.address.postal_code}
                  onChange={e => updateBillingDetails('address.postal_code', e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
              Card Information
            </label>
            <div className='p-3 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700'>
              <CardElement options={cardElementOptions} />
            </div>
          </div>

          {errorMessage && (
            <div className='p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800'>
              <div className='flex'>
                <div className='flex-shrink-0'>
                  <svg className='h-5 w-5 text-red-400' viewBox='0 0 20 20' fill='currentColor'>
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div className='ml-3'>
                  <p className='text-sm text-red-800 dark:text-red-200'>{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          <div className='flex space-x-3 pt-4'>
            {onCancel && (
              <Button
                type='button'
                variant='secondary'
                onClick={onCancel}
                className='flex-1'
                disabled={isProcessing}
              >
                Cancel
              </Button>
            )}
            <Button
              type='submit'
              variant='primary'
              className='flex-1'
              isLoading={isProcessing}
              disabled={!stripe || isProcessing}
            >
              {isProcessing ? 'Processing...' : `Pay ${formatAmount(amount, currency)}`}
            </Button>
          </div>
        </form>

        <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-center space-x-2 text-xs text-gray-500'>
            <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z'
                clipRule='evenodd'
              />
            </svg>
            <span>Secured by Stripe • HIPAA Compliant</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const PaymentForm = (props: PaymentFormProps) => {
  const options: StripeElementsOptions = {
    clientSecret: props.clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#dc2626',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        spacingUnit: '4px',
        borderRadius: '6px'
      }
    }
  };

  return (
    <div className={clsx('payment-form-wrapper', props.className)}>
      <Elements stripe={stripePromise} options={options}>
        <PaymentFormContent {...props} />
      </Elements>
    </div>
  );
};

export default PaymentForm;
