import { z } from 'zod';
import type { UserRole, UserStatus } from '@prisma/client';

export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().or(z.date()),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  emergencyContact: z
    .object({
      name: z.string(),
      relationship: z.string(),
      phoneNumber: z.string(),
      email: z.string().email().optional()
    })
    .optional()
});

export const therapistProfileSchema = z.object({
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseState: z.string().min(1, 'License state is required'),
  licenseExpiry: z.string().or(z.date()),
  specializations: z.array(z.string()).min(1, 'At least one specialization is required'),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      year: z.number()
    })
  ),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string(),
      date: z.string(),
      expiry: z.string().optional()
    })
  ),
  yearsOfExperience: z.number().min(0),
  bio: z.string().optional(),
  acceptingClients: z.boolean(),
  maxClients: z.number().min(1),
  hourlyRate: z.number().optional(),
  insuranceAccepted: z.array(z.string())
});

export const clientProfileSchema = z.object({
  primaryConcerns: z.array(z.string()).min(1, 'At least one concern is required'),
  goals: z.array(z.string()).min(1, 'At least one goal is required'),
  therapistId: z.string().optional(),
  insuranceInfo: z
    .object({
      provider: z.string(),
      policyNumber: z.string(),
      groupNumber: z.string().optional(),
      copay: z.number().optional()
    })
    .optional()
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type TherapistProfileInput = z.infer<typeof therapistProfileSchema>;
export type ClientProfileInput = z.infer<typeof clientProfileSchema>;

// Query schemas
export const userQuerySchema = z.object({
  role: z.enum(['ADMIN', 'THERAPIST', 'CLIENT', 'CRISIS_RESPONDER', 'SUPERVISOR']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
  search: z.string().max(200).optional(),
  specialization: z.string().optional(),
  acceptingClients: z.boolean().optional()
});

export const profileUpdateSchema = profileSchema.partial();
export const therapistProfileUpdateSchema = therapistProfileSchema.partial();
export const clientProfileUpdateSchema = clientProfileSchema.partial();

// Type inference
export type UserQuery = z.infer<typeof userQuerySchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type TherapistProfileUpdateInput = z.infer<typeof therapistProfileUpdateSchema>;
export type ClientProfileUpdateInput = z.infer<typeof clientProfileUpdateSchema>;

// =====================
// RESPONSE TYPES
// =====================

export interface UserResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    status: UserStatus;
    emailVerified: boolean;
    mfaEnabled: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  users?: Array<{
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    status: UserStatus;
    lastLoginAt: string | null;
    createdAt: string;
  }>;
  total?: number;
  message: string;
  error?: string;
}

export interface ProfileResponse {
  success: boolean;
  profile?: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    emergencyContact?: {
      name: string;
      relationship: string;
      phoneNumber: string;
      email?: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  message: string;
  error?: string;
}

export interface TherapistProfileResponse {
  success: boolean;
  therapistProfile?: {
    id: string;
    licenseNumber: string;
    licenseState: string;
    licenseExpiry: string;
    specializations: string[];
    education: Array<{
      degree: string;
      institution: string;
      year: number;
    }>;
    certifications: Array<{
      name: string;
      issuer: string;
      date: string;
      expiry?: string;
    }>;
    yearsOfExperience: number;
    bio?: string;
    acceptingClients: boolean;
    maxClients: number;
    hourlyRate?: number;
    insuranceAccepted: string[];
    currentClientCount: number;
    averageRating?: number;
    totalSessions?: number;
    createdAt: string;
    updatedAt: string;
  };
  therapistProfiles?: Array<{
    id: string;
    userId: string;
    user: {
      name: string | null;
      email: string;
    };
    specializations: string[];
    yearsOfExperience: number;
    acceptingClients: boolean;
    currentClientCount: number;
    averageRating?: number;
  }>;
  total?: number;
  message: string;
  error?: string;
}

export interface ClientProfileResponse {
  success: boolean;
  clientProfile?: {
    id: string;
    primaryConcerns: string[];
    goals: string[];
    therapistId?: string;
    therapist?: {
      id: string;
      name: string | null;
      email: string;
      specializations: string[];
    };
    insuranceInfo?: {
      provider: string;
      policyNumber: string;
      groupNumber?: string;
      copay?: number;
    };
    riskLevel?: string;
    lastAssessment?: string;
    treatmentPlansCount: number;
    appointmentsCount: number;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
  error?: string;
}

export interface UserSettingsResponse {
  success: boolean;
  settings?: {
    notifications: {
      emailNotifications: boolean;
      smsNotifications: boolean;
      pushNotifications: boolean;
      appointmentReminders: boolean;
      weeklyReports: boolean;
      crisisAlerts: boolean;
      marketingEmails: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private' | 'therapists_only';
      dataSharing: boolean;
      analyticsOptOut: boolean;
    };
    preferences: {
      timezone: string;
      language: string;
      theme: 'light' | 'dark' | 'auto';
      reminderTime: string;
    };
  };
  message: string;
  error?: string;
}

export interface UserWithProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  profile?: ProfileInput;
  therapistProfile?: TherapistProfileInput;
  clientProfiles?: ClientProfileInput[];
}
