/**
 * Accessibility Hooks
 * Custom React hooks for enhanced accessibility features
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { 
  announce, 
  getFocusableElements, 
  generateA11yId, 
  KEYBOARD_KEYS,
  MENTAL_HEALTH_A11Y 
} from '@/utils/accessibility';

/**
 * Hook for managing focus trap within a component
 * Essential for modals, dropdowns, and other overlay components
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);
  const firstFocusableElementRef = useRef<HTMLElement | null>(null);
  const lastFocusableElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = getFocusableElements(container);

    if (focusableElements.length === 0) return;

    firstFocusableElementRef.current = focusableElements[0];
    lastFocusableElementRef.current = focusableElements[focusableElements.length - 1];

    // Focus the first element when trap becomes active
    firstFocusableElementRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== KEYBOARD_KEYS.TAB) return;

      // If shift+tab on first element, focus last element
      if (event.shiftKey && document.activeElement === firstFocusableElementRef.current) {
        event.preventDefault();
        lastFocusableElementRef.current?.focus();
      }
      // If tab on last element, focus first element
      else if (!event.shiftKey && document.activeElement === lastFocusableElementRef.current) {
        event.preventDefault();
        firstFocusableElementRef.current?.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for managing roving tabindex (for lists, grids, etc.)
 */
export function useRovingTabIndex(orientation: 'horizontal' | 'vertical' | 'both' = 'vertical') {
  const containerRef = useRef<HTMLElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!containerRef.current) return;

    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length === 0) return;

    let newIndex = currentIndex;

    switch (event.key) {
      case KEYBOARD_KEYS.ARROW_DOWN:
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          newIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
        }
        break;
      case KEYBOARD_KEYS.ARROW_UP:
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
        }
        break;
      case KEYBOARD_KEYS.ARROW_RIGHT:
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
        }
        break;
      case KEYBOARD_KEYS.ARROW_LEFT:
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
        }
        break;
      case KEYBOARD_KEYS.HOME:
        event.preventDefault();
        newIndex = 0;
        break;
      case KEYBOARD_KEYS.END:
        event.preventDefault();
        newIndex = focusableElements.length - 1;
        break;
    }

    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      focusableElements[newIndex]?.focus();
    }
  }, [currentIndex, orientation]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { containerRef, currentIndex, setCurrentIndex };
}

/**
 * Hook for managing ARIA live region announcements
 */
export function useAnnouncements() {
  const announceMessage = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    announce(message, priority);
  }, []);

  const announceError = useCallback((error: string) => {
    announce(`Error: ${error}`, 'assertive');
  }, []);

  const announceSuccess = useCallback((message: string) => {
    announce(`Success: ${message}`, 'polite');
  }, []);

  const announceNavigation = useCallback((destination: string) => {
    announce(`Navigated to ${destination}`, 'polite');
  }, []);

  return {
    announceMessage,
    announceError,
    announceSuccess,
    announceNavigation
  };
}

/**
 * Hook for generating consistent accessible IDs
 */
export function useAccessibleId(prefix?: string) {
  const [id] = useState(() => generateA11yId(prefix));
  return id;
}

/**
 * Hook for managing keyboard shortcuts with accessibility considerations
 */
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in form fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const modifierKey = event.ctrlKey || event.metaKey;

      // Check for shortcuts
      Object.entries(shortcuts).forEach(([shortcut, callback]) => {
        const [modifiers, targetKey] = shortcut.toLowerCase().split('+').reverse();
        
        if (
          targetKey === key &&
          ((modifiers.includes('ctrl') || modifiers.includes('cmd')) === modifierKey) &&
          (modifiers.includes('shift') === event.shiftKey) &&
          (modifiers.includes('alt') === event.altKey)
        ) {
          event.preventDefault();
          callback();
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Hook for detecting user preferences related to accessibility
 */
export function useAccessibilityPreferences() {
  const [preferences, setPreferences] = useState(() => ({
    prefersReducedMotion: MENTAL_HEALTH_A11Y.PREFERS_REDUCED_MOTION,
    prefersHighContrast: MENTAL_HEALTH_A11Y.PREFERS_HIGH_CONTRAST,
    prefersReducedData: window.matchMedia('(prefers-reduced-data: reduce)').matches,
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }));

  useEffect(() => {
    const mediaQueries = [
      { query: '(prefers-reduced-motion: reduce)', key: 'prefersReducedMotion' },
      { query: '(prefers-contrast: high)', key: 'prefersHighContrast' },
      { query: '(prefers-reduced-data: reduce)', key: 'prefersReducedData' },
      { query: '(prefers-color-scheme: dark)', key: 'colorScheme' }
    ];

    const handlers = mediaQueries.map(({ query, key }) => {
      const mq = window.matchMedia(query);
      const handler = (e: MediaQueryListEvent) => {
        setPreferences(prev => ({
          ...prev,
          [key]: key === 'colorScheme' ? (e.matches ? 'dark' : 'light') : e.matches
        }));
      };
      
      mq.addEventListener('change', handler);
      return { mq, handler };
    });

    return () => {
      handlers.forEach(({ mq, handler }) => {
        mq.removeEventListener('change', handler);
      });
    };
  }, []);

  return preferences;
}

/**
 * Hook for managing focus restoration (useful for modals)
 */
export function useFocusRestore() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  return { saveFocus, restoreFocus };
}

/**
 * Hook for mental health specific accessibility features
 */
export function useMentalHealthAccessibility() {
  const { announceMessage } = useAnnouncements();
  const [crisisMode, setCrisisMode] = useState(false);

  const announceCrisis = useCallback(() => {
    announceMessage(
      'Crisis support is available. Press Escape to access emergency resources.',
      'assertive'
    );
    setCrisisMode(true);
  }, [announceMessage]);

  const exitCrisisMode = useCallback(() => {
    setCrisisMode(false);
    announceMessage('Returned to normal mode', 'polite');
  }, [announceMessage]);

  // Emergency escape shortcut
  useKeyboardShortcuts({
    'escape': () => {
      if (crisisMode) {
        // In a real app, this would open crisis resources
        announceMessage('Opening crisis support resources', 'assertive');
      }
    }
  });

  const announceProgress = useCallback((step: string, total: string) => {
    announceMessage(`Completed ${step} of ${total}`, 'polite');
  }, [announceMessage]);

  const announceWellnessCheckIn = useCallback((mood: string) => {
    announceMessage(`Mood logged as ${mood}. Remember you're taking positive steps.`, 'polite');
  }, [announceMessage]);

  return {
    crisisMode,
    announceCrisis,
    exitCrisisMode,
    announceProgress,
    announceWellnessCheckIn
  };
}

/**
 * Hook for auto-focusing elements with delay for screen readers
 */
export function useAutoFocus(shouldFocus: boolean = true, delay: number = 100) {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (shouldFocus && elementRef.current) {
      const timer = setTimeout(() => {
        elementRef.current?.focus();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [shouldFocus, delay]);

  return elementRef;
}