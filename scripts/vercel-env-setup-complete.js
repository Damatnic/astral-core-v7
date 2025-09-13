#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Script
 * Automatically sets all required environment variables for Astral Core v7
 * 
 * Usage:
 *   node scripts/vercel-env-setup-complete.js [--staging]
 * 
 * Options:
 *   --staging   Set up for staging environment (enables demo accounts)
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const isStaging = process.argv.includes('--staging');
const envType = isStaging ? 'preview' : 'production';

console.log(`🚀 Setting up Vercel environment variables for ${envType}...`);
console.log('');

// Environment variables configuration
const ENV_VARS = {
  // Critical security variables
  NEXTAUTH_SECRET: 'zelhX05PnFJqWGXnLHP9n1cIktEDEzBq4b317GVDKQo=',
  ENCRYPTION_KEY: '2635448ecd67115a9650ab942040fbb24f106bd5238f45aec3dac045fb45a268',
  JWT_SIGNING_KEY: 'Paq1zH5MQeRKy4VSE70Uu3G79qsHVExLrOSH8pFiOlU=',
  
  // Application settings
  NODE_ENV: 'production',
  SKIP_ENV_VALIDATION: '1',
  NEXT_TELEMETRY_DISABLED: '1',
  
  // App information
  NEXT_PUBLIC_APP_NAME: 'Astral Core',
  NEXT_PUBLIC_APP_VERSION: '7.0.0',
  NEXT_PUBLIC_APP_ENV: envType === 'preview' ? 'staging' : 'production',
  
  // Security & compliance
  PHI_ENCRYPTION_ENABLED: 'true',
  REQUIRE_MFA: 'true',
  AUDIT_LOG_RETENTION_DAYS: '2555',
  SESSION_TIMEOUT_MINUTES: '15',
  MAX_LOGIN_ATTEMPTS: '5',
  LOCKOUT_DURATION_MINUTES: '15',
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: '60000',
  RATE_LIMIT_MAX_REQUESTS: '50',
  
  // Feature flags
  ENABLE_CRISIS_INTERVENTION: 'true',
  ENABLE_AI_ASSISTANCE: 'false',
  ENABLE_VIDEO_SESSIONS: 'false',
  ENABLE_GROUP_THERAPY: 'false',
  
  // Email configuration (optional)
  EMAIL_FROM: 'noreply@astral-core.com',
  EMAIL_PROVIDER: 'resend',
  
  // Storage configuration
  STORAGE_PROVIDER: 'local'
};

// Demo account variables (only for staging)
const DEMO_VARS = {
  ALLOW_DEMO_ACCOUNTS: 'true',
  DEMO_CLIENT_PASSWORD: 'hIcLhbdxVxZe8tQRSpsqOQ==',
  DEMO_THERAPIST_PASSWORD: 'CGA1JESRbe1duz4AZzXUPw==',
  DEMO_ADMIN_PASSWORD: 'ZTXfJNgXmOLofYdXap3Rvw==',
  DEMO_CRISIS_PASSWORD: 'PDLxSNu5nQxt31oy4keZFw==',
  DEMO_SUPERVISOR_PASSWORD: '69bLeIVrzFctVCroA4RdBQ=='
};

// Production-specific overrides
if (!isStaging) {
  ENV_VARS.ALLOW_DEMO_ACCOUNTS = 'false';
} else {
  Object.assign(ENV_VARS, DEMO_VARS);
}

function execCommand(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    return null;
  }
}

function setEnvironmentVariable(key, value) {
  console.log(`Setting ${key}...`);
  
  const command = `vercel env add ${key} ${envType}`;
  const result = execCommand(`echo "${value}" | ${command}`);
  
  if (result !== null) {
    console.log(`✅ ${key} set successfully`);
    return true;
  } else {
    console.log(`⚠️  Failed to set ${key} (may already exist)`);
    return false;
  }
}

async function confirmAction(message) {
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  console.log('📋 Environment Configuration:');
  console.log(`   Target: ${envType}`);
  console.log(`   Demo Accounts: ${isStaging ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   Total Variables: ${Object.keys(ENV_VARS).length}`);
  console.log('');
  
  // Check if Vercel CLI is available
  const vercelVersion = execCommand('vercel --version');
  if (!vercelVersion) {
    console.error('❌ Vercel CLI not found. Please install with: npm i -g vercel');
    process.exit(1);
  }
  
  console.log(`✅ Vercel CLI detected: ${vercelVersion.trim()}`);
  console.log('');
  
  const proceed = await confirmAction('Do you want to proceed with setting environment variables?');
  if (!proceed) {
    console.log('Cancelled.');
    process.exit(0);
  }
  
  console.log('');
  console.log('🔧 Setting environment variables...');
  console.log('');
  
  let successCount = 0;
  let totalCount = 0;
  
  for (const [key, value] of Object.entries(ENV_VARS)) {
    totalCount++;
    if (setEnvironmentVariable(key, value)) {
      successCount++;
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('');
  console.log('📊 Summary:');
  console.log(`   ✅ Successfully set: ${successCount}/${totalCount} variables`);
  console.log(`   ⚠️  Skipped/Failed: ${totalCount - successCount}/${totalCount} variables`);
  console.log('');
  
  if (successCount === totalCount) {
    console.log('🎉 All environment variables configured successfully!');
  } else {
    console.log('⚠️  Some variables may already exist or failed to set.');
    console.log('   Check your Vercel dashboard to verify all variables are present.');
  }
  
  console.log('');
  console.log('📝 Next Steps:');
  console.log('   1. Verify variables in Vercel dashboard');
  console.log('   2. Add Vercel Postgres database integration');
  console.log('   3. Deploy your application: vercel --prod');
  console.log('   4. Run database migrations');
  
  if (isStaging) {
    console.log('   5. Create demo accounts: curl -X POST https://your-app.vercel.app/api/auth/demo/create');
  }
  
  console.log('');
  console.log('🔐 Security Reminders:');
  console.log('   - Never commit real environment variables to version control');
  console.log('   - Rotate secrets regularly (quarterly recommended)');
  console.log('   - Monitor access to secrets');
  console.log('   - Use different secrets for different environments');
  
  rl.close();
}

main().catch((error) => {
  console.error('❌ Script failed:', error);
  rl.close();
  process.exit(1);
});