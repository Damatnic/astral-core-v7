import { z } from 'zod';
import type { AppointmentType, AppointmentStatus } from '@prisma/client';

export const appointmentSchema = z.object({
  therapistId: z.string(),
  scheduledAt: z.string().or(z.date()),
  duration: z.number().min(15).max(180).default(60),
  type: z.enum([
    'INITIAL_CONSULTATION',
    'THERAPY_SESSION',
    'FOLLOW_UP',
    'CRISIS_SESSION',
    'GROUP_SESSION',
    'ASSESSMENT'
  ]),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional(),
  notes: z.string().optional()
});

export const sessionNoteSchema = z.object({
  appointmentId: z.string(),
  sessionDate: z.string().or(z.date()),
  sessionType: z.string(),
  presentingIssues: z.array(z.string()),
  interventions: z.array(z.string()),
  clientResponse: z.string().optional(),
  homework: z.string().optional(),
  riskAssessment: z
    .object({
      suicidalIdeation: z.boolean(),
      homicidalIdeation: z.boolean(),
      selfHarm: z.boolean(),
      substanceUse: z.boolean(),
      notes: z.string().optional()
    })
    .optional(),
  planForNext: z.string().optional(),
  additionalNotes: z.string().optional()
});

export const treatmentPlanSchema = z.object({
  clientId: z.string(),
  title: z.string(),
  diagnosis: z.array(z.string()),
  goals: z.array(
    z.object({
      description: z.string(),
      targetDate: z.string(),
      status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'DISCONTINUED'])
    })
  ),
  objectives: z.array(
    z.object({
      goalId: z.string(),
      description: z.string(),
      measurable: z.string(),
      targetDate: z.string()
    })
  ),
  interventions: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      frequency: z.string()
    })
  ),
  frequency: z.string(),
  duration: z.string(),
  startDate: z.string().or(z.date()),
  reviewDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional()
});

export const progressReportSchema = z.object({
  clientId: z.string(),
  reportDate: z.string().or(z.date()),
  reportPeriod: z.string(),
  summary: z.string(),
  goalsProgress: z.array(
    z.object({
      goalId: z.string(),
      progress: z.number().min(0).max(100),
      notes: z.string()
    })
  ),
  challenges: z.array(z.string()),
  achievements: z.array(z.string()),
  recommendations: z.array(z.string()),
  nextSteps: z.array(z.string())
});

// Query schemas
export const appointmentQuerySchema = z.object({
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NO_SHOW']).optional(),
  type: z.enum(['INITIAL_CONSULTATION', 'THERAPY_SESSION', 'FOLLOW_UP', 'CRISIS_SESSION', 'GROUP_SESSION', 'ASSESSMENT']).optional(),
  therapistId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const sessionNotesQuerySchema = z.object({
  appointmentId: z.string().optional(),
  clientId: z.string().optional(),
  therapistId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const treatmentPlanQuerySchema = z.object({
  clientId: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'DISCONTINUED']).optional(),
  therapistId: z.string().optional()
});

// Type inference from schemas
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type SessionNoteInput = z.infer<typeof sessionNoteSchema>;
export type TreatmentPlanInput = z.infer<typeof treatmentPlanSchema>;
export type ProgressReportInput = z.infer<typeof progressReportSchema>;
export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>;
export type SessionNotesQuery = z.infer<typeof sessionNotesQuerySchema>;
export type TreatmentPlanQuery = z.infer<typeof treatmentPlanQuerySchema>;

// =====================
// RESPONSE TYPES
// =====================

export interface AppointmentResponse {
  success: boolean;
  appointment?: AppointmentWithDetails;
  appointments?: AppointmentWithDetails[];
  total?: number;
  message: string;
  error?: string;
}

export interface SessionNoteResponse {
  success: boolean;
  sessionNote?: {
    id: string;
    appointmentId: string;
    sessionDate: string;
    sessionType: string;
    presentingIssues: string[];
    interventions: string[];
    clientResponse?: string;
    homework?: string;
    riskAssessment?: {
      suicidalIdeation: boolean;
      homicidalIdeation: boolean;
      selfHarm: boolean;
      substanceUse: boolean;
      notes?: string;
    };
    planForNext?: string;
    additionalNotes?: string;
    createdAt: string;
    updatedAt: string;
  };
  sessionNotes?: Array<{
    id: string;
    appointmentId: string;
    sessionDate: string;
    sessionType: string;
    presentingIssues: string[];
    interventions: string[];
    createdAt: string;
  }>;
  total?: number;
  message: string;
  error?: string;
}

export interface TreatmentPlanResponse {
  success: boolean;
  treatmentPlan?: {
    id: string;
    clientId: string;
    title: string;
    diagnosis: string[];
    goals: Array<{
      id: string;
      description: string;
      targetDate: string;
      status: string;
      progress?: number;
    }>;
    objectives: Array<{
      id: string;
      goalId: string;
      description: string;
      measurable: string;
      targetDate: string;
      completed?: boolean;
    }>;
    interventions: Array<{
      id: string;
      type: string;
      description: string;
      frequency: string;
    }>;
    frequency: string;
    duration: string;
    startDate: string;
    reviewDate: string;
    endDate?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  treatmentPlans?: Array<{
    id: string;
    title: string;
    status: string;
    startDate: string;
    reviewDate: string;
    goalsCount: number;
    completedGoalsCount: number;
  }>;
  total?: number;
  message: string;
  error?: string;
}

export interface ProgressReportResponse {
  success: boolean;
  progressReport?: {
    id: string;
    clientId: string;
    reportDate: string;
    reportPeriod: string;
    summary: string;
    goalsProgress: Array<{
      goalId: string;
      goalDescription: string;
      progress: number;
      notes: string;
    }>;
    challenges: string[];
    achievements: string[];
    recommendations: string[];
    nextSteps: string[];
    createdAt: string;
  };
  progressReports?: Array<{
    id: string;
    reportDate: string;
    reportPeriod: string;
    summary: string;
    overallProgress: number;
    createdAt: string;
  }>;
  total?: number;
  message: string;
  error?: string;
}

export interface TherapistAvailabilityResponse {
  success: boolean;
  availability?: Array<{
    date: string;
    timeSlots: Array<{
      startTime: string;
      endTime: string;
      available: boolean;
      appointmentId?: string;
    }>;
  }>;
  message: string;
  error?: string;
}

export interface AppointmentWithDetails {
  id: string;
  userId: string;
  therapistId: string;
  scheduledAt: Date;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  location?: string;
  meetingUrl?: string;
  notes?: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  therapist: {
    id: string;
    name: string | null;
    email: string;
    therapistProfile?: {
      specializations: string[];
      licenseNumber: string;
    };
  };
  sessionNote?: SessionNoteInput;
  payments?: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
