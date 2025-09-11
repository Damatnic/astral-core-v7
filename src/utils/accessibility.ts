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
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
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
