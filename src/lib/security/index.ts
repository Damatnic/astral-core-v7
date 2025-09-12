/**
 * Security Module Index
 * Central export point for all security utilities and services
 */

// Core security services
export { EncryptionService, encryption } from './encryption';
export { PHIService } from './phi-service';
export { EnhancedPHIService, enhancedPHIService, PHIAccessReason } from './phi-enhanced';
export { SessionManager, sessionManager } from './session';
export { CSRFProtection, getCSRFProtection, validateCSRF, generateCSRFToken, extractCSRFToken, handleCSRFTokenRequest, CSRF_CONFIG } from './csrf';
export { audit, AuditService } from './audit';

// Rate limiting
export { RateLimiter, rateLimiters } from './rate-limit';
export {
  getRateLimiter,
  applyRateLimit,
  generateRateLimitKey,
  getClientIp,
  rateLimitConfigs
} from './rate-limiter-config';

// Session management - exported individually to avoid build conflicts
export { generateSessionId, createSession, validateSession, refreshSession, destroySession, getSessionConfig, applySessionSecurity } from './session-manager';

// Middleware enhancements - exported individually to avoid build conflicts
export { generateCSP, generateSecurityHeaders, applyCORS, shouldRateLimit, requiresCSRF, enhanceSecurityResponse, withSecurity } from './middleware-enhancer';

// Validation
export { ValidationService } from './validation';

// Environment configuration - exported individually to avoid build conflicts
export { validateEnv, getEnvConfig, getConfig, getEnvVar, isProduction, isDevelopment, getAppUrl } from '../config/env-validation';

// API validation schemas
export * from '../validation/api-schemas';

// Security initialization
import { validateEnv, getConfig } from '../config/env-validation';
import { audit } from './audit';

/**
 * Initialize security services
 * Should be called once during application startup
 */
export async function initializeSecurity(): Promise<void> {
  console.info('Initializing security services...');
  
  try {
    // Validate environment configuration
    const envResult = validateEnv();
    if (!envResult.success) {
      console.error('Environment validation failed:', envResult.errors);
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Critical: Environment validation failed in production');
      }
    }
    
    const config = getConfig();
    
    // Log security configuration (with sensitive values masked)
    console.info('Security configuration:', {
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
    
    // Initialize audit logging
    try {
      await audit.logInfo('SYSTEM', 'Security', 'Security services initialized', {
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Audit logging initialization failed:', error);
    }
    
    console.info('Security services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize security services:', error);
    
    // In production, fail fast for security issues
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

/**
 * Get security status
 * Returns current security configuration and health
 */
export function getSecurityStatus(): {
  initialized: boolean;
  environment: string;
  features: Record<string, boolean>;
  warnings: string[];
} {
  try {
    const config = getConfig();
    
    return {
      initialized: true,
      environment: config.NODE_ENV,
      features: {},
      warnings: [],
    };
  } catch (error) {
    return {
      initialized: false,
      environment: 'unknown',
      features: {},
      warnings: ['Security not properly initialized'],
    };
  }
}

// Auto-initialize in non-test environments
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  initializeSecurity().catch(error => {
    console.error('Failed to auto-initialize security:', error);
  });
}