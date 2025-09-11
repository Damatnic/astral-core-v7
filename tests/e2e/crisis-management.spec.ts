/**
 * Crisis Management E2E Tests
 * Tests critical crisis assessment and intervention flows
 */

import { test, expect } from '../setup/e2e-setup';
import { CrisisPage } from '../setup/e2e-setup';

test.describe('Crisis Management Flow', () => {
  test('should complete crisis assessment with low risk', async ({ clientPage }) => {
    const crisisPage = new CrisisPage(clientPage);
    
    await crisisPage.goto();

    // Verify crisis assessment page loads
    await expect(clientPage.locator('[data-testid="crisis-assessment-intro"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="crisis-disclaimer"]')).toContainText('emergency services');

    // Start assessment
    await crisisPage.startAssessment();

    // Complete assessment with low-risk responses
    await crisisPage.completeAssessment({
      'current-mood': '6',
      'anxiety-level': '4',
      'suicidal-thoughts': 'never',
      'harm-to-others': 'no',
      'substance-use': 'none',
      'trigger-event': 'work stress',
      'coping-strategies': 'breathing exercises, walking',
      'support-system': 'yes',
      'previous-crisis': 'no'
    });

    // Should show low risk results
    await crisisPage.expectRiskLevel('LOW');
    
    // Should provide appropriate recommendations
    const recommendations = clientPage.locator('[data-testid="recommendations-list"]');
    await expect(recommendations).toContainText('Continue with current coping strategies');
    await expect(recommendations).toContainText('Schedule regular check-ins');

    // Should show resources but not crisis hotlines prominently
    await expect(clientPage.locator('[data-testid="self-help-resources"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="crisis-hotline-priority"]')).not.toBeVisible();
  });

  test('should handle moderate risk assessment with intervention', async ({ clientPage }) => {
    const crisisPage = new CrisisPage(clientPage);
    
    await crisisPage.goto();
    await crisisPage.startAssessment();

    // Complete assessment with moderate-risk responses
    await crisisPage.completeAssessment({
      'current-mood': '3',
      'anxiety-level': '7',
      'suicidal-thoughts': 'sometimes',
      'harm-to-others': 'no',
      'substance-use': 'alcohol',
      'trigger-event': 'relationship breakdown',
      'coping-strategies': 'isolation',
      'support-system': 'limited',
      'previous-crisis': 'yes'
    });

    // Should show moderate risk results
    await crisisPage.expectRiskLevel('MODERATE');

    // Should provide intervention recommendations
    const recommendations = clientPage.locator('[data-testid="recommendations-list"]');
    await expect(recommendations).toContainText('Contact your therapist within 24 hours');
    await expect(recommendations).toContainText('Avoid being alone');
    await expect(recommendations).toContainText('Remove access to means of harm');

    // Should show crisis resources
    await crisisPage.expectRecommendations();
    await expect(clientPage.locator('[data-testid="crisis-hotline"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="safety-plan-link"]')).toBeVisible();

    // Should offer immediate support options
    await expect(clientPage.locator('[data-testid="chat-support-button"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="video-support-button"]')).toBeVisible();
  });

  test('should handle high risk assessment with immediate intervention', async ({ clientPage }) => {
    const crisisPage = new CrisisPage(clientPage);
    
    await crisisPage.goto();
    await crisisPage.startAssessment();

    // Complete assessment with high-risk responses
    await crisisPage.completeAssessment({
      'current-mood': '1',
      'anxiety-level': '9',
      'suicidal-thoughts': 'often',
      'harm-to-others': 'no',
      'substance-use': 'multiple',
      'trigger-event': 'major loss',
      'coping-strategies': 'none',
      'support-system': 'no',
      'previous-crisis': 'yes',
      'current-plan': 'yes',
      'access-to-means': 'yes'
    });

    // Should show high risk results
    await crisisPage.expectRiskLevel('HIGH');

    // Should show immediate intervention screen
    await expect(clientPage.locator('[data-testid="immediate-intervention"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="crisis-priority-message"]')).toContainText('immediate attention');

    // Crisis hotlines should be prominently displayed
    await expect(clientPage.locator('[data-testid="crisis-hotline-988"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="emergency-services-911"]')).toBeVisible();

    // Should auto-initiate support if enabled
    await expect(clientPage.locator('[data-testid="auto-connect-support"]')).toBeVisible();

    // Should restrict access to harmful content
    await expect(clientPage.locator('[data-testid="safe-mode-indicator"]')).toBeVisible();
  });

  test('should handle severe risk with emergency protocols', async ({ clientPage }) => {
    const crisisPage = new CrisisPage(clientPage);
    
    await crisisPage.goto();
    await crisisPage.startAssessment();

    // Complete assessment with severe risk responses
    await crisisPage.completeAssessment({
      'current-mood': '1',
      'anxiety-level': '10',
      'suicidal-thoughts': 'constantly',
      'harm-to-others': 'considering',
      'substance-use': 'overdose-risk',
      'trigger-event': 'multiple-stressors',
      'coping-strategies': 'harmful',
      'support-system': 'no',
      'previous-crisis': 'yes',
      'current-plan': 'detailed',
      'access-to-means': 'yes',
      'immediate-intent': 'yes'
    });

    // Should show severe risk results
    await crisisPage.expectRiskLevel('SEVERE');

    // Should trigger emergency protocols
    await expect(clientPage.locator('[data-testid="emergency-protocol"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="emergency-message"]')).toContainText('Please call 911 immediately');

    // Should show emergency contacts prominently
    await expect(clientPage.locator('[data-testid="emergency-911"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="crisis-text-line"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="suicide-prevention-lifeline"]')).toBeVisible();

    // Should prevent navigation away
    await expect(clientPage.locator('[data-testid="exit-prevention"]')).toBeVisible();

    // Should auto-notify emergency contacts if configured
    await expect(clientPage.locator('[data-testid="emergency-notification-sent"]')).toBeVisible();
  });

  test('should provide immediate crisis resources access', async ({ clientPage }) => {
    const crisisPage = new CrisisPage(clientPage);
    
    await crisisPage.goto();

    // Should show crisis resources without assessment
    await crisisPage.accessCrisisResources();

    // Verify crisis hotlines are accessible
    await expect(clientPage.locator('[data-testid="crisis-hotline"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="crisis-hotline"]')).toContainText('988');

    // Test hotline click functionality
    await clientPage.click('[data-testid="crisis-hotline-call"]');
    
    // Should open phone dialer or show confirmation
    await expect(clientPage.locator('[data-testid="call-confirmation"]')).toBeVisible();

    // Test text line access
    await clientPage.click('[data-testid="crisis-text-line"]');
    await expect(clientPage.locator('[data-testid="text-instructions"]')).toBeVisible();

    // Test online chat
    await clientPage.click('[data-testid="crisis-chat"]');
    await expect(clientPage.locator('[data-testid="chat-window"]')).toBeVisible();
  });

  test('should handle chat crisis support session', async ({ clientPage }) => {
    // Start from moderate risk assessment
    const crisisPage = new CrisisPage(clientPage);
    await crisisPage.goto();
    await crisisPage.startAssessment();

    await crisisPage.completeAssessment({
      'current-mood': '3',
      'anxiety-level': '7',
      'suicidal-thoughts': 'sometimes'
    });

    // Start chat support
    await clientPage.click('[data-testid="chat-support-button"]');

    // Should open chat interface
    await expect(clientPage.locator('[data-testid="crisis-chat-interface"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="chat-connecting"]')).toContainText('Connecting you with a crisis counselor');

    // Simulate chat connection
    await clientPage.waitForSelector('[data-testid="chat-connected"]');
    await expect(clientPage.locator('[data-testid="counselor-message"]')).toContainText('Hello, I\'m here to help');

    // Test sending messages
    await clientPage.fill('[data-testid="chat-input"]', 'I\'m having a difficult time today');
    await clientPage.click('[data-testid="send-message"]');

    await expect(clientPage.locator('[data-testid="user-message"]').last()).toContainText('difficult time');

    // Test chat features
    await expect(clientPage.locator('[data-testid="typing-indicator"]')).toBeVisible();
    
    // Test resource sharing in chat
    await expect(clientPage.locator('[data-testid="shared-resource"]')).toBeVisible();

    // Test ending chat session
    await clientPage.click('[data-testid="end-chat-button"]');
    await expect(clientPage.locator('[data-testid="chat-summary"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="follow-up-resources"]')).toBeVisible();
  });

  test('should create and manage safety plan', async ({ clientPage }) => {
    // Navigate to safety planning
    await clientPage.goto('/crisis/safety-plan');

    // Should show safety plan creation
    await expect(clientPage.locator('[data-testid="safety-plan-form"]')).toBeVisible();

    // Step 1: Warning signs
    await clientPage.fill('[data-testid="warning-signs"]', 'Feeling overwhelmed, sleep problems, isolation');
    await clientPage.click('[data-testid="next-step"]');

    // Step 2: Coping strategies
    await clientPage.fill('[data-testid="coping-strategies"]', 'Deep breathing, music, journaling');
    await clientPage.click('[data-testid="next-step"]');

    // Step 3: Support contacts
    await clientPage.fill('[data-testid="support-contact-1"]', 'Best friend - 555-0123');
    await clientPage.fill('[data-testid="support-contact-2"]', 'Sister - 555-0456');
    await clientPage.click('[data-testid="next-step"]');

    // Step 4: Professional contacts
    await clientPage.fill('[data-testid="therapist-contact"]', 'Dr. Smith - 555-0789');
    await clientPage.fill('[data-testid="doctor-contact"]', 'Dr. Johnson - 555-0321');
    await clientPage.click('[data-testid="next-step"]');

    // Step 5: Environmental safety
    await clientPage.check('[data-testid="remove-means"]');
    await clientPage.fill('[data-testid="safe-environment"]', 'Remove harmful items, stay with supportive people');
    
    // Save safety plan
    await clientPage.click('[data-testid="save-safety-plan"]');

    // Should show confirmation
    await expect(clientPage.locator('[data-testid="safety-plan-saved"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="safety-plan-access"]')).toContainText('accessible anytime');

    // Test quick access to safety plan
    await clientPage.goto('/dashboard');
    await expect(clientPage.locator('[data-testid="safety-plan-widget"]')).toBeVisible();
    
    await clientPage.click('[data-testid="quick-safety-plan"]');
    await expect(clientPage.locator('[data-testid="safety-plan-view"]')).toBeVisible();
  });

  test('should handle crisis intervention follow-up', async ({ clientPage }) => {
    // Simulate completed crisis intervention
    await clientPage.goto('/crisis/follow-up/intervention_123');

    // Should show follow-up form
    await expect(clientPage.locator('[data-testid="follow-up-form"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="intervention-summary"]')).toContainText('Crisis intervention completed');

    // Fill follow-up assessment
    await clientPage.selectOption('[data-testid="current-mood"]', '6');
    await clientPage.selectOption('[data-testid="safety-level"]', 'safe');
    await clientPage.fill('[data-testid="follow-up-notes"]', 'Feeling much better after support. Using coping strategies.');

    // Rate intervention effectiveness
    await clientPage.click('[data-testid="rating-4"]');

    // Additional support needed
    await clientPage.check('[data-testid="schedule-appointment"]');
    
    await clientPage.click('[data-testid="submit-follow-up"]');

    // Should show next steps
    await expect(clientPage.locator('[data-testid="next-steps"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="appointment-scheduled"]')).toContainText('follow-up appointment');
  });

  test('should handle crisis assessment for different user types', async ({ therapistPage }) => {
    // Test therapist initiating assessment for client
    await therapistPage.goto('/clients/client_123/crisis-assessment');

    await expect(therapistPage.locator('[data-testid="therapist-crisis-tools"]')).toBeVisible();
    
    // Should have additional assessment options
    await expect(therapistPage.locator('[data-testid="clinical-assessment"]')).toBeVisible();
    await expect(therapistPage.locator('[data-testid="risk-documentation"]')).toBeVisible();

    // Complete clinical assessment
    await therapistPage.fill('[data-testid="clinical-observations"]', 'Client shows signs of acute distress');
    await therapistPage.selectOption('[data-testid="risk-level"]', 'HIGH');
    await therapistPage.fill('[data-testid="intervention-plan"]', 'Immediate safety planning, daily check-ins');

    // Document intervention
    await therapistPage.click('[data-testid="document-intervention"]');
    
    await expect(therapistPage.locator('[data-testid="intervention-documented"]')).toBeVisible();
    await expect(therapistPage.locator('[data-testid="client-notification-sent"]')).toBeVisible();
  });

  test('should ensure crisis data privacy and security', async ({ clientPage }) => {
    const crisisPage = new CrisisPage(clientPage);
    
    await crisisPage.goto();
    
    // Should show privacy notice
    await expect(clientPage.locator('[data-testid="privacy-notice"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="confidentiality-info"]')).toContainText('confidential');

    // Complete assessment
    await crisisPage.startAssessment();
    await crisisPage.completeAssessment({
      'current-mood': '5',
      'anxiety-level': '6'
    });

    // Verify data encryption indicator
    await expect(clientPage.locator('[data-testid="secure-indicator"]')).toBeVisible();

    // Test data access controls
    await clientPage.goto('/crisis/history');
    await expect(clientPage.locator('[data-testid="crisis-history"]')).toBeVisible();
    
    // Should only show user's own data
    const assessmentEntries = clientPage.locator('[data-testid="assessment-entry"]');
    await expect(assessmentEntries).toHaveCount(1); // Only current user's assessment

    // Test data deletion capability
    await clientPage.click('[data-testid="delete-assessment"]');
    await expect(clientPage.locator('[data-testid="delete-confirmation"]')).toBeVisible();
    
    await clientPage.click('[data-testid="confirm-delete"]');
    await expect(clientPage.locator('[data-testid="assessment-deleted"]')).toBeVisible();
  });

  test('should handle crisis assessment offline capability', async ({ clientPage }) => {
    // Simulate offline state
    await clientPage.context().setOffline(true);
    
    const crisisPage = new CrisisPage(clientPage);
    await crisisPage.goto();

    // Should show offline resources
    await expect(clientPage.locator('[data-testid="offline-crisis-resources"]')).toBeVisible();
    await expect(clientPage.locator('[data-testid="emergency-numbers"]')).toBeVisible();

    // Should cache emergency contacts
    await expect(clientPage.locator('[data-testid="cached-contacts"]')).toBeVisible();

    // Should provide offline safety plan access
    await clientPage.click('[data-testid="offline-safety-plan"]');
    await expect(clientPage.locator('[data-testid="safety-plan-offline"]')).toBeVisible();

    // Test going back online
    await clientPage.context().setOffline(false);
    await clientPage.reload();

    // Should sync offline data
    await expect(clientPage.locator('[data-testid="data-sync-complete"]')).toBeVisible();
  });

  test('should handle mobile crisis interface', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const crisisPage = new CrisisPage(page);
    await crisisPage.goto();

    // Should show mobile-optimized interface
    await expect(page.locator('[data-testid="mobile-crisis-interface"]')).toBeVisible();
    
    // Emergency button should be prominent
    await expect(page.locator('[data-testid="emergency-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-button"]')).toHaveCSS('font-size', /24px|1.5rem/);

    // Quick actions should be accessible
    await expect(page.locator('[data-testid="quick-call-911"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-text-988"]')).toBeVisible();

    // Assessment should be mobile-friendly
    await crisisPage.startAssessment();
    
    // Should use mobile-appropriate input methods
    await expect(page.locator('[data-testid="mobile-slider"]')).toBeVisible();
    await expect(page.locator('[data-testid="large-buttons"]')).toBeVisible();

    // Test swipe navigation
    await page.touch.tap('[data-testid="mobile-slider"]');
    await expect(page.locator('[data-testid="slider-active"]')).toBeVisible();
  });
});