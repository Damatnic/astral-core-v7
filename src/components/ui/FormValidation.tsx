'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/20/solid';

interface Validator {
  validate: (value: string) => boolean | Promise<boolean>;
  message: string;
  async?: boolean;
}

interface FormValidationProps {
  value: string;
  validators: Validator[];
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  showSuccess?: boolean;
  debounceMs?: number;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  validateOnMount?: boolean;
  immediateValidation?: boolean;
  className?: string;
  focusOnError?: boolean;
  announceErrors?: boolean;
}

export const FormValidation: React.FC<FormValidationProps> = ({
  value,
  validators,
  onValidationChange,
  showSuccess = true,
  debounceMs = 500,
  validateOnBlur = true,
  validateOnChange = true,
  validateOnMount = false,
  immediateValidation = false,
  className = '',
  focusOnError = true,
  announceErrors = true
}) => {
  const [errors, setErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [shouldShowErrors, setShouldShowErrors] = useState(false);
  const validationTimeoutRef = useRef<NodeJS.Timeout>();
  const errorAnnouncementRef = useRef<HTMLDivElement>(null);
  const firstErrorRef = useRef<string | null>(null);

  const validate = useCallback(async (immediate = false) => {
    if (!immediate && !immediateValidation && !hasInteracted && !validateOnMount) {
      return;
    }

    setIsValidating(true);
    const newErrors: string[] = [];

    for (const validator of validators) {
      if (validator.async) {
        const result = await validator.validate(value);
        if (!result) {
          newErrors.push(validator.message);
        }
      } else {
        const result = validator.validate(value) as boolean;
        if (!result) {
          newErrors.push(validator.message);
        }
      }
    }

    const hasErrors = newErrors.length > 0;
    const errorsChanged = JSON.stringify(newErrors) !== JSON.stringify(errors);
    
    setErrors(newErrors);
    setIsValid(!hasErrors);
    setIsValidating(false);
    
    // Only show errors after user interaction or on mount if specified
    if (hasInteracted || hasBlurred || validateOnMount || immediate) {
      setShouldShowErrors(true);
    }
    
    // Announce first error to screen readers
    if (announceErrors && hasErrors && errorsChanged && newErrors[0] !== firstErrorRef.current) {
      firstErrorRef.current = newErrors[0];
      if (errorAnnouncementRef.current) {
        errorAnnouncementRef.current.textContent = `Validation error: ${newErrors[0]}`;
      }
    }
    
    onValidationChange?.(!hasErrors, newErrors);
  }, [value, validators, errors, hasInteracted, hasBlurred, validateOnMount, immediateValidation, announceErrors, onValidationChange]);

  // Validate on value change with debouncing
  useEffect(() => {
    if (!validateOnChange || (!hasInteracted && !validateOnMount)) return;

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Immediate validation for critical fields (passwords, emails)
    const isCriticalField = validators.some(v => 
      v.message.toLowerCase().includes('password') || 
      v.message.toLowerCase().includes('email')
    );
    
    const delay = isCriticalField && hasInteracted ? Math.min(debounceMs, 300) : debounceMs;

    validationTimeoutRef.current = setTimeout(() => {
      validate();
    }, delay);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [value, hasInteracted, validateOnMount, validateOnChange, debounceMs, validate]);

  // Track user interaction
  useEffect(() => {
    if (value && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [value, hasInteracted]);

  // Validate on mount if specified
  useEffect(() => {
    if (validateOnMount) {
      validate(true);
    }
  }, []);

  const handleBlur = () => {
    setHasBlurred(true);
    setShouldShowErrors(true);
    if (validateOnBlur) {
      validate(true);
    }
  };

  const handleFocus = () => {
    // Clear announcement when field is focused again
    if (errorAnnouncementRef.current) {
      errorAnnouncementRef.current.textContent = '';
    }
  };

  // Only show validation UI after interaction or if explicitly configured
  if (!shouldShowErrors && !validateOnMount) {
    return (
      <>
        <div 
          className="sr-only" 
          ref={errorAnnouncementRef}
          role="alert" 
          aria-live="polite" 
          aria-atomic="true"
        />
        <div className="hidden" onBlur={handleBlur} onFocus={handleFocus} />
      </>
    );
  }

  return (
    <div className={`mt-1 ${className}`} onBlur={handleBlur} onFocus={handleFocus}>
      {/* Screen reader announcements */}
      <div 
        className="sr-only" 
        ref={errorAnnouncementRef}
        role="alert" 
        aria-live="polite" 
        aria-atomic="true"
      />
      
      {isValidating && (
        <div className="flex items-center text-sm text-gray-500" aria-live="polite">
          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Validating...</span>
        </div>
      )}
      
      {!isValidating && errors.length > 0 && shouldShowErrors && (
        <div 
          className="mt-1" 
          role="alert" 
          aria-live="polite"
          aria-describedby={focusOnError ? 'validation-errors' : undefined}
        >
          <div id="validation-errors">
            {errors.map((error, index) => (
              <div 
                key={index} 
                className="flex items-start text-sm text-red-600 dark:text-red-400 mt-1"
                data-error-index={index}
              >
                <ExclamationCircleIcon 
                  className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" 
                  aria-hidden="true" 
                />
                <span>{error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!isValidating && errors.length === 0 && isValid && showSuccess && shouldShowErrors && value && (
        <div 
          className="flex items-center text-sm text-green-600 dark:text-green-400 mt-1"
          role="status"
          aria-live="polite"
        >
          <CheckCircleIcon className="h-4 w-4 mr-1" aria-hidden="true" />
          <span>Valid</span>
        </div>
      )}
    </div>
  );
};

export default FormValidation;