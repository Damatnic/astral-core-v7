/**
 * Database Query Optimization Utilities
 * Advanced query patterns and performance optimizations for Prisma
 */

import { prisma } from './connection-pool';
import { Prisma } from '@prisma/client';

// Query performance tracking
const queryPerformanceTracker = {
  slowQueries: new Map<string, { count: number; totalTime: number; avgTime: number }>(),
  
  track(operation: string, duration: number) {
    const existing = this.slowQueries.get(operation) || { count: 0, totalTime: 0, avgTime: 0 };
    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    this.slowQueries.set(operation, existing);
  },

  getSlowQueries(threshold: number = 500) {
    return Array.from(this.slowQueries.entries())
      .filter(([_, stats]) => stats.avgTime > threshold)
      .sort((a, b) => b[1].avgTime - a[1].avgTime);
  }
};

// Optimized query patterns
export const optimizedQueries = {
  // User queries with proper indexing
  async getUserWithProfile(userId: string) {
    const start = Date.now();
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          lastLogin: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              phoneNumber: true,
              dateOfBirth: true
            }
          },
          // Only fetch unread notifications
          notifications: {
            where: { isRead: false },
            select: {
              id: true,
              title: true,
              message: true,
              type: true,
              priority: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      const duration = Date.now() - start;
      queryPerformanceTracker.track('getUserWithProfile', duration);
      
      return user;
    } catch (error) {
      console.error('getUserWithProfile failed:', error);
      throw error;
    }
  },

  // Optimized dashboard queries
  async getDashboardData(userId: string, userRole: string) {
    const start = Date.now();
    
    try {
      const baseWhere = userRole === 'CLIENT' 
        ? { userId } 
        : userRole === 'THERAPIST' 
          ? { therapistId: userId }
          : {}; // Admin sees all

      // Parallel queries for better performance
      const [
        appointmentsCount,
        recentAppointments,
        unreadMessagesCount,
        activeInterventions,
        recentWellnessData
      ] = await Promise.all([
        // Count upcoming appointments
        prisma.appointment.count({
          where: {
            ...baseWhere,
            scheduledAt: { gte: new Date() },
            status: { in: ['SCHEDULED', 'CONFIRMED'] }
          }
        }),

        // Get recent appointments with minimal data
        prisma.appointment.findMany({
          where: baseWhere,
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            type: true,
            user: {
              select: {
                name: true,
                profile: {
                  select: { firstName: true, lastName: true }
                }
              }
            }
          },
          orderBy: { scheduledAt: 'desc' },
          take: 5
        }),

        // Count unread messages
        prisma.message.count({
          where: {
            senderId: { not: userId },
            conversationId: {
              in: await prisma.conversationParticipant.findMany({
                where: { userId },
                select: { conversationId: true }
              }).then(convs => convs.map(c => c.conversationId))
            },
            isRead: false
          }
        }),

        // Active crisis interventions (if applicable)
        userRole === 'CRISIS_RESPONDER' ? prisma.crisisIntervention.count({
          where: { status: 'ACTIVE' }
        }) : Promise.resolve(0),

        // Recent wellness data (for clients)
        userRole === 'CLIENT' ? prisma.wellnessData.findMany({
          where: { userId },
          select: {
            id: true,
            date: true,
            moodScore: true,
            anxietyLevel: true,
            stressLevel: true
          },
          orderBy: { date: 'desc' },
          take: 7
        }) : Promise.resolve([])
      ]);

      const duration = Date.now() - start;
      queryPerformanceTracker.track('getDashboardData', duration);

      return {
        appointmentsCount,
        recentAppointments,
        unreadMessagesCount,
        activeInterventions,
        recentWellnessData
      };
    } catch (error) {
      console.error('getDashboardData failed:', error);
      throw error;
    }
  },

  // Optimized analytics queries with aggregation
  async getPerformanceAnalytics(timeframe: '24h' | '7d' | '30d') {
    const start = Date.now();
    
    try {
      const hoursBack = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      // Use raw queries for complex aggregations
      const [
        vitalsStats,
        errorStats,
        uptimeStats
      ] = await Promise.all([
        // Web vitals aggregation
        prisma.$queryRaw<Array<{
          metric_name: string;
          avg_value: number;
          min_value: number;
          max_value: number;
          p95_value: number;
          count: bigint;
        }>>`
          SELECT 
            JSON_EXTRACT(vitals, '$.name') as metric_name,
            AVG(CAST(JSON_EXTRACT(vitals, '$.value') AS DECIMAL(10,2))) as avg_value,
            MIN(CAST(JSON_EXTRACT(vitals, '$.value') AS DECIMAL(10,2))) as min_value,
            MAX(CAST(JSON_EXTRACT(vitals, '$.value') AS DECIMAL(10,2))) as max_value,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY CAST(JSON_EXTRACT(vitals, '$.value') AS DECIMAL(10,2))) as p95_value,
            COUNT(*) as count
          FROM "PerformanceMetric" 
          WHERE timestamp >= ${since}
          GROUP BY JSON_EXTRACT(vitals, '$.name')
        `,

        // Error statistics
        prisma.errorLog.groupBy({
          by: ['severity', 'type'],
          where: {
            timestamp: { gte: since }
          },
          _count: {
            id: true
          },
          _min: {
            timestamp: true
          },
          _max: {
            timestamp: true
          }
        }),

        // Uptime statistics
        prisma.healthCheck.findMany({
          where: {
            timestamp: { gte: since }
          },
          select: {
            service: true,
            status: true,
            responseTime: true,
            timestamp: true
          },
          orderBy: {
            timestamp: 'desc'
          }
        })
      ]);

      const duration = Date.now() - start;
      queryPerformanceTracker.track('getPerformanceAnalytics', duration);

      return {
        webVitals: vitalsStats.map(stat => ({
          ...stat,
          count: Number(stat.count) // Convert BigInt to number
        })),
        errors: errorStats,
        uptime: uptimeStats
      };
    } catch (error) {
      console.error('getPerformanceAnalytics failed:', error);
      throw error;
    }
  },

  // Batch operations for better performance
  async batchUpdateNotifications(userId: string, notificationIds: string[]) {
    const start = Date.now();
    
    try {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId // Security: ensure user owns the notifications
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      const duration = Date.now() - start;
      queryPerformanceTracker.track('batchUpdateNotifications', duration);
      
      return result;
    } catch (error) {
      console.error('batchUpdateNotifications failed:', error);
      throw error;
    }
  },

  // Optimized search with full-text search simulation
  async searchUsers(query: string, role?: string, limit: number = 20) {
    const start = Date.now();
    
    try {
      const whereClause: Prisma.UserWhereInput = {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              {
                profile: {
                  OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } }
                  ]
                }
              }
            ]
          },
          role ? { role: role as any } : {},
          { status: 'ACTIVE' } // Only search active users
        ]
      };

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profile: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: [
          // Prioritize exact matches
          { name: 'asc' },
          { email: 'asc' }
        ],
        take: limit
      });

      const duration = Date.now() - start;
      queryPerformanceTracker.track('searchUsers', duration);
      
      return users;
    } catch (error) {
      console.error('searchUsers failed:', error);
      throw error;
    }
  },

  // Connection-efficient appointments query
  async getAppointmentsByDateRange(
    startDate: Date, 
    endDate: Date, 
    userId?: string,
    role?: string
  ) {
    const start = Date.now();
    
    try {
      let whereClause: Prisma.AppointmentWhereInput = {
        scheduledAt: {
          gte: startDate,
          lte: endDate
        }
      };

      // Add user-specific filters
      if (userId && role) {
        if (role === 'CLIENT') {
          whereClause.userId = userId;
        } else if (role === 'THERAPIST') {
          whereClause.therapistId = userId;
        }
        // Admin sees all appointments (no additional filter)
      }

      const appointments = await prisma.appointment.findMany({
        where: whereClause,
        select: {
          id: true,
          scheduledAt: true,
          duration: true,
          type: true,
          status: true,
          user: {
            select: {
              id: true,
              name: true,
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          },
          therapist: {
            select: {
              id: true,
              name: true,
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        },
        orderBy: { scheduledAt: 'asc' }
      });

      const duration = Date.now() - start;
      queryPerformanceTracker.track('getAppointmentsByDateRange', duration);
      
      return appointments;
    } catch (error) {
      console.error('getAppointmentsByDateRange failed:', error);
      throw error;
    }
  }
};

// Query performance monitoring
export const queryMonitoring = {
  getPerformanceStats() {
    return {
      slowQueries: queryPerformanceTracker.getSlowQueries(),
      totalQueries: Array.from(queryPerformanceTracker.slowQueries.values())
        .reduce((sum, stats) => sum + stats.count, 0)
    };
  },

  // Log slow queries for analysis
  logSlowQueries(threshold: number = 1000) {
    const slowQueries = queryPerformanceTracker.getSlowQueries(threshold);
    
    if (slowQueries.length > 0) {
      console.warn('Slow database queries detected:', slowQueries);
    }
    
    return slowQueries;
  }
};

// Database maintenance utilities
export const dbMaintenance = {
  // Clean up old performance metrics
  async cleanupOldMetrics(daysOld: number = 30) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const result = await prisma.performanceMetric.deleteMany({
      where: {
        timestamp: { lt: cutoff }
      }
    });

    console.info(`Cleaned up ${result.count} old performance metrics`);
    return result;
  },

  // Analyze database size and suggest optimizations
  async analyzeTableSizes() {
    try {
      // This would be database-specific
      const result = await prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY n_distinct DESC
      ` as Array<{
        schemaname: string;
        tablename: string;
        attname: string;
        n_distinct: number;
        correlation: number;
      }>;

      return result;
    } catch (error) {
      console.error('Database analysis failed:', error);
      return [];
    }
  }
};

export default optimizedQueries;