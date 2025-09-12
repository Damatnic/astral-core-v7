'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  WifiIcon, 
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface OfflineIndicatorProps {
  position?: 'top' | 'bottom';
  showDetails?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
  onReconnect?: () => void;
  className?: string;
}

interface SyncStatus {
  pending: number;
  syncing: boolean;
  lastSync: Date | null;
  error: string | null;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  position = 'bottom',
  showDetails = true,
  autoHide = true,
  autoHideDelay = 5000,
  onReconnect,
  className = ''
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pending: 0,
    syncing: false,
    lastSync: null,
    error: null
  });

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (!online) {
        setWasOffline(true);
      } else if (wasOffline) {
        setShowReconnected(true);
        onReconnect?.();
        
        // Auto-hide reconnection message
        if (autoHide) {
          setTimeout(() => {
            setShowReconnected(false);
            setWasOffline(false);
          }, autoHideDelay);
        }
      }
    };

    // Initial check
    updateOnlineStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [wasOffline, autoHide, autoHideDelay, onReconnect]);

  // Monitor connection speed
  useEffect(() => {
    if (!isOnline || !('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    
    const updateConnectionSpeed = () => {
      if (connection.effectiveType) {
        switch (connection.effectiveType) {
          case 'slow-2g':
          case '2g':
            setConnectionSpeed('slow');
            break;
          case '3g':
            setConnectionSpeed('normal');
            break;
          case '4g':
            setConnectionSpeed('fast');
            break;
          default:
            setConnectionSpeed('normal');
        }
      }
    };

    updateConnectionSpeed();
    connection.addEventListener('change', updateConnectionSpeed);

    return () => {
      connection.removeEventListener('change', updateConnectionSpeed);
    };
  }, [isOnline]);

  // Simulate sync queue (in production, this would track actual pending operations)
  useEffect(() => {
    if (!isOnline && typeof window !== 'undefined') {
      // Count pending operations from localStorage
      const pendingOps = localStorage.getItem('pendingOperations');
      if (pendingOps) {
        try {
          const ops = JSON.parse(pendingOps);
          setSyncStatus(prev => ({ ...prev, pending: ops.length }));
        } catch (e) {
          // Invalid JSON
        }
      }
    }
  }, [isOnline]);

  // Sync pending operations when back online
  const syncPendingOperations = useCallback(async () => {
    if (syncStatus.pending === 0) return;
    
    setSyncStatus(prev => ({ ...prev, syncing: true, error: null }));
    
    try {
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear pending operations
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pendingOperations');
      }
      
      setSyncStatus({
        pending: 0,
        syncing: false,
        lastSync: new Date(),
        error: null
      });
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        error: 'Failed to sync. Will retry automatically.'
      }));
    }
  }, [syncStatus.pending]);

  // Auto-sync when reconnected
  useEffect(() => {
    if (isOnline && wasOffline && syncStatus.pending > 0) {
      syncPendingOperations();
    }
  }, [isOnline, wasOffline, syncStatus.pending, syncPendingOperations]);

  // Don't show anything if online and no pending operations
  if (isOnline && !showReconnected && syncStatus.pending === 0) {
    return null;
  }

  const positionClasses = position === 'top' 
    ? 'top-0 animate-slide-down' 
    : 'bottom-0 animate-slide-up';

  return (
    <>
      {/* Main Indicator */}
      <div 
        className={`
          fixed left-0 right-0 z-50
          ${positionClasses}
          ${className}
        `}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-gray-900 text-white px-4 py-3 shadow-lg">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <WifiIcon className="h-5 w-5 text-yellow-400" />
                <div>
                  <p className="font-medium">You're offline</p>
                  {showDetails && (
                    <p className="text-sm text-gray-300">
                      Changes will be saved locally and synced when you reconnect
                    </p>
                  )}
                </div>
              </div>
              
              {syncStatus.pending > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <CloudArrowUpIcon className="h-4 w-4" />
                  <span>{syncStatus.pending} pending</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reconnected Banner */}
        {isOnline && showReconnected && (
          <div className="bg-green-600 text-white px-4 py-3 shadow-lg">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-5 w-5" />
                <div>
                  <p className="font-medium">Back online</p>
                  {showDetails && syncStatus.pending > 0 && (
                    <p className="text-sm text-green-100">
                      Syncing {syncStatus.pending} pending changes...
                    </p>
                  )}
                </div>
              </div>
              
              {syncStatus.syncing && (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              )}
            </div>
          </div>
        )}

        {/* Slow Connection Warning */}
        {isOnline && connectionSpeed === 'slow' && (
          <div className="bg-yellow-500 text-white px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2 max-w-7xl mx-auto">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <p className="text-sm">Slow connection detected - some features may be limited</p>
            </div>
          </div>
        )}

        {/* Sync Error */}
        {syncStatus.error && (
          <div className="bg-red-600 text-white px-4 py-2 shadow-lg">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <p className="text-sm">{syncStatus.error}</p>
              </div>
              <button
                onClick={syncPendingOperations}
                className="text-sm underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Indicator (minimal) */}
      {!isOnline && !showDetails && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-gray-900 text-white rounded-full p-3 shadow-lg flex items-center gap-2">
            <WifiIcon className="h-5 w-5 text-yellow-400" />
            {syncStatus.pending > 0 && (
              <span className="text-sm font-medium pr-1">{syncStatus.pending}</span>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

// Hook for offline status
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOperations, setPendingOperations] = useState<any[]>([]);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    
    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  const queueOperation = useCallback((operation: any) => {
    if (!isOnline) {
      const ops = [...pendingOperations, operation];
      setPendingOperations(ops);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingOperations', JSON.stringify(ops));
      }
      
      return false; // Operation queued
    }
    return true; // Can proceed with operation
  }, [isOnline, pendingOperations]);

  const clearPendingOperations = useCallback(() => {
    setPendingOperations([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pendingOperations');
    }
  }, []);

  return {
    isOnline,
    pendingOperations,
    queueOperation,
    clearPendingOperations
  };
};

export default OfflineIndicator;