/**
 * Dynamic Stripe Loader
 * Loads Stripe components only when needed to reduce initial bundle size
 */

import type { Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

// Dynamically load Stripe
export const loadStripeAsync = async (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const { loadStripe } = await import('@stripe/stripe-js');
    stripePromise = loadStripe(process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']!);
  }
  return stripePromise;
};

// Preload Stripe when user interacts with billing sections
export const preloadStripe = () => {
  if (typeof window !== 'undefined' && !stripePromise) {
    loadStripeAsync().catch(console.error);
  }
};

// Dynamic Stripe Elements provider
export const loadStripeElements = async () => {
  const [{ Elements }, stripe] = await Promise.all([
    import('@stripe/react-stripe-js'),
    loadStripeAsync()
  ]);
  
  return { Elements, stripe };
};

// Dynamic Stripe hooks
export const loadStripeHooks = async () => {
  const { useStripe, useElements, CardElement } = await import('@stripe/react-stripe-js');
  return { useStripe, useElements, CardElement };
};