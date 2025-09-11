#!/usr/bin/env node

/**
 * Orchestrator Agent
 * Coordinates all monitoring agents and provides comprehensive project health monitoring
 */

const { QualityAgent } = require('./continuous-quality-check.js');
const { BuildAgent } = require('./build-agent.js');
const { TypeScriptAgent } = require('./typescript-agent.js');
const { ESLintAgent } = require('./eslint-agent.js');
const { TestRunnerAgent } = require('./test-runner-agent.js');
const fs = require('fs');
const path = require('path');

class OrchestratorAgent extends QualityAgent {
  constructor() {
    super('Orchestrator', 3854);
    this.agents = {
      build: new BuildAgent(),
      typescript: new TypeScriptAgent(),
      eslint: new ESLintAgent(),
      testRunner: new TestRunnerAgent()
    };
    this.healthStatus = {};
    this.overallHealth = false;
    this.cycleCount = 0;
    this.maxCycles = 10;
  }

  async runAgentInParallel(agentName, agent) {
    return new Promise((resolve) => {
      this.log(`🚀 Starting ${agentName} agent...`);
      
      const startTime = Date.now();
      
      // Mock agent execution for demonstration
      // In real implementation, agents would run as separate processes
      agent.performQualityCheck().then((result) => {
        const duration = Date.now() - startTime;
        
        this.healthStatus[agentName] = {
          success: result && !result.hasErrors,
          duration,
          timestamp: new Date().toISOString(),
          details: result
        };
        
        this.log(`✅ ${agentName} agent completed in ${(duration/1000).toFixed(2)}s`);
        resolve(this.healthStatus[agentName]);
      }).catch((error) => {
        this.healthStatus[agentName] = {
          success: false,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: error.message
        };
        
        this.log(`❌ ${agentName} agent failed: ${error.message}`);
        resolve(this.healthStatus[agentName]);
      });
    });
  }

  async runAllAgentsInParallel() {
    this.log('🔄 Running all agents in parallel...');
    
    const agentPromises = Object.entries(this.agents).map(([name, agent]) => 
      this.runAgentInParallel(name, agent)
    );
    
    const results = await Promise.all(agentPromises);
    
    // Calculate overall health
    this.overallHealth = results.every(result => result.success);
    
    this.log('📊 Parallel execution completed');
    return results;
  }

  async generateHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      cycle: this.cycleCount,
      overallHealth: this.overallHealth,
      agents: this.healthStatus,
      summary: {
        total: Object.keys(this.agents).length,
        passed: Object.values(this.healthStatus).filter(status => status.success).length,
        failed: Object.values(this.healthStatus).filter(status => !status.success).length
      },
      recommendations: []
    };

    // Generate recommendations based on failures
    Object.entries(this.healthStatus).forEach(([agentName, status]) => {
      if (!status.success) {
        switch (agentName) {
          case 'typescript':
            report.recommendations.push({
              agent: agentName,
              priority: 'high',
              action: 'Fix TypeScript compilation errors',
              details: 'TypeScript errors prevent build completion'
            });
            break;
          case 'eslint':
            report.recommendations.push({
              agent: agentName,
              priority: 'medium',
              action: 'Resolve ESLint violations',
              details: 'Code quality issues detected'
            });
            break;
          case 'build':
            report.recommendations.push({
              agent: agentName,
              priority: 'critical',
              action: 'Fix build failures',
              details: 'Build process is failing'
            });
            break;
          case 'testRunner':
            report.recommendations.push({
              agent: agentName,
              priority: 'high',
              action: 'Fix failing tests',
              details: 'Test suite failures detected'
            });
            break;
        }
      }
    });

    return report;
  }

  async saveHealthReport(report) {
    const reportPath = path.join(__dirname, 'health-reports', `health-${Date.now()}.json`);
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`📄 Health report saved to: ${reportPath}`);
    
    // Also save as latest report
    const latestPath = path.join(__dirname, 'latest-health-report.json');
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
    
    return reportPath;
  }

  async displayHealthSummary(report) {
    this.log('🏥 ====== HEALTH SUMMARY ======');
    this.log(`   Overall Status: ${report.overallHealth ? '🟢 HEALTHY' : '🔴 UNHEALTHY'}`);
    this.log(`   Cycle: ${report.cycle}`);
    this.log(`   Agents: ${report.summary.passed}/${report.summary.total} passing`);
    this.log('');
    
    // Agent status details
    Object.entries(report.agents).forEach(([name, status]) => {
      const emoji = status.success ? '✅' : '❌';
      const duration = (status.duration / 1000).toFixed(2);
      this.log(`   ${emoji} ${name}: ${duration}s`);
    });
    
    // Recommendations
    if (report.recommendations.length > 0) {
      this.log('');
      this.log('💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        this.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
        this.log(`      ${rec.details}`);
      });
    }
    
    this.log('===============================');
  }

  async performFixAttempts() {
    this.log('🔧 Attempting automatic fixes...');
    
    const fixResults = {};
    
    // Run auto-fixes for failed agents
    for (const [agentName, status] of Object.entries(this.healthStatus)) {
      if (!status.success) {
        this.log(`🔧 Attempting fix for ${agentName}...`);
        
        try {
          switch (agentName) {
            case 'eslint':
              const eslintFix = await this.runCommand('npx eslint . --ext .ts,.tsx --fix', 'ESLint Auto-fix');
              fixResults[agentName] = eslintFix.success;
              break;
            case 'typescript':
              // TypeScript errors usually require manual intervention
              fixResults[agentName] = false;
              this.log(`⚠️  TypeScript errors require manual review`);
              break;
            case 'build':
              // Try clearing cache and reinstalling
              await this.runCommand('rm -rf .next node_modules/.cache', 'Clear caches');
              const buildFix = await this.runCommand('npm install', 'Reinstall dependencies');
              fixResults[agentName] = buildFix.success;
              break;
            default:
              fixResults[agentName] = false;
          }
        } catch (error) {
          this.log(`❌ Fix attempt for ${agentName} failed: ${error.message}`);
          fixResults[agentName] = false;
        }
      }
    }
    
    const fixesApplied = Object.values(fixResults).filter(Boolean).length;
    this.log(`🔧 Applied ${fixesApplied} automatic fixes`);
    
    return fixResults;
  }

  async performContinuousMonitoring() {
    this.log('🔄 Starting continuous monitoring cycle...');
    
    while (this.isRunning && this.cycleCount < this.maxCycles) {
      this.cycleCount++;
      this.log(`\n🚀 ===== MONITORING CYCLE ${this.cycleCount}/${this.maxCycles} =====`);
      
      // Run all agents in parallel
      await this.runAllAgentsInParallel();
      
      // Generate health report
      const report = await this.generateHealthReport();
      
      // Display summary
      await this.displayHealthSummary(report);
      
      // Save report
      await this.saveHealthReport(report);
      
      if (this.overallHealth) {
        this.log('🎉 All systems healthy! Monitoring successful.');
        break;
      }
      
      // Attempt automatic fixes
      if (this.cycleCount < this.maxCycles) {
        await this.performFixAttempts();
        
        // Wait before next cycle
        this.log(`⏳ Waiting 10 seconds before next cycle...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    // Final report
    const finalReport = await this.generateHealthReport();
    this.log(`\n🏁 Monitoring completed after ${this.cycleCount} cycles`);
    this.log(`   Final Status: ${finalReport.overallHealth ? '🟢 SUCCESS' : '🔴 ISSUES REMAIN'}`);
    
    return finalReport;
  }

  async start() {
    this.log('🤖 Orchestrator Agent initializing...');
    this.log('🎯 Mission: Achieve 0 errors and 0 warnings across all systems');
    
    // Create health reports directory
    const reportsDir = path.join(__dirname, 'health-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Start continuous monitoring
    const finalResult = await this.performContinuousMonitoring();
    
    this.log('Orchestrator Agent mission complete.');
    return finalResult;
  }
}

module.exports = { OrchestratorAgent };

// If run directly
if (require.main === module) {
  const orchestrator = new OrchestratorAgent();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Orchestrator...');
    orchestrator.stop();
    process.exit(0);
  });
  
  orchestrator.start().then((result) => {
    console.log('\n🏆 Mission Summary:', result.overallHealth ? 'SUCCESS' : 'PARTIAL SUCCESS');
    process.exit(result.overallHealth ? 0 : 1);
  }).catch(console.error);
}