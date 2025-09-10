/**
 * Appointment Payment Component
 * Handles payment processing for individual therapy sessions
 */

'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import PaymentForm from './PaymentForm';
import { clsx } from 'clsx';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Appointment {
  id: string;
  scheduledAt: string;
  duration: number;
  type: string;
  status: string;
  location: string | null;
  meetingUrl: string | null;
  notes: string | null;
  therapist: {
    name: string;
    therapistProfile?: {
      hourlyRate?: number;
      specializations?: string[];
    };
  };
  payments: Payment[];
}

interface Payment {
  id: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  processedAt: string | null;
  createdAt: string;
}

interface AppointmentPaymentProps {
  appointment: Appointment;
  onPaymentSuccess?: () => void;
  onPaymentError?: (error: string) => void;
  className?: string;
}

const AppointmentPayment = ({ 
  appointment, 
  onPaymentSuccess, 
  onPaymentError, 
  className 
}: AppointmentPaymentProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);

  // Check if appointment already has a successful payment
  const existingPayment = appointment.payments.find(p => 
    ['succeeded', 'processing', 'requires_confirmation'].includes(p.status.toLowerCase())
  );

  // Calculate default payment amount
  useEffect(() => {
    const hourlyRate = appointment.therapist.therapistProfile?.hourlyRate || 150; // Default rate
    const sessionRate = (hourlyRate * appointment.duration) / 60; // Calculate based on duration
    setPaymentAmount(Math.round(sessionRate * 100) / 100); // Round to 2 decimal places
  }, [appointment]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getAppointmentTypeDisplay = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getStatusBadge = (status: string) => {
    const getStatusStyles = (status: string) => {
      switch (status.toLowerCase()) {
        case 'scheduled':
          return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'confirmed':
          return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'in_progress':
          return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        case 'completed':
          return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        case 'cancelled':
          return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        case 'no_show':
          return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
        default:
          return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      }
    };

    return (
      <span className={clsx(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        getStatusStyles(status)
      )}>
        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace('_', ' ')}
      </span>
    );
  };

  const handlePaymentClick = async () => {
    if (!['scheduled', 'confirmed', 'completed'].includes(appointment.status.toLowerCase())) {
      setError('This appointment is not in a valid state for payment.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const amount = useCustomAmount ? parseFloat(customAmount) : paymentAmount;
      
      if (amount <= 0 || amount > 10000) {
        throw new Error('Please enter a valid amount between $0.01 and $10,000');
      }

      const response = await fetch('/api/payments/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          amount: amount,
          savePaymentMethod: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const data = await response.json();
      setClientSecret(data.paymentIntent.client_secret);
      setShowPaymentForm(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment';
      setError(errorMessage);
      onPaymentError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = (paymentIntent: any) => {
    setShowPaymentForm(false);
    setClientSecret(null);
    onPaymentSuccess?.();
  };

  const handlePaymentFormError = (error: string) => {
    setError(error);
    onPaymentError?.(error);
    setShowPaymentForm(false);
    setClientSecret(null);
  };

  const handleCustomAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return;
    }

    setCustomAmount(cleanValue);
  };

  if (existingPayment) {
    return (
      <Card className={className}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Payment Status
            </h3>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Paid
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Amount:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatAmount(existingPayment.amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Payment Date:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {existingPayment.processedAt 
                  ? formatDate(existingPayment.processedAt)
                  : formatDate(existingPayment.createdAt)
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {existingPayment.status.charAt(0).toUpperCase() + existingPayment.status.slice(1).toLowerCase().replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Payment has been processed for this appointment. If you need a refund or have questions,
              please contact your therapist or support.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (showPaymentForm && clientSecret) {
    const amount = useCustomAmount ? parseFloat(customAmount) : paymentAmount;
    return (
      <div className={className}>
        <Elements stripe={stripePromise}>
          <PaymentForm
            clientSecret={clientSecret}
            amount={amount}
            description={`Therapy Session - ${appointment.therapist.name}`}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentFormError}
            onCancel={() => {
              setShowPaymentForm(false);
              setClientSecret(null);
            }}
            requiresBillingDetails={false}
          />
        </Elements>
      </div>
    );
  }

  return (
    <Card className={className}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Session Payment
          </h3>
          {getStatusBadge(appointment.status)}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Appointment Details */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Therapist:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {appointment.therapist.name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Session Date:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatDate(appointment.scheduledAt)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Duration:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {appointment.duration} minutes
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Session Type:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {getAppointmentTypeDisplay(appointment.type)}
              </span>
            </div>
            {appointment.therapist.therapistProfile?.specializations && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Specializations:</span>
                <span className="font-medium text-gray-900 dark:text-white text-right">
                  {appointment.therapist.therapistProfile.specializations.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Payment Amount */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="amount-type"
                    checked={!useCustomAmount}
                    onChange={() => setUseCustomAmount(false)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Standard Rate
                  </span>
                </label>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatAmount(paymentAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="amount-type"
                    checked={useCustomAmount}
                    onChange={() => setUseCustomAmount(true)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Custom Amount
                  </span>
                </label>
                {useCustomAmount && (
                  <div className="flex items-center">
                    <span className="text-gray-500 dark:text-gray-400 mr-1">$</span>
                    <input
                      type="text"
                      value={customAmount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      placeholder={paymentAmount.toString()}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <div className="pt-4">
            <Button
              variant="primary"
              fullWidth
              onClick={handlePaymentClick}
              isLoading={isProcessing}
              disabled={
                isProcessing || 
                (useCustomAmount && (!customAmount || parseFloat(customAmount) <= 0)) ||
                !['scheduled', 'confirmed', 'completed'].includes(appointment.status.toLowerCase())
              }
            >
              {isProcessing 
                ? 'Processing...' 
                : `Pay ${formatAmount(useCustomAmount && customAmount ? parseFloat(customAmount) : paymentAmount)}`
              }
            </Button>
          </div>

          {/* Information */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Secure payment processing • HIPAA Compliant</span>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Your payment will be processed securely. You'll receive a receipt after successful payment.
              Payment method will be saved for future sessions.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AppointmentPayment;