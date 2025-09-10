import { PrismaClient } from '@prisma/client';
import type { NextRequest } from 'next/server';

interface AuditContext {
  userId?: string | undefined;
  action: string;
  entity: string;
  entityId?: string | undefined;
  details?: Record<string, any> | undefined;
  outcome: 'SUCCESS' | 'FAILURE' | 'ERROR';
  request?: NextRequest | undefined;
}

export class AuditService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  async log(context: AuditContext): Promise<void> {
    try {
      const { userId, action, entity, entityId, details, outcome, request } = context;
      
      let ipAddress: string | undefined;
      let userAgent: string | undefined;
      
      if (request) {
        ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   undefined;
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
          userAgent: userAgent || null,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  async logSuccess(
    action: string,
    entity: string,
    entityId?: string,
    details?: Record<string, any>,
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
      request,
    });
  }

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
      request,
    });
  }

  async logError(
    action: string,
    entity: string,
    error: Error | unknown,
    userId?: string,
    request?: NextRequest
  ): Promise<void> {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : { error: String(error) };
      
    await this.log({
      userId,
      action,
      entity,
      details: errorDetails,
      outcome: 'ERROR',
      request,
    });
  }

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
    const where: any = {};
    
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
              name: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    
    return { logs, total };
  }

  async cleanupOldLogs(retentionDays: number = 2555): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
    
    return result.count;
  }
}

export const audit = new AuditService();