#!/usr/bin/env node

/**
 * Vercel Monitoring Script
 * Real-time monitoring of your Vercel deployment
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, silent = false) {
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return result;
  } catch (error) {
    return null;
  }
}

function displayMenu() {
  console.clear();
  log('\n📊 Astral Core v7 - Vercel Monitoring Dashboard', 'bright');
  log('='.repeat(60), 'cyan');
  
  log('\n📋 Monitoring Options:', 'yellow');
  log('  1. View Real-time Logs', 'reset');
  log('  2. Check Deployment Status', 'reset');
  log('  3. View Analytics Summary', 'reset');
  log('  4. Monitor API Health', 'reset');
  log('  5. Check Error Logs', 'reset');
  log('  6. View Performance Metrics', 'reset');
  log('  7. List Recent Deployments', 'reset');
  log('  8. View Environment Variables', 'reset');
  log('  9. Check Domain Configuration', 'reset');
  log('  0. Exit', 'reset');
  log('\n' + '='.repeat(60), 'cyan');
}

async function viewLogs() {
  log('\n📜 Fetching real-time logs...', 'blue');
  execCommand('vercel logs --follow');
}

async function checkDeploymentStatus() {
  log('\n🚀 Checking deployment status...', 'blue');
  const status = execCommand('vercel list --count 5', true);
  if (status) {
    console.log(status);
  }
}

async function viewAnalytics() {
  log('\n📈 Analytics Summary', 'blue');
  log('Opening Vercel Analytics dashboard...', 'cyan');
  execCommand('start https://vercel.com/damatnic/astral-core-v7/analytics', true);
}

async function monitorAPIHealth() {
  log('\n🏥 Monitoring API Health...', 'blue');
  
  const baseUrl = 'https://astral-core-v7.vercel.app';
  const endpoints = [
    '/api/health',
    '/api/health/ready',
    '/api/status',
    '/api/monitoring/uptime'
  ];
  
  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    log(`\nChecking ${endpoint}...`, 'cyan');
    
    try {
      const startTime = Date.now();
      execCommand(`curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s" ${url}`);
      const responseTime = Date.now() - startTime;
      
      if (responseTime < 500) {
        log(`  Response time: ${responseTime}ms ✅`, 'green');
      } else if (responseTime < 1000) {
        log(`  Response time: ${responseTime}ms ⚠️`, 'yellow');
      } else {
        log(`  Response time: ${responseTime}ms ❌`, 'red');
      }
    } catch {
      log(`  Failed to reach endpoint ❌`, 'red');
    }
  }
}

async function checkErrorLogs() {
  log('\n🔍 Fetching error logs...', 'blue');
  execCommand('vercel logs --error --count 20');
}

async function viewPerformanceMetrics() {
  log('\n⚡ Performance Metrics', 'blue');
  log('Opening Vercel Speed Insights...', 'cyan');
  execCommand('start https://vercel.com/damatnic/astral-core-v7/speed-insights', true);
}

async function listDeployments() {
  log('\n📦 Recent Deployments', 'blue');
  execCommand('vercel list --count 10');
}

async function viewEnvironmentVariables() {
  log('\n🔐 Environment Variables', 'blue');
  execCommand('vercel env ls');
}

async function checkDomains() {
  log('\n🌐 Domain Configuration', 'blue');
  execCommand('vercel domains ls');
  log('\n📝 Project Aliases:', 'cyan');
  execCommand('vercel alias ls');
}

async function handleMenuChoice(choice) {
  switch (choice) {
    case '1':
      await viewLogs();
      break;
    case '2':
      await checkDeploymentStatus();
      break;
    case '3':
      await viewAnalytics();
      break;
    case '4':
      await monitorAPIHealth();
      break;
    case '5':
      await checkErrorLogs();
      break;
    case '6':
      await viewPerformanceMetrics();
      break;
    case '7':
      await listDeployments();
      break;
    case '8':
      await viewEnvironmentVariables();
      break;
    case '9':
      await checkDomains();
      break;
    case '0':
      log('\n👋 Goodbye!', 'green');
      process.exit(0);
    default:
      log('\n❌ Invalid option', 'red');
  }
}

async function main() {
  let running = true;
  
  while (running) {
    displayMenu();
    
    const choice = await new Promise((resolve) => {
      rl.question('\nSelect an option (0-9): ', resolve);
    });
    
    await handleMenuChoice(choice);
    
    if (choice !== '0') {
      await new Promise((resolve) => {
        rl.question('\nPress Enter to continue...', resolve);
      });
    }
  }
  
  rl.close();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\n👋 Monitoring stopped', 'yellow');
  process.exit(0);
});

// Run the monitoring dashboard
main();