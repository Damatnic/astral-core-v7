/**
 * Custom hook for managing focus in accessible applications
 * Provides utilities for focus trapping, restoration, and announcement
 */

import { useEffect, useRef, useCallback } from 'react';

interface UseFocusManagementOptions {
  trapFocus?: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
}

export function useFocusManagement(options: UseFocusManagementOptions = {}) {
  const { trapFocus = false, restoreFocus = true, autoFocus = false } = options;
  
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within a container
  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(',');

    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }, []);

  // Update focusable element references
  const updateFocusableElements = useCallback(() => {
    if (!containerRef.current) return;
    
    const focusableElements = getFocusableElements(containerRef.current);
    firstFocusableRef.current = focusableElements[0] || null;
    lastFocusableRef.current = focusableElements[focusableElements.length - 1] || null;
  }, [getFocusableElements]);

  // Handle tab key for focus trapping
  const handleTabKey = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !trapFocus) return;

    const { shiftKey } = event;
    const { activeElement } = document;

    if (shiftKey) {
      // Shift + Tab
      if (activeElement === firstFocusableRef.current && lastFocusableRef.current) {
        event.preventDefault();
        lastFocusableRef.current.focus();
      }
    } else {
      // Tab
      if (activeElement === lastFocusableRef.current && firstFocusableRef.current) {
        event.preventDefault();
        firstFocusableRef.current.focus();
      }
    }
  }, [trapFocus]);

  // Handle escape key
  const handleEscapeKey = useCallback((event: KeyboardEvent, onEscape?: () => void) => {
    if (event.key === 'Escape') {
      onEscape?.();
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [restoreFocus]);

  // Focus the first focusable element
  const focusFirst = useCallback(() => {
    updateFocusableElements();
    firstFocusableRef.current?.focus();
  }, [updateFocusableElements]);

  // Focus the last focusable element
  const focusLast = useCallback(() => {
    updateFocusableElements();
    lastFocusableRef.current?.focus();
  }, [updateFocusableElements]);

  // Set focus to a specific element by selector or element
  const focusElement = useCallback((target: string | HTMLElement) => {
    if (!containerRef.current) return false;

    const element = typeof target === 'string' 
      ? containerRef.current.querySelector(target) as HTMLElement
      : target;

    if (element && typeof element.focus === 'function') {
      element.focus();
      return true;
    }
    return false;
  }, []);

  // Setup focus management
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Store the currently focused element
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Update focusable elements
    updateFocusableElements();

    // Auto focus the first element if requested
    if (autoFocus) {
      focusFirst();
    }

    // Add event listeners for focus trapping
    if (trapFocus) {
      container.addEventListener('keydown', handleTabKey);
    }

    // Cleanup
    return () => {
      if (trapFocus) {
        container.removeEventListener('keydown', handleTabKey);
      }

      // Restore focus when component unmounts
      if (restoreFocus && previousFocusRef.current) {
        // Use setTimeout to avoid conflicts with other focus changes
        setTimeout(() => {
          previousFocusRef.current?.focus();
        }, 0);
      }
    };
  }, [trapFocus, restoreFocus, autoFocus, handleTabKey, updateFocusableElements, focusFirst]);

  // Update focusable elements when container content changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use MutationObserver to watch for DOM changes
    const observer = new MutationObserver(() => {
      updateFocusableElements();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex', 'aria-hidden']
    });

    return () => {
      observer.disconnect();
    };
  }, [updateFocusableElements]);

  return {
    containerRef,
    focusFirst,
    focusLast,
    focusElement,
    handleEscapeKey,
    getFocusableElements: () => containerRef.current ? getFocusableElements(containerRef.current) : []
  };
}

/**
 * Hook for managing focus announcements to screen readers
 */
export function useFocusAnnouncement() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Find existing announcement container or create one
    let announcer = document.getElementById('announcements');
    
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'announcements';
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
    }

    // Clear previous announcement
    announcer.textContent = '';
    
    // Add new announcement after a brief delay to ensure screen readers pick it up
    setTimeout(() => {
      announcer!.textContent = message;
    }, 100);

    // Clear announcement after it's been read
    setTimeout(() => {
      announcer!.textContent = '';
    }, 5000);
  }, []);

  const announceNavigation = useCallback((pageName: string) => {
    announce(`Navigated to ${pageName}`, 'polite');
  }, [announce]);

  const announceError = useCallback((error: string) => {
    announce(`Error: ${error}`, 'assertive');
  }, [announce]);

  const announceSuccess = useCallback((message: string) => {
    announce(`Success: ${message}`, 'polite');
  }, [announce]);

  return {
    announce,
    announceNavigation,
    announceError,
    announceSuccess
  };
}

/**
 * Hook for keyboard navigation management
 */
export function useKeyboardNavigation() {
  const handleArrowKeys = useCallback((
    event: KeyboardEvent, 
    items: HTMLElement[], 
    currentIndex: number,
    onIndexChange: (newIndex: number) => void,
    loop = true
  ) => {
    const { key } = event;
    
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      return;
    }

    event.preventDefault();
    
    let newIndex = currentIndex;
    
    switch (key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        newIndex = currentIndex - 1;
        if (newIndex < 0) {
          newIndex = loop ? items.length - 1 : 0;
        }
        break;
        
      case 'ArrowDown':
      case 'ArrowRight':
        newIndex = currentIndex + 1;
        if (newIndex >= items.length) {
          newIndex = loop ? 0 : items.length - 1;
        }
        break;
    }
    
    if (newIndex !== currentIndex && items[newIndex]) {
      onIndexChange(newIndex);
      items[newIndex].focus();
    }
  }, []);

  const handleEnterSpace = useCallback((event: KeyboardEvent, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  }, []);

  return {
    handleArrowKeys,
    handleEnterSpace
  };
}