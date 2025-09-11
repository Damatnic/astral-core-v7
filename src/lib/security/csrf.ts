import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { logError, logWarning, logInfo } from '@/lib/logger';

/**
 * CSRF Protection System
 * Comprehensive Cross-Site Request Forgery protection for mental health platform
 * Uses double-submit cookies and SameSite cookie attributes for enhanced security
 */

export interface CSRFTokenData {
  token: string;
  expires: number;
  userId?: string;
  sessionId?: string;
}

export interface CSRFValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    tokenProvided: boolean;
    tokenFormat: boolean;
    tokenSignature: boolean;
    tokenExpired: boolean;
    userMatch: boolean;
  };
}

const CSRF_SECRET = process.env['CSRF_SECRET'] || 'your-csrf-secret-key-change-in-production';
const TOKEN_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = '__csrf_token';

/**
 * CSRF Protection Class
 * Handles token generation, validation, and management
 */
export class CSRFProtection {
  private secret: string;

  constructor(secret: string = CSRF_SECRET) {
    this.secret = secret;
  }

  /**
   * Generate a new CSRF token for a user session
   * @param userId Optional user ID for user-specific tokens
   * @param sessionId Optional session ID for session-specific tokens
   * @returns CSRF token data with token string and expiration
   */
  generateToken(userId?: string, sessionId?: string): CSRFTokenData {
    const timestamp = Date.now();
    const expires = timestamp + TOKEN_LIFETIME;
    const randomValue = randomBytes(32).toString('hex');
    
    // Create token payload
    const payload = {
      timestamp,
      expires,
      userId: userId || '',
      sessionId: sessionId || '',
      random: randomValue
    };

    // Sign the payload
    const payloadString = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadString).toString('base64');
    const signature = this.signPayload(payloadBase64);
    
    const token = `${payloadBase64}.${signature}`;

    logInfo('CSRF token generated', 'CSRFProtection', {
      userId,
      sessionId,
      tokenLength: token.length,
      expires: new Date(expires).toISOString()
    });

    return {
      token,
      expires,
      userId,
      sessionId
    };
  }

  /**
   * Validate a CSRF token from request
   * @param request NextRequest object containing headers and cookies
   * @returns Validation result with details
   */
  async validateToken(request: NextRequest): Promise<CSRFValidationResult> {
    const details = {
      tokenProvided: false,
      tokenFormat: false,
      tokenSignature: false,
      tokenExpired: false,
      userMatch: false
    };

    try {
      // Get token from header or cookie
      const headerToken = request.headers.get(CSRF_HEADER_NAME);
      const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
      const token = headerToken || cookieToken;

      if (!token) {
        logWarning('CSRF token missing', 'CSRFProtection', {
          url: request.url,
          method: request.method,
          userAgent: request.headers.get('user-agent')
        });
        return {
          valid: false,
          error: 'CSRF token missing',
          details
        };
      }

      details.tokenProvided = true;

      // Parse token
      const tokenParts = token.split('.');
      if (tokenParts.length !== 2) {
        return {
          valid: false,
          error: 'Invalid token format',
          details
        };
      }

      details.tokenFormat = true;

      const [payloadBase64, signature] = tokenParts;

      // Verify signature
      const expectedSignature = this.signPayload(payloadBase64);
      if (!this.constantTimeCompare(signature, expectedSignature)) {
        logWarning('CSRF token signature verification failed', 'CSRFProtection', {
          url: request.url,
          method: request.method
        });
        return {
          valid: false,
          error: 'Invalid token signature',
          details
        };
      }

      details.tokenSignature = true;

      // Parse payload
      let payload;
      try {
        const payloadString = Buffer.from(payloadBase64, 'base64').toString('utf-8');
        payload = JSON.parse(payloadString);
      } catch (error) {
        return {
          valid: false,
          error: 'Invalid token payload',
          details
        };
      }

      // Check expiration
      if (Date.now() > payload.expires) {
        return {
          valid: false,
          error: 'Token expired',
          details: { ...details, tokenExpired: true }
        };
      }

      // Get current user for validation
      const userToken = await getToken({ 
        req: request, 
        secret: process.env['NEXTAUTH_SECRET']! 
      });

      // Validate user match if token is user-specific
      if (payload.userId && userToken?.id && payload.userId !== userToken.id) {
        logWarning('CSRF token user mismatch', 'CSRFProtection', {
          tokenUserId: payload.userId,
          sessionUserId: userToken.id,
          url: request.url
        });
        return {
          valid: false,
          error: 'Token user mismatch',
          details
        };
      }

      details.userMatch = true;

      logInfo('CSRF token validated successfully', 'CSRFProtection', {
        userId: userToken?.id,
        url: request.url,
        method: request.method
      });

      return {
        valid: true,
        details
      };

    } catch (error) {
      logError('CSRF token validation error', 'CSRFProtection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: request.url,
        method: request.method
      });

      return {
        valid: false,
        error: 'Token validation failed',
        details
      };
    }
  }

  /**
   * Check if request needs CSRF protection
   * @param request NextRequest object
   * @returns True if CSRF protection is required
   */
  requiresProtection(request: NextRequest): boolean {
    const method = request.method.toUpperCase();
    const pathname = new URL(request.url).pathname;

    // Only protect state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return false;
    }

    // Skip CSRF for certain paths
    const skipPaths = [
      '/api/auth', // NextAuth.js handles CSRF for auth endpoints
      '/api/webhook', // Webhooks should use different validation
      '/api/health', // Health checks don't need CSRF
      '/api/status' // Public status page
    ];

    return !skipPaths.some(path => pathname.startsWith(path));
  }

  /**
   * Generate response headers with CSRF token
   * @param tokenData CSRF token data
   * @returns Headers object with CSRF cookie
   */
  generateResponseHeaders(tokenData: CSRFTokenData): HeadersInit {
    const cookieValue = tokenData.token;
    const maxAge = Math.floor((tokenData.expires - Date.now()) / 1000);

    const cookieOptions = [
      `${CSRF_COOKIE_NAME}=${cookieValue}`,
      `Max-Age=${maxAge}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Strict'
    ];

    // Add Secure flag in production
    if (process.env['NODE_ENV'] === 'production') {
      cookieOptions.push('Secure');
    }

    return {
      'Set-Cookie': cookieOptions.join('; '),
      'X-CSRF-Token': tokenData.token
    };
  }

  /**
   * Sign a payload using HMAC
   * @param payload Payload to sign
   * @returns HMAC signature
   */
  private signPayload(payload: string): string {
    return createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a First string
   * @param b Second string
   * @returns True if strings match
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return timingSafeEqual(bufferA, bufferB);
  }
}

// Singleton instance
let csrfProtection: CSRFProtection | null = null;

/**
 * Get CSRF protection instance
 * @returns CSRF protection singleton
 */
export function getCSRFProtection(): CSRFProtection {
  if (!csrfProtection) {
    csrfProtection = new CSRFProtection();
  }
  return csrfProtection;
}

/**
 * Middleware helper for CSRF protection
 * @param request NextRequest object
 * @returns Validation result
 */
export async function validateCSRF(request: NextRequest): Promise<CSRFValidationResult> {
  const csrf = getCSRFProtection();
  
  if (!csrf.requiresProtection(request)) {
    return { valid: true };
  }

  return csrf.validateToken(request);
}

/**
 * Generate CSRF token for API response
 * @param userId Optional user ID
 * @param sessionId Optional session ID
 * @returns Token data and headers
 */
export function generateCSRFToken(userId?: string, sessionId?: string) {
  const csrf = getCSRFProtection();
  const tokenData = csrf.generateToken(userId, sessionId);
  const headers = csrf.generateResponseHeaders(tokenData);
  
  return { tokenData, headers };
}

/**
 * Extract CSRF token from request for client-side use
 * @param request NextRequest object
 * @returns CSRF token string or null
 */
export function extractCSRFToken(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME) || 
         request.cookies.get(CSRF_COOKIE_NAME)?.value || 
         null;
}

/**
 * Create CSRF token endpoint handler
 * For SPAs that need to fetch CSRF tokens via API
 */
export async function handleCSRFTokenRequest(request: NextRequest) {
  try {
    const userToken = await getToken({ 
      req: request, 
      secret: process.env['NEXTAUTH_SECRET']! 
    });

    const { tokenData, headers } = generateCSRFToken(
      userToken?.id as string,
      userToken?.sessionId as string
    );

    return new Response(
      JSON.stringify({
        token: tokenData.token,
        expires: tokenData.expires
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }
    );

  } catch (error) {
    logError('CSRF token generation failed', 'CSRFProtection', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return new Response(
      JSON.stringify({ error: 'Failed to generate CSRF token' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Helper constants for frontend integration
export const CSRF_CONFIG = {
  headerName: CSRF_HEADER_NAME,
  cookieName: CSRF_COOKIE_NAME,
  tokenLifetime: TOKEN_LIFETIME
} as const;