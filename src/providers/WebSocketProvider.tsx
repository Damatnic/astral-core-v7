'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { logError } from '@/lib/logger';
import { logSystemEvent } from '@/lib/notification-logger';
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
      logSystemEvent('realtime-connect', 'Connected to real-time server');
    } else if (websocket.connectionError) {
      logError('WebSocket error', websocket.connectionError, 'WebSocketProvider');
    }
  }, [websocket.isConnected, websocket.connectionError]);

  // Handle notifications
  useEffect(() => {
    if (!websocket.on) return;

    const unsubscribe = websocket.on('notification:new', notification => {
      // Show toast notification
      switch (notification.type) {
        case 'message':
          toast(`New message from ${notification.senderName}`, {
            icon: '💬',
            duration: 4000
          });
          break;
        case 'appointment':
          toast(`Appointment reminder: ${notification.message}`, {
            icon: '📅',
            duration: 5000
          });
          break;
        case 'crisis':
          toast.error(notification.message, {
            duration: 0 // Don't auto-dismiss crisis notifications
          });
          break;
        default:
          toast(notification.message, {
            duration: 4000
          });
      }
    });

    return unsubscribe;
  }, [websocket]);

  // Handle crisis alerts
  useEffect(() => {
    if (!websocket.on) return;

    const unsubscribe = websocket.on('crisis:new', data => {
      // For therapists - show crisis alert
      if (session?.user?.role === 'THERAPIST') {
        toast.error(`Crisis Alert: User needs immediate assistance (${data.severity})`, {
          duration: 0,
          action: {
            label: 'Respond',
            onClick: () => {
              // Navigate to crisis response page
              window.location.href = `/crisis/respond/${data.interventionId}`;
            }
          }
        });
      }
    });

    return unsubscribe;
  }, [websocket, session]);

  // Handle session requests (for therapists)
  useEffect(() => {
    if (!websocket.on || session?.user?.role !== 'THERAPIST') return;

    const unsubscribe = websocket.on('session:request', data => {
      toast(`Session request from client for appointment ${data.appointmentId}`, {
        icon: '🎥',
        duration: 6000,
        action: {
          label: 'Join',
          onClick: () => {
            window.location.href = `/therapy/session/${data.appointmentId}`;
          }
        }
      });
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
