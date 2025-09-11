import { z } from 'zod';

export const wellnessDataSchema = z.object({
  date: z.string().or(z.date()).optional(),
  moodScore: z.number().min(1).max(10),
  anxietyLevel: z.number().min(1).max(10),
  stressLevel: z.number().min(1).max(10),
  sleepHours: z.number().min(0).max(24).optional(),
  sleepQuality: z.number().min(1).max(10).optional(),
  exercise: z.boolean(),
  exerciseMinutes: z.number().min(0).optional(),
  meditation: z.boolean(),
  meditationMinutes: z.number().min(0).optional(),
  socialContact: z.boolean(),
  medications: z.array(z.string()),
  symptoms: z.array(z.string()),
  triggers: z.array(z.string()),
  copingStrategies: z.array(z.string()),
  notes: z.string().optional()
});

export const journalEntrySchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  mood: z.string().optional(),
  tags: z.array(z.string()),
  isPrivate: z.boolean().default(true)
});

export const moodPatternSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  metric: z.enum(['mood', 'anxiety', 'stress', 'sleep'])
});

export type WellnessDataInput = z.infer<typeof wellnessDataSchema>;
export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
export type MoodPatternInput = z.infer<typeof moodPatternSchema>;

export interface WellnessStats {
  averageMood: number;
  averageAnxiety: number;
  averageStress: number;
  averageSleepHours: number;
  totalExerciseMinutes: number;
  totalMeditationMinutes: number;
  daysTracked: number;
  trends: {
    mood: 'improving' | 'stable' | 'declining';
    anxiety: 'improving' | 'stable' | 'declining';
    stress: 'improving' | 'stable' | 'declining';
  };
}

export interface MoodPattern {
  date: string;
  value: number;
  notes?: string;
}

// Query schemas
export const wellnessQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metric: z.enum(['mood', 'anxiety', 'stress', 'sleep']).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 30, 100)).optional()
});

export const journalQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  mood: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPrivate: z.boolean().optional(),
  search: z.string().max(200).optional()
});

// Type inference
export type WellnessQuery = z.infer<typeof wellnessQuerySchema>;
export type JournalQuery = z.infer<typeof journalQuerySchema>;

// =====================
// RESPONSE TYPES
// =====================

export interface WellnessDataResponse {
  success: boolean;
  data?: {
    items: Array<{
      id: string;
      date: string;
      moodScore: number;
      anxietyLevel: number;
      stressLevel: number;
      sleepHours?: number;
      sleepQuality?: number;
      exercise: boolean;
      exerciseMinutes?: number;
      meditation: boolean;
      meditationMinutes?: number;
      socialContact: boolean;
      medications: string[];
      symptoms: string[];
      triggers: string[];
      copingStrategies: string[];
      notes?: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  message: string;
  error?: string;
}

export interface WellnessStatsResponse {
  success: boolean;
  stats?: WellnessStats;
  trends?: {
    mood: Array<{ date: string; value: number }>;
    anxiety: Array<{ date: string; value: number }>;
    stress: Array<{ date: string; value: number }>;
    sleep: Array<{ date: string; value: number }>;
  };
  insights?: Array<{
    type: 'improvement' | 'concern' | 'pattern';
    title: string;
    description: string;
    metric: string;
    confidence: number;
  }>;
  message: string;
  error?: string;
}

export interface JournalEntryResponse {
  success: boolean;
  entry?: {
    id: string;
    title?: string;
    content: string;
    mood?: string;
    tags: string[];
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
  };
  entries?: Array<{
    id: string;
    title?: string;
    content: string;
    mood?: string;
    tags: string[];
    isPrivate: boolean;
    createdAt: string;
    wordCount: number;
  }>;
  total?: number;
  message: string;
  error?: string;
}

export interface MoodPatternsResponse {
  success: boolean;
  patterns?: Array<MoodPattern>;
  analysis?: {
    averageValue: number;
    trend: 'improving' | 'stable' | 'declining';
    volatility: number;
    correlations: Array<{
      factor: string;
      correlation: number;
      significance: 'high' | 'medium' | 'low';
    }>;
  };
  recommendations?: Array<{
    type: 'lifestyle' | 'behavioral' | 'medical';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  message: string;
  error?: string;
}

export interface WellnessGoalsResponse {
  success: boolean;
  goal?: {
    id: string;
    type: 'mood' | 'anxiety' | 'stress' | 'sleep' | 'exercise' | 'meditation';
    title: string;
    description: string;
    targetValue: number;
    currentValue: number;
    progress: number;
    deadline: string;
    isActive: boolean;
    createdAt: string;
  };
  goals?: Array<{
    id: string;
    type: string;
    title: string;
    progress: number;
    deadline: string;
    isActive: boolean;
  }>;
  message: string;
  error?: string;
}
