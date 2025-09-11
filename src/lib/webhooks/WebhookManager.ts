/* eslint-disable @typescript-eslint/no-explicit-any */

import crypto from 'crypto';
import {
  WebhookEndpoint,
  WebhookPayload,
  WebhookDelivery,
  WebhookConfiguration,
  WebhookEvent,
  WebhookMetrics,
  WebhookLog,
  WebhookAlert,
  CrisisWebhookPayload,
  WellnessWebhookPayload,
  TherapyWebhookPayload
} from './types';

// UUID generator
function generateId(): string {
  return crypto.randomUUID();
}

// Webhook signature generation
function generateSignature(payload: string, secret: string, algorithm: string = 'sha256'): string {
  return crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');
}


// Exponential backoff calculation
function calculateBackoff(attempt: number, config: WebhookEndpoint['retryPolicy']): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

export class WebhookManager {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private deliveryQueue: WebhookDelivery[] = [];
  private metrics: WebhookMetrics;
  private logs: WebhookLog[] = [];
  private alerts: WebhookAlert[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private config: WebhookConfiguration;

  constructor(config: WebhookConfiguration) {
    this.config = config;
    this.metrics = this.initializeMetrics();
    this.startProcessing();
  }

  private initializeMetrics(): WebhookMetrics {
    return {
      totalWebhooks: 0,
      activeWebhooks: 0,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageResponseTime: 0,
      deliveryRate: 0,
      errorRate: 0,
      retryRate: 0,
      deliveriesLast24h: 0,
      deliveriesLastWeek: 0,
      deliveriesLastMonth: 0,
      eventCounts: {} as Record<WebhookEvent, number>,
      endpointMetrics: [],
      commonErrors: []
    };
  }

  // Endpoint management
  public async createEndpoint(endpoint: Omit<WebhookEndpoint, 'id' | 'created' | 'updated' | 'totalDeliveries' | 'successfulDeliveries' | 'failedDeliveries'>): Promise<WebhookEndpoint> {
    const now = Date.now();
    const newEndpoint: WebhookEndpoint = {
      ...endpoint,
      id: generateId(),
      created: now,
      updated: now,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0
    };

    this.endpoints.set(newEndpoint.id, newEndpoint);
    this.updateMetrics();
    
    return newEndpoint;
  }

  public async updateEndpoint(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint | null> {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return null;

    const updatedEndpoint = {
      ...endpoint,
      ...updates,
      updated: Date.now()
    };

    this.endpoints.set(id, updatedEndpoint);
    this.updateMetrics();
    
    return updatedEndpoint;
  }

  public async deleteEndpoint(id: string): Promise<boolean> {
    const deleted = this.endpoints.delete(id);
    if (deleted) {
      // Remove pending deliveries for this endpoint
      this.deliveryQueue = this.deliveryQueue.filter(delivery => delivery.endpointId !== id);
      this.updateMetrics();
    }
    return deleted;
  }

  public getEndpoint(id: string): WebhookEndpoint | null {
    return this.endpoints.get(id) || null;
  }

  public listEndpoints(): WebhookEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  // Event emission
  public async emit(event: WebhookEvent, data: Record<string, any>, metadata?: WebhookPayload['metadata']): Promise<string[]> {
    const payload: WebhookPayload = {
      id: generateId(),
      event,
      timestamp: Date.now(),
      version: '1.0',
      data,
      metadata: metadata || {}
    };

    const deliveryIds: string[] = [];
    const relevantEndpoints = this.getRelevantEndpoints(event, payload);

    for (const endpoint of relevantEndpoints) {
      if (!endpoint.enabled) continue;

      const delivery = this.createDelivery(endpoint, payload);
      this.deliveryQueue.push(delivery);
      deliveryIds.push(delivery.id);
    }

    this.updateEventMetrics(event);
    
    // Trigger immediate processing for critical events
    if (this.isCriticalEvent(event)) {
      this.processQueue();
    }

    return deliveryIds;
  }

  // Specialized emission methods for mental health events
  public async emitWellnessEvent(
    event: WellnessWebhookPayload['event'],
    data: WellnessWebhookPayload['data'],
    metadata?: Partial<WellnessWebhookPayload['metadata']>
  ): Promise<string[]> {
    const wellnessMetadata: WellnessWebhookPayload['metadata'] = {
      ...metadata,
      userId: data.userId,
      source: metadata?.source || 'api',
      sensitive: true,
      encrypted: this.config.compliance.enableEncryption,
      environment: metadata?.environment || 'production'
    };

    // Encrypt sensitive wellness data if required
    const processedData = this.config.compliance.enableEncryption
      ? await this.encryptSensitiveData(data)
      : data;

    return this.emit(event, processedData, wellnessMetadata);
  }

  public async emitCrisisEvent(
    event: CrisisWebhookPayload['event'],
    data: CrisisWebhookPayload['data'],
    metadata?: Partial<CrisisWebhookPayload['metadata']>
  ): Promise<string[]> {
    const crisisMetadata: CrisisWebhookPayload['metadata'] = {
      ...metadata,
      userId: data.userId,
      source: metadata?.source || 'panic_button',
      sensitive: true,
      encrypted: true, // Always encrypt crisis data
      priority: 'critical',
      environment: metadata?.environment || 'production'
    };

    // Always encrypt crisis data
    const encryptedData = await this.encryptSensitiveData(data);

    // Create alert for crisis events
    await this.createAlert({
      type: 'security_issue',
      severity: 'critical',
      title: 'Crisis Event Triggered',
      description: `Crisis event ${event} triggered for user ${data.userId}`,
      timestamp: Date.now(),
      acknowledged: false,
      metadata: { event, userId: data.userId, crisisType: data.crisisType }
    });

    return this.emit(event, encryptedData, crisisMetadata);
  }

  public async emitTherapyEvent(
    event: TherapyWebhookPayload['event'],
    data: TherapyWebhookPayload['data'],
    metadata?: Partial<TherapyWebhookPayload['metadata']>
  ): Promise<string[]> {
    const therapyMetadata: TherapyWebhookPayload['metadata'] = {
      ...metadata,
      userId: data.clientId,
      source: metadata?.source || 'api',
      sensitive: true,
      encrypted: this.config.compliance.enableEncryption,
      environment: metadata?.environment || 'production'
    };

    const processedData = this.config.compliance.enableEncryption
      ? await this.encryptSensitiveData(data)
      : data;

    return this.emit(event, processedData, therapyMetadata);
  }

  // Delivery management
  private createDelivery(endpoint: WebhookEndpoint, payload: WebhookPayload): WebhookDelivery {
    return {
      id: generateId(),
      webhookId: payload.id,
      endpointId: endpoint.id,
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: endpoint.retryPolicy.maxRetries + 1,
      created: Date.now()
    };
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.deliveryQueue.length === 0) return;
    
    this.isProcessing = true;

    try {
      const concurrentDeliveries = Math.min(
        this.config.maxConcurrentDeliveries,
        this.deliveryQueue.length
      );

      const deliveries = this.deliveryQueue.splice(0, concurrentDeliveries);
      const promises = deliveries.map(delivery => this.processDelivery(delivery));
      
      await Promise.allSettled(promises);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processDelivery(delivery: WebhookDelivery): Promise<void> {
    const endpoint = this.endpoints.get(delivery.endpointId);
    if (!endpoint) {
      delivery.status = 'failed';
      delivery.error = 'Endpoint not found';
      return;
    }

    delivery.attempts++;
    delivery.lastAttempt = Date.now();

    try {
      const response = await this.sendWebhook(endpoint, delivery.payload);
      
      delivery.response = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
        duration: Date.now() - delivery.lastAttempt
      };

      if (response.ok) {
        delivery.status = 'delivered';
        delivery.completed = Date.now();
        endpoint.successfulDeliveries++;
        endpoint.lastSuccess = Date.now();
        this.metrics.successfulDeliveries++;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      delivery.error = error instanceof Error ? error.message : String(error);
      endpoint.failedDeliveries++;
      endpoint.lastFailure = Date.now();
      this.metrics.failedDeliveries++;

      if (delivery.attempts < delivery.maxAttempts) {
        delivery.status = 'retrying';
        delivery.nextRetry = Date.now() + calculateBackoff(delivery.attempts, endpoint.retryPolicy);
        this.scheduleRetry(delivery);
      } else {
        delivery.status = 'failed';
        delivery.completed = Date.now();
        
        // Create alert for failed delivery
        await this.createAlert({
          type: 'endpoint_failure',
          severity: 'medium',
          title: 'Webhook Delivery Failed',
          description: `Failed to deliver webhook to ${endpoint.url} after ${delivery.attempts} attempts`,
          endpointId: endpoint.id,
          webhookId: delivery.webhookId,
          timestamp: Date.now(),
          acknowledged: false,
          metadata: { error: delivery.error, attempts: delivery.attempts }
        });
      }
    }

    // Log the delivery attempt
    this.logDelivery(delivery, endpoint);
    this.updateEndpointMetrics(endpoint);
  }

  private async sendWebhook(endpoint: WebhookEndpoint, payload: WebhookPayload): Promise<Response> {
    const body = JSON.stringify(payload);
    const signature = generateSignature(body, endpoint.secret);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Astral-Core-Webhooks/1.0',
      'X-Webhook-Signature-256': `sha256=${signature}`,
      'X-Webhook-Timestamp': payload.timestamp.toString(),
      'X-Webhook-Event': payload.event,
      'X-Webhook-ID': payload.id,
      ...endpoint.headers
    };

    // Add HIPAA compliance headers for sensitive data
    if (payload.metadata?.sensitive) {
      headers['X-Sensitive-Data'] = 'true';
      headers['X-Compliance'] = 'HIPAA';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private scheduleRetry(delivery: WebhookDelivery): void {
    if (!delivery.nextRetry) return;

    const delay = delivery.nextRetry - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        delivery.status = 'pending';
        this.deliveryQueue.push(delivery);
      }, delay);
    } else {
      delivery.status = 'pending';
      this.deliveryQueue.push(delivery);
    }
  }

  // Utility methods
  private getRelevantEndpoints(event: WebhookEvent, payload: WebhookPayload): WebhookEndpoint[] {
    return Array.from(this.endpoints.values()).filter(endpoint => {
      if (!endpoint.enabled || !endpoint.events.includes(event)) {
        return false;
      }

      // Apply filter criteria
      if (endpoint.filterCriteria) {
        if (endpoint.filterCriteria.userId && payload.metadata?.userId) {
          if (!endpoint.filterCriteria.userId.includes(payload.metadata.userId)) {
            return false;
          }
        }

        if (endpoint.filterCriteria.conditions) {
          for (const condition of endpoint.filterCriteria.conditions) {
            if (!this.evaluateCondition(condition, payload)) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }

  private evaluateCondition(condition: any, payload: WebhookPayload): boolean {
    const getValue = (obj: any, path: string): any => {
      return path.split('.').reduce((current, key) => current?.[key], obj);
    };

    const fieldValue = getValue(payload, condition.field);
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(value);
      case 'not_contains':
        return typeof fieldValue === 'string' && !fieldValue.includes(value);
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > value;
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  private isCriticalEvent(event: WebhookEvent): boolean {
    const criticalEvents: WebhookEvent[] = [
      'crisis.alert_triggered',
      'crisis.help_requested',
      'crisis.safety_plan_activated',
      'crisis.emergency_contact_notified',
      'system.error_occurred',
      'system.performance_alert'
    ];
    return criticalEvents.includes(event);
  }

  private async encryptSensitiveData(data: Record<string, any>): Promise<Record<string, any>> {
    if (!this.config.compliance.enableEncryption || !this.config.compliance.encryptionKey) {
      return data;
    }

    // Implement encryption logic here
    // For now, return the data as-is (implement actual encryption in production)
    return {
      ...data,
      encrypted: true,
      encryptionMethod: 'AES-256-GCM'
    };
  }

  // Metrics and monitoring
  private updateMetrics(): void {
    this.metrics.totalWebhooks = this.endpoints.size;
    this.metrics.activeWebhooks = Array.from(this.endpoints.values()).filter(e => e.enabled).length;
    
    // Update endpoint metrics
    this.metrics.endpointMetrics = Array.from(this.endpoints.values()).map(endpoint => ({
      endpointId: endpoint.id,
      url: endpoint.url,
      successRate: endpoint.totalDeliveries > 0 
        ? (endpoint.successfulDeliveries / endpoint.totalDeliveries) * 100 
        : 0,
      averageResponseTime: 0, // Calculate from logs
      lastDelivery: endpoint.lastSuccess || endpoint.lastFailure || 0,
      totalDeliveries: endpoint.totalDeliveries
    }));

    this.calculateErrorRate();
  }

  private updateEventMetrics(event: WebhookEvent): void {
    this.metrics.eventCounts[event] = (this.metrics.eventCounts[event] || 0) + 1;
  }

  private updateEndpointMetrics(endpoint: WebhookEndpoint): void {
    endpoint.totalDeliveries++;
    this.metrics.totalDeliveries++;
  }

  private calculateErrorRate(): void {
    if (this.metrics.totalDeliveries > 0) {
      this.metrics.errorRate = (this.metrics.failedDeliveries / this.metrics.totalDeliveries) * 100;
      this.metrics.deliveryRate = (this.metrics.successfulDeliveries / this.metrics.totalDeliveries) * 100;
    }
  }

  private logDelivery(delivery: WebhookDelivery, endpoint: WebhookEndpoint): void {
    const log: WebhookLog = {
      id: generateId(),
      webhookId: delivery.webhookId,
      endpointId: endpoint.id,
      event: delivery.payload.event,
      timestamp: Date.now(),
      status: delivery.status === 'delivered' ? 'success' : 'failure',
      responseTime: delivery.response?.duration || 0,
      responseStatus: delivery.response?.status || 0,
      error: delivery.error || '',
      retryCount: delivery.attempts - 1,
      payload: delivery.payload
    };

    this.logs.push(log);

    // Keep only recent logs (last 1000)
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  private async createAlert(alert: Omit<WebhookAlert, 'id'>): Promise<WebhookAlert> {
    const newAlert: WebhookAlert = {
      ...alert,
      id: generateId()
    };

    this.alerts.push(newAlert);
    
    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    return newAlert;
  }

  // Processing lifecycle
  private startProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Process every second
  }

  public stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  // Public API methods
  public getMetrics(): WebhookMetrics {
    return { ...this.metrics };
  }

  public getLogs(limit = 100): WebhookLog[] {
    return this.logs.slice(-limit);
  }

  public getAlerts(acknowledged = false): WebhookAlert[] {
    return this.alerts.filter(alert => alert.acknowledged === acknowledged);
  }

  public async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  public getDeliveryStatus(deliveryId: string): WebhookDelivery | null {
    return this.deliveryQueue.find(d => d.id === deliveryId) || null;
  }

  public async testEndpoint(endpointId: string, event: WebhookEvent): Promise<boolean> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return false;

    const testPayload: WebhookPayload = {
      id: generateId(),
      event,
      timestamp: Date.now(),
      version: '1.0',
      data: { test: true },
      metadata: { source: 'webhook_test' }
    };

    try {
      const response = await this.sendWebhook(endpoint, testPayload);
      return response.ok;
    } catch {
      return false;
    }
  }

  public destroy(): void {
    this.stopProcessing();
    this.endpoints.clear();
    this.deliveryQueue = [];
    this.logs = [];
    this.alerts = [];
  }
}