/**
 * Structured logger utility for Astral Core v7
 * Provides secure, production-ready logging with sensitive data protection
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isProduction: boolean;

  private constructor() {
    this.logLevel = this.getLogLevel();
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevel(): LogLevel {
    const level = process.env['LOG_LEVEL']?.toLowerCase();
    switch (level) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'debug':
        return LogLevel.DEBUG;
      default:
        return this.isProduction ? LogLevel.ERROR : LogLevel.DEBUG;
    }
  }

  private sanitizeData(data: unknown): Record<string, unknown> | unknown {
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

    const sanitize = (obj: unknown): unknown => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      const sanitized: Record<string, unknown> = {};
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

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };

    if (context) entry.context = context;
    if (metadata) entry.metadata = this.sanitizeData(metadata) as Record<string, unknown>;
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: !this.isProduction ? error.stack : undefined
      } as Error;
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const logData = {
      ...entry,
      level: LogLevel[entry.level]
    };

    if (this.isProduction) {
      // In production, write to structured logging service
      // For now, we'll use console for demonstration but this should be
      // replaced with proper logging service (Winston, Pino, etc.)
      if (entry.level === LogLevel.ERROR) {
        console.error(JSON.stringify(logData));
      } else if (entry.level === LogLevel.WARN) {
        console.warn(JSON.stringify(logData));
      } else {
        console.log(JSON.stringify(logData));
      }
    } else {
      // Development logging with readable format
      const prefix = `[${entry.timestamp}] ${LogLevel[entry.level]}`;
      const contextStr = entry.context ? ` [${entry.context}]` : '';
      console.log(`${prefix}${contextStr}: ${entry.message}`);

      if (entry.metadata) {
        console.log('Metadata:', entry.metadata);
      }

      if (entry.error) {
        console.error('Error:', entry.error);
      }
    }
  }

  public error(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, metadata, error);
    this.writeLog(entry);
  }

  public warn(message: string, context?: string, metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, metadata);
    this.writeLog(entry);
  }

  public info(message: string, context?: string, metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context, metadata);
    this.writeLog(entry);
  }

  public debug(message: string, context?: string, metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, metadata);
    this.writeLog(entry);
  }

  // Audit logging for security-sensitive operations
  public audit(
    action: string,
    userId: string,
    details?: Record<string, unknown>,
    sessionId?: string,
    requestId?: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message: `AUDIT: ${action}`,
      context: 'AUDIT',
      userId
    };

    if (details) entry.metadata = this.sanitizeData(details) as Record<string, unknown>;
    if (sessionId) entry.sessionId = sessionId;
    if (requestId) entry.requestId = requestId;

    // Audit logs should always be written regardless of log level
    this.writeLog(entry);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Utility function to safely convert unknown errors to Error objects
export const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error('Unknown error occurred');
};

// Convenience functions for common patterns
export const logError = (
  message: string,
  error?: Error | unknown,
  context?: string,
  metadata?: Record<string, unknown>
) => {
  const errorObj = error ? toError(error) : undefined;
  logger.error(message, context, metadata, errorObj);
};

export const logWarning = (
  message: string,
  context?: string,
  metadata?: Record<string, unknown>
) => {
  logger.warn(message, context, metadata);
};

export const logInfo = (message: string, context?: string, metadata?: Record<string, unknown>) => {
  logger.info(message, context, metadata);
};

export const logDebug = (message: string, context?: string, metadata?: Record<string, unknown>) => {
  logger.debug(message, context, metadata);
};

export const logAudit = (
  action: string,
  userId: string,
  details?: Record<string, unknown>,
  sessionId?: string,
  requestId?: string
) => {
  logger.audit(action, userId, details, sessionId, requestId);
};

export const logCleanup = (
  message: string,
  context?: string,
  metadata?: Record<string, unknown>
) => {
  logger.info(`[CLEANUP] ${message}`, context, metadata);
};
