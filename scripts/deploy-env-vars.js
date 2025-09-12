#!/usr/bin/env node

/**
 * Deploy all environment variables to Vercel
 * This script sets up all required environment variables for production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Environment variables to deploy
const envVars = {
  // Database Configuration (Using existing Neon database)
  DATABASE_URL: 'postgresql://neondb_owner:npg_4KZmiPFMW9Bt@ep-nameless-breeze-aepyje5o-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  DIRECT_URL: 'postgresql://neondb_owner:npg_4KZmiPFMW9Bt@ep-nameless-breeze-aepyje5o.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  
  // Security Keys (Generated)
  NEXTAUTH_SECRET: '2mAF7AVxgr7FZanupDKUvtv6jfpmneBdVlNeIo+I26M=',
  ENCRYPTION_KEY: 'bb07040eadc772cb1bb0dee7d1714ceb720e7cbdde41856d20a33e32f89bfa01',
  JWT_SIGNING_KEY: 'h/4/suCRzqUPAwIJBRNUkDyrpZinhzMRkmzJSpb6HOk=',
  CSRF_SECRET: 'x4LXdrqF7nfDoLEVEdROpj8jJn047+tLat5NWcZZs00=',
  SESSION_SECRET: 'xvjZO+8KJ7UQcsMkoeLrfa/YHf6P2CIMJl6/iEFaLx8=',
  
  // Application URLs
  NEXTAUTH_URL: 'https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app',
  NEXT_PUBLIC_APP_URL: 'https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app',
  
  // Core Settings
  NODE_ENV: 'production',
  NEXT_PUBLIC_APP_NAME: 'Astral Core',
  SESSION_TIMEOUT_MINUTES: '15',
  PHI_ENCRYPTION_ENABLED: 'true',
  AUDIT_LOG_RETENTION_DAYS: '2555',
  
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
  SESSION_MAX_AGE: '86400',
  
  // CORS Settings
  CORS_ALLOWED_ORIGINS: 'https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app',
  
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
  HEALTH_CHECK_TIMEOUT: '5000',
  
  // Email Configuration
  EMAIL_FROM: 'noreply@astralcore.app',
  EMAIL_PROVIDER: 'resend'
};

console.log('🚀 Deploying Environment Variables to Vercel');
console.log('=========================================\n');

let successCount = 0;
let errorCount = 0;
const errors = [];

// Deploy each environment variable
for (const [key, value] of Object.entries(envVars)) {
  if (!value || value === '') continue; // Skip empty values
  
  try {
    console.log(`Setting ${key}...`);
    
    // Remove existing variable first (if any)
    try {
      execSync(`vercel env rm ${key} production --yes`, { 
        stdio: 'pipe',
        encoding: 'utf8' 
      });
    } catch (e) {
      // Ignore error if variable doesn't exist
    }
    
    // Add the new variable
    const command = `echo ${JSON.stringify(value)} | vercel env add ${key} production`;
    execSync(command, { 
      shell: true,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    console.log(`  ✅ ${key} deployed successfully`);
    successCount++;
  } catch (error) {
    console.log(`  ❌ Failed to deploy ${key}`);
    errorCount++;
    errors.push({ key, error: error.message });
  }
}

console.log('\n=========================================');
console.log('📊 Deployment Summary');
console.log('=========================================');
console.log(`✅ Successfully deployed: ${successCount} variables`);
console.log(`❌ Failed: ${errorCount} variables`);

if (errors.length > 0) {
  console.log('\n⚠️ Errors encountered:');
  errors.forEach(({ key, error }) => {
    console.log(`  - ${key}: ${error}`);
  });
}

console.log('\n📝 Next Steps:');
console.log('1. Verify deployment: vercel env ls production');
console.log('2. Redeploy application: vercel --prod');
console.log('3. Run migrations: npm run db:migrate:prod');

process.exit(errorCount > 0 ? 1 : 0);