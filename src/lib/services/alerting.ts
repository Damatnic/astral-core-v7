/**
 * Alerting Service
 * Handles critical error notifications and alerts
 */

import { ErrorSeverity } from '@/lib/utils/error-handling';

/**
 * Alert channel types
 */
export enum AlertChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  CONSOLE = 'console'
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  channels: AlertChannel[];
  emailRecipients?: string[];
  slackWebhookUrl?: string;
  customWebhookUrl?: string;
  smsNumbers?: string[];
  throttleMinutes?: number;
}

/**
 * Alert payload
 */
export interface AlertPayload {
  severity: ErrorSeverity;
  errorId: string;
  message: string;
  userId?: string;
  url?: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Alert throttling to prevent spam
 */
class AlertThrottle {
  private lastAlertTimes = new Map<string, number>();
  
  /**
   * Check if alert should be sent based on throttling
   */
  public shouldAlert(key: string, throttleMinutes: number): boolean {
    const now = Date.now();
    const lastAlert = this.lastAlertTimes.get(key);
    
    if (!lastAlert) {
      this.lastAlertTimes.set(key, now);
      return true;
    }
    
    const timeSinceLastAlert = now - lastAlert;
    const throttleMs = throttleMinutes * 60 * 1000;
    
    if (timeSinceLastAlert >= throttleMs) {
      this.lastAlertTimes.set(key, now);
      return true;
    }
    
    return false;
  }
  
  /**
   * Clear throttle cache
   */
  public clear(): void {
    this.lastAlertTimes.clear();
  }
}

/**
 * Alerting Service Implementation
 */
export class AlertingService {
  private config: AlertConfig;
  private throttle = new AlertThrottle();
  
  constructor(config: AlertConfig) {
    this.config = config;
  }
  
  /**
   * Send alert for critical errors
   */
  public async sendAlert(payload: AlertPayload): Promise<void> {
    // Check if should throttle
    const throttleKey = `${payload.severity}-${payload.message}`;
    const throttleMinutes = this.config.throttleMinutes || 15;
    
    if (!this.throttle.shouldAlert(throttleKey, throttleMinutes)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[AlertingService] Alert throttled:', throttleKey);
      }
      return;
    }
    
    // Send to configured channels
    const promises: Promise<void>[] = [];
    
    for (const channel of this.config.channels) {
      switch (channel) {
        case AlertChannel.EMAIL:
          promises.push(this.sendEmailAlert(payload));
          break;
        case AlertChannel.SLACK:
          promises.push(this.sendSlackAlert(payload));
          break;
        case AlertChannel.WEBHOOK:
          promises.push(this.sendWebhookAlert(payload));
          break;
        case AlertChannel.SMS:
          promises.push(this.sendSmsAlert(payload));
          break;
        case AlertChannel.CONSOLE:
          this.sendConsoleAlert(payload);
          break;
      }
    }
    
    // Execute all alerts in parallel
    await Promise.allSettled(promises);
  }
  
  /**
   * Send email alert
   */
  private async sendEmailAlert(payload: AlertPayload): Promise<void> {
    if (!this.config.emailRecipients?.length) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AlertingService] No email recipients configured');
      }
      return;
    }
    
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    if (process.env.NODE_ENV === 'development') {
      console.log('[AlertingService] Email alert would be sent to:', this.config.emailRecipients);
    }
    
    // Example integration with a hypothetical email service:
    /*
    await emailService.send({
      to: this.config.emailRecipients,
      subject: `[${payload.severity.toUpperCase()}] Error Alert: ${payload.errorId}`,
      html: this.formatEmailContent(payload),
      priority: payload.severity === ErrorSeverity.CRITICAL ? 'high' : 'normal'
    });
    */
  }
  
  /**
   * Send Slack alert
   */
  private async sendSlackAlert(payload: AlertPayload): Promise<void> {
    if (!this.config.slackWebhookUrl) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AlertingService] No Slack webhook URL configured');
      }
      return;
    }
    
    const color = this.getSeverityColor(payload.severity);
    
    const slackPayload = {
      attachments: [{
        color,
        title: `Error Alert: ${payload.errorId}`,
        fields: [
          {
            title: 'Severity',
            value: payload.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Timestamp',
            value: payload.timestamp,
            short: true
          },
          {
            title: 'Message',
            value: payload.message,
            short: false
          },
          ...(payload.userId ? [{
            title: 'User ID',
            value: payload.userId,
            short: true
          }] : []),
          ...(payload.url ? [{
            title: 'URL',
            value: payload.url,
            short: false
          }] : [])
        ],
        footer: 'Astral Core Monitoring',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    try {
      const response = await fetch(this.config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload)
      });
      
      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AlertingService] Failed to send Slack alert:', error);
      }
    }
  }
  
  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(payload: AlertPayload): Promise<void> {
    if (!this.config.customWebhookUrl) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AlertingService] No custom webhook URL configured');
      }
      return;
    }
    
    try {
      const response = await fetch(this.config.customWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error_alert',
          payload
        })
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AlertingService] Failed to send webhook alert:', error);
      }
    }
  }
  
  /**
   * Send SMS alert (for critical errors only)
   */
  private async sendSmsAlert(payload: AlertPayload): Promise<void> {
    // Only send SMS for critical errors
    if (payload.severity !== ErrorSeverity.CRITICAL) {
      return;
    }
    
    if (!this.config.smsNumbers?.length) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AlertingService] No SMS numbers configured');
      }
      return;
    }
    
    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    if (process.env.NODE_ENV === 'development') {
      console.log('[AlertingService] SMS alert would be sent to:', this.config.smsNumbers);
    }
    
    // Example integration with a hypothetical SMS service:
    /*
    await smsService.send({
      to: this.config.smsNumbers,
      message: `CRITICAL ERROR: ${payload.errorId} - ${payload.message.substring(0, 100)}`
    });
    */
  }
  
  /**
   * Send console alert (for development)
   */
  private sendConsoleAlert(payload: AlertPayload): void {
    const color = this.getSeverityColor(payload.severity);
    
    console.group(`%c[ALERT] ${payload.severity.toUpperCase()}`, `color: ${color}; font-weight: bold;`);
    console.error('Error ID:', payload.errorId);
    console.error('Message:', payload.message);
    console.error('Timestamp:', payload.timestamp);
    
    if (payload.userId) console.error('User ID:', payload.userId);
    if (payload.url) console.error('URL:', payload.url);
    if (payload.stackTrace) console.error('Stack Trace:', payload.stackTrace);
    if (payload.metadata) console.error('Metadata:', payload.metadata);
    
    console.groupEnd();
  }
  
  /**
   * Get color based on severity
   */
  private getSeverityColor(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return '#FF0000'; // Red
      case ErrorSeverity.HIGH:
        return '#FF6600'; // Orange
      case ErrorSeverity.MEDIUM:
        return '#FFCC00'; // Yellow
      case ErrorSeverity.LOW:
        return '#0099FF'; // Blue
      default:
        return '#808080'; // Gray
    }
  }
  
  /**
   * Format email content
   */
  private formatEmailContent(payload: AlertPayload): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: ${this.getSeverityColor(payload.severity)};">
          Error Alert: ${payload.errorId}
        </h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Severity</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${payload.severity.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Message</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${payload.message}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Timestamp</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${payload.timestamp}</td>
          </tr>
          ${payload.userId ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">User ID</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${payload.userId}</td>
          </tr>
          ` : ''}
          ${payload.url ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">URL</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${payload.url}</td>
          </tr>
          ` : ''}
        </table>
        
        ${payload.stackTrace ? `
        <h3>Stack Trace</h3>
        <pre style="background: #f5f5f5; padding: 10px; overflow-x: auto;">
${payload.stackTrace}
        </pre>
        ` : ''}
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          This is an automated alert from Astral Core Monitoring System.
        </p>
      </div>
    `;
  }
}

/**
 * Default alerting service instance
 */
let defaultService: AlertingService | null = null;

/**
 * Initialize default alerting service
 */
export function initializeAlerting(config: AlertConfig): void {
  defaultService = new AlertingService(config);
}

/**
 * Get default alerting service
 */
export function getAlertingService(): AlertingService | null {
  return defaultService;
}

/**
 * Send alert using default service
 */
export async function sendAlert(payload: AlertPayload): Promise<void> {
  if (!defaultService) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AlertingService] Service not initialized, using console fallback');
    }
    const fallbackService = new AlertingService({
      channels: [AlertChannel.CONSOLE]
    });
    await fallbackService.sendAlert(payload);
    return;
  }
  
  await defaultService.sendAlert(payload);
}

export default {
  AlertingService,
  initializeAlerting,
  getAlertingService,
  sendAlert,
  AlertChannel,
  ErrorSeverity
};