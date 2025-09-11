/**
 * VisuallyHidden Component
 * Provides content that's accessible to screen readers but visually hidden
 * Follows WCAG guidelines for sr-only content
 */

import React from 'react';
import { clsx } from 'clsx';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  /**
   * When true, the content becomes visible on focus
   * Useful for skip links and keyboard navigation hints
   */
  focusable?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * HTML element type to render
   */
  as?: React.ElementType;
}

/**
 * VisuallyHidden component that provides content to screen readers
 * while keeping it visually hidden from sighted users
 */
export function VisuallyHidden({
  children,
  focusable = false,
  className,
  as: Element = 'span',
  ...props
}: VisuallyHiddenProps & React.ComponentProps<React.ElementType>) {
  return (
    <Element
      className={clsx(
        // Base sr-only styles
        'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
        // Clip path for better browser support
        '[clip:rect(0,0,0,0)]',
        // Focus styles when focusable
        focusable && [
          'focus:static focus:w-auto focus:h-auto focus:p-4 focus:m-0',
          'focus:overflow-visible focus:whitespace-normal',
          'focus:[clip:auto] focus:bg-blue-600 focus:text-white',
          'focus:z-[9999] focus:rounded-md focus:shadow-lg'
        ],
        className
      )}
      {...props}
    >
      {children}
    </Element>
  );
}

/**
 * Specialized version for skip links
 */
export function SkipLink({
  href,
  children,
  className,
  ...props
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <VisuallyHidden
      as="a"
      focusable
      className={clsx(
        'focus:fixed focus:top-4 focus:left-4',
        'focus:font-medium focus:text-sm',
        'focus:transition-none', // Disable transitions for immediate visibility
        className
      )}
      href={href}
      {...props}
    >
      {children}
    </VisuallyHidden>
  );
}

/**
 * Component for providing additional context to screen readers
 */
export function ScreenReaderOnly({
  children,
  announce = false,
  ...props
}: {
  children: React.ReactNode;
  /**
   * When true, content is announced immediately via aria-live
   */
  announce?: boolean;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <VisuallyHidden
      as="span"
      aria-live={announce ? 'polite' : undefined}
      aria-atomic={announce ? 'true' : undefined}
      {...props}
    >
      {children}
    </VisuallyHidden>
  );
}

export default VisuallyHidden;