'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CrisisTimeoutWarningProps {
  timeoutSeconds: number;
  warningThresholds?: number[]; // Seconds before timeout to show warnings
  onTimeout: () => void;
  onExtend?: () => void;
  allowExtension?: boolean;
  audioWarning?: boolean;
  className?: string;
}

export const CrisisTimeoutWarning: React.FC<CrisisTimeoutWarningProps> = ({
  timeoutSeconds,
  warningThresholds = [120, 60, 30, 10],
  onTimeout,
  onExtend,
  allowExtension = true,
  audioWarning = true,
  className = ''
}) => {
  const [timeRemaining, setTimeRemaining] = useState(timeoutSeconds);
  const [showWarning, setShowWarning] = useState(false);
  const [warningLevel, setWarningLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [isFlashing, setIsFlashing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedWarning = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Create audio element for warnings
    if (audioWarning && typeof window !== 'undefined') {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGHzfPTgjMGHm7A7+OZURE');
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        
        // Check warning thresholds
        warningThresholds.forEach(threshold => {
          if (newTime === threshold && !hasPlayedWarning.current.has(threshold)) {
            hasPlayedWarning.current.add(threshold);
            triggerWarning(threshold);
          }
        });

        // Determine warning level
        if (newTime <= 10) {
          setWarningLevel('critical');
          setIsFlashing(true);
        } else if (newTime <= 30) {
          setWarningLevel('high');
          setIsFlashing(newTime % 2 === 0);
        } else if (newTime <= 60) {
          setWarningLevel('medium');
        } else if (newTime <= 120) {
          setWarningLevel('low');
        }

        // Show persistent warning below 120 seconds
        if (newTime <= 120) {
          setShowWarning(true);
        }

        // Trigger timeout
        if (newTime <= 0) {
          clearInterval(timer);
          onTimeout();
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [timeoutSeconds, warningThresholds, onTimeout, audioWarning]);

  const triggerWarning = (threshold: number) => {
    // Visual warning
    setShowWarning(true);
    
    // Audio warning
    if (audioWarning && audioRef.current) {
      audioRef.current.play().catch(e => {
        console.warn('Audio warning failed:', e);
      });
    }

    // Vibration on mobile (if supported)
    if ('vibrate' in navigator) {
      if (threshold <= 30) {
        navigator.vibrate([200, 100, 200, 100, 200]); // Critical pattern
      } else {
        navigator.vibrate([200, 100, 200]); // Warning pattern
      }
    }

    // Auto-hide warning after 5 seconds for non-critical warnings
    if (threshold > 30) {
      setTimeout(() => {
        if (timeRemaining > 30) {
          setShowWarning(false);
        }
      }, 5000);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWarningStyles = () => {
    const baseStyles = 'fixed top-4 right-4 z-50 max-w-sm w-full shadow-2xl rounded-lg transition-all duration-300';
    
    switch (warningLevel) {
      case 'critical':
        return `${baseStyles} bg-red-600 text-white ${isFlashing ? 'animate-pulse ring-4 ring-red-300' : ''}`;
      case 'high':
        return `${baseStyles} bg-orange-500 text-white ${isFlashing ? 'animate-pulse' : ''}`;
      case 'medium':
        return `${baseStyles} bg-yellow-500 text-white`;
      case 'low':
        return `${baseStyles} bg-blue-500 text-white`;
      default:
        return baseStyles;
    }
  };

  const handleExtend = () => {
    if (onExtend) {
      onExtend();
      setTimeRemaining(prev => prev + 300); // Add 5 minutes
      setShowWarning(false);
      hasPlayedWarning.current.clear();
    }
  };

  if (!showWarning) return null;

  return (
    <>
      {/* Warning Modal */}
      <div
        className={getWarningStyles()}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        aria-label={`Session timeout warning: ${formatTime(timeRemaining)} remaining`}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon 
                className={`h-6 w-6 ${isFlashing ? 'animate-bounce' : ''}`} 
                aria-hidden="true" 
              />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-bold">
                {warningLevel === 'critical' ? 'CRITICAL: Session Ending!' : 
                 warningLevel === 'high' ? 'Session Ending Soon!' :
                 'Session Timeout Warning'}
              </h3>
              <div className="mt-2 text-sm">
                <p className="font-semibold text-xl">
                  Time remaining: {formatTime(timeRemaining)}
                </p>
                <p className="mt-1 opacity-90">
                  {warningLevel === 'critical' 
                    ? 'Your session is about to expire. Please save your work immediately!'
                    : 'Your session will timeout due to inactivity.'}
                </p>
              </div>
              
              {allowExtension && onExtend && (
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={handleExtend}
                    className="flex-1 px-4 py-2 bg-white text-gray-900 font-semibold rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 transition-colors"
                    aria-label="Extend session by 5 minutes"
                  >
                    Extend Session
                  </button>
                  <button
                    onClick={() => setShowWarning(false)}
                    className="px-3 py-2 bg-white/20 rounded-md hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                    aria-label="Dismiss warning"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visual progress bar */}
        <div className="h-2 bg-black/20 rounded-b-lg overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${
              warningLevel === 'critical' ? 'bg-white animate-pulse' :
              warningLevel === 'high' ? 'bg-orange-200' :
              warningLevel === 'medium' ? 'bg-yellow-200' :
              'bg-blue-200'
            }`}
            style={{ width: `${(timeRemaining / timeoutSeconds) * 100}%` }}
          />
        </div>
      </div>

      {/* Full screen overlay for critical warnings */}
      {warningLevel === 'critical' && (
        <div 
          className="fixed inset-0 bg-red-900/20 backdrop-blur-sm z-40 pointer-events-none animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Persistent countdown timer */}
      {timeRemaining <= 60 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`
            px-4 py-2 rounded-full font-bold text-lg
            ${warningLevel === 'critical' ? 'bg-red-600 text-white animate-bounce' :
              warningLevel === 'high' ? 'bg-orange-500 text-white' :
              'bg-yellow-500 text-white'}
          `}>
            {formatTime(timeRemaining)}
          </div>
        </div>
      )}
    </>
  );
};

export default CrisisTimeoutWarning;