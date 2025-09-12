#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Astral Core v7
 * Validates all critical functionality including security, API, and mental health features
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class TestRunner {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      skipped: [],
      errors: []
    };
    this.startTime = Date.now();
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  header(title) {
    console.log();
    this.log('='.repeat(60), colors.cyan);
    this.log(title, colors.bright + colors.cyan);
    this.log('='.repeat(60), colors.cyan);
    console.log();
  }

  runCommand(command, description) {
    try {
      this.log(`Running: ${description}`, colors.yellow);
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      // Parse test results if available
      const passMatch = output.match(/(\d+) passed/);
      const failMatch = output.match(/(\d+) failed/);
      
      if (passMatch || failMatch) {
        const passed = passMatch ? parseInt(passMatch[1]) : 0;
        const failed = failMatch ? parseInt(failMatch[1]) : 0;
        
        if (failed > 0) {
          this.results.failed.push({ test: description, count: failed });
          this.log(`✗ ${description}: ${failed} test(s) failed`, colors.red);
        } else {
          this.results.passed.push({ test: description, count: passed });
          this.log(`✓ ${description}: ${passed} test(s) passed`, colors.green);
        }
      } else {
        this.results.passed.push({ test: description, count: 0 });
        this.log(`✓ ${description} completed`, colors.green);
      }
      
      return output;
    } catch (error) {
      this.results.errors.push({ test: description, error: error.message });
      this.log(`✗ ${description} failed with error`, colors.red);
      if (error.stdout) {
        console.log(error.stdout);
      }
      if (error.stderr) {
        console.error(error.stderr);
      }
      return null;
    }
  }

  async runSecurityTests() {
    this.header('SECURITY TESTS');
    
    const securityTests = [
      { 
        file: 'tests/__tests__/security/validation-comprehensive.test.ts',
        name: 'Input Validation & Sanitization'
      },
      {
        file: 'tests/__tests__/security/encryption.test.ts',
        name: 'Data Encryption'
      },
      {
        file: 'tests/__tests__/security/data-encryption-complete.test.ts',
        name: 'PHI Data Encryption'
      }
    ];

    for (const test of securityTests) {
      if (fs.existsSync(test.file)) {
        this.runCommand(
          `npx jest ${test.file} --passWithNoTests --silent`,
          test.name
        );
      } else {
        this.results.skipped.push({ test: test.name, reason: 'File not found' });
        this.log(`⊘ ${test.name}: Skipped (file not found)`, colors.yellow);
      }
    }
  }

  async runAPITests() {
    this.header('API ENDPOINT TESTS');
    
    const apiTests = [
      {
        file: 'tests/__tests__/api/crisis/assess.test.ts',
        name: 'Crisis Assessment API'
      },
      {
        file: 'tests/__tests__/api/user/profile.test.ts',
        name: 'User Profile API'
      },
      {
        file: 'tests/__tests__/api/wellness/data.test.ts',
        name: 'Wellness Data API'
      }
    ];

    for (const test of apiTests) {
      if (fs.existsSync(test.file)) {
        this.runCommand(
          `npx jest ${test.file} --passWithNoTests --silent`,
          test.name
        );
      } else {
        this.results.skipped.push({ test: test.name, reason: 'File not found' });
        this.log(`⊘ ${test.name}: Skipped (file not found)`, colors.yellow);
      }
    }
  }

  async runAuthTests() {
    this.header('AUTHENTICATION TESTS');
    
    const authTests = [
      {
        file: 'tests/__tests__/auth/register.test.ts',
        name: 'User Registration'
      },
      {
        file: 'tests/__tests__/auth/demo-login.test.ts',
        name: 'Demo Account Login'
      },
      {
        file: 'tests/__tests__/auth/auth-complete-flows.test.ts',
        name: 'Complete Auth Flows'
      }
    ];

    for (const test of authTests) {
      if (fs.existsSync(test.file)) {
        this.runCommand(
          `npx jest ${test.file} --passWithNoTests --silent`,
          test.name
        );
      } else {
        this.results.skipped.push({ test: test.name, reason: 'File not found' });
        this.log(`⊘ ${test.name}: Skipped (file not found)`, colors.yellow);
      }
    }
  }

  async runIntegrationTests() {
    this.header('INTEGRATION TESTS');
    
    const integrationTests = [
      {
        file: 'tests/__tests__/integration/auth-flows.test.ts',
        name: 'Auth0 Integration'
      },
      {
        file: 'tests/__tests__/websocket/websocket-functionality.test.ts',
        name: 'WebSocket Functionality'
      }
    ];

    for (const test of integrationTests) {
      if (fs.existsSync(test.file)) {
        this.runCommand(
          `npx jest ${test.file} --passWithNoTests --silent`,
          test.name
        );
      } else {
        this.results.skipped.push({ test: test.name, reason: 'File not found' });
        this.log(`⊘ ${test.name}: Skipped (file not found)`, colors.yellow);
      }
    }
  }

  async runPerformanceTests() {
    this.header('PERFORMANCE TESTS');
    
    const performanceTests = [
      {
        file: 'tests/__tests__/performance/critical-operations.test.ts',
        name: 'Critical Operations Performance'
      }
    ];

    for (const test of performanceTests) {
      if (fs.existsSync(test.file)) {
        this.runCommand(
          `npx jest ${test.file} --passWithNoTests --silent`,
          test.name
        );
      } else {
        this.results.skipped.push({ test: test.name, reason: 'File not found' });
        this.log(`⊘ ${test.name}: Skipped (file not found)`, colors.yellow);
      }
    }
  }

  async runCrisisTests() {
    this.header('CRISIS INTERVENTION TESTS');
    
    const crisisTests = [
      {
        file: 'tests/__tests__/crisis/crisis-assessment-complete.test.ts',
        name: 'Crisis Assessment Algorithm'
      },
      {
        file: 'tests/__tests__/api/crisis/assess-algorithm.test.ts',
        name: 'Crisis Algorithm Validation'
      }
    ];

    for (const test of crisisTests) {
      if (fs.existsSync(test.file)) {
        this.runCommand(
          `npx jest ${test.file} --passWithNoTests --silent`,
          test.name
        );
      } else {
        this.results.skipped.push({ test: test.name, reason: 'File not found' });
        this.log(`⊘ ${test.name}: Skipped (file not found)`, colors.yellow);
      }
    }
  }

  async runUnitTests() {
    this.header('UNIT TESTS');
    
    const unitTests = [
      {
        file: 'src/lib/auth/__tests__',
        name: 'Auth Utilities'
      },
      {
        file: 'src/lib/security/__tests__',
        name: 'Security Services'
      },
      {
        file: 'src/lib/services/__tests__',
        name: 'Application Services'
      },
      {
        file: 'src/store/__tests__',
        name: 'State Management'
      }
    ];

    for (const test of unitTests) {
      if (fs.existsSync(test.file)) {
        this.runCommand(
          `npx jest ${test.file} --passWithNoTests --silent`,
          test.name
        );
      } else {
        this.results.skipped.push({ test: test.name, reason: 'Directory not found' });
        this.log(`⊘ ${test.name}: Skipped (directory not found)`, colors.yellow);
      }
    }
  }

  generateReport() {
    this.header('TEST RESULTS SUMMARY');
    
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);
    
    const totalPassed = this.results.passed.reduce((sum, t) => sum + (t.count || 1), 0);
    const totalFailed = this.results.failed.reduce((sum, t) => sum + (t.count || 1), 0);
    const totalSkipped = this.results.skipped.length;
    const totalErrors = this.results.errors.length;
    
    console.log();
    this.log('Test Execution Summary:', colors.bright);
    console.log();
    
    // Passed Tests
    if (this.results.passed.length > 0) {
      this.log(`✓ Passed Tests: ${totalPassed}`, colors.green);
      this.results.passed.forEach(test => {
        console.log(`  • ${test.test}${test.count ? ` (${test.count} tests)` : ''}`);
      });
      console.log();
    }
    
    // Failed Tests
    if (this.results.failed.length > 0) {
      this.log(`✗ Failed Tests: ${totalFailed}`, colors.red);
      this.results.failed.forEach(test => {
        console.log(`  • ${test.test}${test.count ? ` (${test.count} tests)` : ''}`);
      });
      console.log();
    }
    
    // Skipped Tests
    if (this.results.skipped.length > 0) {
      this.log(`⊘ Skipped Tests: ${totalSkipped}`, colors.yellow);
      this.results.skipped.forEach(test => {
        console.log(`  • ${test.test}: ${test.reason}`);
      });
      console.log();
    }
    
    // Errors
    if (this.results.errors.length > 0) {
      this.log(`⚠ Tests with Errors: ${totalErrors}`, colors.red);
      this.results.errors.forEach(test => {
        console.log(`  • ${test.test}`);
      });
      console.log();
    }
    
    // Summary Statistics
    this.log('-'.repeat(40), colors.cyan);
    this.log('Statistics:', colors.bright);
    console.log(`  Total Test Suites: ${this.results.passed.length + this.results.failed.length + this.results.skipped.length + this.results.errors.length}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Success Rate: ${totalPassed > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) : 0}%`);
    
    // Overall Status
    console.log();
    if (totalFailed === 0 && totalErrors === 0) {
      this.log('✓ ALL TESTS PASSED', colors.bright + colors.green);
    } else {
      this.log('✗ SOME TESTS FAILED', colors.bright + colors.red);
    }
    
    // Recommendations
    if (totalSkipped > 0 || totalErrors > 0) {
      console.log();
      this.log('Recommendations:', colors.bright + colors.yellow);
      
      if (totalSkipped > 0) {
        console.log('  • Some test files were not found. Consider creating them or updating paths.');
      }
      
      if (totalErrors > 0) {
        console.log('  • Some tests encountered errors. Check Jest configuration and dependencies.');
      }
    }
    
    // HIPAA Compliance Note
    console.log();
    this.log('HIPAA Compliance Check:', colors.bright + colors.magenta);
    console.log('  • PHI Encryption: ' + (this.results.passed.some(t => t.test.includes('PHI')) ? '✓ Tested' : '⚠ Not tested'));
    console.log('  • Access Controls: ' + (this.results.passed.some(t => t.test.includes('Auth')) ? '✓ Tested' : '⚠ Not tested'));
    console.log('  • Audit Logging: ' + (this.results.passed.some(t => t.test.includes('Audit')) ? '✓ Tested' : '⚠ Not tested'));
    console.log('  • Data Validation: ' + (this.results.passed.some(t => t.test.includes('Validation')) ? '✓ Tested' : '⚠ Not tested'));
    
    console.log();
    this.log('='.repeat(60), colors.cyan);
  }

  async run() {
    this.log('Starting Comprehensive Test Suite for Astral Core v7', colors.bright + colors.cyan);
    this.log('Testing environment, security, APIs, and mental health features...', colors.cyan);
    
    // Run all test categories
    await this.runSecurityTests();
    await this.runAPITests();
    await this.runAuthTests();
    await this.runIntegrationTests();
    await this.runPerformanceTests();
    await this.runCrisisTests();
    await this.runUnitTests();
    
    // Generate final report
    this.generateReport();
    
    // Exit with appropriate code
    process.exit(this.results.failed.length > 0 || this.results.errors.length > 0 ? 1 : 0);
  }
}

// Run the test suite
const runner = new TestRunner();
runner.run().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});