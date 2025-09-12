'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface LiveMessage {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
  persistent?: boolean;
}

interface AriaLiveContextType {
  announce: (message: string, priority?: 'polite' | 'assertive', persistent?: boolean) => void;
  announceStatus: (message: string) => void;
  announceError: (message: string) => void;
  announceSuccess: (message: string) => void;
  clearMessages: (priority?: 'polite' | 'assertive') => void;
  messages: LiveMessage[];
}

const AriaLiveContext = createContext<AriaLiveContextType | null>(null);

interface AriaLiveProviderProps {
  children: React.ReactNode;
  maxMessages?: number;
  messageTimeout?: number;
  duplicateTimeout?: number;
}

export const AriaLiveProvider: React.FC<AriaLiveProviderProps> = ({
  children,
  maxMessages = 10,
  messageTimeout = 5000,
  duplicateTimeout = 1000
}) => {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const recentMessages = useRef<Set<string>>(new Set());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Announce message to screen readers
  const announce = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite',
    persistent: boolean = false
  ) => {
    if (!message.trim()) return;

    // Prevent duplicate messages within short timeframe
    const messageKey = `${message}-${priority}`;
    if (recentMessages.current.has(messageKey)) {
      return;
    }

    recentMessages.current.add(messageKey);
    setTimeout(() => {
      recentMessages.current.delete(messageKey);
    }, duplicateTimeout);

    const id = `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: LiveMessage = {
      id,
      message,
      priority,
      timestamp: Date.now(),
      persistent
    };

    setMessages(prev => {
      // Remove oldest messages if exceeding max
      const filtered = prev.slice(-(maxMessages - 1));
      return [...filtered, newMessage];
    });

    // Auto-remove non-persistent messages
    if (!persistent) {
      const timeout = setTimeout(() => {
        setMessages(prev => prev.filter(msg => msg.id !== id));
        timeoutRefs.current.delete(id);
      }, messageTimeout);
      
      timeoutRefs.current.set(id, timeout);
    }
  }, [maxMessages, messageTimeout, duplicateTimeout]);

  // Convenience methods for different message types
  const announceStatus = useCallback((message: string) => {
    announce(message, 'polite');
  }, [announce]);

  const announceError = useCallback((message: string) => {
    announce(`Error: ${message}`, 'assertive', true);
  }, [announce]);

  const announceSuccess = useCallback((message: string) => {
    announce(`Success: ${message}`, 'polite');
  }, [announce]);

  // Clear messages
  const clearMessages = useCallback((priority?: 'polite' | 'assertive') => {
    if (priority) {
      setMessages(prev => {
        const toRemove = prev.filter(msg => msg.priority === priority);
        toRemove.forEach(msg => {
          const timeout = timeoutRefs.current.get(msg.id);
          if (timeout) {
            clearTimeout(timeout);
            timeoutRefs.current.delete(msg.id);
          }
        });
        return prev.filter(msg => msg.priority !== priority);
      });
    } else {
      // Clear all
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
      setMessages([]);
    }
  }, []);

  const contextValue: AriaLiveContextType = {
    announce,
    announceStatus,
    announceError,
    announceSuccess,
    clearMessages,
    messages
  };

  return (
    <AriaLiveContext.Provider value={contextValue}>
      {children}
      <AriaLiveRegions messages={messages} />
    </AriaLiveContext.Provider>
  );
};

// Live regions component
interface AriaLiveRegionsProps {
  messages: LiveMessage[];
}

const AriaLiveRegions: React.FC<AriaLiveRegionsProps> = ({ messages }) => {
  const politeMessages = messages.filter(msg => msg.priority === 'polite');
  const assertiveMessages = messages.filter(msg => msg.priority === 'assertive');

  return (
    <>
      {/* Polite live region */}
      <div
        id="aria-live-polite"
        aria-live="polite"
        aria-atomic="false"
        role="status"
        className="sr-only"
        aria-label="Status messages"
      >
        {politeMessages.map(msg => (
          <div key={msg.id}>{msg.message}</div>
        ))}
      </div>

      {/* Assertive live region */}
      <div
        id="aria-live-assertive"
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        className="sr-only"
        aria-label="Important alerts"
      >
        {assertiveMessages.map(msg => (
          <div key={msg.id}>{msg.message}</div>
        ))}
      </div>

      {/* Log region for form validation messages */}
      <div
        id="aria-live-log"
        aria-live="polite"
        aria-atomic="false"
        role="log"
        className="sr-only"
        aria-label="Form validation messages"
      />

      {/* Timer region for time-sensitive information */}
      <div
        id="aria-live-timer"
        aria-live="off"
        aria-atomic="true"
        role="timer"
        className="sr-only"
        aria-label="Timer updates"
      />
    </>
  );
};

// Hook to use live regions
export const useAriaLive = (): AriaLiveContextType => {
  const context = useContext(AriaLiveContext);
  if (!context) {
    throw new Error('useAriaLive must be used within an AriaLiveProvider');
  }
  return context;
};

// Hook for form announcements
export const useFormAnnouncements = () => {
  const { announce } = useAriaLive();

  const announceValidation = useCallback((fieldName: string, error?: string) => {
    const logRegion = document.getElementById('aria-live-log');
    if (logRegion) {
      if (error) {
        logRegion.textContent = `${fieldName}: ${error}`;
      } else {
        logRegion.textContent = `${fieldName} is valid`;
      }
    }
  }, []);

  const announceFormSubmit = useCallback((success: boolean, message?: string) => {
    if (success) {
      announce(message || 'Form submitted successfully', 'polite');
    } else {
      announce(message || 'Form submission failed', 'assertive');
    }
  }, [announce]);

  return {
    announceValidation,
    announceFormSubmit
  };
};

// Hook for navigation announcements
export const useNavigationAnnouncements = () => {
  const { announce } = useAriaLive();

  const announcePageChange = useCallback((pageName: string) => {
    announce(`Navigated to ${pageName}`, 'polite');
  }, [announce]);

  const announceLoading = useCallback((isLoading: boolean, resource?: string) => {
    if (isLoading) {
      announce(`Loading${resource ? ` ${resource}` : ''}...`, 'polite');
    } else {
      announce(`Finished loading${resource ? ` ${resource}` : ''}`, 'polite');
    }
  }, [announce]);

  const announceFocus = useCallback((elementDescription: string) => {
    announce(`Focused on ${elementDescription}`, 'polite');
  }, [announce]);

  return {
    announcePageChange,
    announceLoading,
    announceFocus
  };
};

// Hook for timer/countdown announcements
export const useTimerAnnouncements = () => {
  const intervalRef = useRef<NodeJS.Timeout>();

  const startCountdown = useCallback((
    duration: number,
    onTick?: (remaining: number) => void,
    onComplete?: () => void,
    announceIntervals: number[] = [60, 30, 10, 5, 4, 3, 2, 1]
  ) => {
    const timerRegion = document.getElementById('aria-live-timer');
    if (!timerRegion) return;

    let remaining = duration;

    const updateTimer = () => {
      remaining--;
      onTick?.(remaining);

      if (announceIntervals.includes(remaining)) {
        timerRegion.textContent = `${remaining} seconds remaining`;
      }

      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        timerRegion.textContent = 'Time expired';
        onComplete?.();
      }
    };

    intervalRef.current = setInterval(updateTimer, 1000);
    timerRegion.setAttribute('aria-live', 'assertive');

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const stopCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    const timerRegion = document.getElementById('aria-live-timer');
    if (timerRegion) {
      timerRegion.setAttribute('aria-live', 'off');
      timerRegion.textContent = '';
    }
  }, []);

  return {
    startCountdown,
    stopCountdown
  };
};

// Component for visual live region debugging
interface LiveRegionDebuggerProps {
  enabled?: boolean;
  className?: string;
}

export const LiveRegionDebugger: React.FC<LiveRegionDebuggerProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  className = ''
}) => {
  const { messages } = useAriaLive();

  if (!enabled) return null;

  return (
    <div className={`
      fixed bottom-4 left-4 z-50 max-w-sm
      bg-black text-white text-xs rounded-lg shadow-lg
      max-h-32 overflow-y-auto
      ${className}
    `}>
      <div className="px-3 py-2 border-b border-gray-700">
        <strong>ARIA Live Messages</strong>
      </div>
      <div className="px-3 py-2 space-y-1">
        {messages.length === 0 ? (
          <div className="text-gray-400">No messages</div>
        ) : (
          messages.slice(-5).map(msg => (
            <div key={msg.id} className="border-l-2 border-blue-500 pl-2">
              <div className="flex items-center gap-2">
                <span className={`
                  px-1 rounded text-[10px] uppercase
                  ${msg.priority === 'assertive' ? 'bg-red-600' : 'bg-blue-600'}
                `}>
                  {msg.priority}
                </span>
                <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="mt-1">{msg.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AriaLiveProvider;