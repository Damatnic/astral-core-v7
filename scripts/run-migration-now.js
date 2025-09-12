#!/usr/bin/env node

/**
 * Run database migrations with proper environment setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Set environment variables
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_4KZmiPFMW9Bt@ep-nameless-breeze-aepyje5o-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
process.env.DIRECT_URL = 'postgresql://neondb_owner:npg_4KZmiPFMW9Bt@ep-nameless-breeze-aepyje5o.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

console.log('🚀 Running Database Migrations');
console.log('================================\n');

const steps = [
  {
    name: 'Generate Prisma Client',
    command: 'npx prisma generate',
    critical: false
  },
  {
    name: 'Push Database Schema',
    command: 'npx prisma db push --skip-generate',
    critical: true
  },
  {
    name: 'Seed Database (Optional)',
    command: 'npx prisma db seed',
    critical: false
  }
];

let allSuccess = true;

for (const step of steps) {
  console.log(`📌 ${step.name}...`);
  
  try {
    const output = execSync(step.command, {
      stdio: 'inherit',
      env: process.env
    });
    console.log(`✅ ${step.name} completed\n`);
  } catch (error) {
    console.log(`❌ ${step.name} failed\n`);
    if (step.critical) {
      console.error('Critical step failed. Stopping migration.');
      process.exit(1);
    }
    allSuccess = false;
  }
}

console.log('\n================================');
console.log('📊 Migration Summary');
console.log('================================');

if (allSuccess) {
  console.log('✅ All migrations completed successfully!');
  console.log('\n🎯 Next Steps:');
  console.log('1. Deploy to production: vercel --prod');
  console.log('2. Test the application: https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app');
  console.log('3. Check health: https://astral-core-v7-r7s1g00qe-astral-productions.vercel.app/api/health');
} else {
  console.log('⚠️ Some steps failed, but critical migrations were successful.');
  console.log('Review the errors above and run individual commands if needed.');
}

console.log('\n📧 Demo Accounts (if seeded):');
console.log('Therapist: demo.therapist@astralcore.app / DemoTherapist2024!');
console.log('Client: demo.client@astralcore.app / DemoClient2024!');
console.log('Admin: demo.admin@astralcore.app / DemoAdmin2024!');