# Caching Implementation Guide - Astral Core v7

This document outlines the comprehensive caching strategy implemented for the Astral Core v7 Next.js application to improve performance and reduce server load.

## Overview

The caching implementation uses a multi-layered approach:
1. **HTTP Headers** - Server-side cache control via Next.js configuration
2. **API Route Caching** - ETag and conditional request handling
3. **Service Worker** - Client-side caching with sophisticated strategies
4. **Browser Storage** - localStorage and sessionStorage for application data

## HTTP Headers Configuration

### Next.js Configuration (`next.config.ts`)

The application implements different caching strategies based on content type:

#### Authentication & Payment Endpoints
- **Strategy**: No cache
- **Headers**: `no-store, no-cache, must-revalidate`
- **Reason**: Sensitive data should never be cached

#### Static Assets (`/_next/static/*`)
- **Strategy**: Long-term cache with immutable flag
- **Cache Duration**: 1 year (31,536,000 seconds)
- **Headers**: `public, max-age=31536000, s-maxage=31536000, immutable`

#### Images (`/images/*`)
- **Strategy**: Long cache with stale-while-revalidate
- **Cache Duration**: 30 days with 1-day stale period
- **Headers**: `public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400`

#### API Routes - General Data
- **Strategy**: Private cache with short duration
- **Cache Duration**: 60 seconds
- **Headers**: `private, max-age=60, s-maxage=0, must-revalidate`

#### API Routes - User Profiles
- **Strategy**: Private cache with medium duration
- **Cache Duration**: 5 minutes (300 seconds)
- **Headers**: `private, max-age=300, s-maxage=0, must-revalidate`

#### HTML Pages
- **Strategy**: CDN cache with stale-while-revalidate
- **Browser Cache**: 0 seconds (always validate)
- **CDN Cache**: 1 hour
- **Stale Period**: 24 hours
- **Headers**: `public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, must-revalidate`

## API Route Caching

### ETag Implementation

The application implements ETags for conditional requests using the `cache.ts` utility:

```typescript
// Generate ETag based on content
const etag = generateETag(JSON.stringify(data));

// Check for conditional requests
const conditionalResponse = handleConditionalRequest(request, etag, lastModified);
if (conditionalResponse) {
  return conditionalResponse; // Returns 304 Not Modified
}
```

### Cache Strategies

Pre-defined cache strategies are available:

- `NO_CACHE`: For sensitive data
- `SHORT_CACHE`: 1-minute cache for dynamic data
- `MEDIUM_CACHE`: 5-minute cache for user profiles
- `LONG_CACHE`: 30-day cache for static content
- `IMMUTABLE_CACHE`: 1-year cache for hashed assets
- `HTML_CACHE`: CDN-optimized cache for HTML pages

### Implementation Example

```typescript
// In API route
import { CacheStrategies, createCachedResponse, generateETag } from '@/lib/utils/cache';

export async function GET(request: NextRequest) {
  const data = await fetchData();
  const etag = generateETag(JSON.stringify(data));
  
  return createCachedResponse(data, {
    ...CacheStrategies.MEDIUM_CACHE,
    etag,
    lastModified: data.updatedAt,
  });
}
```

## Service Worker Caching

### File: `public/sw.js`

The service worker implements sophisticated caching strategies:

#### Cache-First Strategy
- **Use Case**: Static assets, images
- **Behavior**: Check cache first, fallback to network
- **Benefits**: Fastest loading for static content

#### Network-First Strategy
- **Use Case**: API endpoints
- **Behavior**: Try network first, fallback to cache
- **Benefits**: Fresh data when online, cached data when offline

#### Stale-While-Revalidate Strategy
- **Use Case**: HTML pages
- **Behavior**: Return cache immediately, update in background
- **Benefits**: Instant loading with fresh content updates

### Cache Management

The service worker automatically:
- Pre-caches essential assets
- Manages cache versions
- Cleans up old caches
- Handles offline scenarios

## Browser Cache Management

### File: `src/lib/utils/browser-cache.ts`

The `BrowserCacheManager` class provides:

#### Local Storage Caching
```typescript
// Set with expiration
cacheManager.setLocalCache('user-profile', userData, 60); // 60 minutes

// Get cached data
const userData = cacheManager.getLocalCache<UserProfile>('user-profile');
```

#### Session Storage Caching
```typescript
// Set session data
cacheManager.setSessionCache('temp-data', tempData);

// Get session data
const tempData = cacheManager.getSessionCache('temp-data');
```

#### Cache Invalidation
```typescript
// Invalidate specific keys
cacheManager.invalidateKeys(['user-profile', 'notifications']);

// Clear all cache
await cacheManager.clearAllCache();
```

## Performance Benefits

### Expected Improvements

1. **Reduced Server Load**:
   - Static assets served from CDN/browser cache
   - API responses cached at multiple levels
   - Conditional requests reduce bandwidth

2. **Faster Load Times**:
   - Service worker enables instant loading
   - Progressive loading with stale-while-revalidate
   - Pre-cached critical resources

3. **Better User Experience**:
   - Offline functionality
   - Smooth navigation
   - Reduced loading states

4. **Bandwidth Savings**:
   - ETags prevent unnecessary data transfer
   - Compressed static assets
   - Efficient cache invalidation

## Cache Headers Reference

### Common Cache Control Directives

- `public`: Response can be cached by any cache
- `private`: Response can only be cached by browser
- `no-cache`: Must revalidate with server before use
- `no-store`: Never cache the response
- `max-age=N`: Cache for N seconds
- `s-maxage=N`: CDN cache for N seconds
- `must-revalidate`: Must check with server when stale
- `immutable`: Content never changes for this URL
- `stale-while-revalidate=N`: Can serve stale content for N seconds while revalidating

### Vary Header Usage

The `Vary` header tells caches which request headers affect the response:

- `Vary: Accept-Encoding`: Different encoding formats
- `Vary: Authorization`: User-specific content
- `Vary: Cookie`: Session-dependent content

## Monitoring and Debugging

### Cache Statistics

```typescript
const stats = await cacheManager.getCacheStats();
console.log('Cache sizes:', stats);
```

### Developer Tools

1. **Network Tab**: Check cache status and headers
2. **Application Tab**: Inspect service worker and storage
3. **Console**: Service worker logs and cache operations

### Cache Headers Verification

Check responses include proper headers:
- `Cache-Control`
- `ETag`
- `Last-Modified`
- `Vary`

## Best Practices

### Do's
- Use appropriate cache strategies for content type
- Implement ETags for dynamic content
- Set proper Vary headers
- Monitor cache hit rates
- Test offline functionality

### Don'ts
- Cache sensitive authentication data
- Use long cache times for dynamic content
- Ignore cache invalidation
- Over-cache API responses
- Cache error responses

## Troubleshooting

### Common Issues

1. **Stale Content**: Check cache invalidation logic
2. **High Server Load**: Verify cache headers are set
3. **Slow Loading**: Ensure service worker is registered
4. **Cache Misses**: Check ETag generation consistency

### Cache Debugging

```typescript
// Check if content is cacheable
if (isCacheable(request)) {
  console.log('Content is cacheable');
}

// Verify ETag generation
const etag = generateETag(content);
console.log('Generated ETag:', etag);
```

## Migration Guide

### From Previous Version

1. Clear existing caches
2. Update service worker registration
3. Verify new cache headers
4. Test cache invalidation
5. Monitor performance metrics

This comprehensive caching implementation ensures optimal performance while maintaining data freshness and security.