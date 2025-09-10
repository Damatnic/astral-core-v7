import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { rateLimiter } from '@/lib/security/rate-limit';
import { audit } from '@/lib/security/audit';
import { phiService } from '@/lib/security/phi-service';
import prisma from '@/lib/db/prisma';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  sessionId?: string;
}

interface PresenceData {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActivity: Date;
  location?: string;
}

interface TypingData {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

export class WebSocketServer {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map();
  private presence: Map<string, PresenceData> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startHeartbeat();

    console.log('WebSocket server initialized');
  }

  private setupMiddleware() {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify session token
        const session = await this.verifySession(token);
        if (!session) {
          return next(new Error('Invalid session'));
        }

        // Rate limiting
        const rateLimitKey = `ws:${session.userId}`;
        const allowed = await rateLimiter.checkLimit(rateLimitKey, 100, 60000);
        if (!allowed) {
          return next(new Error('Rate limit exceeded'));
        }

        socket.userId = session.userId;
        socket.userRole = session.userRole;
        socket.sessionId = session.sessionId;

        next();
      } catch (error) {
        console.error('WebSocket auth error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      if (!socket.userId) return;

      console.log(`User ${socket.userId} connected`);
      this.handleUserConnection(socket);

      // Core events
      socket.on('disconnect', () => this.handleUserDisconnection(socket));
      socket.on('presence:update', (data) => this.handlePresenceUpdate(socket, data));
      socket.on('typing:start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing:stop', (data) => this.handleTypingStop(socket, data));

      // Chat events
      socket.on('message:send', (data) => this.handleMessage(socket, data));
      socket.on('message:read', (data) => this.handleMessageRead(socket, data));
      socket.on('conversation:join', (data) => this.handleJoinConversation(socket, data));
      socket.on('conversation:leave', (data) => this.handleLeaveConversation(socket, data));

      // Therapy session events
      socket.on('session:start', (data) => this.handleSessionStart(socket, data));
      socket.on('session:end', (data) => this.handleSessionEnd(socket, data));
      socket.on('session:update', (data) => this.handleSessionUpdate(socket, data));

      // Crisis events
      socket.on('crisis:alert', (data) => this.handleCrisisAlert(socket, data));
      socket.on('crisis:response', (data) => this.handleCrisisResponse(socket, data));

      // Group therapy events
      socket.on('group:join', (data) => this.handleGroupJoin(socket, data));
      socket.on('group:leave', (data) => this.handleGroupLeave(socket, data));
      socket.on('group:message', (data) => this.handleGroupMessage(socket, data));
    });
  }

  private handleUserConnection(socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    // Track socket
    if (!this.userSockets.has(socket.userId)) {
      this.userSockets.set(socket.userId, new Set());
    }
    this.userSockets.get(socket.userId)?.add(socket.id);

    // Update presence
    this.presence.set(socket.userId, {
      userId: socket.userId,
      status: 'online',
      lastActivity: new Date(),
    });

    // Join user's rooms
    socket.join(`user:${socket.userId}`);
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`);
    }

    // Notify others of user coming online
    socket.broadcast.emit('presence:online', {
      userId: socket.userId,
      timestamp: new Date(),
    });

    // Send pending notifications
    this.sendPendingNotifications(socket);
  }

  private handleUserDisconnection(socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    // Remove socket tracking
    const userSocketSet = this.userSockets.get(socket.userId);
    if (userSocketSet) {
      userSocketSet.delete(socket.id);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(socket.userId);
        
        // Update presence to offline
        this.presence.set(socket.userId, {
          userId: socket.userId,
          status: 'offline',
          lastActivity: new Date(),
        });

        // Notify others
        socket.broadcast.emit('presence:offline', {
          userId: socket.userId,
          timestamp: new Date(),
        });
      }
    }

    // Clear typing indicators
    this.typingUsers.forEach((users, conversationId) => {
      if (users.has(socket.userId!)) {
        users.delete(socket.userId!);
        socket.to(`conversation:${conversationId}`).emit('typing:update', {
          conversationId,
          typingUsers: Array.from(users),
        });
      }
    });

    console.log(`User ${socket.userId} disconnected`);
  }

  private handlePresenceUpdate(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    const status = data.status as 'online' | 'away' | 'busy';
    this.presence.set(socket.userId, {
      userId: socket.userId,
      status,
      lastActivity: new Date(),
      location: data.location,
    });

    // Broadcast to relevant users
    socket.broadcast.emit('presence:update', {
      userId: socket.userId,
      status,
      timestamp: new Date(),
    });
  }

  private handleTypingStart(socket: AuthenticatedSocket, data: TypingData) {
    if (!socket.userId) return;

    const { conversationId } = data;
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    this.typingUsers.get(conversationId)?.add(socket.userId);

    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      conversationId,
      typingUsers: Array.from(this.typingUsers.get(conversationId) || []),
    });
  }

  private handleTypingStop(socket: AuthenticatedSocket, data: TypingData) {
    if (!socket.userId) return;

    const { conversationId } = data;
    this.typingUsers.get(conversationId)?.delete(socket.userId);

    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      conversationId,
      typingUsers: Array.from(this.typingUsers.get(conversationId) || []),
    });
  }

  private async handleMessage(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    try {
      // Validate and sanitize message
      const { conversationId, content, type = 'text', metadata } = data;

      // Check permissions
      const hasAccess = await this.checkConversationAccess(socket.userId, conversationId);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to conversation' });
        return;
      }

      // Encrypt sensitive content if needed
      const encryptedContent = await phiService.encryptField(content);

      // Save message to database
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: socket.userId,
          content: encryptedContent,
          type,
          metadata,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Emit to conversation participants
      this.io?.to(`conversation:${conversationId}`).emit('message:new', {
        ...message,
        content, // Send unencrypted to authorized recipients
      });

      // Send push notifications to offline users
      await this.sendPushNotifications(conversationId, socket.userId, content);

      // Audit log
      await audit.logSuccess(
        'MESSAGE_SENT',
        'Message',
        message.id,
        { conversationId },
        socket.userId
      );
    } catch (error) {
      console.error('Message handling error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleMessageRead(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    const { messageId, conversationId } = data;

    // Update read receipt
    await prisma.messageReadReceipt.create({
      data: {
        messageId,
        userId: socket.userId,
        readAt: new Date(),
      },
    });

    // Notify sender
    socket.to(`conversation:${conversationId}`).emit('message:read', {
      messageId,
      userId: socket.userId,
      timestamp: new Date(),
    });
  }

  private async handleJoinConversation(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    const { conversationId } = data;
    
    // Verify access
    const hasAccess = await this.checkConversationAccess(socket.userId, conversationId);
    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied' });
      return;
    }

    socket.join(`conversation:${conversationId}`);
    
    // Send recent messages
    const messages = await this.getRecentMessages(conversationId);
    socket.emit('conversation:history', { conversationId, messages });

    // Notify others
    socket.to(`conversation:${conversationId}`).emit('user:joined', {
      userId: socket.userId,
      conversationId,
    });
  }

  private async handleLeaveConversation(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    const { conversationId } = data;
    socket.leave(`conversation:${conversationId}`);

    socket.to(`conversation:${conversationId}`).emit('user:left', {
      userId: socket.userId,
      conversationId,
    });
  }

  private async handleSessionStart(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    const { appointmentId, therapistId } = data;

    // Create therapy session room
    const sessionRoom = `therapy:${appointmentId}`;
    socket.join(sessionRoom);

    // Notify therapist
    this.io?.to(`user:${therapistId}`).emit('session:request', {
      appointmentId,
      clientId: socket.userId,
      timestamp: new Date(),
    });

    // Update appointment status
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  private async handleSessionEnd(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    const { appointmentId } = data;
    const sessionRoom = `therapy:${appointmentId}`;

    // Notify all participants
    this.io?.to(sessionRoom).emit('session:ended', {
      appointmentId,
      timestamp: new Date(),
    });

    // Leave room
    socket.leave(sessionRoom);

    // Update appointment
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'COMPLETED' },
    });
  }

  private async handleSessionUpdate(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    const { appointmentId, update } = data;
    const sessionRoom = `therapy:${appointmentId}`;

    // Broadcast update to session participants
    socket.to(sessionRoom).emit('session:update', {
      appointmentId,
      update,
      timestamp: new Date(),
    });
  }

  private async handleCrisisAlert(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    try {
      const { severity, message, location } = data;

      // Create crisis intervention record
      const intervention = await prisma.crisisIntervention.create({
        data: {
          userId: socket.userId,
          severity,
          initialAssessment: message,
          status: 'ACTIVE',
        },
      });

      // Alert crisis team
      this.io?.to('role:THERAPIST').emit('crisis:new', {
        interventionId: intervention.id,
        userId: socket.userId,
        severity,
        message,
        location,
        timestamp: new Date(),
      });

      // Send immediate response
      socket.emit('crisis:acknowledged', {
        interventionId: intervention.id,
        message: 'Help is on the way. A crisis counselor will connect with you shortly.',
        resources: await this.getCrisisResources(severity),
      });

      // Audit critical event
      await audit.logSuccess(
        'CRISIS_ALERT',
        'CrisisIntervention',
        intervention.id,
        { severity },
        socket.userId
      );
    } catch (error) {
      console.error('Crisis alert error:', error);
      socket.emit('error', { message: 'Failed to process crisis alert' });
    }
  }

  private async handleCrisisResponse(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    const { interventionId, response } = data;

    // Verify responder is therapist
    if (socket.userRole !== 'THERAPIST') {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    // Update intervention
    await prisma.crisisIntervention.update({
      where: { id: interventionId },
      data: {
        responderId: socket.userId,
        interventionNotes: response,
        status: 'IN_PROGRESS',
      },
    });

    // Notify user in crisis
    const intervention = await prisma.crisisIntervention.findUnique({
      where: { id: interventionId },
    });

    if (intervention) {
      this.io?.to(`user:${intervention.userId}`).emit('crisis:responder', {
        interventionId,
        therapistId: socket.userId,
        message: 'A crisis counselor has connected with you.',
      });
    }
  }

  private async handleGroupJoin(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    const { groupId } = data;
    
    // Verify membership
    const isMember = await this.checkGroupMembership(socket.userId, groupId);
    if (!isMember) {
      socket.emit('error', { message: 'Not a member of this group' });
      return;
    }

    socket.join(`group:${groupId}`);
    
    // Notify group
    socket.to(`group:${groupId}`).emit('group:member_joined', {
      userId: socket.userId,
      groupId,
    });
  }

  private async handleGroupLeave(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    const { groupId } = data;
    socket.leave(`group:${groupId}`);

    socket.to(`group:${groupId}`).emit('group:member_left', {
      userId: socket.userId,
      groupId,
    });
  }

  private async handleGroupMessage(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return;

    const { groupId, message } = data;

    // Verify membership
    const isMember = await this.checkGroupMembership(socket.userId, groupId);
    if (!isMember) {
      socket.emit('error', { message: 'Not a member' });
      return;
    }

    // Broadcast to group
    this.io?.to(`group:${groupId}`).emit('group:message', {
      groupId,
      userId: socket.userId,
      message,
      timestamp: new Date(),
    });
  }

  private startHeartbeat() {
    setInterval(() => {
      this.presence.forEach((data, userId) => {
        const idle = Date.now() - data.lastActivity.getTime();
        if (idle > this.IDLE_TIMEOUT && data.status === 'online') {
          this.presence.set(userId, { ...data, status: 'away' });
          this.io?.emit('presence:update', {
            userId,
            status: 'away',
            timestamp: new Date(),
          });
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  // Helper methods
  private async verifySession(token: string): Promise<any> {
    // Implement session verification logic
    // This would integrate with NextAuth or your auth system
    return null;
  }

  private async checkConversationAccess(userId: string, conversationId: string): Promise<boolean> {
    const participant = await prisma.conversationParticipant.findFirst({
      where: { userId, conversationId },
    });
    return !!participant;
  }

  private async checkGroupMembership(userId: string, groupId: string): Promise<boolean> {
    const member = await prisma.groupMember.findFirst({
      where: { userId, groupId, status: 'ACTIVE' },
    });
    return !!member;
  }

  private async getRecentMessages(conversationId: string): Promise<any[]> {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return messages.reverse();
  }

  private async sendPendingNotifications(socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    const unreadMessages = await prisma.message.findMany({
      where: {
        conversation: {
          participants: {
            some: { userId: socket.userId },
          },
        },
        NOT: {
          readReceipts: {
            some: { userId: socket.userId },
          },
        },
      },
      take: 20,
    });

    if (unreadMessages.length > 0) {
      socket.emit('notifications:unread', {
        messages: unreadMessages,
        count: unreadMessages.length,
      });
    }
  }

  private async sendPushNotifications(conversationId: string, senderId: string, content: string) {
    // Implement push notification logic
    // This would integrate with FCM, APNS, or web push
  }

  private async getCrisisResources(severity: string): Promise<any[]> {
    return [
      { type: 'hotline', number: '988', description: 'Suicide & Crisis Lifeline' },
      { type: 'text', number: '741741', description: 'Crisis Text Line' },
      { type: 'chat', url: 'https://suicidepreventionlifeline.org/chat', description: 'Online Chat' },
    ];
  }

  // Public methods for external use
  public sendToUser(userId: string, event: string, data: any) {
    this.io?.to(`user:${userId}`).emit(event, data);
  }

  public sendToRole(role: string, event: string, data: any) {
    this.io?.to(`role:${role}`).emit(event, data);
  }

  public broadcastToAll(event: string, data: any) {
    this.io?.emit(event, data);
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.presence.entries())
      .filter(([_, data]) => data.status === 'online')
      .map(([userId]) => userId);
  }

  public getUserPresence(userId: string): PresenceData | undefined {
    return this.presence.get(userId);
  }
}

export const websocketServer = new WebSocketServer();