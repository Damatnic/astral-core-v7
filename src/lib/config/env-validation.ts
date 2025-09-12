/**
 * Environment Variable Validation System
 * Ensures all required environment variables are present and valid
 * Provides type-safe access to environment configuration
 */

import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  // Core application config
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_DIRECT_URL: z.string().optional(),
  
  // Authentication
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  // OAuth Providers (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),
  AUTH0_ISSUER: z.string().url().optional(),
  
  // Email Configuration
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().transform(val => parseInt(val, 10)).optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // Encryption & Security
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),
  
  // File Storage
  STORAGE_PROVIDER: z.enum(['local', 's3', 'azure']).default('local'),
  STORAGE_PATH: z.string().default('./uploads'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_ENABLED: z.string().transform(val => val === 'true').default('true'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).default('100'),
  
  // Session Configuration
  SESSION_MAX_AGE: z.string().transform(val => parseInt(val, 10)).default('86400'), // 24 hours in seconds
  SESSION_UPDATE_AGE: z.string().transform(val => parseInt(val, 10)).default('3600'), // 1 hour in seconds
  
  // CORS Configuration
  CORS_ALLOWED_ORIGINS: z.string().transform(val => val.split(',')).optional(),
  CORS_ALLOWED_METHODS: z.string().default('GET,POST,PUT,DELETE,PATCH,OPTIONS'),
  CORS_ALLOWED_HEADERS: z.string().optional(),
  CORS_CREDENTIALS: z.string().transform(val => val === 'true').default('true'),
  
  // Security Headers
  CSP_ENABLED: z.string().transform(val => val === 'true').default('true'),
  HSTS_MAX_AGE: z.string().transform(val => parseInt(val, 10)).default('31536000'), // 1 year
  
  // Feature Flags
  ENABLE_MFA: z.string().transform(val => val === 'true').default('true'),
  ENABLE_AUDIT_LOG: z.string().transform(val => val === 'true').default('true'),
  ENABLE_PHI_ENCRYPTION: z.string().transform(val => val === 'true').default('true'),
  
  // Demo Mode
  DEMO_MODE: z.string().transform(val => val === 'true').default('false'),
  DEMO_USER_PREFIX: z.string().default('demo_'),
  
  // Application URLs
  APP_URL: z.string().url('APP_URL must be a valid URL').optional(),
  API_URL: z.string().url('API_URL must be a valid URL').optional(),
  
  // Monitoring & Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SENTRY_DSN: z.string().optional(),
  
  // WebSocket Configuration
  WEBSOCKET_ENABLED: z.string().transform(val => val === 'true').default('false'),
  WEBSOCKET_URL: z.string().url().optional(),
  
  // Redis Configuration (for sessions/caching)
  REDIS_URL: z.string().optional(),
  REDIS_ENABLED: z.string().transform(val => val === 'true').default('false'),
});

// Type for validated environment variables
export type EnvConfig = z.infer<typeof envSchema>;

// Validation result type
interface ValidationResult {
  success: boolean;
  config?: EnvConfig;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Validates environment variables against the schema
 * @returns Validation result with config or errors
 */
export function validateEnv(): ValidationResult {
  try {
    // Parse and validate environment variables
    const config = envSchema.parse(process.env);
    
    // Additional custom validations
    if (config.NODE_ENV === 'production') {
      // Production-specific requirements
      if (!config.APP_URL) {
        throw new Error('APP_URL is required in production');
      }
      
      if (!config.EMAIL_HOST || !config.EMAIL_FROM) {
        throw new Error('Email configuration is required in production');
      }
      
      if (config.DEMO_MODE) {
        throw new Error('Demo mode cannot be enabled in production');
      }
      
      // Ensure strong secrets in production
      const secrets = [
        config.NEXTAUTH_SECRET,
        config.ENCRYPTION_KEY,
        config.JWT_SECRET,
        config.CSRF_SECRET
      ];
      
      for (const secret of secrets) {
        if (secret.length < 64) {
          throw new Error('All secrets must be at least 64 characters in production');
        }
      }
    }
    
    return {
      success: true,
      config
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    
    if (error instanceof Error) {
      return {
        success: false,
        errors: [{
          field: 'custom',
          message: error.message
        }]
      };
    }
    
    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: 'Unknown validation error'
      }]
    };
  }
}

/**
 * Gets validated environment configuration
 * Throws error if validation fails
 * @returns Validated environment configuration
 */
export function getEnvConfig(): EnvConfig {
  const result = validateEnv();
  
  if (!result.success) {
    const errorMessages = result.errors?.map(e => `${e.field}: ${e.message}`).join('\n');
    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }
  
  return result.config!;
}

/**
 * Safe environment variable access with fallback
 * @param key Environment variable key
 * @param fallback Fallback value if not found
 * @returns Environment variable value or fallback
 */
export function getEnvVar(key: keyof EnvConfig, fallback?: string): string | undefined {
  try {
    const config = getEnvConfig();
    const value = config[key];
    return value?.toString() || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Checks if running in production mode
 * @returns True if in production
 */
export function isProduction(): boolean {
  return getEnvVar('NODE_ENV') === 'production';
}

/**
 * Checks if running in development mode
 * @returns True if in development
 */
export function isDevelopment(): boolean {
  return getEnvVar('NODE_ENV') === 'development';
}

/**
 * Checks if running in test mode
 * @returns True if in test
 */
export function isTest(): boolean {
  return getEnvVar('NODE_ENV') === 'test';
}

/**
 * Gets base application URL
 * @returns Application URL
 */
export function getAppUrl(): string {
  const url = getEnvVar('APP_URL') || getEnvVar('NEXTAUTH_URL') || 'http://localhost:3000';
  return url.replace(/\/$/, ''); // Remove trailing slash
}

/**
 * Masks sensitive values for logging
 * @param value Value to mask
 * @returns Masked value
 */
export function maskSensitive(value: string): string {
  if (!value || value.length < 8) return '***';
  return value.substring(0, 4) + '***' + value.substring(value.length - 4);
}

/**
 * Logs environment configuration (with masked sensitive values)
 */
export function logEnvConfig(): void {
  const result = validateEnv();
  
  if (!result.success) {
    console.error('Environment validation failed:', result.errors);
    return;
  }
  
  const config = result.config!;
  const masked = { ...config };
  
  // Mask sensitive values
  const sensitiveKeys: Array<keyof EnvConfig> = [
    'DATABASE_URL',
    'DATABASE_DIRECT_URL',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_SECRET',
    'AUTH0_CLIENT_SECRET',
    'EMAIL_PASSWORD',
    'ENCRYPTION_KEY',
    'JWT_SECRET',
    'CSRF_SECRET',
    'AWS_SECRET_ACCESS_KEY',
    'REDIS_URL',
    'SENTRY_DSN'
  ];
  
  for (const key of sensitiveKeys) {
    if (masked[key]) {
      (masked as any)[key] = maskSensitive(String(masked[key]));
    }
  }
  
  console.info('Environment Configuration:', masked);
}

// Export singleton instance
let envConfig: EnvConfig | null = null;

/**
 * Gets or creates singleton environment configuration
 * @returns Validated environment configuration
 */
export function getConfig(): EnvConfig {
  if (!envConfig) {
    envConfig = getEnvConfig();
  }
  return envConfig;
}

// Validate on module load in non-test environments
if (process.env['NODE_ENV'] !== 'test') {
  const result = validateEnv();
  if (!result.success && process.env['NODE_ENV'] === 'production') {
    console.error('CRITICAL: Environment validation failed in production');
    console.error(result.errors);
    process.exit(1);
  }
}