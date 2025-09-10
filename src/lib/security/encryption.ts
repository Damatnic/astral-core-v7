import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const IV_LENGTH = 16;
const ITERATIONS = 100000;

export class EncryptionService {
  private key: Buffer;

  constructor(encryptionKey?: string) {
    const key = encryptionKey || process.env['ENCRYPTION_KEY'];
    if (!key) {
      throw new Error('Encryption key is required');
    }
    this.key = Buffer.from(key, 'hex');
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const key = crypto.pbkdf2Sync(this.key, salt, ITERATIONS, 32, 'sha256');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    
    const tag = cipher.getAuthTag();
    
    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
  }

  decrypt(encryptedText: string): string {
    const buffer = Buffer.from(encryptedText, 'base64');
    
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    const key = crypto.pbkdf2Sync(this.key, salt, ITERATIONS, 32, 'sha256');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    return decipher.update(encrypted) + decipher.final('utf8');
  }

  encryptObject<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    const encrypted = { ...obj };
    
    for (const field of fields) {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        const value = String(encrypted[field]);
        encrypted[field] = this.encrypt(value) as T[keyof T];
      }
    }
    
    return encrypted;
  }

  decryptObject<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    const decrypted = { ...obj };
    
    for (const field of fields) {
      if (decrypted[field] !== undefined && decrypted[field] !== null) {
        try {
          const value = String(decrypted[field]);
          decrypted[field] = this.decrypt(value) as T[keyof T];
        } catch (error) {
          console.error(`Failed to decrypt field ${String(field)}:`, error);
        }
      }
    }
    
    return decrypted;
  }

  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    if (!salt || !hash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateSecureRandomString(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = crypto.randomBytes(length);
    const result = new Array(length);
    
    for (let i = 0; i < length; i++) {
      const byte = randomBytes[i];
      if (byte !== undefined) {
        result[i] = chars[byte % chars.length];
      }
    }
    
    return result.join('');
  }
}

export const encryption = new EncryptionService();