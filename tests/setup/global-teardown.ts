/**
 * Global Test Teardown for Playwright E2E Tests
 * Cleans up test environment and resources
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('Starting global teardown...');
  
  // Clean up authentication state files
  const authStatesDir = 'tests/auth-states';
  if (fs.existsSync(authStatesDir)) {
    const files = fs.readdirSync(authStatesDir);
    files.forEach(file => {
      if (file.endsWith('-auth.json')) {
        const filePath = path.join(authStatesDir, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up auth state: ${file}`);
        } catch (error) {
          console.warn(`Failed to clean up auth state ${file}:`, error);
        }
      }
    });
  }
  
  // Clean up test screenshots
  const screenshotsDir = 'tests/screenshots';
  if (fs.existsSync(screenshotsDir)) {
    const files = fs.readdirSync(screenshotsDir);
    files.forEach(file => {
      if (file.endsWith('.png')) {
        const filePath = path.join(screenshotsDir, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up screenshot: ${file}`);
        } catch (error) {
          console.warn(`Failed to clean up screenshot ${file}:`, error);
        }
      }
    });
  }
  
  // Clean up test artifacts
  const testResultsDir = 'test-results';
  if (fs.existsSync(testResultsDir)) {
    try {
      // Keep recent test results but clean up old ones
      const files = fs.readdirSync(testResultsDir);
      const oldFiles = files.filter(file => {
        const filePath = path.join(testResultsDir, file);
        const stats = fs.statSync(filePath);
        const dayInMs = 24 * 60 * 60 * 1000;
        return Date.now() - stats.mtime.getTime() > dayInMs;
      });
      
      oldFiles.forEach(file => {
        const filePath = path.join(testResultsDir, file);
        try {
          if (fs.statSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
          console.log(`Cleaned up old test result: ${file}`);
        } catch (error) {
          console.warn(`Failed to clean up test result ${file}:`, error);
        }
      });
    } catch (error) {
      console.warn('Failed to clean up test results directory:', error);
    }
  }
  
  // Reset environment variables
  delete process.env.NODE_ENV;
  delete process.env.NEXTAUTH_SECRET;
  delete process.env.DATABASE_URL;
  
  console.log('Global teardown completed');
}

export default globalTeardown;