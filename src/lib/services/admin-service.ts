import { prisma } from '../db';
import { audit } from '../security/audit';
import { notificationService } from './notification-service';
import { websocketServer } from '../websocket/server';
import { phiService } from '../security/phi-service';
import { UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logError } from '../logger';

interface CreateUserDto {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  sendWelcomeEmail?: boolean;
  phoneNumber?: string;
  temporaryAccess?: boolean;
}

interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  createdAfter?: Date;
  lastLoginBefore?: Date;
  limit?: number;
  offset?: number;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Record<UserRole, number>;
  usersByStatus: Record<UserStatus, number>;
  recentSignups: number;
  activeThisWeek: number;
}

interface UserActivity {
  userId: string;
  user: {
    name: string;
    email: string;
    role: UserRole;
  };
  lastLogin: Date | null;
  loginCount: number;
  appointmentsCount: number;
  messagesCount: number;
  filesCount: number;
  riskScore: number;
}

export class AdminService {
  // Require admin privileges for all methods
  private async requireAdmin(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, status: true }
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin privileges required');
    }

    if (admin.status !== 'ACTIVE') {
      throw new Error('Admin account is not active');
    }

    return admin;
  }

  // Get system statistics
  async getSystemStats(adminId: string): Promise<SystemStats> {
    await this.requireAdmin(adminId);

    try {
      const [totalUsers, activeUsers, usersByRole, usersByStatus, recentSignups, recentLogins] =
        await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { status: 'ACTIVE' } }),
          prisma.user.groupBy({
            by: ['role'],
            _count: { role: true }
          }),
          prisma.user.groupBy({
            by: ['status'],
            _count: { status: true }
          }),
          prisma.user.count({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
              }
            }
          }),
          prisma.user.count({
            where: {
              lastLogin: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
              }
            }
          })
        ]);

      // Transform grouped data
      const roleStats = usersByRole.reduce(
        (acc, { role, _count }) => {
          acc[role] = _count.role;
          return acc;
        },
        {} as Record<UserRole, number>
      );

      const statusStats = usersByStatus.reduce(
        (acc, { status, _count }) => {
          acc[status] = _count.status;
          return acc;
        },
        {} as Record<UserStatus, number>
      );

      return {
        totalUsers,
        activeUsers,
        usersByRole: roleStats,
        usersByStatus: statusStats,
        recentSignups,
        activeThisWeek: recentLogins
      };
    } catch (error) {
      logError('Error getting system stats', error, 'AdminService');
      throw error;
    }
  }

  // Get all users with filters
  async getUsers(adminId: string, filters: UserFilters = {}) {
    await this.requireAdmin(adminId);

    try {
      const where: Record<string, unknown> = {};

      if (filters.role) {
        where['role'] = filters.role;
      }

      if (filters.status) {
        where['status'] = filters.status;
      }

      if (filters.search) {
        where['OR'] = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      if (filters.createdAfter) {
        where['createdAt'] = { gte: filters.createdAfter };
      }

      if (filters.lastLoginBefore) {
        where['lastLogin'] = { lt: filters.lastLoginBefore };
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
            mfaEnabled: true,
            profile: {
              select: {
                id: true,
                phoneNumber: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: filters.limit || 50,
          skip: filters.offset || 0
        }),
        prisma.user.count({ where })
      ]);

      // Audit log
      await audit.logSuccess(
        'ADMIN_USERS_VIEWED',
        'User',
        'bulk',
        { filters, resultCount: users.length },
        adminId
      );

      return {
        users,
        total,
        hasMore: (filters.offset || 0) + users.length < total
      };
    } catch (error) {
      logError('Error getting users', error, 'AdminService');
      throw error;
    }
  }

  // Create a new user
  async createUser(adminId: string, userData: CreateUserDto) {
    await this.requireAdmin(adminId);

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Generate password if not provided
      let hashedPassword: string | undefined;
      let tempPassword: string | undefined;

      if (userData.password) {
        hashedPassword = await bcrypt.hash(userData.password, 12);
      } else {
        // Generate temporary password
        tempPassword = this.generateTemporaryPassword();
        hashedPassword = await bcrypt.hash(tempPassword, 12);
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          password: hashedPassword,
          status: 'ACTIVE',
          emailVerified: new Date() // Auto-verify admin-created users
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true
        }
      });

      // Create role-specific profile
      if (userData.role === 'THERAPIST') {
        await prisma.therapistProfile.create({
          data: {
            userId: user.id,
            licenseNumber: '', // To be filled by therapist
            licenseState: 'PENDING', // To be updated
            licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
            yearsOfExperience: 0, // To be updated
            specializations: [],
            availableHours: {}
          }
        });
      } else if (userData.role === 'CLIENT') {
        await prisma.profile.create({
          data: {
            userId: user.id,
            firstName: userData.name?.split(' ')[0] || '',
            lastName: userData.name?.split(' ')[1] || '',
            dateOfBirth: new Date(1990, 0, 1), // Default date to be updated
            ...(userData.phoneNumber && { phoneNumber: userData.phoneNumber })
          }
        });
      }

      // Send welcome notification
      if (userData.sendWelcomeEmail !== false) {
        await notificationService.createNotification({
          userId: user.id,
          title: 'Welcome to Astral Core',
          message: `Your account has been created with ${userData.role.toLowerCase()} privileges.${
            tempPassword ? ` Your temporary password is: ${tempPassword}` : ''
          }`,
          type: 'SYSTEM',
          priority: 'HIGH',
          actionUrl: '/profile/settings'
        });
      }

      // Real-time notification to other admins
      websocketServer.sendToRole('ADMIN', 'user:created', {
        userId: user.id,
        userName: user.name,
        role: user.role,
        createdBy: adminId
      } as never);

      // Audit log
      await audit.logSuccess(
        'ADMIN_USER_CREATED',
        'User',
        user.id,
        { role: userData.role, hasTemporaryPassword: !!tempPassword },
        adminId
      );

      return {
        user,
        temporaryPassword: tempPassword
      };
    } catch (error) {
      logError('Error creating user', error, 'AdminService');
      throw error;
    }
  }

  // Update user details
  async updateUser(
    adminId: string,
    userId: string,
    updates: {
      name?: string;
      email?: string;
      role?: UserRole;
      status?: UserStatus;
      phoneNumber?: string;
    }
  ) {
    await this.requireAdmin(adminId);

    try {
      // Prevent admins from modifying their own role/status
      if (userId === adminId && (updates.role || updates.status)) {
        throw new Error('Cannot modify your own role or status');
      }

      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Check email uniqueness if changing email
      if (updates.email && updates.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updates.email }
        });
        if (emailExists) {
          throw new Error('Email already in use');
        }
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(updates.name && { name: updates.name }),
          ...(updates.email && { email: updates.email }),
          ...(updates.role && { role: updates.role }),
          ...(updates.status && { status: updates.status }),
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Update profile if phone number changed
      if (updates.phoneNumber) {
        await prisma.profile.upsert({
          where: { userId },
          create: {
            userId,
            firstName: 'First', // Default value
            lastName: 'Last', // Default value
            dateOfBirth: new Date(1990, 0, 1), // Default date
            phoneNumber: updates.phoneNumber
          },
          update: {
            phoneNumber: updates.phoneNumber
          }
        });
      }

      // Notify user of changes
      await notificationService.createNotification({
        userId,
        title: 'Account Updated',
        message: 'Your account details have been updated by an administrator.',
        type: 'SYSTEM',
        priority: 'HIGH'
      });

      // Real-time notification
      websocketServer.sendToUser(userId, 'profile:updated', {
        type: 'profile:updated',
        timestamp: Date.now(),
        data: updates
      });

      // Audit log
      await audit.logSuccess('ADMIN_USER_UPDATED', 'User', userId, { changes: updates }, adminId);

      return updatedUser;
    } catch (error) {
      logError('Error updating user', error, 'AdminService');
      throw error;
    }
  }

  // Suspend/Unsuspend user
  async toggleUserSuspension(adminId: string, userId: string, reason?: string) {
    await this.requireAdmin(adminId);

    try {
      if (userId === adminId) {
        throw new Error('Cannot suspend your own account');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { status: true, name: true, email: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const newStatus = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status: newStatus }
      });

      // Notify user
      await notificationService.createNotification({
        userId,
        title: `Account ${newStatus === 'SUSPENDED' ? 'Suspended' : 'Reactivated'}`,
        message: `Your account has been ${newStatus.toLowerCase()}${
          reason ? `. Reason: ${reason}` : ''
        }`,
        type: 'SYSTEM',
        priority: 'URGENT'
      });

      // Force logout if suspended
      if (newStatus === 'SUSPENDED') {
        websocketServer.sendToUser(userId, 'account:suspended', {
          reason: reason || 'No reason provided'
        } as never);
      }

      // Audit log
      await audit.logSuccess(
        newStatus === 'SUSPENDED' ? 'ADMIN_USER_SUSPENDED' : 'ADMIN_USER_REACTIVATED',
        'User',
        userId,
        { info: reason as never },
        adminId
      );

      return updatedUser;
    } catch (error) {
      logError('Error toggling user suspension', error, 'AdminService');
      throw error;
    }
  }

  // Reset user password
  async resetUserPassword(adminId: string, userId: string) {
    await this.requireAdmin(adminId);

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new temporary password
      const tempPassword = this.generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          // Force password change on next login
          passwordResetToken: crypto.randomBytes(32).toString('hex'),
          passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      // Notify user
      await notificationService.createNotification({
        userId,
        title: 'Password Reset',
        message: `Your password has been reset by an administrator. New temporary password: ${tempPassword}`,
        type: 'SYSTEM',
        priority: 'URGENT'
      });

      // Audit log
      await audit.logSuccess('ADMIN_PASSWORD_RESET', 'User', userId, {}, adminId);

      return { temporaryPassword: tempPassword };
    } catch (error) {
      logError('Error resetting password', error, 'AdminService');
      throw error;
    }
  }

  // Get user activity report
  async getUserActivity(
    adminId: string,
    filters: {
      days?: number;
      limit?: number;
      riskThreshold?: number;
    } = {}
  ): Promise<UserActivity[]> {
    await this.requireAdmin(adminId);

    try {
      const days = filters.days || 30;
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const users = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          lastLogin: {
            gte: cutoffDate
          }
        },
        include: {
          _count: {
            select: {
              appointments: true,
              messages: true,
              files: true
            }
          }
        },
        orderBy: { lastLogin: 'desc' },
        take: filters.limit || 100
      });

      // Calculate risk scores and format data
      const activities: UserActivity[] = users.map(user => {
        // Simple risk scoring algorithm
        let riskScore = 0;

        // No recent login
        if (!user.lastLogin || user.lastLogin < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
          riskScore += 30;
        }

        // Low activity
        if (user._count.appointments < 1 && user._count.messages < 5) {
          riskScore += 20;
        }

        // No MFA
        if (!user.mfaEnabled) {
          riskScore += 25;
        }

        // Multiple failed login attempts (would need to track this)

        return {
          userId: user.id,
          user: {
            name: user.name || 'Unknown',
            email: user.email,
            role: user.role
          },
          lastLogin: user.lastLogin,
          loginCount: 0,
          appointmentsCount: user._count.appointments,
          messagesCount: user._count.messages,
          filesCount: user._count.files,
          riskScore: Math.min(riskScore, 100)
        };
      });

      // Filter by risk threshold if specified
      if (filters.riskThreshold) {
        return activities.filter(activity => activity.riskScore >= filters.riskThreshold!);
      }

      return activities;
    } catch (error) {
      logError('Error getting user activity', error, 'AdminService');
      throw error;
    }
  }

  // Delete user (GDPR compliance)
  async deleteUser(adminId: string, userId: string, reason?: string) {
    await this.requireAdmin(adminId);

    try {
      if (userId === adminId) {
        throw new Error('Cannot delete your own account');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, role: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Use PHI service for GDPR-compliant deletion
      await phiService.deleteUserData(userId);

      // Audit log (before user is deleted)
      await audit.logSuccess(
        'ADMIN_USER_DELETED',
        'User',
        userId,
        { info: reason as never, userEmail: user.email, userRole: user.role },
        adminId
      );

      return { success: true };
    } catch (error) {
      logError('Error deleting user', error, 'AdminService');
      throw error;
    }
  }

  // Generate audit report
  async generateAuditReport(
    adminId: string,
    filters: {
      startDate: Date;
      endDate: Date;
      action?: string;
      userId?: string;
    }
  ) {
    await this.requireAdmin(adminId);

    try {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate
          },
          ...(filters.action && { action: filters.action }),
          ...(filters.userId && { userId: filters.userId })
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Audit the audit report generation
      await audit.logSuccess(
        'AUDIT_REPORT_GENERATED',
        'AuditLog',
        'bulk',
        {
          dateRange: { start: filters.startDate, end: filters.endDate },
          recordCount: auditLogs.length
        },
        adminId
      );

      return auditLogs;
    } catch (error) {
      logError('Error generating audit report', error, 'AdminService');
      throw error;
    }
  }

  // Helper methods
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // System health check
  async getSystemHealth(adminId: string) {
    await this.requireAdmin(adminId);

    try {
      const [dbStatus, userCount, recentErrors, diskSpace] = await Promise.all([
        this.checkDatabaseHealth(),
        prisma.user.count(),
        this.getRecentErrors(),
        this.checkDiskSpace()
      ]);

      return {
        database: dbStatus,
        users: {
          total: userCount,
          status: userCount > 0 ? 'healthy' : 'warning'
        },
        errors: recentErrors,
        storage: diskSpace,
        timestamp: new Date()
      };
    } catch (error) {
      logError('Error checking system health', error, 'AdminService');
      throw error;
    }
  }

  private async checkDatabaseHealth() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', message: 'Database connection successful' };
    } catch {
      return { status: 'error', message: 'Database connection failed' };
    }
  }

  private async getRecentErrors() {
    try {
      const errors = await prisma.auditLog.findMany({
        where: {
          outcome: 'FAILURE',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      return {
        count: errors.length,
        recent: errors,
        status: errors.length < 10 ? 'healthy' : 'warning'
      };
    } catch {
      return { count: 0, recent: [], status: 'unknown' };
    }
  }

  private async checkDiskSpace() {
    // Placeholder - in production, implement actual disk space checking
    return {
      used: '45%',
      available: '55%',
      status: 'healthy'
    };
  }
}

export const adminService = new AdminService();
