import { InputHTMLAttributes, forwardRef, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { VisuallyHidden } from './accessibility/VisuallyHidden';
import { useAccessibilityPreferences, useAccessibleId } from '@/hooks/useAccessibility';
import { validateSensitiveInput } from '@/utils/accessibility';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  /**
   * Icon to display before the input
   */
  iconBefore?: React.ReactNode;
  /**
   * Icon to display after the input
   */
  iconAfter?: React.ReactNode;
  /**
   * Whether this is a required field
   */
  isRequired?: boolean;
  /**
   * Type of sensitive content for mental health validation
   */
  sensitiveType?: 'mood' | 'crisis' | 'general' | 'none';
  /**
   * Success message to display
   */
  successMessage?: string;
  /**
   * Whether to show character count
   */
  showCharacterCount?: boolean;
  /**
   * Maximum character count
   */
  maxLength?: number;
  /**
   * Custom validation function
   */
  customValidation?: (value: string) => string | undefined;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      fullWidth = false,
      type = 'text',
      id,
      iconBefore,
      iconAfter,
      isRequired = false,
      sensitiveType = 'none',
      successMessage,
      showCharacterCount = false,
      maxLength,
      customValidation,
      value,
      onChange,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const { prefersReducedMotion, prefersHighContrast } = useAccessibilityPreferences();
    const inputId = useAccessibleId(id || label?.toLowerCase().replace(/\s+/g, '-'));
    const [internalValue, setInternalValue] = useState(value || '');
    const [validationMessage, setValidationMessage] = useState<string>('');
    const [characterCount, setCharacterCount] = useState(0);

    // Handle controlled/uncontrolled input
    const currentValue = value !== undefined ? value : internalValue;

    useEffect(() => {
      setCharacterCount(String(currentValue).length);

      // Perform sensitive content validation
      if (sensitiveType !== 'none' && String(currentValue).length > 0) {
        const validation = validateSensitiveInput(String(currentValue), sensitiveType);
        if (!validation.isValid && validation.suggestions.length > 0) {
          setValidationMessage(validation.suggestions[0]);
        } else {
          setValidationMessage('');
        }
      }

      // Custom validation
      if (customValidation && String(currentValue).length > 0) {
        const customError = customValidation(String(currentValue));
        if (customError) {
          setValidationMessage(customError);
        }
      }
    }, [currentValue, sensitiveType, customValidation]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      
      if (value === undefined) {
        setInternalValue(newValue);
      }
      
      onChange?.(e);
    };

    // Generate ARIA attributes
    const describedByIds = [
      error && `${inputId}-error`,
      validationMessage && `${inputId}-validation`,
      helperText && `${inputId}-helper`,
      successMessage && `${inputId}-success`,
      showCharacterCount && `${inputId}-count`,
      ariaDescribedBy
    ].filter(Boolean).join(' ');

    const hasError = !!(error || validationMessage);
    const hasSuccess = !!(successMessage && !hasError);

    return (
      <div className={clsx('space-y-1', fullWidth && 'w-full')}>
        {/* Label with required indicator */}
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              'block text-sm font-medium',
              hasError ? 'text-red-700 dark:text-red-400' :
              hasSuccess ? 'text-green-700 dark:text-green-400' :
              'text-gray-700 dark:text-gray-200'
            )}
          >
            {label}
            {isRequired && (
              <>
                <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                <VisuallyHidden> (required)</VisuallyHidden>
              </>
            )}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Icon before */}
          {iconBefore && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">
                {iconBefore}
              </span>
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            type={type}
            value={currentValue}
            onChange={handleChange}
            maxLength={maxLength}
            className={clsx(
              'block w-full rounded-md shadow-sm',
              'bg-white dark:bg-gray-700',
              'text-gray-900 dark:text-white',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:border-transparent',
              'disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed',
              // Enhanced focus ring
              'focus:ring-offset-2',
              // Padding adjustments for icons
              iconBefore && !iconAfter ? 'pl-10 pr-3 py-2' :
              !iconBefore && iconAfter ? 'pl-3 pr-10 py-2' :
              iconBefore && iconAfter ? 'pl-10 pr-10 py-2' :
              'px-3 py-2',
              // State-based styling
              hasError ? 'border-red-500 focus:ring-red-500' :
              hasSuccess ? 'border-green-500 focus:ring-green-500' :
              'border-gray-300 dark:border-gray-600 focus:ring-blue-500',
              // High contrast support
              prefersHighContrast && 'border-2',
              // Reduced motion support
              prefersReducedMotion ? 'transition-none' : 'transition-colors duration-200',
              // Ensure minimum touch target
              'min-h-[44px]',
              fullWidth && 'w-full',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={describedByIds || undefined}
            aria-label={ariaLabel}
            aria-required={isRequired}
            {...props}
          />

          {/* Icon after */}
          {iconAfter && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">
                {iconAfter}
              </span>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        {/* Validation message */}
        {validationMessage && !error && (
          <p id={`${inputId}-validation`} className="text-sm text-orange-600 dark:text-orange-400" role="alert">
            {validationMessage}
          </p>
        )}

        {/* Success message */}
        {successMessage && !hasError && (
          <p id={`${inputId}-success`} className="text-sm text-green-600 dark:text-green-400">
            {successMessage}
          </p>
        )}

        {/* Helper text */}
        {helperText && !error && !validationMessage && (
          <p id={`${inputId}-helper`} className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}

        {/* Character count */}
        {showCharacterCount && (
          <p id={`${inputId}-count`} className="text-sm text-gray-500 dark:text-gray-400">
            <span className={clsx(
              maxLength && characterCount > maxLength * 0.9 && 'text-orange-600 dark:text-orange-400',
              maxLength && characterCount >= maxLength && 'text-red-600 dark:text-red-400'
            )}>
              {characterCount}
            </span>
            {maxLength && (
              <>
                <span aria-hidden="true"> / </span>
                <span>{maxLength}</span>
                <VisuallyHidden> characters maximum</VisuallyHidden>
              </>
            )}
            <VisuallyHidden> characters entered</VisuallyHidden>
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
