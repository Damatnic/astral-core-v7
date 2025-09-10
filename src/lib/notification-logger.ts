/**
 * Notification logging utility for Astral Core v7
 * Used for operational notifications that would have been console.log statements
 */

import { logger } from './logger';

export enum NotificationType {
  SYSTEM_EVENT = 'SYSTEM_EVENT',
  USER_ACTION = 'USER_ACTION',
  DATA_SYNC = 'DATA_SYNC',
  INTEGRATION = 'INTEGRATION',
  PERFORMANCE = 'PERFORMANCE',
  CLEANUP = 'CLEANUP'
}

export interface NotificationEntry {
  type: NotificationType;
  event: string;
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

class NotificationLogger {
  private static instance: NotificationLogger;

  private constructor() {}

  public static getInstance(): NotificationLogger {
    if (!NotificationLogger.instance) {
      NotificationLogger.instance = new NotificationLogger();
    }
    return NotificationLogger.instance;
  }

  private logNotification(
    type: NotificationType,
    event: string,
    message: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    const entry: NotificationEntry = {
      type,
      event,
      message,
      userId,
      metadata,
      timestamp: new Date().toISOString()
    };

    // Use the structured logger with INFO level
    logger.info(`${type}: ${event} - ${message}`, 'NOTIFICATION', {
      notificationType: type,
      event,
      userId,
      ...metadata
    });
  }

  // System events (connections, initializations, etc.)
  public systemEvent(event: string, message: string, metadata?: Record<string, any>): void {
    this.logNotification(NotificationType.SYSTEM_EVENT, event, message, undefined, metadata);
  }

  // User actions and interactions
  public userAction(
    event: string,
    message: string,
    userId: string,
    metadata?: Record<string, any>
  ): void {
    this.logNotification(NotificationType.USER_ACTION, event, message, userId, metadata);
  }

  // Data synchronization events
  public dataSync(event: string, message: string, metadata?: Record<string, any>): void {
    this.logNotification(NotificationType.DATA_SYNC, event, message, undefined, metadata);
  }

  // External integration events
  public integration(event: string, message: string, metadata?: Record<string, any>): void {
    this.logNotification(NotificationType.INTEGRATION, event, message, undefined, metadata);
  }

  // Performance and monitoring events
  public performance(event: string, message: string, metadata?: Record<string, any>): void {
    this.logNotification(NotificationType.PERFORMANCE, event, message, undefined, metadata);
  }

  // Cleanup and maintenance events
  public cleanup(event: string, message: string, metadata?: Record<string, any>): void {
    this.logNotification(NotificationType.CLEANUP, event, message, undefined, metadata);
  }
}

// Export singleton instance
export const notificationLogger = NotificationLogger.getInstance();

// Convenience functions
export const logSystemEvent = (event: string, message: string, metadata?: Record<string, any>) => {
  notificationLogger.systemEvent(event, message, metadata);
};

export const logUserAction = (
  event: string,
  message: string,
  userId: string,
  metadata?: Record<string, any>
) => {
  notificationLogger.userAction(event, message, userId, metadata);
};

export const logDataSync = (event: string, message: string, metadata?: Record<string, any>) => {
  notificationLogger.dataSync(event, message, metadata);
};

export const logIntegration = (event: string, message: string, metadata?: Record<string, any>) => {
  notificationLogger.integration(event, message, metadata);
};

export const logPerformance = (event: string, message: string, metadata?: Record<string, any>) => {
  notificationLogger.performance(event, message, metadata);
};

export const logCleanup = (event: string, message: string, metadata?: Record<string, any>) => {
  notificationLogger.cleanup(event, message, metadata);
};
