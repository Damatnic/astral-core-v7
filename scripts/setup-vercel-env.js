#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Script
 * Generates secure keys and provides commands to set up production environment
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate secure random keys
function generateSecureKey(length = 32, encoding = 'base64') {
  return crypto.randomBytes(length).toString(encoding);
}

// Generate all required environment variables
function generateEnvironmentVariables() {
  const productionUrl = 'https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app';
  
  const envVars = {
    // Security Keys (Generate New!)
    NEXTAUTH_SECRET: generateSecureKey(32, 'base64'),
    ENCRYPTION_KEY: generateSecureKey(32, 'hex'),
    JWT_SIGNING_KEY: generateSecureKey(32, 'base64'),
    CSRF_SECRET: generateSecureKey(32, 'base64'),
    
    // Application URLs
    NEXTAUTH_URL: productionUrl,
    NEXT_PUBLIC_APP_URL: productionUrl,
    
    // Core Settings
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_NAME: 'Astral Core',
    SESSION_TIMEOUT_MINUTES: '15',
    PHI_ENCRYPTION_ENABLED: 'true',
    AUDIT_LOG_RETENTION_DAYS: '2555',
    
    // Database (Placeholder - needs actual connection string)
    DATABASE_URL: 'postgresql://user:password@host:port/database?sslmode=require',
    DIRECT_URL: 'postgresql://user:password@host:port/database?sslmode=require',
    
    // Performance & Monitoring
    SENTRY_DSN: '',
    MONITORING_WEBHOOK_URL: '',
    VERCEL_ANALYTICS_ID: '',
    
    // Email (Optional)
    EMAIL_FROM: 'noreply@astralcore.app',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: '',
    
    // Payment Processing (Optional)
    STRIPE_PUBLISHABLE_KEY: '',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    
    // OAuth Providers (Optional)
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    GITHUB_ID: '',
    GITHUB_SECRET: '',
    
    // Feature Flags
    ENABLE_MFA: 'true',
    ENABLE_CRISIS_INTERVENTION: 'true',
    ENABLE_WELLNESS_TRACKING: 'true',
    ENABLE_TELETHERAPY: 'true',
    ENABLE_PAYMENT_PROCESSING: 'false',
    
    // Rate Limiting
    RATE_LIMIT_ENABLED: 'true',
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    
    // Session Configuration
    SESSION_SECRET: generateSecureKey(32, 'base64'),
    SESSION_MAX_AGE: '86400',
    
    // CORS Settings
    CORS_ALLOWED_ORIGINS: productionUrl,
    
    // Build Settings
    SKIP_TYPE_CHECK: 'false',
    NEXT_TELEMETRY_DISABLED: '1',
    
    // Cache Settings
    CACHE_TTL_DEFAULT: '300',
    CACHE_TTL_USER: '600',
    CACHE_TTL_DASHBOARD: '60',
    
    // Logging
    LOG_LEVEL: 'info',
    LOG_FORMAT: 'json',
    
    // Health Check
    HEALTH_CHECK_INTERVAL: '30000',
    HEALTH_CHECK_TIMEOUT: '5000'
  };
  
  return envVars;
}

// Generate Vercel CLI commands
function generateVercelCommands(envVars) {
  const commands = [];
  
  // Critical variables that must be set
  const criticalVars = [
    'NEXTAUTH_SECRET',
    'ENCRYPTION_KEY',
    'JWT_SIGNING_KEY',
    'CSRF_SECRET',
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXTAUTH_URL',
    'NEXT_PUBLIC_APP_URL'
  ];
  
  console.log('\\n🔐 CRITICAL ENVIRONMENT VARIABLES (Must be set first):\\n');
  console.log('Copy and run these commands in your terminal:\\n');
  
  criticalVars.forEach(key => {
    const value = envVars[key];
    const command = `vercel env add ${key} production`;
    console.log(`echo "${value}" | ${command}`);
  });
  
  console.log('\\n📦 ADDITIONAL ENVIRONMENT VARIABLES:\\n');
  
  Object.keys(envVars).forEach(key => {
    if (!criticalVars.includes(key)) {
      const value = envVars[key];
      if (value) {
        const command = `echo "${value}" | vercel env add ${key} production`;
        commands.push(command);
      }
    }
  });
  
  return commands;
}

// Save environment variables to .env.production.local
function saveToEnvFile(envVars) {
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}="${value}"`)
    .join('\\n');
  
  const envPath = path.join(process.cwd(), '.env.production.local');
  fs.writeFileSync(envPath, envContent);
  
  console.log(`\\n✅ Environment variables saved to: ${envPath}`);
  console.log('\\n⚠️  IMPORTANT: Never commit this file to Git!');
}

// Generate database setup commands
function generateDatabaseCommands() {
  console.log('\\n🗄️  DATABASE SETUP COMMANDS:\\n');
  console.log('# If using Vercel Postgres:');
  console.log('vercel env pull .env.local');
  console.log('\\n# Generate Prisma Client:');
  console.log('npx prisma generate');
  console.log('\\n# Deploy migrations to production:');
  console.log('npx prisma migrate deploy');
  console.log('\\n# (Optional) Seed with demo data:');
  console.log('npx prisma db seed');
}

// Main execution
function main() {
  console.log('===============================================');
  console.log('   Astral Core v7 - Production Setup Script   ');
  console.log('===============================================\\n');
  
  const envVars = generateEnvironmentVariables();
  
  // Display generated keys
  console.log('🔑 GENERATED SECURE KEYS:\\n');
  console.log(`NEXTAUTH_SECRET: ${envVars.NEXTAUTH_SECRET}`);
  console.log(`ENCRYPTION_KEY: ${envVars.ENCRYPTION_KEY}`);
  console.log(`JWT_SIGNING_KEY: ${envVars.JWT_SIGNING_KEY}`);
  console.log(`CSRF_SECRET: ${envVars.CSRF_SECRET}`);
  console.log(`SESSION_SECRET: ${envVars.SESSION_SECRET}`);
  
  // Generate Vercel commands
  generateVercelCommands(envVars);
  
  // Save to local file
  saveToEnvFile(envVars);
  
  // Database setup
  generateDatabaseCommands();
  
  console.log('\\n🚀 DEPLOYMENT VERIFICATION:\\n');
  console.log('After setting environment variables:');
  console.log('1. vercel --prod (to deploy)');
  console.log('2. Visit: https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/health');
  console.log('\\n===============================================\\n');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateSecureKey, generateEnvironmentVariables };