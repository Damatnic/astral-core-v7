#!/usr/bin/env node

/**
 * Continuous Quality Check Agent
 * Monitors and fixes TypeScript, ESLint, and build issues continuously
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class QualityAgent {
  constructor(name, port) {
    this.name = name;
    this.port = port;
    this.issues = [];
    this.isRunning = false;
    this.logFile = path.join(__dirname, `${name}-agent.log`);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${this.name}] ${message}\n`;
    console.log(logEntry.trim());
    fs.appendFileSync(this.logFile, logEntry);
  }

  async runCommand(command, description) {
    return new Promise((resolve, reject) => {
      this.log(`Running: ${description}`);
      exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          this.log(`ERROR in ${description}: ${error.message}`);
          this.issues.push({ type: 'ERROR', command, error: error.message, stderr });
          resolve({ success: false, error, stdout, stderr });
        } else {
          this.log(`SUCCESS: ${description}`);
          resolve({ success: true, stdout, stderr });
        }
      });
    });
  }

  async checkTypeScript() {
    this.log('🔍 Checking TypeScript...');
    const result = await this.runCommand('npx tsc --noEmit', 'TypeScript Check');
    
    if (!result.success && result.stderr) {
      // Parse TypeScript errors
      const errors = result.stderr.split('\n').filter(line => line.includes('error TS'));
      this.log(`Found ${errors.length} TypeScript errors`);
      return { hasErrors: true, errors, output: result.stderr };
    }
    
    this.log('✅ TypeScript check passed');
    return { hasErrors: false, errors: [], output: result.stdout };
  }

  async checkESLint() {
    this.log('🔍 Checking ESLint...');
    const result = await this.runCommand('npx eslint . --ext .ts,.tsx --format json', 'ESLint Check');
    
    try {
      const eslintResults = JSON.parse(result.stdout || '[]');
      let errorCount = 0;
      let warningCount = 0;
      
      eslintResults.forEach(file => {
        errorCount += file.errorCount || 0;
        warningCount += file.warningCount || 0;
      });
      
      this.log(`ESLint found ${errorCount} errors and ${warningCount} warnings`);
      return { 
        hasIssues: errorCount > 0 || warningCount > 0, 
        errorCount, 
        warningCount, 
        results: eslintResults 
      };
    } catch (e) {
      this.log(`ESLint output parsing failed: ${e.message}`);
      return { hasIssues: true, errorCount: 1, warningCount: 0, results: [] };
    }
  }

  async checkBuild() {
    this.log('🔍 Checking Build...');
    const result = await this.runCommand('npm run build', 'Production Build');
    
    if (!result.success) {
      this.log(`Build failed with error: ${result.error.message}`);
      return { success: false, error: result.error.message, output: result.stderr };
    }
    
    this.log('✅ Build completed successfully');
    return { success: true, output: result.stdout };
  }

  async runTests() {
    this.log('🔍 Running Tests...');
    
    // Check if test command exists
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!packageJson.scripts.test) {
      this.log('⚠️  No test script found in package.json');
      return { success: true, skipped: true };
    }
    
    const result = await this.runCommand('npm test', 'Test Suite');
    
    if (!result.success) {
      this.log(`Tests failed: ${result.error.message}`);
      return { success: false, error: result.error.message, output: result.stderr };
    }
    
    this.log('✅ All tests passed');
    return { success: true, output: result.stdout };
  }

  async fixESLintIssues() {
    this.log('🔧 Auto-fixing ESLint issues...');
    const result = await this.runCommand('npx eslint . --ext .ts,.tsx --fix', 'ESLint Auto-fix');
    
    if (result.success) {
      this.log('✅ ESLint auto-fix completed');
    }
    
    return result;
  }

  async formatCode() {
    this.log('🔧 Formatting code...');
    const result = await this.runCommand('npm run format', 'Code Formatting');
    
    if (result.success) {
      this.log('✅ Code formatting completed');
    }
    
    return result;
  }

  async performQualityCheck() {
    this.log('🚀 Starting comprehensive quality check...');
    
    const results = {
      typescript: await this.checkTypeScript(),
      eslint: await this.checkESLint(),
      build: await this.checkBuild(),
      tests: await this.runTests()
    };

    // Auto-fix what we can
    if (results.eslint.hasIssues) {
      await this.fixESLintIssues();
      await this.formatCode();
      
      // Re-check after fixes
      results.eslintAfterFix = await this.checkESLint();
    }

    // Summary
    const hasErrors = 
      results.typescript.hasErrors || 
      results.eslint.errorCount > 0 ||
      !results.build.success ||
      !results.tests.success;

    this.log(`📊 Quality Check Summary:`);
    this.log(`   TypeScript: ${results.typescript.hasErrors ? '❌ ERRORS' : '✅ PASS'}`);
    this.log(`   ESLint: ${results.eslint.errorCount} errors, ${results.eslint.warningCount} warnings`);
    this.log(`   Build: ${results.build.success ? '✅ PASS' : '❌ FAIL'}`);
    this.log(`   Tests: ${results.tests.success ? '✅ PASS' : results.tests.skipped ? '⚠️  SKIPPED' : '❌ FAIL'}`);

    return { hasErrors, results };
  }

  async start() {
    if (this.isRunning) {
      this.log('Agent already running');
      return;
    }

    this.isRunning = true;
    this.log(`🤖 ${this.name} Agent starting on port ${this.port}...`);

    // Initial comprehensive check
    const initialCheck = await this.performQualityCheck();
    
    if (!initialCheck.hasErrors) {
      this.log('🎉 Initial quality check passed! No issues found.');
      return;
    }

    // Continuous monitoring loop
    let cycleCount = 0;
    const maxCycles = 10; // Prevent infinite loops

    while (this.isRunning && cycleCount < maxCycles) {
      cycleCount++;
      this.log(`🔄 Quality check cycle ${cycleCount}/${maxCycles}`);
      
      const check = await this.performQualityCheck();
      
      if (!check.hasErrors) {
        this.log('🎉 All quality checks passed! Mission accomplished.');
        break;
      }
      
      // Wait before next cycle
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    this.isRunning = false;
    this.log(`${this.name} Agent completed after ${cycleCount} cycles.`);
  }

  stop() {
    this.isRunning = false;
    this.log(`${this.name} Agent stopped.`);
  }
}

module.exports = { QualityAgent };

// If run directly
if (require.main === module) {
  const agent = new QualityAgent('MainQuality', 3848);
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down quality agent...');
    agent.stop();
    process.exit(0);
  });
  
  agent.start().catch(console.error);
}