/**
 * Test Fixtures - Reusable mock data for comprehensive testing
 * Provides consistent test data across all test suites
 */

import type {
  User,
  Profile,
  ClientProfile,
  TherapistProfile,
  Appointment,
  SessionNote,
  WellnessData,
  JournalEntry,
  CrisisIntervention,
  Customer,
  Subscription,
  Payment,
  PaymentMethod
} from '@prisma/client';

// Base user fixtures for different roles
export const mockUsers = {
  admin: {
    id: 'admin_123',
    email: 'admin@astralcore.test',
    name: 'Admin User',
    role: 'ADMIN',
    status: 'ACTIVE',
    emailVerified: new Date('2024-01-01'),
    password: '$2a$12$hashedPassword', // bcrypt hash of 'password123'
    loginAttempts: 0,
    lockedUntil: null,
    lastLogin: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  } as User,

  therapist: {
    id: 'therapist_123',
    email: 'therapist@astralcore.test',
    name: 'Dr. Jane Smith',
    role: 'THERAPIST',
    status: 'ACTIVE',
    emailVerified: new Date('2024-01-01'),
    password: '$2a$12$hashedPassword',
    loginAttempts: 0,
    lockedUntil: null,
    lastLogin: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  } as User,

  client: {
    id: 'client_123',
    email: 'client@astralcore.test',
    name: 'John Doe',
    role: 'CLIENT',
    status: 'ACTIVE',
    emailVerified: new Date('2024-01-01'),
    password: '$2a$12$hashedPassword',
    loginAttempts: 0,
    lockedUntil: null,
    lastLogin: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  } as User,

  crisisResponder: {
    id: 'crisis_123',
    email: 'crisis@astralcore.test',
    name: 'Crisis Responder',
    role: 'CRISIS_RESPONDER',
    status: 'ACTIVE',
    emailVerified: new Date('2024-01-01'),
    password: '$2a$12$hashedPassword',
    loginAttempts: 0,
    lockedUntil: null,
    lastLogin: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  } as User
};

// Profile fixtures
export const mockProfiles = {
  client: {
    id: 'profile_123',
    userId: 'client_123',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-05-15'),
    phoneNumber: '+1-555-0123',
    address: '123 Main St, Anytown, USA',
    emergencyContact: 'Jane Doe - +1-555-0124',
    insuranceProvider: 'Health Insurance Co',
    insurancePolicyNumber: 'POL123456789',
    timezone: 'America/New_York',
    preferredLanguage: 'en',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  } as Profile,

  therapist: {
    id: 'therapist_profile_123',
    userId: 'therapist_123',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: new Date('1985-03-20'),
    phoneNumber: '+1-555-0125',
    address: '456 Professional Dr, Medical City, USA',
    emergencyContact: 'Emergency Contact',
    timezone: 'America/New_York',
    preferredLanguage: 'en',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  } as Profile
};

// Client profile fixtures
export const mockClientProfile = {
  id: 'client_profile_123',
  userId: 'client_123',
  therapistId: 'therapist_123',
  primaryConcerns: 'Anxiety and stress management',
  goals: 'Develop coping strategies for anxiety',
  medicalHistory: 'No significant medical history',
  currentMedications: 'None',
  allergies: 'No known allergies',
  riskLevel: 'LOW',
  treatmentPlan: 'Cognitive Behavioral Therapy',
  notes: 'Client is motivated and engaged',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
} as ClientProfile;

// Therapist profile fixtures
export const mockTherapistProfile = {
  id: 'therapist_prof_123',
  userId: 'therapist_123',
  licenseNumber: 'LIC123456',
  licenseState: 'NY',
  specializations: ['Anxiety Disorders', 'Cognitive Behavioral Therapy'],
  education: ['PhD Psychology - University ABC', 'MA Clinical Psychology - College XYZ'],
  experience: 10,
  bio: 'Experienced therapist specializing in anxiety and stress management',
  availableHours: {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    thursday: { start: '09:00', end: '17:00' },
    friday: { start: '09:00', end: '15:00' }
  },
  hourlyRate: 150.00,
  acceptingNewClients: true,
  verified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
} as TherapistProfile;

// Appointment fixtures
export const mockAppointment = {
  id: 'appointment_123',
  userId: 'client_123',
  therapistId: 'therapist_123',
  type: 'INDIVIDUAL_THERAPY',
  status: 'SCHEDULED',
  scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  duration: 60,
  notes: 'Initial consultation',
  location: 'Video call',
  reminderSent: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
} as Appointment;

// Session note fixtures
export const mockSessionNote = {
  id: 'session_note_123',
  appointmentId: 'appointment_123',
  therapistId: 'therapist_123',
  clientId: 'client_123',
  sessionDate: new Date(),
  sessionType: 'INDIVIDUAL_THERAPY',
  duration: 60,
  presentingIssues: 'Client reported increased anxiety levels',
  interventions: 'Applied CBT techniques for anxiety management',
  clientResponse: 'Client was receptive to interventions',
  homework: 'Practice breathing exercises daily',
  nextSessionGoals: 'Continue anxiety management strategies',
  riskAssessment: 'LOW',
  additionalNotes: 'Good progress shown',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
} as SessionNote;

// Wellness data fixtures
export const mockWellnessData = {
  id: 'wellness_123',
  userId: 'client_123',
  date: new Date(),
  moodRating: 7,
  anxietyLevel: 4,
  stressLevel: 5,
  sleepHours: 8,
  sleepQuality: 7,
  exerciseMinutes: 30,
  socialInteractions: 3,
  medicationTaken: true,
  notes: 'Feeling better today',
  symptoms: ['mild anxiety'],
  triggers: ['work stress'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
} as WellnessData;

// Journal entry fixtures
export const mockJournalEntry = {
  id: 'journal_123',
  userId: 'client_123',
  title: 'Daily Reflection',
  content: 'Today was a good day. I practiced my breathing exercises.',
  mood: 'POSITIVE',
  tags: ['reflection', 'progress'],
  private: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
} as JournalEntry;

// Crisis intervention fixtures
export const mockCrisisIntervention = {
  id: 'crisis_123',
  userId: 'client_123',
  severity: 'MODERATE',
  interventionType: 'CHAT',
  status: 'ACTIVE',
  triggerEvent: 'Work stress reached critical level',
  symptoms: ['panic', 'racing thoughts'],
  riskAssessment: 'MODERATE',
  interventionsUsed: ['grounding techniques', 'breathing exercises'],
  responderId: 'crisis_123',
  responderNotes: 'Client responded well to interventions',
  outcome: 'Stabilized',
  startTime: new Date(),
  endTime: null,
  followUpRequired: true,
  followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
} as CrisisIntervention;

// Payment-related fixtures
export const mockCustomer = {
  id: 'customer_123',
  userId: 'client_123',
  stripeCustomerId: 'cus_test123',
  email: 'encrypted_email_data',
  name: 'John Doe',
  address: JSON.stringify({
    line1: '123 Main St',
    city: 'Anytown',
    state: 'NY',
    postal_code: '12345',
    country: 'US'
  }),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
} as Customer;

export const mockSubscription = {
  id: 'subscription_123',
  customerId: 'customer_123',
  stripeSubscriptionId: 'sub_test123',
  stripePriceId: 'price_test123',
  stripeProductId: 'prod_test123',
  status: 'ACTIVE',
  planType: 'BASIC',
  planName: 'Basic Therapy Plan',
  amount: 99.99,
  currency: 'usd',
  interval: 'month',
  intervalCount: 1,
  currentPeriodStart: new Date('2024-01-01'),
  currentPeriodEnd: new Date('2024-02-01'),
  trialStart: null,
  trialEnd: null,
  cancelAt: null,
  metadata: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
} as Subscription;

export const mockPayment = {
  id: 'payment_123',
  customerId: 'customer_123',
  appointmentId: 'appointment_123',
  stripePaymentIntentId: 'pi_test123',
  amount: 150.00,
  currency: 'usd',
  status: 'SUCCEEDED',
  type: 'SESSION_PAYMENT',
  description: 'Therapy session payment',
  refunded: false,
  refundedAmount: 0,
  metadata: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
} as Payment;

export const mockPaymentMethod = {
  id: 'pm_123',
  customerId: 'customer_123',
  stripePaymentMethodId: 'pm_test123',
  type: 'CARD',
  card: JSON.stringify({
    brand: 'visa',
    last4: '4242',
    exp_month: 12,
    exp_year: 2026
  }),
  isDefault: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
} as PaymentMethod;

// Authentication-related fixtures
export const mockJWTPayload = {
  id: 'client_123',
  email: 'client@astralcore.test',
  role: 'CLIENT',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

export const mockSession = {
  user: {
    id: 'client_123',
    email: 'client@astralcore.test',
    name: 'John Doe',
    image: null,
    role: 'CLIENT'
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

// API response fixtures
export const mockApiResponses = {
  success: {
    success: true,
    data: null,
    message: 'Operation completed successfully'
  },
  error: {
    success: false,
    error: 'Test error',
    message: 'Operation failed'
  },
  validationError: {
    success: false,
    error: 'Validation failed',
    details: {
      email: 'Invalid email format',
      password: 'Password too short'
    }
  }
};

// Crisis assessment fixtures
export const mockCrisisAssessment = {
  input: {
    currentMood: 3,
    anxietyLevel: 8,
    suicidalThoughts: false,
    harmToOthers: false,
    substanceUse: false,
    triggerEvent: 'Work stress',
    copingStrategies: ['breathing', 'walking'],
    supportSystemAvailable: true,
    previousCrisisExperience: false
  },
  result: {
    riskLevel: 'moderate' as const,
    recommendations: [
      'Contact your therapist immediately',
      'Use grounding techniques',
      'Reach out to support system'
    ],
    resources: [
      {
        id: 'resource_1',
        title: 'Crisis Hotline',
        description: '24/7 crisis support',
        url: 'tel:988',
        type: 'hotline' as const
      }
    ]
  }
};

// Test data generators
export const generateUser = (overrides: Partial<User> = {}): User => ({
  ...mockUsers.client,
  id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  email: `test${Date.now()}@astralcore.test`,
  ...overrides
});

export const generateAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  ...mockAppointment,
  id: `appointment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  ...overrides
});

export const generateSessionNote = (overrides: Partial<SessionNote> = {}): SessionNote => ({
  ...mockSessionNote,
  id: `session_note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  ...overrides
});

export const generateWellnessData = (overrides: Partial<WellnessData> = {}): WellnessData => ({
  ...mockWellnessData,
  id: `wellness_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  date: new Date(),
  ...overrides
});

export const generateJournalEntry = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
  ...mockJournalEntry,
  id: `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  ...overrides
});

// Helper functions for test data
export const createTestUser = (role: User['role'] = 'CLIENT'): User => {
  return generateUser({ role });
};

export const createTestSession = (userId: string, role: User['role'] = 'CLIENT') => ({
  ...mockSession,
  user: {
    ...mockSession.user,
    id: userId,
    role
  }
});

// Database cleanup helpers
export const cleanupTestData = {
  users: ['admin_123', 'therapist_123', 'client_123', 'crisis_123'],
  profiles: ['profile_123', 'therapist_profile_123'],
  appointments: ['appointment_123'],
  sessionNotes: ['session_note_123'],
  wellnessData: ['wellness_123'],
  journalEntries: ['journal_123'],
  crisisInterventions: ['crisis_123'],
  customers: ['customer_123'],
  subscriptions: ['subscription_123'],
  payments: ['payment_123'],
  paymentMethods: ['pm_123']
};