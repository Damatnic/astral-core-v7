#!/usr/bin/env node

/**
 * Direct Auth0 Configuration Script
 * Uses the Auth0 Management API directly to configure the application
 * This bypasses the need for the Auth0 CLI
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Auth0 Configuration
const AUTH0_DOMAIN = 'dev-ac3ajs327vs5vzhk.us.auth0.com';
const TARGET_CLIENT_ID = '7ivKaost2wsuV47x6dAyj11Eo7jpcctX'; // The SPA app to configure
const M2M_CLIENT_ID = 'fjwO1okDLOjcmubpkOW7VrWNy8Uns5A0'; // Machine-to-Machine app
const M2M_CLIENT_SECRET = '9zNRTS8SC2LenG-sT4XcWDpvhT1nOMK8fPjT8ApTWlnhT5AeHHsQkayYGOUM-0s8';

// Vercel deployment URLs
const DEPLOYMENT_URLS = [
  'https://astral-core-v7.vercel.app',
  'https://astral-core-v7-git-main.vercel.app',
  'https://astral-core-v7-git-master.vercel.app',
  'http://localhost:3000'
];

console.log('🚀 Auth0 Direct Configuration Script');
console.log('=====================================');
console.log('');
console.log('⚠️  IMPORTANT: This script requires that your Auth0 application');
console.log('   has been configured as a Machine-to-Machine application');
console.log('   with access to the Auth0 Management API.');
console.log('');
console.log('📋 If you see "unauthorized_client" errors, please:');
console.log('   1. Go to https://manage.auth0.com/');
console.log('   2. Navigate to Applications → APIs → Auth0 Management API');
console.log('   3. Go to "Machine to Machine Applications" tab');
console.log('   4. Authorize your application: ' + TARGET_CLIENT_ID);
console.log('   5. Grant these scopes:');
console.log('      - read:clients');
console.log('      - update:clients');
console.log('      - read:client_grants');
console.log('      - update:client_grants');
console.log('');
console.log('Alternatively, you can create a separate M2M application:');
console.log('   1. Create a new application of type "Machine to Machine"');
console.log('   2. Authorize it for the Auth0 Management API');
console.log('   3. Use its credentials in this script');
console.log('');
console.log('Press Enter to continue with the current credentials...');

// Function to make HTTPS requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
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

// Get Management API token (for M2M applications)
async function getManagementToken() {
  console.log('🔐 Getting Management API token...');
  
  const tokenData = {
    grant_type: 'client_credentials',
    client_id: M2M_CLIENT_ID,
    client_secret: M2M_CLIENT_SECRET,
    audience: `https://${AUTH0_DOMAIN}/api/v2/`
  };
  
  const options = {
    hostname: AUTH0_DOMAIN,
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': JSON.stringify(tokenData).length
    }
  };
  
  try {
    const response = await makeRequest(options, tokenData);
    console.log('✅ Successfully obtained Management API token');
    return response.access_token;
  } catch (error) {
    console.error('❌ Failed to get Management API token:', error.message);
    console.log('');
    console.log('🔧 To fix this issue:');
    console.log('   1. Go to the Auth0 Dashboard');
    console.log('   2. Configure your application as described above');
    console.log('   3. Or create a new M2M application');
    throw error;
  }
}

// Update client configuration
async function updateClientConfig(token) {
  console.log('⚙️ Updating client configuration...');
  
  // Build callback URLs
  const callbacks = [];
  const logoutUrls = [];
  const webOrigins = [];
  const allowedOrigins = [];
  
  DEPLOYMENT_URLS.forEach(url => {
    // Callbacks
    callbacks.push(`${url}/api/auth/callback/auth0`);
    callbacks.push(`${url}/api/auth/callback`);
    
    // Logout URLs
    logoutUrls.push(url);
    logoutUrls.push(`${url}/`);
    logoutUrls.push(`${url}/login`);
    
    // Web Origins & Allowed Origins
    webOrigins.push(url);
    allowedOrigins.push(url);
  });
  
  // Add localhost variations
  callbacks.push('http://localhost:3000');
  callbacks.push('http://localhost:3000/');
  callbacks.push('http://localhost:3000/login');
  
  const updateData = {
    name: 'Astral Core v7 (Direct Config)',
    description: 'Mental Health Platform - Configured via Direct API',
    app_type: 'spa',
    is_first_party: true,
    oidc_conformant: true,
    callbacks: [...new Set(callbacks)],
    allowed_logout_urls: [...new Set(logoutUrls)],
    allowed_origins: [...new Set(allowedOrigins)],
    web_origins: [...new Set(webOrigins)],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    jwt_configuration: {
      lifetime_in_seconds: 36000,
      alg: 'RS256'
    },
    refresh_token: {
      rotation_type: 'rotating',
      expiration_type: 'expiring',
      token_lifetime: 2592000,
      idle_token_lifetime: 1296000
    },
    cross_origin_auth: true,
    custom_login_page_on: false,
    client_metadata: {
      environment: 'production',
      auto_configured: 'direct_api',
      configuration_date: new Date().toISOString()
    }
  };
  
  const options = {
    hostname: AUTH0_DOMAIN,
    path: `/api/v2/clients/${TARGET_CLIENT_ID}`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': JSON.stringify(updateData).length
    }
  };
  
  try {
    const response = await makeRequest(options, updateData);
    console.log('✅ Successfully updated client configuration');
    return response;
  } catch (error) {
    console.error('❌ Failed to update client configuration:', error.message);
    throw error;
  }
}

// Generate configuration report
function generateReport(config) {
  const report = {
    timestamp: new Date().toISOString(),
    domain: AUTH0_DOMAIN,
    clientId: TARGET_CLIENT_ID,
    configuration: {
      name: config.name,
      app_type: config.app_type,
      callbacks_count: config.callbacks?.length || 0,
      logout_urls_count: config.allowed_logout_urls?.length || 0,
      web_origins_count: config.web_origins?.length || 0,
      grant_types: config.grant_types,
      token_endpoint_auth_method: config.token_endpoint_auth_method,
      oidc_conformant: config.oidc_conformant,
      cross_origin_auth: config.cross_origin_auth
    },
    urls: {
      production: 'https://astral-core-v7.vercel.app',
      login: 'https://astral-core-v7.vercel.app/api/auth/login',
      callback: 'https://astral-core-v7.vercel.app/api/auth/callback/auth0'
    }
  };
  
  // Save report
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const reportPath = path.join(logsDir, 'auth0-direct-config-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('');
  console.log('📊 Configuration Report');
  console.log('=======================');
  console.log(`✅ Application Name: ${config.name}`);
  console.log(`✅ Application Type: ${config.app_type}`);
  console.log(`✅ Callbacks Configured: ${config.callbacks?.length || 0}`);
  console.log(`✅ Logout URLs Configured: ${config.allowed_logout_urls?.length || 0}`);
  console.log(`✅ OIDC Conformant: ${config.oidc_conformant}`);
  console.log(`✅ PKCE Enabled: ${config.token_endpoint_auth_method === 'none'}`);
  console.log('');
  console.log('📁 Report saved to:', reportPath);
}

// Main execution
async function main() {
  try {
    // Get Management API token
    const token = await getManagementToken();
    
    // Update client configuration
    const config = await updateClientConfig(token);
    
    // Generate report
    generateReport(config);
    
    console.log('');
    console.log('🎉 Auth0 configuration completed successfully!');
    console.log('');
    console.log('🔗 Test your login at:');
    console.log('   https://astral-core-v7.vercel.app/api/auth/login');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Verify the configuration in the Auth0 Dashboard');
    console.log('   2. Test the login flow');
    console.log('   3. Check user roles and permissions');
    
  } catch (error) {
    console.error('');
    console.error('💥 Configuration failed:', error.message);
    console.error('');
    console.error('Please check the MANUAL_AUTH0_SETUP.md file for manual configuration steps.');
    process.exit(1);
  }
}

// Wait for user confirmation
process.stdin.once('data', () => {
  main();
});

// Handle no input (for automated scripts)
setTimeout(() => {
  console.log('⏱️ No input received, proceeding automatically...');
  main();
}, 100);