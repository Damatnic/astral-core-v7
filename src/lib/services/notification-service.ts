import prisma from '@/lib/db/prisma';
import { websocketServer } from '@/lib/websocket/server';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { phiService } from '@/lib/security/phi-service';
import { audit } from '@/lib/security/audit';

interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  actionUrl?: string;
  metadata?: any;
}

interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  template?: string;
  data?: any;
}

interface PushNotification {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

export class NotificationService {
  private readonly batchSize = 100;
  private readonly retryAttempts = 3;
  private notificationQueue: NotificationPayload[] = [];
  private processingQueue = false;

  // Create a notification
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
          actionUrl: payload.actionUrl,
          metadata: payload.metadata,
        },
      });

      // Send real-time notification via WebSocket
      websocketServer.sendToUser(payload.userId, 'notification:new', {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        timestamp: notification.createdAt,
      });

      // Send push notification if user has enabled it
      await this.sendPushNotification({
        userId: payload.userId,
        title: payload.title,
        body: payload.message,
        data: {
          notificationId: notification.id,
          type: payload.type,
          actionUrl: payload.actionUrl,
        },
      });

      // Send email for high priority notifications
      if (payload.priority === 'HIGH' || payload.priority === 'URGENT') {
        await this.sendEmailNotification(payload.userId, notification);
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
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  // Batch create notifications
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
        const created = await prisma.notification.createMany({
          data: batch.map(n => ({
            userId: n.userId,
            title: n.title,
            message: n.message,
            type: n.type,
            priority: n.priority || 'NORMAL',
            actionUrl: n.actionUrl,
            metadata: n.metadata,
          })),
        });

        // Send WebSocket notifications
        batch.forEach(notification => {
          websocketServer.sendToUser(notification.userId, 'notification:new', notification);
        });
      } catch (error) {
        console.error('Batch notification error:', error);
        // Re-queue failed notifications for retry
        this.notificationQueue.unshift(...batch);
      }
    }

    this.processingQueue = false;
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Update unread count via WebSocket
    const unreadCount = await this.getUnreadCount(userId);
    websocketServer.sendToUser(userId, 'notification:read', {
      notificationId,
      unreadCount,
    });
  }

  // Mark all as read
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    websocketServer.sendToUser(userId, 'notification:all_read', {
      timestamp: new Date(),
    });
  }

  // Get notifications for user
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {}
  ) {
    const where: any = { userId };
    
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
        skip: options.offset || 0,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      items: notifications,
      total,
      unread: await this.getUnreadCount(userId),
    };
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  // Delete notification
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });

    websocketServer.sendToUser(userId, 'notification:deleted', {
      notificationId,
    });
  }

  // Clear old notifications
  async clearOldNotifications(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleted = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        isRead: true,
      },
    });

    console.log(`Cleared ${deleted.count} old notifications`);
  }

  // Send push notification
  private async sendPushNotification(notification: PushNotification): Promise<void> {
    try {
      // Get user's push subscription
      const subscription = await prisma.pushSubscription.findFirst({
        where: {
          userId: notification.userId,
          active: true,
        },
      });

      if (!subscription) return;

      // In production, integrate with FCM/APNS
      // For now, just log
      console.log('Would send push notification:', notification);

      // Example FCM integration:
      // await fcm.send({
      //   to: subscription.token,
      //   notification: {
      //     title: notification.title,
      //     body: notification.body,
      //     icon: notification.icon,
      //   },
      //   data: notification.data,
      // });
    } catch (error) {
      console.error('Push notification error:', error);
    }
  }

  // Send email notification
  private async sendEmailNotification(userId: string, notification: any): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user?.email) return;

      // In production, integrate with email service
      // For now, just log
      console.log('Would send email to:', user.email, {
        subject: notification.title,
        body: notification.message,
      });

      // Example SendGrid integration:
      // await sendgrid.send({
      //   to: user.email,
      //   from: 'noreply@astralcore.com',
      //   subject: notification.title,
      //   text: notification.message,
      //   html: await renderEmailTemplate('notification', notification),
      // });
    } catch (error) {
      console.error('Email notification error:', error);
    }
  }

  // Notification templates
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
      metadata: { appointmentId, appointmentTime },
    });
  }

  async sendWellnessCheckIn(userId: string): Promise<void> {
    await this.createNotification({
      userId,
      title: 'Daily Wellness Check-in',
      message: 'How are you feeling today? Take a moment to log your mood and wellness.',
      type: 'WELLNESS',
      priority: 'NORMAL',
      actionUrl: '/wellness',
    });
  }

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
      metadata: { clientId, interventionId, severity },
    });
  }

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
      metadata: { senderId },
    });
  }

  async sendSessionNote(
    clientId: string,
    therapistName: string,
    sessionId: string
  ): Promise<void> {
    await this.createNotification({
      userId: clientId,
      title: 'New Session Note Available',
      message: `${therapistName} has added notes from your recent session`,
      type: 'SESSION',
      priority: 'NORMAL',
      actionUrl: `/sessions/${sessionId}`,
      metadata: { sessionId },
    });
  }

  async sendGoalAchievement(
    userId: string,
    goalTitle: string,
    achievement: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      title: 'Goal Achievement! 🎉',
      message: `Congratulations! You've ${achievement} for "${goalTitle}"`,
      type: 'ACHIEVEMENT',
      priority: 'NORMAL',
      actionUrl: '/goals',
      metadata: { goalTitle, achievement },
    });
  }

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
      metadata: { medicationName, dosage },
    });
  }

  // Schedule notifications
  async scheduleNotification(
    payload: NotificationPayload,
    scheduledFor: Date
  ): Promise<void> {
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

  // Get notification preferences
  async getNotificationPreferences(userId: string) {
    return prisma.notificationPreference.findUnique({
      where: { userId },
    });
  }

  // Update notification preferences
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
        ...preferences,
      },
      update: preferences,
    });
  }
}

export const notificationService = new NotificationService();