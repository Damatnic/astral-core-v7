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

// Session management
export {
  SessionConfig,
  SessionData,
  generateSessionId,
  createSession,
  validateSession,
  refreshSession,
  destroySession,
  getSessionConfig,
  applySessionSecurity
} from './session-manager';

// Middleware enhancements
export {
  SecurityHeaders,
  generateCSP,
  generateSecurityHeaders,
  applyCORS,
  shouldRateLimit,
  requiresCSRF,
  enhanceSecurityResponse,
  withSecurity
} from './middleware-enhancer';

// Validation
export { ValidationService } from './validation';

// Environment configuration
export {
  EnvConfig,
  validateEnv,
  getEnvConfig,
  getConfig,
  getEnvVar,
  isProduction,
  isDevelopment,
  getAppUrl
} from '../config/env-validation';

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
      mfaEnabled: config.ENABLE_MFA,
      auditEnabled: config.ENABLE_AUDIT_LOG,
      phiEncryption: config.ENABLE_PHI_ENCRYPTION,
      rateLimiting: config.RATE_LIMIT_ENABLED,
      corsEnabled: !!config.CORS_ALLOWED_ORIGINS,
      cspEnabled: config.CSP_ENABLED,
      sessionMaxAge: config.SESSION_MAX_AGE,
    });
    
    // Initialize audit logging
    if (config.ENABLE_AUDIT_LOG) {
      await audit.logInfo('SYSTEM', 'Security', 'Security services initialized', {
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Perform security checks
    performSecurityChecks(config);
    
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
 * Perform runtime security checks
 * @param config Environment configuration
 */
function performSecurityChecks(config: EnvConfig): void {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check for weak secrets in production
  if (config.NODE_ENV === 'production') {
    const secrets = [
      { name: 'NEXTAUTH_SECRET', value: config.NEXTAUTH_SECRET },
      { name: 'ENCRYPTION_KEY', value: config.ENCRYPTION_KEY },
      { name: 'JWT_SECRET', value: config.JWT_SECRET },
      { name: 'CSRF_SECRET', value: config.CSRF_SECRET },
    ];
    
    for (const secret of secrets) {
      if (secret.value.length < 32) {
        errors.push(`${secret.name} is too short (minimum 32 characters required)`);
      }
      
      if (secret.value.includes('change') || secret.value.includes('default')) {
        errors.push(`${secret.name} appears to be a default value`);
      }
    }
    
    // Check SSL/TLS configuration
    if (!config.DATABASE_URL.includes('ssl=true') && !config.DATABASE_URL.includes('sslmode=require')) {
      warnings.push('Database connection does not enforce SSL/TLS');
    }
    
    // Check security features
    if (!config.ENABLE_MFA) {
      warnings.push('Multi-factor authentication is disabled');
    }
    
    if (!config.ENABLE_AUDIT_LOG) {
      errors.push('Audit logging must be enabled in production');
    }
    
    if (!config.ENABLE_PHI_ENCRYPTION) {
      errors.push('PHI encryption must be enabled for HIPAA compliance');
    }
    
    if (!config.RATE_LIMIT_ENABLED) {
      warnings.push('Rate limiting is disabled');
    }
  }
  
  // Check for development settings in production
  if (config.NODE_ENV === 'production') {
    if (config.DEMO_MODE) {
      errors.push('Demo mode cannot be enabled in production');
    }
    
    if (config.LOG_LEVEL === 'debug') {
      warnings.push('Debug logging should not be enabled in production');
    }
  }
  
  // Log warnings and errors
  if (warnings.length > 0) {
    console.warn('Security warnings:', warnings);
  }
  
  if (errors.length > 0) {
    console.error('Security errors:', errors);
    
    if (config.NODE_ENV === 'production') {
      throw new Error('Critical security issues detected');
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
      features: {
        mfa: config.ENABLE_MFA,
        audit: config.ENABLE_AUDIT_LOG,
        phiEncryption: config.ENABLE_PHI_ENCRYPTION,
        rateLimiting: config.RATE_LIMIT_ENABLED,
        csp: config.CSP_ENABLED,
      },
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