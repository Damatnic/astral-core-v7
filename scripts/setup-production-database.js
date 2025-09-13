#!/usr/bin/env node

/**
 * Astral Core v7 - Production Database Setup Script
 * =================================================
 * 
 * This script sets up the database for production deployment on Vercel.
 * It handles:
 * - Database migration deployment
 * - Prisma client generation
 * - Database seeding (optional)
 * - Health checks
 * 
 * Usage:
 *   NODE_ENV=production node scripts/setup-production-database.js
 *   npm run db:setup:prod
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Astral Core v7 - Production Database Setup');
console.log('==============================================\n');

function checkEnvironment() {
  console.log('1. 🔍 Checking environment variables...');
  
  const required = ['DATABASE_URL', 'DIRECT_URL'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.log(`   ❌ Missing environment variables: ${missing.join(', ')}`);
    console.log('   💡 Set these variables in your deployment environment');
    process.exit(1);
  }
  
  // Check if URLs contain dummy values
  if (process.env.DATABASE_URL.includes('dummy') || process.env.DIRECT_URL.includes('dummy')) {
    console.log('   ⚠️  Warning: Database URLs contain dummy values');
    console.log('   💡 Update DATABASE_URL and DIRECT_URL with real database credentials');
    process.exit(1);
  }
  
  console.log('   ✅ Environment variables configured');
}

function generatePrismaClient() {
  console.log('\n2. ⚙️  Generating Prisma client...');
  
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('   ✅ Prisma client generated successfully');
  } catch (error) {
    console.log('   ❌ Failed to generate Prisma client');
    throw error;
  }
}

function deployMigrations() {
  console.log('\n3. 🗄️  Deploying database migrations...');
  
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('   ✅ Migrations deployed successfully');
  } catch (error) {
    console.log('   ❌ Failed to deploy migrations');
    throw error;
  }
}

function testDatabaseConnection() {
  console.log('\n4. 🔗 Testing database connection...');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Test basic connection
    return prisma.$queryRaw`SELECT 1 as test`
      .then(() => {
        console.log('   ✅ Database connection successful');
        return prisma.$disconnect();
      })
      .catch((error) => {
        console.log('   ❌ Database connection failed:', error.message);
        throw error;
      });
      
  } catch (error) {
    console.log('   ❌ Cannot test connection:', error.message);
    throw error;
  }
}

function seedDatabase() {
  console.log('\n5. 🌱 Seeding database (optional)...');
  
  // Check if SKIP_SEED is set
  if (process.env.SKIP_SEED === 'true') {
    console.log('   ⏭️  Skipping database seeding (SKIP_SEED=true)');
    return;
  }
  
  try {
    execSync('npx prisma db seed', { stdio: 'inherit' });
    console.log('   ✅ Database seeded successfully');
  } catch (error) {
    console.log('   ⚠️  Database seeding failed (non-critical):', error.message);
    console.log('   💡 You can seed manually later with: npx prisma db seed');
  }
}

function createHealthCheck() {
  console.log('\n6. 🏥 Setting up health check...');
  
  const healthCheckContent = `
/**
 * Database Health Check
 * ====================
 * Simple health check endpoint for monitoring database connectivity
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test database connection
    await prisma.$queryRaw\`SELECT 1 as health_check\`;
    
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    await prisma.$disconnect();
  }
}
`;

  const healthCheckPath = path.join(process.cwd(), 'pages', 'api', 'health', 'database.js');
  const healthCheckDir = path.dirname(healthCheckPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(healthCheckDir)) {
    fs.mkdirSync(healthCheckDir, { recursive: true });
  }
  
  fs.writeFileSync(healthCheckPath, healthCheckContent.trim());
  console.log('   ✅ Health check endpoint created at /api/health/database');
}

async function main() {
  try {
    checkEnvironment();
    generatePrismaClient();
    deployMigrations();
    await testDatabaseConnection();
    seedDatabase();
    createHealthCheck();
    
    console.log('\n🎉 Production database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Deploy your application');
    console.log('   2. Test the health check: GET /api/health/database');
    console.log('   3. Verify application functionality');
    console.log('\n🔗 Health check endpoint: /api/health/database');
    
  } catch (error) {
    console.error('\n❌ Production setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Verify database credentials');
    console.error('   2. Check network connectivity');
    console.error('   3. Ensure database exists and is accessible');
    console.error('   4. Check Prisma schema for errors');
    process.exit(1);
  }
}

// Run the setup
main();