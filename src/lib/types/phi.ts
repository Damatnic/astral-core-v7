/**
 * PHI (Protected Health Information) Type Definitions
 * Strong typing for HIPAA-compliant PHI operations
 */

import type { PrismaClient } from '@prisma/client';

// Generic PHI-enabled record type
export interface PHIRecord extends Record<string, unknown> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// PHI find operations type helpers
export type PrismaModelDelegate = {
  [K in keyof PrismaClient]: PrismaClient[K] extends {
    findMany: (...args: any[]) => any;
    findUnique: (...args: any[]) => any;
    create: (...args: any[]) => any;
    update: (...args: any[]) => any;
    delete: (...args: any[]) => any;
  }
    ? PrismaClient[K]
    : never;
}[keyof PrismaClient];

// Generic query arguments for Prisma operations
export interface PrismaFindManyArgs {
  where?: Record<string, unknown>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  skip?: number;
}

export interface PrismaWhereInput {
  id?: string;
  userId?: string;
  [key: string]: unknown;
}

// User data export structure with typed PHI fields
export interface UserDataExport {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  profile?: PHIRecord | null;
  therapistProfile?: PHIRecord | null;
  clientProfiles?: PHIRecord[];
  wellnessData?: PHIRecord[];
  journals?: PHIRecord[];
  appointments?: PHIRecord[];
  crisisInterventions?: PHIRecord[];
  messages?: PHIRecord[];
  notifications?: PHIRecord[];
  files?: PHIRecord[];
}

// Resource access types
export type ResourceAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'READ_MANY';
export type ResourceType =
  | 'Profile'
  | 'ClientProfile'
  | 'SessionNote'
  | 'WellnessData'
  | 'JournalEntry'
  | 'CrisisIntervention'
  | 'Message'
  | 'User';

// PHI field definitions with proper typing
export type PHIFieldDefinitions = Record<ResourceType, string[]>;
