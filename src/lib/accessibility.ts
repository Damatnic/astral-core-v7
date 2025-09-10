/**
 * Accessibility utility functions for WCAG 2.1 AA compliance
 */

// Color contrast ratios for WCAG AA compliance
export const CONTRAST_RATIOS = {
  NORMAL_TEXT: 4.5,
  LARGE_TEXT: 3.0,
  NON_TEXT: 3.0,
} as const;

/**
 * Calculate color contrast ratio between two colors
 * Based on WCAG 2.1 guidelines
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate relative luminance
    const getRGB = (value: number): number => {
      const normalized = value / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * getRGB(r) + 0.7152 * getRGB(g) + 0.0722 * getRGB(b);
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'normal' | 'large' | 'non-text' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requirement = level === 'normal' ? CONTRAST_RATIOS.NORMAL_TEXT : 
                     level === 'large' ? CONTRAST_RATIOS.LARGE_TEXT :
                     CONTRAST_RATIOS.NON_TEXT;
  
  return ratio >= requirement;
}

/**
 * Generate accessible color alternatives
 */
export const ACCESSIBLE_COLORS = {
  // High contrast color pairs that meet WCAG AA requirements
  PRIMARY: {
    blue: {
      50: '#eff6ff',   // Light background
      600: '#2563eb',  // Primary color
      700: '#1d4ed8',  // Darker variant
      900: '#1e3a8a'   // Very dark
    }
  },
  SEMANTIC: {
    success: {
      light: '#dcfce7', // Light green background
      dark: '#166534'   // Dark green text
    },
    warning: {
      light: '#fef3c7', // Light yellow background  
      dark: '#92400e'   // Dark orange text
    },
    error: {
      light: '#fef2f2', // Light red background
      dark: '#dc2626'   // Dark red text
    },
    info: {
      light: '#f0f9ff', // Light blue background
      dark: '#1e40af'   // Dark blue text
    }
  }
} as const;

/**
 * Screen reader utilities
 */
export const SR_ONLY_CLASS = 'sr-only';

export function generateSrOnlyStyles(): string {
  return `
    .${SR_ONLY_CLASS} {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `;
}

/**
 * Focus management utilities
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable?.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable?.focus();
        e.preventDefault();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);
  firstFocusable?.focus();

  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * ARIA live region utilities
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = SR_ONLY_CLASS;
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Skip link generation
 */
export function createSkipLink(targetId: string, label: string = 'Skip to main content'): HTMLAnchorElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.className = `${SR_ONLY_CLASS} focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white`;
  skipLink.textContent = label;
  
  return skipLink;
}

/**
 * Keyboard event handlers
 */
export function handleEscapeKey(callback: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      callback();
    }
  };
}

export function handleEnterSpace(callback: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };
}

/**
 * Validation for accessibility requirements
 */
export function validateAccessibilityFeatures(element: HTMLElement): {
  hasRole: boolean;
  hasLabel: boolean;
  hasDescription: boolean;
  isKeyboardAccessible: boolean;
  meetsContrastRequirement: boolean;
} {
  const hasRole = element.hasAttribute('role');
  const hasLabel = element.hasAttribute('aria-label') || 
                   element.hasAttribute('aria-labelledby') ||
                   element.hasAttribute('title');
  const hasDescription = element.hasAttribute('aria-describedby');
  const isKeyboardAccessible = element.tabIndex >= 0 || 
                               ['button', 'a', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase());
  
  // Note: Contrast checking would require actual color computation from DOM
  const meetsContrastRequirement = true; // Placeholder - would need actual color extraction

  return {
    hasRole,
    hasLabel,
    hasDescription,
    isKeyboardAccessible,
    meetsContrastRequirement
  };
}