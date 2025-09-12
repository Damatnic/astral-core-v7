#!/usr/bin/env node

/**
 * Environment Variables Verification Script
 * 
 * This script verifies that all required environment variables are properly set
 * in Vercel for the Astral Core application. It checks both local and remote
 * environment configurations.
 * 
 * Usage:
 *   node scripts/verify-env-vars.js [--env=production|preview|development] [--local-only]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnvVarsVerifier {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.envFile = path.join(this.projectRoot, '.env.production.local');
    this.targetEnv = this.getTargetEnvironment();
    this.localOnly = process.argv.includes('--local-only');
    
    this.criticalVars = [
      'NEXTAUTH_SECRET',
      'ENCRYPTION_KEY', 
      'JWT_SIGNING_KEY',
      'CSRF_SECRET',
      'DATABASE_URL',
      'DIRECT_URL',
      'NEXTAUTH_URL',
      'NEXT_PUBLIC_APP_URL'
    ];

    this.results = {
      local: { passed: 0, failed: 0, missing: [], issues: [] },
      vercel: { passed: 0, failed: 0, missing: [], issues: [] },
      total: 0
    };
  }

  getTargetEnvironment() {
    const envArg = process.argv.find(arg => arg.startsWith('--env='));
    if (envArg) {
      const env = envArg.split('=')[1];
      if (['production', 'preview', 'development'].includes(env)) {
        return env;
      }
    }
    return 'production';
  }

  parseLocalEnvFile() {
    console.log(`📁 Checking local environment file: ${this.envFile}`);
    
    if (!fs.existsSync(this.envFile)) {
      throw new Error(`Local environment file not found: ${this.envFile}`);
    }

    const content = fs.readFileSync(this.envFile, 'utf-8');
    const envVars = {};
    // Handle both actual newlines and \n as text in the file
    const normalizedContent = content.replace(/\\n/g, '\n');
    const lines = normalizedContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    for (const line of lines) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        let [, key, value] = match;
        
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        envVars[key] = value;
      }
    }

    console.log(`✅ Found ${Object.keys(envVars).length} variables in local file`);
    this.results.total = Object.keys(envVars).length;
    return envVars;
  }

  verifyLocalVariables(envVars) {
    console.log('\n🔍 Verifying Local Environment Variables');
    console.log('=====================================');

    for (const [key, value] of Object.entries(envVars)) {
      const isCritical = this.criticalVars.includes(key);
      const status = this.validateVariable(key, value, 'local');
      
      if (status.valid) {
        this.results.local.passed++;
        console.log(`✅ ${key} ${isCritical ? '(CRITICAL)' : ''}`);
      } else {
        this.results.local.failed++;
        this.results.local.issues.push({ key, ...status });
        console.log(`❌ ${key} ${isCritical ? '(CRITICAL)' : ''} - ${status.reason}`);
        
        if (isCritical) {
          this.results.local.missing.push(key);
        }
      }
    }
  }

  async verifyVercelVariables(localVars) {
    if (this.localOnly) {
      console.log('\n⏭️  Skipping Vercel verification (--local-only flag)');
      return;
    }

    console.log(`\n🚀 Verifying Vercel Environment Variables (${this.targetEnv})`);
    console.log('===================================================');

    try {
      // Check if Vercel CLI is available
      execSync('vercel --version', { stdio: 'pipe' });
    } catch (error) {
      console.log('❌ Vercel CLI not found. Install with: npm i -g vercel');
      this.results.vercel.issues.push({ 
        key: 'VERCEL_CLI', 
        reason: 'Vercel CLI not installed',
        critical: true 
      });
      return;
    }

    try {
      // Get Vercel environment variables
      const vercelEnvOutput = execSync(`vercel env ls ${this.targetEnv}`, { 
        encoding: 'utf-8', 
        stdio: 'pipe' 
      });

      const vercelVars = this.parseVercelEnvOutput(vercelEnvOutput);
      
      console.log(`✅ Found ${vercelVars.size} variables in Vercel ${this.targetEnv} environment`);

      // Compare with local variables
      for (const [key, localValue] of Object.entries(localVars)) {
        const isCritical = this.criticalVars.includes(key);
        
        if (vercelVars.has(key)) {
          this.results.vercel.passed++;
          console.log(`✅ ${key} ${isCritical ? '(CRITICAL)' : ''} - Present in Vercel`);
          
          // For non-sensitive variables, we could compare values
          // But for security, we'll just check presence
          
        } else {
          this.results.vercel.failed++;
          this.results.vercel.issues.push({ 
            key, 
            reason: 'Missing from Vercel environment',
            critical: isCritical 
          });
          console.log(`❌ ${key} ${isCritical ? '(CRITICAL)' : ''} - Missing from Vercel`);
          
          if (isCritical) {
            this.results.vercel.missing.push(key);
          }
        }
      }

    } catch (error) {
      console.log(`❌ Failed to fetch Vercel environment variables: ${error.message}`);
      this.results.vercel.issues.push({ 
        key: 'VERCEL_ACCESS', 
        reason: `Failed to access Vercel environment: ${error.message}`,
        critical: true 
      });
    }
  }

  parseVercelEnvOutput(output) {
    const vercelVars = new Set();
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Parse Vercel CLI output format
      // Usually something like: "VARIABLE_NAME    production    ****"
      const match = line.trim().match(/^([A-Z_][A-Z0-9_]*)\s+/);
      if (match) {
        vercelVars.add(match[1]);
      }
    }
    
    return vercelVars;
  }

  validateVariable(key, value, source) {
    // Check if variable has a value
    if (value === undefined || value === null) {
      return { valid: false, reason: 'undefined or null' };
    }

    // Check for empty values on critical variables
    if (this.criticalVars.includes(key) && (!value || value.trim() === '')) {
      return { valid: false, reason: 'empty value on critical variable' };
    }

    // Check for placeholder values
    const placeholders = [
      'your-secret-here',
      'change-me',
      'placeholder',
      'user:password@host:port/database',
      'postgresql://user:password@host:port/database'
    ];
    
    if (placeholders.some(placeholder => value.includes(placeholder))) {
      return { valid: false, reason: 'contains placeholder value' };
    }

    // Specific validations
    if (key === 'NODE_ENV' && !['production', 'development', 'test'].includes(value)) {
      return { valid: false, reason: 'invalid NODE_ENV value' };
    }

    if (key.includes('URL') && value && !this.isValidUrl(value)) {
      return { valid: false, reason: 'invalid URL format' };
    }

    if (key.includes('EMAIL') && key !== 'EMAIL_PROVIDER' && value && !this.isValidEmail(value)) {
      return { valid: false, reason: 'invalid email format' };
    }

    // Check minimum length for secrets
    if (key.includes('SECRET') || key.includes('KEY')) {
      if (value && value.length < 32) {
        return { valid: false, reason: 'secret/key too short (minimum 32 characters)' };
      }
    }

    return { valid: true };
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  generateRecommendations() {
    const recommendations = [];

    // Critical missing variables
    if (this.results.local.missing.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Critical Variables Missing',
        items: this.results.local.missing.map(key => 
          `Set ${key} in .env.production.local`
        )
      });
    }

    if (this.results.vercel.missing.length > 0) {
      recommendations.push({
        priority: 'HIGH', 
        category: 'Critical Variables Missing in Vercel',
        items: this.results.vercel.missing.map(key => 
          `Set ${key} in Vercel ${this.targetEnv} environment`
        )
      });
    }

    // General issues
    const localIssues = this.results.local.issues.filter(issue => !this.results.local.missing.includes(issue.key));
    if (localIssues.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Local Configuration Issues',
        items: localIssues.map(issue => 
          `Fix ${issue.key}: ${issue.reason}`
        )
      });
    }

    const vercelIssues = this.results.vercel.issues.filter(issue => !this.results.vercel.missing.includes(issue.key));
    if (vercelIssues.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Vercel Configuration Issues', 
        items: vercelIssues.map(issue => 
          `Fix ${issue.key}: ${issue.reason}`
        )
      });
    }

    return recommendations;
  }

  generateReport() {
    console.log('\n📊 VERIFICATION REPORT');
    console.log('===================');
    
    console.log(`\n📋 Summary:`);
    console.log(`Total variables: ${this.results.total}`);
    console.log(`Local verification: ${this.results.local.passed}/${this.results.total} passed`);
    
    if (!this.localOnly) {
      console.log(`Vercel verification: ${this.results.vercel.passed}/${this.results.total} passed`);
    }

    // Overall status
    const hasLocalIssues = this.results.local.failed > 0;
    const hasVercelIssues = !this.localOnly && this.results.vercel.failed > 0;
    const hasCriticalIssues = this.results.local.missing.length > 0 || this.results.vercel.missing.length > 0;

    console.log(`\n🚦 Status: ${hasCriticalIssues ? '🔴 CRITICAL ISSUES' : hasLocalIssues || hasVercelIssues ? '🟡 WARNINGS' : '🟢 ALL GOOD'}`);

    // Recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach(rec => {
        console.log(`\n${rec.priority === 'HIGH' ? '🚨' : '⚠️'}  ${rec.category} (${rec.priority} priority):`);
        rec.items.forEach(item => console.log(`   • ${item}`));
      });
    }

    // Next steps
    console.log('\n🚀 Next Steps:');
    if (hasCriticalIssues) {
      console.log('1. Fix critical missing variables above');
      console.log('2. Re-run verification: node scripts/verify-env-vars.js');
      console.log('3. Test deployment: vercel --prod');
    } else if (hasLocalIssues || hasVercelIssues) {
      console.log('1. Review and fix warnings above');
      console.log('2. Re-run verification: node scripts/verify-env-vars.js'); 
      console.log('3. Proceed with deployment');
    } else {
      console.log('1. Environment variables are properly configured!');
      console.log('2. Proceed with deployment: vercel --prod');
      console.log('3. Monitor deployment logs: vercel logs');
    }

    return !hasCriticalIssues;
  }

  async run() {
    try {
      console.log('🔍 Astral Core - Environment Variables Verification');
      console.log('===============================================\n');
      
      console.log(`Target environment: ${this.targetEnv}`);
      console.log(`Local only mode: ${this.localOnly ? 'Yes' : 'No'}`);

      // Parse local environment variables
      const localVars = this.parseLocalEnvFile();
      
      // Verify local variables
      this.verifyLocalVariables(localVars);
      
      // Verify Vercel variables  
      await this.verifyVercelVariables(localVars);
      
      // Generate report
      const success = this.generateReport();
      
      console.log('\n✨ Verification completed!');
      
      // Exit with appropriate code
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error(`\n💥 Verification failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the script
if (require.main === module) {
  const verifier = new EnvVarsVerifier();
  verifier.run();
}

module.exports = EnvVarsVerifier;