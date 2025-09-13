#!/usr/bin/env node

/**
 * Astral Core v7 - Database Issues Fix Script
 * ==========================================
 * 
 * This script addresses critical database and Prisma issues:
 * 1. Prisma client generation failing with exit code 4294963248
 * 2. Database connection issues
 * 3. Missing Prisma client installation
 * 4. Edge runtime compatibility
 * 
 * Run this script to fix common database setup issues.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Astral Core v7 - Database Issues Fix Script');
console.log('==============================================\n');

async function checkEnvironment() {
  console.log('1. 🔍 Checking environment...');
  
  // Check if .env exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log('   ❌ .env file not found');
    console.log('   💡 Copy .env.example to .env and configure database URLs');
    return false;
  }
  
  // Check DATABASE_URL
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('dummy:dummy@localhost:5432/dummy')) {
    console.log('   ⚠️  Using dummy database URL');
    console.log('   💡 Update DATABASE_URL in .env with real database credentials');
  } else {
    console.log('   ✅ .env file exists with database configuration');
  }
  
  return true;
}

async function checkPrismaSchema() {
  console.log('\n2. 📋 Checking Prisma schema...');
  
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    console.log('   ❌ Prisma schema not found');
    return false;
  }
  
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // Check for edge runtime compatibility
  if (schemaContent.includes('engineType = "library"')) {
    console.log('   ✅ Schema configured for edge runtime');
  } else {
    console.log('   ⚠️  Edge runtime configuration missing');
  }
  
  console.log('   ✅ Prisma schema exists');
  return true;
}

async function fixPrismaClient() {
  console.log('\n3. 🔨 Attempting to fix Prisma client...');
  
  try {
    // Try to check if @prisma/client is installed
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.dependencies['@prisma/client']) {
      console.log('   ❌ @prisma/client not found in dependencies');
      console.log('   💡 Run: npm install @prisma/client');
      return false;
    }
    
    console.log('   ✅ @prisma/client found in package.json');
    
    // Check if node_modules exists
    const nodeModulesPath = path.join(process.cwd(), 'node_modules', '@prisma', 'client');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('   ❌ @prisma/client not installed in node_modules');
      console.log('   💡 Run: npm install');
      return false;
    }
    
    console.log('   ✅ @prisma/client installed');
    return true;
    
  } catch (error) {
    console.log('   ❌ Error checking Prisma client:', error.message);
    return false;
  }
}

async function generatePrismaClient() {
  console.log('\n4. ⚙️  Attempting to generate Prisma client...');
  
  try {
    console.log('   🔄 Running prisma generate...');
    execSync('npx prisma generate --no-engine', { stdio: 'inherit' });
    console.log('   ✅ Prisma client generated successfully');
    return true;
  } catch (error) {
    console.log('   ❌ Prisma generate failed:', error.message);
    console.log('   💡 This might be due to npm permission issues or missing dependencies');
    return false;
  }
}

async function checkDatabaseConnection() {
  console.log('\n5. 🔗 Testing database connection...');
  
  try {
    // Check if we can import Prisma client
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Test connection
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Database connection successful');
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log('   ❌ Database connection failed:', error.message);
    
    if (error.message.includes('Cannot find module')) {
      console.log('   💡 Prisma client not properly installed');
    } else if (error.message.includes('connect')) {
      console.log('   💡 Database connection issues - check DATABASE_URL');
    } else {
      console.log('   💡 Unknown database error');
    }
    
    return false;
  }
}

async function provideFixes() {
  console.log('\n🛠️  Recommended fixes:');
  console.log('=====================\n');
  
  console.log('1. Fix npm permission issues (Windows):');
  console.log('   - Close all Node.js processes and IDE');
  console.log('   - Delete node_modules folder');
  console.log('   - Run: npm cache clean --force');
  console.log('   - Run: npm install');
  
  console.log('\n2. Configure database:');
  console.log('   - Set up PostgreSQL database');
  console.log('   - Update DATABASE_URL in .env');
  console.log('   - Run: npx prisma migrate dev');
  
  console.log('\n3. Generate Prisma client:');
  console.log('   - Run: npx prisma generate');
  console.log('   - Run: npm run build');
  
  console.log('\n4. Seed database (optional):');
  console.log('   - Run: npx prisma db seed');
  
  console.log('\n5. For Vercel deployment:');
  console.log('   - Set DATABASE_URL and DIRECT_URL in Vercel environment');
  console.log('   - Use Prisma Accelerate for edge runtime');
  console.log('   - Ensure build script includes: npx prisma generate');
}

async function main() {
  try {
    const envOk = await checkEnvironment();
    const schemaOk = await checkPrismaSchema();
    const clientOk = await fixPrismaClient();
    
    if (clientOk) {
      await generatePrismaClient();
      await checkDatabaseConnection();
    }
    
    await provideFixes();
    
    console.log('\n🎉 Database diagnosis completed!');
    console.log('\nFor immediate testing with a real database:');
    console.log('1. Update .env with real DATABASE_URL');
    console.log('2. Run: npx prisma migrate dev');
    console.log('3. Run: npx prisma db seed');
    console.log('4. Run: npm run dev');
    
  } catch (error) {
    console.error('\n❌ Fix script failed:', error.message);
    process.exit(1);
  }
}

// Run the fix script
main();