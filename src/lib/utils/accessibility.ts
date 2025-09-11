/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 */

/**
 * Calculate color contrast ratio between two colors
 * @param color1 - First color in hex format
 * @param color2 - Second color in hex format
 * @returns Contrast ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA standards
 * @param ratio - Contrast ratio
 * @param largeText - Whether the text is large (18pt+ or 14pt+ bold)
 * @returns Whether the contrast meets AA standards
 */
export function meetsWCAGAA(ratio: number, largeText = false): boolean {
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if contrast meets WCAG AAA standards
 * @param ratio - Contrast ratio
 * @param largeText - Whether the text is large (18pt+ or 14pt+ bold)
 * @returns Whether the contrast meets AAA standards
 */
export function meetsWCAGAAA(ratio: number, largeText = false): boolean {
  return largeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Convert hex color to RGB
 * @param hex - Hex color string
 * @returns RGB values or null if invalid
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : null;
}

/**
 * Get relative luminance of RGB color
 * @param rgb - RGB color values
 * @returns Relative luminance
 */
function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const { r, g, b } = rgb;
  
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;
  
  const rL = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gL = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bL = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

/**
 * Get ARIA attributes for form controls
 * @param props - Input properties
 * @returns ARIA attributes
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
 * Generate unique ID for accessibility
 * @param prefix - Prefix for the ID
 * @returns Unique ID
 */
export function generateId(prefix = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if user prefers reduced motion
 * @returns Whether reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get keyboard navigation attributes
 * @param role - Element role
 * @param selected - Whether element is selected
 * @returns Keyboard navigation attributes
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
 * @param text - Text to format
 * @param type - Type of formatting
 * @returns Formatted text
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
      return text.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

/**
 * Trap focus within an element
 * @param element - Element to trap focus in
 * @returns Cleanup function
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };
  
  element.addEventListener('keydown', handleKeyDown);
  firstFocusable?.focus();
  
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Announce message to screen readers
 * @param message - Message to announce
 * @param priority - Priority level (polite or assertive)
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
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

/**
 * Validate sensitive input for accessibility and security
 * @param value - Input value to validate
 * @returns Validation result
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
    /on\w+\s*=/gi,     // Event handlers
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

// Additional missing exports required by components

/**
 * Color contrast constants
 */
export const COLOR_CONTRAST = {
  NORMAL_TEXT: 4.5,
  LARGE_TEXT: 3.0,
  NON_TEXT: 3.0,
  AAA_NORMAL_TEXT: 7.0,
  AAA_LARGE_TEXT: 4.5
} as const;

/**
 * Check if contrast meets specific requirements
 * @param foreground - Foreground color in hex
 * @param background - Background color in hex
 * @param level - WCAG level or text type
 * @param isLargeText - Whether text is large
 * @returns Whether contrast requirement is met
 */
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

/**
 * Get accessible color suggestions for better contrast
 * @param foreground - Current foreground color
 * @param background - Background color
 * @param level - WCAG level requirement
 * @returns Array of suggested colors
 */
export function getAccessibleColorSuggestions(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): string[] {
  const suggestions: string[] = [];
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

/**
 * Enhanced sensitive input validation with suggestions
 * @param value - Input value to validate
 * @param type - Type of validation context
 * @returns Enhanced validation result with suggestions
 */
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

/**
 * Announce message to screen readers (alias for announceToScreenReader)
 * @param message - Message to announce
 * @param priority - Priority level
 */
export const announce = announceToScreenReader;

/**
 * Get all focusable elements within a container
 * @param container - Container element
 * @returns Array of focusable elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableElements = container.querySelectorAll(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;
  
  return Array.from(focusableElements);
}

/**
 * Generate accessibility ID (alias for generateId)
 * @param prefix - Prefix for the ID
 * @returns Unique accessibility ID
 */
export const generateA11yId = generateId;

/**
 * Keyboard key constants
 */
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

/**
 * Mental health accessibility constants
 */
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

// Helper functions

/**
 * Convert RGB to hex
 * @param rgb - RGB values
 * @returns Hex color string
 */
function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}
