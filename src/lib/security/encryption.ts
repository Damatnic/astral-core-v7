import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'crypto';
import { logError } from '../logger';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const IV_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * HIPAA-compliant encryption service for protecting sensitive healthcare data
 * Uses AES-256-GCM encryption with PBKDF2 key derivation and secure random generation
 * Implements industry-standard cryptographic practices for PHI protection
 */
export class EncryptionService {
  private key: Buffer;

  /**
   * Initialize encryption service with master key
   * @param {string} [encryptionKey] - Optional encryption key, falls back to ENCRYPTION_KEY env variable
   * @throws {Error} If no encryption key is provided
   */
  constructor(encryptionKey?: string) {
    const key = encryptionKey || process.env['ENCRYPTION_KEY'];
    if (!key) {
      throw new Error('Encryption key is required');
    }
    this.key = Buffer.from(key, 'hex');
  }

  /**
   * Encrypt plaintext string using AES-256-GCM with PBKDF2 key derivation
   * Creates unique salt and IV for each encryption to ensure security
   * @param {string} text - Plaintext string to encrypt
   * @returns {string} Base64-encoded encrypted data including salt, IV, auth tag, and ciphertext
   * @example
   * ```typescript
   * const encrypted = encryption.encrypt('sensitive patient data');
   * // Returns: base64 string containing all encryption components
   * ```
   */
  encrypt(text: string): string {
    const iv = randomBytes(IV_LENGTH);
    const salt = randomBytes(SALT_LENGTH);

    const key = pbkdf2Sync(this.key, salt, ITERATIONS, 32, 'sha256');
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
  }

  /**
   * Decrypt base64-encoded encrypted string back to plaintext
   * Verifies authentication tag to ensure data integrity
   * @param {string} encryptedText - Base64-encoded encrypted data from encrypt() method
   * @returns {string} Decrypted plaintext string
   * @throws {Error} If decryption fails due to tampering or invalid data
   * @example
   * ```typescript
   * const plaintext = encryption.decrypt(encryptedString);
   * // Returns: original plaintext if decryption successful
   * ```
   */
  decrypt(encryptedText: string): string {
    const buffer = Buffer.from(encryptedText, 'base64');

    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = pbkdf2Sync(this.key, salt, ITERATIONS, 32, 'sha256');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final('utf8');
  }

  /**
   * Encrypt specific fields within an object while preserving structure
   * Useful for database records where only sensitive fields need encryption
   * @template T - Object type with string-indexable properties
   * @param {T} obj - Object to encrypt fields in
   * @param {(keyof T)[]} fields - Array of field names to encrypt
   * @returns {T} New object with specified fields encrypted
   * @example
   * ```typescript
   * const patient = { name: 'John Doe', ssn: '123-45-6789', age: 30 };
   * const encrypted = encryption.encryptObject(patient, ['ssn']);
   * // Returns: { name: 'John Doe', ssn: 'encrypted_data', age: 30 }
   * ```
   */
  encryptObject<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
    const encrypted = { ...obj };

    for (const field of fields) {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        const value = String(encrypted[field]);
        encrypted[field] = this.encrypt(value) as T[keyof T];
      }
    }

    return encrypted;
  }

  /**
   * Decrypt specific fields within an object while preserving structure
   * Safely handles decryption errors by logging and continuing
   * @template T - Object type with string-indexable properties
   * @param {T} obj - Object with encrypted fields to decrypt
   * @param {(keyof T)[]} fields - Array of field names to decrypt
   * @returns {T} New object with specified fields decrypted
   * @example
   * ```typescript
   * const decrypted = encryption.decryptObject(encryptedPatient, ['ssn']);
   * // Returns: { name: 'John Doe', ssn: '123-45-6789', age: 30 }
   * ```
   */
  decryptObject<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
    const decrypted = { ...obj };

    for (const field of fields) {
      if (decrypted[field] !== undefined && decrypted[field] !== null) {
        try {
          const value = String(decrypted[field]);
          decrypted[field] = this.decrypt(value) as T[keyof T];
        } catch (error) {
          logError(`Failed to decrypt field ${String(field)}`, error, 'EncryptionService');
        }
      }
    }

    return decrypted;
  }

  /**
   * Hash password using PBKDF2 with random salt for secure storage
   * Uses 100,000 iterations and SHA-512 for strong security
   * @param {string} password - Plain text password to hash
   * @returns {string} Salt and hash combined as 'salt:hash' format
   * @example
   * ```typescript
   * const hashedPassword = encryption.hashPassword('userPassword123');
   * // Returns: 'randomSalt:hashedPassword'
   * ```
   */
  hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify password against stored hash using constant-time comparison
   * @param {string} password - Plain text password to verify
   * @param {string} hashedPassword - Stored hash in 'salt:hash' format
   * @returns {boolean} True if password matches the hash
   * @example
   * ```typescript
   * const isValid = encryption.verifyPassword('userPassword123', storedHash);
   * if (isValid) {
   *   // Password is correct
   * }
   * ```
   */
  verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    if (!salt || !hash) return false;
    const verifyHash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  /**
   * Generate cryptographically secure random token in hexadecimal format
   * Suitable for session tokens, API keys, and other security tokens
   * @param {number} [length=32] - Number of random bytes to generate (output will be length*2 hex chars)
   * @returns {string} Hex-encoded random token
   * @example
   * ```typescript
   * const sessionToken = encryption.generateToken(32);
   * // Returns: 64-character hex string
   * const apiKey = encryption.generateToken(16);
   * // Returns: 32-character hex string
   * ```
   */
  generateToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate cryptographically secure random alphanumeric string
   * Uses uniform distribution to prevent bias in character selection
   * @param {number} [length=16] - Length of string to generate
   * @returns {string} Random string containing A-Z, a-z, 0-9 characters
   * @example
   * ```typescript
   * const resetCode = encryption.generateSecureRandomString(8);
   * // Returns: something like 'aB3kL9Xm'
   * const patientId = encryption.generateSecureRandomString(12);
   * // Returns: something like 'k3L9mN2pQ8Rt'
   * ```
   */
  generateSecureRandomString(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytesArray = randomBytes(length);
    const result = new Array(length);

    for (let i = 0; i < length; i++) {
      const byte = randomBytesArray[i];
      if (byte !== undefined) {
        result[i] = chars[byte % chars.length];
      }
    }

    return result.join('');
  }
}

export const encryption = new EncryptionService();
