#!/usr/bin/env node
/**
 * Auth0 Management API Automation Script
 * 
 * This script automatically configures Auth0 dashboard settings using the Management API
 * without requiring manual intervention in the Auth0 dashboard.
 * 
 * Features:
 * - Complete application configuration
 * - Automatic callback URL detection and setup
 * - PKCE and CORS configuration
 * - Custom claims and role setup
 * - Session and security settings
 * - Comprehensive error handling and logging
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration constants
const AUTH0_CONFIG = {
  domain: 'dev-ac3ajs327vs5vzhk.us.auth0.com',
  clientId: '7ivKaost2wsuV47x6dAyj11Eo7jpcctX',
  clientSecret: 'A7ABJwRg7n0otizVohWj15UN2zjEl5lbSW7sBlXPgvqsU0FPvyQmobUA0pQ8OiJo',
  managementClientId: '7ivKaost2wsuV47x6dAyj11Eo7jpcctX', // Use same client for simplicity
  managementClientSecret: 'A7ABJwRg7n0otizVohWj15UN2zjEl5lbSW7sBlXPgvqsU0FPvyQmobUA0pQ8OiJo'
};

// Logging utilities
class Logger {
  static info(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`🔷 [${timestamp}] ${message}`);
    if (data) console.log('   Data:', JSON.stringify(data, null, 2));
    this.writeToLog('INFO', message, data);
  }

  static success(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`✅ [${timestamp}] ${message}`);
    if (data) console.log('   Data:', JSON.stringify(data, null, 2));
    this.writeToLog('SUCCESS', message, data);
  }

  static error(message, error = null) {
    const timestamp = new Date().toISOString();
    console.error(`❌ [${timestamp}] ${message}`);
    if (error) {
      console.error('   Error:', error.message || error);
      if (error.stack) console.error('   Stack:', error.stack);
    }
    this.writeToLog('ERROR', message, error);
  }

  static warning(message, data = null) {
    const timestamp = new Date().toISOString();
    console.warn(`⚠️ [${timestamp}] ${message}`);
    if (data) console.log('   Data:', JSON.stringify(data, null, 2));
    this.writeToLog('WARNING', message, data);
  }

  static progress(current, total, message) {
    const percentage = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
    console.log(`📊 [${progressBar}] ${percentage}% - ${message}`);
  }

  static async writeToLog(level, message, data) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        data: data ? (data instanceof Error ? { message: data.message, stack: data.stack } : data) : null
      };
      
      const logPath = path.join(process.cwd(), 'logs', 'auth0-management.log');
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      // Silently fail to avoid infinite loops
    }
  }
}

// HTTP utilities
class HttpClient {
  static async makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const responseData = body ? JSON.parse(body) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ data: responseData, statusCode: res.statusCode });
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${responseData.message || body}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  static async get(url, headers = {}) {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    return this.makeRequest(options);
  }

  static async post(url, data, headers = {}) {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    return this.makeRequest(options, data);
  }

  static async patch(url, data, headers = {}) {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    return this.makeRequest(options, data);
  }
}

// URL Detection utilities
class UrlDetector {
  static async getVercelDeploymentUrls() {
    try {
      Logger.info('🔍 Detecting Vercel deployment URLs...');
      
      // Try to get current deployment URL from vercel CLI
      try {
        const vercelOutput = execSync('vercel ls --count 5 --json 2>/dev/null', { 
          encoding: 'utf8',
          cwd: process.cwd(),
          timeout: 10000
        });
        
        const deployments = JSON.parse(vercelOutput);
        const urls = [];
        
        if (deployments && deployments.length > 0) {
          deployments.forEach(deployment => {
            if (deployment.url) {
              urls.push(`https://${deployment.url}`);
            }
          });
        }
        
        Logger.success(`Found ${urls.length} Vercel deployment URLs`, urls);
        return urls;
      } catch (error) {
        Logger.warning('Could not fetch Vercel deployments via CLI', error.message);
      }

      // Fallback: check common patterns
      const fallbackUrls = [
        'https://astral-core-v7.vercel.app',
        'https://astral-core-v7-git-main.vercel.app',
        'https://astral-core-v7-git-master.vercel.app'
      ];

      Logger.info('Using fallback URLs', fallbackUrls);
      return fallbackUrls;
    } catch (error) {
      Logger.error('Failed to detect Vercel URLs', error);
      return ['http://localhost:3000']; // Ultimate fallback
    }
  }

  static generateCallbackUrls(baseUrls) {
    const callbacks = [];
    const logoutUrls = [];

    baseUrls.forEach(baseUrl => {
      // Auth callback URLs
      callbacks.push(`${baseUrl}/api/auth/callback/auth0`);
      callbacks.push(`${baseUrl}/api/auth/callback`);
      
      // Logout URLs
      logoutUrls.push(baseUrl);
      logoutUrls.push(`${baseUrl}/`);
      logoutUrls.push(`${baseUrl}/login`);
    });

    // Add localhost for development
    const devUrls = [
      'http://localhost:3000/api/auth/callback/auth0',
      'http://localhost:3000/api/auth/callback',
      'http://localhost:3000',
      'http://localhost:3000/',
      'http://localhost:3000/login'
    ];

    return {
      callbacks: [...new Set([...callbacks, ...devUrls])],
      logouts: [...new Set([...logoutUrls, 'http://localhost:3000', 'http://localhost:3000/'])]
    };
  }
}

// Auth0 Management API Client
class Auth0ManagementClient {
  constructor() {
    this.domain = AUTH0_CONFIG.domain;
    this.clientId = AUTH0_CONFIG.managementClientId;
    this.clientSecret = AUTH0_CONFIG.managementClientSecret;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    Logger.info('🔐 Getting Auth0 Management API access token...');

    try {
      const response = await HttpClient.post(`https://${this.domain}/oauth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: `https://${this.domain}/api/v2/`,
        grant_type: 'client_credentials'
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Subtract 1 minute for safety

      Logger.success('Successfully obtained Management API token');
      return this.accessToken;
    } catch (error) {
      Logger.error('Failed to get Management API token', error);
      throw error;
    }
  }

  async makeApiCall(method, endpoint, data = null) {
    const token = await this.getAccessToken();
    const url = `https://${this.domain}/api/v2${endpoint}`;
    const headers = { 'Authorization': `Bearer ${token}` };

    switch (method.toUpperCase()) {
      case 'GET':
        return HttpClient.get(url, headers);
      case 'POST':
        return HttpClient.post(url, data, headers);
      case 'PATCH':
        return HttpClient.patch(url, data, headers);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  async getClient(clientId) {
    try {
      Logger.info(`🔍 Fetching client configuration for: ${clientId}`);
      const response = await this.makeApiCall('GET', `/clients/${clientId}`);
      Logger.success('Successfully fetched client configuration');
      return response.data;
    } catch (error) {
      Logger.error('Failed to fetch client configuration', error);
      throw error;
    }
  }

  async updateClient(clientId, updates) {
    try {
      Logger.info(`📝 Updating client configuration for: ${clientId}`, updates);
      const response = await this.makeApiCall('PATCH', `/clients/${clientId}`, updates);
      Logger.success('Successfully updated client configuration');
      return response.data;
    } catch (error) {
      Logger.error('Failed to update client configuration', error);
      throw error;
    }
  }

  async createRule(rule) {
    try {
      Logger.info('📋 Creating Auth0 rule', { name: rule.name });
      const response = await this.makeApiCall('POST', '/rules', rule);
      Logger.success('Successfully created rule');
      return response.data;
    } catch (error) {
      if (error.message.includes('rule name already exists')) {
        Logger.warning('Rule already exists, attempting update...');
        return this.updateExistingRule(rule);
      }
      Logger.error('Failed to create rule', error);
      throw error;
    }
  }

  async updateExistingRule(rule) {
    try {
      // Get existing rules to find the one to update
      const rulesResponse = await this.makeApiCall('GET', '/rules');
      const existingRule = rulesResponse.data.find(r => r.name === rule.name);
      
      if (existingRule) {
        Logger.info(`📝 Updating existing rule: ${rule.name}`);
        const response = await this.makeApiCall('PATCH', `/rules/${existingRule.id}`, rule);
        Logger.success('Successfully updated existing rule');
        return response.data;
      }
    } catch (error) {
      Logger.error('Failed to update existing rule', error);
      throw error;
    }
  }

  async getTenant() {
    try {
      Logger.info('🏢 Fetching tenant settings...');
      const response = await this.makeApiCall('GET', '/tenants/settings');
      Logger.success('Successfully fetched tenant settings');
      return response.data;
    } catch (error) {
      Logger.error('Failed to fetch tenant settings', error);
      throw error;
    }
  }

  async updateTenant(settings) {
    try {
      Logger.info('🏢 Updating tenant settings...', settings);
      const response = await this.makeApiCall('PATCH', '/tenants/settings', settings);
      Logger.success('Successfully updated tenant settings');
      return response.data;
    } catch (error) {
      Logger.error('Failed to update tenant settings', error);
      throw error;
    }
  }
}

// Main configuration automation class
class Auth0ConfigurationAutomator {
  constructor() {
    this.managementClient = new Auth0ManagementClient();
  }

  async run() {
    Logger.info('🚀 Starting Auth0 Configuration Automation...');
    Logger.info('📋 Configuration Details:', {
      domain: AUTH0_CONFIG.domain,
      clientId: AUTH0_CONFIG.clientId,
      timestamp: new Date().toISOString()
    });

    try {
      // Step 1: Detect deployment URLs
      Logger.progress(1, 8, 'Detecting deployment URLs...');
      const baseUrls = await UrlDetector.getVercelDeploymentUrls();
      const urlConfig = UrlDetector.generateCallbackUrls(baseUrls);

      // Step 2: Configure Application Settings
      Logger.progress(2, 8, 'Configuring application settings...');
      await this.configureApplication(urlConfig);

      // Step 3: Configure PKCE and Security
      Logger.progress(3, 8, 'Configuring PKCE and security settings...');
      await this.configureSecuritySettings();

      // Step 4: Setup Custom Claims
      Logger.progress(4, 8, 'Setting up custom claims and roles...');
      await this.setupCustomClaims();

      // Step 5: Configure Session Settings
      Logger.progress(5, 8, 'Configuring session settings...');
      await this.configureSessionSettings();

      // Step 6: Setup CORS Settings
      Logger.progress(6, 8, 'Configuring CORS settings...');
      await this.configureCorsSettings(baseUrls);

      // Step 7: Configure Tenant Settings
      Logger.progress(7, 8, 'Configuring tenant settings...');
      await this.configureTenantSettings();

      // Step 8: Final validation
      Logger.progress(8, 8, 'Running final validation...');
      await this.validateConfiguration();

      Logger.success('🎉 Auth0 Configuration Automation completed successfully!');
      
      // Save configuration summary
      await this.saveConfigurationSummary({
        baseUrls,
        urlConfig,
        timestamp: new Date().toISOString(),
        domain: AUTH0_CONFIG.domain,
        clientId: AUTH0_CONFIG.clientId
      });

    } catch (error) {
      Logger.error('💥 Auth0 Configuration Automation failed', error);
      throw error;
    }
  }

  async configureApplication(urlConfig) {
    Logger.info('⚙️ Configuring Auth0 application...');

    const applicationConfig = {
      name: 'Astral Core v7 (Auto-Configured)',
      description: 'Astral Core Mental Health Platform - Automatically configured via Management API',
      app_type: 'spa', // Single Page Application
      is_first_party: true,
      oidc_conformant: true,
      
      // Callback URLs
      callbacks: urlConfig.callbacks,
      allowed_logout_urls: urlConfig.logouts,
      allowed_origins: urlConfig.logouts,
      web_origins: urlConfig.logouts,
      
      // Token settings
      token_endpoint_auth_method: 'none', // PKCE doesn't require client secret
      
      // Grant types
      grant_types: [
        'authorization_code',
        'refresh_token'
      ],
      
      // JWT settings
      jwt_configuration: {
        lifetime_in_seconds: 36000, // 10 hours
        secret_encoded: false,
        alg: 'RS256'
      },
      
      // Advanced settings
      cross_origin_auth: true,
      custom_login_page_on: false,
      
      // Client metadata
      client_metadata: {
        environment: 'production',
        auto_configured: 'true',
        configuration_date: new Date().toISOString()
      }
    };

    await this.managementClient.updateClient(AUTH0_CONFIG.clientId, applicationConfig);
    Logger.success('✅ Application configuration completed');
  }

  async configureSecuritySettings() {
    Logger.info('🔒 Configuring security settings...');

    const securityConfig = {
      // Refresh token settings
      refresh_token: {
        rotation_type: 'rotating',
        expiration_type: 'expiring',
        token_lifetime: 2592000, // 30 days
        infinite_token_lifetime: false,
        infinite_idle_token_lifetime: false,
        idle_token_lifetime: 1296000 // 15 days
      },
      
      // Additional security settings
      organization_usage: 'deny',
      organization_require_behavior: 'no_prompt'
    };

    await this.managementClient.updateClient(AUTH0_CONFIG.clientId, securityConfig);
    Logger.success('✅ Security settings configured');
  }

  async setupCustomClaims() {
    Logger.info('🏷️ Setting up custom claims and roles...');

    const customClaimsRule = {
      name: 'Add Custom Claims for Astral Core',
      enabled: true,
      order: 1,
      script: `
function addCustomClaims(user, context, callback) {
  const namespace = 'https://astralcore.app/';
  
  // Default role assignment logic
  let role = 'CLIENT'; // Default role
  
  // Check user metadata first
  if (user.user_metadata && user.user_metadata.role) {
    role = user.user_metadata.role.toUpperCase();
  }
  
  // Check app metadata
  if (user.app_metadata && user.app_metadata.role) {
    role = user.app_metadata.role.toUpperCase();
  }
  
  // Email-based role assignment as fallback
  if (user.email) {
    if (user.email.includes('admin') || user.email.includes('administrator')) {
      role = 'ADMIN';
    } else if (user.email.includes('therapist') || user.email.includes('doctor') || user.email.includes('dr.')) {
      role = 'THERAPIST';
    } else if (user.email.includes('crisis') || user.email.includes('emergency')) {
      role = 'CRISIS_RESPONDER';
    } else if (user.email.includes('supervisor') || user.email.includes('manager')) {
      role = 'SUPERVISOR';
    }
  }
  
  // Validate role
  const validRoles = ['ADMIN', 'THERAPIST', 'CLIENT', 'CRISIS_RESPONDER', 'SUPERVISOR'];
  if (!validRoles.includes(role)) {
    role = 'CLIENT';
  }
  
  // Add custom claims to tokens
  context.idToken[namespace + 'roles'] = [role];
  context.accessToken[namespace + 'roles'] = [role];
  context.idToken[namespace + 'user_metadata'] = user.user_metadata || {};
  context.accessToken[namespace + 'user_metadata'] = user.user_metadata || {};
  
  // Add user information
  context.idToken[namespace + 'user_id'] = user.user_id;
  context.accessToken[namespace + 'user_id'] = user.user_id;
  
  callback(null, user, context);
}
      `.trim()
    };

    await this.managementClient.createRule(customClaimsRule);
    Logger.success('✅ Custom claims rule configured');
  }

  async configureSessionSettings() {
    Logger.info('🕐 Configuring session settings...');

    const sessionConfig = {
      // Session settings are mainly handled at the tenant level
      session_lifetime: 720, // 12 hours in minutes
      idle_session_lifetime: 72, // 72 hours in minutes
      
      // Additional client-specific session settings
      client_metadata: {
        session_timeout: '720',
        idle_timeout: '72'
      }
    };

    await this.managementClient.updateClient(AUTH0_CONFIG.clientId, sessionConfig);
    Logger.success('✅ Session settings configured');
  }

  async configureCorsSettings(baseUrls) {
    Logger.info('🌐 Configuring CORS settings...');

    // CORS is mainly configured through allowed_origins in the client config
    // which we already set in configureApplication
    const corsConfig = {
      allowed_origins: baseUrls.concat(['http://localhost:3000']),
      web_origins: baseUrls.concat(['http://localhost:3000'])
    };

    await this.managementClient.updateClient(AUTH0_CONFIG.clientId, corsConfig);
    Logger.success('✅ CORS settings configured');
  }

  async configureTenantSettings() {
    Logger.info('🏢 Configuring tenant-level settings...');

    try {
      const tenantConfig = {
        // Session settings
        session_lifetime: 720, // 12 hours
        idle_session_lifetime: 4320, // 72 hours
        
        // Security settings
        sandbox_version: '16',
        default_audience: '',
        default_directory: 'Username-Password-Authentication',
        
        // Flags for various features
        flags: {
          enable_client_connections: true,
          enable_apis_section: true,
          enable_pipeline2: true,
          enable_dynamic_client_registration: false,
          enable_custom_domain_in_emails: false,
          universal_login: true,
          enable_legacy_profile: false,
          enable_legacy_logs_search_v2: false,
          enable_idtoken_api2: true,
          enable_public_signup_user_exists_error: false,
          enable_sso: true
        },
        
        // Universal Login settings
        universal_login: {
          colors: {
            primary: '#0070f3',
            page_background: '#ffffff'
          }
        },
        
        // Guardian MFA settings
        guardian_mfa_page: {
          enabled: true,
          html: ''
        },
        
        // Error page settings
        error_page: {
          html: '',
          show_log_link: false,
          url: ''
        }
      };

      await this.managementClient.updateTenant(tenantConfig);
      Logger.success('✅ Tenant settings configured');
    } catch (error) {
      // Tenant updates might fail due to permissions, log but don't fail the whole process
      Logger.warning('Could not update all tenant settings - this may be due to permission restrictions', error);
    }
  }

  async validateConfiguration() {
    Logger.info('🔍 Validating Auth0 configuration...');

    try {
      // Fetch the updated client configuration
      const clientConfig = await this.managementClient.getClient(AUTH0_CONFIG.clientId);
      
      // Validate key settings
      const validations = [
        {
          name: 'Application Type',
          expected: 'spa',
          actual: clientConfig.app_type,
          valid: clientConfig.app_type === 'spa'
        },
        {
          name: 'OIDC Conformant',
          expected: true,
          actual: clientConfig.oidc_conformant,
          valid: clientConfig.oidc_conformant === true
        },
        {
          name: 'Grant Types',
          expected: 'authorization_code, refresh_token',
          actual: clientConfig.grant_types?.join(', '),
          valid: clientConfig.grant_types?.includes('authorization_code') && 
                 clientConfig.grant_types?.includes('refresh_token')
        },
        {
          name: 'Callbacks Configured',
          expected: '>= 1',
          actual: clientConfig.callbacks?.length || 0,
          valid: (clientConfig.callbacks?.length || 0) >= 1
        },
        {
          name: 'Cross Origin Auth',
          expected: true,
          actual: clientConfig.cross_origin_auth,
          valid: clientConfig.cross_origin_auth === true
        }
      ];

      let allValid = true;
      validations.forEach(validation => {
        if (validation.valid) {
          Logger.success(`✅ ${validation.name}: ${validation.actual}`);
        } else {
          Logger.error(`❌ ${validation.name}: Expected ${validation.expected}, got ${validation.actual}`);
          allValid = false;
        }
      });

      if (allValid) {
        Logger.success('🎉 All validations passed!');
      } else {
        throw new Error('Configuration validation failed');
      }
    } catch (error) {
      Logger.error('Validation failed', error);
      throw error;
    }
  }

  async saveConfigurationSummary(config) {
    try {
      const summaryPath = path.join(process.cwd(), 'logs', 'auth0-configuration-summary.json');
      await fs.mkdir(path.dirname(summaryPath), { recursive: true });
      await fs.writeFile(summaryPath, JSON.stringify(config, null, 2));
      
      Logger.success(`📄 Configuration summary saved to: ${summaryPath}`);
    } catch (error) {
      Logger.warning('Could not save configuration summary', error);
    }
  }
}

// Main execution
async function main() {
  const startTime = Date.now();
  
  try {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                 Auth0 Management API Automation             ║
║                      Astral Core v7                         ║
║                                                              ║
║  This script will automatically configure your Auth0        ║
║  application without requiring manual dashboard access.     ║
╚══════════════════════════════════════════════════════════════╝
`);

    const automator = new Auth0ConfigurationAutomator();
    await automator.run();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🎉 SUCCESS! 🎉                           ║
║                                                              ║
║  Auth0 configuration completed successfully!                ║
║  Duration: ${duration} seconds                                    ║
║                                                              ║
║  Your application is now ready for production!              ║
╚══════════════════════════════════════════════════════════════╝
`);

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║                      ❌ FAILED ❌                           ║
║                                                              ║
║  Auth0 configuration failed!                                ║
║  Duration: ${duration} seconds                                    ║
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
  Auth0ConfigurationAutomator,
  Auth0ManagementClient,
  UrlDetector,
  Logger,
  AUTH0_CONFIG
};