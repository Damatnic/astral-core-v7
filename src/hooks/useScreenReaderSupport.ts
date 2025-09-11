
import { useCallback, useRef } from 'react';

export interface ScreenReaderAnnouncement {
  message: string;
  priority?: 'polite' | 'assertive';
  delay?: number;
}

export function useScreenReaderSupport() {
  const announcementTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());

  const announce = useCallback(({ 
    message, 
    priority = 'polite', 
    delay = 0 
  }: ScreenReaderAnnouncement) => {
    const timeout = setTimeout(() => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', priority);
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      
      // Clean up after announcement
      const cleanupTimeout = setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
        announcementTimeouts.current.delete(cleanupTimeout);
      }, 1500);
      
      announcementTimeouts.current.add(cleanupTimeout);
      announcementTimeouts.current.delete(timeout);
    }, delay);
    
    announcementTimeouts.current.add(timeout);
  }, []);

  const announceSuccess = useCallback((message: string) => {
    announce({ 
      message: `Success: ${message}`, 
      priority: 'polite' 
    });
  }, [announce]);

  const announceError = useCallback((message: string) => {
    announce({ 
      message: `Error: ${message}`, 
      priority: 'assertive' 
    });
  }, [announce]);

  const announceWarning = useCallback((message: string) => {
    announce({ 
      message: `Warning: ${message}`, 
      priority: 'assertive' 
    });
  }, [announce]);

  const announcePageLoad = useCallback((pageTitle: string) => {
    announce({ 
      message: `Page loaded: ${pageTitle}. Use heading navigation to explore content.`,
      priority: 'polite',
      delay: 500
    });
  }, [announce]);

  const announceFormValidation = useCallback((fieldName: string, error: string) => {
    announce({ 
      message: `${fieldName} validation error: ${error}`,
      priority: 'assertive'
    });
  }, [announce]);

  // Cleanup function
  const cleanup = useCallback(() => {
    announcementTimeouts.current.forEach(timeout => {
      clearTimeout(timeout);
    });
    announcementTimeouts.current.clear();
  }, []);

  return {
    announce,
    announceSuccess,
    announceError,
    announceWarning,
    announcePageLoad,
    announceFormValidation,
    cleanup
  };
}

// Mental health specific announcements
export function useMentalHealthAnnouncements() {
  const { announce, announceSuccess } = useScreenReaderSupport();

  const announceMoodLogged = useCallback((mood: string, scale: number) => {
    announceSuccess(`Mood logged as ${mood}, ${scale} out of 10. You're taking positive steps for your mental health.`);
  }, [announceSuccess]);

  const announceCrisisSupport = useCallback(() => {
    announce({ 
      message: 'Crisis support activated. You are not alone. Help is available immediately.',
      priority: 'assertive'
    });
  }, [announce]);

  const announceAppointmentScheduled = useCallback((date: string, therapist: string) => {
    announceSuccess(`Appointment scheduled with ${therapist} on ${date}. You've taken an important step.`);
  }, [announceSuccess]);

  return {
    announceMoodLogged,
    announceCrisisSupport,
    announceAppointmentScheduled
  };
}

export default { useScreenReaderSupport, useMentalHealthAnnouncements };