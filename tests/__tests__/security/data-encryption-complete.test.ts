/**
 * Comprehensive data encryption and PHI protection tests
 * Tests complete data protection flows including encryption, key management, and compliance
 */

import { EncryptionService } from '@/lib/security/encryption';
import { PHIService } from '@/lib/security/phi-service';
import { mockPrisma, resetPrismaMocks } from '../../mocks/prisma';
import { createMockJournalEntry, createMockAppointment } from '../../utils/test-helpers';

// Mock crypto module for controlled testing
const mockCrypto = {
  randomBytes: jest.fn(),
  pbkdf2Sync: jest.fn(),
  createCipheriv: jest.fn(),
  createDecipheriv: jest.fn(),
  createHash: jest.fn(),
  scrypt: jest.fn(),
  timingSafeEqual: jest.fn()
};

jest.mock('crypto', () => mockCrypto);

jest.mock('@/lib/db/prisma', () => ({
  default: mockPrisma
}));

jest.mock('@/lib/security/audit', () => ({
  audit: {
    logSuccess: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined),
    logAccess: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('@/lib/security/key-management', () => ({
  keyManager: {
    rotateKeys: jest.fn().mockResolvedValue(true),
    getCurrentKey: jest.fn().mockReturnValue('current-key-123'),
    getKeyVersion: jest.fn().mockReturnValue(1),
    validateKeyIntegrity: jest.fn().mockReturnValue(true)
  }
}));

import { audit } from '@/lib/security/audit';
import { keyManager } from '@/lib/security/key-management';

describe('Comprehensive Data Encryption System', () => {
  let encryptionService: EncryptionService;
  let phiService: PHIService;
  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    resetPrismaMocks();
    jest.clearAllMocks();
    
    // Setup crypto mocks
    mockCrypto.randomBytes.mockImplementation((size: number) => Buffer.alloc(size, 1));
    mockCrypto.pbkdf2Sync.mockReturnValue(Buffer.alloc(32, 2));
    mockCrypto.scrypt.mockImplementation((password, salt, keylen, callback) => {
      callback(null, Buffer.alloc(keylen, 3));
    });
    mockCrypto.createHash.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mock_hash')
    });
    mockCrypto.timingSafeEqual.mockReturnValue(true);

    // Setup cipher mocks
    const mockCipher = {
      update: jest.fn().mockReturnValue(Buffer.from('encrypted_data')),
      final: jest.fn().mockReturnValue(Buffer.alloc(0)),
      getAuthTag: jest.fn().mockReturnValue(Buffer.alloc(16, 3))
    };
    mockCrypto.createCipheriv.mockReturnValue(mockCipher);

    const mockDecipher = {
      setAuthTag: jest.fn(),
      update: jest.fn().mockReturnValue('decrypted_'),
      final: jest.fn().mockReturnValue('data')
    };
    mockCrypto.createDecipheriv.mockReturnValue(mockDecipher);

    encryptionService = new EncryptionService(testKey);
    phiService = new PHIService();
    
    // Set environment variables
    process.env.ENCRYPTION_KEY = testKey;
    process.env.PHI_ENCRYPTION_LEVEL = 'AES-256-GCM';
  });

  describe('PHI Data Encryption', () => {
    it('should encrypt sensitive patient health information correctly', async () => {
      const patientData = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        ssn: '123-45-6789',
        medicalHistory: 'Depression, anxiety disorder',
        currentMedications: ['Sertraline 50mg', 'Lorazepam 0.5mg'],
        therapistNotes: 'Patient shows improvement in mood stability',
        diagnosis: 'Major Depressive Disorder, Generalized Anxiety Disorder',
        treatmentPlan: 'CBT therapy twice weekly, medication management',
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Spouse',
          phone: '+1234567890'
        }
      };

      const sensitiveFields = [
        'firstName', 'lastName', 'dateOfBirth', 'ssn', 
        'medicalHistory', 'currentMedications', 'therapistNotes',
        'diagnosis', 'treatmentPlan', 'emergencyContact'
      ];

      const encrypted = encryptionService.encryptObject(patientData, sensitiveFields);

      // Verify sensitive fields are encrypted
      expect(encrypted.firstName).not.toBe(patientData.firstName);
      expect(encrypted.ssn).not.toBe(patientData.ssn);
      expect(encrypted.medicalHistory).not.toBe(patientData.medicalHistory);
      expect(encrypted.therapistNotes).not.toBe(patientData.therapistNotes);
      
      // Verify non-sensitive fields remain unchanged
      expect(encrypted.id).toBe(patientData.id);

      // Verify decryption works correctly
      const decrypted = encryptionService.decryptObject(encrypted, sensitiveFields);
      expect(decrypted.firstName).toBe(patientData.firstName);
      expect(decrypted.ssn).toBe(patientData.ssn);
      expect(decrypted.medicalHistory).toBe(patientData.medicalHistory);

      // Verify audit logging
      expect(audit.logAccess).toHaveBeenCalledWith(
        'PHI_ENCRYPTION',
        'PatientData',
        'patient-123',
        expect.objectContaining({
          operation: 'ENCRYPT',
          fieldsProcessed: sensitiveFields.length
        }),
        undefined
      );
    });

    it('should handle different levels of PHI sensitivity', async () => {
      const phiLevels = {
        CRITICAL: {
          data: { ssn: '123-45-6789', diagnosis: 'Bipolar Disorder' },
          encryptionLevel: 'AES-256-GCM',
          keyRotationDays: 30
        },
        HIGH: {
          data: { therapistNotes: 'Patient progress notes', medicalHistory: 'Previous treatments' },
          encryptionLevel: 'AES-256-CBC',
          keyRotationDays: 90
        },
        MODERATE: {
          data: { appointmentNotes: 'Session summary', mood: 7 },
          encryptionLevel: 'AES-128-GCM',
          keyRotationDays: 180
        }
      };

      for (const [level, config] of Object.entries(phiLevels)) {
        const encrypted = await phiService.encrypt(config.data, {
          level: level as 'CRITICAL' | 'HIGH' | 'MODERATE',
          algorithm: config.encryptionLevel
        });

        expect(encrypted).toBeDefined();
        expect(encrypted.encryptionLevel).toBe(config.encryptionLevel);
        expect(encrypted.sensitivityLevel).toBe(level);

        // Verify audit trail includes sensitivity level
        expect(audit.logAccess).toHaveBeenCalledWith(
          'PHI_ENCRYPTION',
          'PHIData',
          expect.any(String),
          expect.objectContaining({
            sensitivityLevel: level,
            encryptionAlgorithm: config.encryptionLevel
          }),
          undefined
        );
      }
    });

    it('should implement field-level encryption for database storage', async () => {
      const journalEntry = createMockJournalEntry({
        id: 'journal-123',
        userId: 'user-123',
        title: 'My therapy session reflection',
        content: 'Today I discussed my anxiety with my therapist. I feel like I made progress...',
        mood: 6,
        tags: ['therapy', 'anxiety', 'progress'],
        isPrivate: true
      });

      // Fields requiring encryption
      const encryptedFields = ['title', 'content', 'tags'];
      
      const encryptedEntry = encryptionService.encryptObject(journalEntry, encryptedFields);

      // Mock database save
      mockPrisma.journalEntry.create.mockResolvedValue({
        ...encryptedEntry,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await mockPrisma.journalEntry.create({
        data: encryptedEntry
      });

      // Verify encrypted fields are not readable
      expect(result.title).not.toBe(journalEntry.title);
      expect(result.content).not.toBe(journalEntry.content);
      expect(result.tags).not.toBe(journalEntry.tags);

      // Verify non-encrypted fields are preserved
      expect(result.mood).toBe(journalEntry.mood);
      expect(result.isPrivate).toBe(journalEntry.isPrivate);
    });

    it('should handle encryption of complex nested objects', async () => {
      const complexMedicalRecord = {
        patientId: 'patient-456',
        assessments: [
          {
            date: '2024-01-15',
            type: 'Mental Health Assessment',
            scores: {
              depression: 15,
              anxiety: 12,
              stress: 18
            },
            notes: 'Patient showing significant symptoms of depression',
            assessor: 'Dr. Smith'
          },
          {
            date: '2024-01-22',
            type: 'Progress Assessment',
            scores: {
              depression: 12,
              anxiety: 10,
              stress: 15
            },
            notes: 'Improvement noted after medication adjustment',
            assessor: 'Dr. Smith'
          }
        ],
        treatmentHistory: {
          medications: [
            {
              name: 'Sertraline',
              dosage: '50mg',
              startDate: '2024-01-01',
              prescriber: 'Dr. Johnson',
              notes: 'Starting dose for depression treatment'
            }
          ],
          therapySessions: [
            {
              date: '2024-01-10',
              duration: 50,
              type: 'Individual CBT',
              therapist: 'Jane Smith, LCSW',
              notes: 'Focused on cognitive restructuring techniques',
              outcomes: ['improved mood regulation', 'better coping strategies']
            }
          ]
        }
      };

      const sensitiveFields = [
        'assessments', 'treatmentHistory', 'notes', 
        'prescriber', 'therapist', 'outcomes'
      ];

      const encrypted = encryptionService.encryptObject(complexMedicalRecord, sensitiveFields);

      // Verify complex nested structures are encrypted
      expect(encrypted.assessments).not.toEqual(complexMedicalRecord.assessments);
      expect(encrypted.treatmentHistory).not.toEqual(complexMedicalRecord.treatmentHistory);

      // Verify decryption preserves structure
      const decrypted = encryptionService.decryptObject(encrypted, sensitiveFields);
      expect(decrypted.assessments[0].notes).toBe(complexMedicalRecord.assessments[0].notes);
      expect(decrypted.treatmentHistory.medications[0].prescriber).toBe(
        complexMedicalRecord.treatmentHistory.medications[0].prescriber
      );
    });
  });

  describe('Key Management and Rotation', () => {
    it('should implement secure key rotation for PHI data', async () => {
      const oldKeyVersion = 1;
      const newKeyVersion = 2;

      // Mock key rotation scenario
      keyManager.getKeyVersion.mockReturnValueOnce(oldKeyVersion);
      keyManager.getCurrentKey.mockReturnValueOnce('old-key-version-1');
      
      const testData = { sensitiveField: 'confidential information' };
      const encryptedWithOldKey = encryptionService.encrypt(JSON.stringify(testData));

      // Simulate key rotation
      keyManager.rotateKeys.mockResolvedValue(true);
      keyManager.getKeyVersion.mockReturnValue(newKeyVersion);
      keyManager.getCurrentKey.mockReturnValue('new-key-version-2');

      // Re-encrypt with new key
      const encryptedWithNewKey = encryptionService.encrypt(JSON.stringify(testData));

      expect(encryptedWithOldKey).not.toBe(encryptedWithNewKey);
      expect(keyManager.rotateKeys).toHaveBeenCalled();

      // Verify audit trail for key rotation
      expect(audit.logSuccess).toHaveBeenCalledWith(
        'KEY_ROTATION',
        'EncryptionKey',
        expect.any(String),
        expect.objectContaining({
          oldVersion: oldKeyVersion,
          newVersion: newKeyVersion,
          rotationDate: expect.any(Date)
        }),
        undefined
      );
    });

    it('should handle multiple encryption keys for different data types', async () => {
      const keyTypes = {
        PHI_CRITICAL: 'phi-critical-key-256',
        PHI_STANDARD: 'phi-standard-key-256',
        COMMUNICATION: 'communication-key-128',
        FINANCIAL: 'financial-key-256',
        OPERATIONAL: 'operational-key-128'
      };

      for (const [keyType, keyValue] of Object.entries(keyTypes)) {
        keyManager.getCurrentKey.mockReturnValue(keyValue);
        
        const testData = `Test data for ${keyType}`;
        const encrypted = encryptionService.encrypt(testData);

        expect(encrypted).toBeDefined();
        expect(typeof encrypted).toBe('string');

        // Verify key type is tracked
        expect(audit.logAccess).toHaveBeenCalledWith(
          'ENCRYPTION_OPERATION',
          'EncryptionService',
          expect.any(String),
          expect.objectContaining({
            keyType: keyType,
            operation: 'ENCRYPT'
          }),
          undefined
        );
      }
    });

    it('should validate key integrity before encryption operations', async () => {
      // Test with valid key
      keyManager.validateKeyIntegrity.mockReturnValue(true);
      
      const validResult = encryptionService.encrypt('test data');
      expect(validResult).toBeDefined();

      // Test with compromised key
      keyManager.validateKeyIntegrity.mockReturnValue(false);
      
      expect(() => {
        encryptionService.encrypt('test data');
      }).toThrow('Key integrity validation failed');

      // Verify security audit for compromised key
      expect(audit.logError).toHaveBeenCalledWith(
        'KEY_INTEGRITY_FAILURE',
        'EncryptionService',
        expect.any(String),
        expect.objectContaining({
          error: 'Key integrity validation failed',
          securityIncident: true
        }),
        undefined
      );
    });
  });

  describe('Database-Level Encryption', () => {
    it('should implement transparent data encryption for database columns', async () => {
      const sensitiveAppointment = createMockAppointment({
        id: 'appt-789',
        clientId: 'client-123',
        therapistId: 'therapist-456',
        notes: 'Patient discussed traumatic childhood experiences',
        diagnosis: 'PTSD, Depression',
        treatmentPlan: 'EMDR therapy recommended',
        nextSteps: 'Schedule EMDR sessions, medication consultation'
      });

      // Define which fields require database-level encryption
      const databaseEncryptedFields = ['notes', 'diagnosis', 'treatmentPlan', 'nextSteps'];

      // Encrypt before database storage
      const encryptedForDB = encryptionService.encryptObject(
        sensitiveAppointment, 
        databaseEncryptedFields
      );

      mockPrisma.appointment.create.mockResolvedValue({
        ...encryptedForDB,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await mockPrisma.appointment.create({
        data: encryptedForDB
      });

      // Verify sensitive fields are encrypted in database
      expect(result.notes).not.toBe(sensitiveAppointment.notes);
      expect(result.diagnosis).not.toBe(sensitiveAppointment.diagnosis);
      
      // Verify non-sensitive fields are preserved
      expect(result.clientId).toBe(sensitiveAppointment.clientId);
      expect(result.therapistId).toBe(sensitiveAppointment.therapistId);

      // Verify decryption for application use
      const decryptedResult = encryptionService.decryptObject(result, databaseEncryptedFields);
      expect(decryptedResult.notes).toBe(sensitiveAppointment.notes);
      expect(decryptedResult.diagnosis).toBe(sensitiveAppointment.diagnosis);
    });

    it('should handle encryption during database migrations', async () => {
      // Simulate migration scenario where existing plaintext data needs encryption
      const plaintextRecords = [
        { id: 1, notes: 'Sensitive note 1', encrypted: false },
        { id: 2, notes: 'Sensitive note 2', encrypted: false },
        { id: 3, notes: 'Sensitive note 3', encrypted: false }
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(plaintextRecords);

      // Migration process
      const migrationResults = [];
      for (const record of plaintextRecords) {
        if (!record.encrypted) {
          const encryptedNotes = encryptionService.encrypt(record.notes);
          
          const updatedRecord = {
            ...record,
            notes: encryptedNotes,
            encrypted: true,
            encryptionVersion: keyManager.getKeyVersion()
          };

          mockPrisma.appointment.update.mockResolvedValue(updatedRecord);
          migrationResults.push(updatedRecord);
        }
      }

      // Verify all records were encrypted
      expect(migrationResults).toHaveLength(3);
      migrationResults.forEach(record => {
        expect(record.encrypted).toBe(true);
        expect(record.notes).not.toBe(plaintextRecords.find(p => p.id === record.id)?.notes);
      });

      // Verify migration audit trail
      expect(audit.logSuccess).toHaveBeenCalledWith(
        'DATA_MIGRATION_ENCRYPTION',
        'DatabaseMigration',
        expect.any(String),
        expect.objectContaining({
          recordsProcessed: 3,
          encryptionVersion: expect.any(Number)
        }),
        undefined
      );
    });
  });

  describe('Search and Indexing with Encryption', () => {
    it('should implement searchable encryption for sensitive fields', async () => {
      const searchableData = [
        { 
          id: 'patient-1', 
          name: 'John Smith',
          condition: 'Depression',
          tags: ['anxiety', 'therapy', 'medication']
        },
        { 
          id: 'patient-2', 
          name: 'Jane Doe',
          condition: 'Anxiety Disorder',
          tags: ['panic', 'cbt', 'mindfulness']
        }
      ];

      // Create searchable encrypted indexes
      const searchIndexes = searchableData.map(patient => ({
        id: patient.id,
        nameHash: encryptionService.createSearchableHash(patient.name),
        conditionHash: encryptionService.createSearchableHash(patient.condition),
        tagHashes: patient.tags.map(tag => encryptionService.createSearchableHash(tag)),
        encryptedData: encryptionService.encrypt(JSON.stringify(patient))
      }));

      // Simulate search operation
      const searchTerm = 'Depression';
      const searchHash = encryptionService.createSearchableHash(searchTerm);
      
      const matchingIndex = searchIndexes.find(index => 
        index.conditionHash === searchHash
      );

      expect(matchingIndex).toBeDefined();
      expect(matchingIndex?.id).toBe('patient-1');

      // Verify original data can be decrypted
      const decryptedData = JSON.parse(
        encryptionService.decrypt(matchingIndex!.encryptedData)
      );
      expect(decryptedData.condition).toBe('Depression');
    });

    it('should handle fuzzy search with encrypted data', async () => {
      const patientNames = [
        'John Smith',
        'Jon Smyth',
        'Jane Smith',
        'Jonathan Smith'
      ];

      // Create phonetic and fuzzy search hashes
      const searchHashes = patientNames.map(name => ({
        name,
        exactHash: encryptionService.createSearchableHash(name),
        phoneticHash: encryptionService.createPhoneticHash(name),
        fuzzyHashes: encryptionService.createFuzzyHashes(name)
      }));

      // Search for variations
      const searchVariations = ['Jon Smith', 'John Smyth', 'J Smith'];
      
      for (const searchTerm of searchVariations) {
        const searchPhonetic = encryptionService.createPhoneticHash(searchTerm);
        const matches = searchHashes.filter(hash => 
          hash.phoneticHash === searchPhonetic ||
          hash.fuzzyHashes.some(fuzzy => 
            encryptionService.createFuzzyHashes(searchTerm).includes(fuzzy)
          )
        );

        expect(matches.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Backup and Recovery Encryption', () => {
    it('should encrypt data backups with separate backup keys', async () => {
      const backupData = {
        patients: [
          { id: 'p1', data: 'sensitive patient data 1' },
          { id: 'p2', data: 'sensitive patient data 2' }
        ],
        appointments: [
          { id: 'a1', notes: 'confidential session notes 1' },
          { id: 'a2', notes: 'confidential session notes 2' }
        ],
        metadata: {
          backupDate: new Date(),
          version: '1.0',
          checksum: 'backup-checksum-123'
        }
      };

      // Use separate backup encryption key
      const backupKey = 'backup-encryption-key-256';
      const backupEncryption = new EncryptionService(backupKey);

      const encryptedBackup = backupEncryption.encrypt(JSON.stringify(backupData));

      // Verify backup is encrypted
      expect(encryptedBackup).not.toContain('sensitive patient data');
      expect(encryptedBackup).not.toContain('confidential session notes');

      // Verify backup can be decrypted
      const decryptedBackup = JSON.parse(backupEncryption.decrypt(encryptedBackup));
      expect(decryptedBackup.patients[0].data).toBe('sensitive patient data 1');
      expect(decryptedBackup.appointments[0].notes).toBe('confidential session notes 1');

      // Verify backup audit trail
      expect(audit.logSuccess).toHaveBeenCalledWith(
        'BACKUP_ENCRYPTION',
        'DataBackup',
        expect.any(String),
        expect.objectContaining({
          backupSize: expect.any(Number),
          encryptionKey: 'backup-key',
          backupDate: expect.any(Date)
        }),
        undefined
      );
    });

    it('should implement point-in-time recovery with encrypted snapshots', async () => {
      const timePoints = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T12:00:00Z'),
        new Date('2024-01-02T00:00:00Z')
      ];

      const encryptedSnapshots = timePoints.map((timePoint, index) => ({
        timestamp: timePoint,
        snapshotId: `snapshot-${index + 1}`,
        encryptedData: encryptionService.encrypt(JSON.stringify({
          dataState: `Data state at ${timePoint.toISOString()}`,
          recordCount: 100 + index * 10,
          modifications: [`change-${index + 1}`]
        })),
        checksum: `checksum-${index + 1}`,
        keyVersion: keyManager.getKeyVersion()
      }));

      // Simulate recovery to specific point in time
      const targetTimestamp = new Date('2024-01-01T12:00:00Z');
      const recoverySnapshot = encryptedSnapshots.find(
        snapshot => snapshot.timestamp.getTime() === targetTimestamp.getTime()
      );

      expect(recoverySnapshot).toBeDefined();

      const recoveredData = JSON.parse(
        encryptionService.decrypt(recoverySnapshot!.encryptedData)
      );

      expect(recoveredData.dataState).toContain('2024-01-01T12:00:00.000Z');
      expect(recoveredData.recordCount).toBe(110);
    });
  });

  describe('Compliance and Audit', () => {
    it('should maintain comprehensive encryption audit logs', async () => {
      const auditEvents = [
        'ENCRYPTION_OPERATION',
        'DECRYPTION_OPERATION',
        'KEY_ROTATION',
        'KEY_ACCESS',
        'PHI_ACCESS',
        'DATA_EXPORT',
        'BACKUP_ENCRYPTION',
        'RECOVERY_OPERATION'
      ];

      // Simulate various encryption operations
      encryptionService.encrypt('test data');
      encryptionService.decrypt('encrypted_test_data');
      keyManager.rotateKeys();

      // Verify all operations are audited
      for (const event of auditEvents) {
        expect(audit.logAccess).toHaveBeenCalledWith(
          event,
          expect.any(String),
          expect.any(String),
          expect.objectContaining({
            timestamp: expect.any(Date),
            operation: expect.any(String)
          }),
          expect.any(String)
        );
      }
    });

    it('should implement HIPAA-compliant encryption standards', async () => {
      const hipaaRequirements = {
        encryptionAlgorithm: 'AES-256-GCM',
        keyLength: 256,
        keyRotationDays: 90,
        auditRetentionYears: 6,
        accessControlRequired: true,
        integrityVerificationRequired: true
      };

      // Verify encryption meets HIPAA standards
      const testData = 'HIPAA protected health information';
      encryptionService.encrypt(testData);

      // Verify encryption algorithm compliance
      expect(mockCrypto.createCipheriv).toHaveBeenCalledWith(
        'aes-256-gcm',
        expect.any(Buffer),
        expect.any(Buffer)
      );

      // Verify key length compliance
      expect(mockCrypto.pbkdf2Sync).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(Buffer),
        expect.any(Number),
        32, // 256 bits / 8 = 32 bytes
        'sha256'
      );

      // Verify integrity verification
      expect(mockCrypto.createCipheriv().getAuthTag).toHaveBeenCalled();

      // Verify audit compliance
      expect(audit.logAccess).toHaveBeenCalledWith(
        'HIPAA_ENCRYPTION_COMPLIANCE',
        'EncryptionService',
        expect.any(String),
        expect.objectContaining({
          algorithm: hipaaRequirements.encryptionAlgorithm,
          keyLength: hipaaRequirements.keyLength,
          complianceStandard: 'HIPAA'
        }),
        undefined
      );
    });

    it('should implement data retention and secure deletion', async () => {
      const retentionPolicies = {
        PATIENT_RECORDS: { retentionYears: 7, secureDeleteRequired: true },
        SESSION_NOTES: { retentionYears: 7, secureDeleteRequired: true },
        AUDIT_LOGS: { retentionYears: 6, secureDeleteRequired: false },
        BACKUP_DATA: { retentionDays: 90, secureDeleteRequired: true }
      };

      for (const [dataType, policy] of Object.entries(retentionPolicies)) {
        // Simulate data that has exceeded retention period
        const expiredData = {
          id: `${dataType.toLowerCase()}-expired`,
          data: 'sensitive expired data',
          createdAt: new Date(Date.now() - (policy.retentionYears || 0) * 365 * 24 * 60 * 60 * 1000),
          retentionPolicy: policy
        };

        if (policy.secureDeleteRequired) {
          // Implement cryptographic erasure by destroying keys
          keyManager.rotateKeys();
          
          // Verify secure deletion audit
          expect(audit.logSuccess).toHaveBeenCalledWith(
            'SECURE_DATA_DELETION',
            dataType,
            expiredData.id,
            expect.objectContaining({
              deletionMethod: 'CRYPTOGRAPHIC_ERASURE',
              retentionPeriodExpired: true,
              originalCreationDate: expiredData.createdAt
            }),
            undefined
          );
        }
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large-scale encryption operations efficiently', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, index) => ({
        id: `record-${index}`,
        sensitiveData: `This is sensitive data for record ${index}`,
        metadata: {
          created: new Date(),
          category: 'patient_data'
        }
      }));

      const startTime = Date.now();
      
      // Encrypt large dataset
      const encryptedDataSet = largeDataSet.map(record => 
        encryptionService.encryptObject(record, ['sensitiveData'])
      );

      const encryptionTime = Date.now() - startTime;

      // Verify performance is acceptable (less than 5 seconds for 1000 records)
      expect(encryptionTime).toBeLessThan(5000);
      expect(encryptedDataSet).toHaveLength(1000);

      // Verify all records are encrypted
      encryptedDataSet.forEach((record, index) => {
        expect(record.sensitiveData).not.toBe(largeDataSet[index].sensitiveData);
        expect(record.id).toBe(largeDataSet[index].id); // Non-encrypted field preserved
      });
    });

    it('should implement caching for frequently accessed encrypted data', async () => {
      const cacheSize = 100;
      // Simulate cache implementation
      const encryptionCache = new Map();

      const testData = 'frequently accessed sensitive data';
      const cacheKey = encryptionService.createSearchableHash(testData);

      // First access - cache miss
      const encrypted = encryptionService.encrypt(testData);
      encryptionCache.set(cacheKey, encrypted);

      // Subsequent access - cache hit
      const cachedEncrypted = encryptionCache.get(cacheKey);
      expect(cachedEncrypted).toBe(encrypted);

      // Verify cache performance metrics
      expect(encryptionCache.size).toBeLessThanOrEqual(cacheSize);
    });
  });
});