'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/lib/logger';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorType?: 'network' | 'validation' | 'payment' | 'unknown';
}

/**
 * Specialized error boundary for payment-related components
 * Provides enhanced error handling and user-friendly messages for payment failures
 */
export class PaymentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Categorize the error type for appropriate user messaging
    let errorType: State['errorType'] = 'unknown';
    
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorType = 'network';
    } else if (errorMessage.includes('card') || errorMessage.includes('payment') || errorMessage.includes('stripe')) {
      errorType = 'payment';
    } else if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
      errorType = 'validation';
    }

    return { hasError: true, error, errorType };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log payment errors with enhanced security context
    logError('Payment Error Boundary caught an error', error, 'PaymentErrorBoundary', {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'payment',
      // Do not log sensitive payment details
      errorType: this.state.errorType,
      timestamp: new Date().toISOString()
    });
  }

  private handleRetry = () => {
    // Reset error state
    this.setState({ hasError: false });
    
    // Call optional retry handler
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  private getErrorMessage(): { title: string; message: string; action: string } {
    switch (this.state.errorType) {
      case 'network':
        return {
          title: 'Connection Issue',
          message: 'Unable to connect to our payment processor. Please check your internet connection and try again.',
          action: 'Retry Connection'
        };
      case 'payment':
        return {
          title: 'Payment Processing Error',
          message: 'There was an issue processing your payment. Your card has not been charged. Please try again or use a different payment method.',
          action: 'Try Again'
        };
      case 'validation':
        return {
          title: 'Invalid Information',
          message: 'Please check your payment information and ensure all fields are correctly filled.',
          action: 'Review Information'
        };
      default:
        return {
          title: 'Unexpected Error',
          message: 'An unexpected error occurred. Your payment has not been processed. Our team has been notified.',
          action: 'Retry'
        };
    }
  }

  override render() {
    if (this.state.hasError) {
      const { title, message, action } = this.getErrorMessage();

      return (
        <div className='bg-white rounded-lg shadow-sm border border-red-100 p-6'>
          <div className='flex items-start'>
            <div className='flex-shrink-0'>
              {/* Warning icon with calming colors for mental health context */}
              <svg
                className='h-6 w-6 text-amber-500'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth='1.5'
                stroke='currentColor'
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z'
                />
              </svg>
            </div>
            <div className='ml-3 flex-1'>
              <h3 className='text-sm font-medium text-gray-900'>{title}</h3>
              <div className='mt-2 text-sm text-gray-600'>
                <p>{message}</p>
              </div>
              <div className='mt-4 flex space-x-3'>
                <button
                  type='button'
                  onClick={this.handleRetry}
                  className='inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200'
                >
                  {action}
                </button>
                <button
                  type='button'
                  onClick={() => window.location.href = '/support'}
                  className='inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200'
                >
                  Contact Support
                </button>
              </div>
              {/* Security assurance message */}
              <div className='mt-4 text-xs text-gray-500 flex items-center'>
                <svg
                  className='h-4 w-4 mr-1 text-green-500'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth='1.5'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z'
                  />
                </svg>
                Your payment information is secure and has not been compromised.
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping payment components with error boundary
 */
export const withPaymentErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  onRetry?: () => void
) => {
  const WrappedComponent = (props: P) => (
    <PaymentErrorBoundary {...(onRetry && { onRetry })}>
      <Component {...props} />
    </PaymentErrorBoundary>
  );

  WrappedComponent.displayName = `withPaymentErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};