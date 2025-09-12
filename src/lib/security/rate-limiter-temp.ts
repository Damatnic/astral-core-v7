/**
 * TEMPORARY: Simplified Rate Limiter for Deployment
 * Bypasses lru-cache dependency until proper installation
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (not suitable for production clusters)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  const key = `${ip}:${Math.floor(now / windowMs)}`;
  const current = requestCounts.get(key) || { count: 0, resetTime: now + windowMs };

  if (current.count >= maxRequests) {
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((current.resetTime - now) / 1000)),
      }
    });
  }

  current.count++;
  requestCounts.set(key, current);

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of requestCounts.entries()) {
      if (v.resetTime < now) {
        requestCounts.delete(k);
      }
    }
  }

  return null;
}

export function shouldRateLimit(pathname: string): boolean {
  const rateLimitedPaths = [
    '/api/auth',
    '/api/user',
    '/api/wellness',
    '/api/crisis'
  ];

  return rateLimitedPaths.some(path => pathname.startsWith(path));
}