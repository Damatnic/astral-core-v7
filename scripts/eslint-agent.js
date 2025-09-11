#!/usr/bin/env node

/**
 * ESLint Monitoring Agent
 * Continuously monitors and fixes ESLint errors and warnings with intelligent auto-fixing
 */

const { QualityAgent } = require('./continuous-quality-check.js');
const fs = require('fs');
const path = require('path');

class ESLintAgent extends QualityAgent {
  constructor() {
    super('ESLint', 3850);
    this.autoFixableRules = new Set([
      'indent',
      'quotes',
      'semi',
      'comma-dangle',
      'trailing-spaces',
      'no-extra-semi',
      'prefer-const',
      'object-curly-spacing',
      'array-bracket-spacing'
    ]);
  }

  async analyzeESLintResults(results) {
    const analysis = {
      totalFiles: results.length,
      filesWithErrors: 0,
      filesWithWarnings: 0,
      totalErrors: 0,
      totalWarnings: 0,
      errorsByRule: {},
      warningsByRule: {},
      autoFixableCount: 0
    };

    results.forEach(fileResult => {
      if (fileResult.errorCount > 0) {
        analysis.filesWithErrors++;
        analysis.totalErrors += fileResult.errorCount;
      }
      
      if (fileResult.warningCount > 0) {
        analysis.filesWithWarnings++;
        analysis.totalWarnings += fileResult.warningCount;
      }

      fileResult.messages?.forEach(message => {
        const rule = message.ruleId || 'unknown';
        const isError = message.severity === 2;
        
        if (isError) {
          analysis.errorsByRule[rule] = (analysis.errorsByRule[rule] || 0) + 1;
        } else {
          analysis.warningsByRule[rule] = (analysis.warningsByRule[rule] || 0) + 1;
        }

        if (message.fix || this.autoFixableRules.has(rule)) {
          analysis.autoFixableCount++;
        }
      });
    });

    this.log('📊 ESLint Analysis:');
    this.log(`   Files checked: ${analysis.totalFiles}`);
    this.log(`   Files with errors: ${analysis.filesWithErrors}`);
    this.log(`   Files with warnings: ${analysis.filesWithWarnings}`);
    this.log(`   Total errors: ${analysis.totalErrors}`);
    this.log(`   Total warnings: ${analysis.totalWarnings}`);
    this.log(`   Auto-fixable issues: ${analysis.autoFixableCount}`);

    // Report top error rules
    const topErrors = Object.entries(analysis.errorsByRule)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    if (topErrors.length > 0) {
      this.log('   Top error rules:');
      topErrors.forEach(([rule, count]) => {
        this.log(`     ${rule}: ${count}`);
      });
    }

    return analysis;
  }

  async performIntelligentFix() {
    this.log('🔧 Performing intelligent ESLint fixes...');
    
    // Step 1: Auto-fix what can be automatically fixed
    const autoFixResult = await this.runCommand(
      'npx eslint . --ext .ts,.tsx --fix',
      'ESLint Auto-fix'
    );

    // Step 2: Run formatter to clean up code style
    const formatResult = await this.runCommand(
      'npm run format',
      'Code Formatting'
    );

    // Step 3: Check results after fixes
    const recheckResult = await this.checkESLint();
    
    return {
      autoFixApplied: autoFixResult.success,
      formatApplied: formatResult.success,
      remainingIssues: recheckResult
    };
  }

  async generateFixSuggestions(analysis) {
    const suggestions = [];

    // Suggest fixes for common rule violations
    Object.entries(analysis.errorsByRule).forEach(([rule, count]) => {
      switch (rule) {
        case '@typescript-eslint/no-explicit-any':
          suggestions.push({
            rule,
            count,
            suggestion: 'Replace "any" with specific types for better type safety',
            priority: 'high'
          });
          break;
        case '@typescript-eslint/no-unused-vars':
          suggestions.push({
            rule,
            count,
            suggestion: 'Remove unused variables or prefix with underscore if intentional',
            priority: 'medium'
          });
          break;
        case 'prefer-const':
          suggestions.push({
            rule,
            count,
            suggestion: 'Use const instead of let for variables that are never reassigned',
            priority: 'low'
          });
          break;
        default:
          if (count > 5) {
            suggestions.push({
              rule,
              count,
              suggestion: `Consider reviewing ${rule} configuration - ${count} violations found`,
              priority: 'medium'
            });
          }
      }
    });

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  async performESLintCheck() {
    this.log('🔍 Performing comprehensive ESLint analysis...');
    
    const eslintResult = await this.checkESLint();
    
    if (!eslintResult.hasIssues) {
      this.log('✅ ESLint check passed - no issues found!');
      return { success: true, issues: [] };
    }

    // Analyze results in detail
    const analysis = await this.analyzeESLintResults(eslintResult.results);
    
    // Perform intelligent auto-fixing
    const fixResults = await this.performIntelligentFix();
    
    // Generate actionable suggestions for remaining issues
    const suggestions = await this.generateFixSuggestions(analysis);
    
    this.log('💡 Fix suggestions generated:');
    suggestions.slice(0, 3).forEach(suggestion => {
      this.log(`   ${suggestion.rule} (${suggestion.count}x): ${suggestion.suggestion}`);
    });

    return {
      success: !fixResults.remainingIssues.hasIssues,
      originalAnalysis: analysis,
      fixResults,
      suggestions,
      remainingErrors: fixResults.remainingIssues.errorCount || 0,
      remainingWarnings: fixResults.remainingIssues.warningCount || 0
    };
  }

  async start() {
    this.log('🤖 ESLint Agent initializing...');
    
    let cycleCount = 0;
    const maxCycles = 3; // ESLint fixes are usually immediate

    while (this.isRunning && cycleCount < maxCycles) {
      cycleCount++;
      this.log(`🔄 ESLint check cycle ${cycleCount}/${maxCycles}`);
      
      const result = await this.performESLintCheck();
      
      if (result.success) {
        this.log('🎉 ESLint Agent: All checks passed!');
        break;
      }
      
      this.log(`❌ ${result.remainingErrors} errors and ${result.remainingWarnings} warnings remaining`);
      
      // Brief pause between cycles
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.log('ESLint Agent completed monitoring cycle.');
  }
}

module.exports = { ESLintAgent };

// If run directly
if (require.main === module) {
  const agent = new ESLintAgent();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down ESLint agent...');
    agent.stop();
    process.exit(0);
  });
  
  agent.start().catch(console.error);
}