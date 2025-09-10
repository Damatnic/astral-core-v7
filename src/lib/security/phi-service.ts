import { PrismaClient } from '@prisma/client';
import { EncryptionService } from './encryption';
import { audit } from './audit';

interface PHIContext {
  userId?: string;
  userRole?: string;
  resourceType?: string;
}

const PHI_FIELDS: Record<string, string[]> = {
  Profile: ['firstName', 'lastName', 'dateOfBirth', 'phoneNumber', 'address'],
  ClientProfile: ['primaryConcerns', 'goals'],
  SessionNote: ['presentingIssues', 'interventions', 'clientResponse', 'homework', 'additionalNotes'],
  WellnessData: ['notes', 'symptoms', 'triggers'],
  JournalEntry: ['content', 'title'],
  CrisisIntervention: ['triggerEvent', 'symptoms', 'responderNotes', 'outcome'],
  Message: ['content', 'subject'],
};

export class PHIService {
  private prisma: PrismaClient;
  private encryption: EncryptionService;

  constructor(prisma?: PrismaClient, encryptionKey?: string) {
    this.prisma = prisma || new PrismaClient();
    this.encryption = new EncryptionService(encryptionKey);
  }

  async create<T extends Record<string, any>>(
    model: string,
    data: T,
    context?: PHIContext
  ): Promise<T> {
    const fields = PHI_FIELDS[model];
    const encryptedData = fields 
      ? this.encryption.encryptObject(data, fields as (keyof T)[])
      : data;

    try {
      const result = await (this.prisma as any)[model].create({
        data: encryptedData,
      });

      await audit.logSuccess(
        'CREATE',
        model,
        result.id,
        { userId: context?.userId, role: context?.userRole },
        context?.userId
      );

      return this.decryptIfNeeded(model, result);
    } catch (error) {
      await audit.logError(
        'CREATE',
        model,
        error,
        context?.userId
      );
      throw error;
    }
  }

  async findMany<T extends Record<string, any>>(
    model: string,
    args: any,
    context?: PHIContext
  ): Promise<T[]> {
    try {
      const results = await (this.prisma as any)[model].findMany(args);

      await audit.logSuccess(
        'READ_MANY',
        model,
        undefined,
        { count: results.length, userId: context?.userId },
        context?.userId
      );

      return results.map((result: T) => this.decryptIfNeeded(model, result));
    } catch (error) {
      await audit.logError(
        'READ_MANY',
        model,
        error,
        context?.userId
      );
      throw error;
    }
  }

  async findUnique<T extends Record<string, any>>(
    model: string,
    where: any,
    context?: PHIContext
  ): Promise<T | null> {
    try {
      const result = await (this.prisma as any)[model].findUnique({ where });

      if (result) {
        await audit.logSuccess(
          'READ',
          model,
          result.id,
          { userId: context?.userId },
          context?.userId
        );

        return this.decryptIfNeeded(model, result);
      }

      return null;
    } catch (error) {
      await audit.logError(
        'READ',
        model,
        error,
        context?.userId
      );
      throw error;
    }
  }

  async update<T extends Record<string, any>>(
    model: string,
    where: any,
    data: T,
    context?: PHIContext
  ): Promise<T> {
    const fields = PHI_FIELDS[model];
    const encryptedData = fields 
      ? this.encryption.encryptObject(data, fields as (keyof T)[])
      : data;

    try {
      const result = await (this.prisma as any)[model].update({
        where,
        data: encryptedData,
      });

      await audit.logSuccess(
        'UPDATE',
        model,
        result.id,
        { userId: context?.userId, changes: Object.keys(data) },
        context?.userId
      );

      return this.decryptIfNeeded(model, result);
    } catch (error) {
      await audit.logError(
        'UPDATE',
        model,
        error,
        context?.userId
      );
      throw error;
    }
  }

  async delete(
    model: string,
    where: any,
    context?: PHIContext
  ): Promise<void> {
    try {
      const result = await (this.prisma as any)[model].delete({ where });

      await audit.logSuccess(
        'DELETE',
        model,
        result.id,
        { userId: context?.userId },
        context?.userId
      );
    } catch (error) {
      await audit.logError(
        'DELETE',
        model,
        error,
        context?.userId
      );
      throw error;
    }
  }

  private decryptIfNeeded<T extends Record<string, any>>(
    model: string,
    data: T
  ): T {
    const fields = PHI_FIELDS[model];
    
    if (!fields || !data) {
      return data;
    }

    return this.encryption.decryptObject(data, fields as (keyof T)[]);
  }

  async hasAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string
  ): Promise<boolean> {
    try {
      // Get user with role
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        return false;
      }

      // Admin has access to everything
      if (user.role === 'ADMIN') {
        return true;
      }

      // Check resource-specific access
      switch (resourceType) {
        case 'Profile':
        case 'WellnessData':
        case 'JournalEntry':
          // Users can access their own data
          const resource = await (this.prisma as any)[resourceType].findFirst({
            where: { id: resourceId, userId },
          });
          return !!resource;

        case 'SessionNote':
          if (user.role === 'THERAPIST') {
            // Therapists can access their session notes
            const note = await this.prisma.sessionNote.findFirst({
              where: { 
                id: resourceId,
                therapist: { userId },
              },
            });
            return !!note;
          } else if (user.role === 'CLIENT') {
            // Clients can read their own session notes
            const note = await this.prisma.sessionNote.findFirst({
              where: {
                id: resourceId,
                client: { userId },
              },
            });
            return !!note && action === 'READ';
          }
          return false;

        case 'ClientProfile':
          if (user.role === 'THERAPIST') {
            // Therapists can access their clients' profiles
            const profile = await this.prisma.clientProfile.findFirst({
              where: {
                id: resourceId,
                therapist: { userId },
              },
            });
            return !!profile;
          } else if (user.role === 'CLIENT') {
            // Clients can access their own profile
            const profile = await this.prisma.clientProfile.findFirst({
              where: { id: resourceId, userId },
            });
            return !!profile;
          }
          return false;

        case 'CrisisIntervention':
          if (user.role === 'CRISIS_RESPONDER' || user.role === 'THERAPIST') {
            return true;
          }
          // Users can access their own crisis interventions
          const crisis = await this.prisma.crisisIntervention.findFirst({
            where: { id: resourceId, userId },
          });
          return !!crisis;

        default:
          return false;
      }
    } catch (error) {
      console.error('Access check error:', error);
      return false;
    }
  }

  async exportUserData(userId: string): Promise<Record<string, any>> {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          therapistProfile: true,
          clientProfiles: true,
          wellnessData: true,
          journals: true,
          appointments: true,
          crisisInterventions: true,
          messages: {
            where: { senderId: userId },
          },
          notifications: true,
          files: true,
        },
      });

      if (!userData) {
        throw new Error('User not found');
      }

      // Decrypt all PHI fields
      const decrypted: any = { ...userData };
      
      if (decrypted.profile) {
        decrypted.profile = this.decryptIfNeeded('Profile', decrypted.profile);
      }
      
      if (decrypted.clientProfiles) {
        decrypted.clientProfiles = decrypted.clientProfiles.map((p: any) => 
          this.decryptIfNeeded('ClientProfile', p)
        );
      }
      
      if (decrypted.wellnessData) {
        decrypted.wellnessData = decrypted.wellnessData.map((w: any) => 
          this.decryptIfNeeded('WellnessData', w)
        );
      }
      
      if (decrypted.journals) {
        decrypted.journals = decrypted.journals.map((j: any) => 
          this.decryptIfNeeded('JournalEntry', j)
        );
      }
      
      if (decrypted.messages) {
        decrypted.messages = decrypted.messages.map((m: any) => 
          this.decryptIfNeeded('Message', m)
        );
      }

      await audit.logSuccess(
        'EXPORT_DATA',
        'User',
        userId,
        { dataTypes: Object.keys(decrypted) },
        userId
      );

      return decrypted;
    } catch (error) {
      await audit.logError(
        'EXPORT_DATA',
        'User',
        error,
        userId
      );
      throw error;
    }
  }

  async deleteUserData(userId: string): Promise<void> {
    try {
      // Delete in correct order to respect foreign key constraints
      await this.prisma.$transaction([
        this.prisma.notification.deleteMany({ where: { userId } }),
        this.prisma.message.deleteMany({ where: { senderId: userId } }),
        this.prisma.file.deleteMany({ where: { userId } }),
        this.prisma.journalEntry.deleteMany({ where: { userId } }),
        this.prisma.wellnessData.deleteMany({ where: { userId } }),
        this.prisma.crisisIntervention.deleteMany({ where: { userId } }),
        this.prisma.appointment.deleteMany({ where: { userId } }),
        this.prisma.clientProfile.deleteMany({ where: { userId } }),
        this.prisma.therapistProfile.deleteMany({ where: { userId } }),
        this.prisma.profile.deleteMany({ where: { userId } }),
        this.prisma.session.deleteMany({ where: { userId } }),
        this.prisma.account.deleteMany({ where: { userId } }),
        this.prisma.user.delete({ where: { id: userId } }),
      ]);

      await audit.logSuccess(
        'DELETE_USER_DATA',
        'User',
        userId,
        { permanentDeletion: true },
        userId
      );
    } catch (error) {
      await audit.logError(
        'DELETE_USER_DATA',
        'User',
        error,
        userId
      );
      throw error;
    }
  }

  // Binary encryption for files
  async encryptBinary(buffer: Buffer): Promise<string> {
    const text = buffer.toString('base64');
    return this.encryption.encrypt(text);
  }

  async decryptBinary(encryptedText: string): Promise<Buffer> {
    const decryptedText = this.encryption.decrypt(encryptedText);
    return Buffer.from(decryptedText, 'base64');
  }
}

export const phiService = new PHIService();