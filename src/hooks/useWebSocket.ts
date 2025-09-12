import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { logError, logWarning, logInfo } from '../lib/logger';

interface WebSocketOptions {
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

interface PresenceState {
  onlineUsers: Set<string>;
  userStatuses: Map<string, 'online' | 'away' | 'busy' | 'offline'>;
}

interface TypingState {
  typingUsers: Map<string, Set<string>>;
}

interface WebSocketNotification {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  read?: boolean;
}

interface TherapySessionUpdate {
  status?: 'started' | 'in-progress' | 'ended';
  notes?: string;
  duration?: number;
  participants?: string[];
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0
  });

  const [presence, setPresence] = useState<PresenceState>({
    onlineUsers: new Set(),
    userStatuses: new Map()
  });

  const [typing, setTyping] = useState<TypingState>({
    typingUsers: new Map()
  });

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);

  // Initialize socket connection
  useEffect(() => {
    if (!session?.user || !options.autoConnect) return;

    const socket = io(process.env['NEXT_PUBLIC_WS_URL'] || 'http://localhost:3000', {
      auth: {
        token: session.user.id // In production, use actual session token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: options.reconnectionAttempts || 5,
      reconnectionDelay: options.reconnectionDelay || 1000
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      logInfo('WebSocket connected', 'useWebSocket');
      setConnectionState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null
      }));
    });

    socket.on('disconnect', reason => {
      logInfo(`WebSocket disconnected: ${reason}`, 'useWebSocket');
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        error: reason
      }));
    });

    socket.on('connect_error', error => {
      logError('WebSocket connection error', error, 'useWebSocket');
      setConnectionState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message
      }));
    });

    socket.on('reconnect_attempt', attempt => {
      setConnectionState(prev => ({
        ...prev,
        isConnecting: true,
        reconnectAttempts: attempt
      }));
    });

    // Presence events
    socket.on('presence:online', ({ userId }) => {
      setPresence(prev => ({
        ...prev,
        onlineUsers: new Set([...prev.onlineUsers, userId]),
        userStatuses: new Map(prev.userStatuses).set(userId, 'online')
      }));
    });

    socket.on('presence:offline', ({ userId }) => {
      setPresence(prev => {
        const newOnlineUsers = new Set(prev.onlineUsers);
        newOnlineUsers.delete(userId);
        return {
          ...prev,
          onlineUsers: newOnlineUsers,
          userStatuses: new Map(prev.userStatuses).set(userId, 'offline')
        };
      });
    });

    socket.on('presence:update', ({ userId, status }) => {
      setPresence(prev => ({
        ...prev,
        userStatuses: new Map(prev.userStatuses).set(userId, status)
      }));
    });

    // Typing events
    socket.on('typing:update', ({ conversationId, typingUsers }) => {
      setTyping(prev => ({
        ...prev,
        typingUsers: new Map(prev.typingUsers).set(conversationId, new Set(typingUsers))
      }));
    });

    // Notification events
    socket.on('notifications:unread', ({ messages, count }) => {
      setUnreadCount(count);
      setNotifications(messages);
    });

    socket.on('notification:new', notification => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    // Error handling
    socket.on('error', ({ message }) => {
      logError('WebSocket error', new Error(message), 'useWebSocket');
      setConnectionState(prev => ({
        ...prev,
        error: message
      }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, options.autoConnect, options.reconnectionAttempts, options.reconnectionDelay]);

  // Emit events
  const emit = useCallback((event: string, data?: unknown) => {
    if (!socketRef.current?.connected) {
      logWarning('Socket not connected', 'useWebSocket');
      return;
    }
    socketRef.current.emit(event, data);
  }, []);

  // Subscribe to events
  const on = useCallback((event: string, handler: (data: unknown) => void) => {
    if (!socketRef.current) return;
    socketRef.current.on(event, handler);

    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  // Presence management
  const updatePresence = useCallback(
    (status: 'online' | 'away' | 'busy') => {
      emit('presence:update', { status });
    },
    [emit]
  );

  // Typing indicators
  const startTyping = useCallback(
    (conversationId: string) => {
      emit('typing:start', { conversationId });
    },
    [emit]
  );

  const stopTyping = useCallback(
    (conversationId: string) => {
      emit('typing:stop', { conversationId });
    },
    [emit]
  );

  // Message functions
  const sendMessage = useCallback(
    (conversationId: string, content: string, type = 'text') => {
      emit('message:send', { conversationId, content, type });
    },
    [emit]
  );

  const markMessageRead = useCallback(
    (messageId: string, conversationId: string) => {
      emit('message:read', { messageId, conversationId });
    },
    [emit]
  );

  // Conversation management
  const joinConversation = useCallback(
    (conversationId: string) => {
      emit('conversation:join', { conversationId });
    },
    [emit]
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      emit('conversation:leave', { conversationId });
    },
    [emit]
  );

  // Therapy session functions
  const startTherapySession = useCallback(
    (appointmentId: string, therapistId: string) => {
      emit('session:start', { appointmentId, therapistId });
    },
    [emit]
  );

  const endTherapySession = useCallback(
    (appointmentId: string) => {
      emit('session:end', { appointmentId });
    },
    [emit]
  );

  const updateTherapySession = useCallback(
    (appointmentId: string, update: TherapySessionUpdate) => {
      emit('session:update', { appointmentId, update });
    },
    [emit]
  );

  // Crisis functions
  const sendCrisisAlert = useCallback(
    (severity: string, message: string, location?: string) => {
      emit('crisis:alert', { severity, message, location });
    },
    [emit]
  );

  const respondToCrisis = useCallback(
    (interventionId: string, response: string) => {
      emit('crisis:response', { interventionId, response });
    },
    [emit]
  );

  // Group functions
  const joinGroup = useCallback(
    (groupId: string) => {
      emit('group:join', { groupId });
    },
    [emit]
  );

  const leaveGroup = useCallback(
    (groupId: string) => {
      emit('group:leave', { groupId });
    },
    [emit]
  );

  const sendGroupMessage = useCallback(
    (groupId: string, message: string) => {
      emit('group:message', { groupId, message });
    },
    [emit]
  );

  // Manual connection control
  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
    }
  }, []);

  // Check if user is online
  const isUserOnline = useCallback(
    (userId: string): boolean => {
      return presence.onlineUsers.has(userId);
    },
    [presence.onlineUsers]
  );

  // Get user status
  const getUserStatus = useCallback(
    (userId: string): 'online' | 'away' | 'busy' | 'offline' => {
      return presence.userStatuses.get(userId) || 'offline';
    },
    [presence.userStatuses]
  );

  // Check if users are typing in conversation
  const getTypingUsers = useCallback(
    (conversationId: string): string[] => {
      const users = typing.typingUsers.get(conversationId);
      return users ? Array.from(users) : [];
    },
    [typing.typingUsers]
  );

  return {
    // Connection state
    isConnected: connectionState.isConnected,
    isConnecting: connectionState.isConnecting,
    connectionError: connectionState.error,
    reconnectAttempts: connectionState.reconnectAttempts,

    // Presence
    onlineUsers: Array.from(presence.onlineUsers),
    isUserOnline,
    getUserStatus,
    updatePresence,

    // Typing
    getTypingUsers,
    startTyping,
    stopTyping,

    // Messages
    sendMessage,
    markMessageRead,
    joinConversation,
    leaveConversation,

    // Therapy sessions
    startTherapySession,
    endTherapySession,
    updateTherapySession,

    // Crisis
    sendCrisisAlert,
    respondToCrisis,

    // Groups
    joinGroup,
    leaveGroup,
    sendGroupMessage,

    // Notifications
    unreadCount,
    notifications,

    // Core functions
    emit,
    on,
    connect,
    disconnect,

    // Socket instance (for advanced use)
    socket: socketRef.current
  };
}

// Note: For app-wide WebSocket connection, use a context provider
// instead of this singleton pattern which violates React hooks rules
