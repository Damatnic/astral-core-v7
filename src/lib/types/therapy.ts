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
    'ASSESSMENT',
  ]),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export const sessionNoteSchema = z.object({
  appointmentId: z.string(),
  sessionDate: z.string().or(z.date()),
  sessionType: z.string(),
  presentingIssues: z.array(z.string()),
  interventions: z.array(z.string()),
  clientResponse: z.string().optional(),
  homework: z.string().optional(),
  riskAssessment: z.object({
    suicidalIdeation: z.boolean(),
    homicidalIdeation: z.boolean(),
    selfHarm: z.boolean(),
    substanceUse: z.boolean(),
    notes: z.string().optional(),
  }).optional(),
  planForNext: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export const treatmentPlanSchema = z.object({
  clientId: z.string(),
  title: z.string(),
  diagnosis: z.array(z.string()),
  goals: z.array(z.object({
    description: z.string(),
    targetDate: z.string(),
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'DISCONTINUED']),
  })),
  objectives: z.array(z.object({
    goalId: z.string(),
    description: z.string(),
    measurable: z.string(),
    targetDate: z.string(),
  })),
  interventions: z.array(z.object({
    type: z.string(),
    description: z.string(),
    frequency: z.string(),
  })),
  frequency: z.string(),
  duration: z.string(),
  startDate: z.string().or(z.date()),
  reviewDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional(),
});

export const progressReportSchema = z.object({
  clientId: z.string(),
  reportDate: z.string().or(z.date()),
  reportPeriod: z.string(),
  summary: z.string(),
  goalsProgress: z.array(z.object({
    goalId: z.string(),
    progress: z.number().min(0).max(100),
    notes: z.string(),
  })),
  challenges: z.array(z.string()),
  achievements: z.array(z.string()),
  recommendations: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type SessionNoteInput = z.infer<typeof sessionNoteSchema>;
export type TreatmentPlanInput = z.infer<typeof treatmentPlanSchema>;
export type ProgressReportInput = z.infer<typeof progressReportSchema>;

export interface AppointmentWithDetails {
  id: string;
  userId: string;
  therapistId: string;
  scheduledAt: Date;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  user: {
    name: string | null;
    email: string;
  };
  therapist: {
    name: string | null;
    email: string;
  };
  sessionNote?: SessionNoteInput;
}