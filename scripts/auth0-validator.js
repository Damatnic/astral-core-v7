#!/usr/bin/env node
/**
 * Auth0 Configuration Validator and Tester
 * 
 * This script comprehensively validates and tests all Auth0 configurations
 * to ensure everything is working correctly after setup.
 * 
 * Features:
 * - Complete configuration validation
 * - Live authentication flow testing
 * - Token validation and parsing
 * - Callback URL testing
 * - CORS and security settings verification
 * - Custom claims validation
 * - Performance and reliability testing
 * - Detailed reporting and recommendations
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

// Configuration
const AUTH0_CONFIG = {
  domain: 'dev-ac3ajs327vs5vzhk.us.auth0.com',
  clientId: '7ivKaost2wsuV47x6dAyj11Eo7jpcctX',
  clientSecret: 'A7ABJwRg7n0otizVohWj15UN2zjEl5lbSW7sBlXPgvqsU0FPvyQmobUA0pQ8OiJo'
};

// Logging utility
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

  static test(testName, passed, details = null) {
    const icon = passed ? '✅' : '❌';
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`${icon} [${status}] ${testName}`);
    if (details) console.log('   Details:', JSON.stringify(details, null, 2));
    this.writeToLog(status, testName, details);
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
      
      const logPath = path.join(process.cwd(), 'logs', 'auth0-validation.log');
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      // Silently fail to avoid infinite loops
    }
  }
}

// HTTP Client
class HttpClient {
  static async makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const responseData = body ? JSON.parse(body) : {};
            resolve({
              data: responseData,
              statusCode: res.statusCode,
              headers: res.headers,
              body
            });
          } catch (error) {
            resolve({
              data: body,
              statusCode: res.statusCode,
              headers: res.headers,
              body
            });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (data) {
        req.write(typeof data === 'string' ? data : JSON.stringify(data));
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
        'User-Agent': 'Astral-Core-Auth0-Validator/1.0',
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
        'User-Agent': 'Astral-Core-Auth0-Validator/1.0',
        ...headers
      }
    };

    return this.makeRequest(options, data);
  }
}

// Auth0 Management Client for validation
class Auth0ValidationClient {
  constructor() {
    this.domain = AUTH0_CONFIG.domain;
    this.clientId = AUTH0_CONFIG.clientId;
    this.clientSecret = AUTH0_CONFIG.clientSecret;
    this.accessToken = null;
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken;

    const response = await HttpClient.post(`https://${this.domain}/oauth/token`, {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      audience: `https://${this.domain}/api/v2/`,
      grant_type: 'client_credentials'
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to get access token: ${response.body}`);
    }

    this.accessToken = response.data.access_token;
    return this.accessToken;
  }

  async makeApiCall(endpoint, method = 'GET', data = null) {
    const token = await this.getAccessToken();
    const url = `https://${this.domain}/api/v2${endpoint}`;
    const headers = { 'Authorization': `Bearer ${token}` };

    if (method === 'GET') {
      return HttpClient.get(url, headers);
    } else if (method === 'POST') {
      return HttpClient.post(url, data, headers);
    }
  }

  async getClient() {
    return this.makeApiCall(`/clients/${this.clientId}`);
  }

  async getTenant() {
    return this.makeApiCall('/tenants/settings');
  }

  async getRules() {
    return this.makeApiCall('/rules');
  }
}

// Main validator class
class Auth0Validator {
  constructor() {
    this.client = new Auth0ValidationClient();
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      recommendations: []
    };
  }

  addTestResult(testName, passed, details = null, isWarning = false) {
    const result = {
      testName,
      passed,
      isWarning,
      details,
      timestamp: new Date().toISOString()
    };

    this.results.tests.push(result);
    this.results.summary.total++;

    if (isWarning) {
      this.results.summary.warnings++;
    } else if (passed) {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
    }

    Logger.test(testName, passed, details);
    return result;
  }

  addRecommendation(message, priority = 'medium') {
    this.results.recommendations.push({
      message,
      priority,
      timestamp: new Date().toISOString()
    });
  }

  async validateBasicConnectivity() {
    Logger.info('🌐 Testing basic Auth0 connectivity...');

    try {
      // Test Auth0 domain accessibility
      const domainResponse = await HttpClient.get(`https://${AUTH0_CONFIG.domain}/.well-known/openid_configuration`);
      this.addTestResult(
        'Auth0 Domain Accessibility',
        domainResponse.statusCode === 200,
        { domain: AUTH0_CONFIG.domain, statusCode: domainResponse.statusCode }
      );

      if (domainResponse.statusCode === 200) {
        const config = domainResponse.data;
        
        // Validate OIDC configuration
        this.addTestResult(
          'OIDC Configuration Present',
          !!config.authorization_endpoint && !!config.token_endpoint,
          {
            authorization_endpoint: config.authorization_endpoint,
            token_endpoint: config.token_endpoint,
            issuer: config.issuer
          }
        );

        // Test Management API accessibility
        const managementResponse = await HttpClient.get(`https://${AUTH0_CONFIG.domain}/api/v2/`);
        this.addTestResult(
          'Management API Accessibility',
          managementResponse.statusCode === 401, // 401 is expected without auth
          { statusCode: managementResponse.statusCode }
        );
      }
    } catch (error) {
      this.addTestResult('Auth0 Domain Accessibility', false, { error: error.message });
    }
  }

  async validateClientConfiguration() {
    Logger.info('⚙️ Validating client configuration...');

    try {
      const clientResponse = await this.client.getClient();
      
      if (clientResponse.statusCode === 200) {
        const clientConfig = clientResponse.data;
        
        // Validate application type
        this.addTestResult(
          'Application Type (SPA)',
          clientConfig.app_type === 'spa',
          { expected: 'spa', actual: clientConfig.app_type }
        );

        // Validate OIDC conformant
        this.addTestResult(
          'OIDC Conformant',
          clientConfig.oidc_conformant === true,
          { oidc_conformant: clientConfig.oidc_conformant }
        );

        // Validate grant types
        const hasAuthCode = clientConfig.grant_types?.includes('authorization_code');
        const hasRefreshToken = clientConfig.grant_types?.includes('refresh_token');
        this.addTestResult(
          'Grant Types Configuration',
          hasAuthCode && hasRefreshToken,
          {
            grant_types: clientConfig.grant_types,
            has_authorization_code: hasAuthCode,
            has_refresh_token: hasRefreshToken
          }
        );

        // Validate token endpoint auth method
        this.addTestResult(
          'Token Endpoint Auth Method (PKCE)',
          clientConfig.token_endpoint_auth_method === 'none',
          { token_endpoint_auth_method: clientConfig.token_endpoint_auth_method }
        );

        // Validate callback URLs
        const callbackCount = clientConfig.callbacks?.length || 0;
        this.addTestResult(
          'Callback URLs Configured',
          callbackCount > 0,
          {
            callback_count: callbackCount,
            callbacks: clientConfig.callbacks
          }
        );

        // Validate logout URLs
        const logoutCount = clientConfig.allowed_logout_urls?.length || 0;
        this.addTestResult(
          'Logout URLs Configured',
          logoutCount > 0,
          {
            logout_count: logoutCount,
            logout_urls: clientConfig.allowed_logout_urls
          }
        );

        // Validate CORS settings
        const originsCount = clientConfig.allowed_origins?.length || 0;
        this.addTestResult(
          'CORS Origins Configured',
          originsCount > 0,
          {
            origins_count: originsCount,
            origins: clientConfig.allowed_origins
          }
        );

        // Validate cross-origin auth
        this.addTestResult(
          'Cross-Origin Authentication',
          clientConfig.cross_origin_auth === true,
          { cross_origin_auth: clientConfig.cross_origin_auth }
        );

        // Check for development localhost URLs
        const hasLocalhost = clientConfig.callbacks?.some(url => url.includes('localhost'));
        if (hasLocalhost) {
          this.addTestResult(
            'Development URLs Present',
            true,
            { message: 'Localhost URLs found - remember to remove for production' },
            true // This is a warning
          );
          this.addRecommendation('Remove localhost URLs from production configuration', 'high');
        }

      } else {
        this.addTestResult('Client Configuration Access', false, { statusCode: clientResponse.statusCode });
      }
    } catch (error) {
      this.addTestResult('Client Configuration Access', false, { error: error.message });
    }
  }

  async validateTokenEndpoint() {
    Logger.info('🎟️ Testing token endpoint...');

    try {
      // Test token endpoint with invalid grant (should return specific error)
      const tokenResponse = await HttpClient.post(`https://${AUTH0_CONFIG.domain}/oauth/token`, {
        client_id: AUTH0_CONFIG.clientId,
        grant_type: 'invalid_grant'
      });

      // Should return 400 with unsupported_grant_type
      const isCorrectError = tokenResponse.statusCode === 400 && 
        (tokenResponse.data.error === 'unsupported_grant_type' || 
         tokenResponse.data.error === 'invalid_grant');

      this.addTestResult(
        'Token Endpoint Response',
        isCorrectError,
        {
          statusCode: tokenResponse.statusCode,
          error: tokenResponse.data.error,
          error_description: tokenResponse.data.error_description
        }
      );

      // Test management API token
      try {
        const mgmtToken = await this.client.getAccessToken();
        this.addTestResult(
          'Management API Token',
          !!mgmtToken,
          { token_length: mgmtToken?.length || 0 }
        );
      } catch (error) {
        this.addTestResult('Management API Token', false, { error: error.message });
      }

    } catch (error) {
      this.addTestResult('Token Endpoint Response', false, { error: error.message });
    }
  }

  async validateCustomClaims() {
    Logger.info('🏷️ Validating custom claims configuration...');

    try {
      const rulesResponse = await this.client.getRules();
      
      if (rulesResponse.statusCode === 200) {
        const rules = rulesResponse.data;
        const customClaimsRule = rules.find(rule => 
          rule.name.includes('Custom Claims') || 
          rule.name.includes('Astral Core') ||
          rule.script?.includes('astralcore.app')
        );

        this.addTestResult(
          'Custom Claims Rule Exists',
          !!customClaimsRule,
          {
            found_rule: customClaimsRule ? customClaimsRule.name : null,
            total_rules: rules.length
          }
        );

        if (customClaimsRule) {
          this.addTestResult(
            'Custom Claims Rule Enabled',
            customClaimsRule.enabled === true,
            { enabled: customClaimsRule.enabled }
          );

          // Check if rule includes namespace
          const hasNamespace = customClaimsRule.script?.includes('https://astralcore.app/');
          this.addTestResult(
            'Custom Claims Namespace',
            hasNamespace,
            { has_namespace: hasNamespace }
          );
        }

      } else {
        this.addTestResult('Custom Claims Validation', false, { statusCode: rulesResponse.statusCode });
      }
    } catch (error) {
      this.addTestResult('Custom Claims Validation', false, { error: error.message });
    }
  }

  async validateCallbackUrls() {
    Logger.info('🔗 Testing callback URLs...');

    try {
      const clientResponse = await this.client.getClient();
      
      if (clientResponse.statusCode === 200) {
        const callbacks = clientResponse.data.callbacks || [];
        let validCallbacks = 0;
        let invalidCallbacks = 0;

        for (const callback of callbacks) {
          try {
            const url = new URL(callback);
            
            // Validate callback URL format
            const isValidFormat = url.pathname.includes('/api/auth/callback');
            
            if (isValidFormat) {
              validCallbacks++;
            } else {
              invalidCallbacks++;
              Logger.warning(`Invalid callback format: ${callback}`);
            }

            // Test URL accessibility (for non-localhost URLs)
            if (!url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
              try {
                const response = await HttpClient.get(callback.replace('/api/auth/callback', ''));
                // Any response (even 404) indicates the domain is accessible
                if (response.statusCode < 500) {
                  Logger.info(`Callback domain accessible: ${url.hostname}`);
                }
              } catch {
                Logger.warning(`Callback domain may be inaccessible: ${url.hostname}`);
              }
            }

          } catch (error) {
            invalidCallbacks++;
            Logger.error(`Invalid callback URL: ${callback}`, error);
          }
        }

        this.addTestResult(
          'Callback URLs Format Validation',
          invalidCallbacks === 0,
          {
            total: callbacks.length,
            valid: validCallbacks,
            invalid: invalidCallbacks
          }
        );

      }
    } catch (error) {
      this.addTestResult('Callback URLs Validation', false, { error: error.message });
    }
  }

  async validateSecuritySettings() {
    Logger.info('🔒 Validating security settings...');

    try {
      const clientResponse = await this.client.getClient();
      
      if (clientResponse.statusCode === 200) {
        const clientConfig = clientResponse.data;

        // Validate refresh token settings
        const refreshTokenConfig = clientConfig.refresh_token;
        if (refreshTokenConfig) {
          this.addTestResult(
            'Refresh Token Rotation',
            refreshTokenConfig.rotation_type === 'rotating',
            { rotation_type: refreshTokenConfig.rotation_type }
          );

          this.addTestResult(
            'Refresh Token Expiration',
            refreshTokenConfig.expiration_type === 'expiring',
            { expiration_type: refreshTokenConfig.expiration_type }
          );
        }

        // Validate JWT settings
        const jwtConfig = clientConfig.jwt_configuration;
        if (jwtConfig) {
          this.addTestResult(
            'JWT Algorithm',
            jwtConfig.alg === 'RS256',
            { algorithm: jwtConfig.alg }
          );

          // Check token lifetime (should be reasonable)
          const lifetime = jwtConfig.lifetime_in_seconds;
          const isReasonableLifetime = lifetime >= 3600 && lifetime <= 86400; // 1 hour to 24 hours
          this.addTestResult(
            'JWT Token Lifetime',
            isReasonableLifetime,
            {
              lifetime_seconds: lifetime,
              lifetime_hours: Math.round(lifetime / 3600 * 100) / 100
            }
          );
        }

        // Check for sensitive information in client metadata
        const metadata = clientConfig.client_metadata || {};
        const hasSensitiveInfo = Object.keys(metadata).some(key => 
          key.toLowerCase().includes('secret') || 
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('key')
        );

        this.addTestResult(
          'Client Metadata Security',
          !hasSensitiveInfo,
          { 
            has_sensitive_metadata: hasSensitiveInfo,
            metadata_keys: Object.keys(metadata)
          }
        );

      }
    } catch (error) {
      this.addTestResult('Security Settings Validation', false, { error: error.message });
    }
  }

  async validateTenantSettings() {
    Logger.info('🏢 Validating tenant settings...');

    try {
      const tenantResponse = await this.client.getTenant();
      
      if (tenantResponse.statusCode === 200) {
        const tenantConfig = tenantResponse.data;

        // Validate session settings
        const sessionLifetime = tenantConfig.session_lifetime;
        if (sessionLifetime) {
          const isReasonableSession = sessionLifetime >= 60 && sessionLifetime <= 1440; // 1 hour to 24 hours
          this.addTestResult(
            'Session Lifetime',
            isReasonableSession,
            {
              session_lifetime_minutes: sessionLifetime,
              session_lifetime_hours: Math.round(sessionLifetime / 60 * 100) / 100
            }
          );
        }

        // Validate idle session lifetime
        const idleLifetime = tenantConfig.idle_session_lifetime;
        if (idleLifetime) {
          const isReasonableIdle = idleLifetime >= 120 && idleLifetime <= 4320; // 2 hours to 72 hours
          this.addTestResult(
            'Idle Session Lifetime',
            isReasonableIdle,
            {
              idle_lifetime_minutes: idleLifetime,
              idle_lifetime_hours: Math.round(idleLifetime / 60 * 100) / 100
            }
          );
        }

        // Check security flags
        const flags = tenantConfig.flags || {};
        this.addTestResult(
          'Universal Login Enabled',
          flags.universal_login !== false,
          { universal_login: flags.universal_login }
        );

        this.addTestResult(
          'Legacy Profile Disabled',
          flags.enable_legacy_profile === false,
          { enable_legacy_profile: flags.enable_legacy_profile }
        );

      } else {
        this.addTestResult(
          'Tenant Settings Access',
          false,
          { statusCode: tenantResponse.statusCode },
          true // Warning, not critical
        );
      }
    } catch (error) {
      this.addTestResult(
        'Tenant Settings Validation',
        false,
        { error: error.message },
        true // Warning, not critical
      );
    }
  }

  async validatePerformance() {
    Logger.info('⚡ Testing Auth0 performance...');

    const performanceTests = [
      { name: 'OIDC Configuration Load', url: `https://${AUTH0_CONFIG.domain}/.well-known/openid_configuration` },
      { name: 'Authorization Endpoint', url: `https://${AUTH0_CONFIG.domain}/authorize` },
      { name: 'Token Endpoint', url: `https://${AUTH0_CONFIG.domain}/oauth/token` }
    ];

    for (const test of performanceTests) {
      try {
        const startTime = Date.now();
        const response = await HttpClient.get(test.url);
        const responseTime = Date.now() - startTime;

        const isAcceptable = responseTime < 5000; // 5 seconds
        this.addTestResult(
          `${test.name} Response Time`,
          isAcceptable,
          {
            response_time_ms: responseTime,
            status_code: response.statusCode,
            acceptable: isAcceptable
          }
        );

        if (responseTime > 2000) {
          this.addRecommendation(`${test.name} is slow (${responseTime}ms). Consider checking network or Auth0 status.`, 'medium');
        }

      } catch (error) {
        this.addTestResult(`${test.name} Response Time`, false, { error: error.message });
      }
    }
  }

  async generateReport() {
    const report = {
      ...this.results,
      configuration: {
        domain: AUTH0_CONFIG.domain,
        clientId: AUTH0_CONFIG.clientId
      },
      generated_at: new Date().toISOString(),
      version: '1.0.0'
    };

    // Save detailed report
    try {
      const reportPath = path.join(process.cwd(), 'logs', 'auth0-validation-report.json');
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      Logger.success(`📊 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      Logger.error('Failed to save report', error);
    }

    return report;
  }

  async run() {
    const startTime = Date.now();

    Logger.info('🚀 Starting comprehensive Auth0 validation...');

    try {
      await this.validateBasicConnectivity();
      await this.validateClientConfiguration();
      await this.validateTokenEndpoint();
      await this.validateCustomClaims();
      await this.validateCallbackUrls();
      await this.validateSecuritySettings();
      await this.validateTenantSettings();
      await this.validatePerformance();

      const report = await this.generateReport();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      // Generate summary
      const { summary } = this.results;
      const successRate = ((summary.passed / summary.total) * 100).toFixed(1);

      Logger.success(`🎉 Validation completed in ${duration}s`);
      Logger.info('📊 Summary:', {
        total_tests: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        warnings: summary.warnings,
        success_rate: `${successRate}%`,
        recommendations: this.results.recommendations.length
      });

      if (summary.failed > 0) {
        Logger.error(`⚠️ ${summary.failed} critical issues found`);
        this.results.tests
          .filter(t => !t.passed && !t.isWarning)
          .forEach(test => {
            console.error(`   - ${test.testName}`);
          });
      }

      if (this.results.recommendations.length > 0) {
        Logger.info('💡 Recommendations:');
        this.results.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        });
      }

      return report;

    } catch (error) {
      Logger.error('Validation failed', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              Auth0 Configuration Validator                  ║
║                   Astral Core v7                            ║
║                                                              ║
║  Comprehensive validation and testing of Auth0 settings.    ║
╚══════════════════════════════════════════════════════════════╝
`);

  try {
    const validator = new Auth0Validator();
    const report = await validator.run();

    const isHealthy = report.summary.failed === 0;
    
    if (isHealthy) {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      🎉 SUCCESS! 🎉                        ║
║                                                              ║
║  Auth0 configuration validation passed!                     ║
║                                                              ║
║  Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%                                        ║
║  All critical tests passed.                                 ║
╚══════════════════════════════════════════════════════════════╝
`);
    } else {
      console.error(`
╔══════════════════════════════════════════════════════════════╗
║                     ⚠️  ISSUES FOUND ⚠️                    ║
║                                                              ║
║  Auth0 configuration has issues that need attention.       ║
║                                                              ║
║  Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%                                        ║
║  Failed Tests: ${report.summary.failed}                                           ║
╚══════════════════════════════════════════════════════════════╝
`);
    }

    return report;

  } catch (error) {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║                      ❌ FAILED ❌                          ║
║                                                              ║
║  Auth0 validation failed!                                   ║
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
  Auth0Validator,
  Auth0ValidationClient,
  Logger
};