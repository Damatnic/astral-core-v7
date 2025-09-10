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
