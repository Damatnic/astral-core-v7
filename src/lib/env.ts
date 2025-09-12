/**
 * Environment Variable Validation and Type Safety
 * Ensures all required environment variables are present and properly typed
 */

import { z } from 'zod';

// Define the schema for server-side environment variables
const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().optional().default(''),
  DIRECT_URL: z.string().url().optional().default(''),
  
  // Authentication
  NEXTAUTH_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().min(32).optional().default('development-secret-change-in-production'),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // OAuth Providers (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
  
  // Security
  ENCRYPTION_KEY: z.string().optional(),
  JWT_SIGNING_KEY: z.string().optional(),
  
  // Email
  EMAIL_FROM: z.string().email().optional().default('noreply@astralcore.app'),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  
  // Storage
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // AI Services
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // Vercel
  VERCEL: z.string().optional(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  
  // Build flags
  SKIP_ENV_VALIDATION: z.string().optional(),
  ANALYZE: z.string().optional(),
});

// Define the schema for client-side environment variables
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().optional().default('Astral Core'),
  NEXT_PUBLIC_APP_VERSION: z.string().optional().default('7.0.0'),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).optional().default('development'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
});

// Type definitions
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// Validation function with better error handling
function validateEnv() {
  // Skip validation in certain conditions
  if (process.env.SKIP_ENV_VALIDATION === '1') {
    console.log('⚠️  Skipping environment validation (SKIP_ENV_VALIDATION=1)');
    return {
      server: {} as ServerEnv,
      client: {} as ClientEnv,
    };
  }
  
  try {
    // Parse server environment variables
    const serverEnv = serverEnvSchema.safeParse(process.env);
    
    if (!serverEnv.success && process.env.NODE_ENV === 'production') {
      console.error('❌ Server environment validation failed:');
      console.error(serverEnv.error.format());
      
      // In production, we'll use defaults rather than crashing
      console.warn('⚠️  Using default values for missing environment variables');
    }
    
    // Parse client environment variables
    const clientEnv = clientEnvSchema.safeParse({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
      NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    });
    
    if (!clientEnv.success && process.env.NODE_ENV === 'production') {
      console.error('❌ Client environment validation failed:');
      console.error(clientEnv.error.format());
      console.warn('⚠️  Using default values for missing environment variables');
    }
    
    return {
      server: serverEnv.success ? serverEnv.data : serverEnvSchema.parse({}),
      client: clientEnv.success ? clientEnv.data : clientEnvSchema.parse({}),
    };
  } catch (error) {
    // Fallback for build-time errors
    console.error('Failed to validate environment variables:', error);
    
    // Return defaults to prevent build failures
    return {
      server: serverEnvSchema.parse({}),
      client: clientEnvSchema.parse({}),
    };
  }
}

// Export validated environment variables
export const env = validateEnv();

// Helper function to check if running in production
export const isProduction = () => env.server.NODE_ENV === 'production';

// Helper function to check if running on Vercel
export const isVercel = () => !!env.server.VERCEL;

// Helper function to get the app URL
export const getAppUrl = () => {
  if (env.server.VERCEL_URL) {
    return `https://${env.server.VERCEL_URL}`;
  }
  return env.client.NEXT_PUBLIC_APP_URL;
};

// Export for use in other files
export default env;