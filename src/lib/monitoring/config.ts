/**
 * Comprehensive Monitoring Configuration
 * Central configuration for all monitoring, security, and performance systems
 * Suitable for production mental health platform deployment
 */

export interface MonitoringConfig {
  errorTracking: ErrorTrackingConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  uptime: UptimeConfig;
  alerts: AlertConfig;
  retention: RetentionConfig;
}

export interface ErrorTrackingConfig {
  enabled: boolean;
  captureConsoleErrors: boolean;
  captureUnhandledRejections: boolean;
  captureResourceErrors: boolean;
  maxErrorsPerSession: number;
  excludeUrls: string[];
  excludeMessages: string[];
  severityThresholds: {
    critical: string[];
    high: string[];
    medium: string[];
  };
}

export interface PerformanceConfig {
  webVitals: {
    enabled: boolean;
    reportingInterval: number; // milliseconds
    thresholds: {
      fcp: { good: number; needsImprovement: number };
      lcp: { good: number; needsImprovement: number };
      fid: { good: number; needsImprovement: number };
      cls: { good: number; needsImprovement: number };
      ttfb: { good: number; needsImprovement: number };
      inp: { good: number; needsImprovement: number };
    };
  };
  customMetrics: {
    enabled: boolean;
    memoryMonitoring: boolean;
    resourceMonitoring: boolean;
    apiResponseTimes: boolean;
  };
}

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    strictMode: boolean;
    ipWhitelist: string[];
    bypassRoles: string[];
  };
  csrf: {
    enabled: boolean;
    tokenLifetime: number;
    strictSameSite: boolean;
    requireHttps: boolean;
  };
  headers: {
    hsts: {
      enabled: boolean;
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    contentSecurityPolicy: {
      enabled: boolean;
      reportOnly: boolean;
      directives: Record<string, string>;
    };
  };
}

export interface UptimeConfig {
  monitors: {
    enabled: boolean;
    defaultInterval: number; // seconds
    defaultTimeout: number; // seconds
    retryAttempts: number;
    alertAfterFailures: number;
  };
  statusPage: {
    enabled: boolean;
    publicAccess: boolean;
    showIncidentHistory: boolean;
    historyDays: number;
    cacheTimeout: number; // seconds
  };
}

export interface AlertConfig {
  channels: {
    email: {
      enabled: boolean;
      recipients: string[];
      severityFilter: string[];
    };
    webhook: {
      enabled: boolean;
      urls: string[];
      severityFilter: string[];
    };
    console: {
      enabled: boolean;
      severityFilter: string[];
    };
  };
  rules: {
    errorRate: {
      enabled: boolean;
      threshold: number; // errors per minute
      window: number; // minutes
      severity: string;
    };
    responseTime: {
      enabled: boolean;
      threshold: number; // milliseconds
      percentile: number; // 95th percentile
      severity: string;
    };
    uptime: {
      enabled: boolean;
      threshold: number; // percentage
      window: number; // minutes
      severity: string;
    };
    memoryUsage: {
      enabled: boolean;
      threshold: number; // percentage
      severity: string;
    };
  };
}

export interface RetentionConfig {
  errorLogs: number; // days
  performanceMetrics: number; // days
  healthChecks: number; // days
  uptimeData: number; // days
  securityLogs: number; // days
  alerts: number; // days
}

/**
 * Production monitoring configuration for mental health platform
 * Optimized for security, compliance, and reliability
 */
export const PRODUCTION_CONFIG: MonitoringConfig = {
  errorTracking: {
    enabled: true,
    captureConsoleErrors: true,
    captureUnhandledRejections: true,
    captureResourceErrors: true,
    maxErrorsPerSession: 50,
    excludeUrls: [
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      '/favicon.ico'
    ],
    excludeMessages: [
      'Script error.',
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded'
    ],
    severityThresholds: {
      critical: [
        'cannot read prop',
        'null is not an object',
        'undefined is not a function',
        'maximum call stack',
        'out of memory',
        'database connection',
        'payment processing',
        'authentication failed'
      ],
      high: [
        'network error',
        'failed to fetch',
        'timeout',
        'abort',
        'permission denied',
        'unauthorized'
      ],
      medium: [
        'warning',
        'deprecated',
        'validation error',
        'not found'
      ]
    }
  },

  performance: {
    webVitals: {
      enabled: true,
      reportingInterval: 30000, // 30 seconds
      thresholds: {
        fcp: { good: 1800, needsImprovement: 3000 },
        lcp: { good: 2500, needsImprovement: 4000 },
        fid: { good: 100, needsImprovement: 300 },
        cls: { good: 0.1, needsImprovement: 0.25 },
        ttfb: { good: 800, needsImprovement: 1800 },
        inp: { good: 200, needsImprovement: 500 }
      }
    },
    customMetrics: {
      enabled: true,
      memoryMonitoring: true,
      resourceMonitoring: true,
      apiResponseTimes: true
    }
  },

  security: {
    rateLimiting: {
      enabled: true,
      strictMode: true,
      ipWhitelist: [], // Configure for trusted IPs in production
      bypassRoles: ['ADMIN'] // Admins can bypass certain limits
    },
    csrf: {
      enabled: true,
      tokenLifetime: 24 * 60 * 60 * 1000, // 24 hours
      strictSameSite: true,
      requireHttps: true
    },
    headers: {
      hsts: {
        enabled: true,
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      contentSecurityPolicy: {
        enabled: true,
        reportOnly: false,
        directives: {
          'default-src': "'self'",
          'script-src': "'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
          'style-src': "'self' 'unsafe-inline'",
          'img-src': "'self' data: https:",
          'font-src': "'self' data:",
          'connect-src': "'self' https://api.stripe.com",
          'frame-ancestors': "'none'",
          'base-uri': "'self'",
          'form-action': "'self'"
        }
      }
    }
  },

  uptime: {
    monitors: {
      enabled: true,
      defaultInterval: 300, // 5 minutes
      defaultTimeout: 30, // 30 seconds
      retryAttempts: 3,
      alertAfterFailures: 2
    },
    statusPage: {
      enabled: true,
      publicAccess: true,
      showIncidentHistory: true,
      historyDays: 30,
      cacheTimeout: 60 // 1 minute
    }
  },

  alerts: {
    channels: {
      email: {
        enabled: true,
        recipients: [], // Configure in production
        severityFilter: ['ERROR', 'CRITICAL']
      },
      webhook: {
        enabled: false, // Configure webhook URLs in production
        urls: [],
        severityFilter: ['CRITICAL']
      },
      console: {
        enabled: true,
        severityFilter: ['WARNING', 'ERROR', 'CRITICAL']
      }
    },
    rules: {
      errorRate: {
        enabled: true,
        threshold: 10, // 10 errors per minute
        window: 5, // 5 minute window
        severity: 'ERROR'
      },
      responseTime: {
        enabled: true,
        threshold: 2000, // 2 seconds
        percentile: 95,
        severity: 'WARNING'
      },
      uptime: {
        enabled: true,
        threshold: 99.0, // 99% uptime
        window: 60, // 1 hour window
        severity: 'ERROR'
      },
      memoryUsage: {
        enabled: true,
        threshold: 85, // 85% memory usage
        severity: 'WARNING'
      }
    }
  },

  retention: {
    errorLogs: 90, // 3 months
    performanceMetrics: 30, // 1 month
    healthChecks: 7, // 1 week
    uptimeData: 365, // 1 year
    securityLogs: 365, // 1 year for compliance
    alerts: 90 // 3 months
  }
};

/**
 * Development monitoring configuration
 * Relaxed settings for development environment
 */
export const DEVELOPMENT_CONFIG: MonitoringConfig = {
  ...PRODUCTION_CONFIG,
  errorTracking: {
    ...PRODUCTION_CONFIG.errorTracking,
    maxErrorsPerSession: 100
  },
  security: {
    ...PRODUCTION_CONFIG.security,
    rateLimiting: {
      ...PRODUCTION_CONFIG.security.rateLimiting,
      strictMode: false
    },
    csrf: {
      ...PRODUCTION_CONFIG.security.csrf,
      requireHttps: false
    }
  },
  retention: {
    errorLogs: 7,
    performanceMetrics: 3,
    healthChecks: 1,
    uptimeData: 7,
    securityLogs: 7,
    alerts: 7
  }
};

/**
 * Get monitoring configuration based on environment
 */
export function getMonitoringConfig(): MonitoringConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return PRODUCTION_CONFIG;
    case 'development':
      return DEVELOPMENT_CONFIG;
    case 'test':
      return {
        ...DEVELOPMENT_CONFIG,
        errorTracking: { ...DEVELOPMENT_CONFIG.errorTracking, enabled: false },
        performance: { ...DEVELOPMENT_CONFIG.performance, webVitals: { ...DEVELOPMENT_CONFIG.performance.webVitals, enabled: false } },
        uptime: { ...DEVELOPMENT_CONFIG.uptime, monitors: { ...DEVELOPMENT_CONFIG.uptime.monitors, enabled: false } }
      };
    default:
      return DEVELOPMENT_CONFIG;
  }
}

/**
 * Monitoring endpoints configuration
 * Defines all monitoring API endpoints and their purposes
 */
export const MONITORING_ENDPOINTS = {
  // Error tracking
  errors: {
    report: '/api/monitoring/errors',
    stats: '/api/monitoring/errors?action=stats',
    resolve: '/api/monitoring/errors'
  },
  
  // Performance monitoring
  performance: {
    webVitals: '/api/monitoring/performance',
    customMetrics: '/api/monitoring/performance',
    report: '/api/monitoring/performance?type=report'
  },
  
  // Health checks
  health: {
    live: '/api/health/live',
    ready: '/api/health/ready',
    detailed: '/api/health?detailed=true'
  },
  
  // Uptime monitoring
  uptime: {
    monitors: '/api/monitoring/uptime',
    incidents: '/api/monitoring/uptime?action=incidents',
    status: '/api/monitoring/uptime?action=status'
  },
  
  // Security
  security: {
    csrfToken: '/api/csrf-token',
    rateLimitStatus: '/api/security/rate-limit-status'
  },
  
  // Public status
  status: {
    public: '/api/status',
    page: '/status'
  }
} as const;

/**
 * Default alert rules for production deployment
 */
export const DEFAULT_ALERT_RULES = [
  {
    name: 'High Error Rate',
    description: 'Triggered when error rate exceeds threshold',
    condition: 'error_rate > 10 per minute',
    severity: 'ERROR' as const,
    cooldownPeriod: 300, // 5 minutes
    actions: [
      { type: 'email', config: { severity: 'ERROR' } },
      { type: 'console', config: { level: 'error' } }
    ]
  },
  {
    name: 'Critical System Error',
    description: 'Triggered by critical severity errors',
    condition: 'error_severity = CRITICAL',
    severity: 'CRITICAL' as const,
    cooldownPeriod: 60, // 1 minute
    actions: [
      { type: 'email', config: { severity: 'CRITICAL' } },
      { type: 'console', config: { level: 'error' } }
    ]
  },
  {
    name: 'Service Downtime',
    description: 'Triggered when service becomes unavailable',
    condition: 'uptime < 99% over 10 minutes',
    severity: 'CRITICAL' as const,
    cooldownPeriod: 180, // 3 minutes
    actions: [
      { type: 'email', config: { severity: 'CRITICAL' } },
      { type: 'webhook', config: { urgency: 'high' } }
    ]
  },
  {
    name: 'Slow Response Time',
    description: 'Triggered when API response times are slow',
    condition: 'response_time_p95 > 2000ms',
    severity: 'WARNING' as const,
    cooldownPeriod: 600, // 10 minutes
    actions: [
      { type: 'console', config: { level: 'warn' } }
    ]
  },
  {
    name: 'High Memory Usage',
    description: 'Triggered when memory usage is high',
    condition: 'memory_usage > 85%',
    severity: 'WARNING' as const,
    cooldownPeriod: 300, // 5 minutes
    actions: [
      { type: 'console', config: { level: 'warn' } }
    ]
  }
] as const;