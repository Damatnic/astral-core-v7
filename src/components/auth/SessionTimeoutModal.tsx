'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SessionTimeoutModalProps {
  sessionMaxAge?: number; // Total session time in seconds
  warningTime?: number; // Time before expiry to show warning (seconds)
  onExtend?: () => Promise<void>;
  onSignOut?: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  sessionMaxAge = 1800, // 30 minutes default
  warningTime = 120, // 2 minutes warning
  onExtend,
  onSignOut
}) => {
  const [showModal, setShowModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(warningTime);
  const [isExtending, setIsExtending] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Reset activity timer on user interaction
  const resetActivityTimer = useCallback(() => {
    setLastActivity(Date.now());
    setShowModal(false);
    setTimeRemaining(warningTime);
  }, [warningTime]);

  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (!showModal) {
        resetActivityTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [showModal, resetActivityTimer]);

  // Check for inactivity
  useEffect(() => {
    const checkInactivity = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = Math.floor((now - lastActivity) / 1000);
      
      if (timeSinceActivity >= sessionMaxAge - warningTime && !showModal) {
        setShowModal(true);
        setTimeRemaining(warningTime);
      } else if (timeSinceActivity >= sessionMaxAge) {
        handleSignOut();
      }
    }, 1000);

    return () => clearInterval(checkInactivity);
  }, [lastActivity, sessionMaxAge, warningTime, showModal]);

  // Countdown timer when modal is shown
  useEffect(() => {
    if (!showModal) return;

    const countdown = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSignOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [showModal]);

  const handleSignOut = async () => {
    if (onSignOut) {
      onSignOut();
    } else {
      await signOut({ redirect: true, callbackUrl: '/auth/login' });
    }
  };

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      if (onExtend) {
        await onExtend();
      }
      resetActivityTimer();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to extend session:', error);
    } finally {
      setIsExtending(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!showModal) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        aria-labelledby="timeout-title"
        aria-describedby="timeout-description"
        role="alertdialog"
        aria-modal="true"
      >
        {/* Modal */}
        <div className={`
          relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full
          transform transition-all
          ${timeRemaining <= 30 ? 'animate-pulse ring-4 ring-red-500' : ''}
        `}>
          {/* Warning Header */}
          <div className={`
            px-6 py-4 rounded-t-lg
            ${timeRemaining <= 30 
              ? 'bg-red-600 text-white' 
              : 'bg-yellow-500 text-white'
            }
          `}>
            <div className="flex items-center">
              {timeRemaining <= 30 ? (
                <ExclamationTriangleIcon className="h-8 w-8 mr-3 animate-bounce" />
              ) : (
                <ClockIcon className="h-8 w-8 mr-3" />
              )}
              <div>
                <h2 id="timeout-title" className="text-xl font-bold">
                  Session Timeout Warning
                </h2>
                <p className="text-sm opacity-90">
                  Your session is about to expire
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="text-center mb-6">
              <div className={`
                text-5xl font-bold tabular-nums
                ${timeRemaining <= 30 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}
              `}>
                {formatTime(timeRemaining)}
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Time remaining before automatic sign out
              </p>
            </div>

            <div id="timeout-description" className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>
                You've been inactive for a while. For your security, we'll sign you out automatically when the timer reaches zero.
              </p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                Would you like to continue your session?
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`
                  h-full transition-all duration-1000
                  ${timeRemaining <= 30 
                    ? 'bg-red-600 animate-pulse' 
                    : 'bg-yellow-500'
                  }
                `}
                style={{ width: `${(timeRemaining / warningTime) * 100}%` }}
                role="progressbar"
                aria-valuenow={timeRemaining}
                aria-valuemin={0}
                aria-valuemax={warningTime}
                aria-label="Time remaining"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg flex space-x-3">
            <button
              onClick={handleExtend}
              disabled={isExtending}
              className={`
                flex-1 px-4 py-2 rounded-md font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-offset-2
                ${timeRemaining <= 30
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label="Continue session"
              autoFocus
            >
              {isExtending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Extending...
                </span>
              ) : (
                'Continue Session'
              )}
            </button>
            
            <button
              onClick={handleSignOut}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md font-medium hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              aria-label="Sign out now"
            >
              Sign Out Now
            </button>
          </div>
        </div>
      </div>

      {/* Audio Alert for Screen Readers */}
      <div className="sr-only" role="alert" aria-live="assertive">
        {timeRemaining <= 30 && `Critical: Only ${timeRemaining} seconds until automatic sign out.`}
        {timeRemaining === 60 && 'Warning: One minute until automatic sign out.'}
      </div>
    </>
  );
};

export default SessionTimeoutModal;