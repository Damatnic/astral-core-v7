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
