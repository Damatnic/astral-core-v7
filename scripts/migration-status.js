#!/usr/bin/env node

/**
 * Astral Core v7 - Migration Status Checker
 * ==========================================
 * 
 * Quick utility to check the current migration status and database health.
 * 
 * Usage:
 *   node scripts/migration-status.js [options]
 * 
 * Options:
 *   --json          Output in JSON format
 *   --verbose       Show detailed information
 * 
 * @version 7.0.0
 * @author Database Migration Agent
 */

const { execSync } = require('child_process');

class MigrationStatusChecker {
  constructor() {
    this.verbose = process.argv.includes('--verbose');
    this.json = process.argv.includes('--json');
    this.status = {
      database: 'unknown',
      migrations: 'unknown',
      schema: 'unknown',
      client: 'unknown',
      details: {}
    };
  }

  async runCommand(command, silent = false) {
    try {
      const result = execSync(command, {
        encoding: 'utf-8',
        stdio: silent ? 'pipe' : 'inherit'
      });
      return { success: true, output: result.trim() };
    } catch (error) {
      return { success: false, error: error.message, output: error.stdout || '' };
    }
  }

  async checkDatabaseConnection() {
    if (!this.json) console.log('🔍 Checking database connection...');
    
    const result = await this.runCommand('npx prisma db pull --force --print', true);
    
    if (result.success) {
      this.status.database = 'connected';
      if (!this.json) console.log('✅ Database connection: OK');
    } else {
      this.status.database = 'disconnected';
      this.status.details.databaseError = result.error;
      if (!this.json) console.log('❌ Database connection: FAILED');
    }
  }

  async checkMigrationStatus() {
    if (!this.json) console.log('🔍 Checking migration status...');
    
    const result = await this.runCommand('npx prisma migrate status', true);
    
    if (result.success) {
      if (result.output.includes('Database schema is up to date')) {
        this.status.migrations = 'up-to-date';
        if (!this.json) console.log('✅ Migrations: Up to date');
      } else if (result.output.includes('pending migration')) {
        this.status.migrations = 'pending';
        if (!this.json) console.log('⚠️  Migrations: Pending migrations found');
      } else {
        this.status.migrations = 'unknown';
        if (!this.json) console.log('❓ Migrations: Status unclear');
      }
      
      this.status.details.migrationOutput = result.output;
      
      if (this.verbose && !this.json) {
        console.log('\nMigration Details:');
        console.log(result.output);
      }
    } else {
      this.status.migrations = 'error';
      this.status.details.migrationError = result.error;
      if (!this.json) console.log('❌ Migrations: Error checking status');
    }
  }

  async checkSchemaValidity() {
    if (!this.json) console.log('🔍 Checking schema validity...');
    
    const result = await this.runCommand('npx prisma format --check', true);
    
    if (result.success) {
      this.status.schema = 'valid';
      if (!this.json) console.log('✅ Schema: Valid format');
    } else {
      this.status.schema = 'invalid';
      this.status.details.schemaError = result.error;
      if (!this.json) console.log('⚠️  Schema: Formatting issues detected');
    }
  }

  async checkPrismaClient() {
    if (!this.json) console.log('🔍 Checking Prisma client...');
    
    const result = await this.runCommand('npx prisma --version', true);
    
    if (result.success) {
      this.status.client = 'available';
      this.status.details.prismaVersion = result.output;
      if (!this.json) console.log('✅ Prisma client: Available');
    } else {
      this.status.client = 'unavailable';
      this.status.details.clientError = result.error;
      if (!this.json) console.log('❌ Prisma client: Not available');
    }
  }

  async checkEnvironmentVariables() {
    if (!this.json) console.log('🔍 Checking environment variables...');
    
    const required = ['DATABASE_URL', 'DIRECT_URL'];
    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length === 0) {
      this.status.environment = 'configured';
      if (!this.json) console.log('✅ Environment: All required variables set');
    } else {
      this.status.environment = 'incomplete';
      this.status.details.missingEnvVars = missing;
      if (!this.json) console.log(`❌ Environment: Missing variables: ${missing.join(', ')}`);
    }
  }

  getOverallStatus() {
    const critical = [this.status.database, this.status.environment];
    const important = [this.status.migrations, this.status.client];
    
    if (critical.some(s => s === 'disconnected' || s === 'incomplete')) {
      return 'critical';
    } else if (important.some(s => s === 'error' || s === 'unavailable')) {
      return 'warning';
    } else if (this.status.migrations === 'pending') {
      return 'pending';
    } else {
      return 'healthy';
    }
  }

  displaySummary() {
    if (this.json) {
      console.log(JSON.stringify({
        ...this.status,
        overall: this.getOverallStatus(),
        timestamp: new Date().toISOString()
      }, null, 2));
      return;
    }

    console.log('\n📊 Migration Status Summary');
    console.log('============================');
    
    const overall = this.getOverallStatus();
    let icon;
    switch (overall) {
      case 'healthy': icon = '✅'; break;
      case 'pending': icon = '⏳'; break;
      case 'warning': icon = '⚠️'; break;
      case 'critical': icon = '❌'; break;
      default: icon = '❓';
    }
    
    console.log(`${icon} Overall Status: ${overall.toUpperCase()}`);
    console.log('');
    
    // Recommendations
    if (overall === 'critical') {
      console.log('🚨 CRITICAL ISSUES DETECTED:');
      console.log('  - Cannot proceed with migrations');
      console.log('  - Fix database connection and environment variables first');
      console.log('  - Run: npm run migration:preflight');
    } else if (overall === 'warning') {
      console.log('⚠️  WARNINGS DETECTED:');
      console.log('  - Some issues may prevent successful migration');
      console.log('  - Review and fix issues before proceeding');
      console.log('  - Run: npm run migration:preflight');
    } else if (overall === 'pending') {
      console.log('⏳ MIGRATIONS PENDING:');
      console.log('  - Database schema is not up to date');
      console.log('  - Run: npm run migration:run');
    } else {
      console.log('🎉 SYSTEM READY:');
      console.log('  - All systems operational');
      console.log('  - No migrations pending');
    }
  }

  async run() {
    if (!this.json) {
      console.log('🔍 Checking Migration Status for Astral Core v7');
      console.log('===============================================');
    }
    
    await this.checkEnvironmentVariables();
    await this.checkDatabaseConnection();
    await this.checkMigrationStatus();
    await this.checkSchemaValidity();
    await this.checkPrismaClient();
    
    this.displaySummary();
    
    const overall = this.getOverallStatus();
    process.exit(overall === 'critical' ? 2 : overall === 'warning' ? 1 : 0);
  }
}

// Run the status check if this script is executed directly
if (require.main === module) {
  const checker = new MigrationStatusChecker();
  checker.run();
}

module.exports = MigrationStatusChecker;