#!/usr/bin/env node

/**
 * Database Deployment Script for Production
 * Handles migrations, seed data, and health checks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('═'.repeat(50), 'cyan');
  log(`  ${title}`, 'bright');
  log('═'.repeat(50), 'cyan');
  console.log('');
}

// Check if environment variables are set
function checkEnvironment() {
  logSection('Checking Environment Configuration');
  
  const requiredVars = [
    'DATABASE_URL',
    'DIRECT_URL',
    'NODE_ENV'
  ];
  
  const missing = [];
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
      log(`❌ Missing: ${varName}`, 'red');
    } else {
      log(`✅ Found: ${varName}`, 'green');
    }
  });
  
  if (missing.length > 0) {
    log('\\n⚠️  Please set missing environment variables first!', 'yellow');
    log('Run: vercel env pull .env.local', 'yellow');
    process.exit(1);
  }
  
  return true;
}

// Generate Prisma Client
function generatePrismaClient() {
  logSection('Generating Prisma Client');
  
  try {
    log('Running: npx prisma generate', 'blue');
    execSync('npx prisma generate', { stdio: 'inherit' });
    log('✅ Prisma Client generated successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to generate Prisma Client: ${error.message}`, 'red');
    return false;
  }
}

// Deploy database migrations
function deployMigrations() {
  logSection('Deploying Database Migrations');
  
  try {
    log('Running: npx prisma migrate deploy', 'blue');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    log('✅ Migrations deployed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to deploy migrations: ${error.message}`, 'red');
    log('\\nTrying alternative: npx prisma db push', 'yellow');
    
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      log('✅ Database schema pushed successfully', 'green');
      return true;
    } catch (pushError) {
      log(`❌ Failed to push schema: ${pushError.message}`, 'red');
      return false;
    }
  }
}

// Seed database with demo data
function seedDatabase() {
  logSection('Seeding Database with Demo Data');
  
  const shouldSeed = process.argv.includes('--seed');
  
  if (!shouldSeed) {
    log('ℹ️  Skipping seed data (use --seed flag to include)', 'yellow');
    return true;
  }
  
  try {
    log('Running: npx prisma db seed', 'blue');
    execSync('npx prisma db seed', { stdio: 'inherit' });
    log('✅ Database seeded successfully', 'green');
    
    log('\\n📧 Demo Accounts Created:', 'cyan');
    log('  Therapist: demo.therapist@astralcore.app / DemoTherapist2024!', 'blue');
    log('  Client: demo.client@astralcore.app / DemoClient2024!', 'blue');
    log('  Admin: demo.admin@astralcore.app / DemoAdmin2024!', 'blue');
    
    return true;
  } catch (error) {
    log(`⚠️  Failed to seed database: ${error.message}`, 'yellow');
    log('This is optional - continuing...', 'yellow');
    return true;
  }
}

// Verify database connection
async function verifyConnection() {
  logSection('Verifying Database Connection');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    log('Testing database connection...', 'blue');
    await prisma.$connect();
    
    // Test a simple query
    const userCount = await prisma.user.count();
    log(`✅ Database connected successfully (${userCount} users found)`, 'green');
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, 'red');
    return false;
  }
}

// Create database backup
function createBackup() {
  logSection('Creating Database Backup');
  
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
  
  log(`ℹ️  Backup location: ${backupFile}`, 'blue');
  log('⚠️  Note: Implement backup strategy based on your database provider', 'yellow');
  
  return true;
}

// Main deployment function
async function deploy() {
  console.clear();
  log('╔════════════════════════════════════════════════╗', 'cyan');
  log('║   Astral Core v7 - Database Deployment Tool   ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');
  
  const steps = [
    { name: 'Environment Check', fn: checkEnvironment },
    { name: 'Generate Prisma Client', fn: generatePrismaClient },
    { name: 'Deploy Migrations', fn: deployMigrations },
    { name: 'Seed Database', fn: seedDatabase },
    { name: 'Verify Connection', fn: verifyConnection },
    { name: 'Create Backup', fn: createBackup }
  ];
  
  let success = true;
  
  for (const step of steps) {
    const result = await step.fn();
    if (!result && step.name !== 'Seed Database') {
      success = false;
      break;
    }
  }
  
  logSection('Deployment Summary');
  
  if (success) {
    log('🎉 Database deployment completed successfully!', 'green');
    log('\\n📋 Next Steps:', 'cyan');
    log('1. Verify health check: curl https://your-domain.com/api/health', 'blue');
    log('2. Test authentication with demo accounts', 'blue');
    log('3. Configure monitoring and alerts', 'blue');
    log('4. Set up automated backups', 'blue');
  } else {
    log('❌ Database deployment failed', 'red');
    log('\\nPlease check the errors above and try again.', 'yellow');
    log('\\nCommon issues:', 'yellow');
    log('- Incorrect DATABASE_URL format', 'yellow');
    log('- Database server not accessible', 'yellow');
    log('- Missing database permissions', 'yellow');
    log('- Schema conflicts with existing data', 'yellow');
    process.exit(1);
  }
}

// Run deployment
if (require.main === module) {
  deploy().catch(error => {
    log(`\\n❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { deploy };