import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { rateLimiters } from '@/lib/security/rate-limit';
import { isCacheable } from '@/lib/utils/cache';
import { validateCSRF, generateCSRFToken } from '@/lib/security/csrf';

const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/error',
  '/api/auth'
];

const ROLE_BASED_PATHS = {
  ADMIN: ['/admin', '/api/admin'],
  THERAPIST: ['/therapist', '/api/therapist'],
  CRISIS_RESPONDER: ['/crisis/responder', '/api/crisis/responder'],
  SUPERVISOR: ['/supervisor', '/api/supervisor']
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and images
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Security headers and caching configuration
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://api.posthog.com; " +
      "frame-ancestors 'none';"
  );

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Add cache-related headers for better performance
  if (isCacheable(request)) {
    response.headers.set('Vary', 'Accept-Encoding, Authorization, Cookie');
    
    // Set default cache headers for HTML pages (will be overridden by next.config.ts)
    if (!pathname.startsWith('/api')) {
      response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, must-revalidate');
    }
  }

  // Rate limiting for API routes
  if (pathname.startsWith('/api')) {
    const identifier = rateLimiters.api.getIdentifier(request);
    const { allowed, remaining, resetTime } = await rateLimiters.api.check(identifier);

    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetTime.toISOString());

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: response.headers
        }
      );
    }

    // CSRF Protection for API routes
    const csrfResult = await validateCSRF(request);
    if (!csrfResult.valid) {
      return NextResponse.json(
        { 
          error: 'CSRF token validation failed',
          message: csrfResult.error,
          code: 'CSRF_TOKEN_INVALID'
        },
        {
          status: 403,
          headers: response.headers
        }
      );
    }
  }

  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.some(
    path => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isPublicPath) {
    return response;
  }

  // Authentication check
  const token = await getToken({
    req: request,
    secret: process.env['NEXTAUTH_SECRET']!
  });

  if (!token) {
    // Redirect to login if not authenticated
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control
  const userRole = token.role as string;

  // Check if user has access to role-specific paths
  for (const [role, paths] of Object.entries(ROLE_BASED_PATHS)) {
    const hasRestrictedPath = paths.some(path => pathname.startsWith(path));

    if (hasRestrictedPath && userRole !== role && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Session activity tracking
  response.headers.set('X-User-Id', token.id as string);
  response.headers.set('X-User-Role', userRole);

  // Generate CSRF token for authenticated users on page requests
  if (!pathname.startsWith('/api') && token) {
    try {
      const { headers: csrfHeaders } = generateCSRFToken(
        token.id as string,
        token.sessionId as string
      );
      
      // Add CSRF token to response headers
      Object.entries(csrfHeaders).forEach(([key, value]) => {
        if (typeof value === 'string') {
          response.headers.set(key, value);
        }
      });
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to generate CSRF token:', error);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)'
  ]
};
