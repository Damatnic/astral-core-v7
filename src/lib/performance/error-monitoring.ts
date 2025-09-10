/**
 * Error Monitoring and Alerting System
 * Comprehensive error tracking with performance impact analysis
 */

'use client';

export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  type: 'javascript' | 'unhandledrejection' | 'resource' | 'network' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  performanceImpact?: {
    beforeError: PerformanceMetrics;
    afterError: PerformanceMetrics;
  };
  context?: Record<string, any>;
}

interface PerformanceMetrics {
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  };
  timing?: {
    navigationStart: number;
    loadEventEnd: number;
  };
  resourceCount?: number;
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
  affectedUsers: Set<string>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (errors: ErrorEvent[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // minutes
  lastTriggered?: number;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'console' | 'notification';
  config: Record<string, any>;
}

class ErrorMonitor {
  private errors: ErrorEvent[] = [];
  private patterns: Map<string, ErrorPattern> = new Map();
  private alertRules: AlertRule[] = [];
  private subscribers: ((error: ErrorEvent) => void)[] = [];
  private isInitialized = false;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    
    this.isInitialized = true;
    this.setupErrorListeners();
    this.setupDefaultAlertRules();
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private setupErrorListeners() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript',
        severity: this.determineSeverity(event.error, event.message)
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        type: 'unhandledrejection',
        severity: 'high'
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      const target = event.target as HTMLElement;
      if (target && target !== window) {
        this.captureError({
          message: `Failed to load resource: ${(target as any).src || (target as any).href}`,
          filename: (target as any).src || (target as any).href,
          type: 'resource',
          severity: 'medium'
        });
      }
    }, true);
  }

  private setupDefaultAlertRules() {
    this.alertRules = [
      {
        id: 'critical-error-rate',
        name: 'High Critical Error Rate',
        condition: (errors) => {
          const recentCritical = errors.filter(e => 
            e.severity === 'critical' && 
            Date.now() - e.timestamp < 5 * 60 * 1000 // last 5 minutes
          );
          return recentCritical.length >= 5;
        },
        severity: 'critical',
        cooldown: 15,
        actions: [
          { type: 'console', config: { level: 'error' } },
          { type: 'notification', config: { title: 'Critical Errors Detected' } }
        ]
      },
      {
        id: 'memory-leak-warning',
        name: 'Potential Memory Leak',
        condition: (errors) => {
          const memoryErrors = errors.filter(e => 
            e.message.toLowerCase().includes('memory') ||
            e.message.toLowerCase().includes('heap')
          );
          return memoryErrors.length >= 3;
        },
        severity: 'high',
        cooldown: 30,
        actions: [
          { type: 'console', config: { level: 'warn' } }
        ]
      },
      {
        id: 'resource-loading-failures',
        name: 'Multiple Resource Loading Failures',
        condition: (errors) => {
          const resourceErrors = errors.filter(e => 
            e.type === 'resource' && 
            Date.now() - e.timestamp < 10 * 60 * 1000 // last 10 minutes
          );
          return resourceErrors.length >= 10;
        },
        severity: 'medium',
        cooldown: 20,
        actions: [
          { type: 'console', config: { level: 'warn' } }
        ]
      }
    ];
  }

  private determineSeverity(error: Error | null, message: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalPatterns = [
      /cannot read prop/i,
      /null is not an object/i,
      /undefined is not a function/i,
      /maximum call stack/i,
      /out of memory/i
    ];

    const highPatterns = [
      /network error/i,
      /failed to fetch/i,
      /timeout/i,
      /abort/i
    ];

    const mediumPatterns = [
      /warning/i,
      /deprecated/i
    ];

    const errorString = (error?.stack || message || '').toLowerCase();

    if (criticalPatterns.some(pattern => pattern.test(errorString))) {
      return 'critical';
    }
    if (highPatterns.some(pattern => pattern.test(errorString))) {
      return 'high';
    }
    if (mediumPatterns.some(pattern => pattern.test(errorString))) {
      return 'medium';
    }

    return 'low';
  }

  private capturePerformanceMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};

    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metrics.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize
      };
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metrics.timing = {
        navigationStart: navigation.navigationStart,
        loadEventEnd: navigation.loadEventEnd
      };
    }

    metrics.resourceCount = performance.getEntriesByType('resource').length;

    return metrics;
  }

  public captureError(errorData: Partial<ErrorEvent>) {
    const beforeMetrics = this.capturePerformanceMetrics();
    
    const errorEvent: ErrorEvent = {
      id: this.generateErrorId(),
      message: errorData.message || 'Unknown error',
      stack: errorData.stack,
      filename: errorData.filename,
      lineno: errorData.lineno,
      colno: errorData.colno,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      type: errorData.type || 'custom',
      severity: errorData.severity || 'medium',
      context: errorData.context,
      performanceImpact: {
        beforeError: beforeMetrics,
        afterError: {} // Will be populated later
      }
    };

    // Add user ID if available
    const userId = this.getUserId();
    if (userId) {
      errorEvent.userId = userId;
    }

    this.errors.push(errorEvent);
    this.updateErrorPatterns(errorEvent);
    this.checkAlertRules();
    this.notifySubscribers(errorEvent);

    // Populate after-error metrics with a small delay
    setTimeout(() => {
      if (errorEvent.performanceImpact) {
        errorEvent.performanceImpact.afterError = this.capturePerformanceMetrics();
      }
    }, 1000);

    // Keep only last 1000 errors
    if (this.errors.length > 1000) {
      this.errors = this.errors.slice(-500);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', errorEvent);
    }
  }

  private generateErrorId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private getUserId(): string | undefined {
    // Try to get user ID from various sources
    if (typeof window !== 'undefined') {
      // Check session storage
      const sessionUserId = sessionStorage.getItem('userId');
      if (sessionUserId) return sessionUserId;

      // Check local storage
      const localUserId = localStorage.getItem('userId');
      if (localUserId) return localUserId;

      // Check cookies (basic implementation)
      const cookieMatch = document.cookie.match(/userId=([^;]+)/);
      if (cookieMatch) return cookieMatch[1];
    }

    return undefined;
  }

  private updateErrorPatterns(error: ErrorEvent) {
    const pattern = this.extractErrorPattern(error);
    
    if (this.patterns.has(pattern)) {
      const existing = this.patterns.get(pattern)!;
      existing.count++;
      existing.lastOccurrence = error.timestamp;
      if (error.userId) {
        existing.affectedUsers.add(error.userId);
      }
    } else {
      this.patterns.set(pattern, {
        pattern,
        count: 1,
        firstOccurrence: error.timestamp,
        lastOccurrence: error.timestamp,
        affectedUsers: new Set(error.userId ? [error.userId] : []),
        severity: error.severity
      });
    }
  }

  private extractErrorPattern(error: ErrorEvent): string {
    // Create a pattern by normalizing the error message
    const message = error.message
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/['"]/g, '') // Remove quotes
      .replace(/https?:\/\/[^\s]+/g, 'URL') // Replace URLs
      .toLowerCase()
      .trim();

    return `${error.type}:${message}`;
  }

  private checkAlertRules() {
    for (const rule of this.alertRules) {
      // Check cooldown
      if (rule.lastTriggered && Date.now() - rule.lastTriggered < rule.cooldown * 60 * 1000) {
        continue;
      }

      if (rule.condition(this.errors)) {
        this.triggerAlert(rule);
        rule.lastTriggered = Date.now();
      }
    }
  }

  private triggerAlert(rule: AlertRule) {
    for (const action of rule.actions) {
      try {
        this.executeAlertAction(action, rule);
      } catch (e) {
        console.error('Failed to execute alert action:', e);
      }
    }
  }

  private executeAlertAction(action: AlertAction, rule: AlertRule) {
    switch (action.type) {
      case 'console':
        const level = action.config.level || 'log';
        console[level as keyof Console](`Alert triggered: ${rule.name}`);
        break;
      
      case 'notification':
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(action.config.title || rule.name, {
            body: action.config.body || `Alert rule "${rule.name}" has been triggered`,
            icon: action.config.icon
          });
        }
        break;
      
      case 'webhook':
        fetch(action.config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rule: rule.name,
            severity: rule.severity,
            timestamp: Date.now(),
            errors: this.getRecentErrors(10)
          })
        });
        break;
    }
  }

  private notifySubscribers(error: ErrorEvent) {
    this.subscribers.forEach(callback => {
      try {
        callback(error);
      } catch (e) {
        console.error('Error in error monitor subscriber:', e);
      }
    });
  }

  // Public methods
  public getErrors(): ErrorEvent[] {
    return [...this.errors];
  }

  public getRecentErrors(count = 50): ErrorEvent[] {
    return this.errors.slice(-count);
  }

  public getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.count - a.count);
  }

  public getErrorStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    last24Hours: number;
    topPatterns: ErrorPattern[];
  } {
    const now = Date.now();
    const last24Hours = this.errors.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000).length;
    
    const bySeverity = this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.errors.length,
      bySeverity,
      byType,
      last24Hours,
      topPatterns: this.getErrorPatterns().slice(0, 10)
    };
  }

  public subscribe(callback: (error: ErrorEvent) => void): () => void {
    this.subscribers.push(callback);
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  public addAlertRule(rule: AlertRule) {
    this.alertRules.push(rule);
  }

  public removeAlertRule(ruleId: string) {
    this.alertRules = this.alertRules.filter(rule => rule.id !== ruleId);
  }

  public clearErrors() {
    this.errors = [];
    this.patterns.clear();
  }

  public exportData(): {
    errors: ErrorEvent[];
    patterns: ErrorPattern[];
    stats: ReturnType<ErrorMonitor['getErrorStats']>;
    sessionId: string;
    timestamp: number;
  } {
    return {
      errors: this.getErrors(),
      patterns: this.getErrorPatterns(),
      stats: this.getErrorStats(),
      sessionId: this.sessionId,
      timestamp: Date.now()
    };
  }
}

// Singleton instance
let errorMonitor: ErrorMonitor | null = null;

export function getErrorMonitor(): ErrorMonitor {
  if (!errorMonitor) {
    errorMonitor = new ErrorMonitor();
  }
  return errorMonitor;
}

// React hook
export function useErrorMonitoring() {
  const monitor = getErrorMonitor();
  
  return {
    captureError: monitor.captureError.bind(monitor),
    errors: monitor.getErrors(),
    patterns: monitor.getErrorPatterns(),
    stats: monitor.getErrorStats(),
    subscribe: monitor.subscribe.bind(monitor),
    addAlertRule: monitor.addAlertRule.bind(monitor),
    exportData: monitor.exportData.bind(monitor)
  };
}

// Utility functions
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function captureCustomError(message: string, context?: Record<string, any>, severity?: 'low' | 'medium' | 'high' | 'critical') {
  const monitor = getErrorMonitor();
  monitor.captureError({
    message,
    context,
    severity,
    type: 'custom'
  });
}

// Development helper
export function logErrorReport() {
  if (process.env.NODE_ENV === 'development') {
    const monitor = getErrorMonitor();
    const data = monitor.exportData();
    
    console.group('Error Monitor Report');
    console.log('Session ID:', data.sessionId);
    console.log('Statistics:', data.stats);
    console.log('Recent Errors:', data.errors.slice(-10));
    console.log('Top Patterns:', data.patterns.slice(0, 5));
    console.groupEnd();
  }
}