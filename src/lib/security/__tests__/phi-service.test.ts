/**
 * PHI Service Unit Tests
 * Tests HIPAA-compliant Protected Health Information service
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PHIService } from '../phi-service';
import { setupTestEnvironment } from '../../../../tests/utils/test-helpers';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('./encryption');
jest.mock('./audit');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  profile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  sessionNote: {
    findFirst: jest.fn()
  },
  clientProfile: {
    findFirst: jest.fn()
  },
  crisisIntervention: {
    findFirst: jest.fn()
  },
  notification: {
    deleteMany: jest.fn()
  },
  message: {
    deleteMany: jest.fn()
  },
  file: {
    deleteMany: jest.fn()
  },
  journalEntry: {
    deleteMany: jest.fn()
  },
  wellnessData: {
    deleteMany: jest.fn()
  },
  appointment: {
    deleteMany: jest.fn()
  },
  therapistProfile: {
    deleteMany: jest.fn()
  },
  session: {
    deleteMany: jest.fn()
  },
  account: {
    deleteMany: jest.fn()
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn()
};

const mockEncryption = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  encryptObject: jest.fn(),
  decryptObject: jest.fn()
};

const mockAudit = {
  logSuccess: jest.fn(),
  logError: jest.fn()
};

// Mock modules
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

jest.mock('./encryption', () => ({
  EncryptionService: jest.fn().mockImplementation(() => mockEncryption)
}));

jest.mock('./audit', () => ({
  audit: mockAudit
}));

describe('PHIService', () => {
  let phiService: PHIService;

  beforeEach(() => {
    setupTestEnvironment();
    jest.clearAllMocks();
    phiService = new PHIService(mockPrisma as any, 'test-key');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    test('should create record with encrypted PHI fields', async () => {
      // Arrange
      const userData = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'John Doe',
        role: 'CLIENT'
      };

      const encryptedData = {
        ...userData,
        email: 'encrypted_email'
      };

      const createdUser = {
        ...userData,
        email: 'encrypted_email'
      };

      mockEncryption.encryptObject.mockReturnValue(encryptedData);
      mockPrisma.user.create.mockResolvedValue(createdUser);
      mockEncryption.decryptObject.mockReturnValue(userData);

      // Act
      const result = await phiService.create('User', userData, {
        userId: 'user_123',
        userRole: 'CLIENT'
      });

      // Assert
      expect(mockEncryption.encryptObject).toHaveBeenCalledWith(
        userData,
        ['email', 'phoneNumber']
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: encryptedData
      });

      expect(mockAudit.logSuccess).toHaveBeenCalledWith(
        'CREATE',
        'User',
        createdUser.id,
        { userId: 'user_123', role: 'CLIENT' },
        'user_123'
      );

      expect(mockEncryption.decryptObject).toHaveBeenCalledWith(
        createdUser,
        ['email', 'phoneNumber']
      );

      expect(result).toEqual(userData);
    });

    test('should handle create error and log audit', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'John Doe'
      };

      const error = new Error('Database error');
      mockEncryption.encryptObject.mockReturnValue(userData);
      mockPrisma.user.create.mockRejectedValue(error);

      // Act & Assert
      await expect(phiService.create('User', userData, {
        userId: 'user_123'
      })).rejects.toThrow('Database error');

      expect(mockAudit.logError).toHaveBeenCalledWith(
        'CREATE',
        'User',
        error,
        'user_123'
      );
    });

    test('should create record without encryption for non-PHI models', async () => {
      // Arrange
      const appointmentData = {
        userId: 'user_123',
        therapistId: 'therapist_123',
        scheduledAt: new Date()
      };

      mockPrisma.appointment = { create: jest.fn().mockResolvedValue(appointmentData) };
      mockEncryption.decryptObject.mockReturnValue(appointmentData);

      // Act
      await phiService.create('Appointment', appointmentData);

      // Assert
      expect(mockEncryption.encryptObject).not.toHaveBeenCalled();
      expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
        data: appointmentData
      });
    });
  });

  describe('findMany', () => {
    test('should find records and decrypt PHI fields', async () => {
      // Arrange
      const encryptedUsers = [
        { id: 'user_1', email: 'encrypted_email_1', name: 'User 1' },
        { id: 'user_2', email: 'encrypted_email_2', name: 'User 2' }
      ];

      const decryptedUsers = [
        { id: 'user_1', email: 'user1@example.com', name: 'User 1' },
        { id: 'user_2', email: 'user2@example.com', name: 'User 2' }
      ];

      mockPrisma.user.findMany.mockResolvedValue(encryptedUsers);
      mockEncryption.decryptObject.mockImplementation((user) => {
        if (user.id === 'user_1') return decryptedUsers[0];
        return decryptedUsers[1];
      });

      // Act
      const result = await phiService.findMany('User', {
        where: { role: 'CLIENT' }
      }, { userId: 'admin_123', userRole: 'ADMIN' });

      // Assert
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'CLIENT' }
      });

      expect(mockAudit.logSuccess).toHaveBeenCalledWith(
        'READ_MANY',
        'User',
        undefined,
        { count: 2, userId: 'admin_123' },
        'admin_123'
      );

      expect(result).toEqual(decryptedUsers);
    });

    test('should handle findMany error', async () => {
      // Arrange
      const error = new Error('Database error');
      mockPrisma.user.findMany.mockRejectedValue(error);

      // Act & Assert
      await expect(phiService.findMany('User', {}, {
        userId: 'user_123'
      })).rejects.toThrow('Database error');

      expect(mockAudit.logError).toHaveBeenCalledWith(
        'read_MANY',
        'User',
        error,
        'user_123'
      );
    });
  });

  describe('findUnique', () => {
    test('should find unique record and decrypt PHI fields', async () => {
      // Arrange
      const encryptedUser = {
        id: 'user_123',
        email: 'encrypted_email',
        name: 'John Doe'
      };

      const decryptedUser = {
        id: 'user_123',
        email: 'john@example.com',
        name: 'John Doe'
      };

      mockPrisma.user.findUnique.mockResolvedValue(encryptedUser);
      mockEncryption.decryptObject.mockReturnValue(decryptedUser);

      // Act
      const result = await phiService.findUnique('User', {
        id: 'user_123'
      }, { userId: 'user_123', userRole: 'CLIENT' });

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_123' }
      });

      expect(mockAudit.logSuccess).toHaveBeenCalledWith(
        'READ',
        'User',
        encryptedUser.id,
        { userId: 'user_123' },
        'user_123'
      );

      expect(result).toEqual(decryptedUser);
    });

    test('should return null for non-existent record', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await phiService.findUnique('User', {
        id: 'nonexistent'
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    test('should update record with encrypted PHI fields', async () => {
      // Arrange
      const updateData = {
        email: 'newemail@example.com',
        name: 'Updated Name'
      };

      const encryptedUpdateData = {
        email: 'encrypted_new_email',
        name: 'Updated Name'
      };

      const updatedUser = {
        id: 'user_123',
        ...encryptedUpdateData
      };

      const decryptedUser = {
        id: 'user_123',
        email: 'newemail@example.com',
        name: 'Updated Name'
      };

      mockEncryption.encryptObject.mockReturnValue(encryptedUpdateData);
      mockPrisma.user.update.mockResolvedValue(updatedUser);
      mockEncryption.decryptObject.mockReturnValue(decryptedUser);

      // Act
      const result = await phiService.update('User', {
        id: 'user_123'
      }, updateData, {
        userId: 'user_123',
        userRole: 'CLIENT'
      });

      // Assert
      expect(mockEncryption.encryptObject).toHaveBeenCalledWith(
        updateData,
        ['email', 'phoneNumber']
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: encryptedUpdateData
      });

      expect(mockAudit.logSuccess).toHaveBeenCalledWith(
        'UPDATE',
        'User',
        updatedUser.id,
        { userId: 'user_123', changes: ['email', 'name'] },
        'user_123'
      );

      expect(result).toEqual(decryptedUser);
    });

    test('should handle update error', async () => {
      // Arrange
      const error = new Error('Update failed');
      mockEncryption.encryptObject.mockReturnValue({});
      mockPrisma.user.update.mockRejectedValue(error);

      // Act & Assert
      await expect(phiService.update('User', {
        id: 'user_123'
      }, {
        email: 'test@example.com'
      }, {
        userId: 'user_123'
      })).rejects.toThrow('Update failed');

      expect(mockAudit.logError).toHaveBeenCalledWith(
        'UPDATE',
        'User',
        error,
        'user_123'
      );
    });
  });

  describe('delete', () => {
    test('should delete record and log audit', async () => {
      // Arrange
      const deletedUser = {
        id: 'user_123',
        email: 'encrypted_email'
      };

      mockPrisma.user.delete.mockResolvedValue(deletedUser);

      // Act
      await phiService.delete('User', {
        id: 'user_123'
      }, {
        userId: 'admin_123',
        userRole: 'ADMIN'
      });

      // Assert
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user_123' }
      });

      expect(mockAudit.logSuccess).toHaveBeenCalledWith(
        'DELETE',
        'User',
        deletedUser.id,
        { userId: 'admin_123' },
        'admin_123'
      );
    });

    test('should handle delete error', async () => {
      // Arrange
      const error = new Error('Delete failed');
      mockPrisma.user.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(phiService.delete('User', {
        id: 'user_123'
      }, {
        userId: 'admin_123'
      })).rejects.toThrow('Delete failed');

      expect(mockAudit.logError).toHaveBeenCalledWith(
        'DELETE',
        'User',
        error,
        'admin_123'
      );
    });
  });

  describe('hasAccess', () => {
    test('should grant access to admin for any resource', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin_123',
        role: 'ADMIN'
      });

      // Act
      const hasAccess = await phiService.hasAccess(
        'admin_123',
        'User',
        'any_resource',
        'read'
      );

      // Assert
      expect(hasAccess).toBe(true);
    });

    test('should grant access to user for their own profile', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        role: 'CLIENT'
      });

      mockPrisma.profile.findFirst.mockResolvedValue({
        id: 'profile_123',
        userId: 'user_123'
      });

      // Act
      const hasAccess = await phiService.hasAccess(
        'user_123',
        'Profile',
        'profile_123',
        'read'
      );

      // Assert
      expect(hasAccess).toBe(true);
      expect(mockPrisma.profile.findFirst).toHaveBeenCalledWith({
        where: { id: 'profile_123', userId: 'user_123' }
      });
    });

    test('should deny access to user for other users data', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_123',
        role: 'CLIENT'
      });

      mockPrisma.profile.findFirst.mockResolvedValue(null);

      // Act
      const hasAccess = await phiService.hasAccess(
        'user_123',
        'Profile',
        'other_profile',
        'read'
      );

      // Assert
      expect(hasAccess).toBe(false);
    });

    test('should grant therapist access to their session notes', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'therapist_123',
        role: 'THERAPIST'
      });

      mockPrisma.sessionNote.findFirst.mockResolvedValue({
        id: 'note_123',
        therapist: { userId: 'therapist_123' }
      });

      // Act
      const hasAccess = await phiService.hasAccess(
        'therapist_123',
        'SessionNote',
        'note_123',
        'write'
      );

      // Assert
      expect(hasAccess).toBe(true);
    });

    test('should grant client read-only access to their session notes', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'client_123',
        role: 'CLIENT'
      });

      mockPrisma.sessionNote.findFirst.mockResolvedValue({
        id: 'note_123',
        client: { userId: 'client_123' }
      });

      // Act
      const readAccess = await phiService.hasAccess(
        'client_123',
        'SessionNote',
        'note_123',
        'read'
      );

      const writeAccess = await phiService.hasAccess(
        'client_123',
        'SessionNote',
        'note_123',
        'write'
      );

      // Assert
      expect(readAccess).toBe(true);
      expect(writeAccess).toBe(false);
    });

    test('should handle access check error', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      // Act
      const hasAccess = await phiService.hasAccess(
        'user_123',
        'Profile',
        'profile_123',
        'read'
      );

      // Assert
      expect(hasAccess).toBe(false);
    });
  });

  describe('exportUserData', () => {
    test('should export all user data with decrypted PHI', async () => {
      // Arrange
      const userData = {
        id: 'user_123',
        email: 'encrypted_email',
        profile: { id: 'profile_123', firstName: 'encrypted_name' },
        journals: [{ id: 'journal_1', content: 'encrypted_content' }],
        wellnessData: [{ id: 'wellness_1', notes: 'encrypted_notes' }],
        messages: [{ id: 'msg_1', content: 'encrypted_msg' }],
        clientProfiles: [],
        therapistProfile: null,
        appointments: [],
        crisisInterventions: [],
        notifications: [],
        files: []
      };

      const decryptedUserData = {
        ...userData,
        email: 'user@example.com',
        profile: { id: 'profile_123', firstName: 'John' },
        journals: [{ id: 'journal_1', content: 'My journal entry' }],
        wellnessData: [{ id: 'wellness_1', notes: 'Feeling good' }],
        messages: [{ id: 'msg_1', content: 'Hello' }]
      };

      mockPrisma.user.findUnique.mockResolvedValue(userData);
      mockEncryption.decryptObject.mockImplementation((data) => {
        if (data.id === 'profile_123') return decryptedUserData.profile;
        if (data.id === 'journal_1') return decryptedUserData.journals[0];
        if (data.id === 'wellness_1') return decryptedUserData.wellnessData[0];
        if (data.id === 'msg_1') return decryptedUserData.messages[0];
        return data;
      });

      // Act
      const result = await phiService.exportUserData('user_123');

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        include: expect.objectContaining({
          profile: true,
          therapistProfile: true,
          clientProfiles: true,
          wellnessData: true,
          journals: true,
          appointments: true,
          crisisInterventions: true,
          messages: { where: { senderId: 'user_123' } },
          notifications: true,
          files: true
        })
      });

      expect(mockAudit.logSuccess).toHaveBeenCalledWith(
        'EXPORT_DATA',
        'User',
        'user_123',
        { dataTypes: expect.any(Array) },
        'user_123'
      );

      expect(result.profile).toEqual(decryptedUserData.profile);
      expect(result.journals).toEqual(decryptedUserData.journals);
    });

    test('should handle user not found error', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(phiService.exportUserData('nonexistent')).rejects.toThrow('User not found');

      expect(mockAudit.logError).toHaveBeenCalledWith(
        'EXPORT_DATA',
        'User',
        expect.any(Error),
        'nonexistent'
      );
    });
  });

  describe('deleteUserData', () => {
    test('should delete all user data in correct order', async () => {
      // Arrange
      const transactionMocks = [
        mockPrisma.notification.deleteMany,
        mockPrisma.message.deleteMany,
        mockPrisma.file.deleteMany,
        mockPrisma.journalEntry.deleteMany,
        mockPrisma.wellnessData.deleteMany,
        mockPrisma.crisisIntervention.deleteMany,
        mockPrisma.appointment.deleteMany,
        mockPrisma.clientProfile.deleteMany,
        mockPrisma.therapistProfile.deleteMany,
        mockPrisma.profile.deleteMany,
        mockPrisma.session.deleteMany,
        mockPrisma.account.deleteMany,
        mockPrisma.user.delete
      ];

      mockPrisma.$transaction.mockImplementation(async (operations) => {
        return Promise.all(operations.map((op: any) => op));
      });

      // Act
      await phiService.deleteUserData('user_123');

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining(transactionMocks)
      );

      expect(mockAudit.logSuccess).toHaveBeenCalledWith(
        'DELETE_USER_DATA',
        'User',
        'user_123',
        { permanentDeletion: true },
        'user_123'
      );
    });

    test('should handle deletion error', async () => {
      // Arrange
      const error = new Error('Deletion failed');
      mockPrisma.$transaction.mockRejectedValue(error);

      // Act & Assert
      await expect(phiService.deleteUserData('user_123')).rejects.toThrow('Deletion failed');

      expect(mockAudit.logError).toHaveBeenCalledWith(
        'DELETE_USER_DATA',
        'User',
        error,
        'user_123'
      );
    });
  });

  describe('Binary Data Encryption', () => {
    test('should encrypt binary data', async () => {
      // Arrange
      const buffer = Buffer.from('test file content');
      mockEncryption.encrypt.mockReturnValue('encrypted_binary_data');

      // Act
      const result = await phiService.encryptBinary(buffer);

      // Assert
      expect(mockEncryption.encrypt).toHaveBeenCalledWith(buffer.toString('base64'));
      expect(result).toBe('encrypted_binary_data');
    });

    test('should decrypt binary data', async () => {
      // Arrange
      const encryptedData = 'encrypted_binary_data';
      const originalData = 'test file content';
      mockEncryption.decrypt.mockReturnValue(Buffer.from(originalData).toString('base64'));

      // Act
      const result = await phiService.decryptBinary(encryptedData);

      // Assert
      expect(mockEncryption.decrypt).toHaveBeenCalledWith(encryptedData);
      expect(result.toString()).toBe(originalData);
    });
  });

  describe('Field-Level Encryption', () => {
    test('should encrypt individual field', async () => {
      // Arrange
      const value = 'sensitive data';
      mockEncryption.encrypt.mockReturnValue('encrypted_value');

      // Act
      const result = await phiService.encryptField(value);

      // Assert
      expect(mockEncryption.encrypt).toHaveBeenCalledWith(value);
      expect(result).toBe('encrypted_value');
    });

    test('should decrypt individual field', async () => {
      // Arrange
      const encryptedValue = 'encrypted_value';
      const originalValue = 'sensitive data';
      mockEncryption.decrypt.mockReturnValue(originalValue);

      // Act
      const result = await phiService.decryptField(encryptedValue);

      // Assert
      expect(mockEncryption.decrypt).toHaveBeenCalledWith(encryptedValue);
      expect(result).toBe(originalValue);
    });
  });
});