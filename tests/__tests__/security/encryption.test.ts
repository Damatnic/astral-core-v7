import { EncryptionService } from '@/lib/security/encryption';
import crypto from 'crypto';

// Mock crypto to ensure consistent testing
jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  pbkdf2Sync: jest.fn(),
  createCipheriv: jest.fn(),
  createDecipheriv: jest.fn()
}));

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const mockKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    jest.clearAllMocks();
    encryptionService = new EncryptionService(mockKey);
  });

  describe('constructor', () => {
    it('should initialize with provided key', () => {
      const service = new EncryptionService(mockKey);
      expect(service).toBeInstanceOf(EncryptionService);
    });

    it('should throw error when no encryption key provided', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => new EncryptionService()).toThrow('Encryption key is required');
    });

    it('should use environment variable when no key provided', () => {
      process.env.ENCRYPTION_KEY = mockKey;
      const service = new EncryptionService();
      expect(service).toBeInstanceOf(EncryptionService);
    });
  });

  describe('encrypt and decrypt', () => {
    beforeEach(() => {
      // Setup crypto mocks for encrypt/decrypt tests
      const mockCrypto = crypto as jest.Mocked<typeof crypto>;

      // Mock random bytes generation
      mockCrypto.randomBytes.mockImplementation((size: number) => {
        return Buffer.alloc(size, 1); // Fill with 1s for consistency
      });

      // Mock PBKDF2
      mockCrypto.pbkdf2Sync.mockReturnValue(Buffer.alloc(32, 2)); // Fill with 2s

      // Mock cipher
      const mockCipher = {
        update: jest.fn().mockReturnValue(Buffer.from('encrypted_data')),
        final: jest.fn().mockReturnValue(Buffer.alloc(0)),
        getAuthTag: jest.fn().mockReturnValue(Buffer.alloc(16, 3))
      };
      mockCrypto.createCipheriv.mockReturnValue(mockCipher as unknown as crypto.Cipher);

      // Mock decipher
      const mockDecipher = {
        setAuthTag: jest.fn(),
        update: jest.fn().mockReturnValue('decrypted_'),
        final: jest.fn().mockReturnValue('data')
      };
      mockCrypto.createDecipheriv.mockReturnValue(mockDecipher as unknown as crypto.Decipher);
    });

    it('should encrypt text successfully', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
      expect(crypto.randomBytes).toHaveBeenCalledTimes(2); // IV and salt
      expect(crypto.pbkdf2Sync).toHaveBeenCalled();
      expect(crypto.createCipheriv).toHaveBeenCalled();
    });

    it('should decrypt text successfully', () => {
      // Create a mock encrypted string (base64 encoded)
      const salt = Buffer.alloc(64, 1);
      const iv = Buffer.alloc(16, 1);
      const tag = Buffer.alloc(16, 3);
      const encrypted = Buffer.from('encrypted_data');
      const mockEncryptedString = Buffer.concat([salt, iv, tag, encrypted]).toString('base64');

      const decrypted = encryptionService.decrypt(mockEncryptedString);

      expect(decrypted).toBe('decrypted_data');
      expect(crypto.pbkdf2Sync).toHaveBeenCalled();
      expect(crypto.createDecipheriv).toHaveBeenCalled();
    });

    it('should encrypt and decrypt be reversible', () => {
      // Restore original crypto functions
      jest.restoreAllMocks();

      const realService = new EncryptionService(mockKey);
      const plaintext = 'test data for encryption';
      const encrypted = realService.encrypt(plaintext);
      const decrypted = realService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);

      // Re-apply mocks for subsequent tests
      const mockCrypto = crypto as jest.Mocked<typeof crypto>;
      Object.assign(mockCrypto, {
        randomBytes: jest.fn(),
        pbkdf2Sync: jest.fn(),
        createCipheriv: jest.fn(),
        createDecipheriv: jest.fn()
      });
    });
  });

  describe('encryptObject', () => {
    it('should encrypt specified fields in object', () => {
      // Restore real crypto temporarily
      jest.restoreAllMocks();
      const realService = new EncryptionService(mockKey);

      const testObj = {
        id: 'user-123',
        email: 'test@example.com',
        sensitiveData: 'secret information',
        publicData: 'public information'
      };

      const encrypted = realService.encryptObject(testObj, ['email', 'sensitiveData']);

      expect(encrypted.id).toBe(testObj.id);
      expect(encrypted.publicData).toBe(testObj.publicData);
      expect(encrypted.email).not.toBe(testObj.email);
      expect(encrypted.sensitiveData).not.toBe(testObj.sensitiveData);

      // Verify we can decrypt back
      const decrypted = realService.decryptObject(encrypted, ['email', 'sensitiveData']);
      expect(decrypted.email).toBe(testObj.email);
      expect(decrypted.sensitiveData).toBe(testObj.sensitiveData);

      // Re-apply mocks
      const mockCrypto = crypto as jest.Mocked<typeof crypto>;
      Object.assign(mockCrypto, {
        randomBytes: jest.fn(),
        pbkdf2Sync: jest.fn(),
        createCipheriv: jest.fn(),
        createDecipheriv: jest.fn()
      });
    });

    it('should handle null and undefined values', () => {
      const testObj = {
        field1: null,
        field2: undefined,
        field3: 'valid value'
      };

      const encrypted = encryptionService.encryptObject(testObj, ['field1', 'field2', 'field3']);

      expect(encrypted.field1).toBe(null);
      expect(encrypted.field2).toBe(undefined);
      expect(encrypted.field3).toBeDefined();
    });
  });

  describe('decryptObject', () => {
    it('should decrypt specified fields in object', () => {
      const testObj = {
        id: 'user-123',
        encryptedField: 'mock_encrypted_value',
        publicField: 'public'
      };

      // Mock decrypt method
      jest.spyOn(encryptionService, 'decrypt').mockReturnValue('decrypted_value');

      const decrypted = encryptionService.decryptObject(testObj, ['encryptedField']);

      expect(decrypted.id).toBe(testObj.id);
      expect(decrypted.publicField).toBe(testObj.publicField);
      expect(decrypted.encryptedField).toBe('decrypted_value');
      expect(encryptionService.decrypt).toHaveBeenCalledWith('mock_encrypted_value');
    });

    it('should handle decryption errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(encryptionService, 'decrypt').mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const testObj = { field: 'encrypted_value' };
      const result = encryptionService.decryptObject(testObj, ['field']);

      expect(result.field).toBe('encrypted_value'); // Should remain unchanged
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('password hashing', () => {
    beforeEach(() => {
      // Mock crypto for password tests
      const mockCrypto = crypto as jest.Mocked<typeof crypto>;
      mockCrypto.randomBytes.mockReturnValue(Buffer.from('mocksalt123456789'));
      mockCrypto.pbkdf2Sync.mockReturnValue(Buffer.from('mockhash123456789'));
    });

    it('should hash password with salt', () => {
      const password = 'mySecurePassword';
      const hashed = encryptionService.hashPassword(password);

      expect(hashed).toContain(':');
      expect(crypto.randomBytes).toHaveBeenCalledWith(16);
      expect(crypto.pbkdf2Sync).toHaveBeenCalledWith(
        password,
        expect.any(String),
        100000,
        64,
        'sha512'
      );
    });

    it('should verify correct password', () => {
      const mockCrypto = crypto as jest.Mocked<typeof crypto>;
      mockCrypto.pbkdf2Sync
        .mockReturnValueOnce(Buffer.from('originalhash'))
        .mockReturnValueOnce(Buffer.from('originalhash')); // Same hash for verification

      const password = 'mySecurePassword';
      const hashedPassword = 'salt123:' + Buffer.from('originalhash').toString('hex');

      const isValid = encryptionService.verifyPassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', () => {
      jest.restoreAllMocks(); // Use real crypto for more realistic test
      const realService = new EncryptionService(mockKey);

      const correctPassword = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      const hashedPassword = realService.hashPassword(correctPassword);

      const isValid = realService.verifyPassword(wrongPassword, hashedPassword);

      expect(isValid).toBe(false);

      // Re-apply mocks
      const mockCrypto = crypto as jest.Mocked<typeof crypto>;
      Object.assign(mockCrypto, {
        randomBytes: jest.fn(),
        pbkdf2Sync: jest.fn(),
        createCipheriv: jest.fn(),
        createDecipheriv: jest.fn()
      });
    });

    it('should reject malformed hash', () => {
      const password = 'myPassword';
      const malformedHash = 'invalid_hash_format';

      const isValid = encryptionService.verifyPassword(password, malformedHash);

      expect(isValid).toBe(false);
    });
  });

  describe('token generation', () => {
    beforeEach(() => {
      const mockCrypto = crypto as jest.Mocked<typeof crypto>;
      mockCrypto.randomBytes.mockReturnValue(Buffer.from('mocktokendata123'));
    });

    it('should generate token with default length', () => {
      const token = encryptionService.generateToken();

      expect(typeof token).toBe('string');
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });

    it('should generate token with custom length', () => {
      const token = encryptionService.generateToken(16);

      expect(typeof token).toBe('string');
      expect(crypto.randomBytes).toHaveBeenCalledWith(16);
    });

    it('should generate secure random string', () => {
      const mockCrypto = crypto as jest.Mocked<typeof crypto>;
      mockCrypto.randomBytes.mockReturnValue(Buffer.from([65, 66, 67, 68])); // ASCII for ABCD

      const randomString = encryptionService.generateSecureRandomString(4);

      expect(randomString).toHaveLength(4);
      expect(/^[A-Za-z0-9]+$/.test(randomString)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle encryption errors', () => {
      const mockCrypto = crypto as jest.Mocked<typeof crypto>;
      mockCrypto.createCipheriv.mockImplementation(() => {
        throw new Error('Cipher creation failed');
      });

      expect(() => encryptionService.encrypt('test')).toThrow('Cipher creation failed');
    });

    it('should handle decryption errors', () => {
      const mockCrypto = crypto as jest.Mocked<typeof crypto>;
      mockCrypto.createDecipheriv.mockImplementation(() => {
        throw new Error('Decipher creation failed');
      });

      expect(() => encryptionService.decrypt('invaliddata')).toThrow();
    });
  });
});
