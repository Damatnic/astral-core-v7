'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface ErrorFieldFocusProps {
  errors: Record<string, string | string[]>;
  fieldRefs?: Record<string, React.RefObject<HTMLElement>>;
  scrollIntoView?: boolean;
  focusDelay?: number;
  announceError?: boolean;
  children: React.ReactNode;
}

export const ErrorFieldFocus: React.FC<ErrorFieldFocusProps> = ({
  errors,
  fieldRefs = {},
  scrollIntoView = true,
  focusDelay = 100,
  announceError = true,
  children
}) => {
  const errorAnnouncementRef = useRef<HTMLDivElement>(null);
  const lastFocusedField = useRef<string | null>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout>();

  const focusFirstError = useCallback(() => {
    // Find first field with error
    const errorFields = Object.keys(errors).filter(key => {
      const error = errors[key];
      return error && (Array.isArray(error) ? error.length > 0 : true);
    });

    if (errorFields.length === 0) {
      lastFocusedField.current = null;
      return;
    }

    const firstErrorField = errorFields[0];
    
    // Don't refocus the same field repeatedly
    if (firstErrorField === lastFocusedField.current) {
      return;
    }

    // Clear any pending focus
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }

    focusTimeoutRef.current = setTimeout(() => {
      // Try to focus using provided refs first
      if (fieldRefs[firstErrorField]?.current) {
        const element = fieldRefs[firstErrorField].current;
        
        if (scrollIntoView) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
        
        // Focus the element
        if ('focus' in element && typeof element.focus === 'function') {
          (element as HTMLElement).focus();
        }
        
        lastFocusedField.current = firstErrorField;
      } else {
        // Fallback: try to find field by common naming patterns
        const possibleSelectors = [
          `[name="${firstErrorField}"]`,
          `[id="${firstErrorField}"]`,
          `[data-field="${firstErrorField}"]`,
          `[aria-label*="${firstErrorField}"]`
        ];
        
        for (const selector of possibleSelectors) {
          try {
            const element = document.querySelector<HTMLElement>(selector);
            if (element) {
              if (scrollIntoView) {
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
                });
              }
              
              element.focus();
              lastFocusedField.current = firstErrorField;
              break;
            }
          } catch (e) {
            // Invalid selector, continue
          }
        }
      }

      // Announce error to screen readers
      if (announceError && errorAnnouncementRef.current) {
        const errorMessage = Array.isArray(errors[firstErrorField]) 
          ? errors[firstErrorField][0] 
          : errors[firstErrorField];
        
        errorAnnouncementRef.current.textContent = 
          `Error in ${firstErrorField}: ${errorMessage}. Press Tab to navigate to the field.`;
      }
    }, focusDelay);
  }, [errors, fieldRefs, scrollIntoView, focusDelay, announceError]);

  // Focus first error when errors change
  useEffect(() => {
    focusFirstError();

    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [errors, focusFirstError]);

  // Clear announcement when errors are resolved
  useEffect(() => {
    const hasErrors = Object.keys(errors).some(key => {
      const error = errors[key];
      return error && (Array.isArray(error) ? error.length > 0 : true);
    });

    if (!hasErrors && errorAnnouncementRef.current) {
      errorAnnouncementRef.current.textContent = 'All errors have been resolved.';
      lastFocusedField.current = null;
    }
  }, [errors]);

  return (
    <>
      {/* Screen reader announcements */}
      <div 
        ref={errorAnnouncementRef}
        className="sr-only"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      />
      {children}
    </>
  );
};

// Hook for managing field refs
export const useErrorFieldRefs = <T extends string>() => {
  const refs = useRef<Record<T, React.RefObject<HTMLElement>>>({} as any);
  
  const getRef = (fieldName: T) => {
    if (!refs.current[fieldName]) {
      refs.current[fieldName] = React.createRef<HTMLElement>();
    }
    return refs.current[fieldName];
  };
  
  return { refs: refs.current, getRef };
};

// Example form wrapper with automatic error focus
interface FormWithErrorFocusProps {
  onSubmit: (e: React.FormEvent) => void;
  errors: Record<string, string | string[]>;
  children: React.ReactNode;
  className?: string;
}

export const FormWithErrorFocus: React.FC<FormWithErrorFocusProps> = ({
  onSubmit,
  errors,
  children,
  className = ''
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <ErrorFieldFocus errors={errors}>
      <form 
        onSubmit={handleSubmit} 
        className={className}
        noValidate
        aria-describedby="form-errors"
      >
        {/* Display error summary at top of form */}
        {Object.keys(errors).length > 0 && (
          <div 
            id="form-errors"
            className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg"
            role="alert"
            aria-live="polite"
            tabIndex={-1}
          >
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2">
              Please correct the following errors:
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {Object.entries(errors).map(([field, error]) => {
                const errorMessage = Array.isArray(error) ? error[0] : error;
                if (!errorMessage) return null;
                
                return (
                  <li key={field} className="text-sm text-red-700 dark:text-red-300">
                    <button
                      type="button"
                      className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                      onClick={() => {
                        const element = document.querySelector<HTMLElement>(
                          `[name="${field}"], [id="${field}"]`
                        );
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          element.focus();
                        }
                      }}
                    >
                      {field}
                    </button>
                    : {errorMessage}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        
        {children}
      </form>
    </ErrorFieldFocus>
  );
};

export default ErrorFieldFocus;