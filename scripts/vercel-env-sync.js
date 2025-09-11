#!/usr/bin/env node

/**
 * Vercel Environment Variable Sync Script
 * Automatically syncs environment variables with Vercel deployment
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

// Environment variable configuration
const ENV_CONFIG = {
  // Always required (will error if missing)
  required: [
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXTAUTH_SECRET',
    'ENCRYPTION_KEY',
    'JWT_SIGNING_KEY'
  ],
  
  // Should be set for production
  recommended: [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'RESEND_API_KEY',
    'SENTRY_DSN'
  ],
  
  // Public variables (exposed to client)
  public: [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_APP_VERSION',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
  ],
  
  // Variables that should use production values
  production: {
    'NODE_ENV': 'production',
    'NEXT_PUBLIC_APP_URL': 'https://astral-core-v7.vercel.app',
    'NEXTAUTH_URL': 'https://astral-core-v7.vercel.app',
    'PHI_ENCRYPTION_ENABLED': 'true',
    'RATE_LIMIT_MAX_REQUESTS': '50',
    'REQUIRE_MFA': 'true',
    'SESSION_TIMEOUT_MINUTES': '15'
  }
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask questions
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Check if Vercel CLI is installed
function checkVercelCLI() {
  try {
    execSync('vercel --version', { stdio: 'ignore' });
    return true;
  } catch {
    console.log(`${colors.red}❌ Vercel CLI is not installed.${colors.reset}`);
    console.log(`${colors.yellow}📦 Installing Vercel CLI globally...${colors.reset}`);
    try {
      execSync('npm install -g vercel', { stdio: 'inherit' });
      console.log(`${colors.green}✅ Vercel CLI installed successfully!${colors.reset}`);
      return true;
    } catch {
      console.log(`${colors.red}❌ Failed to install Vercel CLI. Please install manually: npm install -g vercel${colors.reset}`);
      return false;
    }
  }
}

// Load environment variables from .env file
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return {};
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line.startsWith('#') || !line.trim()) return;
    
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      envVars[key.trim()] = value.trim();
    }
  });
  
  return envVars;
}

// Generate secure random values
function generateSecureValue(type) {
  const crypto = require('crypto');
  
  switch (type) {
    case 'base64':
      return crypto.randomBytes(32).toString('base64');
    case 'hex':
      return crypto.randomBytes(32).toString('hex');
    default:
      return crypto.randomBytes(32).toString('base64');
  }
}

// Sync environment variables with Vercel
async function syncEnvironmentVariables() {
  console.log(`${colors.blue}🚀 Vercel Environment Variable Sync${colors.reset}`);
  console.log('='.repeat(50));
  
  // Check Vercel CLI
  if (!checkVercelCLI()) {
    process.exit(1);
  }
  
  // Load local environment variables
  const envPath = path.join(process.cwd(), '.env.local');
  const examplePath = path.join(process.cwd(), '.env.example');
  
  let envVars = loadEnvFile(envPath);
  const exampleVars = loadEnvFile(examplePath);
  
  if (Object.keys(envVars).length === 0) {
    console.log(`${colors.yellow}⚠️  No .env.local file found. Using .env.example as template.${colors.reset}`);
    envVars = { ...exampleVars };
  }
  
  // Check for required variables
  console.log(`\n${colors.blue}📋 Checking required environment variables...${colors.reset}`);
  
  const missingRequired = [];
  for (const key of ENV_CONFIG.required) {
    if (!envVars[key] || envVars[key] === exampleVars[key]) {
      missingRequired.push(key);
    }
  }
  
  // Generate missing secrets
  if (missingRequired.length > 0) {
    console.log(`${colors.yellow}⚠️  Missing required variables: ${missingRequired.join(', ')}${colors.reset}`);
    
    const generate = await question(`\n${colors.blue}Would you like to generate secure values for missing secrets? (y/n): ${colors.reset}`);
    
    if (generate.toLowerCase() === 'y') {
      for (const key of missingRequired) {
        if (key === 'NEXTAUTH_SECRET' || key === 'JWT_SIGNING_KEY') {
          envVars[key] = generateSecureValue('base64');
          console.log(`${colors.green}✅ Generated ${key}${colors.reset}`);
        } else if (key === 'ENCRYPTION_KEY') {
          envVars[key] = generateSecureValue('hex');
          console.log(`${colors.green}✅ Generated ${key}${colors.reset}`);
        } else {
          const value = await question(`${colors.blue}Enter value for ${key}: ${colors.reset}`);
          envVars[key] = value;
        }
      }
    }
  }
  
  // Apply production overrides
  console.log(`\n${colors.blue}🔧 Applying production configurations...${colors.reset}`);
  Object.assign(envVars, ENV_CONFIG.production);
  
  // Prepare environment variables for Vercel
  const vercelEnvVars = [];
  
  // Add all environment variables
  for (const [key, value] of Object.entries(envVars)) {
    // Skip example values
    if (value === exampleVars[key] && !ENV_CONFIG.production[key]) {
      continue;
    }
    
    // Skip empty values
    if (!value || value === '""' || value === "''") {
      continue;
    }
    
    vercelEnvVars.push({ key, value });
  }
  
  // Ensure public variables are duplicated with NEXT_PUBLIC prefix
  for (const key of ENV_CONFIG.public) {
    if (!key.startsWith('NEXT_PUBLIC_') && envVars[key]) {
      const publicKey = `NEXT_PUBLIC_${key}`;
      if (!envVars[publicKey]) {
        vercelEnvVars.push({ key: publicKey, value: envVars[key] });
      }
    }
  }
  
  // Display summary
  console.log(`\n${colors.blue}📊 Environment Variable Summary:${colors.reset}`);
  console.log(`  Total variables to sync: ${vercelEnvVars.length}`);
  console.log(`  Required variables: ${ENV_CONFIG.required.filter(k => vercelEnvVars.some(v => v.key === k)).length}/${ENV_CONFIG.required.length}`);
  console.log(`  Public variables: ${vercelEnvVars.filter(v => v.key.startsWith('NEXT_PUBLIC_')).length}`);
  
  // Confirm before syncing
  console.log(`\n${colors.yellow}⚠️  This will update environment variables on Vercel${colors.reset}`);
  const confirm = await question(`${colors.blue}Do you want to continue? (y/n): ${colors.reset}`);
  
  if (confirm.toLowerCase() !== 'y') {
    console.log(`${colors.gray}Sync cancelled.${colors.reset}`);
    rl.close();
    return;
  }
  
  // Sync variables with Vercel
  console.log(`\n${colors.blue}🔄 Syncing with Vercel...${colors.reset}`);
  
  try {
    // First, link the project if not already linked
    console.log(`${colors.gray}Linking project...${colors.reset}`);
    execSync('vercel link --yes', { stdio: 'ignore' });
    
    // Add each environment variable
    let successCount = 0;
    let errorCount = 0;
    
    for (const { key, value } of vercelEnvVars) {
      try {
        // Remove existing variable first (if any)
        execSync(`vercel env rm ${key} production --yes`, { stdio: 'ignore' });
      } catch {
        // Ignore errors if variable doesn't exist
      }
      
      try {
        // Add the variable
        const command = `echo ${JSON.stringify(value)} | vercel env add ${key} production`;
        execSync(command, { shell: true, stdio: 'ignore' });
        console.log(`${colors.green}✅ ${key}${colors.reset}`);
        successCount++;
      } catch {
        console.log(`${colors.red}❌ ${key}: Failed to sync${colors.reset}`);
        errorCount++;
      }
    }
    
    console.log(`\n${colors.green}✅ Sync Complete!${colors.reset}`);
    console.log(`  Successfully synced: ${successCount} variables`);
    if (errorCount > 0) {
      console.log(`${colors.red}  Failed: ${errorCount} variables${colors.reset}`);
    }
    
    // Create local backup
    const backupPath = path.join(process.cwd(), '.env.vercel.backup');
    const backupContent = vercelEnvVars
      .map(({ key, value }) => `${key}="${value}"`)
      .join('\n');
    
    fs.writeFileSync(backupPath, backupContent);
    console.log(`\n${colors.gray}📁 Backup saved to: .env.vercel.backup${colors.reset}`);
    
    // Deployment option
    console.log(`\n${colors.blue}🚀 Environment variables synced!${colors.reset}`);
    const deploy = await question(`${colors.blue}Would you like to trigger a new deployment? (y/n): ${colors.reset}`);
    
    if (deploy.toLowerCase() === 'y') {
      console.log(`${colors.blue}🚀 Triggering deployment...${colors.reset}`);
      execSync('vercel --prod', { stdio: 'inherit' });
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Error syncing with Vercel:${colors.reset}`, error.message);
    console.log(`${colors.yellow}💡 Tip: Make sure you're logged in to Vercel CLI: vercel login${colors.reset}`);
  }
  
  rl.close();
}

// Add to package.json scripts
function updatePackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (!packageJson.scripts['vercel:env']) {
    packageJson.scripts['vercel:env'] = 'node scripts/vercel-env-sync.js';
    packageJson.scripts['vercel:deploy'] = 'npm run vercel:env && vercel --prod';
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log(`${colors.green}✅ Added Vercel scripts to package.json${colors.reset}`);
  }
}

// Main execution
async function main() {
  try {
    updatePackageJson();
    await syncEnvironmentVariables();
  } catch (error) {
    console.error(`${colors.red}❌ Script failed:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { syncEnvironmentVariables };