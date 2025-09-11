
import { useEffect, useRef, useCallback } from 'react';

interface FocusTrapOptions {
  initialFocus?: HTMLElement | null;
  finalFocus?: HTMLElement | null;
  container?: HTMLElement | null;
}

export function useFocusTrap(isActive: boolean, options: FocusTrapOptions = {}) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(el => {
        const element = el as HTMLElement;
        return !element.hidden && 
               element.offsetWidth > 0 && 
               element.offsetHeight > 0 &&
               window.getComputedStyle(element).visibility !== 'hidden';
      }) as HTMLElement[];
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive || event.key !== 'Tab') return;

    const container = options.container || containerRef.current;
    if (!container) return;

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab (backwards)
      if (activeElement === firstElement && lastElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab (forwards)
      if (activeElement === lastElement && firstElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [isActive, options.container, getFocusableElements]);

  useEffect(() => {
    if (isActive) {
      // Store current focus
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Set initial focus
      const container = options.container || containerRef.current;
      if (container) {
        const initialFocus = options.initialFocus || getFocusableElements(container)[0];
        if (initialFocus) {
          setTimeout(() => initialFocus.focus(), 0);
        }
      }

      // Add event listener
      document.addEventListener('keydown', handleKeyDown);
      
      // Announce to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'assertive');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = 'Modal dialog opened. Use Tab to navigate, Escape to close.';
      document.body.appendChild(announcement);
      
      setTimeout(() => document.body.removeChild(announcement), 1000);
    } else {
      // Remove event listener
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus
      if (previousFocusRef.current) {
        const finalFocus = options.finalFocus || previousFocusRef.current;
        setTimeout(() => finalFocus.focus(), 0);
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, handleKeyDown, options.initialFocus, options.finalFocus, getFocusableElements]);

  return containerRef;
}

export function useAnnouncementRegion() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Clean up after screen readers have processed it
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1500);
  }, []);

  return { announce };
}

export default { useFocusTrap, useAnnouncementRegion };