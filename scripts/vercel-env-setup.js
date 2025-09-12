#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Script
 * 
 * This script automates the process of setting up all required environment variables
 * for the Astral Core application in Vercel. It reads from .env.production.local
 * and generates the necessary Vercel CLI commands.
 * 
 * Usage:
 *   node scripts/vercel-env-setup.js [--dry-run] [--env=production|preview|development]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VercelEnvSetup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.envFile = path.join(this.projectRoot, '.env.production.local');
    this.isDryRun = process.argv.includes('--dry-run');
    this.targetEnv = this.getTargetEnvironment();
    this.commands = [];
    this.errors = [];
    this.successCount = 0;
  }

  getTargetEnvironment() {
    const envArg = process.argv.find(arg => arg.startsWith('--env='));
    if (envArg) {
      const env = envArg.split('=')[1];
      if (['production', 'preview', 'development'].includes(env)) {
        return env;
      }
    }
    return 'production'; // Default to production
  }

  parseEnvFile() {
    console.log(`📁 Reading environment file: ${this.envFile}`);
    
    if (!fs.existsSync(this.envFile)) {
      throw new Error(`Environment file not found: ${this.envFile}`);
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

    console.log(`✅ Found ${Object.keys(envVars).length} environment variables`);
    return envVars;
  }

  categorizeVariables(envVars) {
    const categories = {
      auth: [],
      database: [],
      external_services: [],
      features: [],
      security: [],
      performance: [],
      deployment: []
    };

    for (const [key, value] of Object.entries(envVars)) {
      if (key.includes('AUTH') || key.includes('JWT') || key.includes('SESSION') || 
          key.includes('CSRF') || key.includes('GOOGLE') || key.includes('GITHUB')) {
        categories.auth.push({ key, value });
      } else if (key.includes('DATABASE') || key.includes('DIRECT_URL')) {
        categories.database.push({ key, value });
      } else if (key.includes('STRIPE') || key.includes('RESEND') || key.includes('SENTRY') || 
                 key.includes('WEBHOOK') || key.includes('ANALYTICS')) {
        categories.external_services.push({ key, value });
      } else if (key.includes('ENABLE_') || key.includes('MFA') || key.includes('CRISIS') || 
                 key.includes('WELLNESS') || key.includes('TELETHERAPY')) {
        categories.features.push({ key, value });
      } else if (key.includes('ENCRYPTION') || key.includes('SECRET') || key.includes('CORS') || 
                 key.includes('PHI_') || key.includes('AUDIT_')) {
        categories.security.push({ key, value });
      } else if (key.includes('CACHE') || key.includes('RATE_LIMIT') || key.includes('HEALTH_CHECK') || 
                 key.includes('LOG_') || key.includes('TIMEOUT')) {
        categories.performance.push({ key, value });
      } else {
        categories.deployment.push({ key, value });
      }
    }

    return categories;
  }

  generateVercelCommands(envVars) {
    console.log(`\n🚀 Generating Vercel CLI commands for ${this.targetEnv} environment...\n`);
    
    const commands = [];
    
    for (const [key, value] of Object.entries(envVars)) {
      // Skip empty values unless they're explicitly supposed to be empty
      if (!value && !this.isValidEmptyValue(key)) {
        console.log(`⚠️  Skipping ${key} (empty value)`);
        continue;
      }

      // Escape special characters in values
      const escapedValue = this.escapeShellValue(value);
      const command = `vercel env add ${key} ${this.targetEnv} --value="${escapedValue}"`;
      commands.push({ key, command, value });
    }

    return commands;
  }

  isValidEmptyValue(key) {
    // Some environment variables are legitimately empty in certain configurations
    const validEmptyKeys = [
      'SENTRY_DSN',
      'MONITORING_WEBHOOK_URL', 
      'VERCEL_ANALYTICS_ID',
      'RESEND_API_KEY',
      'STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GITHUB_ID',
      'GITHUB_SECRET'
    ];
    return validEmptyKeys.includes(key);
  }

  escapeShellValue(value) {
    // Escape double quotes and backslashes
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  async executeCommands(commands) {
    console.log(`\n${this.isDryRun ? '🔍 DRY RUN MODE - Commands that would be executed:' : '⚡ Executing Vercel commands:'}\n`);

    for (const { key, command, value } of commands) {
      try {
        console.log(`Setting ${key}...`);
        
        if (this.isDryRun) {
          console.log(`  📝 ${command}`);
        } else {
          // Check if variable already exists
          const checkCommand = `vercel env ls ${this.targetEnv}`;
          let existingVars = '';
          
          try {
            existingVars = execSync(checkCommand, { encoding: 'utf-8', stdio: 'pipe' });
          } catch (error) {
            // Ignore errors when checking existing variables
          }

          if (existingVars.includes(key)) {
            console.log(`  ℹ️  ${key} already exists, removing old value...`);
            try {
              execSync(`vercel env rm ${key} ${this.targetEnv} --yes`, { stdio: 'pipe' });
            } catch (error) {
              // Continue if removal fails
            }
          }

          execSync(command, { stdio: 'pipe' });
          console.log(`  ✅ ${key} set successfully`);
          this.successCount++;
        }
        
        this.commands.push(command);
      } catch (error) {
        const errorMsg = `❌ Failed to set ${key}: ${error.message}`;
        console.log(`  ${errorMsg}`);
        this.errors.push(errorMsg);
      }
    }
  }

  generateManualInstructions(categories) {
    console.log('\n📋 MANUAL SETUP INSTRUCTIONS (Vercel Dashboard)');
    console.log('=====================================\n');
    
    console.log('1. Go to your project in Vercel Dashboard');
    console.log('2. Navigate to Settings → Environment Variables');
    console.log('3. Add each variable below:\n');

    Object.entries(categories).forEach(([category, vars]) => {
      if (vars.length === 0) return;
      
      console.log(`\n--- ${category.toUpperCase().replace(/_/g, ' ')} ---`);
      vars.forEach(({ key, value }) => {
        const displayValue = value || '(empty - configure as needed)';
        const maskedValue = this.shouldMaskValue(key) ? '***MASKED***' : displayValue;
        console.log(`${key}=${maskedValue}`);
      });
    });
  }

  shouldMaskValue(key) {
    const sensitiveKeys = [
      'NEXTAUTH_SECRET', 'ENCRYPTION_KEY', 'JWT_SIGNING_KEY', 'CSRF_SECRET',
      'SESSION_SECRET', 'DATABASE_URL', 'DIRECT_URL', 'RESEND_API_KEY',
      'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'GOOGLE_CLIENT_SECRET',
      'GITHUB_SECRET'
    ];
    return sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey));
  }

  generateSummaryReport() {
    console.log('\n📊 SETUP SUMMARY REPORT');
    console.log('=======================\n');
    
    console.log(`Environment: ${this.targetEnv}`);
    console.log(`Total variables processed: ${this.commands.length}`);
    console.log(`Successfully set: ${this.successCount}`);
    console.log(`Errors encountered: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach(error => console.log(`  ${error}`));
    }
    
    console.log(`\n✨ Next steps:`);
    console.log('1. Verify all variables are set: node scripts/verify-env-vars.js');
    console.log('2. Test your deployment: vercel --prod');
    console.log('3. Monitor logs: vercel logs');
  }

  async run() {
    try {
      console.log('🌟 Astral Core - Vercel Environment Setup');
      console.log('=========================================\n');
      
      // Parse environment variables
      const envVars = this.parseEnvFile();
      const categories = this.categorizeVariables(envVars);
      
      // Generate commands
      const commands = this.generateVercelCommands(envVars);
      
      // Execute or display commands
      await this.executeCommands(commands);
      
      // Generate manual instructions
      this.generateManualInstructions(categories);
      
      // Show summary
      this.generateSummaryReport();
      
      console.log('\n🎉 Environment setup process completed!');
      
    } catch (error) {
      console.error(`\n💥 Setup failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the script
if (require.main === module) {
  const setup = new VercelEnvSetup();
  setup.run();
}

module.exports = VercelEnvSetup;