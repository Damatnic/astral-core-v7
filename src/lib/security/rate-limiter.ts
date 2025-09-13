/**
 * Rate Limiting Implementation
 * Protects API endpoints from abuse and brute force attacks
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Default identifier: IP address or fallback
 */
function getDefaultIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const pathname = new URL(req.url).pathname;
  return `${ip}:${pathname}`;
}

/**
 * Rate limiter middleware factory
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    identifier = getDefaultIdentifier,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return async function rateLimit(
    req: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = identifier(req);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }
    
    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          },
        }
      );
    }
    
    // Increment counter before processing
    entry.count++;
    
    try {
      // Process the request
      const response = await handler();
      
      // Optionally skip counting successful requests
      if (skipSuccessfulRequests && response.status < 400) {
        entry.count--;
      }
      
      // Add rate limit headers to response
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', maxRequests.toString());
      headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
      headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
      
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      // Optionally skip counting failed requests
      if (skipFailedRequests) {
        entry.count--;
      }
      throw error;
    }
  };
}

/**
 * Specific rate limiters for different endpoints
 */

// Strict rate limiting for authentication endpoints
export const authRateLimiter = createRateLimiter({
  maxRequests: 5, // 5 attempts
  windowMs: 15 * 60 * 1000, // per 15 minutes
});

// Moderate rate limiting for API endpoints
export const apiRateLimiter = createRateLimiter({
  maxRequests: 100, // 100 requests
  windowMs: 15 * 60 * 1000, // per 15 minutes
});

// Lenient rate limiting for public endpoints
export const publicRateLimiter = createRateLimiter({
  maxRequests: 200, // 200 requests
  windowMs: 15 * 60 * 1000, // per 15 minutes
});

// Very strict rate limiting for password reset
export const passwordResetRateLimiter = createRateLimiter({
  maxRequests: 3, // 3 attempts
  windowMs: 60 * 60 * 1000, // per hour
});

// Rate limiting for MFA verification
export const mfaRateLimiter = createRateLimiter({
  maxRequests: 5, // 5 attempts
  windowMs: 10 * 60 * 1000, // per 10 minutes
});

/**
 * Helper function to apply rate limiting to API routes
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limiter = apiRateLimiter
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    return limiter(req, () => handler(req));
  };
}

/**
 * IP-based blocking for repeated violations
 */
const blockedIPs = new Set<string>();
const violationCounts = new Map<string, { count: number; firstViolation: number }>();

export function blockIP(ip: string, duration: number = 24 * 60 * 60 * 1000) {
  blockedIPs.add(ip);
  setTimeout(() => blockedIPs.delete(ip), duration);
}

export function isIPBlocked(ip: string): boolean {
  return blockedIPs.has(ip);
}

export function trackViolation(ip: string) {
  const now = Date.now();
  let violations = violationCounts.get(ip);
  
  if (!violations) {
    violations = { count: 1, firstViolation: now };
    violationCounts.set(ip, violations);
  } else {
    violations.count++;
    
    // Auto-block after 10 violations within an hour
    if (violations.count >= 10 && now - violations.firstViolation < 60 * 60 * 1000) {
      blockIP(ip);
      violationCounts.delete(ip);
    }
  }
  
  // Clean up old violations
  if (now - violations.firstViolation > 60 * 60 * 1000) {
    violationCounts.delete(ip);
  }
}

// Clean up violations periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, violations] of violationCounts.entries()) {
    if (now - violations.firstViolation > 60 * 60 * 1000) {
      violationCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes