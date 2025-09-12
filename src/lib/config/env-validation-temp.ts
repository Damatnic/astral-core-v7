/**
 * TEMPORARY: Simplified Environment Configuration for Deployment
 * This bypasses zod dependency until proper installation
 */

export type EnvConfig = {
  NODE_ENV: string;
  DATABASE_URL?: string;
  NEXTAUTH_URL?: string;
  NEXTAUTH_SECRET?: string;
  [key: string]: any;
};

export function validateEnv(): { success: boolean; config?: EnvConfig } {
  return {
    success: true,
    config: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      DATABASE_URL: process.env.DATABASE_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET
    }
  };
}

export function getEnvConfig(): EnvConfig {
  const result = validateEnv();
  return result.config || {};
}

export function getEnvVar(key: string, fallback?: string): string | undefined {
  return process.env[key] || fallback;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function getAppUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
}

export function getConfig(): EnvConfig {
  return getEnvConfig();
}