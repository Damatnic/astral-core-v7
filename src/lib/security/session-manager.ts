/**
 * Enhanced Session Management System
 * Provides secure session handling with additional protections
 * Implements session fixation prevention, secure cookies, and session monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getConfig } from '@/lib/config/env-validation';
import crypto from 'crypto';
import { z } from 'zod';

// Session configuration
export interface SessionConfig {
  maxAge: number; // Maximum session age in seconds
  updateAge: number; // Session update interval in seconds
  sameSite: 'strict' | 'lax' | 'none';
  secure: boolean;
  httpOnly: boolean;
  domain?: string;
  path: string;
}

// Session data schema
const sessionDataSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: z.enum(['CLIENT', 'THERAPIST', 'ADMIN', 'SUPERVISOR']),
  mfaVerified: z.boolean().optional(),
  lastActivity: z.number(),
  createdAt: z.number(),
  ipAddress: z.string(),
  userAgent: z.string(),
  fingerprint: z.string(),
  trustDevice: z.boolean().optional(),
});

export type SessionData = z.infer<typeof sessionDataSchema>;

// Active sessions store (in production, use Redis or database)
const activeSessions = new Map<string, SessionData>();

// Session blacklist for revoked sessions
const blacklistedSessions = new Set<string>();

/**
 * Get session configuration based on environment
 * @returns Session configuration
 */
export function getSessionConfig(): SessionConfig {
  const config = getConfig();
  const isProduction = config.NODE_ENV === 'production';
  
  return {
    maxAge: config.SESSION_MAX_AGE || 86400, // 24 hours
    updateAge: config.SESSION_UPDATE_AGE || 3600, // 1 hour
    sameSite: isProduction ? 'strict' : 'lax',
    secure: isProduction,
    httpOnly: true,
    domain: isProduction ? new URL(config.APP_URL || '').hostname : undefined,
    path: '/',
  };
}

/**
 * Generate secure session ID
 * @returns Cryptographically secure session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate device fingerprint for session binding
 * @param request The incoming request
 * @returns Device fingerprint
 */
export function generateFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const ip = getClientIp(request);
  
  // Create fingerprint from stable browser characteristics
  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${ip}`;
  
  return crypto
    .createHash('sha256')
    .update(fingerprintData)
    .digest('hex')
    .substring(0, 32);
}

/**
 * Get client IP address
 * @param request The incoming request
 * @returns Client IP
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.ip || '127.0.0.1';
}

/**
 * Create new session
 * @param userData User data for session
 * @param request The incoming request
 * @returns Session ID and cookie
 */
export async function createSession(
  userData: {
    userId: string;
    email: string;
    role: string;
    mfaVerified?: boolean;
  },
  request: NextRequest
): Promise<{ sessionId: string; cookie: string }> {
  const sessionId = generateSessionId();
  const config = getSessionConfig();
  const fingerprint = generateFingerprint(request);
  
  // Create session data
  const sessionData: SessionData = {
    userId: userData.userId,
    email: userData.email,
    role: userData.role as SessionData['role'],
    mfaVerified: userData.mfaVerified,
    lastActivity: Date.now(),
    createdAt: Date.now(),
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent') || '',
    fingerprint,
    trustDevice: false,
  };
  
  // Validate session data
  const validated = sessionDataSchema.parse(sessionData);
  
  // Store session
  activeSessions.set(sessionId, validated);
  
  // Create secure cookie
  const cookieOptions = [
    `session=${sessionId}`,
    `Max-Age=${config.maxAge}`,
    `Path=${config.path}`,
    config.httpOnly && 'HttpOnly',
    config.secure && 'Secure',
    `SameSite=${config.sameSite}`,
    config.domain && `Domain=${config.domain}`,
  ].filter(Boolean).join('; ');
  
  return {
    sessionId,
    cookie: cookieOptions,
  };
}

/**
 * Validate session
 * @param sessionId Session ID to validate
 * @param request The incoming request
 * @returns Session data if valid, null otherwise
 */
export async function validateSession(
  sessionId: string,
  request: NextRequest
): Promise<SessionData | null> {
  // Check if session is blacklisted
  if (blacklistedSessions.has(sessionId)) {
    return null;
  }
  
  // Get session data
  const session = activeSessions.get(sessionId);
  if (!session) {
    return null;
  }
  
  const config = getSessionConfig();
  
  // Check session age
  const sessionAge = (Date.now() - session.createdAt) / 1000;
  if (sessionAge > config.maxAge) {
    activeSessions.delete(sessionId);
    return null;
  }
  
  // Check session inactivity
  const inactivityPeriod = (Date.now() - session.lastActivity) / 1000;
  const maxInactivity = 30 * 60; // 30 minutes
  if (inactivityPeriod > maxInactivity) {
    activeSessions.delete(sessionId);
    return null;
  }
  
  // Verify fingerprint (unless device is trusted)
  if (!session.trustDevice) {
    const currentFingerprint = generateFingerprint(request);
    if (session.fingerprint !== currentFingerprint) {
      // Fingerprint mismatch - possible session hijacking
      console.warn('Session fingerprint mismatch:', {
        sessionId,
        expected: session.fingerprint,
        actual: currentFingerprint,
      });
      
      // In production, you might want to alert the user
      // For now, invalidate the session
      activeSessions.delete(sessionId);
      blacklistedSessions.add(sessionId);
      return null;
    }
  }
  
  // Update last activity
  session.lastActivity = Date.now();
  activeSessions.set(sessionId, session);
  
  return session;
}

/**
 * Refresh session
 * @param sessionId Session ID to refresh
 * @returns New session ID and cookie
 */
export async function refreshSession(sessionId: string): Promise<{
  sessionId: string;
  cookie: string;
} | null> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return null;
  }
  
  const config = getSessionConfig();
  
  // Generate new session ID (prevent fixation)
  const newSessionId = generateSessionId();
  
  // Move session to new ID
  activeSessions.delete(sessionId);
  activeSessions.set(newSessionId, {
    ...session,
    lastActivity: Date.now(),
  });
  
  // Blacklist old session ID
  blacklistedSessions.add(sessionId);
  
  // Create new cookie
  const cookieOptions = [
    `session=${newSessionId}`,
    `Max-Age=${config.maxAge}`,
    `Path=${config.path}`,
    config.httpOnly && 'HttpOnly',
    config.secure && 'Secure',
    `SameSite=${config.sameSite}`,
    config.domain && `Domain=${config.domain}`,
  ].filter(Boolean).join('; ');
  
  return {
    sessionId: newSessionId,
    cookie: cookieOptions,
  };
}

/**
 * Destroy session
 * @param sessionId Session ID to destroy
 */
export async function destroySession(sessionId: string): Promise<void> {
  activeSessions.delete(sessionId);
  blacklistedSessions.add(sessionId);
}

/**
 * Destroy all sessions for a user
 * @param userId User ID
 */
export async function destroyUserSessions(userId: string): Promise<void> {
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(sessionId);
      blacklistedSessions.add(sessionId);
    }
  }
}

/**
 * Get all active sessions for a user
 * @param userId User ID
 * @returns Array of session data
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  const sessions: SessionData[] = [];
  
  for (const session of activeSessions.values()) {
    if (session.userId === userId) {
      sessions.push(session);
    }
  }
  
  return sessions;
}

/**
 * Trust device for session
 * @param sessionId Session ID
 * @param trust Whether to trust the device
 */
export async function trustDevice(sessionId: string, trust: boolean): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.trustDevice = trust;
    activeSessions.set(sessionId, session);
  }
}

/**
 * Clean up expired sessions
 * Should be run periodically (e.g., every hour)
 */
export async function cleanupSessions(): Promise<void> {
  const config = getSessionConfig();
  const now = Date.now();
  
  for (const [sessionId, session] of activeSessions.entries()) {
    const sessionAge = (now - session.createdAt) / 1000;
    const inactivityPeriod = (now - session.lastActivity) / 1000;
    
    if (sessionAge > config.maxAge || inactivityPeriod > 30 * 60) {
      activeSessions.delete(sessionId);
      blacklistedSessions.add(sessionId);
    }
  }
  
  // Clean up old blacklisted sessions (keep for 24 hours)
  // In production, store blacklist in database with timestamps
}

/**
 * Session monitoring and analytics
 * @returns Session statistics
 */
export function getSessionStats(): {
  totalActive: number;
  byRole: Record<string, number>;
  averageAge: number;
  suspiciousActivity: number;
} {
  const stats = {
    totalActive: activeSessions.size,
    byRole: {} as Record<string, number>,
    averageAge: 0,
    suspiciousActivity: 0,
  };
  
  let totalAge = 0;
  const now = Date.now();
  
  for (const session of activeSessions.values()) {
    // Count by role
    stats.byRole[session.role] = (stats.byRole[session.role] || 0) + 1;
    
    // Calculate age
    totalAge += (now - session.createdAt) / 1000;
    
    // Check for suspicious activity
    // (e.g., rapid IP changes, unusual patterns)
  }
  
  stats.averageAge = activeSessions.size > 0 ? totalAge / activeSessions.size : 0;
  
  return stats;
}

/**
 * Apply session security to response
 * @param request The incoming request
 * @param response The response
 * @returns Response with session security headers
 */
export function applySessionSecurity(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const config = getSessionConfig();
  
  // Add session security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Set cookie security attributes
  const cookies = response.headers.get('set-cookie');
  if (cookies && cookies.includes('session=')) {
    const secureCookie = cookies
      .split(';')
      .map(part => part.trim())
      .concat([
        config.httpOnly && 'HttpOnly',
        config.secure && 'Secure',
        `SameSite=${config.sameSite}`,
      ].filter(Boolean))
      .join('; ');
    
    response.headers.set('set-cookie', secureCookie);
  }
  
  return response;
}

// Set up periodic cleanup
if (typeof window === 'undefined') {
  // Server-side only
  setInterval(cleanupSessions, 60 * 60 * 1000); // Run every hour
}