'use client';

import React, { useEffect, useState } from 'react';

interface PWAManagerProps {
  children?: React.ReactNode;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Extend ServiceWorkerRegistration to include sync property
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync?: {
    register(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  };
}

export function PWAManager({ children }: PWAManagerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistrationWithSync | null>(null);

  useEffect(() => {
    // Register service worker
    registerServiceWorker();
    
    // Setup online/offline detection
    setupNetworkDetection();
    
    // Setup PWA install prompt
    setupInstallPrompt();
    
    // Check if already installed
    checkIfInstalled();
    
    // Setup push notifications
    setupPushNotifications();
    
    return () => {
      // Cleanup listeners
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        setSwRegistration(registration);
        
        console.log('Service Worker registered successfully:', registration);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                showUpdateAvailable();
              }
            });
          }
        });
        
        // Check for updates
        registration.update();
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  };

  const setupNetworkDetection = () => {
    setIsOnline(navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  };

  const handleOnline = () => {
    setIsOnline(true);
    announceNetworkStatus('back online');
    
    // Trigger background sync when back online
    if (swRegistration?.sync) {
      try {
        swRegistration.sync.register('sync-wellness-data');
        swRegistration.sync.register('sync-journal-entries');
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    }
  };

  const handleOffline = () => {
    setIsOnline(false);
    announceNetworkStatus('offline');
  };

  const setupInstallPrompt = () => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  };

  const handleBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    setInstallPrompt(event as BeforeInstallPromptEvent);
    setIsInstallable(true);
  };

  const checkIfInstalled = () => {
    // Check if running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    
    // iOS detection
    if ((navigator as Navigator & { standalone?: boolean }).standalone) {
      setIsInstalled(true);
    }
  };

  const setupPushNotifications = async () => {
    if (!swRegistration || !('PushManager' in window)) {
      console.log('Push messaging is not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted');
        
        // Subscribe to push notifications
        const vapidKey = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'] || '';
        const applicationServerKey = urlBase64ToUint8Array(vapidKey);
        const subscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer
        });
        
        // Send subscription to server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        
      } else {
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('Failed to setup push notifications:', error);
    }
  };

  const installApp = async () => {
    if (!installPrompt) return;
    
    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA installed');
        setIsInstalled(true);
        announceToScreenReader('App installed successfully');
      }
      
      setInstallPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const showUpdateAvailable = () => {
    // Show update notification
    announceToScreenReader('App update available');
    
    // You could show a toast or modal here
    if (confirm('A new version is available. Update now?')) {
      window.location.reload();
    }
  };

  const announceNetworkStatus = (status: string) => {
    announceToScreenReader(`Connection status: ${status}`);
  };

  const announceToScreenReader = (message: string) => {
    const announcement = document.getElementById('urgent-announcements');
    if (announcement) {
      announcement.textContent = message;
      setTimeout(() => {
        announcement.textContent = '';
      }, 1000);
    }
  };

  // Utility function for VAPID key conversion
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return (
    <>
      {children}
      
      {/* Network Status Indicator */}
      {!isOnline && (
        <div
          className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 z-50"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm font-medium">
            📡 You&apos;re offline. Some features may be limited, but crisis support is still available.
          </p>
        </div>
      )}
      
      {/* Install Prompt */}
      {isInstallable && !isInstalled && (
        <div
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-blue-600 text-white rounded-lg shadow-lg p-4 z-50"
          role="dialog"
          aria-labelledby="install-heading"
        >
          <h3 id="install-heading" className="font-semibold mb-2">
            Install Astral Core
          </h3>
          <p className="text-sm mb-3">
            Install our app for quick access to mental health support, even when offline.
          </p>
          <div className="flex gap-2">
            <button
              onClick={installApp}
              className="bg-white text-blue-600 px-4 py-2 rounded text-sm font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
            >
              Install
            </button>
            <button
              onClick={() => {
                setIsInstallable(false);
                setInstallPrompt(null);
              }}
              className="text-white px-4 py-2 rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
            >
              Later
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Hook for accessing PWA status
export function usePWA() {
  const [isOnline, setIsOnline] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check if installed
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone) {
      setIsInstalled(true);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOnline, isInstalled };
}

// PWA utility functions
export const PWAUtils = {
  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const granted = await navigator.storage.persist();
        console.log('Persistent storage:', granted ? 'granted' : 'denied');
        return granted;
      } catch (error) {
        console.error('Failed to request persistent storage:', error);
        return false;
      }
    }
    return false;
  },

  async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota || 0,
          usage: estimate.usage || 0,
          percentage: estimate.quota ? Math.round((estimate.usage || 0) / estimate.quota * 100) : 0
        };
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
        return null;
      }
    }
    return null;
  },

  async shareContent(data: ShareData) {
    if ('share' in navigator) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        console.error('Web Share failed:', error);
        return false;
      }
    }
    return false;
  }
};