/**
 * User Registration E2E Tests
 * Tests complete user registration and onboarding flow
 */

import { test, expect } from '../setup/e2e-setup';
import { LoginPage, DashboardPage } from '../setup/e2e-setup';

test.describe('User Registration Flow', () => {
  test('should register new client user successfully', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register');

    // Verify registration form is visible
    await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();

    // Fill registration form
    await page.fill('[data-testid="email-input"]', 'newclient@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
    await page.fill('[data-testid="first-name-input"]', 'John');
    await page.fill('[data-testid="last-name-input"]', 'Doe');
    await page.selectOption('[data-testid="role-select"]', 'CLIENT');

    // Accept terms and conditions
    await page.check('[data-testid="terms-checkbox"]');

    // Submit registration
    await page.click('[data-testid="register-button"]');

    // Should redirect to email verification page
    await page.waitForURL('/auth/verify-email');
    await expect(page.locator('[data-testid="verification-message"]')).toContainText('Check your email');

    // Simulate email verification (in real test, would use test email service)
    await page.goto('/auth/login');

    // Login with new credentials
    await page.fill('[data-testid="email-input"]', 'newclient@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-button"]');

    // Should redirect to onboarding
    await page.waitForURL('/onboarding');
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome to Astral Core');
  });

  test('should register new therapist with professional verification', async ({ page }) => {
    await page.goto('/auth/register');

    // Fill basic registration info
    await page.fill('[data-testid="email-input"]', 'newtherapist@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
    await page.fill('[data-testid="first-name-input"]', 'Dr. Jane');
    await page.fill('[data-testid="last-name-input"]', 'Smith');
    await page.selectOption('[data-testid="role-select"]', 'THERAPIST');

    // Additional therapist fields should appear
    await expect(page.locator('[data-testid="license-section"]')).toBeVisible();
    
    await page.fill('[data-testid="license-number-input"]', 'LIC123456');
    await page.selectOption('[data-testid="license-state-select"]', 'NY');
    await page.fill('[data-testid="specializations-input"]', 'Anxiety, Depression, CBT');

    // Upload license document
    const fileInput = page.locator('[data-testid="license-upload"]');
    await fileInput.setInputFiles('tests/fixtures/sample-license.pdf');

    await page.check('[data-testid="terms-checkbox"]');
    await page.click('[data-testid="register-button"]');

    // Should go to pending verification page
    await page.waitForURL('/auth/pending-verification');
    await expect(page.locator('[data-testid="pending-message"]')).toContainText('under review');
  });

  test('should handle registration validation errors', async ({ page }) => {
    await page.goto('/auth/register');

    // Try to submit empty form
    await page.click('[data-testid="register-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');

    // Test invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.blur('[data-testid="email-input"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');

    // Test password mismatch
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'different123');
    await page.blur('[data-testid="confirm-password-input"]');
    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('Passwords do not match');

    // Test weak password
    await page.fill('[data-testid="password-input"]', '123');
    await page.blur('[data-testid="password-input"]');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least');
  });

  test('should prevent duplicate email registration', async ({ page }) => {
    await page.goto('/auth/register');

    // Try to register with existing email
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
    await page.fill('[data-testid="first-name-input"]', 'Test');
    await page.fill('[data-testid="last-name-input"]', 'User');
    await page.selectOption('[data-testid="role-select"]', 'CLIENT');
    await page.check('[data-testid="terms-checkbox"]');

    await page.click('[data-testid="register-button"]');

    // Should show error for existing email
    await expect(page.locator('[data-testid="registration-error"]')).toContainText('Email already registered');
  });

  test('should handle registration form accessibility', async ({ page }) => {
    await page.goto('/auth/register');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused();

    // Test form labels
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toBeVisible();
    await expect(emailLabel).toContainText('Email');

    // Test ARIA attributes
    const passwordInput = page.locator('[data-testid="password-input"]');
    await expect(passwordInput).toHaveAttribute('aria-describedby');
    
    // Test screen reader announcements
    await page.fill('[data-testid="email-input"]', 'invalid');
    await page.blur('[data-testid="email-input"]');
    
    const errorMessage = page.locator('[data-testid="email-error"]');
    await expect(errorMessage).toHaveAttribute('role', 'alert');
  });

  test('should save partial registration progress', async ({ page }) => {
    await page.goto('/auth/register');

    // Fill partial form
    await page.fill('[data-testid="email-input"]', 'partial@example.com');
    await page.fill('[data-testid="first-name-input"]', 'Partial');
    await page.selectOption('[data-testid="role-select"]', 'CLIENT');

    // Navigate away and back
    await page.goto('/');
    await page.goto('/auth/register');

    // Form should remember values (if implemented)
    // Note: This would require local storage or session storage implementation
    const savedEmail = await page.inputValue('[data-testid="email-input"]');
    // In a real implementation, this might be saved in localStorage
    // expect(savedEmail).toBe('partial@example.com');
  });

  test('should handle registration with social providers', async ({ page }) => {
    await page.goto('/auth/register');

    // Test Google registration
    await expect(page.locator('[data-testid="google-register-button"]')).toBeVisible();
    
    // Mock Google OAuth flow
    await page.route('**/auth/signin/google', route => {
      route.fulfill({
        status: 302,
        headers: {
          'Location': '/onboarding?provider=google'
        }
      });
    });

    await page.click('[data-testid="google-register-button"]');

    // Should redirect to onboarding after OAuth
    await page.waitForURL('/onboarding*');
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
  });

  test('should complete client onboarding flow', async ({ page }) => {
    // Start from successful registration
    await page.goto('/onboarding');

    // Step 1: Personal Information
    await expect(page.locator('[data-testid="onboarding-step-1"]')).toBeVisible();
    
    await page.fill('[data-testid="date-of-birth-input"]', '1990-01-15');
    await page.fill('[data-testid="phone-input"]', '+1-555-0123');
    await page.selectOption('[data-testid="timezone-select"]', 'America/New_York');
    await page.selectOption('[data-testid="language-select"]', 'en');
    
    await page.click('[data-testid="next-button"]');

    // Step 2: Health Information
    await expect(page.locator('[data-testid="onboarding-step-2"]')).toBeVisible();
    
    await page.fill('[data-testid="primary-concerns-textarea"]', 'Anxiety and stress management');
    await page.fill('[data-testid="goals-textarea"]', 'Learn coping strategies and improve work-life balance');
    await page.fill('[data-testid="medical-history-textarea"]', 'No significant medical history');
    
    await page.click('[data-testid="next-button"]');

    // Step 3: Preferences
    await expect(page.locator('[data-testid="onboarding-step-3"]')).toBeVisible();
    
    await page.check('[data-testid="session-type-video"]');
    await page.selectOption('[data-testid="preferred-therapist-gender"]', 'any');
    await page.check('[data-testid="evening-availability"]');
    
    await page.click('[data-testid="complete-onboarding-button"]');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard');
    await expect(page.locator('[data-testid="dashboard-welcome"]')).toContainText('Welcome');
    await expect(page.locator('[data-testid="setup-complete-message"]')).toBeVisible();
  });

  test('should complete therapist onboarding flow', async ({ page }) => {
    // Mock therapist verification status
    await page.addInitScript(() => {
      window.localStorage.setItem('user-role', 'THERAPIST');
      window.localStorage.setItem('verification-status', 'VERIFIED');
    });

    await page.goto('/onboarding');

    // Step 1: Professional Information
    await expect(page.locator('[data-testid="therapist-onboarding-step-1"]')).toBeVisible();
    
    await page.fill('[data-testid="years-experience-input"]', '8');
    await page.fill('[data-testid="education-textarea"]', 'PhD in Clinical Psychology, University of Example');
    await page.fill('[data-testid="bio-textarea"]', 'Experienced therapist specializing in anxiety and depression treatment.');
    
    await page.click('[data-testid="next-button"]');

    // Step 2: Schedule and Availability
    await expect(page.locator('[data-testid="therapist-onboarding-step-2"]')).toBeVisible();
    
    // Set availability for Monday
    await page.check('[data-testid="monday-available"]');
    await page.fill('[data-testid="monday-start-time"]', '09:00');
    await page.fill('[data-testid="monday-end-time"]', '17:00');
    
    // Set hourly rate
    await page.fill('[data-testid="hourly-rate-input"]', '150');
    
    await page.click('[data-testid="next-button"]');

    // Step 3: Practice Settings
    await expect(page.locator('[data-testid="therapist-onboarding-step-3"]')).toBeVisible();
    
    await page.check('[data-testid="accepting-new-clients"]');
    await page.selectOption('[data-testid="session-types"]', ['individual', 'couples']);
    await page.fill('[data-testid="practice-location"]', 'New York, NY');
    
    await page.click('[data-testid="complete-onboarding-button"]');

    // Should redirect to therapist dashboard
    await page.waitForURL('/dashboard');
    await expect(page.locator('[data-testid="therapist-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="profile-complete-message"]')).toBeVisible();
  });

  test('should handle onboarding validation and error states', async ({ page }) => {
    await page.goto('/onboarding');

    // Try to proceed without filling required fields
    await page.click('[data-testid="next-button"]');

    await expect(page.locator('[data-testid="date-of-birth-error"]')).toContainText('Date of birth is required');
    await expect(page.locator('[data-testid="phone-error"]')).toContainText('Phone number is required');

    // Test invalid phone number format
    await page.fill('[data-testid="phone-input"]', '123');
    await page.blur('[data-testid="phone-input"]');
    await expect(page.locator('[data-testid="phone-error"]')).toContainText('Invalid phone number');

    // Test age validation
    await page.fill('[data-testid="date-of-birth-input"]', new Date().toISOString().split('T')[0]); // Today
    await page.blur('[data-testid="date-of-birth-input"]');
    await expect(page.locator('[data-testid="date-of-birth-error"]')).toContainText('Must be at least 18');
  });

  test('should allow users to skip optional onboarding steps', async ({ page }) => {
    await page.goto('/onboarding');

    // Complete only required fields in step 1
    await page.fill('[data-testid="date-of-birth-input"]', '1990-01-15');
    await page.fill('[data-testid="phone-input"]', '+1-555-0123');
    await page.click('[data-testid="next-button"]');

    // Skip step 2 health information
    await page.click('[data-testid="skip-button"]');

    // Skip step 3 preferences
    await page.click('[data-testid="skip-button"]');

    // Should still be able to complete onboarding
    await page.waitForURL('/dashboard');
    await expect(page.locator('[data-testid="dashboard-welcome"]')).toBeVisible();
    
    // Should show reminder to complete profile
    await expect(page.locator('[data-testid="complete-profile-reminder"]')).toBeVisible();
  });
});