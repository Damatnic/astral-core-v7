// Advanced monitoring and logging types for mental health platform

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timing';
export type EventType = 'user_action' | 'system_event' | 'performance' | 'error' | 'security' | 'health_metric';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  category: string;
  userId?: string;
  sessionId: string;
  userAgent?: string;
  url?: string;
  metadata?: Record<string, unknown>;
  stack?: string;
  fingerprint?: string; // For error deduplication
  environment: string;
  version: string;
}

export interface MetricEntry {
  id: string;
  timestamp: number;
  name: string;
  type: MetricType;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  userId?: string;
  sessionId: string;
  environment: string;
}

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  metadata?: Record<string, unknown>;
  userId?: string;
  sessionId: string;
  url?: string;
  route?: string;
}

export interface ErrorMetric {
  id: string;
  timestamp: number;
  name: string;
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  filename?: string;
  userId?: string;
  sessionId: string;
  userAgent?: string;
  url?: string;
  componentStack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'javascript' | 'network' | 'render' | 'security' | 'validation' | 'business';
  fingerprint: string;
  environment: string;
  resolved?: boolean;
  occurences: number;
}

export interface UserActivityMetric {
  id: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  action: string;
  category: 'navigation' | 'interaction' | 'form' | 'media' | 'wellness' | 'crisis';
  element?: string;
  value?: string | number;
  duration?: number;
  metadata?: Record<string, unknown>;
  url?: string;
  route?: string;
}

export interface HealthMetric {
  id: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  type: 'mood' | 'wellness_check' | 'journal_entry' | 'therapy_session' | 'crisis_event' | 'goal_progress';
  value?: number;
  scale?: string; // e.g., "1-10", "likert-5"
  category?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  isPrivate: boolean; // Extra privacy protection for mental health data
  encrypted?: boolean;
}

export interface SystemHealthMetric {
  id: string;
  timestamp: number;
  metric: 'cpu_usage' | 'memory_usage' | 'response_time' | 'error_rate' | 'uptime' | 'db_connections';
  value: number;
  unit: string;
  service?: string;
  instance?: string;
  region?: string;
  environment: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: 'login_attempt' | 'failed_auth' | 'suspicious_activity' | 'data_access' | 'permission_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  blocked: boolean;
  environment: string;
}

export interface MonitoringConfig {
  enabled: boolean;
  environment: 'development' | 'staging' | 'production';
  version: string;
  
  // Logging configuration
  logging: {
    level: LogLevel;
    enableConsole: boolean;
    enableRemote: boolean;
    bufferSize: number;
    flushInterval: number; // milliseconds
    enablePerformance: boolean;
    enableUserActivity: boolean;
  };
  
  // Error tracking
  errorTracking: {
    enabled: boolean;
    sampleRate: number; // 0-1
    enableSourceMaps: boolean;
    ignoreErrors: RegExp[];
    enableUserFeedback: boolean;
  };
  
  // Performance monitoring
  performance: {
    enabled: boolean;
    sampleRate: number; // 0-1
    enableWebVitals: boolean;
    enableResourceTiming: boolean;
    enableUserTiming: boolean;
    longTaskThreshold: number; // milliseconds
  };
  
  // User activity tracking
  userActivity: {
    enabled: boolean;
    enableClicks: boolean;
    enableFormSubmissions: boolean;
    enablePageViews: boolean;
    enableScrollTracking: boolean;
    enableTimeOnPage: boolean;
    enableHeatmaps: boolean;
    privacyMode: boolean; // Anonymize sensitive data
  };
  
  // Health metrics (mental health specific)
  healthMetrics: {
    enabled: boolean;
    encryptSensitiveData: boolean;
    enableMoodTracking: boolean;
    enableJournalAnalytics: boolean;
    enableCrisisDetection: boolean;
    dataRetentionDays: number;
  };
  
  // System health monitoring
  systemHealth: {
    enabled: boolean;
    checkInterval: number; // milliseconds
    enableResourceMonitoring: boolean;
    enableApiMonitoring: boolean;
    enableDatabaseMonitoring: boolean;
  };
  
  // Security monitoring
  security: {
    enabled: boolean;
    enableLoginMonitoring: boolean;
    enableSuspiciousActivityDetection: boolean;
    enableDataAccessTracking: boolean;
    enableThreatDetection: boolean;
  };
  
  // Privacy and compliance
  privacy: {
    enableGDPRCompliance: boolean;
    enableHIPAACompliance: boolean;
    enableCCPACompliance: boolean;
    anonymizeIP: boolean;
    enableConsentTracking: boolean;
    dataRetentionDays: number;
    enableDataDeletion: boolean;
  };
  
  // Remote endpoints
  endpoints: {
    logs: string;
    metrics: string;
    errors: string;
    performance: string;
    health: string;
    security: string;
  };
  
  // API configuration
  api: {
    timeout: number;
    retries: number;
    batchSize: number;
    enableCompression: boolean;
    enableEncryption: boolean;
  };
}

export interface MonitoringAlert {
  id: string;
  timestamp: number;
  type: 'error_spike' | 'performance_degradation' | 'security_incident' | 'system_down' | 'crisis_event';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metrics?: Record<string, number>;
  metadata?: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  actions?: string[];
  environment: string;
}

export interface MonitoringDashboard {
  timestamp: number;
  timeRange: '1h' | '24h' | '7d' | '30d';
  
  // System overview
  system: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
    activeUsers: number;
  };
  
  // Application metrics
  application: {
    pageViews: number;
    uniqueUsers: number;
    sessionDuration: number;
    bounceRate: number;
    conversionRate: number;
  };
  
  // Mental health specific metrics
  wellness: {
    moodEntries: number;
    journalEntries: number;
    wellnessCheckins: number;
    crisisInterventions: number;
    therapySessionsCompleted: number;
    averageMoodScore: number;
    wellnessGoalCompletions: number;
  };
  
  // Performance metrics
  performance: {
    loadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
    timeToInteractive: number;
  };
  
  // Error metrics
  errors: {
    totalErrors: number;
    errorRate: number;
    criticalErrors: number;
    resolvedErrors: number;
    topErrors: Array<{
      message: string;
      count: number;
      lastSeen: number;
    }>;
  };
  
  // Security metrics
  security: {
    loginAttempts: number;
    failedLogins: number;
    suspiciousActivity: number;
    blockedRequests: number;
    securityAlerts: number;
  };
}

// Event types for mental health platform
export type WellnessEvent = 
  | 'mood_entry_created'
  | 'mood_trend_detected'
  | 'journal_entry_saved'
  | 'wellness_goal_created'
  | 'wellness_goal_completed'
  | 'breathing_exercise_started'
  | 'breathing_exercise_completed'
  | 'meditation_session_started'
  | 'meditation_session_completed'
  | 'therapy_session_scheduled'
  | 'therapy_session_completed'
  | 'crisis_button_pressed'
  | 'emergency_contact_used'
  | 'safety_plan_accessed'
  | 'coping_strategy_used'
  | 'support_resource_accessed';

export type SystemEvent = 
  | 'user_registered'
  | 'user_login'
  | 'user_logout'
  | 'session_expired'
  | 'password_reset'
  | 'email_verified'
  | 'profile_updated'
  | 'preferences_changed'
  | 'notification_sent'
  | 'file_uploaded'
  | 'payment_processed'
  | 'subscription_updated'
  | 'data_exported'
  | 'data_deleted'
  | 'consent_updated';

export interface EventPayload {
  event: WellnessEvent | SystemEvent | string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
  sensitive?: boolean; // Flag for mental health sensitive data
}