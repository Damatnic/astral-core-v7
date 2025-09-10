/**
 * Notification Logger Utility
 * Logs system events and notifications for monitoring and debugging
 */

import { logger } from './logger';

export interface SystemEvent {
  type: 'notification' | 'websocket' | 'system' | 'user_action';
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export const logSystemEvent = (
  eventType: SystemEvent['type'],
  action: string,
  metadata?: Record<string, unknown>,
  userId?: string
): void => {
  logger.info(`System Event: ${eventType}`, 'system-events', {
    action,
    userId,
    ...metadata
  });
};

export const logNotificationEvent = (
  action: 'sent' | 'delivered' | 'failed' | 'opened',
  notificationId: string,
  userId: string,
  metadata?: Record<string, unknown>
): void => {
  logSystemEvent('notification', action, {
    notificationId,
    ...metadata
  }, userId);
};

export const logWebSocketEvent = (
  action: 'connect' | 'disconnect' | 'message' | 'error',
  userId?: string,
  metadata?: Record<string, unknown>
): void => {
  logSystemEvent('websocket', action, metadata, userId);
};

export const logUserAction = (
  action: string,
  userId: string,
  metadata?: Record<string, unknown>
): void => {
  logSystemEvent('user_action', action, metadata, userId);
};