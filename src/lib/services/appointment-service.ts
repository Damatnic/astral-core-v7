import prisma from '@/lib/db/prisma';
import { audit } from '@/lib/security/audit';
import { notificationService } from './notification-service';
import { websocketServer } from '@/lib/websocket/server';
import { AppointmentType, AppointmentStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schemas
export const appointmentSchema = z.object({
  therapistId: z.string(),
  scheduledAt: z.string().datetime(),
  duration: z.number().min(15).max(240).default(60),
  type: z.enum(['INITIAL_CONSULTATION', 'THERAPY_SESSION', 'FOLLOW_UP', 'CRISIS_SESSION', 'GROUP_SESSION', 'ASSESSMENT']),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const rescheduleSchema = z.object({
  newDateTime: z.string().datetime(),
  reason: z.string().optional(),
});

interface CreateAppointmentDto {
  userId: string;
  therapistId: string;
  scheduledAt: Date;
  duration: number;
  type: AppointmentType;
  location?: string;
  notes?: string;
}

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  reason?: string;
}

export class AppointmentService {
  private readonly businessHours = {
    start: 9, // 9 AM
    end: 17,  // 5 PM
  };

  private readonly workingDays = [1, 2, 3, 4, 5]; // Monday to Friday

  // Create a new appointment
  async createAppointment(data: CreateAppointmentDto) {
    try {
      // Check if time slot is available
      const isAvailable = await this.isTimeSlotAvailable(
        data.therapistId,
        data.scheduledAt,
        data.duration
      );

      if (!isAvailable) {
        throw new Error('Time slot is not available');
      }

      // Check for conflicts
      const conflicts = await this.checkConflicts(
        data.therapistId,
        data.scheduledAt,
        data.duration
      );

      if (conflicts.length > 0) {
        throw new Error('Appointment conflicts with existing appointments');
      }

      // Create appointment
      const appointment = await prisma.appointment.create({
        data: {
          ...data,
          status: 'SCHEDULED',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Send notifications
      await this.sendAppointmentNotifications(appointment, 'CREATED');

      // Schedule reminder
      await this.scheduleReminder(appointment);

      // Real-time notification
      websocketServer.sendToUser(data.userId, 'appointment:created', {
        appointmentId: appointment.id,
        scheduledAt: appointment.scheduledAt,
        therapist: appointment.therapist.name,
      });

      websocketServer.sendToUser(data.therapistId, 'appointment:new', {
        appointmentId: appointment.id,
        scheduledAt: appointment.scheduledAt,
        client: appointment.user.name,
      });

      // Audit log
      await audit.logSuccess(
        'APPOINTMENT_CREATED',
        'Appointment',
        appointment.id,
        { type: data.type, scheduledAt: data.scheduledAt },
        data.userId
      );

      return appointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  // Get available time slots for a therapist
  async getAvailableSlots(
    therapistId: string,
    date: Date,
    duration: number = 60
  ): Promise<TimeSlot[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(this.businessHours.start, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(this.businessHours.end, 0, 0, 0);

      // Check if it's a working day
      if (!this.workingDays.includes(date.getDay())) {
        return [];
      }

      // Get existing appointments for the day
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          therapistId,
          scheduledAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
          },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      // Get therapist availability preferences
      const availability = await this.getTherapistAvailability(therapistId, date);

      // Generate time slots
      const slots: TimeSlot[] = [];
      const slotDuration = 30; // 30-minute slots
      
      for (let time = new Date(startOfDay); time < endOfDay; time.setMinutes(time.getMinutes() + slotDuration)) {
        const slotEnd = new Date(time.getTime() + duration * 60000);
        
        // Check if slot fits within business hours
        if (slotEnd > endOfDay) continue;

        // Check against existing appointments
        const hasConflict = existingAppointments.some(apt => {
          const aptStart = new Date(apt.scheduledAt);
          const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
          
          return (time < aptEnd && slotEnd > aptStart);
        });

        // Check therapist availability
        const isAvailableTime = availability.includes(time.getHours());

        slots.push({
          start: new Date(time),
          end: new Date(slotEnd),
          available: !hasConflict && isAvailableTime,
          reason: hasConflict ? 'Booked' : !isAvailableTime ? 'Unavailable' : undefined,
        });
      }

      return slots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  // Reschedule an appointment
  async rescheduleAppointment(
    appointmentId: string,
    userId: string,
    newDateTime: Date,
    reason?: string
  ) {
    try {
      // Get existing appointment
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Check permissions
      if (appointment.userId !== userId && appointment.therapistId !== userId) {
        throw new Error('Unauthorized to reschedule this appointment');
      }

      // Check if new time slot is available
      const isAvailable = await this.isTimeSlotAvailable(
        appointment.therapistId,
        newDateTime,
        appointment.duration,
        appointmentId // Exclude current appointment from conflict check
      );

      if (!isAvailable) {
        throw new Error('New time slot is not available');
      }

      // Update appointment
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          scheduledAt: newDateTime,
          status: 'RESCHEDULED',
          rescheduledFrom: appointment.scheduledAt.toISOString(),
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Send notifications
      await this.sendAppointmentNotifications(updatedAppointment, 'RESCHEDULED', reason);

      // Schedule new reminder
      await this.scheduleReminder(updatedAppointment);

      // Real-time notifications
      websocketServer.sendToUser(appointment.userId, 'appointment:rescheduled', {
        appointmentId,
        oldTime: appointment.scheduledAt,
        newTime: newDateTime,
        reason,
      });

      websocketServer.sendToUser(appointment.therapistId, 'appointment:rescheduled', {
        appointmentId,
        oldTime: appointment.scheduledAt,
        newTime: newDateTime,
        reason,
      });

      // Audit log
      await audit.logSuccess(
        'APPOINTMENT_RESCHEDULED',
        'Appointment',
        appointmentId,
        { 
          oldTime: appointment.scheduledAt,
          newTime: newDateTime,
          reason,
        },
        userId
      );

      return updatedAppointment;
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      throw error;
    }
  }

  // Cancel an appointment
  async cancelAppointment(
    appointmentId: string,
    userId: string,
    reason: string
  ) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Check permissions
      if (appointment.userId !== userId && appointment.therapistId !== userId) {
        throw new Error('Unauthorized to cancel this appointment');
      }

      // Check cancellation policy (24 hours notice)
      const hoursUntilAppointment = (appointment.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
      
      if (hoursUntilAppointment < 24 && appointment.userId === userId) {
        // Late cancellation - could implement fees or warnings
        console.warn('Late cancellation detected');
      }

      // Update appointment
      const cancelledAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CANCELLED',
          cancelReason: reason,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Send notifications
      await this.sendAppointmentNotifications(cancelledAppointment, 'CANCELLED', reason);

      // Real-time notifications
      websocketServer.sendToUser(appointment.userId, 'appointment:cancelled', {
        appointmentId,
        reason,
        refundEligible: hoursUntilAppointment >= 24,
      });

      websocketServer.sendToUser(appointment.therapistId, 'appointment:cancelled', {
        appointmentId,
        reason,
        clientName: appointment.user.name,
      });

      // Audit log
      await audit.logSuccess(
        'APPOINTMENT_CANCELLED',
        'Appointment',
        appointmentId,
        { reason, hoursNotice: hoursUntilAppointment },
        userId
      );

      return cancelledAppointment;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  }

  // Confirm an appointment
  async confirmAppointment(appointmentId: string, userId: string) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          therapist: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Check permissions
      if (appointment.userId !== userId && appointment.therapistId !== userId) {
        throw new Error('Unauthorized to confirm this appointment');
      }

      // Update appointment
      const confirmedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CONFIRMED',
          updatedAt: new Date(),
        },
      });

      // Send confirmation notifications
      await this.sendAppointmentNotifications(confirmedAppointment, 'CONFIRMED');

      // Audit log
      await audit.logSuccess(
        'APPOINTMENT_CONFIRMED',
        'Appointment',
        appointmentId,
        {},
        userId
      );

      return confirmedAppointment;
    } catch (error) {
      console.error('Error confirming appointment:', error);
      throw error;
    }
  }

  // Get appointments for a user
  async getUserAppointments(
    userId: string,
    filters: {
      status?: AppointmentStatus;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const where: any = {
        OR: [
          { userId },
          { therapistId: userId },
        ],
      };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.from || filters.to) {
        where.scheduledAt = {};
        if (filters.from) where.scheduledAt.gte = filters.from;
        if (filters.to) where.scheduledAt.lte = filters.to;
      }

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            therapist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            sessionNote: {
              select: {
                id: true,
                isSigned: true,
              },
            },
          },
          orderBy: { scheduledAt: 'asc' },
          take: filters.limit || 50,
          skip: filters.offset || 0,
        }),
        prisma.appointment.count({ where }),
      ]);

      return {
        appointments,
        total,
        hasMore: (filters.offset || 0) + appointments.length < total,
      };
    } catch (error) {
      console.error('Error fetching user appointments:', error);
      throw error;
    }
  }

  // Send appointment reminders
  async sendReminders() {
    try {
      // Get appointments in the next 24 hours that haven't been reminded
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const now = new Date();

      const appointmentsToRemind = await prisma.appointment.findMany({
        where: {
          scheduledAt: {
            gte: now,
            lte: tomorrow,
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED'],
          },
          reminderSent: false,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      for (const appointment of appointmentsToRemind) {
        await notificationService.sendAppointmentReminder(
          appointment.user.id,
          appointment.id,
          appointment.scheduledAt
        );

        // Mark reminder as sent
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { reminderSent: true },
        });
      }

      console.log(`Sent ${appointmentsToRemind.length} appointment reminders`);
    } catch (error) {
      console.error('Error sending reminders:', error);
    }
  }

  // Helper methods
  private async isTimeSlotAvailable(
    therapistId: string,
    scheduledAt: Date,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    const endTime = new Date(scheduledAt.getTime() + duration * 60000);

    const where: any = {
      therapistId,
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
      },
      OR: [
        {
          AND: [
            { scheduledAt: { lte: scheduledAt } },
            { scheduledAt: { gte: new Date(scheduledAt.getTime() - 60 * 60000) } }, // 1 hour buffer
          ],
        },
        {
          AND: [
            { scheduledAt: { lt: endTime } },
            { scheduledAt: { gt: scheduledAt } },
          ],
        },
      ],
    };

    if (excludeAppointmentId) {
      where.id = { not: excludeAppointmentId };
    }

    const conflicts = await prisma.appointment.findMany({ where });
    return conflicts.length === 0;
  }

  private async checkConflicts(
    therapistId: string,
    scheduledAt: Date,
    duration: number
  ) {
    const endTime = new Date(scheduledAt.getTime() + duration * 60000);

    return prisma.appointment.findMany({
      where: {
        therapistId,
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
        },
        scheduledAt: {
          lt: endTime,
        },
        AND: {
          scheduledAt: {
            gte: new Date(scheduledAt.getTime() - 60 * 60000),
          },
        },
      },
    });
  }

  private async getTherapistAvailability(therapistId: string, date: Date): Promise<number[]> {
    // Default business hours
    // In production, fetch from therapist preferences
    return Array.from({ length: this.businessHours.end - this.businessHours.start }, 
                     (_, i) => this.businessHours.start + i);
  }

  private async sendAppointmentNotifications(
    appointment: any,
    action: 'CREATED' | 'RESCHEDULED' | 'CANCELLED' | 'CONFIRMED',
    reason?: string
  ) {
    const actions = {
      CREATED: {
        clientTitle: 'Appointment Scheduled',
        clientMessage: `Your appointment with ${appointment.therapist.name} is confirmed for ${appointment.scheduledAt.toLocaleString()}`,
        therapistTitle: 'New Appointment',
        therapistMessage: `New appointment with ${appointment.user.name} scheduled for ${appointment.scheduledAt.toLocaleString()}`,
      },
      RESCHEDULED: {
        clientTitle: 'Appointment Rescheduled',
        clientMessage: `Your appointment has been rescheduled to ${appointment.scheduledAt.toLocaleString()}${reason ? `. Reason: ${reason}` : ''}`,
        therapistTitle: 'Appointment Rescheduled',
        therapistMessage: `Appointment with ${appointment.user.name} rescheduled to ${appointment.scheduledAt.toLocaleString()}`,
      },
      CANCELLED: {
        clientTitle: 'Appointment Cancelled',
        clientMessage: `Your appointment scheduled for ${appointment.scheduledAt.toLocaleString()} has been cancelled${reason ? `. Reason: ${reason}` : ''}`,
        therapistTitle: 'Appointment Cancelled',
        therapistMessage: `Appointment with ${appointment.user.name} has been cancelled${reason ? `. Reason: ${reason}` : ''}`,
      },
      CONFIRMED: {
        clientTitle: 'Appointment Confirmed',
        clientMessage: `Your appointment for ${appointment.scheduledAt.toLocaleString()} has been confirmed`,
        therapistTitle: 'Appointment Confirmed',
        therapistMessage: `Appointment with ${appointment.user.name} has been confirmed`,
      },
    };

    const notificationData = actions[action];

    // Notify client
    await notificationService.createNotification({
      userId: appointment.user.id,
      title: notificationData.clientTitle,
      message: notificationData.clientMessage,
      type: 'APPOINTMENT',
      priority: action === 'CANCELLED' ? 'HIGH' : 'NORMAL',
      actionUrl: `/appointments/${appointment.id}`,
    });

    // Notify therapist
    await notificationService.createNotification({
      userId: appointment.therapist.id,
      title: notificationData.therapistTitle,
      message: notificationData.therapistMessage,
      type: 'APPOINTMENT',
      priority: action === 'CANCELLED' ? 'HIGH' : 'NORMAL',
      actionUrl: `/appointments/${appointment.id}`,
    });
  }

  private async scheduleReminder(appointment: any) {
    // Schedule reminder 24 hours before appointment
    const reminderTime = new Date(appointment.scheduledAt.getTime() - 24 * 60 * 60 * 1000);
    
    if (reminderTime > new Date()) {
      // In production, use a job queue like Bull or Agenda
      setTimeout(async () => {
        await notificationService.sendAppointmentReminder(
          appointment.user.id,
          appointment.id,
          appointment.scheduledAt
        );
      }, reminderTime.getTime() - Date.now());
    }
  }
}

export const appointmentService = new AppointmentService();

// Run reminder service every hour
setInterval(() => {
  appointmentService.sendReminders();
}, 60 * 60 * 1000);