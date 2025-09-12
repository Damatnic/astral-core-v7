/**
 * Enhanced Rate Limiting Configuration
 * Provides comprehensive rate limiting for all API endpoints
 * with different limits based on endpoint sensitivity
 */

import { RateLimiter } from './rate-limit';
import { getConfig } from '@/lib/config/env-validation';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Rate limiter configuration types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  handler?: (req: NextRequest) => Promise<Response> | Response;
  onLimitReached?: (req: NextRequest, key: string) => void;
}

// Endpoint-specific rate limit configurations
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Authentication endpoints - very strict
  'auth:login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful logins
  },
  
  'auth:register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 registrations per hour per IP
  },
  
  'auth:forgot-password': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 requests per hour
  },
  
  'auth:reset-password': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  },
  
  'auth:mfa-verify': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5, // 5 attempts per 5 minutes
  },
  
  // Crisis endpoints - allow more requests for safety
  'crisis:assess': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },
  
  'crisis:hotline': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute - no blocking in crisis
  },
  
  // File upload - strict limits
  'files:upload': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 uploads per hour
  },
  
  // API endpoints - moderate limits
  'api:general': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  
  'api:read': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 read requests per minute
  },
  
  'api:write': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 write requests per minute
  },
  
  // Wellness data - reasonable limits
  'wellness:mood': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 mood entries per hour
  },
  
  'wellness:journal': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 journal entries per hour
  },
  
  // Search - prevent abuse
  'search:global': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 searches per minute
  },
  
  // Notifications
  'notifications:send': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 notifications per hour
  },
};

/**
 * Get rate limiter for specific endpoint
 * @param endpoint Endpoint identifier
 * @returns RateLimiter instance
 */
export function getRateLimiter(endpoint: string): RateLimiter {
  const config = getConfig();
  
  // Check if rate limiting is enabled
  if (!config.RATE_LIMIT_ENABLED) {
    // Return a no-op rate limiter
    return new RateLimiter({
      windowMs: 1000,
      maxRequests: Number.MAX_SAFE_INTEGER,
    });
  }
  
  // Get endpoint-specific config or use defaults
  const endpointConfig = rateLimitConfigs[endpoint] || rateLimitConfigs['api:general'];
  
  return new RateLimiter({
    windowMs: endpointConfig.windowMs,
    maxRequests: endpointConfig.maxRequests,
  });
}

/**
 * Generate rate limit key for request
 * @param request The incoming request
 * @param userId Optional user ID for authenticated requests
 * @returns Rate limit key
 */
export function generateRateLimitKey(request: NextRequest, userId?: string): string {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const endpoint = getEndpointFromPath(request.nextUrl.pathname);
  
  // Use user ID if available, otherwise use IP + user agent hash
  if (userId) {
    return `${endpoint}:user:${userId}`;
  }
  
  // Create a hash of IP + user agent for better fingerprinting
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}`)
    .digest('hex')
    .substring(0, 16);
  
  return `${endpoint}:ip:${fingerprint}`;
}

/**
 * Get client IP address from request
 * @param request The incoming request
 * @returns Client IP address
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers for real IP (when behind proxy)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to request IP
  return request.ip || '127.0.0.1';
}

/**
 * Get endpoint identifier from path
 * @param pathname Request path
 * @returns Endpoint identifier for rate limiting
 */
export function getEndpointFromPath(pathname: string): string {
  // Map paths to endpoint identifiers
  const pathMappings: Array<[RegExp, string]> = [
    // Authentication
    [/^\/api\/auth\/login/, 'auth:login'],
    [/^\/api\/auth\/register/, 'auth:register'],
    [/^\/api\/auth\/forgot-password/, 'auth:forgot-password'],
    [/^\/api\/auth\/reset-password/, 'auth:reset-password'],
    [/^\/api\/auth\/mfa\/verify/, 'auth:mfa-verify'],
    
    // Crisis
    [/^\/api\/crisis\/assess/, 'crisis:assess'],
    [/^\/api\/crisis\/hotline/, 'crisis:hotline'],
    
    // Files
    [/^\/api\/files\/upload/, 'files:upload'],
    
    // Wellness
    [/^\/api\/wellness\/mood/, 'wellness:mood'],
    [/^\/api\/journal/, 'wellness:journal'],
    
    // Search
    [/^\/api\/search/, 'search:global'],
    
    // Notifications
    [/^\/api\/notifications\/send/, 'notifications:send'],
    
    // API - differentiate between read and write
    [/^\/api\/.*/, (pathname, method) => {
      const readMethods = ['GET', 'HEAD', 'OPTIONS'];
      return readMethods.includes(method || 'GET') ? 'api:read' : 'api:write';
    }],
  ];
  
  for (const [pattern, identifier] of pathMappings) {
    if (pattern.test(pathname)) {
      if (typeof identifier === 'function') {
        return identifier(pathname, 'GET'); // Default to GET
      }
      return identifier;
    }
  }
  
  return 'api:general';
}

/**
 * Apply rate limiting to request
 * @param request The incoming request
 * @param endpoint Optional endpoint override
 * @returns Response if rate limited, null otherwise
 */
export async function applyRateLimit(
  request: NextRequest,
  endpoint?: string
): Promise<Response | null> {
  const config = getConfig();
  
  if (!config.RATE_LIMIT_ENABLED) {
    return null;
  }
  
  // Get endpoint and rate limiter
  const endpointId = endpoint || getEndpointFromPath(request.nextUrl.pathname);
  const rateLimiter = getRateLimiter(endpointId);
  
  // Generate rate limit key
  const key = generateRateLimitKey(request);
  
  // Check rate limit
  const { allowed, remaining, resetAt } = await rateLimiter.check(key);
  
  if (!allowed) {
    // Log rate limit violation
    console.warn('Rate limit exceeded:', {
      endpoint: endpointId,
      key,
      ip: getClientIp(request),
      path: request.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    });
    
    // Return rate limit response
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Please slow down and try again later',
        retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': rateLimiter.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(resetAt).toISOString(),
          'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }
  
  // Add rate limit headers to successful responses
  return new Response(null, {
    headers: {
      'X-RateLimit-Limit': rateLimiter.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(resetAt).toISOString(),
    },
  });
}

/**
 * Reset rate limit for specific key
 * @param key Rate limit key
 * @param endpoint Endpoint identifier
 */
export async function resetRateLimit(key: string, endpoint: string): Promise<void> {
  const rateLimiter = getRateLimiter(endpoint);
  await rateLimiter.reset(key);
}

/**
 * Get rate limit status for key
 * @param key Rate limit key
 * @param endpoint Endpoint identifier
 * @returns Rate limit status
 */
export async function getRateLimitStatus(
  key: string,
  endpoint: string
): Promise<{ requests: number; remaining: number; resetAt: number }> {
  const rateLimiter = getRateLimiter(endpoint);
  const { remaining, resetAt } = await rateLimiter.check(key);
  
  return {
    requests: rateLimiter.maxRequests - remaining,
    remaining,
    resetAt,
  };
}

// Export configured rate limiters for direct use
export const rateLimiters = {
  auth: getRateLimiter('auth:login'),
  register: getRateLimiter('auth:register'),
  upload: getRateLimiter('files:upload'),
  api: getRateLimiter('api:general'),
  crisis: getRateLimiter('crisis:assess'),
  search: getRateLimiter('search:global'),
};