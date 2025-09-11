import { z } from 'zod';
import type {
  CrisisSeverity,
  InterventionType,
  InterventionStatus,
  RiskLevel
} from '@prisma/client';

export const crisisAssessmentSchema = z.object({
  severity: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'EMERGENCY']),
  triggerEvent: z.string().optional(),
  symptoms: z.array(z.string()).min(1, 'At least one symptom is required'),
  suicidalIdeation: z.boolean(),
  homicidalIdeation: z.boolean(),
  selfHarmRisk: z.boolean(),
  substanceUse: z.boolean(),
  hasSupport: z.boolean(),
  hasPlan: z.boolean(),
  hasMeans: z.boolean(),
  immediateRisk: z.boolean()
});

export const crisisInterventionSchema = z.object({
  userId: z.string(),
  severity: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'EMERGENCY']),
  triggerEvent: z.string().optional(),
  symptoms: z.array(z.string()),
  interventionType: z.enum([
    'CALL',
    'CHAT',
    'VIDEO',
    'IN_PERSON',
    'REFERRAL',
    'EMERGENCY_DISPATCH'
  ]),
  responderNotes: z.string().optional(),
  resourcesProvided: z.array(z.string()),
  followUpRequired: z.boolean(),
  followUpDate: z.string().or(z.date()).optional()
});

export const safetyPlanSchema = z.object({
  warningSignals: z.array(z.string()),
  copingStrategies: z.array(z.string()),
  distractionTechniques: z.array(z.string()),
  supportContacts: z.array(
    z.object({
      name: z.string(),
      relationship: z.string(),
      phoneNumber: z.string(),
      available247: z.boolean()
    })
  ),
  professionalContacts: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      phoneNumber: z.string(),
      afterHours: z.boolean()
    })
  ),
  safeEnvironment: z.array(z.string()),
  reasonsForLiving: z.array(z.string())
});

export type CrisisAssessmentInput = z.infer<typeof crisisAssessmentSchema>;
export type CrisisInterventionInput = z.infer<typeof crisisInterventionSchema>;
export type SafetyPlanInput = z.infer<typeof safetyPlanSchema>;

export interface CrisisIntervention {
  id: string;
  userId: string;
  severity: CrisisSeverity;
  interventionType: InterventionType;
  status: InterventionStatus;
  startTime: Date;
  endTime?: Date;
  outcome?: string;
  followUpRequired: boolean;
  followUpDate?: Date;
}

export interface RiskAssessment {
  userId: string;
  assessmentDate: Date;
  riskLevel: RiskLevel;
  factors: {
    suicidalIdeation: boolean;
    homicidalIdeation: boolean;
    selfHarm: boolean;
    substanceUse: boolean;
    psychosis: boolean;
    impulsivity: boolean;
  };
  protectiveFactors: string[];
  recommendations: string[];
}

export interface CrisisResource {
  name: string;
  number: string;
  description: string;
  text: boolean;
}

export interface CrisisResources {
  US: {
    suicide: string;
    suicideAlt: string;
    crisis: string;
    emergency: string;
  };
  resources: CrisisResource[];
}

export interface CrisisAssessmentResponse {
  success: boolean;
  severity: CrisisSeverity;
  interventionId: string;
  resources: CrisisResources;
  nextSteps: string[];
  urgent?: boolean;
  message?: string;
  alertsSent?: boolean;
  error?: string;
}

export interface CrisisInterventionCreateData {
  userId: string;
  severity: CrisisSeverity;
  triggerEvent: string | null;
  symptoms: string[];
  interventionType: InterventionType;
  status: InterventionStatus;
  followUpRequired: boolean;
  followUpDate: Date | null;
  resourcesProvided: string[];
}

// Query schemas
export const crisisQuerySchema = z.object({
  severity: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'EMERGENCY']).optional(),
  interventionType: z.enum(['CALL', 'CHAT', 'VIDEO', 'IN_PERSON', 'REFERRAL', 'EMERGENCY_DISPATCH']).optional(),
  status: z.enum(['ACTIVE', 'RESOLVED', 'ESCALATED', 'TRANSFERRED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional(),
  responderId: z.string().optional()
});

export const riskAssessmentQuerySchema = z.object({
  riskLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional()
});

// Type inference
export type CrisisQuery = z.infer<typeof crisisQuerySchema>;
export type RiskAssessmentQuery = z.infer<typeof riskAssessmentQuerySchema>;

// =====================
// ENHANCED RESPONSE TYPES
// =====================

export interface CrisisInterventionResponse {
  success: boolean;
  intervention?: {
    id: string;
    userId: string;
    severity: CrisisSeverity;
    triggerEvent?: string;
    symptoms: string[];
    interventionType: InterventionType;
    status: InterventionStatus;
    startTime: string;
    endTime?: string;
    outcome?: string;
    followUpRequired: boolean;
    followUpDate?: string;
    resourcesProvided: string[];
    responderNotes?: string;
    responder?: {
      id: string;
      name: string;
      role: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  interventions?: Array<{
    id: string;
    severity: CrisisSeverity;
    interventionType: InterventionType;
    status: InterventionStatus;
    startTime: string;
    endTime?: string;
    outcome?: string;
    followUpRequired: boolean;
  }>;
  total?: number;
  message: string;
  error?: string;
}

export interface RiskAssessmentResponseEnhanced {
  success: boolean;
  assessment?: {
    id: string;
    userId: string;
    assessmentDate: string;
    riskLevel: RiskLevel;
    factors: {
      suicidalIdeation: boolean;
      homicidalIdeation: boolean;
      selfHarm: boolean;
      substanceUse: boolean;
      psychosis: boolean;
      impulsivity: boolean;
    };
    protectiveFactors: string[];
    recommendations: string[];
    assessor: {
      id: string;
      name: string;
      role: string;
    };
    nextReviewDate?: string;
    createdAt: string;
  };
  assessments?: Array<{
    id: string;
    assessmentDate: string;
    riskLevel: RiskLevel;
    factorsCount: number;
    protectiveFactorsCount: number;
    recommendationsCount: number;
    assessor: {
      name: string;
      role: string;
    };
  }>;
  total?: number;
  message: string;
  error?: string;
}

export interface SafetyPlanResponse {
  success: boolean;
  safetyPlan?: {
    id: string;
    userId: string;
    warningSignals: string[];
    copingStrategies: string[];
    distractionTechniques: string[];
    supportContacts: Array<{
      name: string;
      relationship: string;
      phoneNumber: string;
      available247: boolean;
    }>;
    professionalContacts: Array<{
      name: string;
      role: string;
      phoneNumber: string;
      afterHours: boolean;
    }>;
    safeEnvironment: string[];
    reasonsForLiving: string[];
    createdBy: {
      id: string;
      name: string;
      role: string;
    };
    lastReviewed?: string;
    nextReview?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
  error?: string;
}

export interface CrisisResourcesResponseEnhanced {
  success: boolean;
  resources?: {
    hotlines: Array<{
      name: string;
      number: string;
      description: string;
      available247: boolean;
      supportsText: boolean;
      languages: string[];
    }>;
    emergencyServices: Array<{
      type: 'POLICE' | 'AMBULANCE' | 'CRISIS_TEAM' | 'MOBILE_CRISIS';
      name: string;
      number: string;
      description: string;
      coverage: string;
    }>;
    supportGroups: Array<{
      name: string;
      description: string;
      meetingTimes: string;
      contactInfo: string;
      virtual: boolean;
    }>;
    professionalServices: Array<{
      name: string;
      type: 'THERAPIST' | 'PSYCHIATRIST' | 'COUNSELOR' | 'CRISIS_CENTER';
      description: string;
      location: string;
      contactInfo: string;
      acceptsInsurance: boolean;
      emergencyAvailable: boolean;
    }>;
  };
  location?: {
    region: string;
    country: string;
  };
  message: string;
  error?: string;
}

export interface CrisisStatisticsResponse {
  success: boolean;
  statistics?: {
    totalInterventions: number;
    activeCases: number;
    resolvedCases: number;
    escalatedCases: number;
    averageResponseTime: number; // minutes
    severityBreakdown: {
      low: number;
      moderate: number;
      high: number;
      critical: number;
      emergency: number;
    };
    interventionTypeBreakdown: {
      call: number;
      chat: number;
      video: number;
      inPerson: number;
      referral: number;
      emergencyDispatch: number;
    };
    outcomeBreakdown: {
      resolved: number;
      stabilized: number;
      referred: number;
      hospitalized: number;
      followUpScheduled: number;
    };
    trends: {
      daily: Array<{ date: string; count: number }>;
      weekly: Array<{ week: string; count: number }>;
      monthly: Array<{ month: string; count: number }>;
    };
  };
  timeframe: string;
  message: string;
  error?: string;
}
