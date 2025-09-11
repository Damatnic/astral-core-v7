// Webhook system types for mental health platform integrations

export type WebhookEvent = 
  // User events
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.verified'
  | 'user.deactivated'
  
  // Authentication events
  | 'auth.login'
  | 'auth.logout'
  | 'auth.password_reset'
  | 'auth.mfa_enabled'
  | 'auth.mfa_disabled'
  
  // Mental health events
  | 'wellness.mood_entry'
  | 'wellness.goal_created'
  | 'wellness.goal_completed'
  | 'wellness.check_in'
  | 'wellness.progress_milestone'
  
  // Journal events
  | 'journal.entry_created'
  | 'journal.entry_updated'
  | 'journal.entry_deleted'
  | 'journal.milestone_reached'
  
  // Therapy events
  | 'therapy.session_scheduled'
  | 'therapy.session_completed'
  | 'therapy.session_cancelled'
  | 'therapy.assignment_created'
  | 'therapy.assignment_completed'
  
  // Crisis events
  | 'crisis.alert_triggered'
  | 'crisis.help_requested'
  | 'crisis.safety_plan_activated'
  | 'crisis.emergency_contact_notified'
  
  // System events
  | 'system.backup_completed'
  | 'system.maintenance_started'
  | 'system.maintenance_completed'
  | 'system.error_occurred'
  | 'system.performance_alert'
  
  // Payment events
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  
  // Notification events
  | 'notification.sent'
  | 'notification.delivered'
  | 'notification.failed'
  | 'notification.read'
  
  // Integration events
  | 'integration.connected'
  | 'integration.disconnected'
  | 'integration.sync_completed'
  | 'integration.sync_failed';

export type WebhookPriority = 'low' | 'normal' | 'high' | 'critical';

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: number;
  version: string;
  data: Record<string, any>;
  metadata?: {
    userId?: string;
    sessionId?: string;
    source?: string;
    environment?: string;
    sensitive?: boolean; // For HIPAA compliance
    encrypted?: boolean;
    [key: string]: any;
  };
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  enabled: boolean;
  description?: string;
  headers?: Record<string, string>;
  timeout: number; // in milliseconds
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number; // in milliseconds
    maxDelay: number; // in milliseconds
  };
  filterCriteria?: {
    userId?: string[];
    metadata?: Record<string, any>;
    conditions?: WebhookCondition[];
  };
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  created: number;
  updated: number;
  lastSuccess?: number;
  lastFailure?: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
}

export interface WebhookCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  endpointId: string;
  payload: WebhookPayload;
  status: 'pending' | 'delivered' | 'failed' | 'retrying' | 'cancelled';
  attempts: number;
  maxAttempts: number;
  nextRetry?: number;
  lastAttempt?: number;
  response?: {
    status: number;
    headers: Record<string, string>;
    body: string;
    duration: number;
  };
  error?: string;
  created: number;
  completed?: number;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  endpointId: string;
  event: WebhookEvent;
  timestamp: number;
  status: 'success' | 'failure' | 'retry' | 'timeout';
  responseTime: number;
  responseStatus?: number;
  error?: string;
  retryCount: number;
  payload: WebhookPayload;
}

export interface WebhookConfiguration {
  enabled: boolean;
  maxConcurrentDeliveries: number;
  defaultTimeout: number;
  defaultRetryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
    maxDelay: number;
  };
  security: {
    enableSignatureVerification: boolean;
    signatureHeader: string;
    signatureMethod: 'hmac-sha256' | 'hmac-sha512';
    enableIpWhitelist: boolean;
    allowedIps?: string[];
  };
  delivery: {
    enableBatching: boolean;
    batchSize: number;
    batchTimeout: number;
    enableCompression: boolean;
    compressionThreshold: number;
  };
  monitoring: {
    enableMetrics: boolean;
    enableLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    alertOnFailures: boolean;
    failureThreshold: number;
  };
  compliance: {
    enableHIPAA: boolean;
    enableGDPR: boolean;
    dataRetentionDays: number;
    enableEncryption: boolean;
    encryptionKey?: string;
  };
}

export interface WebhookMetrics {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageResponseTime: number;
  deliveryRate: number;
  errorRate: number;
  retryRate: number;
  
  // Time-based metrics
  deliveriesLast24h: number;
  deliveriesLastWeek: number;
  deliveriesLastMonth: number;
  
  // Event distribution
  eventCounts: Record<WebhookEvent, number>;
  
  // Endpoint performance
  endpointMetrics: Array<{
    endpointId: string;
    url: string;
    successRate: number;
    averageResponseTime: number;
    lastDelivery: number;
    totalDeliveries: number;
  }>;
  
  // Error analysis
  commonErrors: Array<{
    error: string;
    count: number;
    lastSeen: number;
  }>;
}

export interface WebhookAlert {
  id: string;
  type: 'endpoint_failure' | 'high_error_rate' | 'slow_delivery' | 'security_issue' | 'quota_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  endpointId?: string;
  webhookId?: string;
  timestamp: number;
  acknowledged: boolean;
  resolvedAt?: number;
  metadata?: Record<string, any>;
}

// Mental health specific webhook events
export interface WellnessWebhookPayload extends WebhookPayload {
  event: 'wellness.mood_entry' | 'wellness.goal_created' | 'wellness.goal_completed' | 'wellness.check_in' | 'wellness.progress_milestone';
  data: {
    userId: string;
    moodScore?: number;
    moodNote?: string;
    goalId?: string;
    goalType?: string;
    progress?: number;
    checkInType?: string;
    milestone?: string;
    timestamp: number;
    metadata?: Record<string, any>;
  };
  metadata: {
    userId: string;
    sessionId?: string;
    source: 'mobile_app' | 'web_app' | 'api';
    environment: string;
    sensitive: true; // Always sensitive for mental health data
    encrypted: boolean;
  };
}

export interface CrisisWebhookPayload extends WebhookPayload {
  event: 'crisis.alert_triggered' | 'crisis.help_requested' | 'crisis.safety_plan_activated' | 'crisis.emergency_contact_notified';
  data: {
    userId: string;
    crisisType: 'suicidal_ideation' | 'panic_attack' | 'severe_depression' | 'substance_abuse' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    location?: {
      latitude?: number;
      longitude?: number;
      address?: string;
    };
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
    safetyPlan?: {
      stepId: string;
      stepDescription: string;
    };
    timestamp: number;
    metadata?: Record<string, any>;
  };
  metadata: {
    userId: string;
    sessionId?: string;
    source: 'mobile_app' | 'web_app' | 'panic_button' | 'api';
    environment: string;
    sensitive: true;
    encrypted: true;
    priority: 'critical';
  };
}

export interface TherapyWebhookPayload extends WebhookPayload {
  event: 'therapy.session_scheduled' | 'therapy.session_completed' | 'therapy.session_cancelled' | 'therapy.assignment_created' | 'therapy.assignment_completed';
  data: {
    sessionId?: string;
    therapistId?: string;
    clientId: string;
    sessionType?: 'individual' | 'group' | 'family' | 'couples';
    duration?: number;
    notes?: string;
    assignmentId?: string;
    assignmentType?: string;
    dueDate?: number;
    completedDate?: number;
    timestamp: number;
    metadata?: Record<string, any>;
  };
  metadata: {
    userId: string;
    sessionId?: string;
    source: 'scheduling_system' | 'therapist_portal' | 'client_app' | 'api';
    environment: string;
    sensitive: true;
    encrypted: boolean;
  };
}

// Webhook security
export interface WebhookSignature {
  timestamp: number;
  signature: string;
  body: string;
}

export interface WebhookSecurityConfig {
  verifySignatures: boolean;
  timestampTolerance: number; // in seconds
  requireHttps: boolean;
  enableIpWhitelist: boolean;
  allowedIps: string[];
  enableRateLimit: boolean;
  rateLimit: {
    requests: number;
    windowMs: number;
  };
}

// Webhook testing and simulation
export interface WebhookTest {
  id: string;
  endpointId: string;
  event: WebhookEvent;
  payload: WebhookPayload;
  expectedResponse?: {
    status: number;
    headers?: Record<string, string>;
    body?: string;
  };
  result?: {
    success: boolean;
    responseTime: number;
    response: {
      status: number;
      headers: Record<string, string>;
      body: string;
    };
    error?: string;
  };
  timestamp: number;
}

export interface WebhookSimulation {
  id: string;
  name: string;
  description: string;
  events: Array<{
    event: WebhookEvent;
    delay: number; // milliseconds after previous event
    payload: Partial<WebhookPayload>;
  }>;
  targets: string[]; // endpoint IDs
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  results: Array<{
    event: WebhookEvent;
    timestamp: number;
    deliveries: Array<{
      endpointId: string;
      success: boolean;
      responseTime: number;
      error?: string;
    }>;
  }>;
  created: number;
  started?: number;
  completed?: number;
}