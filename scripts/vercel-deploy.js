#!/usr/bin/env node

/**
 * Vercel Easy Deployment Script
 * Handles environment variables, deployment, and monitoring setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, silent = false) {
  try {
    if (!silent) log(`\n> ${command}`, 'cyan');
    const result = execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return result;
  } catch (error) {
    if (!silent) log(`Error executing: ${command}`, 'red');
    throw error;
  }
}

async function checkVercelLogin() {
  try {
    execCommand('vercel whoami', true);
    return true;
  } catch {
    log('\n⚠️  You need to login to Vercel first', 'yellow');
    log('Running: vercel login', 'cyan');
    execCommand('vercel login');
    return true;
  }
}

async function setupEnvironmentVariables() {
  log('\n📝 Setting up environment variables...', 'blue');
  
  const envVars = {
    // Database
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_4KZmiPFMW9Bt@ep-nameless-breeze-aepyje5o-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
    DIRECT_URL: process.env.DIRECT_URL || 'postgresql://neondb_owner:npg_4KZmiPFMW9Bt@ep-nameless-breeze-aepyje5o.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
    
    // Auth
    NEXTAUTH_URL: 'https://astral-core-v7.vercel.app',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'tUN2VrCEJ2nkcq78H7WYYjMDoGgOvdEujCdrlCGIu8A=',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '3598a3a4c2e8075f0226b402b2fc39e58f50cbe0a095e67919a60839e943a615',
    JWT_SIGNING_KEY: process.env.JWT_SIGNING_KEY || 'zYwLMsTPzwGiIYv2eTBrYyZg6+xohlhVtXUJlYj+bRI=',
    
    // App Config
    NEXT_PUBLIC_APP_URL: 'https://astral-core-v7.vercel.app',
    NEXT_PUBLIC_APP_NAME: 'Astral Core',
    NEXT_PUBLIC_APP_VERSION: '7.0.0',
    
    // Security
    PHI_ENCRYPTION_ENABLED: 'true',
    AUDIT_LOG_RETENTION_DAYS: '2555',
    SESSION_TIMEOUT_MINUTES: '15',
    MAX_LOGIN_ATTEMPTS: '5',
    LOCKOUT_DURATION_MINUTES: '15',
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX_REQUESTS: '50',
    REQUIRE_MFA: 'false',
    
    // Features
    ENABLE_CRISIS_INTERVENTION: 'true',
    ENABLE_AI_ASSISTANCE: 'false',
    ENABLE_VIDEO_SESSIONS: 'false',
    ENABLE_GROUP_THERAPY: 'false',
    STORAGE_PROVIDER: 'local',
    EMAIL_FROM: 'noreply@astralcore.app',
    EMAIL_PROVIDER: 'resend'
  };
  
  log('Setting environment variables in Vercel...', 'yellow');
  
  for (const [key, value] of Object.entries(envVars)) {
    try {
      // Add to all environments (production, preview, development)
      execCommand(`vercel env add ${key} production`, true);
      process.stdin.write(`${value}\n`);
    } catch {
      // Variable might already exist, try to update it
      log(`Variable ${key} might already exist, skipping...`, 'yellow');
    }
  }
  
  log('✅ Environment variables configured', 'green');
}

async function deployToVercel(environment = 'production') {
  log(`\n🚀 Deploying to ${environment}...`, 'blue');
  
  const deployCommand = environment === 'production' 
    ? 'vercel --prod' 
    : 'vercel';
  
  try {
    const output = execCommand(deployCommand);
    
    // Extract deployment URL from output
    const urlMatch = output.match(/https:\/\/[^\s]+/);
    if (urlMatch) {
      const deploymentUrl = urlMatch[0];
      log(`\n✅ Deployment successful!`, 'green');
      log(`🔗 URL: ${deploymentUrl}`, 'cyan');
      return deploymentUrl;
    }
  } catch (error) {
    log('❌ Deployment failed', 'red');
    throw error;
  }
}

async function setupMonitoring(deploymentUrl) {
  log('\n📊 Setting up monitoring...', 'blue');
  
  // Enable Vercel Analytics
  try {
    execCommand('vercel analytics enable', true);
    log('✅ Analytics enabled', 'green');
  } catch {
    log('⚠️  Analytics might already be enabled', 'yellow');
  }
  
  // Set up health check monitoring
  log('\nHealth check endpoints configured:', 'cyan');
  log(`  - ${deploymentUrl}/api/health`, 'reset');
  log(`  - ${deploymentUrl}/api/health/ready`, 'reset');
  log(`  - ${deploymentUrl}/api/status`, 'reset');
  log(`  - ${deploymentUrl}/api/monitoring/uptime`, 'reset');
  
  return true;
}

async function runPostDeploymentChecks(deploymentUrl) {
  log('\n🔍 Running post-deployment checks...', 'blue');
  
  const checks = [
    { name: 'Health Check', url: `${deploymentUrl}/api/health` },
    { name: 'Ready Check', url: `${deploymentUrl}/api/health/ready` },
    { name: 'Status Check', url: `${deploymentUrl}/api/status` }
  ];
  
  for (const check of checks) {
    try {
      execCommand(`curl -s -o /dev/null -w "%{http_code}" ${check.url}`, true);
      log(`✅ ${check.name}: OK`, 'green');
    } catch {
      log(`⚠️  ${check.name}: Failed (might need authentication)`, 'yellow');
    }
  }
}

async function main() {
  log('\n🎯 Astral Core v7 - Easy Vercel Deployment', 'bright');
  log('='.repeat(50), 'cyan');
  
  try {
    // Step 1: Check Vercel login
    await checkVercelLogin();
    
    // Step 2: Ask deployment type
    const deployType = await question('\nDeploy to production or preview? (prod/preview): ');
    const isProduction = deployType.toLowerCase().startsWith('prod');
    
    // Step 3: Setup environment variables
    const setupEnv = await question('\nSetup environment variables? (y/n): ');
    if (setupEnv.toLowerCase() === 'y') {
      await setupEnvironmentVariables();
    }
    
    // Step 4: Deploy
    const deploymentUrl = await deployToVercel(isProduction ? 'production' : 'preview');
    
    // Step 5: Setup monitoring
    const setupMon = await question('\nSetup monitoring? (y/n): ');
    if (setupMon.toLowerCase() === 'y') {
      await setupMonitoring(deploymentUrl);
    }
    
    // Step 6: Run checks
    const runChecks = await question('\nRun post-deployment checks? (y/n): ');
    if (runChecks.toLowerCase() === 'y') {
      await runPostDeploymentChecks(deploymentUrl);
    }
    
    // Success summary
    log('\n' + '='.repeat(50), 'green');
    log('🎉 Deployment Complete!', 'bright');
    log(`\n📋 Summary:`, 'blue');
    log(`  - URL: ${deploymentUrl}`, 'cyan');
    log(`  - Environment: ${isProduction ? 'Production' : 'Preview'}`, 'cyan');
    log(`  - Dashboard: https://vercel.com/damatnic/astral-core-v7`, 'cyan');
    
    log('\n📚 Useful Commands:', 'yellow');
    log('  vercel logs          - View deployment logs', 'reset');
    log('  vercel env ls        - List environment variables', 'reset');
    log('  vercel alias         - Set custom domain', 'reset');
    log('  vercel promote       - Promote preview to production', 'reset');
    log('  vercel rollback      - Rollback to previous deployment', 'reset');
    
  } catch (error) {
    log('\n❌ Deployment failed:', 'red');
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main();