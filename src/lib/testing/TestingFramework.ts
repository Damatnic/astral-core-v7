// Comprehensive Testing Framework for Mental Health Platform
// Includes accessibility testing, performance testing, and mental health specific validations

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface TestConfig {
  accessibility: {
    enabled: boolean;
    level: 'A' | 'AA' | 'AAA';
    includeBestPractices: boolean;
    mentalHealthGuidelines: boolean;
  };
  performance: {
    enabled: boolean;
    budgets: PerformanceBudgets;
    vitalsThresholds: WebVitalsThresholds;
  };
  security: {
    enabled: boolean;
    checkHIPAACompliance: boolean;
    validateDataEncryption: boolean;
    testAuthSecurity: boolean;
  };
  mentalHealth: {
    enabled: boolean;
    validateCrisisFlow: boolean;
    testEmergencyFeatures: boolean;
    checkContentSafety: boolean;
    validatePrivacy: boolean;
  };
  integration: {
    enabled: boolean;
    testApiEndpoints: boolean;
    validateWebhooks: boolean;
    testThirdPartyServices: boolean;
  };
}

export interface TestResult {
  id: string;
  timestamp: number;
  type: TestType;
  category: TestCategory;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  impact: string;
  fix?: string;
  metadata?: Record<string, any>;
  duration: number;
}

export interface TestSuite {
  name: string;
  description: string;
  category: TestCategory;
  tests: Test[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface Test {
  name: string;
  description: string;
  category: TestCategory;
  severity: 'critical' | 'major' | 'minor' | 'info';
  timeout: number;
  retry: number;
  skip?: boolean;
  execute: () => Promise<TestResult>;
}

export type TestType = 
  | 'unit' 
  | 'integration' 
  | 'e2e' 
  | 'accessibility' 
  | 'performance' 
  | 'security' 
  | 'mental_health'
  | 'visual'
  | 'api';

export type TestCategory = 
  | 'authentication'
  | 'wellness_tracking'
  | 'journal'
  | 'crisis_intervention'
  | 'therapy_management'
  | 'privacy_compliance'
  | 'accessibility'
  | 'performance'
  | 'security'
  | 'user_experience'
  | 'data_integrity';

export interface PerformanceBudgets {
  lcp: number; // ms
  fid: number; // ms
  cls: number; // score
  fcp: number; // ms
  ttfb: number; // ms
  bundleSize: number; // KB
  imageSize: number; // KB
  requests: number;
}

export interface WebVitalsThresholds {
  good: { lcp: number; fid: number; cls: number };
  needsImprovement: { lcp: number; fid: number; cls: number };
  poor: { lcp: number; fid: number; cls: number };
}

export interface AccessibilityRule {
  id: string;
  title: string;
  description: string;
  level: 'A' | 'AA' | 'AAA';
  guideline: string;
  mentalHealthSpecific: boolean;
  test: (element?: Element) => Promise<TestResult>;
}

export interface SecurityRule {
  id: string;
  title: string;
  description: string;
  hipaaRequired: boolean;
  test: () => Promise<TestResult>;
}

export interface MentalHealthRule {
  id: string;
  title: string;
  description: string;
  category: 'crisis' | 'privacy' | 'safety' | 'content' | 'accessibility';
  test: () => Promise<TestResult>;
}

export class TestingFramework {
  private config: TestConfig;
  private results: TestResult[] = [];
  private suites: TestSuite[] = [];
  private accessibilityRules: AccessibilityRule[] = [];
  private securityRules: SecurityRule[] = [];
  private mentalHealthRules: MentalHealthRule[] = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.initializeRules();
    this.setupTestSuites();
  }

  private initializeRules(): void {
    this.setupAccessibilityRules();
    this.setupSecurityRules();
    this.setupMentalHealthRules();
  }

  private setupAccessibilityRules(): void {
    this.accessibilityRules = [
      {
        id: 'alt-text-images',
        title: 'Images have alternative text',
        description: 'All images must have descriptive alt text for screen readers',
        level: 'A',
        guideline: 'WCAG 1.1.1',
        mentalHealthSpecific: false,
        test: async (element?: Element) => {
          const images = element ? 
            element.querySelectorAll('img') : 
            document.querySelectorAll('img');
          
          let failedCount = 0;
          const failedImages: string[] = [];

          images.forEach((img, index) => {
            const alt = img.getAttribute('alt');
            const src = img.getAttribute('src');
            
            if (!alt || alt.trim() === '') {
              failedCount++;
              failedImages.push(src || `Image ${index + 1}`);
            }
          });

          return {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'accessibility',
            category: 'accessibility',
            status: failedCount === 0 ? 'passed' : 'failed',
            title: 'Images have alternative text',
            description: failedCount === 0 
              ? `All ${images.length} images have alt text`
              : `${failedCount} out of ${images.length} images missing alt text`,
            severity: 'critical',
            impact: 'Screen reader users cannot understand image content',
            fix: 'Add descriptive alt attributes to all images',
            metadata: { 
              totalImages: images.length, 
              failedImages,
              failedCount 
            },
            duration: 0
          };
        }
      },

      {
        id: 'crisis-button-accessible',
        title: 'Crisis support button is accessible',
        description: 'Emergency crisis support must be keyboard accessible and properly labeled',
        level: 'AA',
        guideline: 'WCAG 2.1.1',
        mentalHealthSpecific: true,
        test: async () => {
          const crisisButtons = document.querySelectorAll('[data-crisis], [aria-label*="crisis"], [aria-label*="emergency"]');
          const accessibilityIssues: string[] = [];

          crisisButtons.forEach((button, index) => {
            // Check if focusable
            const tabIndex = button.getAttribute('tabindex');
            const isFocusable = button.tagName === 'BUTTON' || 
                              button.tagName === 'A' || 
                              (tabIndex && parseInt(tabIndex) >= 0);
            
            if (!isFocusable) {
              accessibilityIssues.push(`Crisis button ${index + 1} is not keyboard focusable`);
            }

            // Check if properly labeled
            const ariaLabel = button.getAttribute('aria-label');
            const textContent = button.textContent?.trim();
            
            if (!ariaLabel && !textContent) {
              accessibilityIssues.push(`Crisis button ${index + 1} has no accessible label`);
            }

            // Check for proper ARIA attributes
            const role = button.getAttribute('role');
            if (button.tagName !== 'BUTTON' && role !== 'button') {
              accessibilityIssues.push(`Crisis button ${index + 1} should have role="button"`);
            }
          });

          return {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'accessibility',
            category: 'crisis_intervention',
            status: accessibilityIssues.length === 0 ? 'passed' : 'failed',
            title: 'Crisis support button accessibility',
            description: accessibilityIssues.length === 0 
              ? `All ${crisisButtons.length} crisis buttons are accessible`
              : `Found ${accessibilityIssues.length} accessibility issues`,
            severity: 'critical',
            impact: 'Users with disabilities may not be able to access crisis support',
            fix: 'Ensure crisis buttons are keyboard focusable and properly labeled',
            metadata: { 
              buttonCount: crisisButtons.length,
              issues: accessibilityIssues 
            },
            duration: 0
          };
        }
      },

      {
        id: 'color-contrast',
        title: 'Text has sufficient color contrast',
        description: 'All text must meet WCAG AA contrast requirements (4.5:1 for normal text)',
        level: 'AA',
        guideline: 'WCAG 1.4.3',
        mentalHealthSpecific: false,
        test: async () => {
          // This would require a more sophisticated color contrast calculation
          // For now, we'll check for common issues
          const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, button, a');
          const contrastIssues: string[] = [];

          textElements.forEach((element, index) => {
            const styles = getComputedStyle(element);
            const color = styles.color;
            
            // Basic check for transparent or very light text
            if (color.includes('rgba') && color.includes('0)')) {
              contrastIssues.push(`Element ${index + 1} has transparent text`);
            }
          });

          return {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'accessibility',
            category: 'accessibility',
            status: contrastIssues.length === 0 ? 'passed' : 'warning',
            title: 'Color contrast check',
            description: `Checked ${textElements.length} text elements`,
            severity: 'major',
            impact: 'Low contrast text is difficult to read',
            fix: 'Ensure all text meets WCAG AA contrast requirements',
            metadata: { 
              elementsChecked: textElements.length,
              issues: contrastIssues 
            },
            duration: 0
          };
        }
      }
    ];
  }

  private setupSecurityRules(): void {
    this.securityRules = [
      {
        id: 'https-only',
        title: 'Site uses HTTPS',
        description: 'All traffic must be encrypted for HIPAA compliance',
        hipaaRequired: true,
        test: async () => {
          const isHttps = window.location.protocol === 'https:';
          
          return {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'security',
            category: 'security',
            status: isHttps ? 'passed' : 'failed',
            title: 'HTTPS enforcement',
            description: isHttps ? 'Site is using HTTPS' : 'Site is not using HTTPS',
            severity: 'critical',
            impact: 'Unencrypted traffic violates HIPAA requirements',
            fix: 'Implement HTTPS with valid SSL certificate',
            metadata: { protocol: window.location.protocol },
            duration: 0
          };
        }
      },

      {
        id: 'csp-header',
        title: 'Content Security Policy implemented',
        description: 'CSP headers should be present to prevent XSS attacks',
        hipaaRequired: false,
        test: async () => {
          // Check for CSP meta tag or header (this would need server-side validation)
          const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
          const hasCsp = cspMeta !== null;
          
          return {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'security',
            category: 'security',
            status: hasCsp ? 'passed' : 'warning',
            title: 'Content Security Policy',
            description: hasCsp ? 'CSP meta tag found' : 'No CSP meta tag found',
            severity: 'major',
            impact: 'Missing CSP increases XSS vulnerability',
            fix: 'Implement Content-Security-Policy headers',
            metadata: { cspContent: cspMeta?.getAttribute('content') },
            duration: 0
          };
        }
      },

      {
        id: 'secure-cookies',
        title: 'Cookies use secure flags',
        description: 'All cookies should have Secure and SameSite flags',
        hipaaRequired: true,
        test: async () => {
          const cookies = document.cookie.split(';');
          const insecureCookies: string[] = [];
          
          cookies.forEach(cookie => {
            const trimmed = cookie.trim();
            if (trimmed && !trimmed.includes('Secure') && !trimmed.includes('SameSite')) {
              const cookieName = trimmed.split('=')[0];
              if (cookieName) {
                insecureCookies.push(cookieName);
              }
            }
          });

          return {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'security',
            category: 'security',
            status: insecureCookies.length === 0 ? 'passed' : 'failed',
            title: 'Cookie security',
            description: `${insecureCookies.length} insecure cookies found`,
            severity: 'major',
            impact: 'Insecure cookies can be intercepted',
            fix: 'Add Secure and SameSite flags to all cookies',
            metadata: { insecureCookies },
            duration: 0
          };
        }
      }
    ];
  }

  private setupMentalHealthRules(): void {
    this.mentalHealthRules = [
      {
        id: 'crisis-hotline-visible',
        title: 'Crisis hotline information is visible',
        description: 'Crisis support contact information must be easily accessible',
        category: 'crisis',
        test: async () => {
          const crisisNumbers = ['988', '911', '1-800-273-8255', 'crisis', 'suicide', 'emergency'];
          const pageText = document.body.textContent?.toLowerCase() || '';
          
          const foundNumbers = crisisNumbers.filter(number => 
            pageText.includes(number.toLowerCase())
          );

          return {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'mental_health',
            category: 'crisis_intervention',
            status: foundNumbers.length > 0 ? 'passed' : 'failed',
            title: 'Crisis hotline visibility',
            description: foundNumbers.length > 0 
              ? `Found crisis contact information: ${foundNumbers.join(', ')}`
              : 'No crisis contact information found',
            severity: 'critical',
            impact: 'Users in crisis may not find help quickly',
            fix: 'Add visible crisis hotline information (988, local emergency numbers)',
            metadata: { foundNumbers },
            duration: 0
          };
        }
      },

      {
        id: 'trigger-warning-content',
        title: 'Potentially triggering content has warnings',
        description: 'Content that might trigger mental health issues should have warnings',
        category: 'safety',
        test: async () => {
          const triggerWords = ['suicide', 'self-harm', 'abuse', 'trauma', 'violence'];
          const pageText = document.body.textContent?.toLowerCase() || '';
          const warningElements = document.querySelectorAll('[data-trigger-warning], .trigger-warning');
          
          const foundTriggers = triggerWords.filter(word => 
            pageText.includes(word)
          );

          const hasWarnings = warningElements.length > 0;

          return {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'mental_health',
            category: 'user_experience',
            status: foundTriggers.length === 0 || hasWarnings ? 'passed' : 'warning',
            title: 'Trigger warning implementation',
            description: foundTriggers.length > 0 
              ? `Found potentially triggering content: ${foundTriggers.join(', ')}`
              : 'No potentially triggering content detected',
            severity: 'major',
            impact: 'Triggering content without warnings can cause distress',
            fix: 'Add trigger warnings before potentially distressing content',
            metadata: { 
              triggersFound: foundTriggers, 
              warningsPresent: hasWarnings,
              warningCount: warningElements.length 
            },
            duration: 0
          };
        }
      },

      {
        id: 'privacy-notice-visible',
        title: 'Privacy notice is prominently displayed',
        description: 'Mental health apps must clearly communicate privacy practices',
        category: 'privacy',
        test: async () => {
          const privacyLinks = document.querySelectorAll('a[href*="privacy"], a[href*="hipaa"]');
          const privacyText = document.body.textContent?.toLowerCase() || '';
          const hasPrivacyMention = privacyText.includes('privacy') || 
                                  privacyText.includes('hipaa') || 
                                  privacyText.includes('confidential');

          return {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'mental_health',
            category: 'privacy_compliance',
            status: privacyLinks.length > 0 || hasPrivacyMention ? 'passed' : 'failed',
            title: 'Privacy notice visibility',
            description: `Found ${privacyLinks.length} privacy links and ${hasPrivacyMention ? 'mentions' : 'no mentions'} of privacy`,
            severity: 'critical',
            impact: 'Users need to understand how their mental health data is protected',
            fix: 'Add prominent privacy policy link and HIPAA compliance information',
            metadata: { 
              privacyLinks: privacyLinks.length,
              hasPrivacyMention
            },
            duration: 0
          };
        }
      },

      {
        id: 'offline-crisis-support',
        title: 'Offline crisis support is available',
        description: 'Critical crisis resources should work offline',
        category: 'crisis',
        test: async () => {
          // Check if service worker is registered and crisis resources are cached
          const hasServiceWorker = 'serviceWorker' in navigator;
          let crisisResourcesCached = false;

          if (hasServiceWorker) {
            try {
              await navigator.serviceWorker.ready;
              const cache = await caches.open('astral-core-v7');
              const cachedUrls = await cache.keys();
              
              crisisResourcesCached = cachedUrls.some(request => 
                request.url.includes('emergency') || 
                request.url.includes('crisis')
              );
            } catch {
              // Service worker might not be available
            }
          }

          return {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'mental_health',
            category: 'crisis_intervention',
            status: hasServiceWorker && crisisResourcesCached ? 'passed' : 'warning',
            title: 'Offline crisis support',
            description: hasServiceWorker 
              ? (crisisResourcesCached ? 'Crisis resources are cached for offline use' : 'Crisis resources not cached')
              : 'Service worker not available',
            severity: 'major',
            impact: 'Users may not access crisis support when offline',
            fix: 'Implement service worker caching for crisis resources',
            metadata: { 
              hasServiceWorker,
              crisisResourcesCached
            },
            duration: 0
          };
        }
      }
    ];
  }

  private setupTestSuites(): void {
    if (this.config.accessibility.enabled) {
      this.suites.push({
        name: 'Accessibility Tests',
        description: 'WCAG compliance and mental health accessibility testing',
        category: 'accessibility',
        tests: this.accessibilityRules.map(rule => ({
          name: rule.id,
          description: rule.description,
          category: 'accessibility',
          severity: rule.mentalHealthSpecific ? 'critical' : 'major',
          timeout: 5000,
          retry: 1,
          execute: rule.test
        }))
      });
    }

    if (this.config.security.enabled) {
      this.suites.push({
        name: 'Security Tests',
        description: 'Security and HIPAA compliance testing',
        category: 'security',
        tests: this.securityRules.map(rule => ({
          name: rule.id,
          description: rule.description,
          category: 'security',
          severity: rule.hipaaRequired ? 'critical' : 'major',
          timeout: 3000,
          retry: 1,
          execute: rule.test
        }))
      });
    }

    if (this.config.mentalHealth.enabled) {
      this.suites.push({
        name: 'Mental Health Specific Tests',
        description: 'Mental health platform specific validations',
        category: 'crisis_intervention',
        tests: this.mentalHealthRules.map(rule => ({
          name: rule.id,
          description: rule.description,
          category: rule.category as TestCategory,
          severity: rule.category === 'crisis' ? 'critical' : 'major',
          timeout: 5000,
          retry: 1,
          execute: rule.test
        }))
      });
    }
  }

  // Main test execution
  public async runAllTests(): Promise<TestResult[]> {
    this.results = [];
    console.log('Starting comprehensive testing framework...');

    for (const suite of this.suites) {
      await this.runTestSuite(suite);
    }

    return this.results;
  }

  public async runTestSuite(suite: TestSuite): Promise<TestResult[]> {
    console.log(`Running test suite: ${suite.name}`);
    const suiteResults: TestResult[] = [];

    if (suite.setup) {
      await suite.setup();
    }

    for (const test of suite.tests) {
      if (test.skip) {
        const skippedResult: TestResult = {
          id: this.generateId(),
          timestamp: Date.now(),
          type: 'accessibility',
          category: test.category,
          status: 'skipped',
          title: test.name,
          description: `Test skipped: ${test.description}`,
          severity: test.severity,
          impact: 'Test was skipped',
          duration: 0
        };
        suiteResults.push(skippedResult);
        continue;
      }

      await this.runSingleTest(test, suiteResults);
    }

    if (suite.teardown) {
      await suite.teardown();
    }

    this.results.push(...suiteResults);
    return suiteResults;
  }

  private async runSingleTest(test: Test, results: TestResult[]): Promise<void> {
    const startTime = performance.now();
    let attempts = 0;

    while (attempts <= test.retry) {
      try {
        const result = await Promise.race([
          test.execute(),
          this.createTimeoutPromise(test.timeout)
        ]);
        
        result.duration = performance.now() - startTime;
        results.push(result);
        return;
      } catch (error) {
        attempts++;
        
        if (attempts > test.retry) {
          const failedResult: TestResult = {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'accessibility',
            category: test.category,
            status: 'failed',
            title: test.name,
            description: `Test failed: ${error}`,
            severity: test.severity,
            impact: 'Test execution failed',
            fix: 'Check test implementation and dependencies',
            metadata: { error: String(error), attempts },
            duration: performance.now() - startTime
          };
          results.push(failedResult);
        }
      }
    }
  }

  private createTimeoutPromise(timeout: number): Promise<TestResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  // Performance testing
  public async runPerformanceTests(): Promise<TestResult[]> {
    if (!this.config.performance.enabled) return [];

    const performanceResults: TestResult[] = [];

    // Web Vitals test
    if ('PerformanceObserver' in window) {
      const vitalsResult = await this.testWebVitals();
      performanceResults.push(vitalsResult);
    }

    // Bundle size test
    const bundleSizeResult = await this.testBundleSize();
    performanceResults.push(bundleSizeResult);

    // Critical resource loading test
    const criticalResourcesResult = await this.testCriticalResources();
    performanceResults.push(criticalResourcesResult);

    return performanceResults;
  }

  private async testWebVitals(): Promise<TestResult> {
    return new Promise((resolve) => {
      let lcp: number | null = null;
      let fid: number | null = null;
      let cls: number = 0;

      const checkAndResolveVitals = () => {
        const thresholds = this.config.performance.vitalsThresholds;
        const issues: string[] = [];

        if (lcp !== null && lcp > thresholds.poor.lcp) {
          issues.push(`LCP (${lcp}ms) exceeds threshold`);
        }
        if (fid !== null && fid > thresholds.poor.fid) {
          issues.push(`FID (${fid}ms) exceeds threshold`);
        }
        if (cls > thresholds.poor.cls) {
          issues.push(`CLS (${cls}) exceeds threshold`);
        }

        if (lcp !== null || fid !== null || cls > 0) {
          resolve({
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'performance',
            category: 'performance',
            status: issues.length === 0 ? 'passed' : 'failed',
            title: 'Web Vitals Performance',
            description: issues.length === 0 ? 'All Web Vitals within thresholds' : issues.join(', '),
            severity: 'major',
            impact: 'Poor Web Vitals impact user experience and SEO',
            fix: 'Optimize LCP, FID, and CLS metrics',
            metadata: {
              lcp: lcp || 0,
              fid: fid || 0,
              cls,
              thresholds
            },
            duration: 0
          });
        }
      };

      // LCP Observer
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            lcp = lastEntry.startTime;
            checkAndResolveVitals();
          }
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // FID Observer
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const firstEntry = entries[0];
          if (firstEntry) {
            fid = (firstEntry as any).processingStart - firstEntry.startTime;
            checkAndResolveVitals();
          }
        }
      }).observe({ entryTypes: ['first-input'] });

      // CLS Observer
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            cls += (entry as any).value;
          }
        }
        checkAndResolveVitals();
      }).observe({ entryTypes: ['layout-shift'] });

      // Fallback timeout
      setTimeout(checkAndResolveVitals, 10000);
    });
  }

  private async testBundleSize(): Promise<TestResult> {
    // This would typically be checked at build time
    // For runtime, we can estimate based on loaded resources
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    let totalJSSize = 0;
    let totalCSSSize = 0;
    
    resources.forEach(resource => {
      const size = resource.transferSize || 0;
      if (resource.name.includes('.js')) {
        totalJSSize += size;
      } else if (resource.name.includes('.css')) {
        totalCSSSize += size;
      }
    });

    const budget = this.config.performance.budgets;
    const jsExceedsBudget = totalJSSize > budget.bundleSize * 1024;
    const cssExceedsBudget = totalCSSSize > budget.bundleSize * 0.2 * 1024;

    return {
      id: this.generateId(),
      timestamp: Date.now(),
      type: 'performance',
      category: 'performance',
      status: !jsExceedsBudget && !cssExceedsBudget ? 'passed' : 'failed',
      title: 'Bundle Size Budget',
      description: `JS: ${Math.round(totalJSSize / 1024)}KB, CSS: ${Math.round(totalCSSSize / 1024)}KB`,
      severity: 'major',
      impact: 'Large bundles slow down initial page load',
      fix: 'Implement code splitting and remove unused dependencies',
      metadata: { 
        totalJSSize: Math.round(totalJSSize / 1024),
        totalCSSSize: Math.round(totalCSSSize / 1024),
        budget: budget.bundleSize
      },
      duration: 0
    };
  }

  private async testCriticalResources(): Promise<TestResult> {
    const criticalResources = [
      '/emergency',
      '/crisis-support',
      '/api/emergency'
    ];

    const loadTimes: Record<string, number> = {};
    const failures: string[] = [];

    for (const resource of criticalResources) {
      try {
        const startTime = performance.now();
        const response = await fetch(resource, { method: 'HEAD' });
        const endTime = performance.now();
        
        if (response.ok) {
          loadTimes[resource] = endTime - startTime;
        } else {
          failures.push(`${resource} returned ${response.status}`);
        }
      } catch {
        failures.push(`${resource} failed to load`);
      }
    }

    const avgLoadTime = Object.values(loadTimes).reduce((a, b) => a + b, 0) / Object.values(loadTimes).length;

    return {
      id: this.generateId(),
      timestamp: Date.now(),
      type: 'performance',
      category: 'crisis_intervention',
      status: failures.length === 0 && avgLoadTime < 1000 ? 'passed' : 'failed',
      title: 'Critical Resources Performance',
      description: failures.length === 0 
        ? `Average load time: ${Math.round(avgLoadTime)}ms`
        : `${failures.length} critical resources failed`,
      severity: 'critical',
      impact: 'Slow critical resources delay crisis support access',
      fix: 'Optimize critical resource loading and implement caching',
      metadata: { loadTimes, failures, avgLoadTime },
      duration: 0
    };
  }

  // Reporting
  public generateReport(): {
    summary: any;
    results: TestResult[];
    recommendations: string[];
  } {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
      skipped: this.results.filter(r => r.status === 'skipped').length,
      critical: this.results.filter(r => r.severity === 'critical').length,
      categories: this.summarizeByCategory()
    };

    const recommendations = this.generateRecommendations();

    return {
      summary,
      results: this.results,
      recommendations
    };
  }

  private summarizeByCategory(): Record<string, any> {
    const categories: Record<string, any> = {};
    
    this.results.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = {
          total: 0,
          passed: 0,
          failed: 0,
          warnings: 0
        };
      }
      
      categories[result.category].total++;
      categories[result.category][result.status]++;
    });

    return categories;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedResults = this.results.filter(r => r.status === 'failed');
    
    // Prioritize critical mental health issues
    const criticalMentalHealth = failedResults.filter(r => 
      r.category === 'crisis_intervention' && r.severity === 'critical'
    );
    
    if (criticalMentalHealth.length > 0) {
      recommendations.push('URGENT: Fix critical crisis intervention issues immediately');
    }

    // Accessibility recommendations
    const accessibilityIssues = failedResults.filter(r => r.category === 'accessibility');
    if (accessibilityIssues.length > 0) {
      recommendations.push(`Address ${accessibilityIssues.length} accessibility issues for WCAG compliance`);
    }

    // Security recommendations
    const securityIssues = failedResults.filter(r => r.category === 'security');
    if (securityIssues.length > 0) {
      recommendations.push(`Fix ${securityIssues.length} security issues for HIPAA compliance`);
    }

    // Performance recommendations
    const performanceIssues = failedResults.filter(r => r.category === 'performance');
    if (performanceIssues.length > 0) {
      recommendations.push(`Optimize performance: ${performanceIssues.length} issues found`);
    }

    return recommendations;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  public destroy(): void {
    this.results = [];
    this.suites = [];
  }
}