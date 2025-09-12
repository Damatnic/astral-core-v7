import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { enhanceSecurityResponse } from './lib/security/middleware-enhancer';
import { applyRateLimit, shouldRateLimit } from './lib/security/rate-limiter-temp';
import { validateEnv } from './lib/config/env-validation';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Validate environment on first request (cached after)
  const envValidation = validateEnv();
  if (!envValidation.success && process.env.NODE_ENV === 'production') {
    console.error('Environment validation failed:', envValidation.errors);
    return new NextResponse('Service Unavailable', { status: 503 });
  }

  // Apply rate limiting for sensitive endpoints
  if (shouldRateLimit(pathname)) {
    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse && rateLimitResponse.status === 429) {
      return rateLimitResponse;
    }
  }
  
  // Allow public routes
  const publicRoutes = [
    '/auth/login',
    '/auth/register', 
    '/auth/forgot-password',
    '/api/auth',
    '/api/health',
    '/api/status',
    '/_next',
    '/favicon.ico',
    '/api/crisis/hotline' // Always allow crisis hotline access
  ];

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (isPublicRoute) {
    const response = NextResponse.next();
    return enhanceSecurityResponse(request, response);
  }

  // Get authentication token
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(loginUrl);
    return enhanceSecurityResponse(request, response);
  }
  
  // Add user context to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', token.sub || '');
  requestHeaders.set('x-user-role', (token as any).role || 'CLIENT');
  
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Apply security headers to all responses
  return enhanceSecurityResponse(request, response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};