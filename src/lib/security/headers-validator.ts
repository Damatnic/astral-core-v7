/**
 * Security Headers Validation
 * Validates that all required security headers are properly configured
 */

export interface SecurityHeadersConfig {
  'Content-Security-Policy'?: string;
  'Strict-Transport-Security'?: string;
  'X-Frame-Options'?: string;
  'X-Content-Type-Options'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
  'X-XSS-Protection'?: string;
}

export interface SecurityHeaderValidationResult {
  isValid: boolean;
  missingHeaders: string[];
  weakHeaders: string[];
  recommendations: string[];
}

const REQUIRED_HEADERS = [
  'Content-Security-Policy',
  'Strict-Transport-Security',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Referrer-Policy'
] as const;

const RECOMMENDED_HEADERS = [
  'Permissions-Policy',
  'X-XSS-Protection'
] as const;

/**
 * Validate security headers configuration
 */
export function validateSecurityHeaders(headers: SecurityHeadersConfig): SecurityHeaderValidationResult {
  const result: SecurityHeaderValidationResult = {
    isValid: true,
    missingHeaders: [],
    weakHeaders: [],
    recommendations: []
  };

  // Check required headers
  for (const header of REQUIRED_HEADERS) {
    if (!headers[header]) {
      result.missingHeaders.push(header);
      result.isValid = false;
    }
  }

  // Check recommended headers
  for (const header of RECOMMENDED_HEADERS) {
    if (!headers[header]) {
      result.recommendations.push(`Consider adding ${header} header`);
    }
  }

  // Validate specific header configurations
  if (headers['Content-Security-Policy']) {
    const cspIssues = validateCSP(headers['Content-Security-Policy']);
    if (cspIssues.length > 0) {
      result.weakHeaders.push('Content-Security-Policy');
      result.recommendations.push(...cspIssues);
    }
  }

  if (headers['Strict-Transport-Security']) {
    const hstsIssues = validateHSTS(headers['Strict-Transport-Security']);
    if (hstsIssues.length > 0) {
      result.weakHeaders.push('Strict-Transport-Security');
      result.recommendations.push(...hstsIssues);
    }
  }

  if (headers['X-Frame-Options']) {
    const frameIssues = validateFrameOptions(headers['X-Frame-Options']);
    if (frameIssues.length > 0) {
      result.weakHeaders.push('X-Frame-Options');
      result.recommendations.push(...frameIssues);
    }
  }

  return result;
}

/**
 * Validate Content Security Policy
 */
function validateCSP(csp: string): string[] {
  const issues: string[] = [];
  const directives = csp.toLowerCase();

  // Check for unsafe directives
  if (directives.includes("'unsafe-inline'")) {
    issues.push("CSP contains 'unsafe-inline' which reduces security");
  }

  if (directives.includes("'unsafe-eval'")) {
    issues.push("CSP contains 'unsafe-eval' which reduces security");
  }

  if (directives.includes('*')) {
    issues.push("CSP contains wildcard (*) which reduces security");
  }

  // Check for required directives
  if (!directives.includes('default-src')) {
    issues.push("CSP should include 'default-src' directive");
  }

  if (!directives.includes('script-src')) {
    issues.push("CSP should include 'script-src' directive for healthcare apps");
  }

  if (!directives.includes('img-src')) {
    issues.push("CSP should include 'img-src' directive");
  }

  return issues;
}

/**
 * Validate HTTP Strict Transport Security
 */
function validateHSTS(hsts: string): string[] {
  const issues: string[] = [];

  // Extract max-age value
  const maxAgeMatch = hsts.match(/max-age=(\d+)/);
  if (!maxAgeMatch) {
    issues.push("HSTS header must include max-age directive");
    return issues;
  }

  const maxAge = parseInt(maxAgeMatch[1]);
  const sixMonthsInSeconds = 15552000; // 6 months

  if (maxAge < sixMonthsInSeconds) {
    issues.push("HSTS max-age should be at least 6 months (15552000 seconds)");
  }

  if (!hsts.includes('includeSubDomains')) {
    issues.push("HSTS should include 'includeSubDomains' directive");
  }

  if (!hsts.includes('preload')) {
    issues.push("HSTS should include 'preload' directive for maximum security");
  }

  return issues;
}

/**
 * Validate X-Frame-Options
 */
function validateFrameOptions(frameOptions: string): string[] {
  const issues: string[] = [];
  const value = frameOptions.toUpperCase();

  if (!['DENY', 'SAMEORIGIN'].includes(value)) {
    if (!value.startsWith('ALLOW-FROM')) {
      issues.push("X-Frame-Options should be 'DENY', 'SAMEORIGIN', or 'ALLOW-FROM uri'");
    }
  }

  // For healthcare apps, DENY is preferred
  if (value !== 'DENY') {
    issues.push("Consider using 'DENY' for maximum protection in healthcare apps");
  }

  return issues;
}

/**
 * Get recommended security headers for healthcare applications
 */
export function getRecommendedSecurityHeaders(): SecurityHeadersConfig {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-XSS-Protection': '1; mode=block'
  };
}

/**
 * Test security headers against a URL
 */
export async function testSecurityHeaders(url: string): Promise<SecurityHeaderValidationResult & { headers: SecurityHeadersConfig }> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const headers: SecurityHeadersConfig = {};

    // Extract security headers
    for (const header of [...REQUIRED_HEADERS, ...RECOMMENDED_HEADERS]) {
      const value = response.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }

    const validation = validateSecurityHeaders(headers);

    return {
      ...validation,
      headers
    };
  } catch (error) {
    return {
      isValid: false,
      missingHeaders: [...REQUIRED_HEADERS],
      weakHeaders: [],
      recommendations: [`Failed to fetch headers: ${error}`],
      headers: {}
    };
  }
}

/**
 * Generate security headers report
 */
export function generateSecurityHeadersReport(validation: SecurityHeaderValidationResult): string {
  let report = '# Security Headers Validation Report\n\n';

  if (validation.isValid) {
    report += '✅ **All required security headers are configured**\n\n';
  } else {
    report += '❌ **Security headers validation failed**\n\n';
  }

  if (validation.missingHeaders.length > 0) {
    report += '## Missing Required Headers\n';
    validation.missingHeaders.forEach(header => {
      report += `- ${header}\n`;
    });
    report += '\n';
  }

  if (validation.weakHeaders.length > 0) {
    report += '## Weak Header Configurations\n';
    validation.weakHeaders.forEach(header => {
      report += `- ${header}\n`;
    });
    report += '\n';
  }

  if (validation.recommendations.length > 0) {
    report += '## Recommendations\n';
    validation.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });
    report += '\n';
  }

  return report;
}

export default {
  validateSecurityHeaders,
  getRecommendedSecurityHeaders,
  testSecurityHeaders,
  generateSecurityHeadersReport
};