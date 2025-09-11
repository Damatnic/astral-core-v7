#!/usr/bin/env node

/**
 * Auth0 CORS and Cookie Interference Agent
 * Tests cross-origin requests, cookie handling, and potential authentication blocking issues
 */

const https = require('https');

console.log('🍪 Auth0 CORS and Cookie Interference Agent Started');

async function testCORSAndCookies() {
  try {
    const appUrl = process.env.AUTH0_APP_URL;
    const domain = process.env.AUTH0_DOMAIN;
    
    console.log('🔍 Testing CORS and cookie configurations...');
    
    // Test 1: CORS preflight request
    console.log('✈️ Testing CORS preflight request...');
    
    const corsTestOptions = {
      hostname: new URL(appUrl).hostname,
      port: 443,
      path: '/api/auth/session',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    };
    
    await new Promise((resolve, reject) => {
      const req = https.request(corsTestOptions, (res) => {
        console.log(`CORS preflight response status: ${res.statusCode}`);
        
        if (res.headers['access-control-allow-origin']) {
          console.log(`✅ CORS headers present: ${res.headers['access-control-allow-origin']}`);
        } else {
          console.log('⚠️ No CORS headers found (may be intentional)');
        }
        
        resolve();
      });
      
      req.on('error', (error) => {
        console.log(`⚠️ CORS test error: ${error.message}`);
        resolve(); // Don't fail on network errors
      });
      
      req.setTimeout(10000, () => {
        console.log('⚠️ CORS test timeout');
        resolve();
      });
      
      req.end();
    });
    
    // Test 2: Cookie security attributes
    console.log('🔒 Testing cookie security attributes...');
    
    await new Promise((resolve, reject) => {
      const req = https.get(appUrl, (res) => {
        const cookies = res.headers['set-cookie'] || [];
        
        console.log(`Found ${cookies.length} cookies`);
        
        cookies.forEach((cookie, index) => {
          console.log(`Cookie ${index + 1}: ${cookie.substring(0, 50)}...`);
          
          if (cookie.includes('Secure')) {
            console.log('  ✅ Secure flag present');
          } else {
            console.log('  ⚠️ Secure flag missing');
          }
          
          if (cookie.includes('HttpOnly')) {
            console.log('  ✅ HttpOnly flag present');
          } else {
            console.log('  ⚠️ HttpOnly flag missing');
          }
          
          if (cookie.includes('SameSite')) {
            console.log('  ✅ SameSite attribute present');
          } else {
            console.log('  ⚠️ SameSite attribute missing');
          }
        });
        
        resolve();
      });
      
      req.on('error', (error) => {
        console.log(`⚠️ Cookie test error: ${error.message}`);
        resolve();
      });
      
      req.setTimeout(10000, () => {
        console.log('⚠️ Cookie test timeout');
        resolve();
      });
    });
    
    // Test 3: Auth0 domain CORS
    console.log('🌐 Testing Auth0 domain CORS...');
    
    const auth0CorsOptions = {
      hostname: domain,
      port: 443,
      path: '/co/authenticate',
      method: 'OPTIONS',
      headers: {
        'Origin': appUrl,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    };
    
    await new Promise((resolve, reject) => {
      const req = https.request(auth0CorsOptions, (res) => {
        console.log(`Auth0 CORS response status: ${res.statusCode}`);
        
        if (res.headers['access-control-allow-origin']) {
          console.log('✅ Auth0 CORS configured correctly');
        } else {
          console.log('⚠️ Auth0 CORS may need configuration');
        }
        
        resolve();
      });
      
      req.on('error', (error) => {
        console.log(`⚠️ Auth0 CORS test error: ${error.message}`);
        resolve();
      });
      
      req.setTimeout(10000, () => {
        console.log('⚠️ Auth0 CORS test timeout');
        resolve();
      });
      
      req.end();
    });
    
    console.log('\n✅ CORS and cookie testing completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ CORS and cookie testing failed:', error.message);
    process.exit(1);
  }
}

testCORSAndCookies();
