/**
 * FocusManager Component
 * Advanced focus management for complex UI patterns
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useFocusTrap, useRovingTabIndex } from '@/hooks/useAccessibility';

interface FocusManagerProps {
  children: React.ReactNode;
  /**
   * Whether focus should be trapped within this component
   */
  trapFocus?: boolean;
  /**
   * Whether to use roving tab index for keyboard navigation
   */
  rovingTabIndex?: boolean;
  /**
   * Orientation for roving tab index
   */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /**
   * Whether to auto-focus the first element when mounted
   */
  autoFocus?: boolean;
  /**
   * Called when focus escapes the component (useful for modals)
   */
  onEscapeFocus?: () => void;
  /**
   * Called when Escape key is pressed
   */
  onEscape?: () => void;
  /**
   * Additional class names
   */
  className?: string;
  /**
   * ARIA role for the container
   */
  role?: string;
  /**
   * ARIA label for the container
   */
  'aria-label'?: string;
  /**
   * ARIA labelledby for the container
   */
  'aria-labelledby'?: string;
}

export function FocusManager({
  children,
  trapFocus = false,
  rovingTabIndex = false,
  orientation = 'vertical',
  autoFocus = false,
  onEscapeFocus,
  onEscape,
  className,
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: FocusManagerProps & React.HTMLAttributes<HTMLDivElement>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(trapFocus);
  const { containerRef: rovingRef } = useRovingTabIndex(orientation);

  // Merge refs for focus trap and roving tab index
  useEffect(() => {
    if (trapFocus && focusTrapRef.current) {
      containerRef.current = focusTrapRef.current as HTMLDivElement;
    }
    if (rovingTabIndex && rovingRef.current) {
      containerRef.current = rovingRef.current as HTMLDivElement;
    }
  }, [trapFocus, rovingTabIndex, focusTrapRef, rovingRef]);

  // Handle escape key
  useEffect(() => {
    if (!onEscape && !onEscapeFocus) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!containerRef.current || !onEscapeFocus) return;
      
      // Check if focus moved outside the container
      const newFocusTarget = event.relatedTarget as HTMLElement;
      if (!newFocusTarget || !containerRef.current.contains(newFocusTarget)) {
        onEscapeFocus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    containerRef.current?.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      containerRef.current?.removeEventListener('focusout', handleFocusOut);
    };
  }, [onEscape, onEscapeFocus]);

  // Auto focus first element
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      const firstFocusable = containerRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        // Small delay to ensure the element is rendered
        setTimeout(() => firstFocusable.focus(), 50);
      }
    }
  }, [autoFocus]);

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (trapFocus) focusTrapRef.current = node;
        if (rovingTabIndex) rovingRef.current = node;
      }}
      className={className}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Modal focus manager with common modal behaviors
 */
export function ModalFocusManager({
  children,
  isOpen,
  onClose,
  className,
  ...props
}: {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save and restore focus
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    return () => {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <FocusManager
      trapFocus
      autoFocus
      onEscape={onClose}
      role="dialog"
      aria-modal="true"
      className={className}
      {...props}
    >
      {children}
    </FocusManager>
  );
}

/**
 * Menu focus manager for dropdown menus
 */
export function MenuFocusManager({
  children,
  isOpen,
  onClose,
  className,
  triggerRef,
  ...props
}: {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  triggerRef?: React.RefObject<HTMLElement>;
} & React.HTMLAttributes<HTMLDivElement>) {
  useEffect(() => {
    if (!isOpen && triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return (
    <FocusManager
      rovingTabIndex
      orientation="vertical"
      autoFocus
      onEscape={onClose}
      onEscapeFocus={onClose}
      role="menu"
      className={className}
      {...props}
    >
      {children}
    </FocusManager>
  );
}

export default FocusManager;