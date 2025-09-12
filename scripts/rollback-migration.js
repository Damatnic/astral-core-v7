#!/usr/bin/env node

/**
 * Astral Core v7 - Emergency Migration Rollback Script
 * =====================================================
 * 
 * This script provides emergency rollback capabilities for database migrations.
 * It includes backup validation, automatic rollback procedures, and data recovery options.
 * 
 * Usage:
 *   node scripts/rollback-migration.js [options]
 * 
 * Options:
 *   --target <name>     Rollback to specific migration (default: previous)
 *   --confirm           Skip interactive confirmation
 *   --backup            Create backup before rollback
 *   --restore <file>    Restore from specific backup file
 *   --dry-run           Show what would be rolled back without executing
 *   --verbose           Enable detailed logging
 * 
 * @version 7.0.0
 * @author Database Migration Agent
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class MigrationRollback {
  constructor() {
    this.verbose = process.argv.includes('--verbose');
    this.confirm = process.argv.includes('--confirm');
    this.backup = process.argv.includes('--backup');
    this.dryRun = process.argv.includes('--dry-run');
    
    this.target = this.getArgValue('--target');
    this.restoreFile = this.getArgValue('--restore');
    
    this.startTime = Date.now();
    this.rollbackLog = [];
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  getArgValue(flag) {
    const index = process.argv.indexOf(flag);
    return index !== -1 && index + 1 < process.argv.length ? process.argv[index + 1] : null;
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}`;
    
    console.log(logEntry);
    this.rollbackLog.push(logEntry);
    
    if (this.verbose && level === 'DEBUG') {
      console.log(logEntry);
    }
  }

  logError(message, error = null) {
    this.log(`ERROR: ${message}`, 'ERROR');
    if (error && this.verbose) {
      console.error(error);
      this.rollbackLog.push(`Stack trace: ${error.stack}`);
    }
  }

  async runCommand(command, options = {}) {
    this.log(`Executing: ${command}`, 'DEBUG');
    
    if (this.dryRun) {
      this.log(`DRY RUN: Would execute: ${command}`, 'DEBUG');
      return { success: true, output: '[DRY RUN]' };
    }
    
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

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  async checkPrerequisites() {
    this.log('Checking rollback prerequisites...');
    
    // Check if we're in a git repository
    const gitCheck = await this.runCommand('git status');
    if (!gitCheck.success) {
      this.log('Warning: Not in a git repository. Code rollback will not be available.', 'WARN');
    }
    
    // Check database connection
    const dbCheck = await this.runCommand('npx prisma db pull --force --print');
    if (!dbCheck.success) {
      this.logError('Cannot connect to database');
      return false;
    }
    
    // Check Prisma CLI
    const prismaCheck = await this.runCommand('npx prisma --version');
    if (!prismaCheck.success) {
      this.logError('Prisma CLI not available');
      return false;
    }
    
    this.log('Prerequisites check completed ✓');
    return true;
  }

  async getMigrationHistory() {
    this.log('Retrieving migration history...');
    
    const statusResult = await this.runCommand('npx prisma migrate status');
    if (!statusResult.success) {
      this.logError('Failed to get migration status');
      return null;
    }
    
    // Parse migration status output to get applied migrations
    const migrations = [];
    const lines = statusResult.output.split('\n');
    
    for (const line of lines) {
      if (line.includes('✓') || line.includes('✅')) {
        const migrationMatch = line.match(/(\d{14}_\w+)/);
        if (migrationMatch) {
          migrations.push(migrationMatch[1]);
        }
      }
    }
    
    this.log(`Found ${migrations.length} applied migrations`, 'DEBUG');
    return migrations.reverse(); // Most recent first
  }

  async createBackup() {
    this.log('Creating database backup...');
    
    const backupDir = 'backups';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `rollback-backup-${timestamp}.sql`);
    
    // Extract database connection details
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      this.logError('DATABASE_URL not found');
      return null;
    }
    
    const urlParts = new URL(databaseUrl);
    const host = urlParts.hostname;
    const port = urlParts.port || 5432;
    const database = urlParts.pathname.slice(1);
    const username = urlParts.username;
    const password = urlParts.password;
    
    // Create pg_dump command
    const pgDumpCommand = [
      'pg_dump',
      `--host=${host}`,
      `--port=${port}`,
      `--username=${username}`,
      `--dbname=${database}`,
      '--no-password',
      '--verbose',
      '--clean',
      '--no-owner',
      '--no-privileges',
      `--file=${backupFile}`
    ].join(' ');
    
    // Set PGPASSWORD for authentication
    const backupResult = await this.runCommand(pgDumpCommand, {
      env: { ...process.env, PGPASSWORD: password }
    });
    
    if (backupResult.success && fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      this.log(`Backup created: ${backupFile} (${Math.round(stats.size / 1024)}KB)`);
      return backupFile;
    } else {
      this.logError('Failed to create backup');
      return null;
    }
  }

  async restoreFromBackup(backupFile) {
    this.log(`Restoring database from backup: ${backupFile}`);
    
    if (!fs.existsSync(backupFile)) {
      this.logError(`Backup file not found: ${backupFile}`);
      return false;
    }
    
    // Extract database connection details
    const databaseUrl = process.env.DATABASE_URL;
    const urlParts = new URL(databaseUrl);
    const host = urlParts.hostname;
    const port = urlParts.port || 5432;
    const database = urlParts.pathname.slice(1);
    const username = urlParts.username;
    const password = urlParts.password;
    
    // Create psql restore command
    const psqlCommand = [
      'psql',
      `--host=${host}`,
      `--port=${port}`,
      `--username=${username}`,
      `--dbname=${database}`,
      '--no-password',
      `--file=${backupFile}`
    ].join(' ');
    
    const restoreResult = await this.runCommand(psqlCommand, {
      env: { ...process.env, PGPASSWORD: password }
    });
    
    if (restoreResult.success) {
      this.log('Database restored successfully ✓');
      return true;
    } else {
      this.logError('Failed to restore database');
      return false;
    }
  }

  async performMigrationRollback(targetMigration) {
    this.log(`Rolling back migrations to: ${targetMigration || 'previous state'}`);
    
    if (targetMigration) {
      // Rollback to specific migration
      const rollbackResult = await this.runCommand(`npx prisma migrate resolve --rolled-back ${targetMigration}`);
      if (!rollbackResult.success) {
        this.logError(`Failed to rollback to migration: ${targetMigration}`);
        return false;
      }
    } else {
      // Rollback the most recent migration
      const migrations = await this.getMigrationHistory();
      if (!migrations || migrations.length === 0) {
        this.logError('No migrations found to rollback');
        return false;
      }
      
      const latestMigration = migrations[0];
      this.log(`Rolling back latest migration: ${latestMigration}`);
      
      const rollbackResult = await this.runCommand(`npx prisma migrate resolve --rolled-back ${latestMigration}`);
      if (!rollbackResult.success) {
        this.logError(`Failed to rollback migration: ${latestMigration}`);
        return false;
      }
    }
    
    this.log('Migration rollback completed ✓');
    return true;
  }

  async resetDatabase() {
    this.log('Performing database reset...');
    
    const resetResult = await this.runCommand('npx prisma migrate reset --force');
    if (!resetResult.success) {
      this.logError('Failed to reset database');
      return false;
    }
    
    this.log('Database reset completed ✓');
    return true;
  }

  async regeneratePrismaClient() {
    this.log('Regenerating Prisma client...');
    
    const generateResult = await this.runCommand('npx prisma generate');
    if (!generateResult.success) {
      this.logError('Failed to regenerate Prisma client');
      return false;
    }
    
    this.log('Prisma client regenerated ✓');
    return true;
  }

  async rollbackCodeChanges() {
    this.log('Checking for code changes to rollback...');
    
    const statusResult = await this.runCommand('git status --porcelain');
    if (!statusResult.success) {
      this.log('Cannot check git status, skipping code rollback', 'WARN');
      return true;
    }
    
    if (statusResult.output.trim()) {
      this.log('Uncommitted changes detected');
      
      if (!this.confirm) {
        const answer = await this.askQuestion('Do you want to discard uncommitted changes? (y/N): ');
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          this.log('Keeping uncommitted changes');
          return true;
        }
      }
      
      const resetResult = await this.runCommand('git reset --hard HEAD');
      if (resetResult.success) {
        this.log('Uncommitted changes discarded ✓');
      } else {
        this.log('Failed to discard changes', 'WARN');
      }
    } else {
      this.log('No uncommitted changes to rollback');
    }
    
    return true;
  }

  async verifyRollback() {
    this.log('Verifying rollback...');
    
    // Test database connection
    const dbTest = await this.runCommand('npx prisma db pull --force --print');
    if (!dbTest.success) {
      this.logError('Database connection test failed after rollback');
      return false;
    }
    
    // Check migration status
    const statusResult = await this.runCommand('npx prisma migrate status');
    if (!statusResult.success) {
      this.logError('Cannot verify migration status after rollback');
      return false;
    }
    
    this.log('Rollback verification completed ✓');
    this.log('Migration status:', 'DEBUG');
    this.log(statusResult.output, 'DEBUG');
    
    return true;
  }

  async saveRollbackLog() {
    const duration = Date.now() - this.startTime;
    const logContent = [
      '# Astral Core v7 - Rollback Log',
      `Date: ${new Date().toISOString()}`,
      `Duration: ${Math.round(duration / 1000)}s`,
      `Target: ${this.target || 'previous migration'}`,
      `Dry Run: ${this.dryRun}`,
      '',
      '## Rollback Steps:',
      '',
      ...this.rollbackLog,
      '',
      '## Summary:',
      `Rollback ${this.dryRun ? 'simulation' : 'process'} completed in ${Math.round(duration / 1000)} seconds.`
    ].join('\n');
    
    const logDir = 'logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, `rollback-${Date.now()}.log`);
    fs.writeFileSync(logFile, logContent);
    
    this.log(`Rollback log saved to: ${logFile}`);
  }

  async showRollbackPlan() {
    console.log('🔄 Migration Rollback Plan');
    console.log('=========================');
    
    const migrations = await this.getMigrationHistory();
    if (!migrations || migrations.length === 0) {
      console.log('No migrations found to rollback.');
      return false;
    }
    
    console.log('\nCurrent migration status:');
    for (let i = 0; i < Math.min(migrations.length, 5); i++) {
      const migration = migrations[i];
      const marker = i === 0 ? '→ ' : '  ';
      console.log(`${marker}${migration}`);
    }
    
    if (migrations.length > 5) {
      console.log(`  ... and ${migrations.length - 5} more migrations`);
    }
    
    const targetMigration = this.target || migrations[1] || 'initial state';
    console.log(`\nTarget rollback: ${targetMigration}`);
    
    console.log('\nRollback actions:');
    if (this.backup) {
      console.log('  1. Create database backup');
    }
    console.log('  2. Rollback database migrations');
    console.log('  3. Regenerate Prisma client');
    console.log('  4. Verify rollback success');
    
    return true;
  }

  async confirmRollback() {
    if (this.confirm) {
      return true;
    }
    
    console.log('\n⚠️  WARNING: This will rollback your database!');
    console.log('This action may result in data loss if not properly backed up.');
    
    const answer = await this.askQuestion('\nAre you sure you want to proceed? (type "rollback" to confirm): ');
    
    return answer === 'rollback';
  }

  async run() {
    try {
      console.log('🔄 Starting Migration Rollback for Astral Core v7');
      console.log('================================================');
      
      if (this.dryRun) {
        console.log('🧪 DRY RUN MODE - No changes will be made\n');
      }
      
      // Handle restore from backup
      if (this.restoreFile) {
        console.log(`📦 Restoring from backup: ${this.restoreFile}`);
        
        if (await this.confirmRollback()) {
          if (await this.restoreFromBackup(this.restoreFile)) {
            await this.regeneratePrismaClient();
            await this.verifyRollback();
            console.log('\n✅ Database restored successfully!');
          } else {
            console.log('\n❌ Database restore failed!');
            process.exit(1);
          }
        }
        
        this.rl.close();
        return;
      }
      
      // Check prerequisites
      if (!(await this.checkPrerequisites())) {
        process.exit(1);
      }
      
      // Show rollback plan
      if (!(await this.showRollbackPlan())) {
        process.exit(1);
      }
      
      // Confirm rollback
      if (!(await this.confirmRollback())) {
        console.log('\nRollback cancelled by user.');
        this.rl.close();
        return;
      }
      
      // Create backup if requested
      let backupFile = null;
      if (this.backup) {
        backupFile = await this.createBackup();
        if (!backupFile && !this.dryRun) {
          console.log('\n❌ Backup creation failed! Aborting rollback for safety.');
          process.exit(1);
        }
      }
      
      // Perform rollback
      if (!(await this.performMigrationRollback(this.target))) {
        process.exit(1);
      }
      
      // Regenerate Prisma client
      if (!(await this.regeneratePrismaClient())) {
        process.exit(1);
      }
      
      // Rollback code changes if requested
      await this.rollbackCodeChanges();
      
      // Verify rollback
      if (!(await this.verifyRollback())) {
        process.exit(1);
      }
      
      // Save rollback log
      await this.saveRollbackLog();
      
      const duration = Math.round((Date.now() - this.startTime) / 1000);
      
      console.log('');
      console.log(`✅ Rollback ${this.dryRun ? 'simulation' : ''} completed successfully!`);
      console.log(`⏱️  Duration: ${duration}s`);
      
      if (backupFile) {
        console.log(`💾 Backup saved: ${backupFile}`);
      }
      
      console.log('');
      console.log('Next steps:');
      if (this.dryRun) {
        console.log('  1. Review the rollback plan above');
        console.log('  2. Run without --dry-run when ready');
      } else {
        console.log('  1. Test your application: npm run dev');
        console.log('  2. Verify data integrity');
        console.log('  3. Check application functionality');
      }
      
    } catch (error) {
      this.logError('Rollback failed with unexpected error', error);
      await this.saveRollbackLog();
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Run the rollback if this script is executed directly
if (require.main === module) {
  const rollback = new MigrationRollback();
  rollback.run();
}

module.exports = MigrationRollback;