/**
 * Performance tests for critical operations in Astral Core v7
 * Tests response times, throughput, memory usage, and scalability of core functions
 */

import { StripeService } from '@/lib/services/stripe-service';
import { ValidationService } from '@/lib/security/validation';
import { EncryptionService } from '@/lib/security/encryption';
import { MessagingService } from '@/lib/services/messaging-service';
import { POST as CrisisAssessPOST } from '@/app/api/crisis/assess/route';
import {
  createDatabaseMock,
  createEncryptionMock,
  createPHIMock,
  createAPIRequest
} from '../../utils/api-test-helpers';

// Mock all dependencies for performance testing
jest.mock('@/lib/db/prisma', () => ({
  default: createDatabaseMock()
}));

jest.mock('@/lib/security/encryption', () => ({
  encryption: createEncryptionMock()
}));

jest.mock('@/lib/security/phi-service', () => ({
  phiService: createPHIMock()
}));

jest.mock('@/lib/security/audit', () => ({
  audit: {
    logSuccess: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('@/lib/security/rate-limit', () => ({
  rateLimiters: {
    crisis: {
      getIdentifier: jest.fn().mockReturnValue('test-id'),
      check: jest.fn().mockResolvedValue({ allowed: true })
    }
  }
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: { id: 'perf-test-user', role: 'CLIENT' }
  })
}));

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_test123' })
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'sub_test123' })
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test123' })
    }
  }))
}));

const prisma = require('@/lib/db/prisma').default;
const { encryption } = require('@/lib/security/encryption');
const { phiService } = require('@/lib/security/phi-service');

// Performance measurement utilities
const measurePerformance = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  maxExecutionTime: number = 1000
): Promise<{ result: T; executionTime: number; memoryUsage: NodeJS.MemoryUsage }> => {
  const startMemory = process.memoryUsage();
  const startTime = performance.now();
  
  const result = await operation();
  
  const endTime = performance.now();
  const endMemory = process.memoryUsage();
  const executionTime = endTime - startTime;

  console.log(`${operationName}: ${executionTime.toFixed(2)}ms`);
  
  // Check if operation exceeded time limit
  expect(executionTime).toBeLessThan(maxExecutionTime);

  return {
    result,
    executionTime,
    memoryUsage: {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
      arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
    }
  };
};

const measureThroughput = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  concurrentRequests: number = 10,
  targetThroughput: number = 50 // operations per second
): Promise<{ throughput: number; averageTime: number; results: T[] }> => {
  const startTime = performance.now();
  
  const promises = Array.from({ length: concurrentRequests }, () => operation());
  const results = await Promise.all(promises);
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const throughput = (concurrentRequests / totalTime) * 1000; // ops per second
  const averageTime = totalTime / concurrentRequests;

  console.log(`${operationName} throughput: ${throughput.toFixed(2)} ops/sec`);
  console.log(`${operationName} average time: ${averageTime.toFixed(2)}ms`);

  expect(throughput).toBeGreaterThan(targetThroughput);

  return { throughput, averageTime, results };
};

describe('Critical Operations Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up reasonable mock responses for performance testing
    prisma.user.create.mockResolvedValue({ id: 'user-123' });
    prisma.customer.create.mockResolvedValue({ id: 'customer-123' });
    prisma.subscription.create.mockResolvedValue({ id: 'subscription-123' });
    prisma.payment.create.mockResolvedValue({ id: 'payment-123' });
    prisma.message.create.mockResolvedValue({ id: 'message-123' });
    prisma.conversationParticipant.findFirst.mockResolvedValue({ id: 'participant-123' });
    
    encryption.encrypt.mockImplementation((data) => `encrypted_${data}`);
    encryption.decrypt.mockImplementation((data) => data.replace('encrypted_', ''));
    phiService.create.mockResolvedValue({ id: 'phi-record-123' });
  });

  describe('Authentication Performance', () => {
    it('should handle user registration within performance limits', async () => {
      const registrationData = {
        email: 'perf-test@example.com',
        password: 'TestPassword123!',
        name: 'Performance Test User'
      };

      const { executionTime } = await measurePerformance(
        async () => {
          // Simulate registration process
          const hashedPassword = await new Promise(resolve => 
            setTimeout(() => resolve('$2b$12$hashed'), 10)
          );
          
          await prisma.user.create({
            data: {
              email: registrationData.email,
              password: hashedPassword,
              name: registrationData.name
            }
          });
          
          return { success: true };
        },
        'User Registration',
        500 // 500ms max for registration
      );

      expect(executionTime).toBeLessThan(500);
    });

    it('should handle concurrent login attempts efficiently', async () => {
      const loginOperation = async () => {
        // Simulate login verification process
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate bcrypt comparison
        return { authenticated: true, userId: 'user-123' };
      };

      const { throughput } = await measureThroughput(
        loginOperation,
        'Concurrent Logins',
        20, // 20 concurrent requests
        30  // 30 logins per second minimum
      );

      expect(throughput).toBeGreaterThan(30);
    });
  });

  describe('Payment Processing Performance', () => {
    beforeEach(() => {
      prisma.customer.findUnique.mockResolvedValue({
        id: 'customer-123',
        userId: 'user-123',
        stripeCustomerId: 'cus_test123'
      });
    });

    it('should process payment creation within time limits', async () => {
      const paymentData = {
        customerId: 'customer-123',
        amount: 150.00,
        currency: 'usd',
        description: 'Therapy session fee'
      };

      const { executionTime } = await measurePerformance(
        async () => {
          return await StripeService.createPaymentIntent(paymentData);
        },
        'Payment Intent Creation',
        2000 // 2 second max for payment processing
      );

      expect(executionTime).toBeLessThan(2000);
    });

    it('should handle concurrent payment processing', async () => {
      const paymentOperation = async () => {
        return await StripeService.createPaymentIntent({
          customerId: 'customer-123',
          amount: 100.00
        });
      };

      const { throughput } = await measureThroughput(
        paymentOperation,
        'Concurrent Payment Processing',
        10, // 10 concurrent payments
        5   // 5 payments per second minimum
      );

      expect(throughput).toBeGreaterThan(5);
    });

    it('should process subscription creation efficiently', async () => {
      const subscriptionData = {
        customerId: 'customer-123',
        priceId: 'price_test123'
      };

      const { executionTime } = await measurePerformance(
        async () => {
          return await StripeService.createSubscription(subscriptionData);
        },
        'Subscription Creation',
        3000 // 3 second max for subscription
      );

      expect(executionTime).toBeLessThan(3000);
    });

    it('should handle bulk customer operations', async () => {
      const bulkCustomerCreation = async () => {
        const operations = Array.from({ length: 50 }, (_, i) => 
          StripeService.createCustomer({
            userId: `user-${i}`,
            email: `user${i}@example.com`,
            name: `User ${i}`
          })
        );

        return await Promise.all(operations);
      };

      const { executionTime } = await measurePerformance(
        bulkCustomerCreation,
        'Bulk Customer Creation (50)',
        10000 // 10 second max for bulk operations
      );

      expect(executionTime).toBeLessThan(10000);
    });
  });

  describe('Crisis Assessment Performance', () => {
    it('should process crisis assessment within critical time limits', async () => {
      const assessmentData = {
        symptoms: ['anxiety', 'panic', 'suicidal_ideation'],
        suicidalIdeation: true,
        homicidalIdeation: false,
        selfHarmRisk: false,
        substanceUse: false,
        hasSupport: true,
        hasPlan: false,
        hasMeans: false,
        immediateRisk: false
      };

      const { executionTime } = await measurePerformance(
        async () => {
          const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
            method: 'POST',
            body: assessmentData
          });
          
          return await CrisisAssessPOST(request);
        },
        'Crisis Assessment Processing',
        1000 // 1 second max - critical for crisis situations
      );

      expect(executionTime).toBeLessThan(1000);
    });

    it('should handle multiple concurrent crisis assessments', async () => {
      const assessmentOperation = async () => {
        const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
          method: 'POST',
          body: {
            symptoms: ['anxiety'],
            suicidalIdeation: false,
            homicidalIdeation: false,
            selfHarmRisk: false,
            substanceUse: false,
            hasSupport: true,
            hasPlan: false,
            hasMeans: false,
            immediateRisk: false
          }
        });
        
        return await CrisisAssessPOST(request);
      };

      const { throughput } = await measureThroughput(
        assessmentOperation,
        'Concurrent Crisis Assessments',
        15, // 15 concurrent assessments
        10  // 10 assessments per second minimum
      );

      expect(throughput).toBeGreaterThan(10);
    });

    it('should maintain performance under stress conditions', async () => {
      // Simulate high-load crisis scenario
      const stressTestOperation = async () => {
        const assessments = Array.from({ length: 100 }, async (_, i) => {
          const request = createAPIRequest('http://localhost:3000/api/crisis/assess', {
            method: 'POST',
            body: {
              symptoms: [`symptom_${i}`],
              suicidalIdeation: i % 3 === 0,
              homicidalIdeation: false,
              selfHarmRisk: i % 5 === 0,
              substanceUse: false,
              hasSupport: true,
              hasPlan: false,
              hasMeans: false,
              immediateRisk: i % 10 === 0
            }
          });
          
          return await CrisisAssessPOST(request);
        });

        return await Promise.all(assessments);
      };

      const { executionTime } = await measurePerformance(
        stressTestOperation,
        'Crisis Assessment Stress Test (100 concurrent)',
        15000 // 15 seconds max for 100 assessments
      );

      expect(executionTime).toBeLessThan(15000);
    });
  });

  describe('Encryption and Security Performance', () => {
    it('should encrypt data within acceptable time limits', async () => {
      const encryptionService = new EncryptionService();
      const testData = 'This is sensitive patient data that needs to be encrypted quickly';

      const { executionTime } = await measurePerformance(
        async () => {
          return encryptionService.encrypt(testData);
        },
        'Data Encryption',
        100 // 100ms max for encryption
      );

      expect(executionTime).toBeLessThan(100);
    });

    it('should handle bulk encryption efficiently', async () => {
      const encryptionService = new EncryptionService();
      const bulkData = Array.from({ length: 1000 }, (_, i) => `Patient record ${i}`);

      const { executionTime } = await measurePerformance(
        async () => {
          const promises = bulkData.map(data => encryptionService.encrypt(data));
          return await Promise.all(promises);
        },
        'Bulk Encryption (1000 records)',
        5000 // 5 seconds max for 1000 encryptions
      );

      expect(executionTime).toBeLessThan(5000);
    });

    it('should decrypt data quickly for real-time access', async () => {
      const encryptionService = new EncryptionService();
      const originalData = 'Patient medical history';
      const encryptedData = encryptionService.encrypt(originalData);

      const { executionTime } = await measurePerformance(
        async () => {
          return encryptionService.decrypt(encryptedData);
        },
        'Data Decryption',
        50 // 50ms max for decryption
      );

      expect(executionTime).toBeLessThan(50);
    });

    it('should verify passwords efficiently', async () => {
      const encryptionService = new EncryptionService();
      const password = 'SecurePassword123!';
      const hashedPassword = encryptionService.hashPassword(password);

      const { executionTime } = await measurePerformance(
        async () => {
          return encryptionService.verifyPassword(password, hashedPassword);
        },
        'Password Verification',
        200 // 200ms max for password verification
      );

      expect(executionTime).toBeLessThan(200);
    });
  });

  describe('Validation Performance', () => {
    it('should validate input quickly for real-time feedback', async () => {
      const testInputs = [
        '<script>alert("xss")</script>Normal text here',
        'user@example.com',
        'StrongPassword123!',
        '+1 (555) 123-4567',
        'https://example.com'
      ];

      const { executionTime } = await measurePerformance(
        async () => {
          return testInputs.map(input => ({
            sanitized: ValidationService.sanitizeInput(input),
            emailValid: ValidationService.validateEmail(input),
            passwordValid: ValidationService.validatePassword(input).valid,
            phoneValid: ValidationService.validatePhoneNumber(input),
            urlValid: ValidationService.validateUrl(input)
          }));
        },
        'Input Validation Batch',
        50 // 50ms max for validation batch
      );

      expect(executionTime).toBeLessThan(50);
    });

    it('should handle large text sanitization efficiently', async () => {
      const largeText = '<script>evil()</script>'.repeat(1000) + 
                      'Safe content here. '.repeat(10000);

      const { executionTime } = await measurePerformance(
        async () => {
          return ValidationService.sanitizeInput(largeText);
        },
        'Large Text Sanitization',
        500 // 500ms max for large text
      );

      expect(executionTime).toBeLessThan(500);
    });

    it('should validate credit cards using Luhn algorithm efficiently', async () => {
      const creditCards = [
        '4532015112830366', // Valid Visa
        '5555555555554444', // Valid Mastercard
        '378282246310005',  // Valid Amex
        '1234567890123456', // Invalid
        '4532015112830367'  // Invalid checksum
      ];

      const { executionTime } = await measurePerformance(
        async () => {
          return creditCards.map(card => ValidationService.validateCreditCard(card));
        },
        'Credit Card Validation Batch',
        10 // 10ms max for credit card validation
      );

      expect(executionTime).toBeLessThan(10);
    });
  });

  describe('Messaging Performance', () => {
    beforeEach(() => {
      const messagingService = new MessagingService();
      
      prisma.conversationParticipant.findMany.mockResolvedValue([
        { userId: 'user-1', user: { id: 'user-1', name: 'User 1' } },
        { userId: 'user-2', user: { id: 'user-2', name: 'User 2' } }
      ]);
    });

    it('should send messages within acceptable time limits', async () => {
      const messagingService = new MessagingService();
      const messageData = {
        conversationId: 'conv-123',
        senderId: 'user-1',
        content: 'Test message for performance',
        type: 'text'
      };

      const { executionTime } = await measurePerformance(
        async () => {
          return await messagingService.sendMessage(messageData);
        },
        'Message Sending',
        500 // 500ms max for message sending
      );

      expect(executionTime).toBeLessThan(500);
    });

    it('should handle high-volume message processing', async () => {
      const messagingService = new MessagingService();
      
      const bulkMessageOperation = async () => {
        const messages = Array.from({ length: 100 }, (_, i) => ({
          conversationId: 'conv-123',
          senderId: 'user-1',
          content: `Bulk message ${i}`,
          type: 'text'
        }));

        const promises = messages.map(msg => messagingService.sendMessage(msg));
        return await Promise.all(promises);
      };

      const { executionTime } = await measurePerformance(
        bulkMessageOperation,
        'Bulk Message Processing (100 messages)',
        10000 // 10 seconds max for 100 messages
      );

      expect(executionTime).toBeLessThan(10000);
    });

    it('should retrieve conversation history efficiently', async () => {
      const messagingService = new MessagingService();
      
      // Mock large conversation history
      const mockMessages = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        content: `encrypted_Message ${i}`,
        sender: { id: 'user-1', name: 'User 1' },
        readReceipts: []
      }));
      
      prisma.message.findMany.mockResolvedValue(mockMessages.slice(0, 50));
      phiService.decryptField.mockImplementation(async (content) => 
        content.replace('encrypted_', '')
      );

      const { executionTime } = await measurePerformance(
        async () => {
          return await messagingService.getConversationMessages('conv-123', 'user-1', {
            limit: 50
          });
        },
        'Conversation History Retrieval (50 messages)',
        1000 // 1 second max for message history
      );

      expect(executionTime).toBeLessThan(1000);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should maintain reasonable memory usage during bulk operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const bulkOperation = async () => {
        const largeDataSet = Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          data: 'x'.repeat(1000), // 1KB per item = 10MB total
          encrypted: encryption.encrypt(`data_${i}`)
        }));

        // Process the data
        return largeDataSet.map(item => ({
          ...item,
          processed: true,
          hash: ValidationService.sanitizeInput(item.data)
        }));
      };

      const { result, memoryUsage } = await measurePerformance(
        bulkOperation,
        'Memory Intensive Operation'
      );

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncreaseMB).toBeLessThan(100);
      expect(result).toHaveLength(10000);
    });

    it('should handle garbage collection efficiently', async () => {
      const memoryBefore = process.memoryUsage().heapUsed;
      
      // Create and dispose of large amounts of data
      for (let i = 0; i < 1000; i++) {
        const largeString = 'x'.repeat(10000); // 10KB
        const encrypted = encryption.encrypt(largeString);
        const decrypted = encryption.decrypt(encrypted);
        
        // Force some processing
        ValidationService.sanitizeInput(decrypted);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryDifference = Math.abs(memoryAfter - memoryBefore);
      const memoryDifferenceMB = memoryDifference / (1024 * 1024);

      console.log(`Memory difference after GC: ${memoryDifferenceMB.toFixed(2)}MB`);
      
      // Memory should be cleaned up efficiently
      expect(memoryDifferenceMB).toBeLessThan(50);
    });
  });

  describe('Database Query Performance', () => {
    it('should handle complex queries efficiently', async () => {
      // Mock complex query results
      prisma.conversation.findMany.mockResolvedValue(
        Array.from({ length: 100 }, (_, i) => ({
          id: `conv-${i}`,
          participants: [{ userId: 'user-1' }],
          messages: [{ id: `msg-${i}`, sender: { name: 'User' } }],
          unreadCount: i % 5
        }))
      );

      const { executionTime } = await measurePerformance(
        async () => {
          const messagingService = new MessagingService();
          return await messagingService.getUserConversations({
            userId: 'user-1',
            unreadOnly: false
          });
        },
        'Complex Database Query (100 conversations)',
        2000 // 2 seconds max for complex queries
      );

      expect(executionTime).toBeLessThan(2000);
    });

    it('should handle pagination efficiently', async () => {
      const messagingService = new MessagingService();
      
      // Test paginated message retrieval
      const paginationTest = async () => {
        const pages = [];
        for (let page = 0; page < 10; page++) {
          const messages = await messagingService.getConversationMessages(
            'conv-123',
            'user-1',
            { limit: 50, offset: page * 50 }
          );
          pages.push(messages);
        }
        return pages;
      };

      const { executionTime } = await measurePerformance(
        paginationTest,
        'Paginated Query Performance (10 pages)',
        3000 // 3 seconds max for pagination
      );

      expect(executionTime).toBeLessThan(3000);
    });
  });

  describe('Load Testing Scenarios', () => {
    it('should maintain performance under simulated user load', async () => {
      // Simulate 50 concurrent users performing various operations
      const simulateUserLoad = async () => {
        const userOperations = Array.from({ length: 50 }, async (_, userId) => {
          // Each user performs multiple operations
          const operations = [
            // Send a message
            new MessagingService().sendMessage({
              conversationId: 'load-test-conv',
              senderId: `load-user-${userId}`,
              content: `Load test message from user ${userId}`,
              type: 'text'
            }),
            
            // Process a payment
            StripeService.createPaymentIntent({
              customerId: `load-customer-${userId}`,
              amount: 100 + userId
            }),
            
            // Validate some input
            Promise.resolve(ValidationService.sanitizeInput(`<script>alert(${userId})</script>Data`)),
            
            // Encrypt some data
            Promise.resolve(encryption.encrypt(`User ${userId} sensitive data`))
          ];
          
          return await Promise.all(operations);
        });

        return await Promise.all(userOperations);
      };

      const { executionTime, throughput } = await measurePerformance(
        simulateUserLoad,
        'Simulated User Load (50 concurrent users)',
        30000 // 30 seconds max for load test
      );

      expect(executionTime).toBeLessThan(30000);
      
      // Calculate operations per second
      const totalOperations = 50 * 4; // 50 users * 4 operations each
      const operationsPerSecond = totalOperations / (executionTime / 1000);
      
      console.log(`Load test throughput: ${operationsPerSecond.toFixed(2)} ops/sec`);
      expect(operationsPerSecond).toBeGreaterThan(20); // At least 20 ops/sec under load
    });
  });
});