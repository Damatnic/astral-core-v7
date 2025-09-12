/**
 * API Input Validation Schemas
 * Comprehensive validation schemas for all API endpoints
 * Uses Zod for runtime type checking and validation
 */

import { z } from 'zod';

// Common validation patterns
const patterns = {
  email: z.string().email().toLowerCase().trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  uuid: z.string().uuid(),
  url: z.string().url(),
  safeString: z.string().regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Contains invalid characters'),
  alphanumeric: z.string().regex(/^[a-zA-Z0-9]+$/, 'Must be alphanumeric'),
  dateString: z.string().datetime(),
  positiveInt: z.number().int().positive(),
  percentage: z.number().min(0).max(100),
};

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Authentication schemas
export const loginSchema = z.object({
  email: patterns.email,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  email: patterns.email,
  password: patterns.password,
  confirmPassword: z.string(),
  name: z.string().min(2).max(100).trim(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: patterns.email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: patterns.password,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: patterns.password,
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// MFA schemas
export const mfaSetupSchema = z.object({
  method: z.enum(['totp', 'sms', 'email']),
});

export const mfaVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  trustDevice: z.boolean().optional().default(false),
});

export const mfaDisableSchema = z.object({
  password: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

// User profile schemas
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  bio: z.string().max(500).optional(),
  phone: patterns.phone.optional(),
  dateOfBirth: patterns.dateString.optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  language: z.string().length(2).optional(),
  timezone: z.string().optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
  }).optional(),
});

export const updateAvatarSchema = z.object({
  avatar: z.string().url().optional().nullable(),
});

// Wellness data schemas
export const moodEntrySchema = z.object({
  mood: z.number().min(1).max(10),
  emotions: z.array(z.string()).max(5).optional(),
  notes: z.string().max(1000).optional(),
  activities: z.array(z.string()).max(10).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  exerciseMinutes: z.number().min(0).max(1440).optional(),
  medicationTaken: z.boolean().optional(),
  timestamp: patterns.dateString.optional(),
});

export const wellnessGoalSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  category: z.enum(['mental', 'physical', 'social', 'spiritual', 'professional']),
  targetDate: patterns.dateString,
  measurable: z.boolean().default(false),
  targetValue: z.number().optional(),
  unit: z.string().max(50).optional(),
});

// Journal entry schemas
export const journalEntrySchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(10000),
  mood: z.number().min(1).max(10).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  isPrivate: z.boolean().default(true),
  promptId: patterns.uuid.optional(),
});

export const updateJournalEntrySchema = journalEntrySchema.partial().extend({
  id: patterns.uuid,
});

// Crisis assessment schemas
export const crisisAssessmentSchema = z.object({
  severity: z.number().min(1).max(10),
  symptoms: z.array(z.string()).min(1).max(20),
  duration: z.enum(['hours', 'days', 'weeks', 'months']),
  triggers: z.array(z.string()).max(10).optional(),
  hasSupport: z.boolean(),
  needsImmediate: z.boolean(),
  consentToContact: z.boolean().optional(),
});

// Treatment plan schemas
export const treatmentPlanSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000),
  goals: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    targetDate: patterns.dateString.optional(),
    measurable: z.boolean().default(false),
    targetValue: z.number().optional(),
  })).min(1).max(10),
  interventions: z.array(z.object({
    type: z.enum(['therapy', 'medication', 'lifestyle', 'social', 'other']),
    description: z.string().max(1000),
    frequency: z.string().max(100).optional(),
  })).max(20).optional(),
  startDate: patterns.dateString,
  endDate: patterns.dateString.optional(),
  assignedTo: patterns.uuid.optional(),
});

export const treatmentProgressSchema = z.object({
  planId: patterns.uuid,
  goalId: patterns.uuid,
  progress: patterns.percentage,
  notes: z.string().max(1000).optional(),
  date: patterns.dateString.optional(),
});

// Therapist session notes schemas
export const sessionNoteSchema = z.object({
  clientId: patterns.uuid,
  sessionDate: patterns.dateString,
  duration: z.number().min(15).max(240), // minutes
  sessionType: z.enum(['individual', 'group', 'family', 'couples']),
  presentingIssues: z.array(z.string()).max(10),
  interventions: z.array(z.string()).max(10),
  observations: z.string().max(5000),
  homework: z.string().max(2000).optional(),
  riskAssessment: z.object({
    selfHarm: z.enum(['none', 'low', 'moderate', 'high']),
    harmToOthers: z.enum(['none', 'low', 'moderate', 'high']),
    notes: z.string().max(1000).optional(),
  }).optional(),
  nextSession: patterns.dateString.optional(),
  isConfidential: z.boolean().default(true),
});

// File upload schemas
export const fileUploadSchema = z.object({
  filename: z.string().max(255),
  mimetype: z.string().max(100),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
  category: z.enum(['document', 'image', 'audio', 'video', 'other']).optional(),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().default(true),
});

// Notification schemas
export const notificationPreferencesSchema = z.object({
  email: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['immediate', 'daily', 'weekly', 'never']),
    types: z.array(z.enum(['appointment', 'message', 'reminder', 'alert', 'newsletter'])),
  }),
  sms: z.object({
    enabled: z.boolean(),
    types: z.array(z.enum(['appointment', 'urgent', 'reminder'])),
  }),
  push: z.object({
    enabled: z.boolean(),
    types: z.array(z.enum(['all', 'important', 'none'])),
  }),
});

export const sendNotificationSchema = z.object({
  userId: patterns.uuid,
  type: z.enum(['info', 'warning', 'error', 'success']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  actionUrl: patterns.url.optional(),
  actionLabel: z.string().max(50).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

// Search schemas
export const searchSchema = z.object({
  query: z.string().min(1).max(200).trim(),
  type: z.enum(['all', 'users', 'content', 'resources']).optional(),
  filters: z.object({
    dateFrom: patterns.dateString.optional(),
    dateTo: patterns.dateString.optional(),
    tags: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
  }).optional(),
}).merge(paginationSchema);

// Admin schemas
export const createUserSchema = z.object({
  email: patterns.email,
  password: patterns.password,
  name: z.string().min(2).max(100).trim(),
  role: z.enum(['CLIENT', 'THERAPIST', 'ADMIN', 'SUPERVISOR']),
  isActive: z.boolean().default(true),
  mustChangePassword: z.boolean().default(true),
});

export const updateUserRoleSchema = z.object({
  userId: patterns.uuid,
  role: z.enum(['CLIENT', 'THERAPIST', 'ADMIN', 'SUPERVISOR']),
  reason: z.string().min(10).max(500),
});

export const suspendUserSchema = z.object({
  userId: patterns.uuid,
  reason: z.string().min(10).max(500),
  duration: z.number().min(1).max(365).optional(), // days
  permanent: z.boolean().default(false),
});

// Export validation helper
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

// Sanitization helpers
export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - in production, use a library like DOMPurify
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeFilename(filename: string): string {
  // Remove or replace dangerous characters in filenames
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .substring(0, 255);
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL');
  }
}

// SQL injection prevention helper
export function sanitizeSqlInput(input: string): string {
  // Basic SQL injection prevention - use parameterized queries in practice
  return input
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
}

// XSS prevention helper
export function preventXss(input: unknown): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  return input
    .replace(/[&<>"']/g, (char) => {
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return escapeMap[char] || char;
    });
}