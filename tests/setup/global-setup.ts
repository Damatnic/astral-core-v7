/**
 * Global Test Setup for Playwright E2E Tests
 * Configures test environment and shared resources
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXTAUTH_SECRET = 'test-secret-key-for-e2e-tests';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/astral_test';
  
  // Mock external service endpoints
  process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_key';
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock_secret';
  
  // Create global browser instance for authentication
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Pre-authenticate test users and save storage states
  await setupTestUsers(page);
  
  await context.close();
  await browser.close();
  
  console.log('Global setup completed');
}

async function setupTestUsers(page: any) {
  // Setup authenticated state for different user types
  const testUsers = [
    {
      email: 'testclient@example.com',
      password: 'TestPassword123!',
      role: 'CLIENT',
      storageFile: 'tests/auth-states/client-auth.json'
    },
    {
      email: 'testtherapist@example.com',
      password: 'TestPassword123!',
      role: 'THERAPIST',
      storageFile: 'tests/auth-states/therapist-auth.json'
    },
    {
      email: 'testadmin@example.com',
      password: 'TestPassword123!',
      role: 'ADMIN',
      storageFile: 'tests/auth-states/admin-auth.json'
    }
  ];

  for (const user of testUsers) {
    try {
      // Navigate to login page
      await page.goto('http://localhost:3000/auth/login');
      
      // Fill login form
      await page.fill('[data-testid="email-input"]', user.email);
      await page.fill('[data-testid="password-input"]', user.password);
      await page.click('[data-testid="login-button"]');
      
      // Wait for successful login
      await page.waitForURL('**/dashboard');
      
      // Save authentication state
      await page.context().storageState({ path: user.storageFile });
      
      console.log(`Authenticated ${user.role} user and saved state`);
    } catch (error) {
      console.warn(`Failed to authenticate ${user.role} user:`, error);
      // Continue with other users even if one fails
    }
  }
}

export default globalSetup;