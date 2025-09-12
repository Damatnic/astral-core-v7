/**
 * Type definitions for API versioning
 * Provides strict typing for API versioning system
 */

import { JSONSchema7 } from 'json-schema';

/**
 * JSON schema type for API responses
 */
export type ApiResponseSchema = JSONSchema7;

/**
 * Parameter example value types
 */
export type ParameterExample = string | number | boolean | null | undefined | 
  Record<string, unknown> | Array<unknown>;

/**
 * Query parameter value types
 */
export type QueryParameterValue = string | number | boolean | string[] | number[] | boolean[] | undefined;

/**
 * Request body type
 */
export type RequestBody = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

/**
 * API error details type
 */
export type ApiErrorDetails = {
  field?: string;
  reason?: string;
  code?: string;
  [key: string]: unknown;
};

/**
 * Response data type
 */
export type ResponseData = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

/**
 * OpenAPI paths documentation type
 */
export interface OpenAPIPath {
  [method: string]: {
    summary: string;
    description: string;
    parameters: Array<{
      name: string;
      in: 'query' | 'body' | 'header' | 'path';
      required: boolean;
      description: string;
      schema: {
        type: string;
        example?: ParameterExample;
      };
    }>;
    responses: {
      [statusCode: string]: {
        description: string;
        content: {
          'application/json': {
            schema: ApiResponseSchema;
            examples: Record<string, unknown>;
          };
        };
      };
    };
    security: Array<Record<string, string[]>>;
  };
}

/**
 * OpenAPI documentation type
 */
export interface OpenAPIDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact: {
      name: string;
      email: string;
    };
    license: {
      name: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, OpenAPIPath>;
  components: {
    securitySchemes: {
      bearerAuth?: {
        type: 'http';
        scheme: 'bearer';
        bearerFormat: 'JWT';
      };
      apiKey?: {
        type: 'apiKey';
        in: 'header';
        name: string;
      };
    };
  };
}

/**
 * Version health status type
 */
export interface VersionHealthStatus {
  status: 'healthy' | 'deprecated' | 'sunset';
  details: string;
}