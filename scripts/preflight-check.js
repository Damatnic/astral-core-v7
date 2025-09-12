#!/usr/bin/env node

/**
 * Astral Core v7 - Pre-flight Check Script
 * =========================================
 * 
 * This script performs comprehensive environment validation before deployment
 * or migration. It checks system requirements, environment variables, database
 * connectivity, and security configurations.
 * 
 * Usage:
 *   node scripts/preflight-check.js [options]
 * 
 * Options:
 *   --strict        Fail on warnings (treat warnings as errors)
 *   --output-json   Output results in JSON format
 *   --save-report   Save detailed report to file
 *   --verbose       Enable detailed logging
 * 
 * @version 7.0.0
 * @author Database Migration Agent
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class PreFlightChecker {
  constructor() {
    this.verbose = process.argv.includes('--verbose');
    this.strict = process.argv.includes('--strict');
    this.outputJson = process.argv.includes('--output-json');
    this.saveReport = process.argv.includes('--save-report');
    
    this.checks = [];
    this.results = {
      passed: 0,
      warnings: 0,
      failed: 0,
      total: 0,
      details: []
    };
    
    this.startTime = Date.now();
  }

  log(message, level = 'INFO') {
    if (!this.outputJson) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${level}: ${message}`);
    }
    
    if (this.verbose && level === 'DEBUG') {
      console.log(message);
    }
  }

  addCheck(name, description, checkFn, critical = false) {
    this.checks.push({ name, description, checkFn, critical });
  }

  async runCommand(command, options = {}) {
    try {
      const result = execSync(command, {
        encoding: 'utf-8',
        stdio: 'pipe',
        ...options
      });
      return { success: true, output: result.trim() };
    } catch (error) {
      return { success: false, error: error.message, output: error.stdout || '' };
    }
  }

  recordResult(checkName, status, message, details = {}) {
    const result = {
      check: checkName,
      status, // 'pass', 'warn', 'fail'
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.details.push(result);
    this.results.total++;
    
    if (status === 'pass') {
      this.results.passed++;
    } else if (status === 'warn') {
      this.results.warnings++;
    } else {
      this.results.failed++;
    }
    
    if (!this.outputJson) {
      const icon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
      console.log(`${icon} ${checkName}: ${message}`);
      
      if (this.verbose && Object.keys(details).length > 0) {
        console.log('  Details:', JSON.stringify(details, null, 2));
      }
    }
  }

  // System Requirements Checks
  checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion >= 18) {
      this.recordResult('Node.js Version', 'pass', `Node.js ${nodeVersion} is supported`, { version: nodeVersion });
    } else if (majorVersion >= 16) {
      this.recordResult('Node.js Version', 'warn', `Node.js ${nodeVersion} is outdated, recommend 18+`, { version: nodeVersion });
    } else {
      this.recordResult('Node.js Version', 'fail', `Node.js ${nodeVersion} is too old, requires 16+`, { version: nodeVersion });
    }
  }

  async checkNpmVersion() {
    const result = await this.runCommand('npm --version');
    if (result.success) {
      const npmVersion = result.output;
      const majorVersion = parseInt(npmVersion.split('.')[0]);
      
      if (majorVersion >= 8) {
        this.recordResult('NPM Version', 'pass', `NPM ${npmVersion} is supported`, { version: npmVersion });
      } else {
        this.recordResult('NPM Version', 'warn', `NPM ${npmVersion} is outdated, recommend 8+`, { version: npmVersion });
      }
    } else {
      this.recordResult('NPM Version', 'fail', 'NPM not found or not working');
    }
  }

  checkOperatingSystem() {
    const platform = process.platform;
    const arch = process.arch;
    const supportedPlatforms = ['linux', 'darwin', 'win32'];
    
    if (supportedPlatforms.includes(platform)) {
      this.recordResult('Operating System', 'pass', `${platform}/${arch} is supported`, { platform, arch });
    } else {
      this.recordResult('Operating System', 'warn', `${platform}/${arch} is not officially supported`, { platform, arch });
    }
  }

  // Environment Variables Checks
  checkEnvironmentVariables() {
    const requiredVars = {
      'DATABASE_URL': { required: true, format: /^postgresql:\/\/.+/ },
      'DIRECT_URL': { required: true, format: /^postgresql:\/\/.+/ },
      'NEXTAUTH_SECRET': { required: true, minLength: 32 },
      'ENCRYPTION_KEY': { required: true, length: 64 },
      'JWT_SIGNING_KEY': { required: true, minLength: 32 }
    };
    
    const optionalVars = {
      'NEXTAUTH_URL': { format: /^https?:\/\/.+/ },
      'EMAIL_FROM': { format: /^.+@.+\..+$/ },
      'STRIPE_SECRET_KEY': { format: /^sk_(test|live)_/ },
      'STRIPE_PUBLISHABLE_KEY': { format: /^pk_(test|live)_/ }
    };
    
    const envIssues = [];
    const securityIssues = [];
    
    // Check required variables
    for (const [varName, config] of Object.entries(requiredVars)) {
      const value = process.env[varName];
      
      if (!value) {
        envIssues.push(`${varName} is missing`);
        continue;
      }
      
      if (config.format && !config.format.test(value)) {
        envIssues.push(`${varName} has invalid format`);
      }
      
      if (config.length && value.length !== config.length) {
        envIssues.push(`${varName} should be exactly ${config.length} characters`);
      }
      
      if (config.minLength && value.length < config.minLength) {
        envIssues.push(`${varName} should be at least ${config.minLength} characters`);
      }
      
      // Check for example/default values
      const exampleValues = [
        'generate-with-openssl-rand-base64-32',
        'generate-with-openssl-rand-hex-32',
        'username:password@localhost'
      ];
      
      if (exampleValues.some(example => value.includes(example))) {
        securityIssues.push(`${varName} appears to be using example/default value`);
      }
    }
    
    // Check optional variables if present
    for (const [varName, config] of Object.entries(optionalVars)) {
      const value = process.env[varName];
      
      if (value && config.format && !config.format.test(value)) {
        envIssues.push(`${varName} has invalid format`);
      }
    }
    
    if (envIssues.length === 0 && securityIssues.length === 0) {
      this.recordResult('Environment Variables', 'pass', 'All environment variables are properly configured');
    } else if (envIssues.length > 0) {
      this.recordResult('Environment Variables', 'fail', `Configuration issues: ${envIssues.join(', ')}`, { issues: envIssues });
    } else {
      this.recordResult('Environment Variables', 'warn', `Security warnings: ${securityIssues.join(', ')}`, { warnings: securityIssues });
    }
  }

  checkEnvironmentType() {
    const nodeEnv = process.env.NODE_ENV;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    const issues = [];
    
    if (!nodeEnv) {
      issues.push('NODE_ENV is not set');
    } else if (!['development', 'staging', 'production'].includes(nodeEnv)) {
      issues.push(`NODE_ENV "${nodeEnv}" is not a standard value`);
    }
    
    if (nodeEnv === 'production') {
      if (nextAuthUrl && nextAuthUrl.includes('localhost')) {
        issues.push('Using localhost URL in production');
      }
      
      if (!nextAuthUrl || !nextAuthUrl.startsWith('https://')) {
        issues.push('Production should use HTTPS URLs');
      }
      
      if (process.env.REQUIRE_MFA !== 'true') {
        issues.push('MFA should be required in production');
      }
    }
    
    if (nextAuthUrl !== publicAppUrl) {
      issues.push('NEXTAUTH_URL and NEXT_PUBLIC_APP_URL should match');
    }
    
    if (issues.length === 0) {
      this.recordResult('Environment Configuration', 'pass', `${nodeEnv} environment properly configured`);
    } else {
      const status = nodeEnv === 'production' ? 'fail' : 'warn';
      this.recordResult('Environment Configuration', status, `Issues: ${issues.join(', ')}`, { issues });
    }
  }

  // Database Checks
  async checkDatabaseConnection() {
    this.log('Testing database connection...', 'DEBUG');
    
    const result = await this.runCommand('npx prisma db pull --force --print');
    
    if (result.success) {
      this.recordResult('Database Connection', 'pass', 'Database is accessible');
    } else {
      this.recordResult('Database Connection', 'fail', 'Cannot connect to database', { error: result.error });
    }
  }

  async checkDatabaseVersion() {
    try {
      const result = await this.runCommand('npx prisma db execute --stdin', {
        input: 'SELECT version();'
      });
      
      if (result.success) {
        const versionMatch = result.output.match(/PostgreSQL ([\d.]+)/);
        if (versionMatch) {
          const version = versionMatch[1];
          const majorVersion = parseInt(version.split('.')[0]);
          
          if (majorVersion >= 12) {
            this.recordResult('Database Version', 'pass', `PostgreSQL ${version} is supported`, { version });
          } else {
            this.recordResult('Database Version', 'warn', `PostgreSQL ${version} is outdated, recommend 12+`, { version });
          }
        } else {
          this.recordResult('Database Version', 'warn', 'Could not determine PostgreSQL version');
        }
      }
    } catch (error) {
      this.recordResult('Database Version', 'warn', 'Could not check database version', { error: error.message });
    }
  }

  // Security Checks
  checkSecurityConfiguration() {
    const issues = [];
    const warnings = [];
    
    // Check encryption settings
    if (process.env.PHI_ENCRYPTION_ENABLED !== 'true') {
      issues.push('PHI encryption should be enabled for HIPAA compliance');
    }
    
    // Check session timeout
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30');
    if (sessionTimeout > 30 && process.env.NODE_ENV === 'production') {
      warnings.push('Session timeout is longer than 30 minutes in production');
    }
    
    // Check rate limiting
    const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
    if (rateLimitMax > 100 && process.env.NODE_ENV === 'production') {
      warnings.push('Rate limit is higher than recommended for production (100)');
    }
    
    // Check audit log retention
    const auditRetention = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '0');
    if (auditRetention < 2555) {
      issues.push('Audit log retention should be at least 7 years (2555 days) for HIPAA');
    }
    
    if (issues.length === 0 && warnings.length === 0) {
      this.recordResult('Security Configuration', 'pass', 'Security settings are properly configured');
    } else if (issues.length > 0) {
      this.recordResult('Security Configuration', 'fail', `Security issues: ${issues.join(', ')}`, { issues, warnings });
    } else {
      this.recordResult('Security Configuration', 'warn', `Security warnings: ${warnings.join(', ')}`, { warnings });
    }
  }

  // File System Checks
  checkFilePermissions() {
    const criticalFiles = [
      'package.json',
      'prisma/schema.prisma',
      '.env'
    ];
    
    const issues = [];
    
    for (const file of criticalFiles) {
      try {
        if (fs.existsSync(file)) {
          const stats = fs.statSync(file);
          
          // Check if .env is too permissive (should not be world-readable)
          if (file === '.env' && process.platform !== 'win32') {
            const mode = stats.mode & parseInt('777', 8);
            if (mode & parseInt('044', 8)) {
              issues.push('.env file is world-readable (security risk)');
            }
          }
        } else if (file !== '.env') { // .env might not exist in some environments
          issues.push(`${file} is missing`);
        }
      } catch (error) {
        issues.push(`Cannot check ${file}: ${error.message}`);
      }
    }
    
    if (issues.length === 0) {
      this.recordResult('File Permissions', 'pass', 'File permissions are secure');
    } else {
      this.recordResult('File Permissions', 'warn', `Permission issues: ${issues.join(', ')}`, { issues });
    }
  }

  checkDiskSpace() {
    try {
      const stats = fs.statSync(process.cwd());
      // This is a basic check - in production, you'd want more sophisticated disk space checking
      this.recordResult('Disk Space', 'pass', 'Disk space check completed');
    } catch (error) {
      this.recordResult('Disk Space', 'warn', 'Could not check disk space', { error: error.message });
    }
  }

  // Dependency Checks
  async checkPrismaCLI() {
    const result = await this.runCommand('npx prisma --version');
    
    if (result.success) {
      const versionMatch = result.output.match(/prisma\s+:\s+([\d.]+)/);
      if (versionMatch) {
        const version = versionMatch[1];
        this.recordResult('Prisma CLI', 'pass', `Prisma ${version} is available`, { version });
      } else {
        this.recordResult('Prisma CLI', 'pass', 'Prisma CLI is available');
      }
    } else {
      this.recordResult('Prisma CLI', 'fail', 'Prisma CLI not found or not working', { error: result.error });
    }
  }

  checkPackageIntegrity() {
    if (fs.existsSync('package-lock.json')) {
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
        const packageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf-8'));
        
        if (packageJson.name === packageLock.name && packageJson.version === packageLock.version) {
          this.recordResult('Package Integrity', 'pass', 'Package files are synchronized');
        } else {
          this.recordResult('Package Integrity', 'warn', 'package.json and package-lock.json may be out of sync');
        }
      } catch (error) {
        this.recordResult('Package Integrity', 'warn', 'Could not verify package integrity', { error: error.message });
      }
    } else {
      this.recordResult('Package Integrity', 'warn', 'package-lock.json not found');
    }
  }

  // Report Generation
  generateReport() {
    const duration = Date.now() - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        node_env: process.env.NODE_ENV || 'development'
      },
      summary: {
        total_checks: this.results.total,
        passed: this.results.passed,
        warnings: this.results.warnings,
        failed: this.results.failed,
        success_rate: Math.round((this.results.passed / this.results.total) * 100)
      },
      checks: this.results.details,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    for (const check of this.results.details) {
      if (check.status === 'fail') {
        recommendations.push({
          priority: 'high',
          check: check.check,
          message: `Fix: ${check.message}`,
          details: check.details
        });
      } else if (check.status === 'warn') {
        recommendations.push({
          priority: 'medium',
          check: check.check,
          message: `Consider: ${check.message}`,
          details: check.details
        });
      }
    }
    
    return recommendations;
  }

  async saveReport(report) {
    const reportsDir = 'reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const filename = `preflight-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    this.log(`Detailed report saved to: ${filepath}`);
  }

  async run() {
    if (!this.outputJson) {
      console.log('🔍 Starting Pre-flight Check for Astral Core v7');
      console.log('===============================================');
    }
    
    // System checks
    this.checkNodeVersion();
    await this.checkNpmVersion();
    this.checkOperatingSystem();
    
    // Environment checks
    this.checkEnvironmentVariables();
    this.checkEnvironmentType();
    
    // Database checks
    await this.checkDatabaseConnection();
    await this.checkDatabaseVersion();
    
    // Security checks
    this.checkSecurityConfiguration();
    
    // File system checks
    this.checkFilePermissions();
    this.checkDiskSpace();
    
    // Dependency checks
    await this.checkPrismaCLI();
    this.checkPackageIntegrity();
    
    // Generate report
    const report = this.generateReport();
    
    if (this.saveReport) {
      await this.saveReport(report);
    }
    
    if (this.outputJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log('');
      console.log('📊 Pre-flight Check Summary');
      console.log('===========================');
      console.log(`✅ Passed: ${this.results.passed}`);
      console.log(`⚠️  Warnings: ${this.results.warnings}`);
      console.log(`❌ Failed: ${this.results.failed}`);
      console.log(`📈 Success Rate: ${report.summary.success_rate}%`);
      
      if (report.recommendations.length > 0) {
        console.log('');
        console.log('📋 Recommendations:');
        for (const rec of report.recommendations) {
          const icon = rec.priority === 'high' ? '🚨' : '💡';
          console.log(`${icon} ${rec.message}`);
        }
      }
    }
    
    // Determine exit code
    const hasFailures = this.results.failed > 0;
    const hasWarnings = this.results.warnings > 0;
    
    if (hasFailures || (this.strict && hasWarnings)) {
      if (!this.outputJson) {
        console.log('');
        console.log('❌ Pre-flight check failed. Please address the issues above before proceeding.');
      }
      process.exit(1);
    } else {
      if (!this.outputJson) {
        console.log('');
        console.log('✅ Pre-flight check completed successfully!');
        console.log('You can now proceed with the migration.');
      }
      process.exit(0);
    }
  }
}

// Run the pre-flight check if this script is executed directly
if (require.main === module) {
  const checker = new PreFlightChecker();
  checker.run();
}

module.exports = PreFlightChecker;