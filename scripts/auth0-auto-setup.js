#!/usr/bin/env node

/**
 * Auth0 Automated Setup Script
 * Runs the Auth0 setup without interactive confirmation
 * This script automatically provides "yes" confirmation to the auth0-setup.js script
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🤖 Starting automated Auth0 setup...');
console.log('⚡ This will automatically confirm all prompts');
console.log('');

// Path to the original auth0-setup.js script
const setupScript = path.join(__dirname, 'auth0-setup.js');

// Spawn the auth0-setup process
const setupProcess = spawn('node', [setupScript], {
  stdio: ['pipe', 'inherit', 'inherit'],
  cwd: process.cwd()
});

// Automatically send "Enter" (newline) to confirm any prompts
setupProcess.stdin.write('\n');

// Handle process completion
setupProcess.on('close', (code) => {
  console.log('');
  if (code === 0) {
    console.log('✅ Auth0 automated setup completed successfully!');
    console.log('🎉 Your Auth0 configuration is now ready for production!');
  } else {
    console.log(`❌ Auth0 setup failed with exit code: ${code}`);
    process.exit(code);
  }
});

// Handle errors
setupProcess.on('error', (error) => {
  console.error('❌ Failed to start Auth0 setup:', error.message);
  process.exit(1);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n🛑 Automated setup interrupted by user');
  setupProcess.kill('SIGINT');
  process.exit(130);
});