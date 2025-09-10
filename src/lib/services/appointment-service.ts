import { prisma } from '@/lib/db';
import { audit } from '@/lib/security/audit';
import { notificationService } from './notification-service';
import { logError, logWarning } from '@/lib/logger';
import { logSystemEvent } from '@/lib/notification-logger';
import { websocketServer } from '@/lib/websocket/server';
import { AppointmentType, AppointmentStatus } from '@prisma/client';
import { z } from 'zod';

/**
 * Zod validation schema for appointment creation
 * Ensures all required fields are present and valid
 */
export const appointmentSchema = z.object({
  therapistId: z.string(),
  scheduledAt: z.string().datetime(),
  duration: z.number().min(15).max(240).default(60),
  type: z.enum([
    'INITIAL_CONSULTATION',
    'THERAPY_SESSION',
    'FOLLOW_UP',
    'CRISIS_SESSION',
    'GROUP_SESSION',
    'ASSESSMENT'
  ]),
  location: z.string().optional(),
  notes: z.string().optional()
});

/**
 * Zod validation schema for appointment rescheduling
 * Validates new date/time and optional reason
 */
export const rescheduleSchema = z.object({
  newDateTime: z.string().datetime(),
  reason: z.string().optional()
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

interface AppointmentWithDetails {
  id: string;
  userId: string;
  therapistId: string;
  scheduledAt: Date;
  status: AppointmentStatus;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  therapist: {
    id: string;
    name: string | null;
    email: string;
  };
}

/**
 * Comprehensive appointment management service for healthcare scheduling
 * Handles appointment creation, rescheduling, cancellation, and conflict resolution
 * Integrates with notifications, real-time updates, and audit logging
 */
export class AppointmentService {
  private readonly businessHours = {
    start: 9, // 9 AM
    end: 17 // 5 PM
  };

  private readonly workingDays = [1, 2, 3, 4, 5]; // Monday to Friday

  /**
   * Create a new appointment with conflict checking and notifications
   * Validates time slot availability and sends notifications to all parties
   * @param {CreateAppointmentDto} data - Appointment creation data
   * @param {string} data.userId - Client user ID
   * @param {string} data.therapistId - Therapist user ID
   * @param {Date} data.scheduledAt - Appointment date and time
   * @param {number} data.duration - Duration in minutes
   * @param {AppointmentType} data.type - Type of appointment
   * @returns {Promise<Appointment>} Created appointment with user and therapist details
   * @throws {Error} If time slot unavailable or conflicts exist
   * @example
   * ```typescript
   * const appointment = await appointmentService.createAppointment({
   *   userId: 'patient_123',
   *   therapistId: 'therapist_456',
   *   scheduledAt: new Date('2024-12-01T10:00:00Z'),
   *   duration: 60,
   *   type: 'THERAPY_SESSION'
   * });
   * ```
   */
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
          status: 'SCHEDULED'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Send notifications
      await this.sendAppointmentNotifications(appointment, 'CREATED');

      // Schedule reminder
      await this.scheduleReminder(appointment);

      // Real-time notification
      websocketServer.sendToUser(data.userId, 'appointment:created', {
        type: 'appointment:created',
        timestamp: Date.now(),
        data: {
          appointmentId: appointment.id,
          scheduledAt: appointment.scheduledAt,
          therapist: appointment.therapist.name
        }
      });

      websocketServer.sendToUser(data.therapistId, 'appointment:new', {
        type: 'appointment:new',
        timestamp: Date.now(),
        data: {
          appointmentId: appointment.id,
          scheduledAt: appointment.scheduledAt,
          client: appointment.user.name
        }
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
      logError('Error creating appointment', error, 'appointment-service');
      throw error;
    }
  }

  /**
   * Get available time slots for a therapist on a specific date
   * Considers existing appointments, business hours, and therapist availability
   * @param {string} therapistId - Therapist user ID
   * @param {Date} date - Date to check availability for
   * @param {number} [duration=60] - Appointment duration in minutes
   * @returns {Promise<TimeSlot[]>} Array of time slots with availability status
   * @example
   * ```typescript
   * const slots = await appointmentService.getAvailableSlots(
   *   'therapist_123',
   *   new Date('2024-12-01'),
   *   60
   * );
   * const availableSlots = slots.filter(slot => slot.available);
   * ```
   */
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
            lt: endOfDay
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
          }
        },
        orderBy: { scheduledAt: 'asc' }
      });

      // Get therapist availability preferences
      const availability = await this.getTherapistAvailability(therapistId, date);

      // Generate time slots
      const slots: TimeSlot[] = [];
      const slotDuration = 30; // 30-minute slots

      for (
        let time = new Date(startOfDay);
        time < endOfDay;
        time.setMinutes(time.getMinutes() + slotDuration)
      ) {
        const slotEnd = new Date(time.getTime() + duration * 60000);

        // Check if slot fits within business hours
        if (slotEnd > endOfDay) continue;

        // Check against existing appointments
        const hasConflict = existingAppointments.some(apt => {
          const aptStart = new Date(apt.scheduledAt);
          const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);

          return time < aptEnd && slotEnd > aptStart;
        });

        // Check therapist availability
        const isAvailableTime = availability.includes(time.getHours());

        const slot: TimeSlot = {
          start: new Date(time),
          end: new Date(slotEnd),
          available: !hasConflict && isAvailableTime
        };

        if (hasConflict) {
          slot.reason = 'Booked';
        } else if (!isAvailableTime) {
          slot.reason = 'Unavailable';
        }

        slots.push(slot);
      }

      return slots;
    } catch (error) {
      logError('Error getting available slots', error, 'appointment-service');
      throw error;
    }
  }

  /**
   * Reschedule an existing appointment to a new date and time
   * Validates new time slot availability and sends notifications
   * @param {string} appointmentId - ID of appointment to reschedule
   * @param {string} userId - User ID requesting the reschedule (client or therapist)
   * @param {Date} newDateTime - New appointment date and time
   * @param {string} [reason] - Optional reason for rescheduling
   * @returns {Promise<Appointment>} Updated appointment with new schedule
   * @throws {Error} If appointment not found, unauthorized, or new time unavailable
   * @example
   * ```typescript
   * const rescheduled = await appointmentService.rescheduleAppointment(
   *   'appt_123',
   *   'user_456',
   *   new Date('2024-12-02T14:00:00Z'),
   *   'Client requested different time'
   * );
   * ```
   */
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
              email: true
            }
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
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
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Send notifications
      await this.sendAppointmentNotifications(updatedAppointment, 'RESCHEDULED', reason);

      // Schedule new reminder
      await this.scheduleReminder(updatedAppointment);

      // Real-time notifications
      websocketServer.sendToUser(appointment.userId, 'appointment:rescheduled', {
        type: 'appointment:rescheduled',
        timestamp: Date.now(),
        data: {
          appointmentId,
          oldTime: appointment.scheduledAt,
          newTime: newDateTime,
          reason
        }
      });

      websocketServer.sendToUser(appointment.therapistId, 'appointment:rescheduled', {
        type: 'appointment:rescheduled',
        timestamp: Date.now(),
        data: {
          appointmentId,
          oldTime: appointment.scheduledAt,
          newTime: newDateTime,
          reason
        }
      });

      // Audit log
      await audit.logSuccess(
        'APPOINTMENT_RESCHEDULED',
        'Appointment',
        appointmentId,
        {
          oldTime: appointment.scheduledAt,
          newTime: newDateTime,
          reason
        },
        userId
      );

      return updatedAppointment;
    } catch (error) {
      logError('Error rescheduling appointment', error, 'appointment-service');
      throw error;
    }
  }

  /**
   * Cancel an appointment with cancellation policy enforcement
   * Checks cancellation timing and sends appropriate notifications
   * @param {string} appointmentId - ID of appointment to cancel
   * @param {string} userId - User ID requesting cancellation (client or therapist)
   * @param {string} reason - Reason for cancellation
   * @returns {Promise<Appointment>} Cancelled appointment with cancellation details
   * @throws {Error} If appointment not found or user unauthorized
   * @example
   * ```typescript
   * const cancelled = await appointmentService.cancelAppointment(
   *   'appt_123',
   *   'user_456',
   *   'Family emergency'
   * );
   * ```
   */
  async cancelAppointment(appointmentId: string, userId: string, reason: string) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Check permissions
      if (appointment.userId !== userId && appointment.therapistId !== userId) {
        throw new Error('Unauthorized to cancel this appointment');
      }

      // Check cancellation policy (24 hours notice)
      const hoursUntilAppointment =
        (appointment.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 24 && appointment.userId === userId) {
        // Late cancellation - could implement fees or warnings
        logWarning('Late cancellation detected', 'appointment-service');
      }

      // Update appointment
      const cancelledAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CANCELLED',
          cancelReason: reason,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Send notifications
      await this.sendAppointmentNotifications(cancelledAppointment, 'CANCELLED', reason);

      // Real-time notifications
      websocketServer.sendToUser(appointment.userId, 'appointment:cancelled', {
        type: 'appointment:cancelled',
        timestamp: Date.now(),
        data: {
          appointmentId,
          reason,
          refundEligible: hoursUntilAppointment >= 24
        }
      });

      websocketServer.sendToUser(appointment.therapistId, 'appointment:cancelled', {
        type: 'appointment:cancelled',
        timestamp: Date.now(),
        data: {
          appointmentId,
          reason,
          clientName: appointment.user.name
        }
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
      logError('Error cancelling appointment', error, 'appointment-service');
      throw error;
    }
  }

  /**
   * Confirm a scheduled appointment
   * Updates appointment status and sends confirmation notifications
   * @param {string} appointmentId - ID of appointment to confirm
   * @param {string} userId - User ID confirming the appointment
   * @returns {Promise<Appointment>} Confirmed appointment
   * @throws {Error} If appointment not found or user unauthorized
   * @example
   * ```typescript
   * const confirmed = await appointmentService.confirmAppointment(
   *   'appt_123',
   *   'therapist_456'
   * );
   * ```
   */
  async confirmAppointment(appointmentId: string, userId: string) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
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
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Send confirmation notifications
      await this.sendAppointmentNotifications(confirmedAppointment, 'CONFIRMED');

      // Audit log
      await audit.logSuccess('APPOINTMENT_CONFIRMED', 'Appointment', appointmentId, {}, userId);

      return confirmedAppointment;
    } catch (error) {
      logError('Error confirming appointment', error, 'appointment-service');
      throw error;
    }
  }

  /**
   * Get appointments for a user with filtering and pagination
   * Returns both appointments as client and as therapist
   * @param {string} userId - User ID to get appointments for
   * @param {Object} [filters={}] - Optional filters
   * @param {AppointmentStatus} [filters.status] - Filter by appointment status
   * @param {Date} [filters.from] - Filter appointments from this date
   * @param {Date} [filters.to] - Filter appointments to this date
   * @param {number} [filters.limit=50] - Maximum appointments to return
   * @param {number} [filters.offset=0] - Number of appointments to skip
   * @returns {Promise<Object>} Paginated appointments with metadata
   * @returns {Appointment[]} returns.appointments - Array of appointments
   * @returns {number} returns.total - Total number of matching appointments
   * @returns {boolean} returns.hasMore - Whether more appointments exist
   * @example
   * ```typescript
   * const result = await appointmentService.getUserAppointments('user_123', {
   *   status: 'SCHEDULED',
   *   from: new Date('2024-12-01'),
   *   limit: 20
   * });
   * ```
   */
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
      const where: Record<string, unknown> = {
        OR: [{ userId }, { therapistId: userId }]
      };

      if (filters.status) {
        where['status'] = filters.status;
      }

      if (filters.from || filters.to) {
        const scheduledAt: Record<string, unknown> = {};
        if (filters.from) scheduledAt['gte'] = filters.from;
        if (filters.to) scheduledAt['lte'] = filters.to;
        where['scheduledAt'] = scheduledAt;
      }

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            therapist: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            sessionNote: {
              select: {
                id: true,
                isSigned: true
              }
            }
          },
          orderBy: { scheduledAt: 'asc' },
          take: filters.limit || 50,
          skip: filters.offset || 0
        }),
        prisma.appointment.count({ where })
      ]);

      return {
        appointments,
        total,
        hasMore: (filters.offset || 0) + appointments.length < total
      };
    } catch (error) {
      logError('Error fetching user appointments', error, 'appointment-service');
      throw error;
    }
  }

  /**
   * Send appointment reminders for upcoming appointments
   * Automatically called every hour to send 24-hour advance reminders
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * // Manually trigger reminder sending
   * await appointmentService.sendReminders();
   * ```
   */
  async sendReminders() {
    try {
      // Get appointments in the next 24 hours that haven't been reminded
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const now = new Date();

      const appointmentsToRemind = await prisma.appointment.findMany({
        where: {
          scheduledAt: {
            gte: now,
            lte: tomorrow
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED']
          },
          reminderSent: false
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          therapist: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
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
          data: { reminderSent: true }
        });
      }

      logSystemEvent('system', `Sent ${appointmentsToRemind.length} appointment reminders`, {
        category: 'appointment-reminders'
      });
    } catch (error) {
      logError('Error sending reminders', error, 'appointment-service');
    }
  }

  /**
   * Check if a time slot is available for scheduling
   * Considers existing appointments and buffer times
   * @private
   * @param {string} therapistId - Therapist to check availability for
   * @param {Date} scheduledAt - Proposed appointment start time
   * @param {number} duration - Appointment duration in minutes
   * @param {string} [excludeAppointmentId] - Appointment ID to exclude from conflict check
   * @returns {Promise<boolean>} True if time slot is available
   */
  private async isTimeSlotAvailable(
    therapistId: string,
    scheduledAt: Date,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    const endTime = new Date(scheduledAt.getTime() + duration * 60000);

    const where: Record<string, unknown> = {
      therapistId,
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
      },
      OR: [
        {
          AND: [
            { scheduledAt: { lte: scheduledAt } },
            { scheduledAt: { gte: new Date(scheduledAt.getTime() - 60 * 60000) } } // 1 hour buffer
          ]
        },
        {
          AND: [{ scheduledAt: { lt: endTime } }, { scheduledAt: { gt: scheduledAt } }]
        }
      ]
    };

    if (excludeAppointmentId) {
      where['id'] = { not: excludeAppointmentId };
    }

    const conflicts = await prisma.appointment.findMany({ where });
    return conflicts.length === 0;
  }

  /**
   * Check for appointment conflicts within a time range
   * @private
   * @param {string} therapistId - Therapist to check conflicts for
   * @param {Date} scheduledAt - Proposed appointment start time
   * @param {number} duration - Appointment duration in minutes
   * @returns {Promise<Appointment[]>} Array of conflicting appointments
   */
  private async checkConflicts(therapistId: string, scheduledAt: Date, duration: number) {
    const endTime = new Date(scheduledAt.getTime() + duration * 60000);

    return prisma.appointment.findMany({
      where: {
        therapistId,
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
        },
        scheduledAt: {
          lt: endTime
        },
        AND: {
          scheduledAt: {
            gte: new Date(scheduledAt.getTime() - 60 * 60000)
          }
        }
      }
    });
  }

  /**
   * Get therapist's available hours for a specific date
   * Currently returns default business hours, but can be extended for custom schedules
   * @private
   * @param {string} therapistId - Therapist ID to get availability for
   * @param {Date} date - Date to check availability
   * @returns {Promise<number[]>} Array of available hours (0-23)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getTherapistAvailability(_therapistId: string, _date: Date): Promise<number[]> {
    // Default business hours
    // In production, fetch from therapist preferences based on therapistId and date
    return Array.from(
      { length: this.businessHours.end - this.businessHours.start },
      (_, i) => this.businessHours.start + i
    );
  }

  /**
   * Send notifications to client and therapist for appointment events
   * @private
   * @param {any} appointment - Appointment object with user and therapist details
   * @param {'CREATED'|'RESCHEDULED'|'CANCELLED'|'CONFIRMED'} action - Type of appointment action
   * @param {string} [reason] - Optional reason for the action
   * @returns {Promise<void>}
   */
  private async sendAppointmentNotifications(
    appointment: AppointmentWithDetails,
    action: 'CREATED' | 'RESCHEDULED' | 'CANCELLED' | 'CONFIRMED',
    reason?: string
  ) {
    const actions = {
      CREATED: {
        clientTitle: 'Appointment Scheduled',
        clientMessage: `Your appointment with ${appointment.therapist.name} is confirmed for ${appointment.scheduledAt.toLocaleString()}`,
        therapistTitle: 'New Appointment',
        therapistMessage: `New appointment with ${appointment.user.name} scheduled for ${appointment.scheduledAt.toLocaleString()}`
      },
      RESCHEDULED: {
        clientTitle: 'Appointment Rescheduled',
        clientMessage: `Your appointment has been rescheduled to ${appointment.scheduledAt.toLocaleString()}${reason ? `. Reason: ${reason}` : ''}`,
        therapistTitle: 'Appointment Rescheduled',
        therapistMessage: `Appointment with ${appointment.user.name} rescheduled to ${appointment.scheduledAt.toLocaleString()}`
      },
      CANCELLED: {
        clientTitle: 'Appointment Cancelled',
        clientMessage: `Your appointment scheduled for ${appointment.scheduledAt.toLocaleString()} has been cancelled${reason ? `. Reason: ${reason}` : ''}`,
        therapistTitle: 'Appointment Cancelled',
        therapistMessage: `Appointment with ${appointment.user.name} has been cancelled${reason ? `. Reason: ${reason}` : ''}`
      },
      CONFIRMED: {
        clientTitle: 'Appointment Confirmed',
        clientMessage: `Your appointment for ${appointment.scheduledAt.toLocaleString()} has been confirmed`,
        therapistTitle: 'Appointment Confirmed',
        therapistMessage: `Appointment with ${appointment.user.name} has been confirmed`
      }
    };

    const notificationData = actions[action];

    // Notify client
    await notificationService.createNotification({
      userId: appointment.user.id,
      title: notificationData.clientTitle,
      message: notificationData.clientMessage,
      type: 'APPOINTMENT',
      priority: action === 'CANCELLED' ? 'HIGH' : 'NORMAL',
      actionUrl: `/appointments/${appointment.id}`
    });

    // Notify therapist
    await notificationService.createNotification({
      userId: appointment.therapist.id,
      title: notificationData.therapistTitle,
      message: notificationData.therapistMessage,
      type: 'APPOINTMENT',
      priority: action === 'CANCELLED' ? 'HIGH' : 'NORMAL',
      actionUrl: `/appointments/${appointment.id}`
    });
  }

  /**
   * Schedule a reminder to be sent 24 hours before appointment
   * Uses setTimeout for demonstration - production should use job queue
   * @private
   * @param {any} appointment - Appointment to schedule reminder for
   * @returns {Promise<void>}
   */
  private async scheduleReminder(appointment: AppointmentWithDetails) {
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

/**
 * Pre-configured appointment service instance
 * Includes automatic reminder scheduling every hour
 * @example
 * ```typescript
 * import { appointmentService } from '@/lib/services/appointment-service';
 *
 * // Create appointment
 * const appointment = await appointmentService.createAppointment({
 *   userId: 'patient_123',
 *   therapistId: 'therapist_456',
 *   scheduledAt: new Date(),
 *   duration: 60,
 *   type: 'THERAPY_SESSION'
 * });
 * ```
 */
export const appointmentService = new AppointmentService();

// Run reminder service every hour
setInterval(
  () => {
    appointmentService.sendReminders();
  },
  60 * 60 * 1000
);
