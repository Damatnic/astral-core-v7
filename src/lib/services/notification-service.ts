import { prisma } from '@/lib/db';
import { websocketServer } from '@/lib/websocket/server';
import { NotificationType, NotificationPriority, Prisma } from '@prisma/client';

import { audit } from '@/lib/security/audit';
import { logError, logInfo, logCleanup } from '@/lib/logger';

interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  actionUrl?: string;
  metadata?: Prisma.InputJsonValue;
}

interface PushNotification {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

/**
 * Comprehensive notification service with multi-channel delivery
 * Supports real-time WebSocket, email, push notifications, and database persistence
 * Includes batching, queuing, and template-based notifications for healthcare workflows
 */
export class NotificationService {
  private readonly batchSize = 100;

  private notificationQueue: NotificationPayload[] = [];
  private processingQueue = false;

  /**
   * Create a new notification with multi-channel delivery
   * Automatically sends via WebSocket, push, and email based on priority
   * @param {NotificationPayload} payload - Notification data
   * @param {string} payload.userId - User ID to send notification to
   * @param {string} payload.title - Notification title
   * @param {string} payload.message - Notification message content
   * @param {NotificationType} payload.type - Type of notification
   * @param {NotificationPriority} [payload.priority='NORMAL'] - Priority level
   * @param {string} [payload.actionUrl] - URL for notification action
   * @param {any} [payload.metadata] - Additional metadata
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await notificationService.createNotification({
   *   userId: 'user_123',
   *   title: 'Appointment Reminder',
   *   message: 'You have an appointment in 1 hour',
   *   type: 'APPOINTMENT',
   *   priority: 'HIGH'
   * });
   * ```
   */
  async createNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Create database record
      const notification = await prisma.notification.create({
        data: {
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          priority: payload.priority || 'NORMAL',
          actionUrl: payload.actionUrl || null,
          metadata: payload.metadata || Prisma.JsonNull
        }
      });

      // Send real-time notification via WebSocket
      // Map priority to WebSocket type
      const mapPriority = (priority: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' => {
        switch (priority) {
          case 'LOW':
            return 'LOW';
          case 'NORMAL':
            return 'MEDIUM';
          case 'HIGH':
            return 'HIGH';
          case 'URGENT':
            return 'URGENT';
          default:
            return 'MEDIUM';
        }
      };

      const notificationMessage: {
        type: 'notification';
        notificationId: string;
        title: string;
        message: string;
        priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
        timestamp: number;
        metadata: Record<string, unknown>;
        actionUrl?: string;
      } = {
        type: 'notification' as const,
        notificationId: notification.id,
        title: notification.title,
        message: notification.message,
        priority: mapPriority(notification.priority),
        timestamp: notification.createdAt.getTime(),
        metadata: {}
      };

      if (notification.actionUrl) {
        notificationMessage.actionUrl = notification.actionUrl;
      }

      websocketServer.sendToUser(payload.userId, 'notification:new', notificationMessage);

      // Send push notification if user has enabled it
      await this.sendPushNotification({
        userId: payload.userId,
        title: payload.title,
        body: payload.message,
        data: {
          notificationId: notification.id,
          type: payload.type,
          actionUrl: payload.actionUrl
        }
      });

      // Send email for high priority notifications
      if (payload.priority === 'HIGH' || payload.priority === 'URGENT') {
        await this.sendEmailNotification(payload.userId, {
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          priority: payload.priority,
          ...(notification.actionUrl && { actionUrl: notification.actionUrl }),
          ...(payload.metadata && { metadata: payload.metadata })
        });
      }

      // Audit log
      await audit.logSuccess(
        'NOTIFICATION_SENT',
        'Notification',
        notification.id,
        { type: payload.type, priority: payload.priority },
        payload.userId
      );
    } catch (error) {
      logError(
        'Failed to create notification',
        error instanceof Error ? error : new Error(String(error)),
        'notification-service'
      );
      throw error;
    }
  }

  /**
   * Create multiple notifications efficiently in batches
   * Queues notifications and processes them in configurable batch sizes
   * @param {NotificationPayload[]} notifications - Array of notifications to create
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await notificationService.createBatchNotifications([
   *   { userId: 'user_1', title: 'Update 1', message: 'Content 1', type: 'SYSTEM' },
   *   { userId: 'user_2', title: 'Update 2', message: 'Content 2', type: 'SYSTEM' }
   * ]);
   * ```
   */
  async createBatchNotifications(notifications: NotificationPayload[]): Promise<void> {
    this.notificationQueue.push(...notifications);

    if (!this.processingQueue) {
      await this.processBatchQueue();
    }
  }

  private async processBatchQueue(): Promise<void> {
    this.processingQueue = true;

    while (this.notificationQueue.length > 0) {
      const batch = this.notificationQueue.splice(0, this.batchSize);

      try {
        // Create all notifications in database
        await prisma.notification.createMany({
          data: batch.map(n => ({
            userId: n.userId,
            title: n.title,
            message: n.message,
            type: n.type,
            priority: n.priority || 'NORMAL',
            actionUrl: n.actionUrl || null,
            ...(n.metadata && { metadata: n.metadata })
          }))
        });

        // Send WebSocket notifications
        batch.forEach(notification => {
          websocketServer.sendToUser(notification.userId, 'notification:new', {
            type: 'notification',
            notificationId: `notification_${Date.now()}`,
            title: notification.title,
            message: notification.message,
            priority: (notification.priority === 'NORMAL' ? 'MEDIUM' : notification.priority) as
              | 'LOW'
              | 'MEDIUM'
              | 'HIGH'
              | 'URGENT',
            ...(notification.actionUrl && { actionUrl: notification.actionUrl }),
            timestamp: Date.now(),
            userId: notification.userId
          });
        });
      } catch (error) {
        logError(
          'Batch notification error',
          error instanceof Error ? error : new Error(String(error)),
          'notification-service'
        );
        // Re-queue failed notifications for retry
        this.notificationQueue.unshift(...batch);
      }
    }

    this.processingQueue = false;
  }

  /**
   * Mark a specific notification as read and update unread count
   * Sends real-time update via WebSocket to update UI
   * @param {string} notificationId - ID of notification to mark as read
   * @param {string} userId - User ID for authorization
   * @returns {Promise<void>}
   * @throws {Error} If notification not found or not owned by user
   * @example
   * ```typescript
   * await notificationService.markAsRead('notif_123', 'user_456');
   * ```
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    // Update unread count via WebSocket
    const unreadCount = await this.getUnreadCount(userId);
    websocketServer.sendToUser(userId, 'notification:read', {
      type: 'data',
      data: {
        notificationId,
        unreadCount
      },
      timestamp: Date.now(),
      userId
    });
  }

  /**
   * Mark all unread notifications as read for a user
   * Bulk operation with real-time UI update
   * @param {string} userId - User ID to mark all notifications as read for
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await notificationService.markAllAsRead('user_123');
   * ```
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    websocketServer.sendToUser(userId, 'notification:all_read', {
      type: 'data',
      data: {},
      timestamp: Date.now(),
      userId
    });
  }

  /**
   * Get notifications for a user with filtering and pagination
   * Returns notifications with total count and unread count
   * @param {string} userId - User ID to get notifications for
   * @param {Object} [options={}] - Query options
   * @param {number} [options.limit=20] - Maximum notifications to return
   * @param {number} [options.offset=0] - Number of notifications to skip
   * @param {boolean} [options.unreadOnly=false] - Return only unread notifications
   * @param {NotificationType} [options.type] - Filter by notification type
   * @returns {Promise<Object>} Paginated notifications with metadata
   * @returns {Notification[]} returns.items - Array of notifications
   * @returns {number} returns.total - Total matching notifications
   * @returns {number} returns.unread - Total unread notifications
   * @example
   * ```typescript
   * const result = await notificationService.getUserNotifications('user_123', {
   *   unreadOnly: true,
   *   limit: 10
   * });
   * ```
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {}
  ) {
    const where: {
      userId: string;
      isRead?: boolean;
      type?: NotificationType;
    } = { userId };

    if (options.unreadOnly) {
      where.isRead = false;
    }

    if (options.type) {
      where.type = options.type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0
      }),
      prisma.notification.count({ where })
    ]);

    return {
      items: notifications,
      total,
      unread: await this.getUnreadCount(userId)
    };
  }

  /**
   * Get count of unread notifications for a user
   * Used for displaying notification badges in UI
   * @param {string} userId - User ID to get unread count for
   * @returns {Promise<number>} Number of unread notifications
   * @example
   * ```typescript
   * const unreadCount = await notificationService.getUnreadCount('user_123');
   * // Display badge with unreadCount
   * ```
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
  }

  /**
   * Delete a specific notification
   * Removes from database and sends real-time update
   * @param {string} notificationId - ID of notification to delete
   * @param {string} userId - User ID for authorization
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await notificationService.deleteNotification('notif_123', 'user_456');
   * ```
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId
      }
    });

    websocketServer.sendToUser(userId, 'notification:deleted', {
      type: 'data',
      data: {
        notificationId
      },
      timestamp: Date.now(),
      userId
    });
  }

  /**
   * Clear old read notifications to maintain database performance
   * Typically run as scheduled cleanup job
   * @param {number} [daysOld=30] - Delete notifications older than this many days
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * // Clean up notifications older than 60 days
   * await notificationService.clearOldNotifications(60);
   * ```
   */
  async clearOldNotifications(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleted = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        isRead: true
      }
    });

    logCleanup('old-notifications', `Cleared ${deleted.count} old notifications`);
  }

  /**
   * Send push notification to user's registered devices
   * Integrates with FCM/APNS in production environment
   * @private
   * @param {PushNotification} notification - Push notification data
   * @returns {Promise<void>}
   */
  private async sendPushNotification(notification: PushNotification): Promise<void> {
    try {
      // Get user's push subscription
      const subscription = await prisma.pushSubscription.findFirst({
        where: {
          userId: notification.userId,
          active: true
        }
      });

      if (!subscription) return;

      // In production, integrate with FCM/APNS
      // For now, just log
      logInfo('Push notification would be sent in production', 'notification-service', {
        userId: notification.userId,
        title: notification.title
      });
    } catch (error) {
      logError(
        'Push notification error',
        error instanceof Error ? error : new Error(String(error)),
        'notification-service'
      );
    }
  }

  /**
   * Send email notification for high-priority notifications
   * Integrates with email service provider in production
   * @private
   * @param {string} userId - User ID to send email to
   * @param {any} notification - Notification data for email content
   * @returns {Promise<void>}
   */
  private async sendEmailNotification(
    userId: string,
    notification: NotificationPayload
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      });

      if (!user?.email) return;

      // In production, integrate with email service
      // For now, just log
      logInfo('Email notification would be sent in production', 'notification-service', {
        email: user.email,
        subject: notification.title
      });
    } catch (error) {
      logError(
        'Email notification error',
        error instanceof Error ? error : new Error(String(error)),
        'notification-service'
      );
    }
  }

  /**
   * Send appointment reminder notification with time-sensitive priority
   * Priority increases as appointment time approaches
   * @param {string} userId - User ID to remind
   * @param {string} appointmentId - ID of appointment for action link
   * @param {Date} appointmentTime - Scheduled appointment time
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await notificationService.sendAppointmentReminder(
   *   'patient_123',
   *   'appt_456',
   *   new Date('2024-12-01T10:00:00Z')
   * );
   * ```
   */
  async sendAppointmentReminder(
    userId: string,
    appointmentId: string,
    appointmentTime: Date
  ): Promise<void> {
    const timeUntil = appointmentTime.getTime() - Date.now();
    const hours = Math.floor(timeUntil / (1000 * 60 * 60));

    await this.createNotification({
      userId,
      title: 'Appointment Reminder',
      message: `You have an appointment in ${hours} hour${hours !== 1 ? 's' : ''}`,
      type: 'APPOINTMENT',
      priority: hours <= 1 ? 'HIGH' : 'NORMAL',
      actionUrl: `/appointments/${appointmentId}`,
      metadata: { appointmentId, appointmentTime }
    });
  }

  /**
   * Send daily wellness check-in reminder
   * Encourages users to log their mood and wellness data
   * @param {string} userId - User ID to send check-in reminder to
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * // Send as part of daily scheduled job
   * await notificationService.sendWellnessCheckIn('user_123');
   * ```
   */
  async sendWellnessCheckIn(userId: string): Promise<void> {
    await this.createNotification({
      userId,
      title: 'Daily Wellness Check-in',
      message: 'How are you feeling today? Take a moment to log your mood and wellness.',
      type: 'WELLNESS',
      priority: 'NORMAL',
      actionUrl: '/wellness'
    });
  }

  /**
   * Send urgent crisis alert to therapist requiring immediate response
   * Highest priority notification for emergency situations
   * @param {string} therapistId - Therapist ID to alert
   * @param {string} clientId - Client ID in crisis
   * @param {string} interventionId - Crisis intervention record ID
   * @param {string} severity - Crisis severity level
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await notificationService.sendCrisisAlert(
   *   'therapist_123',
   *   'client_456',
   *   'intervention_789',
   *   'HIGH'
   * );
   * ```
   */
  async sendCrisisAlert(
    therapistId: string,
    clientId: string,
    interventionId: string,
    severity: string
  ): Promise<void> {
    await this.createNotification({
      userId: therapistId,
      title: 'Crisis Alert - Immediate Response Required',
      message: `A client requires immediate crisis intervention (${severity})`,
      type: 'CRISIS',
      priority: 'URGENT',
      actionUrl: `/crisis/respond/${interventionId}`,
      metadata: { clientId, interventionId, severity }
    });
  }

  /**
   * Send new message notification with preview
   * Notifies users of new messages in therapy communication
   * @param {string} recipientId - User ID to notify
   * @param {string} senderId - ID of message sender
   * @param {string} senderName - Display name of sender
   * @param {string} preview - Preview of message content (truncated)
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await notificationService.sendMessageNotification(
   *   'patient_123',
   *   'therapist_456',
   *   'Dr. Smith',
   *   'Thank you for attending today\'s session...'
   * );
   * ```
   */
  async sendMessageNotification(
    recipientId: string,
    senderId: string,
    senderName: string,
    preview: string
  ): Promise<void> {
    await this.createNotification({
      userId: recipientId,
      title: `New message from ${senderName}`,
      message: preview.substring(0, 100),
      type: 'MESSAGE',
      priority: 'NORMAL',
      actionUrl: `/messages/${senderId}`,
      metadata: { senderId }
    });
  }

  /**
   * Send notification when therapist adds session notes
   * Informs clients that session documentation is available
   * @param {string} clientId - Client ID to notify
   * @param {string} therapistName - Name of therapist who added notes
   * @param {string} sessionId - Session ID for action link
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await notificationService.sendSessionNote(
   *   'client_123',
   *   'Dr. Johnson',
   *   'session_456'
   * );
   * ```
   */
  async sendSessionNote(clientId: string, therapistName: string, sessionId: string): Promise<void> {
    await this.createNotification({
      userId: clientId,
      title: 'New Session Note Available',
      message: `${therapistName} has added notes from your recent session`,
      type: 'SESSION',
      priority: 'NORMAL',
      actionUrl: `/sessions/${sessionId}`,
      metadata: { sessionId }
    });
  }

  /**
   * Send congratulatory notification for goal achievement
   * Celebrates user progress in therapy goals
   * @param {string} userId - User ID to congratulate
   * @param {string} goalTitle - Title of achieved goal
   * @param {string} achievement - Description of achievement
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await notificationService.sendGoalAchievement(
   *   'user_123',
   *   'Daily Meditation',
   *   'completed 7 days in a row'
   * );
   * ```
   */
  async sendGoalAchievement(userId: string, goalTitle: string, achievement: string): Promise<void> {
    await this.createNotification({
      userId,
      title: 'Goal Achievement! 🎉',
      message: `Congratulations! You've ${achievement} for "${goalTitle}"`,
      type: 'ACHIEVEMENT',
      priority: 'NORMAL',
      actionUrl: '/goals',
      metadata: { goalTitle, achievement }
    });
  }

  /**
   * Send medication reminder notification
   * High-priority reminder for medication adherence
   * @param {string} userId - User ID to remind
   * @param {string} medicationName - Name of medication
   * @param {string} dosage - Medication dosage information
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await notificationService.sendMedicationReminder(
   *   'patient_123',
   *   'Sertraline',
   *   '50mg once daily'
   * );
   * ```
   */
  async sendMedicationReminder(
    userId: string,
    medicationName: string,
    dosage: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      title: 'Medication Reminder',
      message: `Time to take ${medicationName} (${dosage})`,
      type: 'MEDICATION',
      priority: 'HIGH',
      actionUrl: '/medications',
      metadata: { medicationName, dosage }
    });
  }

  /**
   * Schedule a notification to be sent at a future time
   * Uses setTimeout for demonstration - production should use job queue
   * @param {NotificationPayload} payload - Notification to schedule
   * @param {Date} scheduledFor - When to send the notification
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
   * await notificationService.scheduleNotification({
   *   userId: 'user_123',
   *   title: 'Weekly Check-in',
   *   message: 'How was your week?',
   *   type: 'WELLNESS'
   * }, tomorrow);
   * ```
   */
  async scheduleNotification(payload: NotificationPayload, scheduledFor: Date): Promise<void> {
    // In production, use a job queue like Bull or Agenda
    const delay = scheduledFor.getTime() - Date.now();

    if (delay <= 0) {
      await this.createNotification(payload);
    } else {
      setTimeout(() => {
        this.createNotification(payload);
      }, delay);
    }
  }

  /**
   * Get user's notification preferences
   * Returns settings for different notification channels and types
   * @param {string} userId - User ID to get preferences for
   * @returns {Promise<NotificationPreference | null>} User's notification preferences
   * @example
   * ```typescript
   * const prefs = await notificationService.getNotificationPreferences('user_123');
   * if (prefs?.email) {
   *   // User has email notifications enabled
   * }
   * ```
   */
  async getNotificationPreferences(userId: string) {
    return prisma.notificationPreference.findUnique({
      where: { userId }
    });
  }

  /**
   * Update user's notification preferences
   * Allows users to control which notifications they receive and how
   * @param {string} userId - User ID to update preferences for
   * @param {Object} preferences - Notification preference settings
   * @param {boolean} [preferences.email] - Enable email notifications
   * @param {boolean} [preferences.push] - Enable push notifications
   * @param {boolean} [preferences.sms] - Enable SMS notifications
   * @param {boolean} [preferences.appointments] - Enable appointment notifications
   * @param {boolean} [preferences.messages] - Enable message notifications
   * @param {boolean} [preferences.wellness] - Enable wellness notifications
   * @param {boolean} [preferences.crisis] - Enable crisis notifications
   * @returns {Promise<NotificationPreference>} Updated preferences
   * @example
   * ```typescript
   * await notificationService.updateNotificationPreferences('user_123', {
   *   email: true,
   *   push: false,
   *   appointments: true
   * });
   * ```
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
      appointments?: boolean;
      messages?: boolean;
      wellness?: boolean;
      crisis?: boolean;
    }
  ) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...preferences
      },
      update: preferences
    });
  }
}

/**
 * Pre-configured notification service instance for application-wide use
 * Handles all notification types with automatic batching and real-time delivery
 * @example
 * ```typescript
 * import { notificationService } from '@/lib/services/notification-service';
 *
 * // Send appointment reminder
 * await notificationService.sendAppointmentReminder(
 *   'patient_123',
 *   'appt_456',
 *   new Date()
 * );
 *
 * // Create custom notification
 * await notificationService.createNotification({
 *   userId: 'user_123',
 *   title: 'Custom Alert',
 *   message: 'This is a custom message',
 *   type: 'SYSTEM'
 * });
 * ```
 */
export const notificationService = new NotificationService();
