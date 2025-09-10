import { z } from 'zod';

export class ValidationService {
  static sanitizeInput(input: string): string {
    // Remove potential XSS vectors
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

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

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePhoneNumber(phone: string): boolean {
    // Basic phone validation - adjust regex based on requirements
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

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
      errors,
    };
  }

  static validateDateOfBirth(dob: string | Date): boolean {
    const date = typeof dob === 'string' ? new Date(dob) : dob;
    const now = new Date();
    const age = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    return age >= 13 && age <= 120;
  }

  static validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  static validateJson(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  static validateApiKey(apiKey: string): boolean {
    // Basic API key validation - adjust based on your API key format
    return /^[A-Za-z0-9\-_]{32,}$/.test(apiKey);
  }

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

  static sanitizeFileName(fileName: string): string {
    // Remove or replace characters that are problematic in file names
    return fileName
      .replace(/[^a-zA-Z0-9._\-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 255); // Limit file name length
  }

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

  static validateFileSize(sizeInBytes: number, maxSizeInMB: number): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return sizeInBytes <= maxSizeInBytes;
  }

  static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static validateZipCode(zipCode: string, country: string = 'US'): boolean {
    const patterns: Record<string, RegExp> = {
      US: /^\d{5}(-\d{4})?$/,
      CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
      UK: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
    };
    
    const pattern = patterns[country];
    return pattern ? pattern.test(zipCode) : false;
  }
}

// Zod schemas for common validations
export const commonSchemas = {
  email: z.string().email().toLowerCase(),
  
  phone: z.string().refine(
    (val) => ValidationService.validatePhoneNumber(val),
    { message: 'Invalid phone number' }
  ),
  
  password: z.string().refine(
    (val) => ValidationService.validatePassword(val).valid,
    { message: 'Password does not meet requirements' }
  ),
  
  url: z.string().url(),
  
  dateOfBirth: z.string().refine(
    (val) => ValidationService.validateDateOfBirth(val),
    { message: 'Invalid date of birth' }
  ),
  
  zipCode: z.string().refine(
    (val) => ValidationService.validateZipCode(val),
    { message: 'Invalid ZIP code' }
  ),
  
  creditCard: z.string().refine(
    (val) => ValidationService.validateCreditCard(val),
    { message: 'Invalid credit card number' }
  ),
};