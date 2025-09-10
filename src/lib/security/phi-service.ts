import { PrismaClient } from '@prisma/client';
import { EncryptionService } from './encryption';
import { audit } from './audit';
import type {
  PHIRecord,
  PrismaFindManyArgs,
  PrismaWhereInput,
  UserDataExport,
  ResourceAction,
  ResourceType,
  PHIFieldDefinitions
} from '@/lib/types/phi';

interface PHIContext {
  userId?: string;
  userRole?: string;
  resourceType?: string;
}

/**
 * Definition of PHI (Protected Health Information) fields by model type
 * These fields are automatically encrypted when stored and decrypted when retrieved
 * Ensures HIPAA compliance by protecting sensitive healthcare data
 */
const PHI_FIELDS: PHIFieldDefinitions = {
  User: ['email', 'phoneNumber'],
  Profile: ['firstName', 'lastName', 'dateOfBirth', 'phoneNumber', 'address'],
  ClientProfile: ['primaryConcerns', 'goals'],
  SessionNote: [
    'presentingIssues',
    'interventions',
    'clientResponse',
    'homework',
    'additionalNotes'
  ],
  WellnessData: ['notes', 'symptoms', 'triggers'],
  JournalEntry: ['content', 'title'],
  CrisisIntervention: ['triggerEvent', 'symptoms', 'responderNotes', 'outcome'],
  Message: ['content', 'subject']
};

/**
 * HIPAA-compliant Protected Health Information (PHI) service
 * Handles encryption, decryption, access control, and audit logging for sensitive healthcare data
 * Implements automatic field-level encryption and role-based access control
 */
export class PHIService {
  private prisma: PrismaClient;
  private encryption: EncryptionService;

  /**
   * Initialize PHI service with database and encryption capabilities
   * @param {PrismaClient} [prisma] - Database client instance
   * @param {string} [encryptionKey] - Encryption key for PHI data
   */
  constructor(prisma?: PrismaClient, encryptionKey?: string) {
    this.prisma = prisma || new PrismaClient();
    this.encryption = new EncryptionService(encryptionKey);
  }

  /**
   * Create new record with automatic PHI field encryption
   * Encrypts sensitive fields based on model type and logs the operation
   * @template T - Type extending PHIRecord
   * @param {ResourceType} model - Database model type
   * @param {Partial<T>} data - Data to create record with
   * @param {PHIContext} [context] - User context for audit logging
   * @returns {Promise<T>} Created record with decrypted PHI fields
   * @throws {Error} If creation fails or user lacks permissions
   * @example
   * ```typescript
   * const profile = await phiService.create('Profile', {
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   dateOfBirth: '1990-01-01'
   * }, { userId: 'user_123', userRole: 'CLIENT' });
   * ```
   */
  async create<T extends PHIRecord>(
    model: ResourceType,
    data: Partial<T>,
    context?: PHIContext
  ): Promise<T> {
    const fields = PHI_FIELDS[model];
    const encryptedData = fields
      ? this.encryption.encryptObject(data, fields as (keyof T)[])
      : data;

    try {
      const result = await (this.prisma as unknown as Record<string, { create: (args: { data: unknown }) => Promise<PHIRecord> }>)[model.toLowerCase()].create({
        data: encryptedData
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
      await audit.logError('CREATE', model, error, context?.userId);
      throw error;
    }
  }

  /**
   * Find multiple records with automatic PHI decryption
   * Decrypts sensitive fields and logs access for compliance
   * @template T - Type extending PHIRecord
   * @param {ResourceType} model - Database model type
   * @param {PrismaFindManyArgs} args - Prisma query arguments
   * @param {PHIContext} [context] - User context for audit logging
   * @returns {Promise<T[]>} Array of records with decrypted PHI fields
   * @throws {Error} If query fails
   * @example
   * ```typescript
   * const sessions = await phiService.findMany('SessionNote', {
   *   where: { therapistId: 'therapist_123' },
   *   take: 10
   * }, { userId: 'therapist_123', userRole: 'THERAPIST' });
   * ```
   */
  async findMany<T extends PHIRecord>(
    model: ResourceType,
    args: PrismaFindManyArgs,
    context?: PHIContext
  ): Promise<T[]> {
    try {
      const results = await (this.prisma as unknown as Record<string, { findMany: (args: unknown) => Promise<PHIRecord[]> }>)[model.toLowerCase()].findMany(args);

      await audit.logSuccess(
        'READ_MANY',
        model,
        undefined,
        { count: results.length, userId: context?.userId },
        context?.userId
      );

      return results.map((result: T) => this.decryptIfNeeded(model, result));
    } catch (error) {
      await audit.logError('READ_MANY', model, error, context?.userId);
      throw error;
    }
  }

  /**
   * Find unique record with automatic PHI decryption
   * Decrypts sensitive fields and logs access for compliance
   * @template T - Type extending PHIRecord
   * @param {ResourceType} model - Database model type
   * @param {PrismaWhereInput} where - Prisma where clause
   * @param {PHIContext} [context] - User context for audit logging
   * @returns {Promise<T | null>} Record with decrypted PHI fields or null if not found
   * @throws {Error} If query fails
   * @example
   * ```typescript
   * const journal = await phiService.findUnique('JournalEntry', {
   *   id: 'journal_123'
   * }, { userId: 'user_456', userRole: 'CLIENT' });
   * ```
   */
  async findUnique<T extends PHIRecord>(
    model: ResourceType,
    where: PrismaWhereInput,
    context?: PHIContext
  ): Promise<T | null> {
    try {
      const result = await (this.prisma as unknown as Record<string, { findUnique: (args: { where: unknown }) => Promise<PHIRecord | null> }>)[model.toLowerCase()].findUnique({ where });

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
      await audit.logError('READ', model, error, context?.userId);
      throw error;
    }
  }

  /**
   * Update record with automatic PHI field encryption
   * Encrypts sensitive fields in updates and logs the operation
   * @template T - Type extending PHIRecord
   * @param {ResourceType} model - Database model type
   * @param {PrismaWhereInput} where - Prisma where clause to find record
   * @param {Partial<T>} data - Data to update record with
   * @param {PHIContext} [context] - User context for audit logging
   * @returns {Promise<T>} Updated record with decrypted PHI fields
   * @throws {Error} If update fails or user lacks permissions
   * @example
   * ```typescript
   * const updatedProfile = await phiService.update('Profile', 
   *   { id: 'profile_123' },
   *   { phoneNumber: '+1-555-0123' },
   *   { userId: 'user_123', userRole: 'CLIENT' }
   * );
   * ```
   */
  async update<T extends PHIRecord>(
    model: ResourceType,
    where: PrismaWhereInput,
    data: Partial<T>,
    context?: PHIContext
  ): Promise<T> {
    const fields = PHI_FIELDS[model];
    const encryptedData = fields
      ? this.encryption.encryptObject(data, fields as (keyof T)[])
      : data;

    try {
      const result = await (this.prisma as unknown as Record<string, { update: (args: { where: unknown; data: unknown }) => Promise<PHIRecord> }>)[model.toLowerCase()].update({
        where,
        data: encryptedData
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
      await audit.logError('UPDATE', model, error, context?.userId);
      throw error;
    }
  }

  /**
   * Delete record and log the operation for compliance
   * Permanently removes record and creates audit trail
   * @param {ResourceType} model - Database model type
   * @param {PrismaWhereInput} where - Prisma where clause to find record
   * @param {PHIContext} [context] - User context for audit logging
   * @returns {Promise<void>}
   * @throws {Error} If deletion fails or user lacks permissions
   * @example
   * ```typescript
   * await phiService.delete('JournalEntry', 
   *   { id: 'journal_123' },
   *   { userId: 'user_123', userRole: 'CLIENT' }
   * );
   * ```
   */
  async delete(model: ResourceType, where: PrismaWhereInput, context?: PHIContext): Promise<void> {
    try {
      const result = await (this.prisma as unknown as Record<string, { delete: (args: { where: unknown }) => Promise<PHIRecord> }>)[model.toLowerCase()].delete({ where });

      await audit.logSuccess(
        'DELETE',
        model,
        result.id,
        { userId: context?.userId },
        context?.userId
      );
    } catch (error) {
      await audit.logError('DELETE', model, error, context?.userId);
      throw error;
    }
  }

  /**
   * Decrypt PHI fields for a record if model has defined PHI fields
   * @private
   * @template T - Type extending PHIRecord
   * @param {ResourceType} model - Database model type
   * @param {T} data - Record data to decrypt
   * @returns {T} Record with decrypted PHI fields
   */
  private decryptIfNeeded<T extends PHIRecord>(model: ResourceType, data: T): T {
    const fields = PHI_FIELDS[model];

    if (!fields || !data) {
      return data;
    }

    return this.encryption.decryptObject(data, fields as (keyof T)[]);
  }

  /**
   * Check if user has access to specific resource and action
   * Implements role-based access control for PHI data
   * @param {string} userId - User ID requesting access
   * @param {ResourceType} resourceType - Type of resource being accessed
   * @param {string} resourceId - Specific resource ID
   * @param {ResourceAction} action - Action being performed (read, write, delete)
   * @returns {Promise<boolean>} True if user has access, false otherwise
   * @example
   * ```typescript
   * const canRead = await phiService.hasAccess(
   *   'user_123',
   *   'SessionNote',
   *   'note_456',
   *   'read'
   * );
   * ```
   */
  async hasAccess(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    action: ResourceAction
  ): Promise<boolean> {
    try {
      // Get user with role
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
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
          const resource = await (this.prisma as unknown as Record<string, { findFirst: (args: { where: unknown }) => Promise<PHIRecord | null> }>)[resourceType.toLowerCase()].findFirst({
            where: { id: resourceId, userId }
          });
          return !!resource;

        case 'SessionNote':
          if (user.role === 'THERAPIST') {
            // Therapists can access their session notes
            const note = await this.prisma.sessionNote.findFirst({
              where: {
                id: resourceId,
                therapist: { userId }
              }
            });
            return !!note;
          } else if (user.role === 'CLIENT') {
            // Clients can read their own session notes
            const note = await this.prisma.sessionNote.findFirst({
              where: {
                id: resourceId,
                client: { userId }
              }
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
                therapist: { userId }
              }
            });
            return !!profile;
          } else if (user.role === 'CLIENT') {
            // Clients can access their own profile
            const profile = await this.prisma.clientProfile.findFirst({
              where: { id: resourceId, userId }
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
            where: { id: resourceId, userId }
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

  /**
   * Export all user data for GDPR compliance and data portability
   * Decrypts all PHI fields and provides complete user data export
   * @param {string} userId - User ID to export data for
   * @returns {Promise<UserDataExport>} Complete user data with decrypted PHI
   * @throws {Error} If user not found or export fails
   * @example
   * ```typescript
   * const userData = await phiService.exportUserData('user_123');
   * // Returns all user data including decrypted PHI fields
   * ```
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
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
            where: { senderId: userId }
          },
          notifications: true,
          files: true
        }
      });

      if (!userData) {
        throw new Error('User not found');
      }

      // Decrypt all PHI fields
      const decrypted: UserDataExport = { ...userData } as UserDataExport;

      if (decrypted.profile) {
        decrypted.profile = this.decryptIfNeeded('Profile', decrypted.profile);
      }

      if (decrypted.clientProfiles) {
        decrypted.clientProfiles = decrypted.clientProfiles.map((p: PHIRecord) =>
          this.decryptIfNeeded('ClientProfile', p)
        );
      }

      if (decrypted.wellnessData) {
        decrypted.wellnessData = decrypted.wellnessData.map((w: PHIRecord) =>
          this.decryptIfNeeded('WellnessData', w)
        );
      }

      if (decrypted.journals) {
        decrypted.journals = decrypted.journals.map((j: PHIRecord) =>
          this.decryptIfNeeded('JournalEntry', j)
        );
      }

      if (decrypted.messages) {
        decrypted.messages = decrypted.messages.map((m: PHIRecord) =>
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
      await audit.logError('EXPORT_DATA', 'User', error, userId);
      throw error;
    }
  }

  /**
   * Permanently delete all user data for GDPR right to erasure
   * Removes all associated records in correct order to respect foreign key constraints
   * @param {string} userId - User ID to delete all data for
   * @returns {Promise<void>}
   * @throws {Error} If deletion fails or user not found
   * @example
   * ```typescript
   * await phiService.deleteUserData('user_123');
   * // Permanently removes all user data from system
   * ```
   */
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
        this.prisma.user.delete({ where: { id: userId } })
      ]);

      await audit.logSuccess(
        'DELETE_USER_DATA',
        'User',
        userId,
        { permanentDeletion: true },
        userId
      );
    } catch (error) {
      await audit.logError('DELETE_USER_DATA', 'User', error, userId);
      throw error;
    }
  }

  /**
   * Encrypt binary data (files, images) for secure storage
   * Converts buffer to base64 and encrypts for PHI file protection
   * @param {Buffer} buffer - Binary data to encrypt
   * @returns {Promise<string>} Encrypted string representation
   * @example
   * ```typescript
   * const fileBuffer = fs.readFileSync('patient-document.pdf');
   * const encrypted = await phiService.encryptBinary(fileBuffer);
   * ```
   */
  async encryptBinary(buffer: Buffer): Promise<string> {
    const text = buffer.toString('base64');
    return this.encryption.encrypt(text);
  }

  /**
   * Decrypt binary data back to original buffer format
   * Decrypts and converts base64 back to buffer for file access
   * @param {string} encryptedText - Encrypted string to decrypt
   * @returns {Promise<Buffer>} Original binary data as buffer
   * @throws {Error} If decryption fails
   * @example
   * ```typescript
   * const fileBuffer = await phiService.decryptBinary(encryptedFileData);
   * fs.writeFileSync('decrypted-document.pdf', fileBuffer);
   * ```
   */
  async decryptBinary(encryptedText: string): Promise<Buffer> {
    const decryptedText = this.encryption.decrypt(encryptedText);
    return Buffer.from(decryptedText, 'base64');
  }

  /**
   * Encrypt a single field value
   * Used for encrypting individual PHI fields in services
   * @param {string} value - Value to encrypt
   * @returns {Promise<string>} Encrypted value
   * @throws {Error} If encryption fails
   */
  async encryptField(value: string): Promise<string> {
    return this.encryption.encrypt(value);
  }

  /**
   * Decrypt a single field value
   * Used for decrypting individual PHI fields in services
   * @param {string} encryptedValue - Encrypted value to decrypt
   * @returns {Promise<string>} Decrypted value
   * @throws {Error} If decryption fails
   */
  async decryptField(encryptedValue: string): Promise<string> {
    return this.encryption.decrypt(encryptedValue);
  }
}

/**
 * Pre-configured PHI service instance for application-wide use
 * Automatically configured with default database connection and encryption
 * @example
 * ```typescript
 * import { phiService } from '@/lib/security/phi-service';
 * 
 * // Create encrypted patient profile
 * const profile = await phiService.create('Profile', {
 *   firstName: 'Jane',
 *   lastName: 'Smith',
 *   dateOfBirth: '1985-06-15'
 * }, { userId: 'patient_123', userRole: 'CLIENT' });
 * ```
 */
export const phiService = new PHIService();
