/**
 * LiveRegion Component
 * ARIA live region for dynamic content announcements
 */

import React, { useEffect, useRef } from 'react';
import { VisuallyHidden } from './VisuallyHidden';

interface LiveRegionProps {
  /**
   * Message to announce
   */
  message: string;
  /**
   * Priority of the announcement
   */
  priority?: 'polite' | 'assertive' | 'off' | undefined;
  /**
   * Whether to clear the message after announcing
   */
  clearAfterAnnounce?: boolean | undefined;
  /**
   * Delay before clearing the message (ms)
   */
  clearDelay?: number | undefined;
  /**
   * Whether the entire region should be announced when changed
   */
  atomic?: boolean | undefined;
  /**
   * Additional ARIA attributes
   */
  'aria-relevant'?: string | undefined;
  /**
   * Additional class names
   */
  className?: string | undefined;
}

export function LiveRegion({
  message,
  priority = 'polite',
  clearAfterAnnounce = true,
  clearDelay = 1000,
  atomic = true,
  'aria-relevant': ariaRelevant = 'additions text',
  className,
  ...props
}: LiveRegionProps & React.HTMLAttributes<HTMLDivElement>) {
  const regionRef = useRef<HTMLDivElement>(null);
  const clearTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!regionRef.current || !message) return;

    // Clear any existing timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }

    // Set the message
    regionRef.current.textContent = message;

    // Clear message after delay if specified
    if (clearAfterAnnounce && clearDelay > 0) {
      clearTimeoutRef.current = setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = '';
        }
      }, clearDelay);
    }

    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, [message, clearAfterAnnounce, clearDelay]);

  return (
    <VisuallyHidden
      ref={regionRef}
      as="div"
      role="status"
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={ariaRelevant}
      className={className}
      {...props}
    />
  );
}

/**
 * Status announcer for form validation and user feedback
 */
export function StatusAnnouncer({
  status,
  type = 'info',
  className,
  ...props
}: {
  status: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const priority = type === 'error' ? 'assertive' : 'polite';
  const roleType = type === 'error' ? 'alert' : 'status';

  return (
    <VisuallyHidden
      as="div"
      role={roleType}
      aria-live={priority}
      aria-atomic={true}
      className={className}
      {...props}
    >
      {status}
    </VisuallyHidden>
  );
}

/**
 * Progress announcer for multi-step processes
 */
export function ProgressAnnouncer({
  currentStep,
  totalSteps,
  stepName,
  format = 'Step {current} of {total}: {name}',
  className,
  ...props
}: {
  currentStep: number;
  totalSteps: number;
  stepName?: string;
  format?: string;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const message = format
    .replace('{current}', currentStep.toString())
    .replace('{total}', totalSteps.toString())
    .replace('{name}', stepName || '');

  return (
    <LiveRegion
      message={message}
      priority="polite"
      className={className}
      {...props}
    />
  );
}

/**
 * Loading state announcer
 */
export function LoadingAnnouncer({
  isLoading,
  loadingMessage = 'Loading content, please wait',
  completeMessage = 'Content loaded',
  className,
  ...props
}: {
  isLoading: boolean;
  loadingMessage?: string;
  completeMessage?: string;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const message = isLoading ? loadingMessage : completeMessage;

  return (
    <LiveRegion
      message={message}
      priority="polite"
      clearAfterAnnounce={!isLoading}
      className={className}
      {...props}
    />
  );
}

/**
 * Mental health specific announcer with supportive messaging
 */
export function WellnessAnnouncer({
  action,
  supportiveMessage = true,
  className,
  ...props
}: {
  action: string;
  supportiveMessage?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const enhancedMessage = supportiveMessage 
    ? `${action}. You're taking positive steps for your wellbeing.`
    : action;

  return (
    <LiveRegion
      message={enhancedMessage}
      priority="polite"
      clearDelay={2000} // Longer delay for supportive messages
      className={className}
      {...props}
    />
  );
}

export default LiveRegion;