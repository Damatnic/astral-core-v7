/**
 * Centralized API Schema Validation Utilities
 * Provides reusable validation helpers for all API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants/index';

// =====================
// VALIDATION HELPERS
// =====================

/**
 * Validates request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            error: ERROR_MESSAGES.VALIDATION_ERROR, 
            details: error.issues,
            success: false
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      };
    }
    return {
      success: false,
      response: NextResponse.json(
        { 
          error: ERROR_MESSAGES.INVALID_JSON,
          success: false 
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    };
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const { searchParams } = new URL(request.url);
    const queryObject = Object.fromEntries(searchParams.entries());
    const validatedData = schema.parse(queryObject);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            error: ERROR_MESSAGES.VALIDATION_ERROR, 
            details: error.issues,
            success: false
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      };
    }
    return {
      success: false,
      response: NextResponse.json(
        { 
          error: 'Invalid query parameters',
          success: false 
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    };
  }
}

/**
 * Validates path parameters against a Zod schema
 */
export function validatePathParams<T>(
  params: unknown,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const validatedData = schema.parse(params);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            error: ERROR_MESSAGES.VALIDATION_ERROR, 
            details: error.issues,
            success: false
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      };
    }
    return {
      success: false,
      response: NextResponse.json(
        { 
          error: 'Invalid path parameters',
          success: false 
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    };
  }
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details?: unknown
): NextResponse {
  const response: { success: false; error: string; details?: unknown } = {
    success: false,
    error
  };
  
  if (details) {
    response.details = details;
  }
  
  return NextResponse.json(response, { status: statusCode });
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message: string = 'Success',
  statusCode: number = HTTP_STATUS.OK
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message,
      data
    },
    { status: statusCode }
  );
}

/**
 * Creates a standardized paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Success'
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: (page - 1) * limit + items.length < total
      }
    },
    { status: HTTP_STATUS.OK }
  );
}

// =====================
// VALIDATION DECORATORS
// =====================

/**
 * Higher-order function for API route validation
 */
export function withValidation<T, Q = unknown>(
  handler: (
    request: NextRequest,
    context: { params?: Record<string, string> },
    validatedData: { body?: T; query?: Q; params?: Record<string, string> }
  ) => Promise<NextResponse>,
  schemas: {
    body?: ZodSchema<T>;
    query?: ZodSchema<Q>;
    params?: ZodSchema<Record<string, string>>;
  }
) {
  return async (request: NextRequest, context: { params?: Record<string, string> }) => {
    const validatedData: { body?: T; query?: Q; params?: Record<string, string> } = {};

    // Validate request body
    if (schemas.body) {
      const bodyValidation = await validateRequestBody(request, schemas.body);
      if (!bodyValidation.success) {
        return bodyValidation.response;
      }
      validatedData.body = bodyValidation.data;
    }

    // Validate query parameters
    if (schemas.query) {
      const queryValidation = validateQueryParams(request, schemas.query);
      if (!queryValidation.success) {
        return queryValidation.response;
      }
      validatedData.query = queryValidation.data;
    }

    // Validate path parameters
    if (schemas.params && context.params) {
      const paramsValidation = validatePathParams(context.params, schemas.params);
      if (!paramsValidation.success) {
        return paramsValidation.response;
      }
      validatedData.params = paramsValidation.data;
    }

    return handler(request, context, validatedData);
  };
}

// =====================
// FIELD VALIDATION UTILITIES
// =====================

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  licenseNumber: /^[A-Z0-9\-]{5,20}$/
};

/**
 * Common field validators
 */
export const FieldValidators = {
  requiredString: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => `${field} must be no more than ${max} characters`,
  invalidFormat: (field: string) => `Invalid ${field} format`,
  mustBePositive: (field: string) => `${field} must be a positive number`,
  mustBeArray: (field: string) => `${field} must be an array`,
  arrayMinLength: (field: string, min: number) => `${field} must have at least ${min} items`,
  invalidEnum: (field: string, options: string[]) => 
    `${field} must be one of: ${options.join(', ')}`
};

// =====================
// SANITIZATION UTILITIES
// =====================

/**
 * Sanitizes user input by removing potentially harmful content
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Sanitizes an object by applying sanitization to all string values
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject) as T;
  }
  
  const sanitized = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeInput(value);
    } else if (typeof value === 'object') {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(value);
    } else {
      (sanitized as Record<string, unknown>)[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validates file upload parameters
 */
export function validateFileUpload(file: {
  size: number;
  type: string;
  name: string;
}): { valid: true } | { valid: false; error: string } {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/mpeg', 'video/quicktime'
  ];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 50MB limit' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  if (file.name.length > 255) {
    return { valid: false, error: 'File name too long' };
  }

  return { valid: true };
}