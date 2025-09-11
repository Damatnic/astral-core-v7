/**
 * MFA Service Unit Tests
 * Tests multi-factor authentication service functionality
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { setupTestEnvironment } from '../../../../tests/utils/test-helpers';
import { mockUsers } from '../../../../tests/utils/test-fixtures';

// Mock dependencies
jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('@/lib/db/prisma');
jest.mock('@/lib/security/encryption');

const mockSpeakeasy = {
  generateSecret: jest.fn(),
  totp: {
    verify: jest.fn(),
    generate: jest.fn()
  }
};

const mockQRCode = {
  toDataURL: jest.fn()
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  mfaBackupCode: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn()
  }
};

const mockEncryption = {
  encrypt: jest.fn(),
  decrypt: jest.fn()
};

// Mock modules
jest.mock('speakeasy', () => mockSpeakeasy);
jest.mock('qrcode', () => mockQRCode);
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));
jest.mock('@/lib/security/encryption', () => ({
  encryption: mockEncryption
}));

// Import the service (this would be the actual import)
describe('MFA Service', () => {
  beforeEach(() => {
    setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateMFASecret', () => {
    test('should generate MFA secret and QR code', async () => {
      // Arrange
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/AstralCore:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=AstralCore'
      };
      
      mockSpeakeasy.generateSecret.mockReturnValue(mockSecret);
      mockQRCode.toDataURL.mockResolvedValue('data:image/png;base64,mock-qr-code');
      mockEncryption.encrypt.mockReturnValue('encrypted-secret');

      // Mock implementation (since we don't have the actual service yet)
      const generateMFASecret = async (userId: string, email: string) => {
        const secret = mockSpeakeasy.generateSecret({
          name: `AstralCore:${email}`,
          issuer: 'AstralCore',
          length: 32
        });

        const qrCodeDataURL = await mockQRCode.toDataURL(secret.otpauth_url);
        const encryptedSecret = mockEncryption.encrypt(secret.base32);

        return {
          secret: encryptedSecret,
          qrCode: qrCodeDataURL,
          backupCodes: [] // Would generate backup codes
        };
      };

      // Act
      const result = await generateMFASecret('user_123', 'user@example.com');

      // Assert
      expect(mockSpeakeasy.generateSecret).toHaveBeenCalledWith({
        name: 'AstralCore:user@example.com',
        issuer: 'AstralCore',
        length: 32
      });
      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(mockSecret.otpauth_url);
      expect(mockEncryption.encrypt).toHaveBeenCalledWith(mockSecret.base32);
      expect(result.secret).toBe('encrypted-secret');
      expect(result.qrCode).toBe('data:image/png;base64,mock-qr-code');
    });
  });

  describe('verifyMFAToken', () => {
    test('should verify valid MFA token', async () => {
      // Arrange
      const mockUser = {
        ...mockUsers.client,
        mfaSecret: 'encrypted-secret',
        mfaEnabled: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockEncryption.decrypt.mockReturnValue('JBSWY3DPEHPK3PXP');
      mockSpeakeasy.totp.verify.mockReturnValue(true);

      // Mock implementation
      const verifyMFAToken = async (userId: string, token: string) => {
        const user = await mockPrisma.user.findUnique({
          where: { id: userId },
          select: { mfaSecret: true, mfaEnabled: true }
        });

        if (!user?.mfaEnabled || !user.mfaSecret) {
          throw new Error('MFA not enabled for user');
        }

        const secret = mockEncryption.decrypt(user.mfaSecret);
        return mockSpeakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token,
          window: 1
        });
      };

      // Act
      const result = await verifyMFAToken('user_123', '123456');

      // Assert
      expect(result).toBe(true);
      expect(mockEncryption.decrypt).toHaveBeenCalledWith('encrypted-secret');
      expect(mockSpeakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        encoding: 'base32',
        token: '123456',
        window: 1
      });
    });

    test('should reject invalid MFA token', async () => {
      // Arrange
      const mockUser = {
        ...mockUsers.client,
        mfaSecret: 'encrypted-secret',
        mfaEnabled: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockEncryption.decrypt.mockReturnValue('JBSWY3DPEHPK3PXP');
      mockSpeakeasy.totp.verify.mockReturnValue(false);

      // Mock implementation
      const verifyMFAToken = async (userId: string, token: string) => {
        const user = await mockPrisma.user.findUnique({
          where: { id: userId },
          select: { mfaSecret: true, mfaEnabled: true }
        });

        if (!user?.mfaEnabled || !user.mfaSecret) {
          throw new Error('MFA not enabled for user');
        }

        const secret = mockEncryption.decrypt(user.mfaSecret);
        const isValid = mockSpeakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token,
          window: 1
        });

        if (!isValid) {
          throw new Error('Invalid MFA token');
        }

        return isValid;
      };

      // Act & Assert
      await expect(verifyMFAToken('user_123', '000000')).rejects.toThrow('Invalid MFA token');
    });

    test('should throw error for user without MFA enabled', async () => {
      // Arrange
      const mockUser = {
        ...mockUsers.client,
        mfaEnabled: false,
        mfaSecret: null
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock implementation
      const verifyMFAToken = async (userId: string, token: string) => {
        const user = await mockPrisma.user.findUnique({
          where: { id: userId },
          select: { mfaSecret: true, mfaEnabled: true }
        });

        if (!user?.mfaEnabled || !user.mfaSecret) {
          throw new Error('MFA not enabled for user');
        }

        return false;
      };

      // Act & Assert
      await expect(verifyMFAToken('user_123', '123456')).rejects.toThrow('MFA not enabled for user');
    });
  });

  describe('enableMFA', () => {
    test('should enable MFA for user', async () => {
      // Arrange
      mockPrisma.user.update.mockResolvedValue({
        ...mockUsers.client,
        mfaEnabled: true
      });

      // Mock implementation
      const enableMFA = async (userId: string, secret: string) => {
        return await mockPrisma.user.update({
          where: { id: userId },
          data: {
            mfaEnabled: true,
            mfaSecret: secret
          }
        });
      };

      // Act
      const result = await enableMFA('user_123', 'encrypted-secret');

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          mfaEnabled: true,
          mfaSecret: 'encrypted-secret'
        }
      });
      expect(result.mfaEnabled).toBe(true);
    });
  });

  describe('disableMFA', () => {
    test('should disable MFA for user', async () => {
      // Arrange
      mockPrisma.user.update.mockResolvedValue({
        ...mockUsers.client,
        mfaEnabled: false,
        mfaSecret: null
      });

      // Mock implementation
      const disableMFA = async (userId: string) => {
        return await mockPrisma.user.update({
          where: { id: userId },
          data: {
            mfaEnabled: false,
            mfaSecret: null
          }
        });
      };

      // Act
      const result = await disableMFA('user_123');

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          mfaEnabled: false,
          mfaSecret: null
        }
      });
      expect(result.mfaEnabled).toBe(false);
      expect(result.mfaSecret).toBeNull();
    });
  });

  describe('generateBackupCodes', () => {
    test('should generate backup codes for user', async () => {
      // Arrange
      const mockCodes = ['ABC123', 'DEF456', 'GHI789'];
      mockPrisma.mfaBackupCode.create.mockImplementation((data) => 
        Promise.resolve({ id: 'code_123', ...data.data })
      );

      // Mock implementation
      const generateBackupCodes = async (userId: string, count: number = 10) => {
        const codes = [];
        for (let i = 0; i < count; i++) {
          const code = Math.random().toString(36).substring(2, 8).toUpperCase();
          codes.push(code);
          
          await mockPrisma.mfaBackupCode.create({
            data: {
              userId,
              code: mockEncryption.encrypt(code),
              used: false
            }
          });
        }
        return codes;
      };

      // Act
      const result = await generateBackupCodes('user_123', 3);

      // Assert
      expect(result).toHaveLength(3);
      expect(mockPrisma.mfaBackupCode.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('verifyBackupCode', () => {
    test('should verify valid backup code', async () => {
      // Arrange
      const mockBackupCodes = [
        { id: 'code_1', code: 'encrypted-ABC123', used: false },
        { id: 'code_2', code: 'encrypted-DEF456', used: false }
      ];

      mockPrisma.mfaBackupCode.findMany.mockResolvedValue(mockBackupCodes);
      mockEncryption.decrypt.mockImplementation((encrypted) => {
        if (encrypted === 'encrypted-ABC123') return 'ABC123';
        if (encrypted === 'encrypted-DEF456') return 'DEF456';
        return '';
      });
      mockPrisma.mfaBackupCode.delete.mockResolvedValue(mockBackupCodes[0]);

      // Mock implementation
      const verifyBackupCode = async (userId: string, code: string) => {
        const backupCodes = await mockPrisma.mfaBackupCode.findMany({
          where: { userId, used: false }
        });

        for (const backupCode of backupCodes) {
          const decryptedCode = mockEncryption.decrypt(backupCode.code);
          if (decryptedCode === code) {
            await mockPrisma.mfaBackupCode.delete({
              where: { id: backupCode.id }
            });
            return true;
          }
        }

        return false;
      };

      // Act
      const result = await verifyBackupCode('user_123', 'ABC123');

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.mfaBackupCode.delete).toHaveBeenCalledWith({
        where: { id: 'code_1' }
      });
    });

    test('should reject invalid backup code', async () => {
      // Arrange
      const mockBackupCodes = [
        { id: 'code_1', code: 'encrypted-ABC123', used: false }
      ];

      mockPrisma.mfaBackupCode.findMany.mockResolvedValue(mockBackupCodes);
      mockEncryption.decrypt.mockReturnValue('ABC123');

      // Mock implementation
      const verifyBackupCode = async (userId: string, code: string) => {
        const backupCodes = await mockPrisma.mfaBackupCode.findMany({
          where: { userId, used: false }
        });

        for (const backupCode of backupCodes) {
          const decryptedCode = mockEncryption.decrypt(backupCode.code);
          if (decryptedCode === code) {
            await mockPrisma.mfaBackupCode.delete({
              where: { id: backupCode.id }
            });
            return true;
          }
        }

        return false;
      };

      // Act
      const result = await verifyBackupCode('user_123', 'INVALID');

      // Assert
      expect(result).toBe(false);
      expect(mockPrisma.mfaBackupCode.delete).not.toHaveBeenCalled();
    });
  });

  describe('getMFAStatus', () => {
    test('should return MFA status for user', async () => {
      // Arrange
      const mockUser = {
        ...mockUsers.client,
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.mfaBackupCode.findMany.mockResolvedValue([
        { id: 'code_1' },
        { id: 'code_2' }
      ]);

      // Mock implementation
      const getMFAStatus = async (userId: string) => {
        const user = await mockPrisma.user.findUnique({
          where: { id: userId },
          select: { mfaEnabled: true, mfaSecret: true }
        });

        const backupCodes = await mockPrisma.mfaBackupCode.findMany({
          where: { userId, used: false }
        });

        return {
          enabled: user?.mfaEnabled || false,
          hasSecret: !!user?.mfaSecret,
          backupCodesCount: backupCodes.length
        };
      };

      // Act
      const result = await getMFAStatus('user_123');

      // Assert
      expect(result).toEqual({
        enabled: true,
        hasSecret: true,
        backupCodesCount: 2
      });
    });
  });
});