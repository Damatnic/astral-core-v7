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
