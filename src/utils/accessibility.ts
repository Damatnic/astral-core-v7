/**
 * Accessibility Utilities
 * Comprehensive utilities for WCAG 2.1 AA compliance and enhanced accessibility
 */

import { useRef, useEffect, useCallback } from 'react';

// WCAG 2.1 AA color contrast ratios
export const COLOR_CONTRAST = {
  NORMAL_TEXT: 4.5,
  LARGE_TEXT: 3,
  GRAPHICAL_OBJECTS: 3,
  UI_COMPONENTS: 3
} as const;

/**
 * Calculate relative luminance of a color
 * Used for contrast ratio calculations per WCAG guidelines
 */
export function getRelativeLuminance(color: string): number {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  // Apply gamma correction
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  
  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * Returns ratio between 1 and 21 (higher is better contrast)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG contrast requirements
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  
  return isLargeText ? ratio >= COLOR_CONTRAST.LARGE_TEXT : ratio >= COLOR_CONTRAST.NORMAL_TEXT;
}

/**
 * Generate accessible color suggestions
 */
export function getAccessibleColorSuggestions(
  baseColor: string,
  targetBackground: string,
  level: 'AA' | 'AAA' = 'AA'
): string[] {
  const suggestions: string[] = [];
  const targetRatio = level === 'AAA' ? 7 : 4.5;
  
  // This is a simplified implementation - in production you'd want more sophisticated color generation
  const variations = ['#000000', '#333333', '#666666', '#ffffff', '#f5f5f5'];
  
  variations.forEach(color => {
    if (meetsContrastRequirement(color, targetBackground, level)) {
      suggestions.push(color);
    }
  });
  
  return suggestions;
}

/**
 * Generate unique ID for accessibility purposes
 */
export function generateA11yId(prefix = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute('disabled')) return false;
  if (element.hasAttribute('aria-hidden') && element.getAttribute('aria-hidden') === 'true') return false;
  
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ];
  
  return focusableSelectors.some(selector => element.matches(selector));
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]:not([tabindex="-1"])'
  ].join(',');
  
  return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
}

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcer = document.getElementById('announcements') || createAnnouncerElement();
  
  // Clear previous message and set new one
  announcer.textContent = '';
  announcer.setAttribute('aria-live', priority);
  
  // Use setTimeout to ensure screen readers pick up the change
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
  
  // Clear the message after it's been announced
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

/**
 * Create announcer element if it doesn't exist
 */
function createAnnouncerElement(): HTMLElement {
  const announcer = document.createElement('div');
  announcer.id = 'announcements';
  announcer.className = 'sr-only';
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(announcer);
  return announcer;
}

/**
 * Keyboard navigation constants
 */
export const KEYBOARD_KEYS = {
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  SPACE: ' ',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
} as const;

/**
 * Mental health specific accessibility considerations
 */
export const MENTAL_HEALTH_A11Y = {
  // Reduced motion preferences for anxiety/seizure disorders
  PREFERS_REDUCED_MOTION: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  
  // High contrast for visual impairments
  PREFERS_HIGH_CONTRAST: window.matchMedia('(prefers-contrast: high)').matches,
  
  // Recommended focus timeout for mental health apps (longer than typical)
  FOCUS_TIMEOUT: 30000, // 30 seconds
  
  // Calming color palette recommendations
  CALMING_COLORS: {
    primary: '#4A90E2',
    secondary: '#7ED321',
    background: '#F8F9FA',
    text: '#2C3E50'
  },
  
  // Crisis-safe colors (avoiding triggering reds)
  CRISIS_SAFE_COLORS: {
    warning: '#F39C12',
    info: '#3498DB',
    success: '#27AE60'
  }
} as const;

/**
 * Validation for mental health form inputs
 */
export function validateSensitiveInput(value: string, type: 'mood' | 'crisis' | 'general'): {
  isValid: boolean;
  suggestions: string[];
} {
  const suggestions: string[] = [];
  
  // Check for crisis indicators
  const crisisKeywords = ['hurt', 'harm', 'end it all', 'suicide', 'kill'];
  const hasCrisisIndicators = crisisKeywords.some(keyword => 
    value.toLowerCase().includes(keyword)
  );
  
  if (hasCrisisIndicators && type !== 'crisis') {
    suggestions.push('This content may indicate you need immediate support. Consider contacting a crisis helpline.');
  }
  
  // Encourage positive framing without censoring
  if (type === 'mood' && value.length > 10) {
    suggestions.push('Consider adding what helped or what you\'re grateful for today.');
  }
  
  return {
    isValid: !hasCrisisIndicators || type === 'crisis',
    suggestions
  };
}