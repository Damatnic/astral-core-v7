/**
 * Dynamic Stripe Wrapper
 * Only loads Stripe components when actually needed
 */

'use client';

import React, { useState, useEffect } from 'react';
import { PaymentFormSkeleton } from '@/components/ui/SkeletonLoader';
import { loadStripeElements } from '@/lib/stripe/dynamic-loader';
import type { StripeElementsOptions } from '@stripe/stripe-js';

interface DynamicStripeWrapperProps {
  children: React.ReactNode;
  options?: StripeElementsOptions;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const DynamicStripeWrapper: React.FC<DynamicStripeWrapperProps> = ({
  children,
  options,
  onLoad,
  onError
}) => {
  const [stripeElements, setStripeElements] = useState<{
    Elements: React.ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    stripe: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadStripe = async () => {
      try {
        const { Elements, stripe } = await loadStripeElements();
        
        if (mounted) {
          setStripeElements({ Elements, stripe });
          setLoading(false);
          onLoad?.();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load Stripe');
        if (mounted) {
          setError(error);
          setLoading(false);
          onError?.(error);
        }
      }
    };

    loadStripe();

    return () => {
      mounted = false;
    };
  }, [onLoad, onError]);

  if (loading) {
    return <PaymentFormSkeleton />;
  }

  if (error || !stripeElements) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-red-600">Failed to load payment system. Please refresh and try again.</p>
      </div>
    );
  }

  const { Elements, stripe } = stripeElements;

  return (
    <Elements stripe={stripe} options={options}>
      {children}
    </Elements>
  );
};

export default DynamicStripeWrapper;