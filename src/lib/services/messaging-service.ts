import { prisma } from '@/lib/db';
import { phiService } from '@/lib/security/phi-service';
import { websocketServer } from '@/lib/websocket/server';
import { notificationService } from './notification-service';
import { audit } from '@/lib/security/audit';
import { ConversationType } from '@prisma/client';
import { logError } from '@/lib/logger';

interface CreateConversationDto {
  type: ConversationType;
  participantIds: string[];
  title?: string;
  createdBy: string;
}

interface SendMessageDto {
  conversationId: string;
  senderId: string;
  content: string;
  type?: string;
  attachments?: string[];
  metadata?: Record<string, unknown>;
}

interface ConversationFilters {
  userId: string;
  type?: ConversationType;
  isArchived?: boolean;
  unreadOnly?: boolean;
}

export class MessagingService {
  // Create a new conversation
  async createConversation(data: CreateConversationDto) {
    try {
      // Check if direct conversation already exists
      if (data.type === 'DIRECT' && data.participantIds.length === 2) {
        const participant1 = data.participantIds[0];
        const participant2 = data.participantIds[1];
        if (participant1 && participant2) {
          const existing = await this.findDirectConversation(participant1, participant2);
          if (existing) return existing;
        }
      }

      // Create conversation
      const conversation = await prisma.conversation.create({
        data: {
          type: data.type,
          title: data.title || null,
          participants: {
            create: data.participantIds.map(userId => ({
              userId,
              role: userId === data.createdBy ? 'admin' : 'member'
            }))
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

      // Notify participants via WebSocket
      data.participantIds.forEach(userId => {
        if (userId !== data.createdBy) {
          websocketServer.sendToUser(userId, 'conversation:new', {
            type: 'conversation:new',
            timestamp: Date.now(),
            userId: data.createdBy,
            data: {
              conversationId: conversation.id,
              conversationType: conversation.type,
              title: conversation.title,
              participants: conversation.participants
            }
          });
        }
      });

      // Audit log
      await audit.logSuccess(
        'CONVERSATION_CREATED',
        'Conversation',
        conversation.id,
        { type: data.type, participantCount: data.participantIds.length },
        data.createdBy
      );

      return conversation;
    } catch (error) {
      logError('Error creating conversation', error, 'MessagingService');
      throw error;
    }
  }

  // Send a message
  async sendMessage(data: SendMessageDto) {
    try {
      // Verify sender is participant
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: data.conversationId,
          userId: data.senderId
        }
      });

      if (!participant) {
        throw new Error('User is not a participant in this conversation');
      }

      // Encrypt content if it contains PHI
      const encryptedContent = await phiService.encryptField(data.content);

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: encryptedContent,
          type: data.type || 'text',
          attachments: data.attachments || []
          // metadata: data.metadata // Skip metadata for now to avoid type issues
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

      // Update conversation last activity
      await prisma.conversation.update({
        where: { id: data.conversationId },
        data: {
          lastMessage: data.content.substring(0, 100),
          lastActivity: new Date()
        }
      });

      // Get all participants
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: data.conversationId },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Send real-time notification to all participants
      participants.forEach(p => {
        const messageData = {
          type: 'data',
          data: { ...message, unencryptedContent: data.content },
          timestamp: Date.now()
        };
        websocketServer.sendToUser(p.userId, 'message:new', messageData);

        // Send push notification if not the sender
        if (p.userId !== data.senderId) {
          notificationService.sendMessageNotification(
            p.userId,
            data.senderId,
            (message as unknown as { sender: { name: string | null } }).sender?.name || 'Someone',
            data.content
          );
        }
      });

      // Audit log
      await audit.logSuccess(
        'MESSAGE_SENT',
        'Message',
        message.id,
        { conversationId: data.conversationId },
        data.senderId
      );

      return {
        ...message,
        content: data.content // Return unencrypted
      };
    } catch (error) {
      logError('Error sending message', error, 'MessagingService');
      throw error;
    }
  }

  // Get user conversations
  async getUserConversations(filters: ConversationFilters) {
    try {
      const where: Record<string, unknown> = {
        participants: {
          some: {
            userId: filters.userId,
            isArchived: filters.isArchived || false
          }
        }
      };

      if (filters.type) {
        where['type'] = filters.type;
      }

      const conversations = await prisma.conversation.findMany({
        where,
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
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { lastActivity: 'desc' }
      });

      // Calculate unread counts
      const conversationsWithUnread = await Promise.all(
        conversations.map(async conv => {
          const unreadCount = await this.getUnreadCount(conv.id, filters.userId);
          return {
            ...conv,
            unreadCount,
            lastMessage: conv.messages[0] || null
          };
        })
      );

      if (filters.unreadOnly) {
        return conversationsWithUnread.filter(c => c.unreadCount > 0);
      }

      return conversationsWithUnread;
    } catch (error) {
      logError('Error fetching conversations', error, 'MessagingService');
      throw error;
    }
  }

  // Get conversation messages
  async getConversationMessages(
    conversationId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      before?: Date;
    } = {}
  ) {
    try {
      // Verify user is participant
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId
        }
      });

      if (!participant) {
        throw new Error('Access denied');
      }

      const where: Record<string, unknown> = {
        conversationId,
        isDeleted: false
      };

      if (options.before) {
        where['createdAt'] = { lt: options.before };
      }

      const messages = await prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          readReceipts: {
            select: {
              userId: true,
              readAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0
      });

      // Decrypt messages
      const decryptedMessages = await Promise.all(
        messages.map(async msg => ({
          ...msg,
          content: await phiService.decryptField(msg.content)
        }))
      );

      // Update last read time
      await prisma.conversationParticipant.update({
        where: {
          id: participant.id
        },
        data: {
          lastRead: new Date()
        }
      });

      return decryptedMessages.reverse();
    } catch (error) {
      logError('Error fetching messages', error, 'MessagingService');
      throw error;
    }
  }

  // Mark message as read
  async markMessageAsRead(messageId: string, userId: string) {
    try {
      // Check if already read
      const existing = await prisma.messageReadReceipt.findUnique({
        where: {
          messageId_userId: {
            messageId,
            userId
          }
        }
      });

      if (existing) return existing;

      // Create read receipt
      const receipt = await prisma.messageReadReceipt.create({
        data: {
          messageId,
          userId
        }
      });

      // Get message details
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: {
          conversationId: true,
          senderId: true
        }
      });

      if (message) {
        // Notify sender via WebSocket
        websocketServer.sendToUser(message.senderId, 'message:read', {
          type: 'message_read',
          timestamp: Date.now(),
          messageId,
          conversationId: message.conversationId || '',
          readBy: userId,
          readAt: receipt.readAt
        });
      }

      return receipt;
    } catch (error) {
      logError('Error marking message as read', error, 'MessagingService');
      throw error;
    }
  }

  // Edit message
  async editMessage(messageId: string, userId: string, newContent: string) {
    try {
      // Verify ownership
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          senderId: userId,
          isDeleted: false
        }
      });

      if (!message) {
        throw new Error('Message not found or access denied');
      }

      // Encrypt new content
      const encryptedContent = await phiService.encryptField(newContent);

      // Update message
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
          content: encryptedContent,
          isEdited: true,
          editedAt: new Date()
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

      // Notify participants
      if (message.conversationId) {
        websocketServer.sendToUser('conversation:' + message.conversationId, 'message:edited', {
          type: 'message:edited',
          timestamp: Date.now(),
          data: {
            messageId,
            content: newContent,
            editedAt: updated.editedAt
          }
        });
      }

      return {
        ...updated,
        content: newContent
      };
    } catch (error) {
      logError('Error editing message', error, 'MessagingService');
      throw error;
    }
  }

  // Delete message (soft delete)
  async deleteMessage(messageId: string, userId: string) {
    try {
      // Verify ownership
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          senderId: userId
        }
      });

      if (!message) {
        throw new Error('Message not found or access denied');
      }

      // Soft delete
      await prisma.message.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          content: '[Message deleted]'
        }
      });

      // Notify participants
      if (message.conversationId) {
        websocketServer.sendToUser('conversation:' + message.conversationId, 'message:deleted', {
          type: 'message:deleted',
          timestamp: Date.now(),
          data: {
            messageId
          }
        });
      }

      return { success: true };
    } catch (error) {
      logError('Error deleting message', error, 'MessagingService');
      throw error;
    }
  }

  // Archive conversation
  async archiveConversation(conversationId: string, userId: string) {
    try {
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId
        }
      });

      if (!participant) {
        throw new Error('Conversation not found');
      }

      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { isArchived: true }
      });

      return { success: true };
    } catch (error) {
      logError('Error archiving conversation', error, 'MessagingService');
      throw error;
    }
  }

  // Mute conversation
  async muteConversation(conversationId: string, userId: string, isMuted: boolean) {
    try {
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId
        }
      });

      if (!participant) {
        throw new Error('Conversation not found');
      }

      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { isMuted }
      });

      return { success: true };
    } catch (error) {
      logError('Error muting conversation', error, 'MessagingService');
      throw error;
    }
  }

  // Search messages
  async searchMessages(userId: string, query: string, conversationId?: string) {
    try {
      const where: Record<string, unknown> = {
        conversation: {
          participants: {
            some: { userId }
          }
        },
        isDeleted: false
      };

      if (conversationId) {
        where['conversationId'] = conversationId;
      }

      // Note: In production, use full-text search or Elasticsearch
      const messages = await prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true
            }
          },
          conversation: {
            select: {
              id: true,
              title: true,
              type: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Decrypt and filter
      const results = await Promise.all(
        messages.map(async msg => {
          const decrypted = await phiService.decryptField(msg.content);
          if (decrypted.toLowerCase().includes(query.toLowerCase())) {
            return {
              ...msg,
              content: decrypted
            };
          }
          return null;
        })
      );

      return results.filter(Boolean);
    } catch (error) {
      logError('Error searching messages', error, 'MessagingService');
      throw error;
    }
  }

  // Helper methods
  private async findDirectConversation(userId1: string, userId2: string) {
    return prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          {
            participants: {
              some: { userId: userId1 }
            }
          },
          {
            participants: {
              some: { userId: userId2 }
            }
          }
        ]
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
  }

  private async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId
      }
    });

    if (!participant) return 0;

    return prisma.message.count({
      where: {
        conversationId,
        createdAt: {
          gt: participant.lastRead || new Date(0)
        },
        senderId: {
          not: userId
        },
        isDeleted: false
      }
    });
  }

  // Therapy-specific messaging
  async createTherapyConversation(therapistId: string, clientId: string) {
    return this.createConversation({
      type: 'THERAPY',
      participantIds: [therapistId, clientId],
      title: 'Therapy Session',
      createdBy: therapistId
    });
  }

  // Crisis messaging
  async createCrisisConversation(userId: string, responderId: string) {
    const conversation = await this.createConversation({
      type: 'CRISIS',
      participantIds: [userId, responderId],
      title: 'Crisis Support',
      createdBy: responderId
    });

    // Send initial message
    await this.sendMessage({
      conversationId: conversation.id,
      senderId: responderId,
      content:
        "Hello, I'm here to help. You're not alone. Can you tell me what's happening right now?",
      metadata: { isCrisisResponse: true }
    });

    return conversation;
  }
}

export const messagingService = new MessagingService();
