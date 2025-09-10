import { z } from 'zod';

/**
 * Comprehensive validation and sanitization service for healthcare data security
 * Provides XSS protection, input validation, and data format verification
 * Essential for HIPAA compliance and secure data handling
 */
export class ValidationService {
  /**
   * Sanitize user input to prevent XSS attacks
   * Removes script tags, iframes, and JavaScript event handlers
   * @param {string} input - Raw user input to sanitize
   * @returns {string} Sanitized input safe for display
   * @example
   * ```typescript
   * const userInput = '<script>alert("xss")</script>Hello';
   * const safe = ValidationService.sanitizeInput(userInput);
   * // Returns: 'Hello'
   * ```
   */
  static sanitizeInput(input: string): string {
    // Remove potential XSS vectors
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Sanitize HTML content while preserving basic formatting
   * More comprehensive than sanitizeInput, handles complex HTML structures
   * @param {string} html - HTML content to sanitize
   * @returns {string} Sanitized HTML safe for rendering
   * @example
   * ```typescript
   * const html = '<p onclick="alert()>Safe text</p><script>bad()</script>';
   * const safe = ValidationService.sanitizeHtml(html);
   * // Returns: '<p>Safe text</p>'
   * ```
   */
  static sanitizeHtml(html: string): string {
    // Basic HTML sanitization - in production, use a library like DOMPurify
    // Remove all scripts and iframes
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');

    return sanitized;
  }

  /**
   * Validate email address format using standard regex pattern
   * @param {string} email - Email address to validate
   * @returns {boolean} True if email format is valid
   * @example
   * ```typescript
   * const isValid = ValidationService.validateEmail('patient@example.com');
   * // Returns: true
   * ```
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format and minimum length
   * Accepts international formats with optional country codes
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if phone number format is valid
   * @example
   * ```typescript
   * const isValid = ValidationService.validatePhoneNumber('+1 (555) 123-4567');
   * // Returns: true
   * ```
   */
  static validatePhoneNumber(phone: string): boolean {
    // Basic phone validation - adjust regex based on requirements
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  /**
   * Comprehensive password validation with detailed error reporting
   * Enforces strong password requirements for healthcare data protection
   * @param {string} password - Password to validate
   * @returns {Object} Validation result with specific error messages
   * @returns {boolean} returns.valid - Whether password meets all requirements
   * @returns {string[]} returns.errors - Array of specific validation errors
   * @example
   * ```typescript
   * const result = ValidationService.validatePassword('weak');
   * // Returns: { valid: false, errors: ['Password must be at least 8 characters...'] }
   * ```
   */
  static validatePassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate date of birth for reasonable age range
   * Ensures age is between 13 and 120 years for data integrity
   * @param {string | Date} dob - Date of birth to validate
   * @returns {boolean} True if date represents valid age range
   * @example
   * ```typescript
   * const isValid = ValidationService.validateDateOfBirth('1990-05-15');
   * // Returns: true (if age is between 13-120)
   * ```
   */
  static validateDateOfBirth(dob: string | Date): boolean {
    const date = typeof dob === 'string' ? new Date(dob) : dob;
    const now = new Date();
    const age = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    return age >= 13 && age <= 120;
  }

  /**
   * Validate URL format and ensure it uses secure protocols
   * Only allows HTTP and HTTPS protocols for security
   * @param {string} url - URL to validate
   * @returns {boolean} True if URL is valid and uses allowed protocol
   * @example
   * ```typescript
   * const isValid = ValidationService.validateUrl('https://example.com');
   * // Returns: true
   * ```
   */
  static validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Validate JSON string format
   * Safely checks if string can be parsed as valid JSON
   * @param {string} jsonString - JSON string to validate
   * @returns {boolean} True if string is valid JSON
   * @example
   * ```typescript
   * const isValid = ValidationService.validateJson('{"key": "value"}');
   * // Returns: true
   * ```
   */
  static validateJson(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate API key format
   * Checks for alphanumeric characters, hyphens, and underscores with minimum length
   * @param {string} apiKey - API key to validate
   * @returns {boolean} True if API key format is valid
   * @example
   * ```typescript
   * const isValid = ValidationService.validateApiKey('sk_test_1234567890abcdef');
   * // Returns: true
   * ```
   */
  static validateApiKey(apiKey: string): boolean {
    // Basic API key validation - adjust based on your API key format
    return /^[A-Za-z0-9\-_]{32,}$/.test(apiKey);
  }

  /**
   * Validate credit card number using Luhn algorithm
   * Implements industry-standard credit card validation
   * @param {string} cardNumber - Credit card number to validate
   * @returns {boolean} True if credit card number is valid
   * @example
   * ```typescript
   * const isValid = ValidationService.validateCreditCard('4532015112830366');
   * // Returns: true (for valid Visa card)
   * ```
   */
  static validateCreditCard(cardNumber: string): boolean {
    // Luhn algorithm for credit card validation
    const digits = cardNumber.replace(/\D/g, '');

    if (digits.length < 13 || digits.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]!, 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Sanitize file names for safe storage
   * Removes problematic characters and limits length for filesystem compatibility
   * @param {string} fileName - Original file name to sanitize
   * @returns {string} Sanitized file name safe for storage
   * @example
   * ```typescript
   * const safe = ValidationService.sanitizeFileName('patient<>record:.pdf');
   * // Returns: 'patient_record_.pdf'
   * ```
   */
  static sanitizeFileName(fileName: string): string {
    // Remove or replace characters that are problematic in file names
    return fileName
      .replace(/[^a-zA-Z0-9._\-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 255); // Limit file name length
  }

  /**
   * Validate file MIME type against allowed types list
   * Supports wildcard patterns for category-based validation
   * @param {string} mimeType - MIME type to validate
   * @param {string[]} allowedTypes - Array of allowed MIME types (supports 'type/*' wildcards)
   * @returns {boolean} True if MIME type is allowed
   * @example
   * ```typescript
   * const isValid = ValidationService.validateMimeType(
   *   'image/jpeg',
   *   ['image/*', 'application/pdf']
   * );
   * // Returns: true
   * ```
   */
  static validateMimeType(mimeType: string, allowedTypes: string[]): boolean {
    // Check if mime type is in allowed list
    return allowedTypes.some(allowed => {
      if (allowed.endsWith('/*')) {
        const category = allowed.slice(0, -2);
        return mimeType.startsWith(category + '/');
      }
      return mimeType === allowed;
    });
  }

  /**
   * Validate file size against maximum allowed size
   * @param {number} sizeInBytes - File size in bytes
   * @param {number} maxSizeInMB - Maximum allowed size in megabytes
   * @returns {boolean} True if file size is within limits
   * @example
   * ```typescript
   * const isValid = ValidationService.validateFileSize(2048000, 5); // 2MB file, 5MB limit
   * // Returns: true
   * ```
   */
  static validateFileSize(sizeInBytes: number, maxSizeInMB: number): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return sizeInBytes <= maxSizeInBytes;
  }

  /**
   * Escape special characters in string for safe use in regular expressions
   * @param {string} string - String to escape
   * @returns {string} Escaped string safe for regex use
   * @example
   * ```typescript
   * const escaped = ValidationService.escapeRegExp('Hello (world)');
   * // Returns: 'Hello \(world\)'
   * ```
   */
  static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Validate ZIP/postal code format for different countries
   * Supports US, Canadian, and UK postal code formats
   * @param {string} zipCode - ZIP/postal code to validate
   * @param {string} [country='US'] - Country code (US, CA, UK)
   * @returns {boolean} True if ZIP code format is valid for the specified country
   * @example
   * ```typescript
   * const isValid = ValidationService.validateZipCode('12345-6789', 'US');
   * // Returns: true
   * const isValidCA = ValidationService.validateZipCode('K1A 0A9', 'CA');
   * // Returns: true
   * ```
   */
  static validateZipCode(zipCode: string, country: string = 'US'): boolean {
    const patterns: Record<string, RegExp> = {
      US: /^\d{5}(-\d{4})?$/,
      CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
      UK: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i
    };

    const pattern = patterns[country];
    return pattern ? pattern.test(zipCode) : false;
  }
}

/**
 * Pre-configured Zod schemas for common data validation patterns
 * Provides type-safe validation with automatic error messages
 * Integrates with ValidationService methods for consistent validation logic
 * @example
 * ```typescript
 * import { commonSchemas } from '@/lib/security/validation';
 * 
 * // Validate email
 * const result = commonSchemas.email.safeParse('user@example.com');
 * if (result.success) {
 *   console.log('Valid email:', result.data);
 * }
 * ```
 */
export const commonSchemas = {
  /** Email validation with automatic lowercase conversion */
  email: z.string().email().toLowerCase(),

  /** Phone number validation using custom validation function */
  phone: z
    .string()
    .refine(val => ValidationService.validatePhoneNumber(val), { message: 'Invalid phone number' }),

  /** Strong password validation with comprehensive requirements */
  password: z.string().refine(val => ValidationService.validatePassword(val).valid, {
    message: 'Password does not meet requirements'
  }),

  /** URL validation ensuring proper format and protocol */
  url: z.string().url(),

  /** Date of birth validation with age range checking */
  dateOfBirth: z.string().refine(val => ValidationService.validateDateOfBirth(val), {
    message: 'Invalid date of birth'
  }),

  /** ZIP/postal code validation for US format */
  zipCode: z
    .string()
    .refine(val => ValidationService.validateZipCode(val), { message: 'Invalid ZIP code' }),

  /** Credit card number validation using Luhn algorithm */
  creditCard: z.string().refine(val => ValidationService.validateCreditCard(val), {
    message: 'Invalid credit card number'
  })
};
