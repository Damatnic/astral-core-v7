#!/usr/bin/env node

/**
 * Test Suite Runner Agent
 * Continuously runs and monitors test suites with comprehensive coverage reporting
 */

const { QualityAgent } = require('./continuous-quality-check.js');
const fs = require('fs');
const path = require('path');

class TestRunnerAgent extends QualityAgent {
  constructor() {
    super('TestRunner', 3852);
    this.testResults = {
      unit: null,
      integration: null,
      e2e: null
    };
    this.coverageThreshold = 80;
  }

  async analyzeTestResults(testOutput) {
    const analysis = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      coverage: null,
      slowTests: [],
      failedTestDetails: []
    };

    if (!testOutput) return analysis;

    const lines = testOutput.split('\n');
    
    lines.forEach(line => {
      // Jest/Vitest test results parsing
      if (line.includes('Tests:') || line.includes('Test Suites:')) {
        const matches = line.match(/(\d+) passed/);
        if (matches) analysis.passedTests += parseInt(matches[1]);
        
        const failMatches = line.match(/(\d+) failed/);
        if (failMatches) analysis.failedTests += parseInt(failMatches[1]);
        
        const skipMatches = line.match(/(\d+) skipped/);
        if (skipMatches) analysis.skippedTests += parseInt(skipMatches[1]);
      }
      
      // Coverage parsing
      if (line.includes('%') && (line.includes('Lines') || line.includes('Statements'))) {
        const coverageMatch = line.match(/(\d+\.?\d*)%/);
        if (coverageMatch) {
          analysis.coverage = parseFloat(coverageMatch[1]);
        }
      }
      
      // Slow test detection
      if (line.includes('slow') || line.includes('ms') && parseInt(line.match(/(\d+)ms/)?.[1]) > 5000) {
        analysis.slowTests.push(line.trim());
      }
      
      // Failed test details
      if (line.includes('FAIL') || line.includes('✕')) {
        analysis.failedTestDetails.push(line.trim());
      }
    });

    analysis.totalTests = analysis.passedTests + analysis.failedTests + analysis.skippedTests;

    this.log(`📊 Test Analysis:`)
    this.log(`   Total Tests: ${analysis.totalTests}`);
    this.log(`   Passed: ${analysis.passedTests}`);
    this.log(`   Failed: ${analysis.failedTests}`);
    this.log(`   Skipped: ${analysis.skippedTests}`);
    this.log(`   Coverage: ${analysis.coverage || 'N/A'}%`);
    
    if (analysis.slowTests.length > 0) {
      this.log(`   Slow Tests: ${analysis.slowTests.length}`);
    }

    return analysis;
  }

  async runUnitTests() {
    this.log('🧪 Running unit tests...');
    
    // Check what test runner is available
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const hasJest = packageJson.devDependencies?.jest || packageJson.dependencies?.jest;
    const hasVitest = packageJson.devDependencies?.vitest || packageJson.dependencies?.vitest;
    
    let testCommand = 'npm test';
    if (packageJson.scripts?.['test:unit']) {
      testCommand = 'npm run test:unit';
    } else if (hasVitest) {
      testCommand = 'npx vitest run';
    } else if (hasJest) {
      testCommand = 'npx jest';
    }

    const result = await this.runCommand(testCommand, 'Unit Tests');
    return {
      success: result.success,
      output: result.stdout + result.stderr,
      analysis: await this.analyzeTestResults(result.stdout + result.stderr)
    };
  }

  async runIntegrationTests() {
    this.log('🔗 Running integration tests...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!packageJson.scripts?.['test:integration']) {
      this.log('⚠️  No integration test script found, skipping...');
      return { success: true, skipped: true };
    }

    const result = await this.runCommand('npm run test:integration', 'Integration Tests');
    return {
      success: result.success,
      output: result.stdout + result.stderr,
      analysis: await this.analyzeTestResults(result.stdout + result.stderr)
    };
  }

  async runE2ETests() {
    this.log('🌐 Running E2E tests...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!packageJson.scripts?.['test:e2e']) {
      this.log('⚠️  No E2E test script found, skipping...');
      return { success: true, skipped: true };
    }

    const result = await this.runCommand('npm run test:e2e', 'E2E Tests');
    return {
      success: result.success,
      output: result.stdout + result.stderr,
      analysis: await this.analyzeTestResults(result.stdout + result.stderr)
    };
  }

  async generateCoverageReport() {
    this.log('📊 Generating coverage report...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts?.['test:coverage']) {
      const result = await this.runCommand('npm run test:coverage', 'Coverage Report');
      return result;
    }
    
    // Try common coverage commands
    const coverageResult = await this.runCommand('npm test -- --coverage', 'Coverage Generation');
    return coverageResult;
  }

  async optimizeSlowTests(analysis) {
    this.log('⚡ Analyzing slow tests for optimization...');
    
    const suggestions = [];
    
    if (analysis.slowTests.length > 0) {
      suggestions.push({
        type: 'performance',
        issue: `Found ${analysis.slowTests.length} slow tests`,
        suggestion: 'Consider mocking external dependencies, reducing test data size, or parallel execution',
        priority: 'medium'
      });
    }
    
    if (analysis.coverage && analysis.coverage < this.coverageThreshold) {
      suggestions.push({
        type: 'coverage',
        issue: `Coverage ${analysis.coverage}% below threshold ${this.coverageThreshold}%`,
        suggestion: 'Add tests for uncovered code paths, especially critical business logic',
        priority: 'high'
      });
    }
    
    if (analysis.failedTests > 0) {
      suggestions.push({
        type: 'reliability',
        issue: `${analysis.failedTests} failing tests detected`,
        suggestion: 'Review and fix failing tests before deployment',
        priority: 'high'
      });
    }

    return suggestions;
  }

  async performTestSuite() {
    this.log('🚀 Running comprehensive test suite...');
    
    const suiteResults = {
      unit: await this.runUnitTests(),
      integration: await this.runIntegrationTests(),
      e2e: await this.runE2ETests()
    };
    
    // Generate coverage report
    const coverageResult = await this.generateCoverageReport();
    
    // Analyze overall results
    const overallAnalysis = {
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      overallCoverage: null,
      allSuites: []
    };
    
    Object.entries(suiteResults).forEach(([suiteType, result]) => {
      if (!result.skipped && result.analysis) {
        overallAnalysis.totalPassed += result.analysis.passedTests;
        overallAnalysis.totalFailed += result.analysis.failedTests;
        overallAnalysis.totalSkipped += result.analysis.skippedTests;
        
        if (result.analysis.coverage) {
          overallAnalysis.overallCoverage = result.analysis.coverage;
        }
        
        overallAnalysis.allSuites.push({
          type: suiteType,
          success: result.success,
          ...result.analysis
        });
      }
    });
    
    // Generate optimization suggestions
    const suggestions = await this.optimizeSlowTests(overallAnalysis);
    
    const allTestsPassed = overallAnalysis.totalFailed === 0;
    
    this.log('📋 Test Suite Summary:');
    this.log(`   Overall Status: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    this.log(`   Total Tests: ${overallAnalysis.totalPassed + overallAnalysis.totalFailed + overallAnalysis.totalSkipped}`);
    this.log(`   Passed: ${overallAnalysis.totalPassed}`);
    this.log(`   Failed: ${overallAnalysis.totalFailed}`);
    this.log(`   Coverage: ${overallAnalysis.overallCoverage || 'N/A'}%`);
    
    if (suggestions.length > 0) {
      this.log('💡 Optimization Suggestions:');
      suggestions.forEach(suggestion => {
        this.log(`   ${suggestion.type}: ${suggestion.suggestion}`);
      });
    }

    return {
      success: allTestsPassed,
      results: suiteResults,
      analysis: overallAnalysis,
      suggestions,
      coverageResult
    };
  }

  async start() {
    this.log('🤖 Test Runner Agent initializing...');
    
    let cycleCount = 0;
    const maxCycles = 2; // Tests usually pass or fail quickly
    
    while (this.isRunning && cycleCount < maxCycles) {
      cycleCount++;
      this.log(`🔄 Test cycle ${cycleCount}/${maxCycles}`);
      
      const result = await this.performTestSuite();
      
      if (result.success) {
        this.log('🎉 Test Runner Agent: All tests passed!');
        break;
      }
      
      this.log(`❌ ${result.analysis.totalFailed} tests failed`);
      
      // Brief pause between cycles
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    this.log('Test Runner Agent completed monitoring cycle.');
  }
}

module.exports = { TestRunnerAgent };

// If run directly
if (require.main === module) {
  const agent = new TestRunnerAgent();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Test Runner agent...');
    agent.stop();
    process.exit(0);
  });
  
  agent.start().catch(console.error);
}