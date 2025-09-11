import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { VisuallyHidden } from './accessibility/VisuallyHidden';
import { useAccessibilityPreferences } from '@/hooks/useAccessibility';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  /**
   * Icon to display before the button text
   */
  iconBefore?: React.ReactNode;
  /**
   * Icon to display after the button text
   */
  iconAfter?: React.ReactNode;
  /**
   * Description for screen readers (supplements aria-label)
   */
  description?: string;
  /**
   * Loading text announced to screen readers
   */
  loadingText?: string;
  /**
   * Whether this button triggers a dangerous action
   */
  dangerous?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      iconBefore,
      iconAfter,
      description,
      loadingText = 'Loading, please wait',
      dangerous = false,
      children,
      disabled,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const { prefersReducedMotion } = useAccessibilityPreferences();
    const baseStyles = clsx(
      'inline-flex items-center justify-center font-medium',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'aria-disabled:opacity-50 aria-disabled:cursor-not-allowed',
      // Respect reduced motion preferences
      prefersReducedMotion ? 'transition-none' : 'transition-colors duration-200',
      // Enhanced focus ring for better visibility
      'focus:ring-offset-2 focus:ring-2',
      // Better touch targets for mobile
      'min-h-[44px] min-w-[44px]'
    );

    // Enhanced color variants with WCAG AA compliant contrast ratios
    const variants = {
      primary: clsx(
        'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        'border border-blue-600 hover:border-blue-700',
        // High contrast mode support
        'contrast-more:border-2 contrast-more:border-current'
      ),
      secondary: clsx(
        'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
        'border border-gray-300 hover:border-gray-400',
        'dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600',
        'contrast-more:border-2 contrast-more:border-current'
      ),
      danger: clsx(
        // Use orange instead of red for mental health safety
        dangerous ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500' :
        'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
        'border border-current',
        'contrast-more:border-2'
      ),
      success: clsx(
        'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        'border border-green-600 hover:border-green-700',
        'contrast-more:border-2 contrast-more:border-current'
      ),
      ghost: clsx(
        'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
        'border border-gray-300 hover:border-gray-400',
        'dark:text-gray-300 dark:hover:bg-gray-800 dark:border-gray-600',
        'contrast-more:border-2 contrast-more:border-current'
      )
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded',
      md: 'px-4 py-2 text-base rounded-md',
      lg: 'px-6 py-3 text-lg rounded-lg'
    };

    // Generate enhanced ARIA attributes
    const enhancedAriaLabel = isLoading 
      ? `${ariaLabel || children} - ${loadingText}`
      : ariaLabel;

    const ariaDescribedByValue = description 
      ? `${ariaDescribedBy || ''} button-description-${Math.random().toString(36).substr(2, 9)}`.trim()
      : ariaDescribedBy;

    return (
      <>
        <button
          ref={ref}
          className={clsx(
            baseStyles,
            variants[variant],
            sizes[size],
            fullWidth && 'w-full',
            className
          )}
          disabled={disabled || isLoading}
          aria-disabled={disabled || isLoading}
          aria-busy={isLoading}
          aria-label={enhancedAriaLabel}
          aria-describedby={ariaDescribedByValue}
          // Enhanced keyboard interaction
          onKeyDown={(e) => {
            // Allow space and enter to activate button
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              if (!disabled && !isLoading && props.onClick) {
                props.onClick(e as any);
              }
            }
            props.onKeyDown?.(e);
          }}
          {...props}
        >
          {/* Icon before content */}
          {iconBefore && (
            <span className="mr-2 flex-shrink-0" aria-hidden="true">
              {iconBefore}
            </span>
          )}

          {/* Loading spinner */}
          {isLoading && (
            <>
              <svg
                className={clsx(
                  'h-4 w-4 flex-shrink-0',
                  children ? 'mr-2' : '',
                  prefersReducedMotion ? '' : 'animate-spin'
                )}
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                aria-hidden='true'
              >
                <circle
                  className='opacity-25'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='4'
                />
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                />
              </svg>
              <VisuallyHidden>
                {loadingText}
              </VisuallyHidden>
            </>
          )}

          {/* Button content */}
          <span className="flex-1">
            {children}
          </span>

          {/* Icon after content */}
          {iconAfter && (
            <span className="ml-2 flex-shrink-0" aria-hidden="true">
              {iconAfter}
            </span>
          )}
        </button>

        {/* Hidden description for screen readers */}
        {description && (
          <VisuallyHidden id={ariaDescribedByValue}>
            {description}
          </VisuallyHidden>
        )}
      </>
    );
  }
);

Button.displayName = 'Button';

export default Button;
