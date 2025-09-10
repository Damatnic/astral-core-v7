/**
 * Error Handling Hook
 * Provides consistent error handling across the application
 */

'use client';

import { useState, useCallback } from 'react';
import { logError } from '@/lib/logger';

interface ErrorState {
  error: string | null;
  isRetrying: boolean;
  retryCount: number;
}

interface UseErrorHandlingOptions {
  maxRetries?: number;
  retryDelay?: number;
  context?: string;
  onError?: (error: Error) => void;
  onRetrySuccess?: () => void;
}

export const useErrorHandling = (options: UseErrorHandlingOptions = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    context = 'useErrorHandling',
    onError,
    onRetrySuccess
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0
  });

  const handleError = useCallback((error: unknown, errorContext?: string) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const fullContext = errorContext ? `${context}:${errorContext}` : context;
    
    logError('Error handled by useErrorHandling', error as Error, fullContext, {
      retryCount: errorState.retryCount,
      maxRetries
    });

    setErrorState(prev => ({
      ...prev,
      error: errorMessage
    }));

    onError?.(error instanceof Error ? error : new Error(errorMessage));
  }, [context, errorState.retryCount, maxRetries, onError]);

  const retry = useCallback(async (operation: () => Promise<unknown>) => {
    if (errorState.retryCount >= maxRetries) {
      return false;
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true
    }));

    try {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      const result = await operation();
      
      setErrorState({
        error: null,
        isRetrying: false,
        retryCount: errorState.retryCount + 1
      });

      onRetrySuccess?.();
      return result;
    } catch (error) {
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
        retryCount: prev.retryCount + 1,
        error: error instanceof Error ? error.message : 'Retry failed'
      }));
      
      handleError(error, 'retry');
      return false;
    }
  }, [errorState.retryCount, maxRetries, retryDelay, handleError, onRetrySuccess]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0
    });
  }, []);

  const canRetry = errorState.retryCount < maxRetries;

  return {
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    canRetry,
    handleError,
    retry,
    clearError
  };
};

// Hook for async operations with loading states
interface UseAsyncOperationOptions<T> extends UseErrorHandlingOptions {
  initialData?: T;
  onSuccess?: (data: T) => void;
}

export const useAsyncOperation = <T = unknown>(options: UseAsyncOperationOptions<T> = {}) => {
  const { initialData, onSuccess, ...errorOptions } = options;
  
  const [data, setData] = useState<T | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { error, isRetrying, retryCount, canRetry, handleError, retry, clearError } = useErrorHandling(errorOptions);

  const execute = useCallback(async (operation: () => Promise<T>) => {
    setIsLoading(true);
    clearError();
    
    try {
      const result = await operation();
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, clearError, onSuccess]);

  const retryOperation = useCallback(async (operation: () => Promise<T>) => {
    if (!canRetry) return false;
    
    setIsLoading(true);
    const result = await retry(operation);
    setIsLoading(false);
    
    if (result) {
      setData(result);
      onSuccess?.(result);
    }
    
    return result;
  }, [retry, canRetry, onSuccess]);

  return {
    data,
    isLoading,
    error,
    isRetrying,
    retryCount,
    canRetry,
    execute,
    retry: retryOperation,
    clearError,
    setData
  };
};

// Hook for form submissions
interface UseFormSubmissionOptions extends UseErrorHandlingOptions {
  onSuccess?: () => void;
  validateBeforeSubmit?: () => boolean;
}

export const useFormSubmission = (options: UseFormSubmissionOptions = {}) => {
  const { onSuccess, validateBeforeSubmit, ...errorOptions } = options;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { error, handleError, clearError } = useErrorHandling(errorOptions);

  const submit = useCallback(async (submitFunction: () => Promise<void>) => {
    if (validateBeforeSubmit && !validateBeforeSubmit()) {
      return false;
    }

    setIsSubmitting(true);
    setIsSuccess(false);
    clearError();

    try {
      await submitFunction();
      setIsSuccess(true);
      onSuccess?.();
      return true;
    } catch (error) {
      handleError(error, 'submit');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validateBeforeSubmit, handleError, clearError, onSuccess]);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setIsSuccess(false);
    clearError();
  }, [clearError]);

  return {
    isSubmitting,
    isSuccess,
    error,
    submit,
    reset,
    clearError
  };
};

export default useErrorHandling;