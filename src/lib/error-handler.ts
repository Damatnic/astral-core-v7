/**
 * Structured error handling utility for Astral Core v7
 * Provides consistent error responses and security-aware error handling
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  MFA_REQUIRED = 'MFA_REQUIRED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resources
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',

  // Business Logic
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly requestId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    if (details !== undefined) this.details = details;
    if (requestId !== undefined) this.requestId = requestId;

    // Maintains proper stack trace
    Error.captureStackTrace(this, AppError);
  }

  public toApiError(): ApiError {
    const apiError: ApiError = {
      code: this.code,
      message: this.message,
      timestamp: new Date().toISOString()
    };
    
    if (this.details !== undefined) apiError.details = this.details;
    if (this.requestId !== undefined) apiError.requestId = this.requestId;
    
    return apiError;
  }
}

// Factory functions for common error types
export const createAuthError = (message: string = 'Authentication required', requestId?: string) =>
  new AppError(ErrorCode.UNAUTHORIZED, message, 401, undefined, requestId);

export const createForbiddenError = (message: string = 'Access denied', requestId?: string) =>
  new AppError(ErrorCode.FORBIDDEN, message, 403, undefined, requestId);

export const createValidationError = (
  message: string,
  details?: Record<string, unknown>,
  requestId?: string
) => new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details, requestId);

export const createNotFoundError = (resource: string = 'Resource', requestId?: string) =>
  new AppError(ErrorCode.RESOURCE_NOT_FOUND, `${resource} not found`, 404, undefined, requestId);

export const createInternalError = (
  message: string = 'Internal server error',
  requestId?: string
) => new AppError(ErrorCode.INTERNAL_ERROR, message, 500, undefined, requestId);

export const createRateLimitError = (message: string = 'Rate limit exceeded', requestId?: string) =>
  new AppError(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429, undefined, requestId);

// Error handler for API routes
export function handleApiError(
  error: Error | AppError,
  context?: string,
  userId?: string,
  requestId?: string
): NextResponse<ApiError> {
  let apiError: ApiError;
  let statusCode: number;

  if (error instanceof AppError) {
    apiError = error.toApiError();
    statusCode = error.statusCode;

    // Log based on severity
    if (statusCode >= 500) {
      logger.error(
        `API Error: ${error.message}`,
        context,
        {
          code: error.code,
          userId,
          requestId,
          details: error.details
        },
        error
      );
    } else if (statusCode >= 400) {
      logger.warn(`API Warning: ${error.message}`, context, {
        code: error.code,
        userId,
        requestId,
        details: error.details
      });
    }
  } else {
    // Unknown error - be cautious about exposing details
    const isProduction = process.env.NODE_ENV === 'production';
    apiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: isProduction ? 'An unexpected error occurred' : error.message,
      timestamp: new Date().toISOString()
    };
    if (requestId) apiError.requestId = requestId;
    statusCode = 500;

    // Always log unknown errors as errors
    logger.error(`Unhandled API Error: ${error.message}`, context, { userId, requestId }, error);
  }

  return NextResponse.json(apiError, { status: statusCode });
}

// Error handler for service functions
export function handleServiceError(
  error: Error | AppError,
  operation: string,
  context?: string,
  userId?: string
): never {
  if (error instanceof AppError) {
    // Re-throw app errors as-is
    logger.error(
      `Service Error in ${operation}: ${error.message}`,
      context,
      {
        code: error.code,
        userId,
        details: error.details
      },
      error
    );
    throw error;
  } else {
    // Wrap unknown errors
    logger.error(
      `Unhandled Service Error in ${operation}: ${error.message}`,
      context,
      { userId },
      error
    );
    throw new AppError(ErrorCode.INTERNAL_ERROR, `Failed to ${operation}`, 500);
  }
}

// Async error wrapper for API routes
export function withErrorHandler<T extends unknown[]>(handler: (...args: T) => Promise<NextResponse>) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error as Error);
    }
  };
}

// Async error wrapper for service functions
export function withServiceErrorHandler<T extends unknown[], R>(
  operation: string,
  handler: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      handleServiceError(error as Error, operation, context);
    }
  };
}

// Helper to check if error is a specific type
export const isAuthError = (error: Error): error is AppError =>
  error instanceof AppError &&
  [ErrorCode.UNAUTHORIZED, ErrorCode.FORBIDDEN, ErrorCode.TOKEN_EXPIRED].includes(error.code);

export const isValidationError = (error: Error): error is AppError =>
  error instanceof AppError && error.code === ErrorCode.VALIDATION_ERROR;

export const isNotFoundError = (error: Error): error is AppError =>
  error instanceof AppError && error.code === ErrorCode.RESOURCE_NOT_FOUND;
