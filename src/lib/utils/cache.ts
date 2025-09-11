import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export interface CacheOptions {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  private?: boolean;
  immutable?: boolean;
  mustRevalidate?: boolean;
  noCache?: boolean;
  noStore?: boolean;
}

export interface ETagOptions {
  weak?: boolean;
}

/**
 * Generates an ETag for content
 */
export function generateETag(content: string | Buffer, options: ETagOptions = {}): string {
  const hash = crypto
    .createHash('sha256')
    .update(content)
    .digest('hex')
    .substring(0, 16);
  
  return options.weak ? `W/"${hash}"` : `"${hash}"`;
}

/**
 * Generates a cache control header string from options
 */
export function generateCacheControl(options: CacheOptions): string {
  const directives: string[] = [];

  if (options.noStore) {
    directives.push('no-store');
  }
  
  if (options.noCache) {
    directives.push('no-cache');
  }

  if (options.private) {
    directives.push('private');
  } else if (!options.noStore && !options.noCache) {
    directives.push('public');
  }

  if (options.maxAge !== undefined) {
    directives.push(`max-age=${options.maxAge}`);
  }

  if (options.sMaxAge !== undefined) {
    directives.push(`s-maxage=${options.sMaxAge}`);
  }

  if (options.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }

  if (options.mustRevalidate) {
    directives.push('must-revalidate');
  }

  if (options.immutable) {
    directives.push('immutable');
  }

  return directives.join(', ');
}

/**
 * Checks if the request has a matching ETag
 */
export function checkETag(request: NextRequest, etag: string): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  
  if (!ifNoneMatch) {
    return false;
  }

  // Handle multiple ETags
  const etags = ifNoneMatch.split(',').map(tag => tag.trim());
  
  return etags.includes(etag) || etags.includes('*');
}

/**
 * Checks if the request has a matching Last-Modified date
 */
export function checkLastModified(request: NextRequest, lastModified: Date): boolean {
  const ifModifiedSince = request.headers.get('If-Modified-Since');
  
  if (!ifModifiedSince) {
    return false;
  }

  const requestDate = new Date(ifModifiedSince);
  const resourceDate = new Date(lastModified);
  
  return requestDate >= resourceDate;
}

/**
 * Creates a cached response with appropriate headers
 */
export function createCachedResponse(
  data: unknown,
  options: CacheOptions & {
    etag?: string;
    lastModified?: Date;
    contentType?: string;
  } = {}
): NextResponse {
  const response = NextResponse.json(data);

  // Set cache control
  if (!options.noStore && !options.noCache) {
    response.headers.set('Cache-Control', generateCacheControl(options));
  } else {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // Set ETag if provided
  if (options.etag) {
    response.headers.set('ETag', options.etag);
  }

  // Set Last-Modified if provided
  if (options.lastModified) {
    response.headers.set('Last-Modified', options.lastModified.toUTCString());
  }

  // Set content type
  if (options.contentType) {
    response.headers.set('Content-Type', options.contentType);
  }

  // Set Vary header for better caching
  response.headers.set('Vary', 'Accept-Encoding, Authorization');

  return response;
}

/**
 * Creates a 304 Not Modified response
 */
export function createNotModifiedResponse(): NextResponse {
  return new NextResponse(null, {
    status: 304,
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * Middleware function for handling conditional requests
 */
export function handleConditionalRequest(
  request: NextRequest,
  etag?: string,
  lastModified?: Date
): NextResponse | null {
  if (etag && checkETag(request, etag)) {
    return createNotModifiedResponse();
  }

  if (lastModified && checkLastModified(request, lastModified)) {
    return createNotModifiedResponse();
  }

  return null;
}

/**
 * Cache strategies for different content types
 */
export const CacheStrategies = {
  // No cache for sensitive data
  NO_CACHE: {
    noStore: true,
    noCache: true,
    mustRevalidate: true,
  } as CacheOptions,

  // Short cache for dynamic user data
  SHORT_CACHE: {
    private: true,
    maxAge: 60, // 1 minute
    sMaxAge: 0,
    mustRevalidate: true,
  } as CacheOptions,

  // Medium cache for user profiles
  MEDIUM_CACHE: {
    private: true,
    maxAge: 300, // 5 minutes
    sMaxAge: 0,
    mustRevalidate: true,
  } as CacheOptions,

  // Long cache for static content
  LONG_CACHE: {
    maxAge: 2592000, // 30 days
    sMaxAge: 2592000,
    staleWhileRevalidate: 86400, // 1 day
  } as CacheOptions,

  // Immutable cache for hashed assets
  IMMUTABLE_CACHE: {
    maxAge: 31536000, // 1 year
    sMaxAge: 31536000,
    immutable: true,
  } as CacheOptions,

  // HTML pages with CDN cache
  HTML_CACHE: {
    maxAge: 0, // No browser cache
    sMaxAge: 3600, // 1 hour CDN cache
    staleWhileRevalidate: 86400, // 1 day stale
    mustRevalidate: true,
  } as CacheOptions,
};

/**
 * Type guard to check if content is cacheable
 */
export function isCacheable(request: NextRequest): boolean {
  const method = request.method;
  const url = new URL(request.url);
  
  // Only cache GET and HEAD requests
  if (method !== 'GET' && method !== 'HEAD') {
    return false;
  }

  // Don't cache auth endpoints
  if (url.pathname.startsWith('/api/auth') || 
      url.pathname.startsWith('/api/payments')) {
    return false;
  }

  return true;
}

/**
 * Utility to create response with cache headers for API routes
 */
export function apiResponse(
  data: unknown,
  cacheStrategy: CacheOptions = CacheStrategies.NO_CACHE,
  status: number = 200
): NextResponse {
  const responseData = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  const etag = generateETag(JSON.stringify(responseData));
  
  const response = createCachedResponse(responseData, {
    ...cacheStrategy,
    etag,
    contentType: 'application/json',
  });
  
  // Update status if different from default
  if (status !== 200) {
    return new NextResponse(response.body, {
      status,
      headers: response.headers,
    });
  }
  
  return response;
}