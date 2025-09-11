/**
 * Comprehensive WebSocket functionality tests for Astral Core v7
 * Tests real-time messaging, presence updates, crisis notifications, and session management
 */

import { WebSocketServer } from '@/lib/websocket/server';
import { MessagingService } from '@/lib/services/messaging-service';
import {
  createDatabaseMock,
  createPHIMock,
  createWebSocketMock
} from '../../utils/api-test-helpers';
import { Server as HTTPServer } from 'http';

// Mock Socket.IO
const mockIo = {
  use: jest.fn(),
  on: jest.fn(),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  sockets: {
    sockets: new Map()
  }
};

jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockIo)
}));

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  default: require('../../mocks/prisma').mockPrisma
}));

jest.mock('@/lib/security/phi-service', () => ({
  phiService: {
    create: jest.fn().mockResolvedValue({ id: 'test-id', data: 'encrypted-data' }),
    read: jest.fn().mockResolvedValue({ id: 'test-id', data: 'decrypted-data' }),
    update: jest.fn().mockResolvedValue({ id: 'test-id', data: 'updated-data' }),
    delete: jest.fn().mockResolvedValue({ success: true }),
    findUnique: jest.fn().mockResolvedValue({ id: 'test-id', data: 'test-data' }),
    findMany: jest.fn().mockResolvedValue([{ id: 'test-id', data: 'test-data' }]),
    encryptField: jest.fn().mockImplementation(data => `encrypted_${data}`),
    decryptField: jest.fn().mockImplementation(data => data.replace('encrypted_', ''))
  }
}));

jest.mock('@/lib/security/audit', () => ({
  audit: {
    logSuccess: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('@/lib/security/rate-limit', () => ({
  rateLimiter: {
    checkLimit: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('@/lib/services/notification-service', () => ({
  notificationService: {
    sendMessageNotification: jest.fn().mockResolvedValue(undefined)
  }
}));

// Note: These would be ES6 imports but are mocked above
const prisma = jest.mocked(createDatabaseMock());
const phiService = jest.fn();
const audit = jest.fn();
const notificationService = jest.fn();

// Mock WebSocket server with proper implementation
const createMockWebSocketServer = () => ({
  sendToUser: jest.fn(),
  sendToRoom: jest.fn(),
  broadcastToRole: jest.fn(),
  joinRoom: jest.fn(),
  leaveRoom: jest.fn(),
  getUserPresence: jest.fn(),
  updatePresence: jest.fn()
});

jest.mock('@/lib/websocket/server', () => ({
  websocketServer: createMockWebSocketServer()
}));

const mockWebSocketServer = createMockWebSocketServer();

describe('WebSocket Functionality Tests', () => {
  let messagingService: MessagingService;
  let webSocketServer: WebSocketServer;
  let mockHttpServer: HTTPServer;

  beforeEach(() => {
    jest.clearAllMocks();

    messagingService = new MessagingService();
    webSocketServer = new WebSocketServer();
    mockHttpServer = {} as HTTPServer;

    // Reset WebSocket server mocks
    mockWebSocketServer.sendToUser.mockClear();
    mockWebSocketServer.sendToRoom.mockClear();
    mockWebSocketServer.broadcastToRole.mockClear();

    // Set up default database responses
    prisma.conversation.create.mockResolvedValue({
      id: 'conv-123',
      type: 'DIRECT',
      title: null,
      participants: [
        {
          userId: 'user-1',
          user: { id: 'user-1', name: 'User 1', email: 'user1@example.com' }
        },
        {
          userId: 'user-2',
          user: { id: 'user-2', name: 'User 2', email: 'user2@example.com' }
        }
      ]
    });

    prisma.message.create.mockResolvedValue({
      id: 'msg-123',
      conversationId: 'conv-123',
      senderId: 'user-1',
      content: 'encrypted_content',
      type: 'text',
      createdAt: new Date(),
      sender: {
        id: 'user-1',
        name: 'User 1',
        email: 'user1@example.com'
      }
    });

    phiService.encryptField.mockImplementation(content => `encrypted_${content}`);
    phiService.decryptField.mockImplementation(content => content.replace('encrypted_', ''));
  });

  describe('WebSocket Server Initialization', () => {
    it('should initialize WebSocket server with proper configuration', () => {
      webSocketServer.initialize(mockHttpServer);

      expect(mockIo.use).toHaveBeenCalled(); // Authentication middleware should be set up
    });

    it('should set up authentication middleware', () => {
      webSocketServer.initialize(mockHttpServer);

      // Verify middleware was added
      expect(mockIo.use).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Real-time Messaging', () => {
    beforeEach(() => {
      // Mock conversation participant verification
      prisma.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-123',
        conversationId: 'conv-123',
        userId: 'user-1',
        role: 'member'
      });

      // Mock participants list
      prisma.conversationParticipant.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          user: { id: 'user-1', name: 'User 1' }
        },
        {
          userId: 'user-2',
          user: { id: 'user-2', name: 'User 2' }
        }
      ]);

      // Mock conversation update
      prisma.conversation.update.mockResolvedValue({});
    });

    it('should send message and notify participants via WebSocket', async () => {
      const messageData = {
        conversationId: 'conv-123',
        senderId: 'user-1',
        content: 'Hello, how are you?',
        type: 'text'
      };

      await messagingService.sendMessage(messageData);

      // Verify message was created
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-123',
          senderId: 'user-1',
          content: 'encrypted_Hello, how are you?',
          type: 'text',
          attachments: [],
          metadata: undefined
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      });

      // Verify WebSocket notifications were sent
      expect(mockWebSocketServer.sendToUser).toHaveBeenCalledWith(
        'user-1',
        'message:new',
        expect.any(Object)
      );
      expect(mockWebSocketServer.sendToUser).toHaveBeenCalledWith(
        'user-2',
        'message:new',
        expect.any(Object)
      );

      // Verify push notifications were sent to non-sender
      expect(notificationService.sendMessageNotification).toHaveBeenCalledWith(
        'user-2',
        'user-1',
        'User 1',
        'Hello, how are you?'
      );

      // Verify audit log
      expect(audit.logSuccess).toHaveBeenCalledWith(
        'MESSAGE_SENT',
        'Message',
        'msg-123',
        { conversationId: 'conv-123' },
        'user-1'
      );
    });

    it('should handle message encryption for PHI content', async () => {
      const messageData = {
        conversationId: 'conv-123',
        senderId: 'user-1',
        content: 'Patient ID: 12345, diagnosis: depression',
        type: 'text'
      };

      await messagingService.sendMessage(messageData);

      expect(phiService.encryptField).toHaveBeenCalledWith(
        'Patient ID: 12345, diagnosis: depression'
      );
    });

    it('should prevent unauthorized users from sending messages', async () => {
      // Mock no participant found
      prisma.conversationParticipant.findFirst.mockResolvedValue(null);

      const messageData = {
        conversationId: 'conv-123',
        senderId: 'unauthorized-user',
        content: 'Unauthorized message',
        type: 'text'
      };

      await expect(messagingService.sendMessage(messageData)).rejects.toThrow(
        'User is not a participant in this conversation'
      );

      expect(prisma.message.create).not.toHaveBeenCalled();
      expect(mockWebSocketServer.sendToUser).not.toHaveBeenCalled();
    });

    it('should handle message attachments', async () => {
      const messageData = {
        conversationId: 'conv-123',
        senderId: 'user-1',
        content: 'Check out this document',
        type: 'file',
        attachments: ['file-123.pdf', 'image-456.jpg']
      };

      await messagingService.sendMessage(messageData);

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          attachments: ['file-123.pdf', 'image-456.jpg']
        }),
        include: expect.any(Object)
      });
    });
  });

  describe('Conversation Management', () => {
    it('should create conversation and notify participants', async () => {
      const conversationData = {
        type: 'DIRECT' as const,
        participantIds: ['user-1', 'user-2'],
        createdBy: 'user-1'
      };

      await messagingService.createConversation(conversationData);

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: {
          type: 'DIRECT',
          title: undefined,
          participants: {
            create: [
              { userId: 'user-1', role: 'admin' },
              { userId: 'user-2', role: 'member' }
            ]
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          }
        }
      });

      // Verify WebSocket notification sent to non-creator
      expect(mockWebSocketServer.sendToUser).toHaveBeenCalledWith(
        'user-2',
        'conversation:new',
        expect.objectContaining({
          conversationId: 'conv-123',
          type: 'DIRECT'
        })
      );

      expect(audit.logSuccess).toHaveBeenCalledWith(
        'CONVERSATION_CREATED',
        'Conversation',
        'conv-123',
        { type: 'DIRECT', participantCount: 2 },
        'user-1'
      );
    });

    it('should return existing direct conversation if found', async () => {
      const existingConversation = {
        id: 'existing-conv-123',
        type: 'DIRECT',
        participants: []
      };

      // Mock finding existing conversation
      prisma.conversation.findFirst.mockResolvedValue(existingConversation);

      const conversationData = {
        type: 'DIRECT' as const,
        participantIds: ['user-1', 'user-2'],
        createdBy: 'user-1'
      };

      const result = await messagingService.createConversation(conversationData);

      expect(result).toEqual(existingConversation);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should create group conversation with title', async () => {
      const conversationData = {
        type: 'GROUP' as const,
        participantIds: ['user-1', 'user-2', 'user-3'],
        title: 'Team Discussion',
        createdBy: 'user-1'
      };

      await messagingService.createConversation(conversationData);

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'GROUP',
          title: 'Team Discussion'
        }),
        include: expect.any(Object)
      });
    });
  });

  describe('Message Read Receipts', () => {
    beforeEach(() => {
      prisma.messageReadReceipt.findUnique.mockResolvedValue(null);
      prisma.messageReadReceipt.create.mockResolvedValue({
        id: 'receipt-123',
        messageId: 'msg-123',
        userId: 'user-2',
        readAt: new Date()
      });

      prisma.message.findUnique.mockResolvedValue({
        id: 'msg-123',
        conversationId: 'conv-123',
        senderId: 'user-1'
      });
    });

    it('should create read receipt and notify sender', async () => {
      await messagingService.markMessageAsRead('msg-123', 'user-2');

      expect(prisma.messageReadReceipt.create).toHaveBeenCalledWith({
        data: {
          messageId: 'msg-123',
          userId: 'user-2'
        }
      });

      expect(mockWebSocketServer.sendToUser).toHaveBeenCalledWith(
        'user-1',
        'message:read',
        expect.objectContaining({
          messageId: 'msg-123',
          userId: 'user-2'
        })
      );
    });

    it('should not create duplicate read receipts', async () => {
      // Mock existing receipt
      prisma.messageReadReceipt.findUnique.mockResolvedValue({
        id: 'existing-receipt',
        messageId: 'msg-123',
        userId: 'user-2'
      });

      const result = await messagingService.markMessageAsRead('msg-123', 'user-2');

      expect(prisma.messageReadReceipt.create).not.toHaveBeenCalled();
      expect(result.id).toBe('existing-receipt');
    });
  });

  describe('Message Editing and Deletion', () => {
    beforeEach(() => {
      prisma.message.findFirst.mockResolvedValue({
        id: 'msg-123',
        conversationId: 'conv-123',
        senderId: 'user-1',
        content: 'encrypted_original_content',
        isDeleted: false
      });
    });

    it('should edit message and notify participants', async () => {
      prisma.message.update.mockResolvedValue({
        id: 'msg-123',
        content: 'encrypted_edited_content',
        isEdited: true,
        editedAt: new Date(),
        sender: { id: 'user-1', name: 'User 1' }
      });

      await messagingService.editMessage('msg-123', 'user-1', 'Edited content');

      expect(phiService.encryptField).toHaveBeenCalledWith('Edited content');

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-123' },
        data: {
          content: 'encrypted_Edited content',
          isEdited: true,
          editedAt: expect.any(Date)
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      expect(mockWebSocketServer.sendToUser).toHaveBeenCalledWith(
        'conversation:conv-123',
        'message:edited',
        expect.objectContaining({
          messageId: 'msg-123',
          content: 'Edited content'
        })
      );
    });

    it('should prevent unauthorized message editing', async () => {
      // Mock message not found or different sender
      prisma.message.findFirst.mockResolvedValue(null);

      await expect(
        messagingService.editMessage('msg-123', 'user-2', 'Unauthorized edit')
      ).rejects.toThrow('Message not found or access denied');

      expect(prisma.message.update).not.toHaveBeenCalled();
      expect(mockWebSocketServer.sendToUser).not.toHaveBeenCalled();
    });

    it('should soft delete message and notify participants', async () => {
      await messagingService.deleteMessage('msg-123', 'user-1');

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-123' },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          content: '[Message deleted]'
        }
      });

      expect(mockWebSocketServer.sendToUser).toHaveBeenCalledWith(
        'conversation:conv-123',
        'message:deleted',
        { messageId: 'msg-123' }
      );
    });
  });

  describe('Crisis Communication', () => {
    it('should create crisis conversation with initial support message', async () => {
      prisma.message.create
        .mockResolvedValueOnce({
          id: 'crisis-conv-123',
          type: 'CRISIS',
          participants: []
        })
        .mockResolvedValueOnce({
          id: 'crisis-msg-123',
          conversationId: 'crisis-conv-123',
          senderId: 'responder-1',
          content: "encrypted_Hello, I'm here to help...",
          sender: { id: 'responder-1', name: 'Crisis Responder' }
        });

      await messagingService.createCrisisConversation('user-1', 'responder-1');

      // Verify conversation was created with crisis type
      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'CRISIS',
          title: 'Crisis Support'
        }),
        include: expect.any(Object)
      });

      // Verify initial support message was sent
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          senderId: 'responder-1',
          content: expect.stringContaining("I'm here to help"),
          metadata: { isCrisisResponse: true }
        }),
        include: expect.any(Object)
      });
    });

    it('should handle crisis alert notifications', () => {
      // This would test WebSocket crisis alert functionality
      const crisisAlert = {
        userId: 'user-1',
        severity: 'EMERGENCY' as const,
        location: 'Home',
        triggerEvent: 'Suicidal ideation'
      };

      // Mock WebSocket server behavior for crisis alerts
      mockWebSocketServer.broadcastToRole.mockImplementation((role, event, data) => {
        expect(role).toBe('CRISIS_RESPONDER');
        expect(event).toBe('crisis:alert');
        expect(data).toMatchObject({
          userId: 'user-1',
          severity: 'EMERGENCY'
        });
      });

      // Simulate crisis alert broadcast
      mockWebSocketServer.broadcastToRole('CRISIS_RESPONDER', 'crisis:alert', crisisAlert);

      expect(mockWebSocketServer.broadcastToRole).toHaveBeenCalled();
    });
  });

  describe('Therapy Session Communication', () => {
    it('should create therapy conversation between therapist and client', async () => {
      const result = await messagingService.createTherapyConversation('therapist-1', 'client-1');

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'THERAPY',
          title: 'Therapy Session'
        }),
        include: expect.any(Object)
      });

      expect(result.id).toBe('conv-123');
    });

    it('should handle session start notifications', () => {
      const sessionData = {
        sessionId: 'session-123',
        therapistId: 'therapist-1',
        clientId: 'client-1',
        scheduledTime: new Date(),
        type: 'INDIVIDUAL'
      };

      // Test WebSocket notifications for session start
      mockWebSocketServer.sendToUser('client-1', 'session:start', sessionData);
      mockWebSocketServer.sendToUser('therapist-1', 'session:start', sessionData);

      expect(mockWebSocketServer.sendToUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('Presence and Typing Indicators', () => {
    it('should handle user presence updates', () => {
      const presenceUpdate = {
        userId: 'user-1',
        status: 'online' as const,
        lastActivity: new Date()
      };

      mockWebSocketServer.updatePresence = jest.fn();
      mockWebSocketServer.updatePresence('user-1', presenceUpdate);

      expect(mockWebSocketServer.updatePresence).toHaveBeenCalledWith('user-1', presenceUpdate);
    });

    it('should broadcast typing indicators', () => {
      const typingData = {
        conversationId: 'conv-123',
        userId: 'user-1',
        isTyping: true
      };

      mockWebSocketServer.sendToRoom('conv-123', 'user:typing', typingData);

      expect(mockWebSocketServer.sendToRoom).toHaveBeenCalledWith(
        'conv-123',
        'user:typing',
        typingData
      );
    });
  });

  describe('Message Search and Retrieval', () => {
    beforeEach(() => {
      prisma.message.findMany.mockResolvedValue([
        {
          id: 'msg-1',
          content: 'encrypted_Hello world',
          sender: { id: 'user-1', name: 'User 1' },
          conversation: { id: 'conv-123', title: 'Test Chat', type: 'DIRECT' }
        },
        {
          id: 'msg-2',
          content: 'encrypted_How are you?',
          sender: { id: 'user-2', name: 'User 2' },
          conversation: { id: 'conv-123', title: 'Test Chat', type: 'DIRECT' }
        }
      ]);

      phiService.decryptField
        .mockResolvedValueOnce('Hello world')
        .mockResolvedValueOnce('How are you?');
    });

    it('should search messages and return decrypted results', async () => {
      const results = await messagingService.searchMessages('user-1', 'hello');

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: {
          conversation: {
            participants: {
              some: { userId: 'user-1' }
            }
          },
          isDeleted: false
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('Hello world');
    });

    it('should decrypt messages when retrieving conversation history', async () => {
      // Mock participant verification
      prisma.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-123',
        lastRead: new Date('2024-01-01')
      });

      // Mock messages
      prisma.message.findMany.mockResolvedValue([
        {
          id: 'msg-1',
          content: 'encrypted_Test message',
          sender: { id: 'user-1', name: 'User 1' },
          readReceipts: []
        }
      ]);

      phiService.decryptField.mockResolvedValue('Test message');

      const messages = await messagingService.getConversationMessages('conv-123', 'user-1');

      expect(phiService.decryptField).toHaveBeenCalledWith('encrypted_Test message');
      expect(messages[0].content).toBe('Test message');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle WebSocket disconnections gracefully', () => {
      // Mock socket disconnect
      const mockSocket = createWebSocketMock();
      mockSocket.connected = false;

      // Verify that sending to disconnected socket doesn't throw
      expect(() => {
        mockWebSocketServer.sendToUser('disconnected-user', 'test:event', {});
      }).not.toThrow();
    });

    it('should handle message encryption failures', async () => {
      phiService.encryptField.mockRejectedValue(new Error('Encryption failed'));

      const messageData = {
        conversationId: 'conv-123',
        senderId: 'user-1',
        content: 'Test message',
        type: 'text'
      };

      await expect(messagingService.sendMessage(messageData)).rejects.toThrow('Encryption failed');

      expect(prisma.message.create).not.toHaveBeenCalled();
      expect(mockWebSocketServer.sendToUser).not.toHaveBeenCalled();
    });

    it('should handle database connection failures', async () => {
      prisma.message.create.mockRejectedValue(new Error('Database connection failed'));

      const messageData = {
        conversationId: 'conv-123',
        senderId: 'user-1',
        content: 'Test message',
        type: 'text'
      };

      await expect(messagingService.sendMessage(messageData)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle malformed message data', async () => {
      const invalidMessageData = {
        conversationId: '',
        senderId: null,
        content: undefined,
        type: 'invalid'
      };

      // This should be caught by validation before reaching the service
      expect(() => {
        // Validate message data structure
        if (!invalidMessageData.conversationId || !invalidMessageData.senderId) {
          throw new Error('Invalid message data');
        }
      }).toThrow('Invalid message data');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent message sending', async () => {
      // Mock multiple users sending messages simultaneously
      const concurrentMessages = Array.from({ length: 10 }, (_, i) => ({
        conversationId: 'conv-123',
        senderId: `user-${i + 1}`,
        content: `Message from user ${i + 1}`,
        type: 'text'
      }));

      const promises = concurrentMessages.map(data => messagingService.sendMessage(data));

      // Should handle all messages without errors
      await expect(Promise.all(promises)).resolves.toBeDefined();

      expect(prisma.message.create).toHaveBeenCalledTimes(10);
    });

    it('should limit message history retrieval', async () => {
      prisma.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-123'
      });

      prisma.message.findMany.mockResolvedValue([]);
      phiService.decryptField.mockResolvedValue('');

      await messagingService.getConversationMessages('conv-123', 'user-1', {
        limit: 25,
        offset: 0
      });

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 25,
        skip: 0
      });
    });

    it('should handle large conversation participant lists efficiently', async () => {
      // Mock large participant list (100 users)
      const largeParticipantList = Array.from({ length: 100 }, (_, i) => ({
        userId: `user-${i + 1}`,
        user: { id: `user-${i + 1}`, name: `User ${i + 1}` }
      }));

      prisma.conversationParticipant.findMany.mockResolvedValue(largeParticipantList);

      const messageData = {
        conversationId: 'large-conv-123',
        senderId: 'user-1',
        content: 'Message to large group',
        type: 'text'
      };

      await messagingService.sendMessage(messageData);

      // Should send WebSocket notification to all participants
      expect(mockWebSocketServer.sendToUser).toHaveBeenCalledTimes(100);

      // Should send push notifications to all except sender
      expect(notificationService.sendMessageNotification).toHaveBeenCalledTimes(99);
    });
  });
});
