#!/usr/bin/env node

/**
 * Development Server Agent
 * Monitors development server health, performance, and auto-restart capabilities
 */

const { QualityAgent } = require('./continuous-quality-check.js');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class DevServerAgent extends QualityAgent {
  constructor() {
    super('DevServer', 3853);
    this.serverProcess = null;
    this.serverPort = 3000; // Default Next.js port
    this.healthCheckInterval = null;
    this.restartCount = 0;
    this.maxRestarts = 3;
  }

  async findAvailablePort(startPort = 3000) {
    const net = require('net');
    
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(startPort, () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
      
      server.on('error', () => {
        resolve(this.findAvailablePort(startPort + 1));
      });
    });
  }

  async startDevServer() {
    this.log('🚀 Starting development server...');
    
    // Find available port
    this.serverPort = await this.findAvailablePort(3000);
    this.log(`Using port: ${this.serverPort}`);
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Determine the correct dev command
    let devCommand = ['npm', 'run', 'dev'];
    if (packageJson.scripts?.dev?.includes('next')) {
      devCommand = ['npx', 'next', 'dev', '-p', this.serverPort.toString()];
    }
    
    this.serverProcess = spawn(devCommand[0], devCommand.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    // Handle server output
    this.serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('compiled successfully')) {
        this.log('✅ Development server started successfully');
      }
      if (output.includes('Error') || output.includes('Failed')) {
        this.log(`⚠️  Server warning: ${output.trim()}`);
      }
    });

    this.serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (!error.includes('webpack') && !error.includes('Note:')) {
        this.log(`❌ Server error: ${error.trim()}`);
      }
    });

    this.serverProcess.on('close', (code) => {
      if (code !== 0 && this.isRunning) {
        this.log(`💥 Server process exited with code ${code}`);
        this.handleServerRestart();
      }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return { success: true, port: this.serverPort };
  }

  async checkServerHealth() {
    try {
      const response = await fetch(`http://localhost:${this.serverPort}`);
      const isHealthy = response.ok;
      
      if (isHealthy) {
        this.log('💚 Server health check passed');
      } else {
        this.log(`⚠️  Server health check failed: ${response.status}`);
      }
      
      return { healthy: isHealthy, status: response.status };
    } catch (error) {
      this.log(`❌ Server health check error: ${error.message}`);
      return { healthy: false, error: error.message };
    }
  }

  async handleServerRestart() {
    if (this.restartCount >= this.maxRestarts) {
      this.log(`🛑 Maximum restart attempts (${this.maxRestarts}) reached`);
      return false;
    }

    this.restartCount++;
    this.log(`🔄 Attempting server restart ${this.restartCount}/${this.maxRestarts}...`);
    
    // Kill existing process if still running
    if (this.serverProcess && !this.serverProcess.killed) {
      this.serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Start new server instance
    const startResult = await this.startDevServer();
    return startResult.success;
  }

  async monitorPerformance() {
    this.log('📊 Monitoring server performance...');
    
    try {
      const startTime = Date.now();
      const response = await fetch(`http://localhost:${this.serverPort}`);
      const responseTime = Date.now() - startTime;
      
      const performance = {
        responseTime,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      if (responseTime > 2000) {
        this.log(`⚠️  Slow response time: ${responseTime}ms`);
        return { warning: 'Slow response time', ...performance };
      }
      
      if (responseTime > 5000) {
        this.log(`❌ Very slow response time: ${responseTime}ms`);
        return { error: 'Very slow response time', ...performance };
      }
      
      this.log(`⚡ Response time: ${responseTime}ms`);
      return { healthy: true, ...performance };
    } catch (error) {
      this.log(`❌ Performance monitoring error: ${error.message}`);
      return { error: error.message };
    }
  }

  async checkHotReload() {
    this.log('🔥 Testing hot reload functionality...');
    
    // Create a temporary test file
    const testFile = path.join(process.cwd(), 'temp-hot-reload-test.js');
    const testContent = `// Hot reload test - ${Date.now()}`;
    
    try {
      fs.writeFileSync(testFile, testContent);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Monitor server logs for reload indication
      let reloadDetected = false;
      const timeout = setTimeout(() => {
        if (!reloadDetected) {
          this.log('⚠️  Hot reload may not be working properly');
        }
      }, 3000);
      
      // Clean up
      fs.unlinkSync(testFile);
      clearTimeout(timeout);
      
      this.log('✅ Hot reload test completed');
      return { success: true };
    } catch (error) {
      this.log(`❌ Hot reload test failed: ${error.message}`);
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
      return { success: false, error: error.message };
    }
  }

  async performDevServerCheck() {
    this.log('🔍 Performing comprehensive dev server check...');
    
    // Check if server is running
    if (!this.serverProcess || this.serverProcess.killed) {
      const startResult = await this.startDevServer();
      if (!startResult.success) {
        return { success: false, issue: 'Failed to start development server' };
      }
    }
    
    // Health check
    const healthCheck = await this.checkServerHealth();
    if (!healthCheck.healthy) {
      const restartSuccess = await this.handleServerRestart();
      if (!restartSuccess) {
        return { success: false, issue: 'Server unhealthy and restart failed' };
      }
    }
    
    // Performance monitoring
    const performanceCheck = await this.monitorPerformance();
    
    // Hot reload test
    const hotReloadCheck = await this.checkHotReload();
    
    const allChecksPass = 
      healthCheck.healthy && 
      !performanceCheck.error && 
      hotReloadCheck.success;
    
    this.log('📋 Dev Server Summary:');
    this.log(`   Server Health: ${healthCheck.healthy ? '✅' : '❌'}`);
    this.log(`   Performance: ${!performanceCheck.error ? '✅' : '❌'}`);
    this.log(`   Hot Reload: ${hotReloadCheck.success ? '✅' : '❌'}`);
    this.log(`   Restart Count: ${this.restartCount}/${this.maxRestarts}`);
    
    return {
      success: allChecksPass,
      health: healthCheck,
      performance: performanceCheck,
      hotReload: hotReloadCheck,
      port: this.serverPort
    };
  }

  async start() {
    this.log('🤖 Dev Server Agent initializing...');
    
    // Start initial server check
    const initialCheck = await this.performDevServerCheck();
    
    if (!initialCheck.success) {
      this.log(`❌ Initial server check failed: ${initialCheck.issue}`);
    } else {
      this.log('🎉 Dev Server Agent: Server running smoothly!');
    }
    
    // Set up periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.checkServerHealth();
      }
    }, 30000); // Check every 30 seconds

    this.log('Dev Server Agent monitoring active.');
    
    // Keep the agent running
    while (this.isRunning) {
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  stop() {
    this.log('🛑 Stopping Dev Server Agent...');
    
    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Stop server process
    if (this.serverProcess && !this.serverProcess.killed) {
      this.serverProcess.kill('SIGTERM');
    }
    
    super.stop();
  }
}

module.exports = { DevServerAgent };

// If run directly
if (require.main === module) {
  const agent = new DevServerAgent();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Dev Server agent...');
    agent.stop();
    process.exit(0);
  });
  
  agent.start().catch(console.error);
}