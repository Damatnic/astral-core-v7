
import { Session } from 'next-auth';

// Mock user data generator
export const createMockUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'CLIENT',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

// Mock therapist data generator
export const createMockTherapist = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'therapist-123',
  email: 'therapist@example.com',
  name: 'Test Therapist',
  role: 'THERAPIST',
  isActive: true,
  licenseNumber: 'LIC123456',
  specializations: ['ANXIETY', 'DEPRESSION'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

// Mock session generator
export const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'CLIENT'
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides
});

// Mock NextRequest generator
export const createMockRequest = (
  url: string = 'http://localhost:3000/api/test',
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
) => {
  const { method = 'GET', body, headers = {} } = options;

  // Create a mock request object that matches NextRequest interface
  const mockRequest = {
    url,
    method,
    headers: new Map(Object.entries({
      'Content-Type': 'application/json',
      ...headers
    })),
    json: jest.fn().mockResolvedValue(body || {}),
    text: jest.fn().mockResolvedValue(body ? JSON.stringify(body) : ''),
    formData: jest.fn().mockResolvedValue(new FormData()),
    nextUrl: {
      searchParams: new URLSearchParams()
    }
  };

  return mockRequest as unknown;
};

// Mock appointment data generator
export const createMockAppointment = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'appointment-123',
  clientId: 'user-123',
  therapistId: 'therapist-123',
  startTime: new Date('2024-12-01T10:00:00Z'),
  endTime: new Date('2024-12-01T11:00:00Z'),
  status: 'SCHEDULED',
  type: 'INDIVIDUAL_THERAPY',
  notes: 'Test appointment',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

// Mock journal entry generator
export const createMockJournalEntry = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'journal-123',
  userId: 'user-123',
  title: 'Test Entry',
  content: 'This is a test journal entry.',
  mood: 5,
  tags: ['test', 'mood'],
  isPrivate: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

// Mock wellness data generator
export const createMockWellnessData = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'wellness-123',
  userId: 'user-123',
  date: new Date('2024-01-01'),
  moodScore: 7,
  anxietyLevel: 3,
  sleepHours: 8,
  exerciseMinutes: 30,
  socialInteractions: 5,
  stressLevel: 4,
  notes: 'Feeling good today',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

// Mock treatment plan generator
export const createMockTreatmentPlan = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'treatment-plan-123',
  clientId: 'user-123',
  therapistId: 'therapist-123',
  title: 'Test Treatment Plan',
  description: 'A comprehensive treatment plan for anxiety management',
  goals: ['Reduce anxiety symptoms', 'Improve sleep quality'],
  interventions: ['CBT techniques', 'Mindfulness exercises'],
  status: 'ACTIVE',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-03-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

// Mock Stripe customer
export const createMockStripeCustomer = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'cus_test123',
  email: 'test@example.com',
  name: 'Test User',
  created: 1640995200,
  subscriptions: {
    data: []
  },
  ...overrides
});

// Mock Stripe subscription
export const createMockStripeSubscription = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'sub_test123',
  customer: 'cus_test123',
  status: 'active',
  current_period_start: 1640995200,
  current_period_end: 1643673600,
  items: {
    data: [
      {
        price: {
          id: 'price_test123',
          unit_amount: 2999,
          currency: 'usd',
          recurring: {
            interval: 'month'
          }
        }
      }
    ]
  },
  ...overrides
});

// API Response helpers
export const mockApiResponse = {
  success: (data: unknown) => ({ success: true, data }),
  error: (message: string, code: number = 400) => ({
    success: false,
    error: message,
    code
  })
};

// Crisis assessment mock data
export const createMockCrisisAssessment = (overrides: Partial<Record<string, unknown>> = {}) => ({
  userId: 'user-123',
  responses: {
    suicidalIdeation: 2,
    hopelessness: 3,
    socialSupport: 7,
    copingSkills: 6,
    substanceUse: 1,
    previousAttempts: false,
    currentPlan: false,
    accessToMeans: false
  },
  riskLevel: 'MODERATE',
  score: 45,
  recommendations: [
    'Schedule follow-up within 24 hours',
    'Provide crisis hotline information',
    'Consider safety planning'
  ],
  timestamp: new Date('2024-01-01'),
  ...overrides
});

// Mock file upload
export const createMockFile = (overrides: Partial<File> = {}): File => {
  const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
  return Object.assign(file, overrides);
};

// Database cleanup helper for tests
export const cleanupDatabase = async () => {
  // This would be used in integration tests to clean up test data
  // Implementation depends on your test database setup
  console.log('Database cleanup - implement based on your test setup');
};

// Wait helper for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock crypto functions
export const mockCrypto = {
  encrypt: jest.fn((data: string) => `encrypted_${data}`),
  decrypt: jest.fn((encryptedData: string) => encryptedData.replace('encrypted_', '')),
  hash: jest.fn((data: string) => `hashed_${data}`),
  compare: jest.fn((data: string, hash: string) => hash === `hashed_${data}`)
};
