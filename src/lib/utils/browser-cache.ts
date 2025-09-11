/**
 * Browser-side caching utilities for Astral Core v7
 * Manages service worker registration and cache operations
 */

export interface CacheManagerOptions {
  enableServiceWorker?: boolean;
  enableLocalStorage?: boolean;
  enableSessionStorage?: boolean;
  cachePrefix?: string;
}

export class BrowserCacheManager {
  private static instance: BrowserCacheManager;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private options: CacheManagerOptions;

  constructor(options: CacheManagerOptions = {}) {
    this.options = {
      enableServiceWorker: true,
      enableLocalStorage: true,
      enableSessionStorage: true,
      cachePrefix: 'astral-core-v7',
      ...options,
    };
  }

  static getInstance(options?: CacheManagerOptions): BrowserCacheManager {
    if (!BrowserCacheManager.instance) {
      BrowserCacheManager.instance = new BrowserCacheManager(options);
    }
    return BrowserCacheManager.instance;
  }

  /**
   * Initialize the cache manager
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (this.options.enableServiceWorker && 'serviceWorker' in navigator) {
      await this.registerServiceWorker();
    }

    this.setupCacheInvalidation();
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always check for updates
      });

      console.log('Service Worker registered successfully');

      // Handle service worker updates
      this.serviceWorkerRegistration.addEventListener('updatefound', () => {
        const newWorker = this.serviceWorkerRegistration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              this.handleServiceWorkerUpdate();
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * Handle service worker updates
   */
  private handleServiceWorkerUpdate(): void {
    // Notify user about update availability
    if (this.serviceWorkerRegistration?.waiting) {
      const shouldUpdate = confirm(
        'A new version of the application is available. Would you like to update now?'
      );

      if (shouldUpdate) {
        this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, payload } = event.data;

    switch (type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated:', payload);
        break;
      case 'OFFLINE_READY':
        console.log('Application ready for offline use');
        break;
      default:
        console.log('Service Worker message:', type, payload);
    }
  }

  /**
   * Set up cache invalidation strategies
   */
  private setupCacheInvalidation(): void {
    // Listen for storage events to synchronize cache across tabs
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith(this.options.cachePrefix!)) {
        this.handleStorageChange(event);
      }
    });

    // Clear cache on version mismatch
    this.checkVersionMismatch();
  }

  /**
   * Handle storage changes across tabs
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === `${this.options.cachePrefix}-cache-invalidate`) {
      const invalidateKeys = event.newValue ? JSON.parse(event.newValue) : [];
      this.invalidateKeys(invalidateKeys);
    }
  }

  /**
   * Check for version mismatches and clear cache if needed
   */
  private checkVersionMismatch(): void {
    const currentVersion = process.env['NEXT_PUBLIC_APP_VERSION'] || '1.0.0';
    const storedVersion = localStorage.getItem(`${this.options.cachePrefix}-version`);

    if (storedVersion && storedVersion !== currentVersion) {
      console.log('Version mismatch detected, clearing cache');
      this.clearAllCache();
    }

    localStorage.setItem(`${this.options.cachePrefix}-version`, currentVersion);
  }

  /**
   * Cache data in localStorage with expiration
   */
  setLocalCache(key: string, data: unknown, expirationMinutes = 60): void {
    if (!this.options.enableLocalStorage) return;

    try {
      const item = {
        data,
        timestamp: Date.now(),
        expiration: Date.now() + (expirationMinutes * 60 * 1000),
      };

      localStorage.setItem(`${this.options.cachePrefix}-${key}`, JSON.stringify(item));
    } catch (error) {
      console.error('Failed to set local cache:', error);
    }
  }

  /**
   * Get data from localStorage cache
   */
  getLocalCache<T>(key: string): T | null {
    if (!this.options.enableLocalStorage) return null;

    try {
      const stored = localStorage.getItem(`${this.options.cachePrefix}-${key}`);
      if (!stored) return null;

      const item = JSON.parse(stored);
      
      // Check expiration
      if (Date.now() > item.expiration) {
        localStorage.removeItem(`${this.options.cachePrefix}-${key}`);
        return null;
      }

      return item.data;
    } catch (error) {
      console.error('Failed to get local cache:', error);
      return null;
    }
  }

  /**
   * Cache data in sessionStorage
   */
  setSessionCache(key: string, data: unknown): void {
    if (!this.options.enableSessionStorage) return;

    try {
      sessionStorage.setItem(`${this.options.cachePrefix}-${key}`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to set session cache:', error);
    }
  }

  /**
   * Get data from sessionStorage cache
   */
  getSessionCache<T>(key: string): T | null {
    if (!this.options.enableSessionStorage) return null;

    try {
      const stored = sessionStorage.getItem(`${this.options.cachePrefix}-${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get session cache:', error);
      return null;
    }
  }

  /**
   * Invalidate specific cache keys
   */
  invalidateKeys(keys: string[]): void {
    keys.forEach(key => {
      localStorage.removeItem(`${this.options.cachePrefix}-${key}`);
      sessionStorage.removeItem(`${this.options.cachePrefix}-${key}`);
    });

    // Notify service worker to clear cache
    if (this.serviceWorkerRegistration?.active) {
      this.serviceWorkerRegistration.active.postMessage({
        type: 'CLEAR_CACHE',
        payload: { keys }
      });
    }
  }

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    // Clear localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.options.cachePrefix!)) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(this.options.cachePrefix!)) {
        sessionStorage.removeItem(key);
      }
    });

    // Clear service worker cache
    if (this.serviceWorkerRegistration?.active) {
      this.serviceWorkerRegistration.active.postMessage({
        type: 'CLEAR_CACHE'
      });
    }

    // Clear browser cache if possible
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    }
  }

  /**
   * Preload URLs for caching
   */
  preloadUrls(urls: string[]): void {
    if (this.serviceWorkerRegistration?.active) {
      this.serviceWorkerRegistration.active.postMessage({
        type: 'CACHE_URLS',
        payload: { urls }
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    localStorageSize: number;
    sessionStorageSize: number;
    serviceWorkerCacheSize?: number;
  }> {
    const stats = {
      localStorageSize: 0,
      sessionStorageSize: 0,
      serviceWorkerCacheSize: 0,
    };

    // Calculate localStorage size
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.options.cachePrefix!)) {
        stats.localStorageSize += localStorage.getItem(key)?.length || 0;
      }
    });

    // Calculate sessionStorage size
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(this.options.cachePrefix!)) {
        stats.sessionStorageSize += sessionStorage.getItem(key)?.length || 0;
      }
    });

    // Estimate service worker cache size (if available)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        let totalSize = 0;
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
            }
          }
        }
        
        stats.serviceWorkerCacheSize = totalSize;
      } catch (error) {
        console.error('Failed to calculate service worker cache size:', error);
      }
    }

    return stats;
  }
}

// Export singleton instance
export const cacheManager = BrowserCacheManager.getInstance();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  cacheManager.initialize().catch(console.error);
}