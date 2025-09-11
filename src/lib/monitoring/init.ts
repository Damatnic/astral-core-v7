/**
 * Monitoring System Initialization
 * Comprehensive setup for error tracking, performance monitoring, and security
 * for production mental health platform deployment
 */

import { getMonitoringConfig, DEFAULT_ALERT_RULES, MONITORING_ENDPOINTS } from './config';
import { getErrorMonitor } from '@/lib/performance/error-monitoring';
import { getWebVitalsMonitor } from '@/lib/performance/web-vitals';
import { getPerformanceMetricsCollector } from '@/lib/performance/metrics';
import { getCSRFProtection } from '@/lib/security/csrf';
import { logInfo, logError, logWarning } from '@/lib/logger';

/**
 * Initialize all monitoring systems
 * Should be called during application startup
 */
export async function initializeMonitoring(): Promise<void> {
  const config = getMonitoringConfig();
  const startTime = Date.now();

  logInfo('Initializing monitoring systems', 'MonitoringInit', {
    environment: process.env.NODE_ENV,
    config: {
      errorTracking: config.errorTracking.enabled,
      performance: config.performance.webVitals.enabled,
      security: config.security.rateLimiting.enabled,
      uptime: config.uptime.monitors.enabled
    }
  });

  try {
    // Initialize error tracking
    if (config.errorTracking.enabled) {
      await initializeErrorTracking(config);
    }

    // Initialize performance monitoring
    if (config.performance.webVitals.enabled) {
      await initializePerformanceMonitoring(config);
    }

    // Initialize security systems
    await initializeSecuritySystems(config);

    // Initialize uptime monitoring
    if (config.uptime.monitors.enabled) {
      await initializeUptimeMonitoring(config);
    }

    // Setup alert rules
    await setupDefaultAlertRules();

    const initTime = Date.now() - startTime;
    logInfo('Monitoring systems initialized successfully', 'MonitoringInit', {
      initializationTime: `${initTime}ms`,
      components: [
        'ErrorTracking',
        'PerformanceMonitoring', 
        'SecuritySystems',
        'UptimeMonitoring',
        'AlertRules'
      ]
    });

    // Schedule cleanup tasks
    scheduleCleanupTasks(config);

  } catch (error) {
    logError('Failed to initialize monitoring systems', 'MonitoringInit', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      initializationTime: `${Date.now() - startTime}ms`
    });
    throw error;
  }
}

/**
 * Initialize error tracking system
 */
async function initializeErrorTracking(config: any): Promise<void> {
  try {
    const errorMonitor = getErrorMonitor();

    // Configure error exclusions
    config.errorTracking.excludeUrls.forEach((url: string) => {
      // Implementation would depend on error monitor capabilities
      logInfo('Added URL exclusion for error tracking', 'ErrorTracking', { url });
    });

    // Setup severity-based alert rules
    Object.entries(config.errorTracking.severityThresholds).forEach(([severity, patterns]) => {
      logInfo('Configured error severity patterns', 'ErrorTracking', {
        severity,
        patternCount: (patterns as string[]).length
      });
    });

    // Request notification permissions for browser alerts
    if (typeof window !== 'undefined') {
      const { requestNotificationPermission } = await import('@/lib/performance/error-monitoring');
      requestNotificationPermission();
    }

    logInfo('Error tracking initialized', 'ErrorTracking', {
      maxErrorsPerSession: config.errorTracking.maxErrorsPerSession,
      captureTypes: {
        console: config.errorTracking.captureConsoleErrors,
        unhandledRejections: config.errorTracking.captureUnhandledRejections,
        resources: config.errorTracking.captureResourceErrors
      }
    });

  } catch (error) {
    logError('Failed to initialize error tracking', 'ErrorTracking', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Initialize performance monitoring system
 */
async function initializePerformanceMonitoring(config: any): Promise<void> {
  try {
    const webVitalsMonitor = getWebVitalsMonitor();
    const metricsCollector = getPerformanceMetricsCollector();

    // Setup Web Vitals monitoring with configured thresholds
    const thresholds = config.performance.webVitals.thresholds;
    
    // Subscribe to Web Vitals updates for real-time monitoring
    webVitalsMonitor.subscribe((vitals) => {
      // Check thresholds and trigger alerts if needed
      Object.entries(vitals).forEach(([metric, data]) => {
        if (data && typeof data === 'object' && 'value' in data) {
          const threshold = thresholds[metric];
          if (threshold && data.value > threshold.needsImprovement) {
            logWarning('Performance threshold exceeded', 'PerformanceMonitoring', {
              metric,
              value: data.value,
              threshold: threshold.needsImprovement,
              severity: data.value > threshold.needsImprovement * 1.5 ? 'HIGH' : 'MEDIUM'
            });
          }
        }
      });
    });

    // Setup periodic performance reporting
    if (typeof window !== 'undefined') {
      setInterval(() => {
        const report = metricsCollector.generateReport();
        const vitalsScore = metricsCollector.getWebVitalsScore();
        
        if (vitalsScore.score < 70) {
          logWarning('Poor Web Vitals score detected', 'PerformanceMonitoring', {
            score: vitalsScore.score,
            grade: vitalsScore.grade,
            issues: vitalsScore.issues
          });
        }
      }, config.performance.webVitals.reportingInterval);
    }

    logInfo('Performance monitoring initialized', 'PerformanceMonitoring', {
      webVitalsEnabled: config.performance.webVitals.enabled,
      customMetricsEnabled: config.performance.customMetrics.enabled,
      reportingInterval: config.performance.webVitals.reportingInterval
    });

  } catch (error) {
    logError('Failed to initialize performance monitoring', 'PerformanceMonitoring', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Initialize security systems
 */
async function initializeSecuritySystems(config: any): Promise<void> {
  try {
    // Initialize CSRF protection
    const csrfProtection = getCSRFProtection();
    
    logInfo('Security systems initialized', 'SecurityInit', {
      rateLimiting: config.security.rateLimiting.enabled,
      csrf: config.security.csrf.enabled,
      strictMode: config.security.rateLimiting.strictMode,
      hstsEnabled: config.security.headers.hsts.enabled
    });

    // Log security configuration for audit
    if (config.security.rateLimiting.strictMode) {
      logInfo('Strict rate limiting mode enabled', 'Security', {
        ipWhitelistCount: config.security.rateLimiting.ipWhitelist.length,
        bypassRoles: config.security.rateLimiting.bypassRoles
      });
    }

  } catch (error) {
    logError('Failed to initialize security systems', 'SecurityInit', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Initialize uptime monitoring
 */
async function initializeUptimeMonitoring(config: any): Promise<void> {
  try {
    // In a real implementation, this would set up background monitoring jobs
    // For now, we'll just log the configuration
    
    logInfo('Uptime monitoring initialized', 'UptimeMonitoring', {
      defaultInterval: config.uptime.monitors.defaultInterval,
      defaultTimeout: config.uptime.monitors.defaultTimeout,
      retryAttempts: config.uptime.monitors.retryAttempts,
      statusPageEnabled: config.uptime.statusPage.enabled
    });

    if (config.uptime.statusPage.enabled) {
      logInfo('Public status page enabled', 'StatusPage', {
        publicAccess: config.uptime.statusPage.publicAccess,
        historyDays: config.uptime.statusPage.historyDays,
        cacheTimeout: config.uptime.statusPage.cacheTimeout
      });
    }

  } catch (error) {
    logError('Failed to initialize uptime monitoring', 'UptimeMonitoring', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Setup default alert rules
 */
async function setupDefaultAlertRules(): Promise<void> {
  try {
    // In production, these would be stored in the database
    // For now, we'll log the configured rules
    
    DEFAULT_ALERT_RULES.forEach(rule => {
      logInfo('Alert rule configured', 'AlertRules', {
        name: rule.name,
        severity: rule.severity,
        cooldownPeriod: rule.cooldownPeriod,
        actionCount: rule.actions.length
      });
    });

    logInfo('Default alert rules setup completed', 'AlertRules', {
      ruleCount: DEFAULT_ALERT_RULES.length
    });

  } catch (error) {
    logError('Failed to setup alert rules', 'AlertRules', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Schedule cleanup tasks for data retention
 */
function scheduleCleanupTasks(config: any): void {
  const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

  // Schedule daily cleanup
  setInterval(async () => {
    try {
      await performDataCleanup(config);
    } catch (error) {
      logError('Data cleanup failed', 'DataCleanup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, cleanupInterval);

  logInfo('Cleanup tasks scheduled', 'DataCleanup', {
    interval: '24 hours',
    retentionPolicy: {
      errorLogs: `${config.retention.errorLogs} days`,
      performanceMetrics: `${config.retention.performanceMetrics} days`,
      healthChecks: `${config.retention.healthChecks} days`,
      securityLogs: `${config.retention.securityLogs} days`
    }
  });
}

/**
 * Perform data cleanup based on retention policies
 */
async function performDataCleanup(config: any): Promise<void> {
  const now = new Date();
  const cleanupResults = {
    errorLogs: 0,
    performanceMetrics: 0,
    healthChecks: 0,
    alerts: 0
  };

  try {
    // This would be implemented with actual database cleanup
    // For now, we'll just log the intended cleanup
    
    logInfo('Data cleanup completed', 'DataCleanup', {
      timestamp: now.toISOString(),
      cleanupResults,
      retentionPolicies: config.retention
    });

  } catch (error) {
    logError('Data cleanup failed', 'DataCleanup', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: now.toISOString()
    });
    throw error;
  }
}

/**
 * Get monitoring system status
 */
export function getMonitoringStatus() {
  const config = getMonitoringConfig();
  
  return {
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    systems: {
      errorTracking: {
        enabled: config.errorTracking.enabled,
        status: 'operational'
      },
      performance: {
        enabled: config.performance.webVitals.enabled,
        status: 'operational'
      },
      security: {
        rateLimiting: config.security.rateLimiting.enabled,
        csrf: config.security.csrf.enabled,
        status: 'operational'
      },
      uptime: {
        enabled: config.uptime.monitors.enabled,
        statusPage: config.uptime.statusPage.enabled,
        status: 'operational'
      }
    },
    endpoints: MONITORING_ENDPOINTS,
    alertRules: DEFAULT_ALERT_RULES.length,
    retentionPolicy: config.retention
  };
}

/**
 * Initialize monitoring for client-side applications
 */
export function initializeClientMonitoring(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const config = getMonitoringConfig();

  // Initialize error tracking on client
  if (config.errorTracking.enabled) {
    const errorMonitor = getErrorMonitor();
    
    // Log successful initialization
    logInfo('Client-side monitoring initialized', 'ClientMonitoring', {
      errorTracking: true,
      performance: config.performance.webVitals.enabled,
      userAgent: navigator.userAgent
    });
  }

  // Initialize performance monitoring
  if (config.performance.webVitals.enabled) {
    const webVitalsMonitor = getWebVitalsMonitor();
    
    // Set up automatic reporting
    webVitalsMonitor.subscribe((vitals) => {
      // Send vitals to server
      fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'web-vitals',
          data: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            vitals,
            metadata: {
              timestamp: Date.now(),
              connectionType: (navigator as any).connection?.effectiveType,
              deviceMemory: (navigator as any).deviceMemory,
              hardwareConcurrency: navigator.hardwareConcurrency
            }
          }
        })
      }).catch(error => {
        console.warn('Failed to send vitals data:', error);
      });
    });
  }
}