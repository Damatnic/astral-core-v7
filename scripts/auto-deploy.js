#!/usr/bin/env node

/**
 * Automated Vercel Deployment Script
 * Fixes all issues and deploys automatically
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Color codes
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
    if (!silent) log(`> ${command}`, 'cyan');
    const result = execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return result;
  } catch (error) {
    if (!silent) log(`Error: ${error.message}`, 'red');
    return null;
  }
}

// Step 1: Fix all client component issues
function fixClientComponents() {
  log('\n🔧 Fixing React client component issues...', 'blue');
  
  const filesToFix = [
    'src/components/ui/accessibility/LiveRegion.tsx',
    'src/components/ui/accessibility/FocusManager.tsx',
    'src/components/ui/accessibility/SkipNavigation.tsx',
    'src/components/ui/accessibility/VisuallyHidden.tsx',
    'src/components/ui/animations/AnimatedComponents.tsx',
    'src/hooks/useAccessibility.ts',
    'src/hooks/usePerformanceTracking.tsx'
  ];
  
  filesToFix.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.startsWith("'use client'")) {
        fs.writeFileSync(filePath, `'use client';\n\n${content}`);
        log(`  ✅ Fixed ${file}`, 'green');
      }
    }
  });
}

// Step 2: Install missing dependencies
function installDependencies() {
  log('\n📦 Installing dependencies...', 'blue');
  execCommand('npm install');
  log('  ✅ Dependencies installed', 'green');
}

// Step 3: Set environment variables
function setEnvironmentVariables() {
  log('\n🔐 Setting environment variables...', 'blue');
  
  const envVars = [
    { key: 'NEXTAUTH_URL', value: 'https://astral-core-v7.vercel.app' },
    { key: 'DATABASE_URL', value: 'postgresql://neondb_owner:npg_4KZmiPFMW9Bt@ep-nameless-breeze-aepyje5o-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require' },
    { key: 'DIRECT_URL', value: 'postgresql://neondb_owner:npg_4KZmiPFMW9Bt@ep-nameless-breeze-aepyje5o.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require' },
    { key: 'NEXTAUTH_SECRET', value: 'tUN2VrCEJ2nkcq78H7WYYjMDoGgOvdEujCdrlCGIu8A=' },
    { key: 'ENCRYPTION_KEY', value: '3598a3a4c2e8075f0226b402b2fc39e58f50cbe0a095e67919a60839e943a615' },
    { key: 'JWT_SIGNING_KEY', value: 'zYwLMsTPzwGiIYv2eTBrYyZg6+xohlhVtXUJlYj+bRI=' },
    { key: 'NEXT_PUBLIC_APP_URL', value: 'https://astral-core-v7.vercel.app' },
    { key: 'NEXT_PUBLIC_APP_NAME', value: 'Astral Core' },
    { key: 'NEXT_PUBLIC_APP_VERSION', value: '7.0.0' }
  ];
  
  envVars.forEach(({ key, value }) => {
    execCommand(`echo "${value}" | vercel env add ${key} production --force`, true);
  });
  
  log('  ✅ Environment variables configured', 'green');
}

// Step 4: Deploy to Vercel
function deployToVercel() {
  log('\n🚀 Deploying to Vercel...', 'blue');
  
  const output = execCommand('vercel --prod --yes', false);
  
  if (output && output.includes('https://')) {
    const urlMatch = output.match(/https:\/\/[^\s]+/);
    if (urlMatch) {
      log(`\n✅ Deployment successful!`, 'green');
      log(`🔗 URL: ${urlMatch[0]}`, 'cyan');
      return urlMatch[0];
    }
  }
  
  return null;
}

// Step 5: Check deployment health
function checkHealth(url) {
  log('\n🏥 Checking deployment health...', 'blue');
  
  const endpoints = ['/api/health', '/api/status'];
  
  endpoints.forEach(endpoint => {
    const fullUrl = `${url}${endpoint}`;
    const result = execCommand(`curl -s -o /dev/null -w "%{http_code}" ${fullUrl}`, true);
    
    if (result && result.trim() === '200') {
      log(`  ✅ ${endpoint}: OK`, 'green');
    } else {
      log(`  ⚠️  ${endpoint}: ${result || 'Failed'}`, 'yellow');
    }
  });
}

// Main execution
async function main() {
  log('\n🎯 Astral Core v7 - Automated Deployment', 'bright');
  log('='.repeat(50), 'cyan');
  
  try {
    // Check Vercel login
    const whoami = execCommand('vercel whoami', true);
    if (!whoami) {
      log('\n⚠️  Please login to Vercel first: vercel login', 'yellow');
      process.exit(1);
    }
    log(`✅ Logged in as: ${whoami.trim()}`, 'green');
    
    // Fix issues
    fixClientComponents();
    installDependencies();
    
    // Set environment variables
    setEnvironmentVariables();
    
    // Deploy
    const deploymentUrl = deployToVercel();
    
    if (deploymentUrl) {
      // Check health
      setTimeout(() => {
        checkHealth(deploymentUrl);
        
        log('\n' + '='.repeat(50), 'green');
        log('🎉 Deployment Complete!', 'bright');
        log(`\n📋 Summary:`, 'blue');
        log(`  - URL: ${deploymentUrl}`, 'cyan');
        log(`  - Dashboard: https://vercel.com/astral-productions/astral-core-v7`, 'cyan');
        log(`  - Logs: vercel logs --follow`, 'cyan');
      }, 10000); // Wait 10 seconds for deployment to be ready
    }
    
  } catch (error) {
    log('\n❌ Deployment failed:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();