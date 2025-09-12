/**
 * Advanced Caching Strategies
 * Implements multiple caching layers for optimal performance
 */

// Cache configuration
const CACHE_CONFIG = {
  // Default TTL in seconds
  defaultTTL: 300, // 5 minutes
  
  // Cache keys
  keys: {
    USER_PROFILE: 'user_profile:',
    DASHBOARD_DATA: 'dashboard:',
    NOTIFICATIONS: 'notifications:',
    ANALYTICS: 'analytics:',
    SYSTEM_HEALTH: 'health:',
    PERFORMANCE_METRICS: 'perf_metrics:',
    SESSION_DATA: 'session:'
  },
  
  // Cache TTLs by type
  ttl: {
    userProfile: 900, // 15 minutes
    dashboardData: 300, // 5 minutes
    notifications: 60, // 1 minute
    analytics: 1800, // 30 minutes
    systemHealth: 30, // 30 seconds
    performanceMetrics: 120, // 2 minutes
    sessionData: 3600 // 1 hour
  }
};

// In-memory cache with LRU eviction
class MemoryCache {
  private cache = new Map<string, { value: any; expires: number }>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set(key: string, value: any, ttlSeconds?: number): void {
    const expires = Date.now() + (ttlSeconds || CACHE_CONFIG.defaultTTL) * 1000;
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, expires });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [_, item] of this.cache) {
      if (now > item.expires) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      validEntries,
      expiredEntries,
      utilization: (this.cache.size / this.maxSize) * 100
    };
  }
}

// Cache manager with multiple strategies
class CacheManager {
  private memoryCache: MemoryCache;
  private hitCount = 0;
  private missCount = 0;

  constructor() {
    this.memoryCache = new MemoryCache(1000);
    
    // Cleanup expired entries periodically
    setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of (this.memoryCache as any).cache) {
      if (now > item.expires) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  // Generic cache operations
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      this.memoryCache.set(key, value, ttlSeconds);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = this.memoryCache.get(key);
      
      if (value !== null) {
        this.hitCount++;
        return value;
      } else {
        this.missCount++;
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.missCount++;
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = Array.from((this.memoryCache as any).cache.keys());
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      
      keys
        .filter(key => regex.test(key))
        .forEach(key => this.memoryCache.delete(key));
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Cache-aside pattern with fallback
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache first
    let cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch and cache
    try {
      const value = await fetcher();
      await this.set(key, value, ttlSeconds);
      return value;
    } catch (error) {
      console.error('Cache fetch error:', error);
      throw error;
    }
  }

  // Specialized caching methods
  async cacheUserProfile(userId: string, profileData: any): Promise<void> {
    const key = `${CACHE_CONFIG.keys.USER_PROFILE}${userId}`;
    await this.set(key, profileData, CACHE_CONFIG.ttl.userProfile);
  }

  async getUserProfile(userId: string): Promise<any | null> {
    const key = `${CACHE_CONFIG.keys.USER_PROFILE}${userId}`;
    return await this.get(key);
  }

  async cacheDashboardData(userId: string, role: string, data: any): Promise<void> {
    const key = `${CACHE_CONFIG.keys.DASHBOARD_DATA}${role}:${userId}`;
    await this.set(key, data, CACHE_CONFIG.ttl.dashboardData);
  }

  async getDashboardData(userId: string, role: string): Promise<any | null> {
    const key = `${CACHE_CONFIG.keys.DASHBOARD_DATA}${role}:${userId}`;
    return await this.get(key);
  }

  async cacheNotifications(userId: string, notifications: any[]): Promise<void> {
    const key = `${CACHE_CONFIG.keys.NOTIFICATIONS}${userId}`;
    await this.set(key, notifications, CACHE_CONFIG.ttl.notifications);
  }

  async getNotifications(userId: string): Promise<any[] | null> {
    const key = `${CACHE_CONFIG.keys.NOTIFICATIONS}${userId}`;
    return await this.get(key);
  }

  async cacheAnalytics(timeframe: string, data: any): Promise<void> {
    const key = `${CACHE_CONFIG.keys.ANALYTICS}${timeframe}`;
    await this.set(key, data, CACHE_CONFIG.ttl.analytics);
  }

  async getAnalytics(timeframe: string): Promise<any | null> {
    const key = `${CACHE_CONFIG.keys.ANALYTICS}${timeframe}`;
    return await this.get(key);
  }

  async cacheSystemHealth(data: any): Promise<void> {
    const key = CACHE_CONFIG.keys.SYSTEM_HEALTH;
    await this.set(key, data, CACHE_CONFIG.ttl.systemHealth);
  }

  async getSystemHealth(): Promise<any | null> {
    const key = CACHE_CONFIG.keys.SYSTEM_HEALTH;
    return await this.get(key);
  }

  // Cache invalidation helpers
  async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.delete(`${CACHE_CONFIG.keys.USER_PROFILE}${userId}`),
      this.delete(`${CACHE_CONFIG.keys.NOTIFICATIONS}${userId}`),
      this.invalidatePattern(`${CACHE_CONFIG.keys.DASHBOARD_DATA}*:${userId}`)
    ]);
  }

  async invalidateAnalyticsCache(): Promise<void> {
    await this.invalidatePattern(`${CACHE_CONFIG.keys.ANALYTICS}*`);
  }

  // Cache statistics
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total) * 100 : 0;
    
    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      cacheStats: this.memoryCache.getStats()
    };
  }

  // Manual cache warming
  async warmCache(userId: string, role: string): Promise<void> {
    try {
      // This would be implemented with actual data fetching functions
      console.info(`Warming cache for user ${userId} with role ${role}`);
      
      // Example: Pre-load common data
      // await this.getOrSet(`${CACHE_CONFIG.keys.USER_PROFILE}${userId}`, 
      //   () => fetchUserProfile(userId));
      
      // await this.getOrSet(`${CACHE_CONFIG.keys.DASHBOARD_DATA}${role}:${userId}`, 
      //   () => fetchDashboardData(userId, role));
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }
}

// Singleton cache manager
const cacheManager = new CacheManager();

// Export cache utilities
export { cacheManager as cache, CACHE_CONFIG };

// React hook for caching
export const useCache = () => {
  return {
    get: <T>(key: string) => cacheManager.get<T>(key),
    set: (key: string, value: any, ttl?: number) => cacheManager.set(key, value, ttl),
    delete: (key: string) => cacheManager.delete(key),
    getOrSet: <T>(key: string, fetcher: () => Promise<T>, ttl?: number) => 
      cacheManager.getOrSet(key, fetcher, ttl),
    invalidateUser: (userId: string) => cacheManager.invalidateUserCache(userId),
    stats: () => cacheManager.getStats()
  };
};

// Cache decorator for functions
export const withCache = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttlSeconds?: number
): T => {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    
    return await cacheManager.getOrSet(
      key,
      () => fn(...args),
      ttlSeconds
    );
  }) as T;
};

// Performance tracking for cache operations
if (typeof window !== 'undefined') {
  // Client-side cache monitoring
  setInterval(() => {
    const stats = cacheManager.getStats();
    
    // Send cache performance metrics
    if (stats.hitRate < 70 && (stats.hitCount + stats.missCount) > 100) {
      console.warn('Low cache hit rate detected:', stats);
    }
  }, 300000); // Every 5 minutes
}