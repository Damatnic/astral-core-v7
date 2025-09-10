/**
 * Development-only logging utility for Astral Core v7
 * Provides safe console logging that only works in development mode
 * and automatically removes sensitive data
 */

import { logger } from './logger';

class DevLogger {
  private static instance: DevLogger;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  public static getInstance(): DevLogger {
    if (!DevLogger.instance) {
      DevLogger.instance = new DevLogger();
    }
    return DevLogger.instance;
  }

  // Safe console.log replacement - only works in development
  public log(...args: any[]): void {
    if (this.isDevelopment) {
      const sanitizedArgs = this.sanitizeArgs(args);
      console.log('[DEV]', ...sanitizedArgs);
    }
  }

  // Safe console.error replacement - uses structured logging in production
  public error(message: string, error?: Error, context?: string, ...args: any[]): void {
    if (this.isDevelopment) {
      const sanitizedArgs = this.sanitizeArgs(args);
      console.error('[DEV]', message, error, ...sanitizedArgs);
    } else {
      // Use structured logging in production
      logger.error(message, context || 'dev-logger', { args: this.sanitizeArgs(args) }, error);
    }
  }

  // Safe console.warn replacement
  public warn(message: string, context?: string, ...args: any[]): void {
    if (this.isDevelopment) {
      const sanitizedArgs = this.sanitizeArgs(args);
      console.warn('[DEV]', message, ...sanitizedArgs);
    } else {
      logger.warn(message, context || 'dev-logger', { args: this.sanitizeArgs(args) });
    }
  }

  // Safe console.info replacement
  public info(message: string, context?: string, ...args: any[]): void {
    if (this.isDevelopment) {
      const sanitizedArgs = this.sanitizeArgs(args);
      console.info('[DEV]', message, ...sanitizedArgs);
    } else {
      logger.info(message, context || 'dev-logger', { args: this.sanitizeArgs(args) });
    }
  }

  // Debug logging with additional context
  public debug(message: string, data?: any, context?: string): void {
    if (this.isDevelopment) {
      const sanitizedData = this.sanitizeData(data);
      console.debug('[DEV DEBUG]', message, sanitizedData);
    } else {
      logger.debug(message, context || 'dev-logger', { data: this.sanitizeData(data) });
    }
  }

  // Performance timing helper
  public time(label: string): void {
    if (this.isDevelopment) {
      console.time(`[DEV] ${label}`);
    }
  }

  public timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(`[DEV] ${label}`);
    }
  }

  // Group logging for better organization
  public group(label: string): void {
    if (this.isDevelopment) {
      console.group(`[DEV] ${label}`);
    }
  }

  public groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  // Table logging for structured data
  public table(data: any): void {
    if (this.isDevelopment) {
      const sanitizedData = this.sanitizeData(data);
      console.table(sanitizedData);
    }
  }

  private sanitizeArgs(args: any[]): any[] {
    return args.map(arg => this.sanitizeData(arg));
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    // Fields that should never be logged
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'auth',
      'credential',
      'ssn',
      'socialSecurityNumber',
      'creditCard',
      'ccNumber',
      'cvv',
      'pin',
      'privateKey',
      'sessionId',
      'refreshToken',
      'accessToken',
      'apiKey'
    ];

    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          sanitized[key] = sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };

    return sanitize(data);
  }
}

// Export singleton instance
export const devLogger = DevLogger.getInstance();

// Convenience functions for easy migration from console statements
export const devLog = (...args: any[]) => devLogger.log(...args);
export const devError = (message: string, error?: Error, context?: string, ...args: any[]) =>
  devLogger.error(message, error, context, ...args);
export const devWarn = (message: string, context?: string, ...args: any[]) =>
  devLogger.warn(message, context, ...args);
export const devInfo = (message: string, context?: string, ...args: any[]) =>
  devLogger.info(message, context, ...args);
export const devDebug = (message: string, data?: any, context?: string) =>
  devLogger.debug(message, data, context);

// Performance helpers
export const devTime = (label: string) => devLogger.time(label);
export const devTimeEnd = (label: string) => devLogger.timeEnd(label);

// Grouping helpers
export const devGroup = (label: string) => devLogger.group(label);
export const devGroupEnd = () => devLogger.groupEnd();

// Table helper
export const devTable = (data: any) => devLogger.table(data);
