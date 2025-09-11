#!/usr/bin/env node

/**
 * TypeScript Monitoring Agent
 * Continuously monitors and fixes TypeScript errors with intelligent problem-solving
 */

const { QualityAgent } = require('./continuous-quality-check.js');
const fs = require('fs');
const path = require('path');

class TypeScriptAgent extends QualityAgent {
  constructor() {
    super('TypeScript', 3849);
    this.commonFixes = new Map();
    this.setupCommonFixes();
  }

  setupCommonFixes() {
    this.commonFixes.set('Property does not exist on type', this.fixMissingProperty.bind(this));
    this.commonFixes.set('Cannot find module', this.fixMissingModule.bind(this));
    this.commonFixes.set('Type assertion', this.fixTypeAssertion.bind(this));
    this.commonFixes.set('Argument of type', this.fixArgumentType.bind(this));
    this.commonFixes.set('exactOptionalPropertyTypes', this.fixOptionalProperties.bind(this));
  }

  async analyzeTypeScriptErrors(errors) {
    const categorizedErrors = {
      missingProperties: [],
      missingModules: [],
      typeIssues: [],
      importIssues: [],
      other: []
    };

    errors.forEach(error => {
      if (error.includes('Property') && error.includes('does not exist')) {
        categorizedErrors.missingProperties.push(error);
      } else if (error.includes('Cannot find module')) {
        categorizedErrors.missingModules.push(error);
      } else if (error.includes('Type') && error.includes('is not assignable')) {
        categorizedErrors.typeIssues.push(error);
      } else if (error.includes('import')) {
        categorizedErrors.importIssues.push(error);
      } else {
        categorizedErrors.other.push(error);
      }
    });

    this.log(`📊 TypeScript Error Analysis:`);
    this.log(`   Missing Properties: ${categorizedErrors.missingProperties.length}`);
    this.log(`   Missing Modules: ${categorizedErrors.missingModules.length}`);
    this.log(`   Type Issues: ${categorizedErrors.typeIssues.length}`);
    this.log(`   Import Issues: ${categorizedErrors.importIssues.length}`);
    this.log(`   Other: ${categorizedErrors.other.length}`);

    return categorizedErrors;
  }

  async fixMissingProperty(error) {
    this.log(`🔧 Attempting to fix missing property: ${error}`);
    // Implementation would go here for specific property fixes
    return { fixed: false, reason: 'Manual intervention needed' };
  }

  async fixMissingModule(error) {
    this.log(`🔧 Attempting to fix missing module: ${error}`);
    
    // Extract module name from error
    const moduleMatch = error.match(/Cannot find module ['"]([^'"]+)['"]/);
    if (moduleMatch) {
      const moduleName = moduleMatch[1];
      
      // Try to install missing module
      const installResult = await this.runCommand(
        `npm install ${moduleName}`, 
        `Installing missing module: ${moduleName}`
      );
      
      if (installResult.success) {
        return { fixed: true, action: `Installed ${moduleName}` };
      }
    }
    
    return { fixed: false, reason: 'Could not auto-install module' };
  }

  async fixTypeAssertion(error) {
    this.log(`🔧 Attempting to fix type assertion: ${error}`);
    return { fixed: false, reason: 'Type assertions require manual review' };
  }

  async fixArgumentType(error) {
    this.log(`🔧 Attempting to fix argument type: ${error}`);
    return { fixed: false, reason: 'Argument type mismatches require manual review' };
  }

  async fixOptionalProperties(error) {
    this.log(`🔧 Attempting to fix optional property issue: ${error}`);
    
    // This is a common issue with exactOptionalPropertyTypes
    if (error.includes('exactOptionalPropertyTypes')) {
      this.log('💡 Detected exactOptionalPropertyTypes issue - suggesting type union with undefined');
      return { 
        fixed: false, 
        reason: 'Add | undefined to optional properties',
        suggestion: 'Consider adding | undefined to optional property types'
      };
    }
    
    return { fixed: false, reason: 'Manual review needed' };
  }

  async attemptAutomaticFixes(errors) {
    this.log('🔧 Attempting automatic TypeScript fixes...');
    const fixes = [];

    for (const error of errors) {
      let fixed = false;
      
      for (const [pattern, fixFunction] of this.commonFixes) {
        if (error.includes(pattern)) {
          const result = await fixFunction(error);
          fixes.push({ error, result });
          if (result.fixed) {
            fixed = true;
            break;
          }
        }
      }
      
      if (!fixed) {
        fixes.push({ 
          error, 
          result: { fixed: false, reason: 'No automatic fix available' }
        });
      }
    }

    return fixes;
  }

  async performTypeScriptCheck() {
    this.log('🔍 Performing comprehensive TypeScript analysis...');
    
    const tsCheck = await this.checkTypeScript();
    
    if (!tsCheck.hasErrors) {
      this.log('✅ TypeScript check passed - no errors found!');
      return { success: true, errors: [] };
    }

    // Analyze and categorize errors
    const categorizedErrors = await this.analyzeTypeScriptErrors(tsCheck.errors);
    
    // Attempt automatic fixes
    const fixAttempts = await this.attemptAutomaticFixes(tsCheck.errors);
    
    // Report results
    const successfulFixes = fixAttempts.filter(fix => fix.result.fixed);
    this.log(`🔧 Fix attempts completed: ${successfulFixes.length}/${fixAttempts.length} successful`);
    
    if (successfulFixes.length > 0) {
      // Re-run TypeScript check after fixes
      const recheckResult = await this.checkTypeScript();
      return { 
        success: !recheckResult.hasErrors, 
        errors: recheckResult.errors,
        fixesApplied: successfulFixes.length
      };
    }

    return { 
      success: false, 
      errors: tsCheck.errors,
      categorizedErrors,
      fixAttempts 
    };
  }

  async start() {
    this.log('🤖 TypeScript Agent initializing...');
    
    let cycleCount = 0;
    const maxCycles = 5;

    while (this.isRunning && cycleCount < maxCycles) {
      cycleCount++;
      this.log(`🔄 TypeScript check cycle ${cycleCount}/${maxCycles}`);
      
      const result = await this.performTypeScriptCheck();
      
      if (result.success) {
        this.log('🎉 TypeScript Agent: All checks passed!');
        break;
      }
      
      this.log(`❌ ${result.errors.length} TypeScript errors remaining`);
      
      // Brief pause between cycles
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    this.log('TypeScript Agent completed monitoring cycle.');
  }
}

module.exports = { TypeScriptAgent };

// If run directly
if (require.main === module) {
  const agent = new TypeScriptAgent();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down TypeScript agent...');
    agent.stop();
    process.exit(0);
  });
  
  agent.start().catch(console.error);
}