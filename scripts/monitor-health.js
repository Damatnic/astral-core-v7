#!/usr/bin/env node

/**
 * Production Health Monitoring Script
 * Monitors application health and sends alerts
 */

const https = require('https');
const http = require('http');

// Configuration
const MONITOR_CONFIG = {
  // Target URLs to monitor
  urls: [
    {
      name: 'Production Site',
      url: process.env.PRODUCTION_URL || 'https://astral-core-v7.vercel.app',
      expectedStatus: [200, 307, 401], // 401 is expected due to Vercel auth
    },
    {
      name: 'Health Endpoint',
      url: `${process.env.PRODUCTION_URL || 'https://astral-core-v7.vercel.app'}/api/health`,
      expectedStatus: [200],
    }
  ],
  
  // Check interval (5 minutes)
  checkInterval: process.env.CHECK_INTERVAL || 5 * 60 * 1000,
  
  // Alert configuration
  alertWebhook: process.env.ALERT_WEBHOOK,
  alertEmail: process.env.ALERT_EMAIL,
  
  // Failure threshold before alerting
  failureThreshold: 3,
  
  // Response time threshold (ms)
  responseTimeThreshold: 3000,
};

// Track failures
const failureCount = {};
const lastStatus = {};

/**
 * Check URL health
 */
async function checkHealth(target) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(target.url);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'Astral-Core-Monitor/1.0',
      }
    };
    
    const req = client.request(options, (res) => {
      const responseTime = Date.now() - startTime;
      const isHealthy = target.expectedStatus.includes(res.statusCode);
      
      resolve({
        name: target.name,
        url: target.url,
        status: res.statusCode,
        healthy: isHealthy,
        responseTime,
        timestamp: new Date().toISOString(),
        headers: res.headers,
      });
    });
    
    req.on('error', (error) => {
      resolve({
        name: target.name,
        url: target.url,
        status: 0,
        healthy: false,
        error: error.message,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: target.name,
        url: target.url,
        status: 0,
        healthy: false,
        error: 'Request timeout',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    });
    
    req.end();
  });
}

/**
 * Send alert
 */
async function sendAlert(message, severity = 'warning') {
  console.log(`[ALERT][${severity.toUpperCase()}] ${message}`);
  
  // Send webhook alert if configured
  if (MONITOR_CONFIG.alertWebhook) {
    try {
      // Implement webhook sending based on your service
      // Example for Discord/Slack webhook
      const webhookData = {
        text: message,
        severity,
        timestamp: new Date().toISOString(),
        service: 'Astral Core Monitor',
      };
      
      // TODO: Implement actual webhook sending
      console.log('Would send webhook:', webhookData);
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }
}

/**
 * Process health check results
 */
function processResults(result) {
  const key = result.name;
  
  // Initialize counters
  if (!failureCount[key]) failureCount[key] = 0;
  
  // Check health status
  if (!result.healthy) {
    failureCount[key]++;
    
    if (failureCount[key] >= MONITOR_CONFIG.failureThreshold) {
      sendAlert(
        `🚨 ${result.name} is DOWN! Status: ${result.status}, Error: ${result.error || 'Unknown'}`,
        'critical'
      );
    }
  } else {
    // Reset failure count on success
    if (failureCount[key] > 0) {
      sendAlert(
        `✅ ${result.name} is back UP! Status: ${result.status}, Response time: ${result.responseTime}ms`,
        'info'
      );
    }
    failureCount[key] = 0;
  }
  
  // Check response time
  if (result.healthy && result.responseTime > MONITOR_CONFIG.responseTimeThreshold) {
    sendAlert(
      `⚠️ ${result.name} is SLOW! Response time: ${result.responseTime}ms (threshold: ${MONITOR_CONFIG.responseTimeThreshold}ms)`,
      'warning'
    );
  }
  
  // Store last status
  lastStatus[key] = result;
  
  // Log result
  const emoji = result.healthy ? '✅' : '❌';
  console.log(
    `${emoji} [${result.timestamp}] ${result.name}: Status ${result.status}, Response ${result.responseTime}ms`
  );
}

/**
 * Run monitoring cycle
 */
async function runMonitoring() {
  console.log('🔍 Running health checks...');
  
  for (const target of MONITOR_CONFIG.urls) {
    try {
      const result = await checkHealth(target);
      processResults(result);
    } catch (error) {
      console.error(`Error checking ${target.name}:`, error);
      processResults({
        name: target.name,
        url: target.url,
        status: 0,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // Generate summary
  const healthyCount = Object.values(lastStatus).filter(s => s.healthy).length;
  const totalCount = Object.keys(lastStatus).length;
  
  console.log(`📊 Summary: ${healthyCount}/${totalCount} services healthy\n`);
}

/**
 * Get monitoring status
 */
function getStatus() {
  return {
    services: lastStatus,
    failures: failureCount,
    summary: {
      healthy: Object.values(lastStatus).filter(s => s.healthy).length,
      total: Object.keys(lastStatus).length,
      avgResponseTime: Object.values(lastStatus)
        .filter(s => s.responseTime)
        .reduce((sum, s) => sum + s.responseTime, 0) / Object.keys(lastStatus).length || 0,
    },
    lastCheck: new Date().toISOString(),
  };
}

/**
 * Start monitoring
 */
function startMonitoring() {
  console.log('🚀 Starting Astral Core Health Monitor');
  console.log(`📍 Monitoring ${MONITOR_CONFIG.urls.length} endpoints`);
  console.log(`⏰ Check interval: ${MONITOR_CONFIG.checkInterval / 1000}s`);
  console.log(`🔔 Alert threshold: ${MONITOR_CONFIG.failureThreshold} failures\n`);
  
  // Run initial check
  runMonitoring();
  
  // Schedule regular checks
  setInterval(runMonitoring, MONITOR_CONFIG.checkInterval);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping health monitor...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n👋 Stopping health monitor...');
    process.exit(0);
  });
}

// Export for use as module
module.exports = {
  checkHealth,
  runMonitoring,
  getStatus,
  startMonitoring,
};

// Run if called directly
if (require.main === module) {
  startMonitoring();
}