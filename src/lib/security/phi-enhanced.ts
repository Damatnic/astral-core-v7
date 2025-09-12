/**
 * Enhanced PHI Protection Service
 * Additional HIPAA compliance features for Protected Health Information
 */

import { z } from 'zod';
import crypto from 'crypto';
import { getConfig } from '@/lib/config/env-validation';

// PHI access reason codes (HIPAA requirement)
export enum PHIAccessReason {
  TREATMENT = 'TREATMENT',
  PAYMENT = 'PAYMENT',
  OPERATIONS = 'OPERATIONS',
  PATIENT_REQUEST = 'PATIENT_REQUEST',
  LEGAL_REQUIREMENT = 'LEGAL_REQUIREMENT',
  EMERGENCY = 'EMERGENCY',
  RESEARCH = 'RESEARCH',
  PUBLIC_HEALTH = 'PUBLIC_HEALTH',
}

// PHI disclosure tracking schema
export const phiDisclosureSchema = z.object({
  patientId: z.string(),
  disclosedTo: z.string(),
  disclosedBy: z.string(),
  reason: z.nativeEnum(PHIAccessReason),
  dataTypes: z.array(z.string()),
  purpose: z.string(),
  timestamp: z.date(),
  expiresAt: z.date().optional(),
  revoked: z.boolean().default(false),
});

export type PHIDisclosure = z.infer<typeof phiDisclosureSchema>;

// PHI consent schema
export const phiConsentSchema = z.object({
  patientId: z.string(),
  consentType: z.enum(['treatment', 'disclosure', 'research', 'marketing']),
  granted: z.boolean(),
  grantedBy: z.string(),
  grantedAt: z.date(),
  expiresAt: z.date().optional(),
  scope: z.array(z.string()).optional(),
  restrictions: z.array(z.string()).optional(),
  revocable: z.boolean().default(true),
});

export type PHIConsent = z.infer<typeof phiConsentSchema>;

// Data retention policy
export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: number; // in days
  autoDelete: boolean;
  requiresApproval: boolean;
  legalBasis: string;
}

// Default retention policies (HIPAA requires 6 years minimum)
export const DEFAULT_RETENTION_POLICIES: DataRetentionPolicy[] = [
  {
    dataType: 'medical_records',
    retentionPeriod: 2555, // 7 years
    autoDelete: false,
    requiresApproval: true,
    legalBasis: 'HIPAA 45 CFR 164.530(j)',
  },
  {
    dataType: 'session_notes',
    retentionPeriod: 2555, // 7 years
    autoDelete: false,
    requiresApproval: true,
    legalBasis: 'HIPAA 45 CFR 164.530(j)',
  },
  {
    dataType: 'billing_records',
    retentionPeriod: 2190, // 6 years
    autoDelete: false,
    requiresApproval: true,
    legalBasis: 'HIPAA 45 CFR 164.530(j)',
  },
  {
    dataType: 'audit_logs',
    retentionPeriod: 2190, // 6 years
    autoDelete: false,
    requiresApproval: false,
    legalBasis: 'HIPAA 45 CFR 164.312(b)',
  },
  {
    dataType: 'consent_records',
    retentionPeriod: 2190, // 6 years
    autoDelete: false,
    requiresApproval: false,
    legalBasis: 'HIPAA 45 CFR 164.530(j)',
  },
];

/**
 * Enhanced PHI Protection Service
 */
export class EnhancedPHIService {
  private disclosures: Map<string, PHIDisclosure[]> = new Map();
  private consents: Map<string, PHIConsent[]> = new Map();
  private accessLog: Map<string, any[]> = new Map();
  
  /**
   * Check if user has consent to access PHI
   * @param patientId Patient ID
   * @param userId User requesting access
   * @param dataType Type of data being accessed
   * @returns True if consent exists and is valid
   */
  async hasConsent(
    patientId: string,
    userId: string,
    dataType: string
  ): Promise<boolean> {
    const patientConsents = this.consents.get(patientId) || [];
    
    const validConsent = patientConsents.find(consent => {
      // Check if consent is valid
      if (!consent.granted || consent.patientId !== patientId) {
        return false;
      }
      
      // Check expiration
      if (consent.expiresAt && consent.expiresAt < new Date()) {
        return false;
      }
      
      // Check scope
      if (consent.scope && !consent.scope.includes(dataType)) {
        return false;
      }
      
      return true;
    });
    
    return !!validConsent;
  }
  
  /**
   * Record PHI disclosure
   * @param disclosure Disclosure details
   */
  async recordDisclosure(disclosure: PHIDisclosure): Promise<void> {
    // Validate disclosure
    const validated = phiDisclosureSchema.parse(disclosure);
    
    // Get existing disclosures for patient
    const patientDisclosures = this.disclosures.get(validated.patientId) || [];
    
    // Add new disclosure
    patientDisclosures.push(validated);
    this.disclosures.set(validated.patientId, patientDisclosures);
    
    // Log for audit
    await this.logAccess({
      action: 'DISCLOSURE',
      patientId: validated.patientId,
      userId: validated.disclosedBy,
      dataTypes: validated.dataTypes,
      reason: validated.reason,
      timestamp: validated.timestamp,
    });
  }
  
  /**
   * Get disclosure history for a patient
   * @param patientId Patient ID
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @returns Array of disclosures
   */
  async getDisclosureHistory(
    patientId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PHIDisclosure[]> {
    const disclosures = this.disclosures.get(patientId) || [];
    
    return disclosures.filter(disclosure => {
      if (startDate && disclosure.timestamp < startDate) return false;
      if (endDate && disclosure.timestamp > endDate) return false;
      return true;
    });
  }
  
  /**
   * Grant consent for PHI access
   * @param consent Consent details
   */
  async grantConsent(consent: PHIConsent): Promise<void> {
    // Validate consent
    const validated = phiConsentSchema.parse(consent);
    
    // Get existing consents for patient
    const patientConsents = this.consents.get(validated.patientId) || [];
    
    // Revoke existing consent of same type if exists
    const existingIndex = patientConsents.findIndex(
      c => c.consentType === validated.consentType
    );
    
    if (existingIndex !== -1) {
      patientConsents[existingIndex] = validated;
    } else {
      patientConsents.push(validated);
    }
    
    this.consents.set(validated.patientId, patientConsents);
  }
  
  /**
   * Revoke consent
   * @param patientId Patient ID
   * @param consentType Type of consent to revoke
   */
  async revokeConsent(
    patientId: string,
    consentType: PHIConsent['consentType']
  ): Promise<void> {
    const patientConsents = this.consents.get(patientId) || [];
    
    const updatedConsents = patientConsents.map(consent => {
      if (consent.consentType === consentType && consent.revocable) {
        return { ...consent, granted: false };
      }
      return consent;
    });
    
    this.consents.set(patientId, updatedConsents);
  }
  
  /**
   * Log PHI access
   * @param access Access details
   */
  private async logAccess(access: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = {
      ...access,
      timestamp,
      id: crypto.randomUUID(),
    };
    
    // Store in access log
    const patientLog = this.accessLog.get(access.patientId) || [];
    patientLog.push(logEntry);
    this.accessLog.set(access.patientId, patientLog);
    
    // In production, also store in database
  }
  
  /**
   * Get access log for a patient
   * @param patientId Patient ID
   * @param limit Maximum number of entries
   * @returns Access log entries
   */
  async getAccessLog(patientId: string, limit = 100): Promise<any[]> {
    const log = this.accessLog.get(patientId) || [];
    return log.slice(-limit);
  }
  
  /**
   * Check if data should be retained
   * @param dataType Type of data
   * @param createdAt Creation date
   * @returns True if data should be retained
   */
  shouldRetainData(dataType: string, createdAt: Date): boolean {
    const policy = DEFAULT_RETENTION_POLICIES.find(p => p.dataType === dataType);
    
    if (!policy) {
      // Default to retaining data if no policy found
      return true;
    }
    
    const daysSinceCreation = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceCreation < policy.retentionPeriod;
  }
  
  /**
   * Anonymize PHI data
   * @param data Data to anonymize
   * @param fields Fields to anonymize
   * @returns Anonymized data
   */
  anonymizeData<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
  ): T {
    const anonymized = { ...data };
    
    for (const field of fields) {
      const value = anonymized[field];
      
      if (typeof value === 'string') {
        // Anonymize string fields
        if (field.toString().toLowerCase().includes('email')) {
          anonymized[field] = 'REDACTED@example.com' as T[keyof T];
        } else if (field.toString().toLowerCase().includes('phone')) {
          anonymized[field] = 'XXX-XXX-XXXX' as T[keyof T];
        } else if (field.toString().toLowerCase().includes('name')) {
          anonymized[field] = 'REDACTED' as T[keyof T];
        } else {
          anonymized[field] = '[REDACTED]' as T[keyof T];
        }
      } else if (typeof value === 'number') {
        // Anonymize numeric fields
        anonymized[field] = 0 as T[keyof T];
      } else if (value instanceof Date) {
        // Anonymize date fields (keep year only)
        anonymized[field] = new Date(value.getFullYear(), 0, 1) as T[keyof T];
      }
    }
    
    return anonymized;
  }
  
  /**
   * Generate PHI access report
   * @param patientId Patient ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Access report
   */
  async generateAccessReport(
    patientId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    patientId: string;
    period: { start: Date; end: Date };
    totalAccesses: number;
    accessByType: Record<string, number>;
    accessByUser: Record<string, number>;
    disclosures: PHIDisclosure[];
    anomalies: string[];
  }> {
    const accessLog = await this.getAccessLog(patientId);
    const disclosures = await this.getDisclosureHistory(patientId, startDate, endDate);
    
    // Filter access log by date range
    const filteredLog = accessLog.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    });
    
    // Analyze access patterns
    const accessByType: Record<string, number> = {};
    const accessByUser: Record<string, number> = {};
    const anomalies: string[] = [];
    
    for (const entry of filteredLog) {
      // Count by type
      accessByType[entry.action] = (accessByType[entry.action] || 0) + 1;
      
      // Count by user
      accessByUser[entry.userId] = (accessByUser[entry.userId] || 0) + 1;
    }
    
    // Detect anomalies
    for (const [userId, count] of Object.entries(accessByUser)) {
      if (count > 50) {
        anomalies.push(`Excessive access by user ${userId}: ${count} times`);
      }
    }
    
    // Check for after-hours access
    const afterHoursAccess = filteredLog.filter(entry => {
      const hour = new Date(entry.timestamp).getHours();
      return hour < 6 || hour > 22;
    });
    
    if (afterHoursAccess.length > 0) {
      anomalies.push(`${afterHoursAccess.length} after-hours access attempts detected`);
    }
    
    return {
      patientId,
      period: { start: startDate, end: endDate },
      totalAccesses: filteredLog.length,
      accessByType,
      accessByUser,
      disclosures,
      anomalies,
    };
  }
  
  /**
   * Validate PHI access request
   * @param userId User requesting access
   * @param patientId Patient whose data is being accessed
   * @param reason Reason for access
   * @param dataTypes Types of data being accessed
   * @returns Validation result
   */
  async validateAccessRequest(
    userId: string,
    patientId: string,
    reason: PHIAccessReason,
    dataTypes: string[]
  ): Promise<{
    allowed: boolean;
    reason?: string;
    requiresMFA?: boolean;
    requiresAdditionalApproval?: boolean;
  }> {
    // Check if user has consent
    const hasConsentForAll = await Promise.all(
      dataTypes.map(type => this.hasConsent(patientId, userId, type))
    );
    
    if (!hasConsentForAll.every(Boolean)) {
      return {
        allowed: false,
        reason: 'Missing patient consent for requested data types',
      };
    }
    
    // Check access reason validity
    const sensitiveReasons = [
      PHIAccessReason.LEGAL_REQUIREMENT,
      PHIAccessReason.RESEARCH,
      PHIAccessReason.PUBLIC_HEALTH,
    ];
    
    if (sensitiveReasons.includes(reason)) {
      return {
        allowed: true,
        requiresMFA: true,
        requiresAdditionalApproval: true,
      };
    }
    
    // Emergency access
    if (reason === PHIAccessReason.EMERGENCY) {
      // Log emergency access for review
      await this.logAccess({
        action: 'EMERGENCY_ACCESS',
        patientId,
        userId,
        dataTypes,
        reason,
        timestamp: new Date(),
      });
      
      return {
        allowed: true,
        requiresMFA: false, // Skip MFA in emergency
      };
    }
    
    return {
      allowed: true,
      requiresMFA: true,
    };
  }
}

// Export singleton instance
export const enhancedPHIService = new EnhancedPHIService();