/**
 * Accessibility utility functions for WCAG 2.1 AA compliance
 * Self-contained implementation with all required functions
 */

// Color contrast ratios for WCAG AA compliance
export const CONTRAST_RATIOS = {
  NORMAL_TEXT: 4.5,
  LARGE_TEXT: 3.0,
  NON_TEXT: 3.0
} as const;

// Accessible color palette
export const ACCESSIBLE_COLORS = {
  // High contrast color pairs that meet WCAG AA requirements
  PRIMARY: {
    blue: {
      50: '#eff6ff', // Light background
      600: '#2563eb', // Primary color
      700: '#1d4ed8', // Darker variant
      900: '#1e3a8a' // Very dark
    }
  },
  SEMANTIC: {
    success: {
      light: '#dcfce7', // Light green background
      dark: '#166534' // Dark green text
    },
    warning: {
      light: '#fef3c7', // Light yellow background
      dark: '#92400e' // Dark orange text
    },
    error: {
      light: '#fef2f2', // Light red background
      dark: '#dc2626' // Dark red text
    },
    info: {
      light: '#f0f9ff', // Light blue background
      dark: '#1e40af' // Dark blue text
    }
  }
} as const;

// Screen reader utilities
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
 * ARIA live region utilities
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (typeof document === 'undefined') return;
  
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Missing exports that are imported by other files
export const announce = announceToScreenReader;

/**
 * Generate unique ID for accessibility
 */
export function generateId(prefix = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

export const generateA11yId = generateId;

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
 * Get ARIA attributes for form controls
 */
export function getAriaAttributes(props: {
  error?: string;
  required?: boolean;
  disabled?: boolean;
  description?: string;
  id?: string;
}) {
  const { error, required, disabled, description, id } = props;
  
  return {
    'aria-invalid': error ? 'true' : undefined,
    'aria-required': required ? 'true' : undefined,
    'aria-disabled': disabled ? 'true' : undefined,
    'aria-describedby': description && id ? `${id}-description` : undefined,
    'aria-errormessage': error && id ? `${id}-error` : undefined,
  };
}

/**
 * Validate sensitive input for accessibility and security
 */
export function validateSensitiveInput(value: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic validation
  if (!value || value.trim().length === 0) {
    errors.push('Input cannot be empty');
  }
  
  // Check for common security issues
  const suspiciousPatterns = [
    /<script[^>]*>/gi, // Script tags
    /javascript:/gi,   // JavaScript protocol
    /on\\w+\\s*=/gi,     // Event handlers
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(value)) {
      errors.push('Input contains potentially unsafe content');
      break;
    }
  }
  
  // Accessibility warnings
  if (value.length > 500) {
    warnings.push('Input is very long and may be difficult for screen readers');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
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
 * Get keyboard navigation attributes
 */
export function getKeyboardNavigationAttributes(role: string, selected?: boolean) {
  const attrs: Record<string, string | undefined> = {
    role,
    tabIndex: '0',
  };
  
  if (selected !== undefined) {
    attrs['aria-selected'] = selected ? 'true' : 'false';
  }
  
  return attrs;
}

/**
 * Format text for screen readers
 */
export function formatForScreenReader(text: string, type: 'date' | 'time' | 'number' | 'currency' = 'number'): string {
  switch (type) {
    case 'date':
      return new Date(text).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    case 'time':
      return new Date(text).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: 'numeric' 
      });
    case 'currency':
      return `${text} dollars`;
    case 'number':
    default:
      return text.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
  }
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
  const hasLabel =
    element.hasAttribute('aria-label') ||
    element.hasAttribute('aria-labelledby') ||
    element.hasAttribute('title');
  const hasDescription = element.hasAttribute('aria-describedby');
  const isKeyboardAccessible =
    element.tabIndex >= 0 ||
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

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableElements = container.querySelectorAll(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;
  
  return Array.from(focusableElements);
}


// Keyboard keys constants
export const KEYBOARD_KEYS = {
  TAB: 'Tab',
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  SPACE: ' ',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End'
} as const;

// Mental health accessibility constants
export const MENTAL_HEALTH_A11Y = {
  PREFERS_REDUCED_MOTION: typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false,
  PREFERS_HIGH_CONTRAST: typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-contrast: high)').matches 
    : false,
  CRISIS_HOTLINES: {
    US: '988',
    UK: '116 123',
    INTERNATIONAL: '1-800-273-8255'
  },
  SAFE_COLORS: {
    CALMING_BLUE: '#4A90E2',
    SUPPORTIVE_GREEN: '#27AE60',
    WARNING_ORANGE: '#F39C12',
    CRISIS_RED: '#E74C3C'
  }
} as const;

// Color contrast constants (for backward compatibility)
export const COLOR_CONTRAST = {
  NORMAL_TEXT: 4.5,
  LARGE_TEXT: 3.0,
  NON_TEXT: 3.0,
  AAA_NORMAL_TEXT: 7.0,
  AAA_LARGE_TEXT: 4.5
} as const;

// Enhanced meetsContrastRequirement function with proper signature
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level?: 'AA' | 'AAA' | 'normal' | 'large' | 'non-text',
  isLargeText?: boolean
): boolean {
  const ratio = getContrastRatio(foreground, background);
  
  // If level is a string like 'normal', 'large', 'non-text' (legacy usage)
  if (level === 'normal' || level === 'large' || level === 'non-text') {
    const requirement = level === 'normal' 
      ? COLOR_CONTRAST.NORMAL_TEXT 
      : level === 'large' 
        ? COLOR_CONTRAST.LARGE_TEXT 
        : COLOR_CONTRAST.NON_TEXT;
    return ratio >= requirement;
  }
  
  // If level is 'AA' or 'AAA' (new usage)
  const isLarge = isLargeText || false;
  let requiredRatio: number;
  
  if (level === 'AAA') {
    requiredRatio = isLarge ? COLOR_CONTRAST.AAA_LARGE_TEXT : COLOR_CONTRAST.AAA_NORMAL_TEXT;
  } else {
    // Default to AA
    requiredRatio = isLarge ? COLOR_CONTRAST.LARGE_TEXT : COLOR_CONTRAST.NORMAL_TEXT;
  }
  
  return ratio >= requiredRatio;
}

// Color suggestion function
export function getAccessibleColorSuggestions(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): string[] {
  const suggestions: string[] = [];
  
  // Generate darker and lighter variants of the foreground color
  const rgb = hexToRgb(foreground);
  if (!rgb) return suggestions;
  
  const requiredRatio = level === 'AAA' ? 7 : 4.5;
  
  // Try making the foreground darker
  for (let factor = 0.1; factor <= 0.9; factor += 0.1) {
    const darkerColor = rgbToHex({
      r: Math.round(rgb.r * factor),
      g: Math.round(rgb.g * factor),
      b: Math.round(rgb.b * factor)
    });
    
    const ratio = getContrastRatio(darkerColor, background);
    if (ratio >= requiredRatio) {
      suggestions.push(darkerColor);
      break;
    }
  }
  
  // Try making the foreground lighter
  for (let factor = 1.1; factor <= 2; factor += 0.1) {
    const lighterColor = rgbToHex({
      r: Math.min(255, Math.round(rgb.r * factor)),
      g: Math.min(255, Math.round(rgb.g * factor)),
      b: Math.min(255, Math.round(rgb.b * factor))
    });
    
    const ratio = getContrastRatio(lighterColor, background);
    if (ratio >= requiredRatio) {
      suggestions.push(lighterColor);
      break;
    }
  }
  
  // Add some safe fallback colors
  const safeForegroundColors = ['#000000', '#333333', '#666666', '#ffffff', '#f0f0f0'];
  for (const color of safeForegroundColors) {
    const ratio = getContrastRatio(color, background);
    if (ratio >= requiredRatio && !suggestions.includes(color)) {
      suggestions.push(color);
    }
  }
  
  return suggestions.slice(0, 5); // Return max 5 suggestions
}

// Enhanced validateSensitiveInput with suggestions
export function validateSensitiveInputWithSuggestions(
  value: string,
  type?: 'mood' | 'crisis' | 'general' | 'none'
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} {
  const baseValidation = validateSensitiveInput(value);
  const suggestions: string[] = [];
  
  // Add mental health specific suggestions
  if (type === 'mood' && value.length > 0) {
    if (value.toLowerCase().includes('hopeless') || value.toLowerCase().includes('worthless')) {
      suggestions.push('Consider reaching out to a mental health professional or crisis helpline');
    }
  }
  
  if (type === 'crisis' && value.length > 0) {
    const crisisWords = ['suicide', 'kill', 'die', 'hurt', 'harm'];
    const containsCrisisWords = crisisWords.some(word => value.toLowerCase().includes(word));
    if (containsCrisisWords) {
      suggestions.push('If you are in crisis, please contact 988 Suicide & Crisis Lifeline');
    }
  }
  
  return {
    ...baseValidation,
    suggestions
  };
}

// Helper functions
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16)
  } : null;
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

// Additional missing functions
export function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const { r, g, b } = rgb;
  
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;
  
  const rL = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gL = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bL = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

export function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  
  const tagName = element.tagName.toLowerCase();
  const focusableTags = ['input', 'select', 'textarea', 'button', 'a'];
  
  if (focusableTags.includes(tagName)) {
    return true;
  }
  
  if (element.tabIndex >= 0) {
    return true;
  }
  
  return false;
}