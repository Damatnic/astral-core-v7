import { LRUCache } from 'lru-cache';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

/**
 * Advanced rate limiting service with configurable windows and thresholds
 * Implements in-memory LRU cache for high-performance rate limiting
 * Protects against abuse, brute force attacks, and API overuse
 */
export class RateLimiter {
  private cache: LRUCache<string, RateLimitInfo>;
  private windowMs: number;
  private max: number;
  private skipSuccessfulRequests: boolean;
  private skipFailedRequests: boolean;

  /**
   * Initialize rate limiter with configurable options
   * @param {RateLimitOptions} [options={}] - Rate limiting configuration
   * @param {number} [options.windowMs=60000] - Time window in milliseconds (default: 1 minute)
   * @param {number} [options.max=100] - Maximum requests per window (default: 100)
   * @param {string} [options.message] - Custom error message for rate limit exceeded
   * @param {boolean} [options.skipSuccessfulRequests=false] - Don't count successful requests
   * @param {boolean} [options.skipFailedRequests=false] - Don't count failed requests
   * @example
   * ```typescript
   * const limiter = new RateLimiter({
   *   windowMs: 900000, // 15 minutes
   *   max: 5, // 5 requests per 15 minutes
   *   message: 'Too many attempts'
   * });
   * ```
   */
  constructor(options: RateLimitOptions = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.max = options.max || 100;
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;

    this.cache = new LRUCache<string, RateLimitInfo>({
      max: 10000,
      ttl: this.windowMs
    });
  }

  /**
   * Check if request should be allowed based on rate limit
   * Updates request count and returns current limit status
   * @param {string} identifier - Unique identifier for the client (IP, user ID, etc.)
   * @returns {Promise<Object>} Rate limit status information
   * @returns {boolean} returns.allowed - Whether request should be allowed
   * @returns {number} returns.limit - Maximum requests allowed in window
   * @returns {number} returns.remaining - Requests remaining in current window
   * @returns {Date} returns.resetTime - When the rate limit window resets
   * @returns {number} [returns.retryAfter] - Seconds to wait before retrying (if blocked)
   * @example
   * ```typescript
   * const status = await limiter.check('user_123');
   * if (!status.allowed) {
   *   throw new Error(`Rate limit exceeded. Retry after ${status.retryAfter} seconds`);
   * }
   * ```
   */
  async check(identifier: string): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const resetTime = now + this.windowMs;

    let info = this.cache.get(identifier);

    if (!info || now > info.resetTime) {
      info = {
        count: 0,
        resetTime
      };
    }

    info.count++;
    this.cache.set(identifier, info);

    const remaining = Math.max(0, this.max - info.count);
    const allowed = info.count <= this.max;

    const result = {
      allowed,
      limit: this.max,
      remaining,
      resetTime: new Date(info.resetTime),
      ...(allowed ? {} : { retryAfter: Math.ceil((info.resetTime - now) / 1000) })
    };

    return result;
  }

  /**
   * Reset rate limit counter for a specific identifier
   * Useful for clearing limits after successful authentication or administrative override
   * @param {string} identifier - Identifier to reset rate limit for
   * @example
   * ```typescript
   * // Reset rate limit after successful login
   * limiter.reset('user_123');
   * ```
   */
  reset(identifier: string): void {
    this.cache.delete(identifier);
  }

  /**
   * Manually increment rate limit counter for an identifier
   * Respects skipSuccessfulRequests and skipFailedRequests settings
   * @param {string} identifier - Identifier to increment counter for
   * @param {boolean} success - Whether the request was successful
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * // Increment counter for failed login attempt
   * await limiter.increment('user_123', false);
   * ```
   */
  async increment(identifier: string, success: boolean): Promise<void> {
    if (success && this.skipSuccessfulRequests) return;
    if (!success && this.skipFailedRequests) return;

    const info = this.cache.get(identifier);
    if (info) {
      info.count++;
      this.cache.set(identifier, info);
    }
  }

  /**
   * Generate unique identifier for rate limiting from request
   * Combines IP address, user ID, and endpoint for granular rate limiting
   * @param {Request | { headers: Headers; url: string }} req - HTTP request object
   * @returns {string} Unique identifier in format 'ip:userId:endpoint'
   * @example
   * ```typescript
   * const identifier = limiter.getIdentifier(request);
   * // Returns: '192.168.1.1:user_123:/api/auth/login'
   * const status = await limiter.check(identifier);
   * ```
   */
  getIdentifier(req: Request | { headers: Headers; url: string }): string {
    const headers = req.headers;
    const url = new URL(req.url);

    // Try to get client IP
    const ip =
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip') ||
      headers.get('cf-connecting-ip') ||
      'unknown';

    // Include user ID if authenticated
    const userId = headers.get('x-user-id') || 'anonymous';

    // Create identifier based on IP, user ID, and endpoint
    return `${ip}:${userId}:${url.pathname}`;
  }
}

/**
 * Predefined rate limiters for different application endpoints and use cases
 * Each limiter is configured for specific security requirements and usage patterns
 * @example
 * ```typescript
 * import { rateLimiters } from '@/lib/security/rate-limit';
 *
 * // Check auth rate limit
 * const authStatus = await rateLimiters.auth.check('user_123');
 * if (!authStatus.allowed) {
 *   throw new Error('Too many auth attempts');
 * }
 * ```
 */
export const rateLimiters = {
  /** General API rate limiter - 100 requests per minute */
  api: new RateLimiter({
    windowMs: 60000, // 1 minute
    max: 100,
    message: 'API rate limit exceeded'
  }),

  /** Strict API rate limiter for public endpoints - 30 requests per minute */
  publicApi: new RateLimiter({
    windowMs: 60000, // 1 minute
    max: 30,
    message: 'Public API rate limit exceeded'
  }),

  /** Authentication rate limiter - 5 attempts per 15 minutes, only counts failures */
  auth: new RateLimiter({
    windowMs: 900000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts',
    skipSuccessfulRequests: true
  }),

  /** Registration rate limiter - 3 attempts per hour */
  registration: new RateLimiter({
    windowMs: 3600000, // 1 hour
    max: 3,
    message: 'Too many registration attempts'
  }),

  /** Password reset rate limiter - 3 attempts per hour */
  passwordReset: new RateLimiter({
    windowMs: 3600000, // 1 hour
    max: 3,
    message: 'Too many password reset attempts'
  }),

  /** File upload rate limiter - 20 uploads per hour */
  fileUpload: new RateLimiter({
    windowMs: 3600000, // 1 hour
    max: 20,
    message: 'File upload rate limit exceeded'
  }),

  /** Message sending rate limiter - 60 messages per hour */
  messaging: new RateLimiter({
    windowMs: 3600000, // 1 hour
    max: 60,
    message: 'Message rate limit exceeded'
  }),

  /** Crisis intervention rate limiter - 1000 requests per minute for emergency situations */
  crisis: new RateLimiter({
    windowMs: 60000, // 1 minute
    max: 1000, // Higher limit for crisis endpoints
    message: 'Crisis endpoint rate limit exceeded'
  }),

  /** Wellness data tracking rate limiter - 100 entries per hour */
  wellness: new RateLimiter({
    windowMs: 3600000, // 1 hour
    max: 100,
    message: 'Wellness tracking rate limit exceeded'
  }),

  /** Search rate limiter - 50 searches per minute */
  search: new RateLimiter({
    windowMs: 60000, // 1 minute
    max: 50,
    message: 'Search rate limit exceeded'
  }),

  /** Admin actions rate limiter - 200 requests per minute */
  admin: new RateLimiter({
    windowMs: 60000, // 1 minute
    max: 200,
    message: 'Admin rate limit exceeded'
  }),

  /** Payment processing rate limiter - 10 payment attempts per hour */
  payment: new RateLimiter({
    windowMs: 3600000, // 1 hour
    max: 10,
    message: 'Payment rate limit exceeded'
  }),

  /** Appointment booking rate limiter - 20 bookings per day */
  appointments: new RateLimiter({
    windowMs: 86400000, // 24 hours
    max: 20,
    message: 'Appointment booking rate limit exceeded'
  }),

  /** Email sending rate limiter - 10 emails per hour */
  email: new RateLimiter({
    windowMs: 3600000, // 1 hour
    max: 10,
    message: 'Email sending rate limit exceeded'
  }),

  /** Error reporting rate limiter - 50 errors per minute */
  errorReporting: new RateLimiter({
    windowMs: 60000, // 1 minute
    max: 50,
    message: 'Error reporting rate limit exceeded'
  }),

  /** Performance metrics rate limiter - 100 metrics per minute */
  performanceMetrics: new RateLimiter({
    windowMs: 60000, // 1 minute
    max: 100,
    message: 'Performance metrics rate limit exceeded'
  })
};

// Export default rate limiter instance for general use
export const rateLimiter = rateLimiters.api;

// Alias for backward compatibility
export const rateLimit = rateLimiter;
