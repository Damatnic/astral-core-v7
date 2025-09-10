import prisma from '@/lib/db/prisma';
import { audit } from '@/lib/security/audit';
import { phiService } from '@/lib/security/phi-service';
import { UserRole } from '@prisma/client';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface WellnessMetrics {
  averageMoodScore: number;
  averageAnxietyLevel: number;
  averageStressLevel: number;
  totalEntries: number;
  moodTrend: 'improving' | 'declining' | 'stable';
  anxietyTrend: 'improving' | 'declining' | 'stable';
  stressTrend: 'improving' | 'declining' | 'stable';
}

interface TherapyMetrics {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  noShowSessions: number;
  averageSessionDuration: number;
  treatmentPlansActive: number;
  treatmentPlansCompleted: number;
  averageGoalProgress: number;
}

interface CrisisMetrics {
  totalInterventions: number;
  interventionsBySeverity: Record<string, number>;
  averageResponseTime: number;
  resolutionRate: number;
  escalationRate: number;
  recentAlerts: any[];
}

interface UserEngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  messagesExchanged: number;
  journalEntriesCreated: number;
  wellnessDataPoints: number;
  retentionRate: number;
}

interface PerformanceMetrics {
  apiResponseTimes: {
    average: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  uptime: number;
  databaseConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface ComplianceMetrics {
  auditLogsGenerated: number;
  hipaaViolationAlerts: number;
  gdprRequests: number;
  dataEncryptionStatus: number;
  securityScans: number;
  vulnerabilitiesFound: number;
}

export class AnalyticsService {
  // Get wellness analytics
  async getWellnessAnalytics(
    userId?: string,
    dateRange: DateRange = this.getDefaultDateRange(),
    aggregateLevel: 'user' | 'therapist' | 'system' = 'user'
  ): Promise<WellnessMetrics> {
    try {
      const where: any = {
        date: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      };

      // Apply user filtering based on access level
      if (aggregateLevel === 'user' && userId) {
        where.userId = userId;
      } else if (aggregateLevel === 'therapist' && userId) {
        // Get clients for this therapist
        const therapistProfile = await prisma.therapistProfile.findUnique({
          where: { userId },
          include: { clients: { select: { userId: true } } }
        });

        if (therapistProfile) {
          where.userId = {
            in: therapistProfile.clients.map(c => c.userId)
          };
        }
      }

      const wellnessData = await prisma.wellnessData.findMany({
        where,
        orderBy: { date: 'asc' }
      });

      if (wellnessData.length === 0) {
        return {
          averageMoodScore: 0,
          averageAnxietyLevel: 0,
          averageStressLevel: 0,
          totalEntries: 0,
          moodTrend: 'stable',
          anxietyTrend: 'stable',
          stressTrend: 'stable'
        };
      }

      // Calculate averages
      const totalEntries = wellnessData.length;
      const averageMoodScore =
        wellnessData.reduce((sum, entry) => sum + entry.moodScore, 0) / totalEntries;
      const averageAnxietyLevel =
        wellnessData.reduce((sum, entry) => sum + entry.anxietyLevel, 0) / totalEntries;
      const averageStressLevel =
        wellnessData.reduce((sum, entry) => sum + entry.stressLevel, 0) / totalEntries;

      // Calculate trends (comparing first half to second half of period)
      const midPoint = Math.floor(wellnessData.length / 2);
      const firstHalf = wellnessData.slice(0, midPoint);
      const secondHalf = wellnessData.slice(midPoint);

      const moodTrend = this.calculateTrend(
        firstHalf.reduce((sum, e) => sum + e.moodScore, 0) / firstHalf.length,
        secondHalf.reduce((sum, e) => sum + e.moodScore, 0) / secondHalf.length
      );

      const anxietyTrend = this.calculateTrend(
        firstHalf.reduce((sum, e) => sum + e.anxietyLevel, 0) / firstHalf.length,
        secondHalf.reduce((sum, e) => sum + e.anxietyLevel, 0) / secondHalf.length,
        true // Lower is better for anxiety
      );

      const stressTrend = this.calculateTrend(
        firstHalf.reduce((sum, e) => sum + e.stressLevel, 0) / firstHalf.length,
        secondHalf.reduce((sum, e) => sum + e.stressLevel, 0) / secondHalf.length,
        true // Lower is better for stress
      );

      return {
        averageMoodScore: Math.round(averageMoodScore * 10) / 10,
        averageAnxietyLevel: Math.round(averageAnxietyLevel * 10) / 10,
        averageStressLevel: Math.round(averageStressLevel * 10) / 10,
        totalEntries,
        moodTrend,
        anxietyTrend,
        stressTrend
      };
    } catch (error) {
      console.error('Error getting wellness analytics:', error);
      throw error;
    }
  }

  // Get therapy analytics
  async getTherapyAnalytics(
    userId?: string,
    dateRange: DateRange = this.getDefaultDateRange(),
    role: UserRole = 'CLIENT'
  ): Promise<TherapyMetrics> {
    try {
      const where: any = {
        scheduledAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      };

      if (role === 'CLIENT' && userId) {
        where.userId = userId;
      } else if (role === 'THERAPIST' && userId) {
        where.therapistId = userId;
      }

      const [appointments, treatmentPlans] = await Promise.all([
        prisma.appointment.findMany({
          where,
          select: {
            status: true,
            duration: true,
            scheduledAt: true
          }
        }),
        prisma.treatmentPlan.findMany({
          where: {
            ...(userId && role === 'CLIENT' ? { client: { userId } } : {}),
            ...(userId && role === 'THERAPIST' ? { therapist: { userId } } : {}),
            createdAt: {
              gte: dateRange.startDate,
              lte: dateRange.endDate
            }
          },
          select: {
            status: true,
            goals: true,
            progress: true
          }
        })
      ]);

      // Calculate appointment metrics
      const totalSessions = appointments.length;
      const completedSessions = appointments.filter(a => a.status === 'COMPLETED').length;
      const cancelledSessions = appointments.filter(a => a.status === 'CANCELLED').length;
      const noShowSessions = appointments.filter(a => a.status === 'NO_SHOW').length;
      const averageSessionDuration =
        appointments.length > 0
          ? appointments.reduce((sum, a) => sum + a.duration, 0) / appointments.length
          : 0;

      // Calculate treatment plan metrics
      const treatmentPlansActive = treatmentPlans.filter(tp => tp.status === 'ACTIVE').length;
      const treatmentPlansCompleted = treatmentPlans.filter(tp => tp.status === 'COMPLETED').length;

      // Calculate average goal progress
      let totalGoalProgress = 0;
      let goalCount = 0;

      treatmentPlans.forEach(plan => {
        const goals = plan.goals as any[];
        if (goals) {
          goals.forEach(goal => {
            if (typeof goal.progress === 'number') {
              totalGoalProgress += goal.progress;
              goalCount++;
            }
          });
        }
      });

      const averageGoalProgress = goalCount > 0 ? totalGoalProgress / goalCount : 0;

      return {
        totalSessions,
        completedSessions,
        cancelledSessions,
        noShowSessions,
        averageSessionDuration: Math.round(averageSessionDuration),
        treatmentPlansActive,
        treatmentPlansCompleted,
        averageGoalProgress: Math.round(averageGoalProgress * 10) / 10
      };
    } catch (error) {
      console.error('Error getting therapy analytics:', error);
      throw error;
    }
  }

  // Get crisis analytics
  async getCrisisAnalytics(
    dateRange: DateRange = this.getDefaultDateRange()
  ): Promise<CrisisMetrics> {
    try {
      const interventions = await prisma.crisisIntervention.findMany({
        where: {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        },
        select: {
          severity: true,
          status: true,
          createdAt: true,
          responderId: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalInterventions = interventions.length;

      // Group by severity
      const interventionsBySeverity = interventions.reduce(
        (acc, intervention) => {
          acc[intervention.severity] = (acc[intervention.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Calculate response times (time from creation to first response)
      const responseTimes = interventions
        .filter(i => i.responderId && i.updatedAt)
        .map(i => i.updatedAt!.getTime() - i.createdAt.getTime());

      const averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
          : 0;

      // Calculate resolution and escalation rates
      const resolvedInterventions = interventions.filter(i => i.status === 'RESOLVED').length;
      const escalatedInterventions = interventions.filter(i => i.status === 'ESCALATED').length;

      const resolutionRate =
        totalInterventions > 0 ? (resolvedInterventions / totalInterventions) * 100 : 0;
      const escalationRate =
        totalInterventions > 0 ? (escalatedInterventions / totalInterventions) * 100 : 0;

      // Get recent alerts (last 10)
      const recentAlerts = interventions.slice(0, 10);

      return {
        totalInterventions,
        interventionsBySeverity,
        averageResponseTime: Math.round(averageResponseTime / (1000 * 60)), // Convert to minutes
        resolutionRate: Math.round(resolutionRate * 10) / 10,
        escalationRate: Math.round(escalationRate * 10) / 10,
        recentAlerts
      };
    } catch (error) {
      console.error('Error getting crisis analytics:', error);
      throw error;
    }
  }

  // Get user engagement analytics
  async getUserEngagementAnalytics(
    dateRange: DateRange = this.getDefaultDateRange()
  ): Promise<UserEngagementMetrics> {
    try {
      const [
        dailyActive,
        weeklyActive,
        monthlyActive,
        sessions,
        messages,
        journalEntries,
        wellnessEntries
      ] = await Promise.all([
        // Daily active users (logged in today)
        prisma.user.count({
          where: {
            lastLogin: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        // Weekly active users
        prisma.user.count({
          where: {
            lastLogin: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        // Monthly active users
        prisma.user.count({
          where: {
            lastLogin: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        // Sessions in date range
        prisma.session.findMany({
          where: {
            expires: {
              gte: dateRange.startDate,
              lte: dateRange.endDate
            }
          }
        }),
        // Messages in date range
        prisma.message.count({
          where: {
            createdAt: {
              gte: dateRange.startDate,
              lte: dateRange.endDate
            }
          }
        }),
        // Journal entries
        prisma.journalEntry.count({
          where: {
            createdAt: {
              gte: dateRange.startDate,
              lte: dateRange.endDate
            }
          }
        }),
        // Wellness data points
        prisma.wellnessData.count({
          where: {
            date: {
              gte: dateRange.startDate,
              lte: dateRange.endDate
            }
          }
        })
      ]);

      // Calculate retention rate (users who logged in this period and last period)
      const lastPeriodStart = new Date(dateRange.startDate);
      lastPeriodStart.setDate(lastPeriodStart.getDate() - 30);

      const [currentPeriodUsers, lastPeriodUsers] = await Promise.all([
        prisma.user.findMany({
          where: {
            lastLogin: {
              gte: dateRange.startDate,
              lte: dateRange.endDate
            }
          },
          select: { id: true }
        }),
        prisma.user.findMany({
          where: {
            lastLogin: {
              gte: lastPeriodStart,
              lt: dateRange.startDate
            }
          },
          select: { id: true }
        })
      ]);

      const currentUserIds = new Set(currentPeriodUsers.map(u => u.id));
      const lastUserIds = new Set(lastPeriodUsers.map(u => u.id));
      const retainedUsers = [...currentUserIds].filter(id => lastUserIds.has(id));
      const retentionRate =
        lastPeriodUsers.length > 0 ? (retainedUsers.length / lastPeriodUsers.length) * 100 : 0;

      return {
        dailyActiveUsers: dailyActive,
        weeklyActiveUsers: weeklyActive,
        monthlyActiveUsers: monthlyActive,
        averageSessionDuration: 45, // Placeholder - would need to calculate from actual session data
        messagesExchanged: messages,
        journalEntriesCreated: journalEntries,
        wellnessDataPoints: wellnessEntries,
        retentionRate: Math.round(retentionRate * 10) / 10
      };
    } catch (error) {
      console.error('Error getting engagement analytics:', error);
      throw error;
    }
  }

  // Get system performance metrics
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // In production, these would come from monitoring services like New Relic, DataDog, etc.
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: {
          success: true,
          metadata: true
        }
      });

      const totalRequests = auditLogs.length;
      const errors = auditLogs.filter(log => !log.success).length;
      const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;

      return {
        apiResponseTimes: {
          average: 85, // ms
          p95: 150,
          p99: 300
        },
        errorRate: Math.round(errorRate * 100) / 100,
        uptime: 99.9,
        databaseConnections: 12,
        memoryUsage: 68, // percentage
        cpuUsage: 35 // percentage
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  // Get compliance metrics
  async getComplianceMetrics(
    dateRange: DateRange = this.getDefaultDateRange()
  ): Promise<ComplianceMetrics> {
    try {
      const [auditLogs, files] = await Promise.all([
        prisma.auditLog.findMany({
          where: {
            timestamp: {
              gte: dateRange.startDate,
              lte: dateRange.endDate
            }
          },
          select: {
            action: true,
            success: true
          }
        }),
        prisma.file.findMany({
          select: {
            isEncrypted: true
          }
        })
      ]);

      // Count HIPAA-related actions
      const hipaaActions = ['PHI_ACCESS', 'PHI_UPDATE', 'PHI_DELETE', 'UNAUTHORIZED_ACCESS'];
      const hipaaViolationAlerts = auditLogs.filter(
        log => !log.success && hipaaActions.some(action => log.action.includes(action))
      ).length;

      // GDPR requests would be tracked separately
      const gdprRequests = auditLogs.filter(
        log => log.action === 'DELETE_USER_DATA' || log.action === 'DATA_EXPORT_REQUEST'
      ).length;

      // Encryption status
      const totalFiles = files.length;
      const encryptedFiles = files.filter(f => f.isEncrypted).length;
      const dataEncryptionStatus = totalFiles > 0 ? (encryptedFiles / totalFiles) * 100 : 100;

      return {
        auditLogsGenerated: auditLogs.length,
        hipaaViolationAlerts,
        gdprRequests,
        dataEncryptionStatus: Math.round(dataEncryptionStatus),
        securityScans: 24, // Placeholder - would come from security scanning service
        vulnerabilitiesFound: 0
      };
    } catch (error) {
      console.error('Error getting compliance metrics:', error);
      throw error;
    }
  }

  // Generate comprehensive dashboard data
  async getDashboardAnalytics(userId: string, role: UserRole, dateRange?: DateRange) {
    try {
      const range = dateRange || this.getDefaultDateRange();

      // Different data based on role
      if (role === 'ADMIN') {
        const [wellness, therapy, crisis, engagement, performance, compliance] = await Promise.all([
          this.getWellnessAnalytics(undefined, range, 'system'),
          this.getTherapyAnalytics(undefined, range, 'ADMIN' as UserRole),
          this.getCrisisAnalytics(range),
          this.getUserEngagementAnalytics(range),
          this.getPerformanceMetrics(),
          this.getComplianceMetrics(range)
        ]);

        return {
          wellness,
          therapy,
          crisis,
          engagement,
          performance,
          compliance,
          role
        };
      } else if (role === 'THERAPIST') {
        const [wellness, therapy, crisis] = await Promise.all([
          this.getWellnessAnalytics(userId, range, 'therapist'),
          this.getTherapyAnalytics(userId, range, role),
          this.getCrisisAnalytics(range)
        ]);

        return {
          wellness,
          therapy,
          crisis,
          role
        };
      } else {
        // CLIENT
        const [wellness, therapy] = await Promise.all([
          this.getWellnessAnalytics(userId, range, 'user'),
          this.getTherapyAnalytics(userId, range, role)
        ]);

        return {
          wellness,
          therapy,
          role
        };
      }
    } catch (error) {
      console.error('Error generating dashboard analytics:', error);
      throw error;
    }
  }

  // Helper methods
  private getDefaultDateRange(): DateRange {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    return { startDate, endDate };
  }

  private calculateTrend(
    firstValue: number,
    secondValue: number,
    lowerIsBetter: boolean = false
  ): 'improving' | 'declining' | 'stable' {
    const threshold = 0.1; // 10% change threshold
    const percentChange = (secondValue - firstValue) / firstValue;

    if (Math.abs(percentChange) < threshold) {
      return 'stable';
    }

    if (lowerIsBetter) {
      return percentChange < 0 ? 'improving' : 'declining';
    } else {
      return percentChange > 0 ? 'improving' : 'declining';
    }
  }

  // Generate reports
  async generateWellnessReport(userId: string, dateRange: DateRange): Promise<any> {
    try {
      const analytics = await this.getWellnessAnalytics(userId, dateRange, 'user');

      // Get detailed data for charts
      const wellnessData = await prisma.wellnessData.findMany({
        where: {
          userId,
          date: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          moodScore: true,
          anxietyLevel: true,
          stressLevel: true,
          sleepHours: true,
          exercise: true,
          meditation: true
        }
      });

      return {
        summary: analytics,
        chartData: wellnessData,
        insights: this.generateWellnessInsights(analytics, wellnessData),
        recommendations: this.generateWellnessRecommendations(analytics)
      };
    } catch (error) {
      console.error('Error generating wellness report:', error);
      throw error;
    }
  }

  private generateWellnessInsights(analytics: WellnessMetrics, data: any[]): string[] {
    const insights: string[] = [];

    if (analytics.moodTrend === 'improving') {
      insights.push('Your mood has been steadily improving over the tracked period.');
    } else if (analytics.moodTrend === 'declining') {
      insights.push(
        'Your mood scores have been declining. Consider discussing this with your therapist.'
      );
    }

    if (analytics.averageAnxietyLevel > 7) {
      insights.push(
        'Your anxiety levels are consistently high. Stress management techniques may help.'
      );
    }

    const exerciseRate = data.filter(d => d.exercise).length / data.length;
    if (exerciseRate > 0.7) {
      insights.push('Great job maintaining a consistent exercise routine!');
    } else if (exerciseRate < 0.3) {
      insights.push('Increasing physical activity could help improve your overall wellness.');
    }

    return insights;
  }

  private generateWellnessRecommendations(analytics: WellnessMetrics): string[] {
    const recommendations: string[] = [];

    if (analytics.averageStressLevel > 6) {
      recommendations.push('Consider incorporating daily meditation or deep breathing exercises.');
      recommendations.push('Try progressive muscle relaxation techniques before bed.');
    }

    if (analytics.moodTrend === 'declining') {
      recommendations.push('Schedule a check-in with your therapist to discuss recent changes.');
      recommendations.push('Consider behavioral activation techniques to improve mood.');
    }

    recommendations.push('Continue tracking your wellness metrics to identify patterns.');

    return recommendations;
  }
}

export const analyticsService = new AnalyticsService();
