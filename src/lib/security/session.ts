import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

interface SessionData {
  userId: string;
  role: string;
  lastActivity: number;
  createdAt: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface SessionOptions {
  maxAge?: number; // Maximum session age in milliseconds
  activityTimeout?: number; // Inactivity timeout in milliseconds
  maxSessions?: number; // Maximum concurrent sessions per user
  secure?: boolean; // Require secure connections
}

export class SessionManager {
  private sessions: LRUCache<string, SessionData>;
  private userSessions: Map<string, Set<string>>;
  private options: Required<SessionOptions>;

  constructor(options: SessionOptions = {}) {
    this.options = {
      maxAge: options.maxAge || 24 * 60 * 60 * 1000, // 24 hours
      activityTimeout: options.activityTimeout || 30 * 60 * 1000, // 30 minutes
      maxSessions: options.maxSessions || 5,
      secure: options.secure ?? true,
    };

    this.sessions = new LRUCache<string, SessionData>({
      max: 10000,
      ttl: this.options.maxAge,
    });

    this.userSessions = new Map();
  }

  createSession(
    userId: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
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
      ...(metadata && { metadata }),
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

  validateSession(
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): boolean {
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

  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

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

  getStats(): {
    totalSessions: number;
    uniqueUsers: number;
    averageSessionAge: number;
  } {
    const sessions = [...this.sessions.values()];
    const now = Date.now();

    const totalSessions = sessions.length;
    const uniqueUsers = this.userSessions.size;
    
    const averageSessionAge = sessions.length > 0
      ? sessions.reduce((sum, session) => sum + (now - session.createdAt), 0) / sessions.length
      : 0;

    return {
      totalSessions,
      uniqueUsers,
      averageSessionAge,
    };
  }
}

export const sessionManager = new SessionManager({
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  activityTimeout: parseInt(process.env['SESSION_TIMEOUT_MINUTES'] || '30') * 60 * 1000,
  maxSessions: 5,
  secure: process.env['NODE_ENV'] === 'production',
});