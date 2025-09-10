import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

interface SessionData {
  userId: string;
  role: string;
  lastActivity: number;
  createdAt: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

interface SessionOptions {
  maxAge?: number; // Maximum session age in milliseconds
  activityTimeout?: number; // Inactivity timeout in milliseconds
  maxSessions?: number; // Maximum concurrent sessions per user
  secure?: boolean; // Require secure connections
}

/**
 * Secure session management system with automatic cleanup and concurrent session control
 * Implements timeout-based expiry, IP/User-Agent validation, and session limiting
 * Essential for maintaining secure user authentication state
 */
export class SessionManager {
  private sessions: LRUCache<string, SessionData>;
  private userSessions: Map<string, Set<string>>;
  private options: Required<SessionOptions>;

  /**
   * Initialize session manager with security options
   * @param {SessionOptions} [options={}] - Configuration options for session management
   * @param {number} [options.maxAge=24*60*60*1000] - Maximum session age in milliseconds (default: 24 hours)
   * @param {number} [options.activityTimeout=30*60*1000] - Inactivity timeout in milliseconds (default: 30 minutes)
   * @param {number} [options.maxSessions=5] - Maximum concurrent sessions per user
   * @param {boolean} [options.secure=true] - Enable IP/User-Agent validation for security
   */
  constructor(options: SessionOptions = {}) {
    this.options = {
      maxAge: options.maxAge || 24 * 60 * 60 * 1000, // 24 hours
      activityTimeout: options.activityTimeout || 30 * 60 * 1000, // 30 minutes
      maxSessions: options.maxSessions || 5,
      secure: options.secure ?? true
    };

    this.sessions = new LRUCache<string, SessionData>({
      max: 10000,
      ttl: this.options.maxAge
    });

    this.userSessions = new Map();
  }

  /**
   * Create new authenticated session for user
   * Automatically enforces session limits and generates secure session ID
   * @param {string} userId - User ID for the session
   * @param {string} role - User role/permission level
   * @param {string} [ipAddress] - Client IP address for security validation
   * @param {string} [userAgent] - Client user agent for security validation
   * @param {Record<string, any>} [metadata] - Additional session metadata
   * @returns {string} Generated session ID
   * @example
   * ```typescript
   * const sessionId = sessionManager.createSession(
   *   'user_123',
   *   'patient',
   *   '192.168.1.1',
   *   'Mozilla/5.0...',
   *   { loginMethod: 'password' }
   * );
   * ```
   */
  createSession(
    userId: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>
  ): string {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const sessionData: SessionData = {
      userId,
      role,
      lastActivity: now,
      createdAt: now,
      ...(ipAddress && { ipAddress }),
      ...(userAgent && { userAgent }),
      ...(metadata && { metadata })
    };

    // Manage concurrent sessions
    this.enforceSessionLimit(userId);

    // Store session
    this.sessions.set(sessionId, sessionData);

    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    return sessionId;
  }

  /**
   * Retrieve and validate session data
   * Automatically checks for timeout and updates last activity
   * @param {string} sessionId - Session ID to retrieve
   * @returns {SessionData | null} Session data if valid, null if expired or not found
   * @example
   * ```typescript
   * const session = sessionManager.getSession('abc123');
   * if (session) {
   *   console.log('User:', session.userId);
   * }
   * ```
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    const now = Date.now();

    // Check for inactivity timeout
    if (now - session.lastActivity > this.options.activityTimeout) {
      this.destroySession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Validate session with enhanced security checks
   * Verifies IP address and User-Agent consistency when secure mode is enabled
   * @param {string} sessionId - Session ID to validate
   * @param {string} [ipAddress] - Current client IP for validation
   * @param {string} [userAgent] - Current client user agent for validation
   * @returns {boolean} True if session is valid and secure
   * @example
   * ```typescript
   * const isValid = sessionManager.validateSession(
   *   'abc123',
   *   request.ip,
   *   request.headers['user-agent']
   * );
   * ```
   */
  validateSession(sessionId: string, ipAddress?: string, userAgent?: string): boolean {
    const session = this.getSession(sessionId);

    if (!session) {
      return false;
    }

    // Validate IP address if provided and stored
    if (this.options.secure && session.ipAddress && ipAddress) {
      if (session.ipAddress !== ipAddress) {
        console.warn(`Session ${sessionId} IP mismatch: ${session.ipAddress} !== ${ipAddress}`);
        this.destroySession(sessionId);
        return false;
      }
    }

    // Validate user agent if provided and stored
    if (this.options.secure && session.userAgent && userAgent) {
      if (session.userAgent !== userAgent) {
        console.warn(`Session ${sessionId} User-Agent mismatch`);
        this.destroySession(sessionId);
        return false;
      }
    }

    return true;
  }

  /**
   * Renew session to extend its lifetime
   * Resets the TTL and updates last activity timestamp
   * @param {string} sessionId - Session ID to renew
   * @returns {boolean} True if session was successfully renewed
   * @example
   * ```typescript
   * const renewed = sessionManager.renewSession('abc123');
   * if (renewed) {
   *   console.log('Session renewed successfully');
   * }
   * ```
   */
  renewSession(sessionId: string): boolean {
    const session = this.getSession(sessionId);

    if (!session) {
      return false;
    }

    const now = Date.now();
    session.lastActivity = now;

    // Reset TTL
    this.sessions.delete(sessionId);
    this.sessions.set(sessionId, session);

    return true;
  }

  /**
   * Destroy specific session and clean up tracking
   * Removes session from all internal data structures
   * @param {string} sessionId - Session ID to destroy
   * @returns {boolean} True if session was found and destroyed
   * @example
   * ```typescript
   * const destroyed = sessionManager.destroySession('abc123');
   * if (destroyed) {
   *   console.log('Session logged out successfully');
   * }
   * ```
   */
  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    // Remove from sessions cache
    this.sessions.delete(sessionId);

    // Remove from user sessions tracking
    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    return true;
  }

  /**
   * Destroy all sessions for a specific user
   * Useful for forced logout or security incidents
   * @param {string} userId - User ID whose sessions to destroy
   * @returns {number} Number of sessions destroyed
   * @example
   * ```typescript
   * const count = sessionManager.destroyUserSessions('user_123');
   * console.log(`Destroyed ${count} sessions for user`);
   * ```
   */
  destroyUserSessions(userId: string): number {
    const sessionIds = this.userSessions.get(userId);

    if (!sessionIds) {
      return 0;
    }

    let count = 0;
    for (const sessionId of sessionIds) {
      if (this.destroySession(sessionId)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get all active sessions for a user
   * Returns current session data for session management UI
   * @param {string} userId - User ID to get sessions for
   * @returns {SessionData[]} Array of active session data
   * @example
   * ```typescript
   * const sessions = sessionManager.getUserSessions('user_123');
   * console.log(`User has ${sessions.length} active sessions`);
   * ```
   */
  getUserSessions(userId: string): SessionData[] {
    const sessionIds = this.userSessions.get(userId);

    if (!sessionIds) {
      return [];
    }

    const sessions: SessionData[] = [];
    for (const sessionId of sessionIds) {
      const session = this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Enforce maximum concurrent session limit per user
   * Removes oldest session when limit is exceeded
   * @private
   * @param {string} userId - User ID to enforce limits for
   */
  private enforceSessionLimit(userId: string): void {
    const sessionIds = this.userSessions.get(userId);

    if (!sessionIds || sessionIds.size < this.options.maxSessions) {
      return;
    }

    // Find and remove oldest session
    let oldestSessionId: string | null = null;
    let oldestTime = Date.now();

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && session.createdAt < oldestTime) {
        oldestTime = session.createdAt;
        oldestSessionId = sessionId;
      }
    }

    if (oldestSessionId) {
      this.destroySession(oldestSessionId);
    }
  }

  /**
   * Generate cryptographically secure session ID
   * Uses 32 random bytes converted to hexadecimal
   * @private
   * @returns {string} Secure session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Clean up expired sessions based on activity timeout
   * Should be called periodically to maintain system performance
   * @example
   * ```typescript
   * // Clean up expired sessions every 5 minutes
   * setInterval(() => sessionManager.cleanup(), 5 * 60 * 1000);
   * ```
   */
  cleanup(): void {
    const now = Date.now();
    const sessionIds = [...this.sessions.keys()];

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && now - session.lastActivity > this.options.activityTimeout) {
        this.destroySession(sessionId);
      }
    }
  }

  /**
   * Get session statistics for monitoring and analysis
   * Provides insights into system usage and session patterns
   * @returns {Object} Session statistics
   * @returns {number} returns.totalSessions - Total number of active sessions
   * @returns {number} returns.uniqueUsers - Number of unique users with active sessions
   * @returns {number} returns.averageSessionAge - Average session age in milliseconds
   * @example
   * ```typescript
   * const stats = sessionManager.getStats();
   * console.log(`${stats.totalSessions} active sessions from ${stats.uniqueUsers} users`);
   * ```
   */
  getStats(): {
    totalSessions: number;
    uniqueUsers: number;
    averageSessionAge: number;
  } {
    const sessions = [...this.sessions.values()];
    const now = Date.now();

    const totalSessions = sessions.length;
    const uniqueUsers = this.userSessions.size;

    const averageSessionAge =
      sessions.length > 0
        ? sessions.reduce((sum, session) => sum + (now - session.createdAt), 0) / sessions.length
        : 0;

    return {
      totalSessions,
      uniqueUsers,
      averageSessionAge
    };
  }
}

/**
 * Pre-configured session manager instance with production-ready settings
 * Automatically configured based on environment variables
 * @example
 * ```typescript
 * import { sessionManager } from '@/lib/security/session';
 *
 * // Create session
 * const sessionId = sessionManager.createSession('user_123', 'patient');
 *
 * // Validate session
 * const session = sessionManager.getSession(sessionId);
 * ```
 */
export const sessionManager = new SessionManager({
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  activityTimeout: parseInt(process.env['SESSION_TIMEOUT_MINUTES'] || '30') * 60 * 1000,
  maxSessions: 5,
  secure: process.env['NODE_ENV'] === 'production'
});
