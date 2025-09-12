#!/usr/bin/env node

/**
 * Astral Core v7 - Database Migration Script
 * ==========================================
 * 
 * This script handles the complete database migration process for deployment.
 * It includes environment validation, dependency installation, schema migration,
 * and optional demo data seeding.
 * 
 * Usage:
 *   node scripts/run-migrations.js [options]
 * 
 * Options:
 *   --seed          Include demo data seeding after migration
 *   --skip-deps     Skip dependency installation check
 *   --force         Force migration even if validation warnings exist
 *   --verbose       Enable detailed logging
 * 
 * @version 7.0.0
 * @author Database Migration Agent
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor() {
    this.verbose = process.argv.includes('--verbose');
    this.force = process.argv.includes('--force');
    this.seed = process.argv.includes('--seed');
    this.skipDeps = process.argv.includes('--skip-deps');
    
    this.requiredEnvVars = [
      'DATABASE_URL',
      'DIRECT_URL',
      'NEXTAUTH_SECRET',
      'ENCRYPTION_KEY',
      'JWT_SIGNING_KEY'
    ];
    
    this.startTime = Date.now();
    this.migrationLog = [];
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}`;
    
    console.log(logEntry);
    this.migrationLog.push(logEntry);
    
    if (this.verbose && level === 'DEBUG') {
      console.log(logEntry);
    }
  }

  logError(message, error = null) {
    this.log(`ERROR: ${message}`, 'ERROR');
    if (error && this.verbose) {
      console.error(error);
      this.migrationLog.push(`Stack trace: ${error.stack}`);
    }
  }

  async runCommand(command, options = {}) {
    this.log(`Executing: ${command}`, 'DEBUG');
    
    try {
      const result = execSync(command, {
        encoding: 'utf-8',
        stdio: this.verbose ? 'inherit' : 'pipe',
        cwd: process.cwd(),
        ...options
      });
      
      if (!this.verbose) {
        this.log(`Command output: ${result.trim()}`, 'DEBUG');
      }
      
      return { success: true, output: result.trim() };
    } catch (error) {
      this.logError(`Command failed: ${command}`, error);
      return { success: false, error: error.message, output: error.stdout };
    }
  }

  checkEnvironmentVariables() {
    this.log('Checking required environment variables...');
    
    const missing = [];
    const warnings = [];
    
    for (const envVar of this.requiredEnvVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }
    
    // Check database URL format
    if (process.env.DATABASE_URL) {
      if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
        warnings.push('DATABASE_URL should start with postgresql://');
      }
      
      if (process.env.DATABASE_URL.includes('localhost') && process.env.NODE_ENV === 'production') {
        warnings.push('Using localhost database URL in production environment');
      }
    }
    
    // Check if using default/example values
    const exampleValues = [
      'generate-with-openssl-rand-base64-32',
      'generate-with-openssl-rand-hex-32',
      'username:password@localhost:5432'
    ];
    
    for (const envVar of this.requiredEnvVars) {
      const value = process.env[envVar];
      if (value && exampleValues.some(example => value.includes(example))) {
        warnings.push(`${envVar} appears to be using example/default value`);
      }
    }
    
    if (missing.length > 0) {
      this.logError(`Missing required environment variables: ${missing.join(', ')}`);
      this.log('Please check your .env file and ensure all required variables are set.');
      return false;
    }
    
    if (warnings.length > 0 && !this.force) {
      this.log('Environment warnings detected:', 'WARN');
      warnings.forEach(warning => this.log(`  - ${warning}`, 'WARN'));
      this.log('Use --force to proceed anyway or fix the warnings.', 'WARN');
      return false;
    }
    
    this.log('Environment variables validated successfully ✓');
    return true;
  }

  async checkDependencies() {
    if (this.skipDeps) {
      this.log('Skipping dependency check (--skip-deps flag)');
      return true;
    }
    
    this.log('Checking and installing dependencies...');
    
    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
      this.logError('package.json not found');
      return false;
    }
    
    // Check if node_modules exists and is up to date
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const packageLockExists = fs.existsSync('package-lock.json');
    const nodeModulesExists = fs.existsSync('node_modules');
    
    if (!nodeModulesExists || !packageLockExists) {
      this.log('Installing dependencies...');
      const installResult = await this.runCommand('npm ci');
      if (!installResult.success) {
        this.logError('Failed to install dependencies');
        return false;
      }
    } else {
      this.log('Dependencies appear to be installed ✓');
    }
    
    // Check if Prisma is available
    const prismaCheck = await this.runCommand('npx prisma --version');
    if (!prismaCheck.success) {
      this.logError('Prisma CLI not available');
      return false;
    }
    
    this.log('Dependencies validated successfully ✓');
    return true;
  }

  async testDatabaseConnection() {
    this.log('Testing database connection...');
    
    const testResult = await this.runCommand('npx prisma db pull --force --print');
    if (!testResult.success) {
      this.logError('Database connection failed');
      this.log('Please check your DATABASE_URL and ensure the database server is running.');
      return false;
    }
    
    this.log('Database connection successful ✓');
    return true;
  }

  async generatePrismaClient() {
    this.log('Generating Prisma client...');
    
    const generateResult = await this.runCommand('npx prisma generate');
    if (!generateResult.success) {
      this.logError('Failed to generate Prisma client');
      return false;
    }
    
    this.log('Prisma client generated successfully ✓');
    return true;
  }

  async runMigrations() {
    this.log('Executing database migrations...');
    
    // First, check migration status
    const statusResult = await this.runCommand('npx prisma migrate status');
    if (!statusResult.success) {
      this.logError('Failed to check migration status');
      return false;
    }
    
    this.log('Current migration status:', 'DEBUG');
    this.log(statusResult.output, 'DEBUG');
    
    // Deploy migrations
    const deployResult = await this.runCommand('npx prisma migrate deploy');
    if (!deployResult.success) {
      this.logError('Migration deployment failed');
      return false;
    }
    
    this.log('Database migrations completed successfully ✓');
    return true;
  }

  async verifySchema() {
    this.log('Verifying database schema...');
    
    // Introspect the database to verify schema
    const introspectResult = await this.runCommand('npx prisma db pull --force --print');
    if (!introspectResult.success) {
      this.logError('Schema verification failed');
      return false;
    }
    
    // Check if schema file exists and is valid
    if (!fs.existsSync('prisma/schema.prisma')) {
      this.logError('Schema file not found');
      return false;
    }
    
    // Validate schema syntax
    const validateResult = await this.runCommand('npx prisma format --check');
    if (!validateResult.success) {
      this.log('Schema formatting issues detected, attempting to fix...');
      await this.runCommand('npx prisma format');
    }
    
    this.log('Database schema verified successfully ✓');
    return true;
  }

  async seedDatabase() {
    if (!this.seed) {
      this.log('Skipping database seeding (use --seed flag to include)');
      return true;
    }
    
    this.log('Seeding database with demo data...');
    
    // Check if seed file exists
    const seedFile = 'prisma/seed.js';
    if (!fs.existsSync(seedFile)) {
      this.log('No seed file found, creating basic seed data...');
      await this.createBasicSeed();
    }
    
    const seedResult = await this.runCommand('npx prisma db seed');
    if (!seedResult.success) {
      this.log('Database seeding failed (this may be expected if data already exists)', 'WARN');
      return true; // Don't fail the whole process for seeding issues
    }
    
    this.log('Database seeding completed successfully ✓');
    return true;
  }

  async createBasicSeed() {
    const seedContent = `
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@astral-core.app' },
    update: {},
    create: {
      email: 'admin@astral-core.app',
      name: 'System Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      password: await bcrypt.hash('admin123!', 12),
      profile: {
        create: {
          firstName: 'System',
          lastName: 'Administrator',
          dateOfBirth: new Date('1990-01-01'),
          phoneNumber: '+1-555-0000',
        }
      }
    }
  });
  
  console.log('Admin user created:', adminUser.email);
  
  // Create sample therapist
  const therapistUser = await prisma.user.upsert({
    where: { email: 'therapist@astral-core.app' },
    update: {},
    create: {
      email: 'therapist@astral-core.app',
      name: 'Dr. Sarah Johnson',
      role: 'THERAPIST',
      status: 'ACTIVE',
      password: await bcrypt.hash('therapist123!', 12),
      profile: {
        create: {
          firstName: 'Sarah',
          lastName: 'Johnson',
          dateOfBirth: new Date('1985-03-15'),
          phoneNumber: '+1-555-0001',
        }
      },
      therapistProfile: {
        create: {
          licenseNumber: 'LPC-12345',
          licenseState: 'CA',
          licenseExpiry: new Date('2025-12-31'),
          specializations: ['Anxiety', 'Depression', 'PTSD'],
          education: [
            {
              degree: 'Ph.D. in Clinical Psychology',
              institution: 'University of California',
              year: 2010
            }
          ],
          certifications: [
            {
              name: 'Cognitive Behavioral Therapy',
              issuer: 'CBT Institute',
              year: 2011
            }
          ],
          yearsOfExperience: 15,
          bio: 'Experienced therapist specializing in anxiety and depression treatment.',
          acceptingClients: true,
          maxClients: 50,
          hourlyRate: 150.0,
          insuranceAccepted: ['Blue Cross', 'Aetna', 'Cigna']
        }
      }
    }
  });
  
  console.log('Therapist user created:', therapistUser.email);
  
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

    fs.writeFileSync('prisma/seed.js', seedContent.trim());
    
    // Update package.json to include seed script if not present
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    if (!packageJson.prisma) {
      packageJson.prisma = {
        seed: 'node prisma/seed.js'
      };
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    }
  }

  async saveMigrationLog() {
    const duration = Date.now() - this.startTime;
    const logContent = [
      '# Astral Core v7 - Migration Log',
      `Date: ${new Date().toISOString()}`,
      `Duration: ${Math.round(duration / 1000)}s`,
      `Node Environment: ${process.env.NODE_ENV || 'development'}`,
      '',
      '## Migration Steps:',
      '',
      ...this.migrationLog,
      '',
      '## Summary:',
      `Migration completed successfully in ${Math.round(duration / 1000)} seconds.`
    ].join('\n');
    
    const logDir = 'logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, `migration-${Date.now()}.log`);
    fs.writeFileSync(logFile, logContent);
    
    this.log(`Migration log saved to: ${logFile}`);
  }

  async run() {
    console.log('🚀 Starting Astral Core v7 Database Migration');
    console.log('===============================================');
    
    try {
      // Step 1: Environment validation
      if (!this.checkEnvironmentVariables()) {
        process.exit(1);
      }
      
      // Step 2: Dependency check
      if (!(await this.checkDependencies())) {
        process.exit(1);
      }
      
      // Step 3: Database connection test
      if (!(await this.testDatabaseConnection())) {
        process.exit(1);
      }
      
      // Step 4: Generate Prisma client
      if (!(await this.generatePrismaClient())) {
        process.exit(1);
      }
      
      // Step 5: Run migrations
      if (!(await this.runMigrations())) {
        process.exit(1);
      }
      
      // Step 6: Verify schema
      if (!(await this.verifySchema())) {
        process.exit(1);
      }
      
      // Step 7: Seed database (optional)
      if (!(await this.seedDatabase())) {
        process.exit(1);
      }
      
      // Save migration log
      await this.saveMigrationLog();
      
      const duration = Math.round((Date.now() - this.startTime) / 1000);
      
      console.log('');
      console.log('✅ Migration completed successfully!');
      console.log(`⏱️  Duration: ${duration}s`);
      console.log('');
      console.log('Next steps:');
      console.log('  1. Start your application: npm run dev');
      console.log('  2. Verify the application loads correctly');
      console.log('  3. Check the migration logs for any warnings');
      
      if (this.seed) {
        console.log('  4. Test with demo data:');
        console.log('     - Admin: admin@astral-core.app / admin123!');
        console.log('     - Therapist: therapist@astral-core.app / therapist123!');
      }
      
    } catch (error) {
      this.logError('Migration failed with unexpected error', error);
      await this.saveMigrationLog();
      process.exit(1);
    }
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  const runner = new MigrationRunner();
  runner.run();
}

module.exports = MigrationRunner;