/**
 * E2E Test Setup and Configuration
 * Configures Playwright for end-to-end testing of user journeys
 */

import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { setupTestEnvironment } from '../utils/test-helpers';
import { mockUsers } from '../utils/test-fixtures';

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  therapistPage: Page;
  adminPage: Page;
  clientPage: Page;
}>({
  // Authenticated page fixture for general testing
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Set up authentication
    await authenticateUser(page, mockUsers.client);
    
    await use(page);
    await context.close();
  },

  // Therapist-specific page fixture
  therapistPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await authenticateUser(page, mockUsers.therapist);
    
    await use(page);
    await context.close();
  },

  // Admin page fixture
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await authenticateUser(page, mockUsers.admin);
    
    await use(page);
    await context.close();
  },

  // Client page fixture
  clientPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await authenticateUser(page, mockUsers.client);
    
    await use(page);
    await context.close();
  }
});

// Authentication helper
async function authenticateUser(page: Page, user: any) {
  setupTestEnvironment();
  
  // Navigate to login page
  await page.goto('/auth/login');
  
  // Fill login form
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', 'password123');
  
  // Submit form
  await page.click('[data-testid="login-button"]');
  
  // Wait for dashboard redirect
  await page.waitForURL('/dashboard');
  
  // Verify authentication
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

// Page Object Models for common pages
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/auth/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
  }

  async expectError(message: string) {
    await expect(this.page.locator('[data-testid="error-message"]')).toContainText(message);
  }

  async expectSuccess() {
    await this.page.waitForURL('/dashboard');
  }
}

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
  }

  async expectWelcomeMessage(name: string) {
    await expect(this.page.locator('[data-testid="welcome-message"]')).toContainText(name);
  }

  async navigateToAppointments() {
    await this.page.click('[data-testid="appointments-nav"]');
    await this.page.waitForURL('/appointments');
  }

  async navigateToPayments() {
    await this.page.click('[data-testid="billing-nav"]');
    await this.page.waitForURL('/billing');
  }

  async navigateToJournal() {
    await this.page.click('[data-testid="journal-nav"]');
    await this.page.waitForURL('/journal');
  }
}

export class AppointmentsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/appointments');
  }

  async scheduleAppointment(therapistName: string, date: string, time: string) {
    await this.page.click('[data-testid="schedule-appointment-button"]');
    await this.page.selectOption('[data-testid="therapist-select"]', therapistName);
    await this.page.fill('[data-testid="date-input"]', date);
    await this.page.fill('[data-testid="time-input"]', time);
    await this.page.click('[data-testid="confirm-appointment-button"]');
  }

  async expectAppointmentListed(therapistName: string, date: string) {
    const appointmentRow = this.page.locator('[data-testid="appointment-row"]')
      .filter({ hasText: therapistName })
      .filter({ hasText: date });
    await expect(appointmentRow).toBeVisible();
  }

  async cancelAppointment(appointmentId: string) {
    await this.page.click(`[data-testid="cancel-appointment-${appointmentId}"]`);
    await this.page.click('[data-testid="confirm-cancel-button"]');
  }
}

export class PaymentsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/billing');
  }

  async addPaymentMethod(cardNumber: string, expiry: string, cvc: string) {
    await this.page.click('[data-testid="add-payment-method-button"]');
    
    // Wait for Stripe iframe to load
    const stripeFrame = this.page.frameLocator('[data-testid="stripe-card-element"] iframe');
    await stripeFrame.fill('[name="cardnumber"]', cardNumber);
    await stripeFrame.fill('[name="exp-date"]', expiry);
    await stripeFrame.fill('[name="cvc"]', cvc);
    
    await this.page.click('[data-testid="save-payment-method-button"]');
  }

  async expectPaymentMethodSaved() {
    await expect(this.page.locator('[data-testid="payment-method-list"]')).toContainText('****');
  }

  async makePayment(amount: string) {
    await this.page.fill('[data-testid="payment-amount-input"]', amount);
    await this.page.click('[data-testid="make-payment-button"]');
    await this.page.click('[data-testid="confirm-payment-button"]');
  }

  async expectPaymentSuccess() {
    await expect(this.page.locator('[data-testid="payment-success-message"]')).toBeVisible();
  }
}

export class CrisisPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/crisis');
  }

  async startAssessment() {
    await this.page.click('[data-testid="start-assessment-button"]');
  }

  async completeAssessment(responses: Record<string, string | number>) {
    for (const [question, answer] of Object.entries(responses)) {
      if (typeof answer === 'number') {
        await this.page.selectOption(`[data-testid="${question}-select"]`, answer.toString());
      } else {
        await this.page.fill(`[data-testid="${question}-input"]`, answer);
      }
    }
    await this.page.click('[data-testid="submit-assessment-button"]');
  }

  async expectRiskLevel(level: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE') {
    await expect(this.page.locator('[data-testid="risk-level"]')).toContainText(level);
  }

  async expectRecommendations() {
    await expect(this.page.locator('[data-testid="recommendations-list"]')).toBeVisible();
  }

  async accessCrisisResources() {
    await this.page.click('[data-testid="crisis-resources-button"]');
    await expect(this.page.locator('[data-testid="crisis-hotline"]')).toBeVisible();
  }
}

export class JournalPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/journal');
  }

  async createEntry(title: string, content: string, mood: number) {
    await this.page.click('[data-testid="new-entry-button"]');
    await this.page.fill('[data-testid="entry-title-input"]', title);
    await this.page.fill('[data-testid="entry-content-textarea"]', content);
    await this.page.selectOption('[data-testid="mood-select"]', mood.toString());
    await this.page.click('[data-testid="save-entry-button"]');
  }

  async expectEntryCreated(title: string) {
    await expect(this.page.locator('[data-testid="journal-entries"]')).toContainText(title);
  }

  async editEntry(entryId: string, newContent: string) {
    await this.page.click(`[data-testid="edit-entry-${entryId}"]`);
    await this.page.fill('[data-testid="entry-content-textarea"]', newContent);
    await this.page.click('[data-testid="save-entry-button"]');
  }

  async deleteEntry(entryId: string) {
    await this.page.click(`[data-testid="delete-entry-${entryId}"]`);
    await this.page.click('[data-testid="confirm-delete-button"]');
  }
}

// E2E test utilities
export const e2eUtils = {
  // Wait for network idle
  waitForNetworkIdle: async (page: Page, timeout = 5000) => {
    await page.waitForLoadState('networkidle', { timeout });
  },

  // Take screenshot for debugging
  takeScreenshot: async (page: Page, name: string) => {
    await page.screenshot({ path: `tests/screenshots/${name}.png` });
  },

  // Mock API responses
  mockAPI: async (page: Page, url: string, response: any) => {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  },

  // Mock API error
  mockAPIError: async (page: Page, url: string, status = 500) => {
    await page.route(url, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Test error' })
      });
    });
  },

  // Wait for element with timeout
  waitForElement: async (page: Page, selector: string, timeout = 10000) => {
    await page.waitForSelector(selector, { timeout });
  },

  // Fill form with data
  fillForm: async (page: Page, formData: Record<string, string>) => {
    for (const [field, value] of Object.entries(formData)) {
      await page.fill(`[data-testid="${field}"]`, value);
    }
  },

  // Verify URL contains path
  expectURL: async (page: Page, path: string) => {
    await expect(page).toHaveURL(new RegExp(path));
  },

  // Verify page title
  expectTitle: async (page: Page, title: string) => {
    await expect(page).toHaveTitle(title);
  }
};

// Global E2E test setup
export const setupE2ETests = () => {
  setupTestEnvironment();
  
  // Configure test timeout
  test.setTimeout(30000);
  
  // Set up global beforeEach
  test.beforeEach(async ({ page }) => {
    // Set up global error handling
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Page error:', msg.text());
      }
    });
    
    // Set up request/response logging for debugging
    page.on('request', request => {
      if (process.env.DEBUG_E2E) {
        console.log('Request:', request.method(), request.url());
      }
    });
    
    page.on('response', response => {
      if (process.env.DEBUG_E2E && !response.ok()) {
        console.log('Failed response:', response.status(), response.url());
      }
    });
  });
};

export { expect };