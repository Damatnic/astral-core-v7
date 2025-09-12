/**
 * Standardized Error Handling Utilities
 * Provides consistent error handling patterns across the application
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Application error codes
 */
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  MFA_REQUIRED = 'MFA_REQUIRED',
  MFA_INVALID = 'MFA_INVALID',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Permission errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Mental health specific
  CRISIS_DETECTED = 'CRISIS_DETECTED',
  PHI_ACCESS_DENIED = 'PHI_ACCESS_DENIED',
  WELLNESS_DATA_INVALID = 'WELLNESS_DATA_INVALID'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly traceId?: string;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.traceId = this.generateTraceId();
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert to JSON for API responses
   */
  public toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
        traceId: this.traceId
      }
    };
  }
}

/**
 * Specific error classes for different scenarios
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, ErrorSeverity.LOW, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code: ErrorCode = ErrorCode.UNAUTHORIZED) {
    super(message, code, 401, ErrorSeverity.MEDIUM);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, ErrorCode.FORBIDDEN, 403, ErrorSeverity.MEDIUM);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, ErrorCode.NOT_FOUND, 404, ErrorSeverity.LOW);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.CONFLICT, 409, ErrorSeverity.MEDIUM, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      'Rate limit exceeded',
      ErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      ErrorSeverity.LOW,
      retryAfter ? { retryAfter } : undefined
    );
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.DATABASE_ERROR, 500, ErrorSeverity.HIGH, details);
    this.name = 'DatabaseError';
  }
}

export class CrisisError extends AppError {
  constructor(message: string = 'Crisis situation detected', details?: Record<string, unknown>) {
    super(message, ErrorCode.CRISIS_DETECTED, 200, ErrorSeverity.CRITICAL, details);
    this.name = 'CrisisError';
  }
}

/**
 * Error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse {
  // Handle known application errors
  if (error instanceof AppError) {
    // Log critical errors
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      console.error('[API Error]', {
        code: error.code,
        message: error.message,
        severity: error.severity,
        traceId: error.traceId,
        stack: error.stack
      });
    }

    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = new ValidationError('Invalid request data', {
      errors: error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
    return NextResponse.json(validationError.toJSON(), { status: 400 });
  }

  // Handle standard errors
  if (error instanceof Error) {
    console.error('[Unhandled Error]', error);
    
    const appError = new AppError(
      process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
      ErrorCode.INTERNAL_ERROR,
      500,
      ErrorSeverity.HIGH
    );
    
    return NextResponse.json(appError.toJSON(), { status: 500 });
  }

  // Handle unknown errors
  console.error('[Unknown Error]', error);
  const appError = new AppError(
    'An unexpected error occurred',
    ErrorCode.INTERNAL_ERROR,
    500,
    ErrorSeverity.HIGH
  );
  
  return NextResponse.json(appError.toJSON(), { status: 500 });
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  }) as T;
}

/**
 * Error boundary for client components
 */
export class ErrorBoundary {
  private static handlers: Map<string, (error: Error) => void> = new Map();

  /**
   * Register an error handler for a specific component
   */
  public static register(componentName: string, handler: (error: Error) => void) {
    this.handlers.set(componentName, handler);
  }

  /**
   * Handle error from a component
   */
  public static handle(componentName: string, error: Error) {
    const handler = this.handlers.get(componentName);
    if (handler) {
      handler(error);
    } else {
      console.error(`[${componentName}]`, error);
    }
  }

  /**
   * Clear all handlers
   */
  public static clear() {
    this.handlers.clear();
  }
}

/**
 * Retry logic for transient failures
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    shouldRetry = (error) => !(error instanceof AppError) || error.severity === ErrorSeverity.LOW
  } = options;

  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

/**
 * Circuit breaker for external services
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000,
    private readonly resetTimeout: number = 30000
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new AppError(
          'Service temporarily unavailable',
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          503,
          ErrorSeverity.MEDIUM
        );
      }
    }

    try {
      const result = await fn();
      
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'open';
      }
      
      throw error;
    }
  }

  /**
   * Reset the circuit breaker
   */
  public reset() {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}

/**
 * Error recovery strategies
 */
export const ErrorRecovery = {
  /**
   * Fallback to default value on error
   */
  withFallback: async <T>(
    fn: () => Promise<T>,
    fallback: T,
    logError = true
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (logError) {
        console.error('[Error Recovery] Using fallback value:', error);
      }
      return fallback;
    }
  },

  /**
   * Transform error to user-friendly message
   */
  toUserMessage: (error: unknown): string => {
    if (error instanceof AppError) {
      if (error.code === ErrorCode.CRISIS_DETECTED) {
        return 'We noticed you might be going through a difficult time. Please reach out for support if needed.';
      }
      if (error.severity === ErrorSeverity.LOW) {
        return error.message;
      }
    }
    
    return 'Something went wrong. Please try again or contact support if the issue persists.';
  },

  /**
   * Log and suppress error
   */
  suppress: async <T>(
    fn: () => Promise<T>,
    defaultValue?: T
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      console.error('[Suppressed Error]', error);
      return defaultValue;
    }
  }
};

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  CrisisError,
  handleApiError,
  asyncHandler,
  withRetry,
  CircuitBreaker,
  ErrorBoundary,
  ErrorRecovery,
  ErrorCode,
  ErrorSeverity
};