/**
 * WebSocket Message Type Definitions
 * Strong typing for real-time communication
 */

// Base WebSocket message structure
export interface BaseWebSocketMessage {
  type: string;
  timestamp: number;
  userId?: string;
}

// Presence-related messages
export interface PresenceUpdateMessage extends BaseWebSocketMessage {
  type: 'presence_update';
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: Date;
}

// Messaging-related messages
export interface ChatMessage extends BaseWebSocketMessage {
  type: 'message';
  conversationId: string;
  content: string;
  senderId: string;
  recipientId?: string;
  messageType: 'text' | 'file' | 'image' | 'system';
  metadata?: Record<string, unknown>;
}

export interface MessageReadMessage extends BaseWebSocketMessage {
  type: 'message_read';
  messageId: string;
  conversationId: string;
  readBy: string;
  readAt: Date;
}

// Conversation management
export interface JoinConversationMessage extends BaseWebSocketMessage {
  type: 'join_conversation';
  conversationId: string;
}

export interface LeaveConversationMessage extends BaseWebSocketMessage {
  type: 'leave_conversation';
  conversationId: string;
}

// Session-related messages
export interface SessionStartMessage extends BaseWebSocketMessage {
  type: 'session_start';
  appointmentId: string;
  participantIds: string[];
  sessionType: 'therapy' | 'group' | 'crisis';
}

export interface SessionEndMessage extends BaseWebSocketMessage {
  type: 'session_end';
  appointmentId: string;
  duration: number;
  endedBy: string;
}

export interface SessionUpdateMessage extends BaseWebSocketMessage {
  type: 'session_update';
  appointmentId: string;
  updateType: 'participant_joined' | 'participant_left' | 'status_changed';
  data: Record<string, unknown>;
}

// Crisis-related messages
export interface CrisisAlertMessage extends BaseWebSocketMessage {
  type: 'crisis_alert';
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
  interventionId: string;
  triggerEvent?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface CrisisResponseMessage extends BaseWebSocketMessage {
  type: 'crisis_response';
  interventionId: string;
  responderId: string;
  responseType: 'acknowledged' | 'dispatched' | 'arrived' | 'resolved';
  notes?: string;
  eta?: number;
}

// Group-related messages
export interface GroupJoinMessage extends BaseWebSocketMessage {
  type: 'group_join';
  groupId: string;
  userRole: 'facilitator' | 'participant';
}

export interface GroupLeaveMessage extends BaseWebSocketMessage {
  type: 'group_leave';
  groupId: string;
}

export interface GroupMessage extends BaseWebSocketMessage {
  type: 'group_message';
  groupId: string;
  content: string;
  senderId: string;
  messageType: 'text' | 'announcement' | 'system';
}

// Union type for all possible WebSocket messages
export type WebSocketMessage =
  | PresenceUpdateMessage
  | ChatMessage
  | MessageReadMessage
  | JoinConversationMessage
  | LeaveConversationMessage
  | SessionStartMessage
  | SessionEndMessage
  | SessionUpdateMessage
  | CrisisAlertMessage
  | CrisisResponseMessage
  | GroupJoinMessage
  | GroupLeaveMessage
  | GroupMessage;

// Socket authentication
export interface AuthenticatedSocket {
  id: string;
  userId: string;
  userRole: string;
  emit: (event: string, data: unknown) => void;
  join: (room: string) => void;
  leave: (room: string) => void;
  disconnect: () => void;
}

// Socket rooms management
export interface SocketRoom {
  id: string;
  type: 'conversation' | 'session' | 'group' | 'crisis';
  participants: Set<string>;
  metadata?: Record<string, unknown>;
}
