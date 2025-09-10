#!/usr/bin/env node

/**
 * Sync Environment Variables to Vercel
 * 
 * This script reads your local .env.production file and helps you push
 * all variables to Vercel at once using the Vercel CLI.
 * 
 * Usage:
 * 1. Install Vercel CLI: npm i -g vercel
 * 2. Login to Vercel: vercel login
 * 3. Link project: vercel link
 * 4. Run: node scripts/sync-env-to-vercel.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function syncEnvToVercel() {
  try {
    log('\n🚀 Vercel Environment Variable Sync Tool', 'cyan');
    log('=' .repeat(50), 'cyan');

    // Check if Vercel CLI is installed
    try {
      execSync('vercel --version', { stdio: 'ignore' });
    } catch {
      log('\n❌ Vercel CLI is not installed!', 'red');
      log('\nPlease install it first:', 'yellow');
      log('  npm i -g vercel', 'blue');
      log('\nThen login:', 'yellow');
      log('  vercel login', 'blue');
      log('\nThen link your project:', 'yellow');
      log('  vercel link', 'blue');
      process.exit(1);
    }

    // Read .env.production file
    const envPath = path.join(__dirname, '..', '.env.production');
    if (!fs.existsSync(envPath)) {
      log('\n❌ .env.production file not found!', 'red');
      process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    const variables = [];
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) continue;
      
      // Parse KEY=VALUE pairs
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        variables.push({
          key: key.trim(),
          value: value.trim().replace(/^["']|["']$/g, '') // Remove quotes
        });
      }
    }

    log(`\n📦 Found ${variables.length} environment variables to sync`, 'blue');

    // Create a temporary env file for Vercel
    const tempEnvPath = path.join(__dirname, '..', '.env.vercel.temp');
    const envFileContent = variables
      .map(({ key, value }) => `${key}="${value}"`)
      .join('\n');
    
    fs.writeFileSync(tempEnvPath, envFileContent);

    log('\n📤 Pushing environment variables to Vercel...', 'yellow');
    
    // Push to Vercel for all environments
    try {
      // For production
      execSync(`vercel env add production < ${tempEnvPath}`, { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      log('\n✅ Successfully synced to Production environment!', 'green');
    } catch (error) {
      log('\n⚠️  Some variables may already exist. Continuing...', 'yellow');
    }

    // Clean up temp file
    fs.unlinkSync(tempEnvPath);

    log('\n🎉 Environment variables sync complete!', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Go to https://vercel.com/dashboard', 'blue');
    log('2. Select your project', 'blue');
    log('3. Go to Settings → Environment Variables', 'blue');
    log('4. Verify all variables are set correctly', 'blue');
    log('5. Redeploy your application', 'blue');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Alternative: Generate commands for manual execution
function generateManualCommands() {
  log('\n📋 Manual Vercel CLI Commands:', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const envPath = path.join(__dirname, '..', '.env.production');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  const commands = [];
  for (const line of lines) {
    if (line.trim().startsWith('#') || !line.trim()) continue;
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      const cleanKey = key.trim();
      const cleanValue = value.trim().replace(/^["']|["']$/g, '');
      
      // Generate command for each variable
      commands.push(`echo "${cleanValue}" | vercel env add ${cleanKey} production`);
    }
  }
  
  log('\nCopy and run these commands one by one:\n', 'yellow');
  commands.forEach(cmd => log(cmd, 'blue'));
}

// Check if running with --manual flag
if (process.argv.includes('--manual')) {
  generateManualCommands();
} else {
  syncEnvToVercel();
}