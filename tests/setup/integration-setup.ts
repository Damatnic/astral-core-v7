/**
 * Integration Test Setup
 * Configures database, authentication, and external services for integration testing
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { PrismaClient } from '@prisma/client';
import { setupTestEnvironment } from '../utils/test-helpers';
import { mockUsers, mockProfiles, cleanupTestData } from '../utils/test-fixtures';

// Global test database instance
let testPrisma: PrismaClient;

// Setup integration test environment
export const setupIntegrationTests = async () => {
  // Set up environment variables
  setupTestEnvironment();

  // Initialize test database
  testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Connect to database
  await testPrisma.$connect();

  // Clean database before tests
  await cleanupIntegrationTestData();

  // Seed with base test data
  await seedTestData();
};

// Cleanup integration test environment
export const teardownIntegrationTests = async () => {
  if (testPrisma) {
    await cleanupIntegrationTestData();
    await testPrisma.$disconnect();
  }
};

// Clean all test data from database
export const cleanupIntegrationTestData = async () => {
  if (!testPrisma) return;

  try {
    // Delete in reverse dependency order
    await testPrisma.sessionNote.deleteMany({
      where: { id: { in: cleanupTestData.sessionNotes } }
    });
    
    await testPrisma.appointment.deleteMany({
      where: { id: { in: cleanupTestData.appointments } }
    });
    
    await testPrisma.wellnessData.deleteMany({
      where: { id: { in: cleanupTestData.wellnessData } }
    });
    
    await testPrisma.journalEntry.deleteMany({
      where: { id: { in: cleanupTestData.journalEntries } }
    });
    
    await testPrisma.crisisIntervention.deleteMany({
      where: { id: { in: cleanupTestData.crisisInterventions } }
    });
    
    await testPrisma.payment.deleteMany({
      where: { id: { in: cleanupTestData.payments } }
    });
    
    await testPrisma.paymentMethod.deleteMany({
      where: { id: { in: cleanupTestData.paymentMethods } }
    });
    
    await testPrisma.subscription.deleteMany({
      where: { id: { in: cleanupTestData.subscriptions } }
    });
    
    await testPrisma.customer.deleteMany({
      where: { id: { in: cleanupTestData.customers } }
    });
    
    await testPrisma.clientProfile.deleteMany({
      where: { userId: { in: cleanupTestData.users } }
    });
    
    await testPrisma.therapistProfile.deleteMany({
      where: { userId: { in: cleanupTestData.users } }
    });
    
    await testPrisma.profile.deleteMany({
      where: { id: { in: cleanupTestData.profiles } }
    });
    
    await testPrisma.user.deleteMany({
      where: { id: { in: cleanupTestData.users } }
    });
  } catch (error) {
    console.warn('Error during test cleanup:', error);
  }
};

// Seed database with test data
export const seedTestData = async () => {
  if (!testPrisma) return;

  try {
    // Create test users
    await testPrisma.user.createMany({
      data: [
        mockUsers.admin,
        mockUsers.therapist,
        mockUsers.client,
        mockUsers.crisisResponder
      ],
      skipDuplicates: true
    });

    // Create test profiles
    await testPrisma.profile.createMany({
      data: [
        mockProfiles.client,
        mockProfiles.therapist
      ],
      skipDuplicates: true
    });
  } catch (error) {
    console.warn('Error during test seeding:', error);
  }
};

// Get test database instance
export const getTestPrisma = (): PrismaClient => {
  if (!testPrisma) {
    throw new Error('Test database not initialized. Call setupIntegrationTests() first.');
  }
  return testPrisma;
};

// Reset test data for specific test
export const resetTestData = async () => {
  await cleanupIntegrationTestData();
  await seedTestData();
};

// Create test transaction
export const createTestTransaction = async <T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> => {
  return testPrisma.$transaction(async (tx) => {
    return await callback(tx as PrismaClient);
  });
};

// Integration test utilities
export const integrationTestUtils = {
  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Verify database state
  verifyUserExists: async (userId: string) => {
    const user = await testPrisma.user.findUnique({ where: { id: userId } });
    return !!user;
  },
  
  verifyAppointmentExists: async (appointmentId: string) => {
    const appointment = await testPrisma.appointment.findUnique({ 
      where: { id: appointmentId } 
    });
    return !!appointment;
  },
  
  verifyPaymentExists: async (paymentId: string) => {
    const payment = await testPrisma.payment.findUnique({ 
      where: { id: paymentId } 
    });
    return !!payment;
  },
  
  // Count records
  countUsers: () => testPrisma.user.count(),
  countAppointments: () => testPrisma.appointment.count(),
  countPayments: () => testPrisma.payment.count(),
  
  // Create test data on demand
  createTestUser: async (userData: any) => {
    return await testPrisma.user.create({ data: userData });
  },
  
  createTestAppointment: async (appointmentData: any) => {
    return await testPrisma.appointment.create({ data: appointmentData });
  }
};

// Mock external services for integration tests
export const mockExternalServices = {
  // Mock Stripe responses
  stripe: {
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_test123' })
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ 
        id: 'sub_test123', 
        status: 'active' 
      })
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ 
        id: 'pi_test123', 
        status: 'succeeded' 
      })
    }
  },
  
  // Mock email service
  email: {
    send: jest.fn().mockResolvedValue({ messageId: 'msg_test123' })
  },
  
  // Mock SMS service
  sms: {
    send: jest.fn().mockResolvedValue({ sid: 'sms_test123' })
  },
  
  // Mock file storage
  storage: {
    upload: jest.fn().mockResolvedValue({ url: 'https://test.com/file.jpg' }),
    delete: jest.fn().mockResolvedValue(true)
  }
};

// Helper to run integration test with setup/teardown
export const runIntegrationTest = async (
  testName: string,
  testFn: () => Promise<void>
) => {
  console.log(`Starting integration test: ${testName}`);
  
  try {
    await setupIntegrationTests();
    await testFn();
    console.log(`✅ Integration test passed: ${testName}`);
  } catch (error) {
    console.error(`❌ Integration test failed: ${testName}`, error);
    throw error;
  } finally {
    await teardownIntegrationTests();
  }
};

// Export for global test setup
export { testPrisma };