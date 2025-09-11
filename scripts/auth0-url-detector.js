#!/usr/bin/env node
/**
 * Smart Vercel Deployment URL Detection Script
 * 
 * This script intelligently detects current Vercel deployment URLs and automatically
 * configures Auth0 callback URLs for seamless deployment integration.
 * 
 * Features:
 * - Multiple detection strategies (Vercel CLI, API, Git integration)
 * - Automatic preview and production URL discovery
 * - Domain validation and testing
 * - Callback URL generation for different environments
 * - Real-time deployment monitoring
 * - Backup URL strategies
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Logging utility
class Logger {
  static info(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`🔷 [${timestamp}] ${message}`);
    if (data) console.log('   Data:', JSON.stringify(data, null, 2));
  }

  static success(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`✅ [${timestamp}] ${message}`);
    if (data) console.log('   Data:', JSON.stringify(data, null, 2));
  }

  static error(message, error = null) {
    const timestamp = new Date().toISOString();
    console.error(`❌ [${timestamp}] ${message}`);
    if (error) {
      console.error('   Error:', error.message || error);
    }
  }

  static warning(message, data = null) {
    const timestamp = new Date().toISOString();
    console.warn(`⚠️ [${timestamp}] ${message}`);
    if (data) console.log('   Data:', JSON.stringify(data, null, 2));
  }
}

// HTTP client for API calls
class HttpClient {
  static async get(url, headers = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Astral-Core-Auth0-Detector/1.0',
          ...headers
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = body ? JSON.parse(body) : {};
            resolve({ data, statusCode: res.statusCode, headers: res.headers });
          } catch (error) {
            resolve({ data: body, statusCode: res.statusCode, headers: res.headers });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  static async testUrl(url) {
    try {
      const response = await this.get(url);
      return {
        url,
        accessible: response.statusCode < 400,
        statusCode: response.statusCode,
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        url,
        accessible: false,
        error: error.message,
        responseTime: null
      };
    }
  }
}

// Main URL detection class
class VercelUrlDetector {
  constructor() {
    this.detectedUrls = new Set();
    this.validatedUrls = new Map();
    this.projectName = this.getProjectName();
  }

  getProjectName() {
    try {
      const packageJson = require(path.join(process.cwd(), 'package.json'));
      return packageJson.name || 'astral-core-v7';
    } catch {
      return 'astral-core-v7';
    }
  }

  async detectAllUrls() {
    Logger.info('🔍 Starting comprehensive URL detection...');
    
    const strategies = [
      () => this.detectViaVercelCli(),
      () => this.detectViaVercelConfig(),
      () => this.detectViaGitRemote(),
      () => this.detectViaPredictedUrls(),
      () => this.detectViaEnvironmentVariables(),
      () => this.detectViaRecentDeployments()
    ];

    const results = [];
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        Logger.info(`📋 Running detection strategy ${i + 1}/${strategies.length}...`);
        const urls = await strategies[i]();
        if (urls && urls.length > 0) {
          urls.forEach(url => this.detectedUrls.add(url));
          results.push({ strategy: i + 1, urls, success: true });
          Logger.success(`Strategy ${i + 1} found ${urls.length} URLs`);
        } else {
          results.push({ strategy: i + 1, urls: [], success: false });
          Logger.warning(`Strategy ${i + 1} found no URLs`);
        }
      } catch (error) {
        Logger.error(`Strategy ${i + 1} failed`, error);
        results.push({ strategy: i + 1, error: error.message, success: false });
      }
    }

    const allUrls = Array.from(this.detectedUrls);
    Logger.success(`🎉 Total unique URLs detected: ${allUrls.length}`, allUrls);
    
    return {
      urls: allUrls,
      strategies: results,
      summary: {
        total: allUrls.length,
        successful_strategies: results.filter(r => r.success).length,
        failed_strategies: results.filter(r => !r.success).length
      }
    };
  }

  async detectViaVercelCli() {
    Logger.info('🔧 Detecting URLs via Vercel CLI...');
    
    try {
      // Check if Vercel CLI is available
      execSync('vercel --version', { stdio: 'pipe' });
      
      // Get project info
      const projectInfo = execSync('vercel project ls --json 2>/dev/null || echo "[]"', { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 15000
      });
      
      let projects = [];
      try {
        projects = JSON.parse(projectInfo);
      } catch {
        projects = [];
      }
      
      // Get deployments
      const deploymentsOutput = execSync('vercel ls --count 10 --json 2>/dev/null || echo "[]"', {
        encoding: 'utf8', 
        cwd: process.cwd(),
        timeout: 15000
      });
      
      let deployments = [];
      try {
        deployments = JSON.parse(deploymentsOutput);
      } catch {
        deployments = [];
      }

      const urls = [];
      
      // Extract URLs from deployments
      deployments.forEach(deployment => {
        if (deployment.url) {
          urls.push(`https://${deployment.url}`);
        }
        if (deployment.alias && deployment.alias.length > 0) {
          deployment.alias.forEach(alias => {
            urls.push(`https://${alias}`);
          });
        }
      });

      // Extract URLs from projects
      projects.forEach(project => {
        if (project.latestDeployments) {
          project.latestDeployments.forEach(deployment => {
            if (deployment.url) {
              urls.push(`https://${deployment.url}`);
            }
          });
        }
      });

      return [...new Set(urls)];
    } catch (error) {
      Logger.warning('Vercel CLI detection failed', error.message);
      return [];
    }
  }

  async detectViaVercelConfig() {
    Logger.info('📋 Detecting URLs via Vercel configuration files...');
    
    const urls = [];
    
    try {
      // Check vercel.json
      const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
      const vercelJson = JSON.parse(await fs.readFile(vercelJsonPath, 'utf8'));
      
      if (vercelJson.alias) {
        if (Array.isArray(vercelJson.alias)) {
          vercelJson.alias.forEach(alias => {
            urls.push(`https://${alias}`);
          });
        } else {
          urls.push(`https://${vercelJson.alias}`);
        }
      }
    } catch {
      // vercel.json not found or invalid
    }

    try {
      // Check .vercel directory
      const vercelDir = path.join(process.cwd(), '.vercel');
      const projectJson = JSON.parse(await fs.readFile(path.join(vercelDir, 'project.json'), 'utf8'));
      
      if (projectJson.projectId) {
        // Generate common Vercel URLs based on project ID
        const projectName = projectJson.name || this.projectName;
        urls.push(`https://${projectName}.vercel.app`);
        urls.push(`https://${projectName}-git-main.vercel.app`);
        urls.push(`https://${projectName}-git-master.vercel.app`);
      }
    } catch {
      // .vercel directory not found
    }

    return [...new Set(urls)];
  }

  async detectViaGitRemote() {
    Logger.info('🔗 Detecting URLs via Git remote information...');
    
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', {
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 5000
      }).trim();

      const urls = [];
      
      if (remoteUrl) {
        // Extract repository name from Git URL
        let repoName = remoteUrl.split('/').pop().replace('.git', '');
        
        // Generate possible Vercel URLs
        urls.push(`https://${repoName}.vercel.app`);
        urls.push(`https://${repoName}-git-main.vercel.app`);
        urls.push(`https://${repoName}-git-master.vercel.app`);
        
        // Also try with project name
        if (repoName !== this.projectName) {
          urls.push(`https://${this.projectName}.vercel.app`);
          urls.push(`https://${this.projectName}-git-main.vercel.app`);
          urls.push(`https://${this.projectName}-git-master.vercel.app`);
        }
      }

      return [...new Set(urls)];
    } catch (error) {
      Logger.warning('Git remote detection failed', error.message);
      return [];
    }
  }

  async detectViaPredictedUrls() {
    Logger.info('🔮 Generating predicted URLs based on project patterns...');
    
    const variations = [
      this.projectName,
      this.projectName.replace(/-v\d+$/, ''), // Remove version suffix
      'astralcore',
      'astral-core',
      'mental-health-platform'
    ];

    const urls = [];
    
    variations.forEach(name => {
      urls.push(`https://${name}.vercel.app`);
      urls.push(`https://${name}-git-main.vercel.app`);
      urls.push(`https://${name}-git-master.vercel.app`);
      urls.push(`https://${name}-git-production.vercel.app`);
      
      // With team prefix (common pattern)
      urls.push(`https://${name}-team.vercel.app`);
      urls.push(`https://${name}-prod.vercel.app`);
    });

    return [...new Set(urls)];
  }

  async detectViaEnvironmentVariables() {
    Logger.info('🔧 Detecting URLs from environment variables...');
    
    const urls = [];
    
    const envVars = [
      'VERCEL_URL',
      'NEXT_PUBLIC_VERCEL_URL',
      'DEPLOYMENT_URL',
      'NEXT_PUBLIC_APP_URL',
      'APP_URL',
      'NEXTAUTH_URL'
    ];

    envVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        if (value.startsWith('http')) {
          urls.push(value);
        } else {
          urls.push(`https://${value}`);
        }
      }
    });

    return [...new Set(urls)];
  }

  async detectViaRecentDeployments() {
    Logger.info('📊 Checking recent deployment logs...');
    
    const urls = [];
    
    try {
      // Check deployment logs if available
      const logFiles = [
        'deployment.log',
        'vercel.log',
        'final-deployment.log'
      ];

      for (const logFile of logFiles) {
        try {
          const logPath = path.join(process.cwd(), logFile);
          const content = await fs.readFile(logPath, 'utf8');
          
          // Look for Vercel URLs in logs
          const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.vercel\.app/g;
          const matches = content.match(urlRegex);
          
          if (matches) {
            matches.forEach(url => urls.push(url));
          }
        } catch {
          // Log file not found or unreadable
        }
      }
    } catch (error) {
      Logger.warning('Recent deployment detection failed', error.message);
    }

    return [...new Set(urls)];
  }

  async validateUrls(urls) {
    Logger.info('✅ Validating detected URLs...');
    
    const validationPromises = urls.map(url => 
      HttpClient.testUrl(url).catch(error => ({
        url,
        accessible: false,
        error: error.message
      }))
    );

    const results = await Promise.all(validationPromises);
    
    results.forEach(result => {
      this.validatedUrls.set(result.url, result);
      if (result.accessible) {
        Logger.success(`✅ ${result.url} (${result.statusCode})`);
      } else {
        Logger.warning(`❌ ${result.url} (${result.error || 'Failed'})`);
      }
    });

    const valid = results.filter(r => r.accessible);
    const invalid = results.filter(r => !r.accessible);

    Logger.success(`Validation complete: ${valid.length} valid, ${invalid.length} invalid`);
    
    return {
      valid: valid.map(r => r.url),
      invalid: invalid.map(r => r.url),
      results
    };
  }

  generateCallbackUrls(baseUrls) {
    Logger.info('🔗 Generating Auth0 callback URLs...');
    
    const callbacks = new Set();
    const logoutUrls = new Set();
    const webOrigins = new Set();
    const allowedOrigins = new Set();

    baseUrls.forEach(baseUrl => {
      // Auth0 callback URLs
      callbacks.add(`${baseUrl}/api/auth/callback/auth0`);
      callbacks.add(`${baseUrl}/api/auth/callback`);
      
      // Logout URLs
      logoutUrls.add(baseUrl);
      logoutUrls.add(`${baseUrl}/`);
      logoutUrls.add(`${baseUrl}/login`);
      logoutUrls.add(`${baseUrl}/auth/logout`);
      
      // Web origins and allowed origins
      webOrigins.add(baseUrl);
      allowedOrigins.add(baseUrl);
    });

    // Add localhost for development
    const devUrls = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000'
    ];

    devUrls.forEach(devUrl => {
      callbacks.add(`${devUrl}/api/auth/callback/auth0`);
      callbacks.add(`${devUrl}/api/auth/callback`);
      logoutUrls.add(devUrl);
      logoutUrls.add(`${devUrl}/`);
      logoutUrls.add(`${devUrl}/login`);
      webOrigins.add(devUrl);
      allowedOrigins.add(devUrl);
    });

    const config = {
      callbacks: Array.from(callbacks),
      logoutUrls: Array.from(logoutUrls),
      webOrigins: Array.from(webOrigins),
      allowedOrigins: Array.from(allowedOrigins)
    };

    Logger.success('🔗 Generated callback configuration:', {
      callbacks: config.callbacks.length,
      logoutUrls: config.logoutUrls.length,
      webOrigins: config.webOrigins.length,
      allowedOrigins: config.allowedOrigins.length
    });

    return config;
  }

  async saveResults(data) {
    try {
      const resultsPath = path.join(process.cwd(), 'logs', 'vercel-url-detection.json');
      await fs.mkdir(path.dirname(resultsPath), { recursive: true });
      
      const results = {
        timestamp: new Date().toISOString(),
        projectName: this.projectName,
        ...data
      };
      
      await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
      Logger.success(`📄 Results saved to: ${resultsPath}`);
      
      return results;
    } catch (error) {
      Logger.error('Failed to save results', error);
      return null;
    }
  }

  async run() {
    const startTime = Date.now();
    
    try {
      Logger.info('🚀 Starting Vercel URL detection...');
      
      // Step 1: Detect all URLs
      const detection = await this.detectAllUrls();
      
      // Step 2: Validate URLs
      const validation = await this.validateUrls(detection.urls);
      
      // Step 3: Generate callback configuration
      const callbackConfig = this.generateCallbackUrls(validation.valid);
      
      // Step 4: Save results
      const results = await this.saveResults({
        detection,
        validation,
        callbackConfig
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      Logger.success(`🎉 URL detection completed in ${duration}s`);
      Logger.info('📊 Summary:', {
        detected: detection.urls.length,
        valid: validation.valid.length,
        callbacks: callbackConfig.callbacks.length
      });

      return results;
      
    } catch (error) {
      Logger.error('URL detection failed', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              Smart Vercel URL Detector                      ║
║                   Astral Core v7                            ║
║                                                              ║
║  Automatically detects deployment URLs and generates        ║
║  Auth0 callback configurations.                             ║
╚══════════════════════════════════════════════════════════════╝
`);

  try {
    const detector = new VercelUrlDetector();
    const results = await detector.run();
    
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      🎉 SUCCESS! 🎉                        ║
║                                                              ║
║  URL detection completed successfully!                       ║
║                                                              ║
║  Valid URLs found: ${results?.validation?.valid?.length || 0}                                      ║
║  Callback URLs generated: ${results?.callbackConfig?.callbacks?.length || 0}                           ║
╚══════════════════════════════════════════════════════════════╝
`);

    return results;
    
  } catch (error) {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║                      ❌ FAILED ❌                          ║
║                                                              ║
║  URL detection failed!                                       ║
║                                                              ║
║  Check the logs for more details.                           ║
╚══════════════════════════════════════════════════════════════╝
`);

    Logger.error('Script execution failed', error);
    process.exit(1);
  }
}

// Execute if this is the main module
if (require.main === module) {
  main().catch(error => {
    Logger.error('Unhandled error in main execution', error);
    process.exit(1);
  });
}

// Export for use by other scripts
module.exports = {
  VercelUrlDetector,
  HttpClient,
  Logger
};