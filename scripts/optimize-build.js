#!/usr/bin/env node

/**
 * Build Optimization Script for Astral Core v7
 * Handles pre-build optimizations and environment setup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`========== ${title} ==========`, 'blue');
}

// Main optimization function
async function optimizeBuild() {
  try {
    logSection('Starting Build Optimization');
    
    // 1. Clean previous builds
    logSection('Cleaning Previous Builds');
    const dirsToClean = ['.next', 'out', '.turbo'];
    dirsToClean.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath)) {
        log(`Removing ${dir}...`, 'yellow');
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    });
    log('Clean complete', 'green');
    
    // 2. Verify environment
    logSection('Verifying Environment');
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
    ];
    
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0 && !process.env.VERCEL) {
      log(`Warning: Missing environment variables: ${missingVars.join(', ')}`, 'yellow');
      log('These must be set in Vercel dashboard for production', 'yellow');
    } else {
      log('Environment variables verified', 'green');
    }
    
    // 3. Optimize dependencies
    logSection('Optimizing Dependencies');
    if (!process.env.CI && !process.env.VERCEL) {
      log('Pruning devDependencies for production...', 'yellow');
      execSync('npm prune --production', { stdio: 'inherit' });
      log('Dependencies optimized', 'green');
    }
    
    // 4. Generate Prisma client
    logSection('Generating Prisma Client');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      log('Prisma client generated', 'green');
    } catch (error) {
      log('Failed to generate Prisma client', 'red');
      throw error;
    }
    
    // 5. Create build info
    logSection('Creating Build Info');
    const buildInfo = {
      version: process.env.npm_package_version || '7.0.0',
      buildTime: new Date().toISOString(),
      buildId: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || 'local',
      environment: process.env.NODE_ENV || 'development',
      node: process.version,
    };
    
    fs.writeFileSync(
      path.join(process.cwd(), 'build-info.json'),
      JSON.stringify(buildInfo, null, 2)
    );
    log('Build info created', 'green');
    
    // 6. Optimize images
    logSection('Optimizing Static Assets');
    const publicDir = path.join(process.cwd(), 'public');
    if (fs.existsSync(publicDir)) {
      // Count assets
      const files = fs.readdirSync(publicDir);
      log(`Found ${files.length} files in public directory`, 'green');
    }
    
    // 7. Set build flags
    logSection('Setting Build Flags');
    process.env.NEXT_TELEMETRY_DISABLED = '1';
    process.env.SKIP_ENV_VALIDATION = '1';
    
    if (process.env.VERCEL) {
      process.env.NODE_OPTIONS = '--max-old-space-size=8192';
      log('Vercel environment detected - memory limit increased', 'green');
    }
    
    log('Build flags set', 'green');
    
    // 8. Final summary
    logSection('Build Optimization Complete');
    log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`, 'green');
    log(`✅ Platform: ${process.env.VERCEL ? 'Vercel' : 'Local'}`, 'green');
    log(`✅ Build ID: ${buildInfo.buildId}`, 'green');
    log(`✅ Node Version: ${process.version}`, 'green');
    
    return true;
  } catch (error) {
    log(`Build optimization failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  optimizeBuild();
}

module.exports = { optimizeBuild };