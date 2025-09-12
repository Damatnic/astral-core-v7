import { PrismaClient } from '@prisma/client';
import type { NextRequest } from 'next/server';
import { logError } from '../logger';

interface AuditContext {
  userId?: string | undefined;
  action: string;
  entity: string;
  entityId?: string | undefined;
  details?: Record<string, unknown> | undefined;
  outcome: 'SUCCESS' | 'FAILURE' | 'ERROR';
  request?: NextRequest | undefined;
}

/**
 * HIPAA-compliant audit logging service for tracking all system activities
 * Maintains detailed logs for compliance, security monitoring, and forensic analysis
 * Captures user actions, system events, and access patterns with metadata
 */
export class AuditService {
  private prisma: PrismaClient;

  /**
   * Initialize audit service with database connection
   * @param {PrismaClient} [prisma] - Optional Prisma client instance, creates new if not provided
   */
  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Log audit event with full context information
   * Captures user ID, action, entity, outcome, IP address, and user agent
   * @param {AuditContext} context - Complete audit context information
   * @param {string} [context.userId] - User ID performing the action
   * @param {string} context.action - Action being performed (e.g., 'USER_LOGIN', 'DATA_ACCESS')
   * @param {string} context.entity - Entity being acted upon (e.g., 'User', 'PatientRecord')
   * @param {string} [context.entityId] - Specific entity ID if applicable
   * @param {Record<string, unknown>} [context.details] - Additional context details
   * @param {'SUCCESS'|'FAILURE'|'ERROR'} context.outcome - Operation outcome
   * @param {NextRequest} [context.request] - HTTP request for IP and user agent extraction
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await audit.log({
   *   userId: 'user_123',
   *   action: 'PATIENT_RECORD_ACCESSED',
   *   entity: 'PatientRecord',
   *   entityId: 'patient_456',
   *   outcome: 'SUCCESS',
   *   request: req
   * });
   * ```
   */
  async log(context: AuditContext): Promise<void> {
    try {
      const { userId, action, entity, entityId, details, outcome, request } = context;

      let ipAddress: string | undefined;
      let userAgent: string | undefined;

      if (request) {
        ipAddress =
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
        userAgent = request.headers.get('user-agent') || undefined;
      }

      await this.prisma.auditLog.create({
        data: {
          userId: userId || null,
          action,
          entity,
          entityId: entityId || null,
          details: details ? JSON.parse(JSON.stringify(details)) : null,
          outcome,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null
        }
      });
    } catch (error) {
      logError('Failed to create audit log', error, 'AuditService');
    }
  }

  /**
   * Log successful audit event with simplified parameters
   * Convenience method for SUCCESS outcome logging
   * @param {string} action - Action that was performed successfully
   * @param {string} entity - Entity that was acted upon
   * @param {string} [entityId] - Specific entity ID if applicable
   * @param {Record<string, unknown>} [details] - Additional context details
   * @param {string} [userId] - User ID who performed the action
   * @param {NextRequest} [request] - HTTP request for metadata extraction
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await audit.logSuccess(
   *   'APPOINTMENT_CREATED',
   *   'Appointment',
   *   'appt_789',
   *   { therapistId: 'therapist_123' },
   *   'user_456',
   *   request
   * );
   * ```
   */
  async logSuccess(
    action: string,
    entity: string,
    entityId?: string,
    details?: Record<string, unknown>,
    userId?: string,
    request?: NextRequest
  ): Promise<void> {
    await this.log({
      userId,
      action,
      entity,
      entityId,
      details,
      outcome: 'SUCCESS',
      request
    });
  }

  /**
   * Log failed audit event with error information
   * Convenience method for FAILURE outcome logging
   * @param {string} action - Action that failed
   * @param {string} entity - Entity involved in the failed action
   * @param {string} error - Error message or description of failure
   * @param {string} [userId] - User ID who attempted the action
   * @param {NextRequest} [request] - HTTP request for metadata extraction
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await audit.logFailure(
   *   'LOGIN_ATTEMPT',
   *   'User',
   *   'Invalid password',
   *   'user_123',
   *   request
   * );
   * ```
   */
  async logFailure(
    action: string,
    entity: string,
    error: string,
    userId?: string,
    request?: NextRequest
  ): Promise<void> {
    await this.log({
      userId,
      action,
      entity,
      details: { error },
      outcome: 'FAILURE',
      request
    });
  }

  /**
   * Log system error with detailed error information
   * Convenience method for ERROR outcome logging with stack traces
   * @param {string} action - Action that caused the error
   * @param {string} entity - Entity involved when error occurred
   * @param {Error | unknown} error - Error object or error value
   * @param {string} [userId] - User ID if user-initiated action
   * @param {NextRequest} [request] - HTTP request for metadata extraction
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * try {
   *   // Some operation
   * } catch (error) {
   *   await audit.logError(
   *     'DATA_PROCESSING',
   *     'PatientData',
   *     error,
   *     'user_123',
   *     request
   *   );
   * }
   * ```
   */
  async logError(
    action: string,
    entity: string,
    error: Error | unknown,
    userId?: string,
    request?: NextRequest
  ): Promise<void> {
    const errorDetails =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { error: String(error) };

    await this.log({
      userId,
      action,
      entity,
      details: errorDetails,
      outcome: 'ERROR',
      request
    });
  }

  /**
   * Retrieve audit logs with advanced filtering options
   * Supports pagination and comprehensive filtering for compliance reporting
   * @param {Object} filters - Filter criteria for audit log retrieval
   * @param {string} [filters.userId] - Filter by specific user ID
   * @param {string} [filters.entity] - Filter by entity type
   * @param {string} [filters.action] - Filter by specific action
   * @param {Date} [filters.startDate] - Filter logs from this date onwards
   * @param {Date} [filters.endDate] - Filter logs up to this date
   * @param {string} [filters.outcome] - Filter by outcome (SUCCESS, FAILURE, ERROR)
   * @param {number} [filters.limit=100] - Maximum number of logs to return
   * @param {number} [filters.offset=0] - Number of logs to skip (for pagination)
   * @returns {Promise<{logs: AuditLog[], total: number}>} Paginated audit logs with total count
   * @example
   * ```typescript
   * const auditReport = await audit.getAuditLogs({
   *   userId: 'user_123',
   *   startDate: new Date('2024-01-01'),
   *   endDate: new Date('2024-12-31'),
   *   outcome: 'FAILURE',
   *   limit: 50
   * });
   * ```
   */
  async getAuditLogs(filters: {
    userId?: string;
    entity?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    outcome?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: {
      userId?: string;
      entity?: string;
      action?: string;
      outcome?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.entity) where.entity = filters.entity;
    if (filters.action) where.action = filters.action;
    if (filters.outcome) where.outcome = filters.outcome;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return { logs, total };
  }

  /**
   * Clean up old audit logs based on retention policy
   * Removes logs older than specified retention period for storage management
   * Default retention is 7 years (2555 days) for HIPAA compliance
   * @param {number} [retentionDays=2555] - Number of days to retain logs (default: 7 years)
   * @returns {Promise<number>} Number of audit log records deleted
   * @example
   * ```typescript
   * // Clean up logs older than 3 years
   * const deletedCount = await audit.cleanupOldLogs(1095);
   * console.log(`Deleted ${deletedCount} old audit records`);
   * ```
   */
  async cleanupOldLogs(retentionDays: number = 2555): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }
}

export const audit = new AuditService();

// Convenience function for simple audit logging
export const auditLog = audit.log.bind(audit);
