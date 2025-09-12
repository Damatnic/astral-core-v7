'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { logError } from '../lib/logger';
import { logSystemEvent } from '../lib/notification-logger';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

type WebSocketContextType = ReturnType<typeof useWebSocket>;

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { data: session } = useSession();
  const websocket = useWebSocket({
    autoConnect: !!session?.user,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000
  });

  // Handle connection state changes
  useEffect(() => {
    if (websocket.isConnected) {
      logSystemEvent('websocket' as const, 'Connected to real-time server');
    } else if (websocket.connectionError) {
      logError('WebSocket error', websocket.connectionError, 'WebSocketProvider');
    }
  }, [websocket.isConnected, websocket.connectionError]);

  // Handle notifications
  useEffect(() => {
    if (!websocket.on) return;

    const unsubscribe = websocket.on('notification:new', (notification: unknown) => {
      const data = notification as Record<string, unknown>;
      // Show toast notification
      switch (data?.['type']) {
        case 'message':
          toast(`New message from ${data['senderName'] || 'Unknown'}`, {
            icon: '💬',
            duration: 4000
          });
          break;
        case 'appointment':
          toast(`Appointment reminder: ${data['message'] || 'Upcoming appointment'}`, {
            icon: '📅',
            duration: 6000
          });
          break;
        case 'alert':
          toast.error(String(data['message'] || 'Alert notification'), {
            icon: '⚠️',
            duration: 8000
          });
          break;
        default:
          toast(String(data?.['message'] || 'New notification'), {
            duration: 4000
          });
      }
    });

    return unsubscribe;
  }, [websocket]);

  // Handle crisis alerts
  useEffect(() => {
    if (!websocket.on) return;

    const unsubscribe = websocket.on('crisis:new', (data: unknown) => {
      const crisisData = data as Record<string, unknown>;
      // For therapists - show crisis alert
      if (session?.user?.role === 'THERAPIST') {
        toast.error(
          `Crisis Alert: User needs immediate assistance (${crisisData['severity'] || 'HIGH'})`,
          {
            duration: 0
          }
        );
      }
    });

    return unsubscribe;
  }, [websocket, session]);

  // Handle session requests (for therapists)
  useEffect(() => {
    if (!websocket.on || session?.user?.role !== 'THERAPIST') return;

    const unsubscribe = websocket.on('session:request', (data: unknown) => {
      const sessionData = data as Record<string, unknown>;
      toast(
        `Session request from client for appointment ${sessionData['appointmentId'] || 'Unknown'}`,
        {
          icon: '🎥',
          duration: 6000
        }
      );
    });

    return unsubscribe;
  }, [websocket, session]);

  return <WebSocketContext.Provider value={websocket}>{children}</WebSocketContext.Provider>;
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}
