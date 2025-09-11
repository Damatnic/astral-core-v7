import { 
  LogEntry, 
  LogLevel, 
  MonitoringConfig, 
  ErrorMetric, 
  PerformanceMetric,
  UserActivityMetric,
  HealthMetric,
  SecurityEvent,
  EventPayload
} from './types';

// UUID generator for IDs
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Session ID management
let sessionId: string | null = null;
function getSessionId(): string {
  if (!sessionId) {
    sessionId = generateId();
  }
  return sessionId;
}

// Error fingerprinting
function generateErrorFingerprint(error: Error, context?: Record<string, any>): string {
  const message = error.message || 'Unknown error';
  const stack = error.stack || '';
  const contextStr = context ? JSON.stringify(context) : '';
  
  // Simple hash function
  let hash = 0;
  const str = `${message}${stack}${contextStr}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// Advanced Logger class for mental health platform
export class Logger {
  private config: MonitoringConfig;
  private buffer: Array<LogEntry | ErrorMetric | PerformanceMetric | UserActivityMetric | HealthMetric | SecurityEvent> = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private errorCounts: Map<string, number> = new Map();
  private performanceObserver: PerformanceObserver | null = null;
  private isInitialized = false;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    // Setup flush timer
    this.setupFlushTimer();
    
    // Setup error handling
    this.setupGlobalErrorHandlers();
    
    // Setup performance monitoring
    if (this.config.performance.enabled) {
      this.setupPerformanceMonitoring();
    }
    
    // Setup user activity tracking
    if (this.config.userActivity.enabled) {
      this.setupUserActivityTracking();
    }
    
    // Setup beforeunload handler to flush logs
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });
    
    this.isInitialized = true;
  }

  private setupFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.logging.flushInterval);
  }

  private setupGlobalErrorHandlers(): void {
    if (!this.config.errorTracking.enabled) return;
    
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError(
        event.error || new Error(event.message),
        {
          source: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          category: 'javascript'
        }
      );
    });
    
    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          category: 'javascript',
          type: 'unhandled_promise_rejection'
        }
      );
    });
  }

  private setupPerformanceMonitoring(): void {
    if (!('PerformanceObserver' in window)) return;
    
    // Web Vitals monitoring
    if (this.config.performance.enableWebVitals) {
      this.observeWebVitals();
    }
    
    // Resource timing
    if (this.config.performance.enableResourceTiming) {
      this.observeResourceTiming();
    }
    
    // Long tasks
    this.observeLongTasks();
  }

  private observeWebVitals(): void {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.logPerformance('first_contentful_paint', entry.startTime, {
          entryType: entry.entryType
        });
      }
    }).observe({ entryTypes: ['paint'] });
    
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.logPerformance('largest_contentful_paint', entry.startTime, {
          size: (entry as any).size,
          element: (entry as any).element?.tagName
        });
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.logPerformance('first_input_delay', (entry as any).processingStart - entry.startTime, {
          eventType: (entry as any).name
        });
      }
    }).observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          this.logPerformance('cumulative_layout_shift', (entry as any).value, {
            sources: (entry as any).sources?.map((source: any) => ({
              element: source.node?.tagName,
              currentRect: source.currentRect,
              previousRect: source.previousRect
            }))
          });
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }

  private observeResourceTiming(): void {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;
        this.logPerformance(`resource_${resourceEntry.initiatorType}`, resourceEntry.duration, {
          name: resourceEntry.name,
          size: resourceEntry.transferSize,
          cached: resourceEntry.transferSize === 0,
          protocol: resourceEntry.nextHopProtocol
        });
      }
    }).observe({ entryTypes: ['resource'] });
  }

  private observeLongTasks(): void {
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > this.config.performance.longTaskThreshold) {
            this.logPerformance('long_task', entry.duration, {
              startTime: entry.startTime,
              attribution: (entry as any).attribution
            });
          }
        }
      }).observe({ entryTypes: ['longtask'] });
    }
  }

  private setupUserActivityTracking(): void {
    if (!this.config.userActivity.enabled) return;
    
    // Click tracking
    if (this.config.userActivity.enableClicks) {
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        this.logUserActivity('click', {
          element: target.tagName,
          id: target.id,
          className: target.className,
          text: target.textContent?.slice(0, 100),
          x: event.clientX,
          y: event.clientY
        });
      });
    }
    
    // Form submissions
    if (this.config.userActivity.enableFormSubmissions) {
      document.addEventListener('submit', (event) => {
        const form = event.target as HTMLFormElement;
        this.logUserActivity('form_submit', {
          formId: form.id,
          formName: form.name,
          action: form.action,
          method: form.method,
          fieldCount: form.elements.length
        });
      });
    }
    
    // Page visibility
    document.addEventListener('visibilitychange', () => {
      this.logUserActivity('page_visibility_change', {
        hidden: document.hidden,
        visibilityState: document.visibilityState
      });
    });
    
    // Time tracking
    if (this.config.userActivity.enableTimeOnPage) {
      const startTime = Date.now();
      window.addEventListener('beforeunload', () => {
        this.logUserActivity('page_time', {
          duration: Date.now() - startTime,
          url: window.location.href
        });
      });
    }
  }

  // Main logging methods
  public debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, 'application', metadata);
  }

  public info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, 'application', metadata);
  }

  public warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, 'application', metadata);
  }

  public error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('error', message, 'application', { ...metadata, error: error?.message, stack: error?.stack });
    
    if (error && this.config.errorTracking.enabled) {
      this.logError(error, metadata);
    }
  }

  public critical(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('critical', message, 'application', { ...metadata, error: error?.message, stack: error?.stack });
    
    if (error && this.config.errorTracking.enabled) {
      this.logError(error, { ...metadata, severity: 'critical' });
    }
  }

  private log(level: LogLevel, message: string, category: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      id: generateId(),
      timestamp: Date.now(),
      level,
      message,
      category,
      sessionId: getSessionId(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      metadata,
      environment: this.config.environment,
      version: this.config.version
    };
    
    this.addToBuffer(entry);
    
    // Console logging
    if (this.config.logging.enableConsole) {
      const consoleMethod = level === 'critical' ? 'error' : level;
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, metadata);
    }
  }

  public logError(error: Error, context?: Record<string, any>): void {
    if (!this.config.errorTracking.enabled) return;
    
    const fingerprint = generateErrorFingerprint(error, context);
    const currentCount = this.errorCounts.get(fingerprint) || 0;
    this.errorCounts.set(fingerprint, currentCount + 1);
    
    const errorMetric: ErrorMetric = {
      id: generateId(),
      timestamp: Date.now(),
      name: error.name,
      message: error.message,
      stack: error.stack,
      fingerprint,
      occurences: currentCount + 1,
      severity: this.determineErrorSeverity(error, context),
      category: this.determineErrorCategory(error, context),
      userId: context?.userId,
      sessionId: getSessionId(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      environment: this.config.environment,
      resolved: false,
      ...context
    };
    
    this.addToBuffer(errorMetric);
  }

  public logPerformance(name: string, duration: number, metadata?: Record<string, any>): void {
    if (!this.config.performance.enabled) return;
    
    const metric: PerformanceMetric = {
      id: generateId(),
      timestamp: Date.now(),
      name,
      duration,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      metadata,
      sessionId: getSessionId(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      route: metadata?.route || window.location.pathname
    };
    
    this.addToBuffer(metric);
  }

  public logUserActivity(action: string, metadata?: Record<string, any>): void {
    if (!this.config.userActivity.enabled) return;
    
    // Privacy mode - anonymize sensitive data
    if (this.config.userActivity.privacyMode) {
      metadata = this.anonymizeMetadata(metadata);
    }
    
    const activity: UserActivityMetric = {
      id: generateId(),
      timestamp: Date.now(),
      sessionId: getSessionId(),
      action,
      category: this.determineActivityCategory(action),
      metadata,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      ...metadata
    };
    
    this.addToBuffer(activity);
  }

  public logHealthMetric(type: HealthMetric['type'], value?: number, metadata?: Record<string, any>): void {
    if (!this.config.healthMetrics.enabled) return;
    
    const healthMetric: HealthMetric = {
      id: generateId(),
      timestamp: Date.now(),
      sessionId: getSessionId(),
      type,
      value,
      metadata,
      isPrivate: true, // Always private for mental health data
      encrypted: this.config.healthMetrics.encryptSensitiveData,
      ...metadata
    };
    
    this.addToBuffer(healthMetric);
  }

  public logSecurityEvent(type: SecurityEvent['type'], severity: SecurityEvent['severity'], metadata?: Record<string, any>): void {
    if (!this.config.security.enabled) return;
    
    const securityEvent: SecurityEvent = {
      id: generateId(),
      timestamp: Date.now(),
      type,
      severity,
      sessionId: getSessionId(),
      metadata,
      blocked: false,
      environment: this.config.environment,
      ...metadata
    };
    
    this.addToBuffer(securityEvent);
  }

  public trackEvent(event: EventPayload): void {
    this.logUserActivity(event.event, {
      ...event.metadata,
      sensitive: event.sensitive,
      timestamp: event.timestamp
    });
  }

  // Utility methods
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
    const currentLevelIndex = levels.indexOf(this.config.logging.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private determineErrorSeverity(error: Error, context?: Record<string, any>): ErrorMetric['severity'] {
    if (context?.severity) return context.severity;
    
    // Crisis-related errors are always critical
    if (error.message.toLowerCase().includes('crisis') || 
        error.message.toLowerCase().includes('emergency')) {
      return 'critical';
    }
    
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return 'high';
    }
    
    if (error.name === 'ValidationError') {
      return 'medium';
    }
    
    return 'low';
  }

  private determineErrorCategory(error: Error, context?: Record<string, any>): ErrorMetric['category'] {
    if (context?.category) return context.category;
    
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'network';
    }
    
    if (error.name === 'SecurityError') {
      return 'security';
    }
    
    if (error.name === 'ValidationError') {
      return 'validation';
    }
    
    return 'javascript';
  }

  private determineActivityCategory(action: string): UserActivityMetric['category'] {
    if (action.includes('navigation') || action.includes('page')) {
      return 'navigation';
    }
    
    if (action.includes('click') || action.includes('hover') || action.includes('focus')) {
      return 'interaction';
    }
    
    if (action.includes('form') || action.includes('input')) {
      return 'form';
    }
    
    if (action.includes('mood') || action.includes('wellness') || action.includes('journal')) {
      return 'wellness';
    }
    
    if (action.includes('crisis') || action.includes('emergency')) {
      return 'crisis';
    }
    
    return 'interaction';
  }

  private anonymizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return metadata;
    
    const anonymized = { ...metadata };
    
    // Remove or hash sensitive fields
    const sensitiveFields = ['email', 'phone', 'name', 'address', 'ssn', 'text', 'content'];
    
    for (const field of sensitiveFields) {
      if (anonymized[field]) {
        anonymized[field] = '[REDACTED]';
      }
    }
    
    return anonymized;
  }

  private addToBuffer(entry: any): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.config.logging.bufferSize) {
      this.flush();
    }
  }

  public async flush(sync = false): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const entries = [...this.buffer];
    this.buffer = [];
    
    if (!this.config.logging.enableRemote) {
      return;
    }
    
    try {
      const response = await fetch(this.config.endpoints.logs, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries,
          environment: this.config.environment,
          version: this.config.version,
          timestamp: Date.now()
        }),
        keepalive: sync
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send logs: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to send logs to remote endpoint:', error);
      // Re-add to buffer for retry
      this.buffer.unshift(...entries);
    }
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    this.flush(true);
  }
}

// Singleton logger instance
let loggerInstance: Logger | null = null;

export function createLogger(config: MonitoringConfig): Logger {
  if (loggerInstance) {
    loggerInstance.destroy();
  }
  
  loggerInstance = new Logger(config);
  return loggerInstance;
}

export function getLogger(): Logger | null {
  return loggerInstance;
}