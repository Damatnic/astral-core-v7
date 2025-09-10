import { Session } from 'next-auth';

/**
 * Enhanced API testing utilities for Astral Core v7
 */

// Mock response helper that matches Next.js Response.json
export const createMockResponse = (data: any, status: number = 200) => {
  const response = {
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Map([['content-type', 'application/json']]),
    body: JSON.stringify(data)
  };
  
  return response;
};

// Mock Next.js Response.json static method
export const mockNextResponse = {
  json: jest.fn((data: any, options: { status?: number } = {}) => {
    return createMockResponse(data, options.status || 200);
  })
};

// Enhanced request creator with proper Next.js API route structure
export const createAPIRequest = (
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
) => {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options;
  
  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const mockRequest = {
    url: urlObj.toString(),
    method,
    headers: new Map(Object.entries({
      'Content-Type': 'application/json',
      ...headers
    })),
    json: jest.fn().mockResolvedValue(body || {}),
    text: jest.fn().mockResolvedValue(body ? JSON.stringify(body) : ''),
    formData: jest.fn().mockResolvedValue(new FormData()),
    nextUrl: {
      searchParams: urlObj.searchParams,
      pathname: urlObj.pathname,
      origin: urlObj.origin
    },
    body: body ? JSON.stringify(body) : null
  };

  return mockRequest;
};

// Session mock utilities
export const createAuthenticatedSession = (overrides: Partial<Session['user']> = {}): Session => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'CLIENT',
    ...overrides
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
});

export const createTherapistSession = (): Session => createAuthenticatedSession({
  id: 'therapist-id',
  email: 'therapist@example.com',
  name: 'Test Therapist',
  role: 'THERAPIST'
});

export const createAdminSession = (): Session => createAuthenticatedSession({
  id: 'admin-id',
  email: 'admin@example.com',
  name: 'Test Admin',
  role: 'ADMIN'
});

// Database mock helpers
export const createDatabaseMock = () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn()
  },
  profile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn()
  },
  appointment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  journalEntry: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  wellnessData: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn()
  },
  crisisAssessment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn()
  },
  treatmentPlan: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  subscription: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  paymentMethod: {
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
  },
  notification: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn()
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  $transaction: jest.fn()
});

// Error response helpers
export const createErrorResponse = (message: string, status: number = 400) => ({
  error: message,
  status,
  timestamp: new Date().toISOString()
});

// Success response helpers
export const createSuccessResponse = (data: any, message?: string) => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString()
});

// API endpoint test wrapper
export const testAPIEndpoint = async (
  handler: Function,
  request: any,
  expectedStatus: number = 200
) => {
  try {
    const response = await handler(request);
    
    if (response.status) {
      expect(response.status).toBe(expectedStatus);
    }
    
    return response;
  } catch (error) {
    if (expectedStatus >= 400) {
      // Expected error
      return error;
    } else {
      throw error;
    }
  }
};

// Rate limiting mock
export const createRateLimitMock = (allowed: boolean = true) => ({
  getIdentifier: jest.fn().mockReturnValue('test-ip'),
  check: jest.fn().mockResolvedValue({ 
    allowed,
    remaining: allowed ? 10 : 0,
    resetTime: Date.now() + 3600000
  })
});

// Validation mock helpers
export const createValidationMock = () => ({
  validateInput: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  sanitizeInput: jest.fn().mockImplementation((input) => input),
  validateFileUpload: jest.fn().mockReturnValue({ isValid: true }),
  validateCrisisData: jest.fn().mockReturnValue({ isValid: true })
});

// Encryption service mock
export const createEncryptionMock = () => ({
  encrypt: jest.fn().mockImplementation((data) => `encrypted_${data}`),
  decrypt: jest.fn().mockImplementation((data) => data.replace('encrypted_', '')),
  hashPassword: jest.fn().mockImplementation((password) => `hashed_${password}`),
  verifyPassword: jest.fn().mockImplementation((password, hash) => hash === `hashed_${password}`),
  generateToken: jest.fn().mockReturnValue('test-token-123'),
  encryptObject: jest.fn(),
  decryptObject: jest.fn()
});

// PHI Service mock
export const createPHIMock = () => ({
  create: jest.fn().mockResolvedValue({ id: 'test-id', data: 'encrypted-data' }),
  read: jest.fn().mockResolvedValue({ id: 'test-id', data: 'decrypted-data' }),
  update: jest.fn().mockResolvedValue({ id: 'test-id', data: 'updated-data' }),
  delete: jest.fn().mockResolvedValue({ success: true }),
  findUnique: jest.fn().mockResolvedValue({ id: 'test-id', data: 'test-data' }),
  findMany: jest.fn().mockResolvedValue([{ id: 'test-id', data: 'test-data' }])
});

// WebSocket mock helpers
export const createWebSocketMock = () => ({
  emit: jest.fn(),
  broadcast: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn().mockReturnThis(),
  connected: true,
  id: 'test-socket-id'
});