/**
 * Comprehensive tests for validation and sanitization security functions
 * Tests XSS prevention, input validation, data format verification, and edge cases
 */

import { ValidationService, commonSchemas } from '@/lib/security/validation';

describe('ValidationService - Comprehensive Security Tests', () => {
  describe('Input Sanitization - XSS Prevention', () => {
    describe('sanitizeInput', () => {
      it('should remove script tags', () => {
        const maliciousInput = '<script>alert("XSS")</script>Hello World';
        const result = ValidationService.sanitizeInput(maliciousInput);
        expect(result).toBe('Hello World');
      });

      it('should remove complex script tags with attributes', () => {
        const maliciousInput = '<script type="text/javascript" src="evil.js">alert("XSS")</script>Safe text';
        const result = ValidationService.sanitizeInput(maliciousInput);
        expect(result).toBe('Safe text');
      });

      it('should remove iframe tags', () => {
        const maliciousInput = '<iframe src="http://evil.com"></iframe>Clean content';
        const result = ValidationService.sanitizeInput(maliciousInput);
        expect(result).toBe('Clean content');
      });

      it('should remove javascript: protocol', () => {
        const maliciousInput = 'Click <a href="javascript:alert(1)">here</a>';
        const result = ValidationService.sanitizeInput(maliciousInput);
        expect(result).toBe('Click <a href="">here</a>');
      });

      it('should remove event handlers', () => {
        const maliciousInput = '<div onclick="alert(1)">Content</div>';
        const result = ValidationService.sanitizeInput(maliciousInput);
        expect(result).toBe('<div>Content</div>');
      });

      it('should handle multiple XSS vectors in one input', () => {
        const maliciousInput = `
          <script>alert(1)</script>
          <div onclick="steal()">Text</div>
          <iframe src="evil.com"></iframe>
          <a href="javascript:hack()">Link</a>
          Normal text
        `;
        const result = ValidationService.sanitizeInput(maliciousInput);
        expect(result).toContain('Normal text');
        expect(result).not.toContain('alert');
        expect(result).not.toContain('steal');
        expect(result).not.toContain('hack');
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('<iframe>');
      });

      it('should preserve safe HTML tags', () => {
        const safeInput = '<p>Safe paragraph</p><strong>Bold text</strong>';
        const result = ValidationService.sanitizeInput(safeInput);
        expect(result).toBe('<p>Safe paragraph</p><strong>Bold text</strong>');
      });

      it('should trim whitespace', () => {
        const input = '   Padded text   ';
        const result = ValidationService.sanitizeInput(input);
        expect(result).toBe('Padded text');
      });

      it('should handle empty and null-like inputs', () => {
        expect(ValidationService.sanitizeInput('')).toBe('');
        expect(ValidationService.sanitizeInput('   ')).toBe('');
      });
    });

    describe('sanitizeHtml', () => {
      it('should preserve basic HTML while removing dangerous elements', () => {
        const input = `
          <p>Safe paragraph</p>
          <script>alert("bad")</script>
          <div onclick="bad()">Content</div>
          <strong>Bold text</strong>
        `;
        const result = ValidationService.sanitizeHtml(input);
        expect(result).toContain('<p>Safe paragraph</p>');
        expect(result).toContain('<strong>Bold text</strong>');
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('onclick');
      });

      it('should remove event handlers from attributes', () => {
        const input = '<p onmouseover="alert(1)" class="safe">Text</p>';
        const result = ValidationService.sanitizeHtml(input);
        expect(result).toContain('class="safe"');
        expect(result).not.toContain('onmouseover');
      });

      it('should handle nested malicious content', () => {
        const input = '<div><script>bad()</script><p>Good</p></div>';
        const result = ValidationService.sanitizeHtml(input);
        expect(result).toContain('<div><p>Good</p></div>');
        expect(result).not.toContain('<script>');
      });
    });
  });

  describe('Format Validation', () => {
    describe('validateEmail', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@test-domain.com',
        'firstname.lastname@domain.org',
        'user+tag@domain.museum'
      ];

      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double.dot@domain.com',
        'user@domain',
        'user @domain.com',
        'user@domain .com',
        ''
      ];

      validEmails.forEach(email => {
        it(`should validate valid email: ${email}`, () => {
          expect(ValidationService.validateEmail(email)).toBe(true);
        });
      });

      invalidEmails.forEach(email => {
        it(`should reject invalid email: "${email}"`, () => {
          expect(ValidationService.validateEmail(email)).toBe(false);
        });
      });
    });

    describe('validatePhoneNumber', () => {
      const validPhones = [
        '+1 (555) 123-4567',
        '555-123-4567',
        '5551234567',
        '+44 20 1234 5678',
        '(555) 123 4567',
        '+1-555-123-4567'
      ];

      const invalidPhones = [
        '123',
        '555-123',
        'not-a-phone',
        '555.123.456',
        '+1 555',
        ''
      ];

      validPhones.forEach(phone => {
        it(`should validate valid phone: ${phone}`, () => {
          expect(ValidationService.validatePhoneNumber(phone)).toBe(true);
        });
      });

      invalidPhones.forEach(phone => {
        it(`should reject invalid phone: "${phone}"`, () => {
          expect(ValidationService.validatePhoneNumber(phone)).toBe(false);
        });
      });

      it('should require minimum 10 digits', () => {
        expect(ValidationService.validatePhoneNumber('123456789')).toBe(false);
        expect(ValidationService.validatePhoneNumber('1234567890')).toBe(true);
      });
    });

    describe('validatePassword', () => {
      it('should validate strong password', () => {
        const result = ValidationService.validatePassword('StrongPass123!');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject password too short', () => {
        const result = ValidationService.validatePassword('Short1!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
      });

      it('should require uppercase letter', () => {
        const result = ValidationService.validatePassword('lowercase123!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      });

      it('should require lowercase letter', () => {
        const result = ValidationService.validatePassword('UPPERCASE123!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      });

      it('should require number', () => {
        const result = ValidationService.validatePassword('NoNumbers!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      });

      it('should require special character', () => {
        const result = ValidationService.validatePassword('NoSpecial123');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one special character');
      });

      it('should return multiple error messages', () => {
        const result = ValidationService.validatePassword('weak');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });

      it('should validate password with various special characters', () => {
        const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        for (const char of specialChars) {
          const password = `Test123${char}`;
          const result = ValidationService.validatePassword(password);
          expect(result.valid).toBe(true);
        }
      });
    });

    describe('validateDateOfBirth', () => {
      it('should validate valid adult age', () => {
        const thirtyYearsAgo = new Date();
        thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
        
        expect(ValidationService.validateDateOfBirth(thirtyYearsAgo)).toBe(true);
        expect(ValidationService.validateDateOfBirth('1990-05-15')).toBe(true);
      });

      it('should reject dates that make person too young', () => {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        expect(ValidationService.validateDateOfBirth(oneYearAgo)).toBe(false);
      });

      it('should reject dates that make person impossibly old', () => {
        const tooOld = new Date();
        tooOld.setFullYear(tooOld.getFullYear() - 150);
        
        expect(ValidationService.validateDateOfBirth(tooOld)).toBe(false);
      });

      it('should validate minimum age boundary (13 years)', () => {
        const exactlyThirteenYearsAgo = new Date();
        exactlyThirteenYearsAgo.setFullYear(exactlyThirteenYearsAgo.getFullYear() - 13);
        exactlyThirteenYearsAgo.setDate(exactlyThirteenYearsAgo.getDate() - 1); // Just past 13th birthday
        
        expect(ValidationService.validateDateOfBirth(exactlyThirteenYearsAgo)).toBe(true);
      });

      it('should validate maximum age boundary (120 years)', () => {
        const exactly120YearsAgo = new Date();
        exactly120YearsAgo.setFullYear(exactly120YearsAgo.getFullYear() - 120);
        
        expect(ValidationService.validateDateOfBirth(exactly120YearsAgo)).toBe(true);
      });
    });

    describe('validateUrl', () => {
      const validUrls = [
        'https://example.com',
        'http://test.org',
        'https://subdomain.domain.com/path?query=value',
        'http://localhost:3000',
        'https://domain.co.uk/path/to/resource'
      ];

      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'mailto:user@example.com',
        ''
      ];

      validUrls.forEach(url => {
        it(`should validate valid URL: ${url}`, () => {
          expect(ValidationService.validateUrl(url)).toBe(true);
        });
      });

      invalidUrls.forEach(url => {
        it(`should reject invalid/unsafe URL: "${url}"`, () => {
          expect(ValidationService.validateUrl(url)).toBe(false);
        });
      });
    });

    describe('validateJson', () => {
      it('should validate valid JSON strings', () => {
        const validJson = [
          '{"key": "value"}',
          '[1, 2, 3]',
          '"simple string"',
          'true',
          'null',
          '{"nested": {"object": true}}'
        ];

        validJson.forEach(json => {
          expect(ValidationService.validateJson(json)).toBe(true);
        });
      });

      it('should reject invalid JSON strings', () => {
        const invalidJson = [
          '{key: "value"}', // Unquoted key
          '{key: value}',   // Unquoted key and value
          '{"key": value}', // Unquoted value
          '{',              // Incomplete
          'undefined',      // Invalid literal
          "{'key': 'value'}", // Single quotes
          ''                // Empty string
        ];

        invalidJson.forEach(json => {
          expect(ValidationService.validateJson(json)).toBe(false);
        });
      });
    });

    describe('validateApiKey', () => {
      it('should validate properly formatted API keys', () => {
        const validKeys = [
          'sk_test_1234567890abcdefghijklmnopqrstuvwxyz',
          'pk_live_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
          'key_12345678901234567890123456789012',
          'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0'
        ];

        validKeys.forEach(key => {
          expect(ValidationService.validateApiKey(key)).toBe(true);
        });
      });

      it('should reject improperly formatted API keys', () => {
        const invalidKeys = [
          'short',
          'contains spaces',
          'has@special!characters',
          'sk_test_123', // Too short
          'key_with_unicode_字符',
          ''
        ];

        invalidKeys.forEach(key => {
          expect(ValidationService.validateApiKey(key)).toBe(false);
        });
      });
    });

    describe('validateCreditCard', () => {
      it('should validate real credit card numbers using Luhn algorithm', () => {
        const validCards = [
          '4532015112830366', // Visa
          '4000056655665556', // Visa test
          '5555555555554444', // Mastercard test
          '378282246310005',  // Amex test
        ];

        validCards.forEach(card => {
          expect(ValidationService.validateCreditCard(card)).toBe(true);
        });
      });

      it('should reject invalid credit card numbers', () => {
        const invalidCards = [
          '1234567890123456', // Invalid by Luhn
          '4532015112830367', // Invalid Luhn checksum
          '123',              // Too short
          '12345678901234567890', // Too long
          'abcd1234567890123', // Contains letters
          ''
        ];

        invalidCards.forEach(card => {
          expect(ValidationService.validateCreditCard(card)).toBe(false);
        });
      });

      it('should handle credit cards with spaces and dashes', () => {
        expect(ValidationService.validateCreditCard('4532-0151-1283-0366')).toBe(true);
        expect(ValidationService.validateCreditCard('4532 0151 1283 0366')).toBe(true);
      });
    });

    describe('validateZipCode', () => {
      it('should validate US ZIP codes', () => {
        const validUS = [
          '12345',
          '12345-6789',
          '90210',
          '10001-1234'
        ];

        validUS.forEach(zip => {
          expect(ValidationService.validateZipCode(zip, 'US')).toBe(true);
        });
      });

      it('should validate Canadian postal codes', () => {
        const validCA = [
          'K1A 0A9',
          'M5V 3L9',
          'T2X0M4',
          'V6B-1A1'
        ];

        validCA.forEach(zip => {
          expect(ValidationService.validateZipCode(zip, 'CA')).toBe(true);
        });
      });

      it('should validate UK postal codes', () => {
        const validUK = [
          'SW1A 1AA',
          'M1 1AA',
          'B33 8TH',
          'W1A 0AX',
          'EC1A1BB'
        ];

        validUK.forEach(zip => {
          expect(ValidationService.validateZipCode(zip, 'UK')).toBe(true);
        });
      });

      it('should reject invalid ZIP codes for each country', () => {
        // Invalid US
        expect(ValidationService.validateZipCode('123', 'US')).toBe(false);
        expect(ValidationService.validateZipCode('12345-123', 'US')).toBe(false);
        
        // Invalid CA
        expect(ValidationService.validateZipCode('123456', 'CA')).toBe(false);
        expect(ValidationService.validateZipCode('K1A', 'CA')).toBe(false);
        
        // Invalid UK
        expect(ValidationService.validateZipCode('123', 'UK')).toBe(false);
        expect(ValidationService.validateZipCode('INVALID', 'UK')).toBe(false);
      });

      it('should default to US format when no country specified', () => {
        expect(ValidationService.validateZipCode('12345')).toBe(true);
        expect(ValidationService.validateZipCode('K1A 0A9')).toBe(false);
      });
    });
  });

  describe('File Security', () => {
    describe('sanitizeFileName', () => {
      it('should sanitize dangerous file names', () => {
        const dangerous = 'file<>name:"with|problematic?characters*.pdf';
        const result = ValidationService.sanitizeFileName(dangerous);
        expect(result).toBe('file_name_with_problematic_characters_.pdf');
      });

      it('should preserve safe characters', () => {
        const safe = 'document_2023-12-01.v1.2.pdf';
        const result = ValidationService.sanitizeFileName(safe);
        expect(result).toBe('document_2023-12-01.v1.2.pdf');
      });

      it('should handle multiple consecutive underscores', () => {
        const input = 'file___with___many___separators';
        const result = ValidationService.sanitizeFileName(input);
        expect(result).toBe('file_with_many_separators');
      });

      it('should trim leading and trailing underscores', () => {
        const input = '___filename___';
        const result = ValidationService.sanitizeFileName(input);
        expect(result).toBe('filename');
      });

      it('should limit file name length', () => {
        const longName = 'a'.repeat(300) + '.txt';
        const result = ValidationService.sanitizeFileName(longName);
        expect(result.length).toBeLessThanOrEqual(255);
      });

      it('should handle empty file names', () => {
        expect(ValidationService.sanitizeFileName('')).toBe('');
        expect(ValidationService.sanitizeFileName('___')).toBe('');
      });
    });

    describe('validateMimeType', () => {
      it('should validate exact MIME type matches', () => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        
        expect(ValidationService.validateMimeType('image/jpeg', allowedTypes)).toBe(true);
        expect(ValidationService.validateMimeType('image/png', allowedTypes)).toBe(true);
        expect(ValidationService.validateMimeType('application/pdf', allowedTypes)).toBe(true);
      });

      it('should validate wildcard MIME type patterns', () => {
        const allowedTypes = ['image/*', 'application/pdf'];
        
        expect(ValidationService.validateMimeType('image/jpeg', allowedTypes)).toBe(true);
        expect(ValidationService.validateMimeType('image/gif', allowedTypes)).toBe(true);
        expect(ValidationService.validateMimeType('image/webp', allowedTypes)).toBe(true);
        expect(ValidationService.validateMimeType('application/pdf', allowedTypes)).toBe(true);
      });

      it('should reject non-allowed MIME types', () => {
        const allowedTypes = ['image/*', 'application/pdf'];
        
        expect(ValidationService.validateMimeType('video/mp4', allowedTypes)).toBe(false);
        expect(ValidationService.validateMimeType('application/exe', allowedTypes)).toBe(false);
        expect(ValidationService.validateMimeType('text/html', allowedTypes)).toBe(false);
      });

      it('should handle empty allowed types list', () => {
        expect(ValidationService.validateMimeType('image/jpeg', [])).toBe(false);
      });
    });

    describe('validateFileSize', () => {
      it('should validate files within size limit', () => {
        const oneMB = 1024 * 1024;
        const fiveMB = 5 * oneMB;
        
        expect(ValidationService.validateFileSize(oneMB, 5)).toBe(true);
        expect(ValidationService.validateFileSize(fiveMB, 5)).toBe(true);
        expect(ValidationService.validateFileSize(fiveMB - 1, 5)).toBe(true);
      });

      it('should reject files over size limit', () => {
        const sixMB = 6 * 1024 * 1024;
        
        expect(ValidationService.validateFileSize(sixMB, 5)).toBe(false);
      });

      it('should handle edge cases', () => {
        expect(ValidationService.validateFileSize(0, 5)).toBe(true);
        expect(ValidationService.validateFileSize(1, 0)).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('escapeRegExp', () => {
      it('should escape special regex characters', () => {
        const input = 'Hello (world) [test] {more} .* +? ^$ | \\';
        const result = ValidationService.escapeRegExp(input);
        expect(result).toBe('Hello \\(world\\) \\[test\\] \\{more\\} \\.\\* \\+\\? \\^\\$ \\| \\\\');
      });

      it('should not modify safe strings', () => {
        const input = 'Hello world 123';
        const result = ValidationService.escapeRegExp(input);
        expect(result).toBe('Hello world 123');
      });

      it('should work with escaped string in regex', () => {
        const searchTerm = 'price: $29.99';
        const escaped = ValidationService.escapeRegExp(searchTerm);
        const regex = new RegExp(escaped);
        const text = 'The price: $29.99 is correct';
        
        expect(regex.test(text)).toBe(true);
      });
    });
  });

  describe('Zod Schema Integration', () => {
    describe('commonSchemas', () => {
      it('should validate email schema', () => {
        const validResult = commonSchemas.email.safeParse('USER@EXAMPLE.COM');
        expect(validResult.success).toBe(true);
        expect(validResult.data).toBe('user@example.com'); // Should be lowercased

        const invalidResult = commonSchemas.email.safeParse('invalid-email');
        expect(invalidResult.success).toBe(false);
      });

      it('should validate phone schema', () => {
        const validResult = commonSchemas.phone.safeParse('+1 (555) 123-4567');
        expect(validResult.success).toBe(true);

        const invalidResult = commonSchemas.phone.safeParse('123');
        expect(invalidResult.success).toBe(false);
      });

      it('should validate password schema', () => {
        const validResult = commonSchemas.password.safeParse('StrongPass123!');
        expect(validResult.success).toBe(true);

        const invalidResult = commonSchemas.password.safeParse('weak');
        expect(invalidResult.success).toBe(false);
      });

      it('should validate URL schema', () => {
        const validResult = commonSchemas.url.safeParse('https://example.com');
        expect(validResult.success).toBe(true);

        const invalidResult = commonSchemas.url.safeParse('not-a-url');
        expect(invalidResult.success).toBe(false);
      });

      it('should validate date of birth schema', () => {
        const validResult = commonSchemas.dateOfBirth.safeParse('1990-05-15');
        expect(validResult.success).toBe(true);

        const invalidResult = commonSchemas.dateOfBirth.safeParse('2020-01-01'); // Too young
        expect(invalidResult.success).toBe(false);
      });

      it('should validate ZIP code schema', () => {
        const validResult = commonSchemas.zipCode.safeParse('12345');
        expect(validResult.success).toBe(true);

        const invalidResult = commonSchemas.zipCode.safeParse('123');
        expect(invalidResult.success).toBe(false);
      });

      it('should validate credit card schema', () => {
        const validResult = commonSchemas.creditCard.safeParse('4532015112830366');
        expect(validResult.success).toBe(true);

        const invalidResult = commonSchemas.creditCard.safeParse('1234567890123456');
        expect(invalidResult.success).toBe(false);
      });
    });
  });

  describe('Security Edge Cases and Attack Vectors', () => {
    it('should handle extremely long inputs', () => {
      const longString = 'a'.repeat(100000);
      
      // Should not crash and should handle gracefully
      expect(() => ValidationService.sanitizeInput(longString)).not.toThrow();
      expect(() => ValidationService.validateEmail(longString)).not.toThrow();
      expect(() => ValidationService.validateUrl(longString)).not.toThrow();
    });

    it('should handle Unicode and special encoding', () => {
      const unicodeInput = 'Hello 世界 🌍 test';
      const result = ValidationService.sanitizeInput(unicodeInput);
      expect(result).toBe('Hello 世界 🌍 test');
    });

    it('should handle mixed XSS attack vectors', () => {
      const complexAttack = `
        <script>fetch('/steal-data')</script>
        <img src="x" onerror="alert(1)">
        <iframe src="javascript:alert(1)"></iframe>
        <div onclick="window.location='evil.com'">Click me</div>
        <style>body{display:none}</style>
        <object data="javascript:alert(1)"></object>
        <embed src="javascript:alert(1)">
      `;
      
      const sanitized = ValidationService.sanitizeInput(complexAttack);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('<iframe>');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('onerror');
    });

    it('should validate boundary conditions for numeric inputs', () => {
      // Test file size boundaries
      expect(ValidationService.validateFileSize(Number.MAX_SAFE_INTEGER, 1)).toBe(false);
      expect(ValidationService.validateFileSize(-1, 5)).toBe(false);
      
      // Test age boundaries
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(ValidationService.validateDateOfBirth(futureDate)).toBe(false);
    });

    it('should handle null byte injection attempts', () => {
      const nullByteAttack = 'filename.txt\0.exe';
      const sanitized = ValidationService.sanitizeFileName(nullByteAttack);
      expect(sanitized).not.toContain('\0');
    });

    it('should handle regex denial of service (ReDoS) patterns', () => {
      // Test with patterns that could cause catastrophic backtracking
      const reDoSEmail = 'a'.repeat(1000) + '@' + 'b'.repeat(1000) + '.com';
      
      const startTime = Date.now();
      const result = ValidationService.validateEmail(reDoSEmail);
      const endTime = Date.now();
      
      // Should complete quickly (under 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(result).toBe(false); // Should still return correct result
    });
  });
});