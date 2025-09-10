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

export class RateLimiter {
  private cache: LRUCache<string, RateLimitInfo>;
  private windowMs: number;
  private max: number;
  private skipSuccessfulRequests: boolean;
  private skipFailedRequests: boolean;

  constructor(options: RateLimitOptions = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.max = options.max || 100;
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;

    this.cache = new LRUCache<string, RateLimitInfo>({
      max: 10000,
      ttl: this.windowMs,
    });
  }

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
        resetTime,
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
      ...(allowed ? {} : { retryAfter: Math.ceil((info.resetTime - now) / 1000) }),
    };

    return result;
  }

  reset(identifier: string): void {
    this.cache.delete(identifier);
  }

  async increment(identifier: string, success: boolean): Promise<void> {
    if (success && this.skipSuccessfulRequests) return;
    if (!success && this.skipFailedRequests) return;

    const info = this.cache.get(identifier);
    if (info) {
      info.count++;
      this.cache.set(identifier, info);
    }
  }

  getIdentifier(req: Request | { headers: Headers; url: string }): string {
    const headers = req.headers;
    const url = new URL(req.url);
    
    // Try to get client IP
    const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               headers.get('x-real-ip') ||
               headers.get('cf-connecting-ip') ||
               'unknown';
    
    // Include user ID if authenticated
    const userId = headers.get('x-user-id') || 'anonymous';
    
    // Create identifier based on IP, user ID, and endpoint
    return `${ip}:${userId}:${url.pathname}`;
  }
}

// Predefined rate limiters for different use cases
export const rateLimiters = {
  api: new RateLimiter({
    windowMs: 60000, // 1 minute
    max: 100,
    message: 'API rate limit exceeded',
  }),
  
  auth: new RateLimiter({
    windowMs: 900000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts',
    skipSuccessfulRequests: true,
  }),
  
  crisis: new RateLimiter({
    windowMs: 60000, // 1 minute
    max: 1000, // Higher limit for crisis endpoints
    message: 'Crisis endpoint rate limit exceeded',
  }),
  
  wellness: new RateLimiter({
    windowMs: 3600000, // 1 hour
    max: 100,
    message: 'Wellness tracking rate limit exceeded',
  }),
};