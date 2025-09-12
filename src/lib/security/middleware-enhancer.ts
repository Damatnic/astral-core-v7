/**
 * Enhanced Security Middleware
 * Provides comprehensive security headers and protection mechanisms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '../config/env-validation';

// Security headers configuration
export interface SecurityHeaders {
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security'?: string;
  'Content-Security-Policy'?: string;
  'X-DNS-Prefetch-Control': string;
  'X-Download-Options': string;
  'X-Permitted-Cross-Domain-Policies': string;
}

/**
 * Generate Content Security Policy directives
 * @param nonce Optional nonce for inline scripts
 * @returns CSP header value
 */
export function generateCSP(nonce?: string): string {
  const config = getConfig();
  const isDev = config.NODE_ENV === 'development';
  
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      isDev ? "'unsafe-eval'" : '', // Allow eval in development only
      nonce ? `'nonce-${nonce}'` : '',
      'https://cdn.jsdelivr.net', // For third-party libraries if needed
    ].filter(Boolean),
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for some CSS-in-JS solutions
      'https://fonts.googleapis.com',
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:', // Allow HTTPS images
    ],
    'connect-src': [
      "'self'",
      config.API_URL || '',
      config.WEBSOCKET_URL || '',
      isDev ? 'ws://localhost:*' : '',
      isDev ? 'http://localhost:*' : '',
    ].filter(Boolean),
    'media-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'child-src': ["'self'", 'blob:'],
    'frame-src': ["'self'"],
    'frame-ancestors': ["'self'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'manifest-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'upgrade-insecure-requests': isDev ? [] : [''],
  };
  
  // Build CSP string
  return Object.entries(directives)
    .filter(([_, values]) => values.length > 0)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');
}

/**
 * Generate security headers based on configuration
 * @param request The incoming request
 * @returns Security headers object
 */
export function generateSecurityHeaders(request: NextRequest): SecurityHeaders {
  const config = getConfig();
  const isProduction = config.NODE_ENV === 'production';
  
  const headers: SecurityHeaders = {
    // Prevent clickjacking attacks
    'X-Frame-Options': 'SAMEORIGIN',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Enable XSS filter in older browsers
    'X-XSS-Protection': '1; mode=block',
    
    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy (formerly Feature Policy)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', '),
    
    // DNS prefetch control
    'X-DNS-Prefetch-Control': 'on',
    
    // IE specific: prevent downloads from opening
    'X-Download-Options': 'noopen',
    
    // Adobe products cross-domain policy
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
  
  // Add HSTS header in production
  if (isProduction) {
    headers['Strict-Transport-Security'] = `max-age=${config.HSTS_MAX_AGE}; includeSubDomains; preload`;
  }
  
  // Add CSP header if enabled
  if (config.CSP_ENABLED) {
    headers['Content-Security-Policy'] = generateCSP();
  }
  
  return headers;
}

/**
 * Apply CORS configuration to response
 * @param request The incoming request
 * @param response The response to modify
 * @returns Modified response with CORS headers
 */
export function applyCORS(request: NextRequest, response: NextResponse): NextResponse {
  const config = getConfig();
  const origin = request.headers.get('origin');
  
  // Get allowed origins
  const allowedOrigins = config.CORS_ALLOWED_ORIGINS || [config.APP_URL, config.NEXTAUTH_URL].filter(Boolean);
  
  // Check if origin is allowed
  if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (!origin && config.NODE_ENV === 'development') {
    // Allow requests without origin in development (e.g., Postman)
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  // Set other CORS headers
  response.headers.set('Access-Control-Allow-Methods', config.CORS_ALLOWED_METHODS);
  response.headers.set('Access-Control-Allow-Headers', config.CORS_ALLOWED_HEADERS || 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  if (config.CORS_CREDENTIALS) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  return response;
}

/**
 * Check if request path should be rate limited
 * @param pathname Request path
 * @returns True if path should be rate limited
 */
export function shouldRateLimit(pathname: string): boolean {
  // Paths that should always be rate limited
  const rateLimitPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/mfa/verify',
    '/api/crisis/assess',
    '/api/files/upload',
  ];
  
  // Check if path matches any rate limit pattern
  return rateLimitPaths.some(path => pathname.startsWith(path));
}

/**
 * Check if request requires CSRF protection
 * @param request The incoming request
 * @returns True if CSRF protection is required
 */
export function requiresCSRF(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  const contentType = request.headers.get('content-type') || '';
  
  // CSRF protection needed for state-changing methods
  const stateMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  // Skip CSRF for certain content types (APIs)
  const skipContentTypes = ['application/json', 'multipart/form-data'];
  
  return (
    stateMethods.includes(method) &&
    !skipContentTypes.some(type => contentType.includes(type))
  );
}

/**
 * Sanitize request headers
 * @param headers Request headers
 * @returns Sanitized headers
 */
export function sanitizeHeaders(headers: Headers): Headers {
  const sanitized = new Headers(headers);
  
  // Remove potentially dangerous headers
  const dangerousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url',
  ];
  
  dangerousHeaders.forEach(header => {
    sanitized.delete(header);
  });
  
  return sanitized;
}

/**
 * Apply security enhancements to middleware response
 * @param request The incoming request
 * @param response The response to enhance
 * @returns Enhanced response with security headers
 */
export function enhanceSecurityResponse(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  // Apply security headers
  const securityHeaders = generateSecurityHeaders(request);
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Apply CORS if needed
  if (request.method === 'OPTIONS' || request.headers.get('origin')) {
    response = applyCORS(request, response);
  }
  
  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-Id', requestId);
  
  // Add response time header
  response.headers.set('X-Response-Time', Date.now().toString());
  
  // Remove sensitive headers from response
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');
  
  return response;
}

/**
 * Create a security-enhanced middleware wrapper
 * @param handler The original middleware handler
 * @returns Enhanced middleware handler
 */
export function withSecurity(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    try {
      // Sanitize incoming headers
      const sanitizedHeaders = sanitizeHeaders(request.headers);
      
      // Create new request with sanitized headers
      const sanitizedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: sanitizedHeaders,
        body: request.body,
      });
      
      // Call original handler
      const response = await handler(sanitizedRequest);
      
      // Enhance response with security headers
      return enhanceSecurityResponse(request, response);
    } catch (error) {
      // Log error securely (without exposing sensitive data)
      console.error('Middleware error:', {
        path: request.nextUrl.pathname,
        method: request.method,
        timestamp: new Date().toISOString(),
      });
      
      // Return generic error response
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  };
}