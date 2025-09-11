// Service Worker for Astral Core v7 - Mental Health Platform
// Implements sophisticated caching strategies for optimal performance
// Enhanced with mental health specific features and offline support

const CACHE_NAME = 'astral-core-v7';
const CACHE_VERSION = '1.0.0';
const FULL_CACHE_NAME = `${CACHE_NAME}-${CACHE_VERSION}`;

// Mental health crisis resources - always keep cached
const CRITICAL_RESOURCES = [
  '/emergency',
  '/crisis-support',
  '/api/emergency',
  '/api/crisis-resources'
];

// Cache strategies configuration (for reference)
// const CACHE_STRATEGIES = {
//   // Static assets - Cache first with fallback to network
//   STATIC_ASSETS: 'cache-first',
//   // API data - Network first with cache fallback
//   API_DATA: 'network-first',
//   // HTML pages - Stale while revalidate
//   HTML_PAGES: 'stale-while-revalidate',
//   // Images - Cache first with network fallback
//   IMAGES: 'cache-first'
// };

// Define what to cache
const STATIC_ASSETS = [
  '/_next/static/',
  '/fonts/',
  '/images/',
  '/favicon.ico',
  '/manifest.json'
];

const API_ENDPOINTS = [
  '/api/user/profile',
  '/api/files',
  '/api/notifications',
  '/api/analytics'
];

// Cache duration settings (in seconds)
const CACHE_DURATIONS = {
  STATIC_ASSETS: 86400 * 30, // 30 days
  API_DATA: 300, // 5 minutes
  HTML_PAGES: 3600, // 1 hour
  IMAGES: 86400 * 7 // 7 days
};

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(FULL_CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        // Pre-cache essential static assets
        return cache.addAll([
          '/',
          '/favicon.ico',
          '/manifest.json'
        ]);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName.startsWith(CACHE_NAME) && cacheName !== FULL_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip authentication and payment endpoints
  if (url.pathname.startsWith('/api/auth') || 
      url.pathname.startsWith('/api/payments')) {
    return;
  }
  
  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // Route to appropriate caching strategy
    if (isStaticAsset(pathname)) {
      return await cacheFirst(request, CACHE_DURATIONS.STATIC_ASSETS);
    } else if (isAPIEndpoint(pathname)) {
      return await networkFirst(request, CACHE_DURATIONS.API_DATA);
    } else if (isImage(pathname)) {
      return await cacheFirst(request, CACHE_DURATIONS.IMAGES);
    } else {
      // HTML pages - stale while revalidate
      return await staleWhileRevalidate(request, CACHE_DURATIONS.HTML_PAGES);
    }
  } catch (error) {
    console.error('Service Worker fetch error:', error);
    return fetch(request);
  }
}

// Cache-first strategy: Check cache first, fallback to network
async function cacheFirst(request, maxAge) {
  const cache = await caches.open(FULL_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && !isExpired(cachedResponse, maxAge)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone and cache the response
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    // If network fails, return cached version even if expired
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Network-first strategy: Try network first, fallback to cache
async function networkFirst(request, maxAge) {
  const cache = await caches.open(FULL_CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone and cache the response
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, maxAge)) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Stale-while-revalidate: Return cache immediately, update in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(FULL_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch fresh content in the background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const responseToCache = networkResponse.clone();
        cache.put(request, responseToCache);
      }
      return networkResponse;
    })
    .catch(() => {
      // Network failed, but we might have cache
    });
  
  // If we have a cached response, return it immediately
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // No cache, wait for network
  return fetchPromise;
}

// Utility functions
function isStaticAsset(pathname) {
  return STATIC_ASSETS.some(pattern => pathname.startsWith(pattern));
}

function isAPIEndpoint(pathname) {
  return pathname.startsWith('/api/') && 
         API_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint));
}

function isImage(pathname) {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(pathname);
}

function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return true;
  
  const responseTime = new Date(dateHeader).getTime();
  const now = Date.now();
  const age = (now - responseTime) / 1000; // in seconds
  
  return age > maxAge;
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      clearCache(payload?.cacheName);
      break;
      
    case 'CACHE_URLS':
      cacheUrls(payload?.urls || []);
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

async function clearCache(cacheName = FULL_CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  await Promise.all(
    keys.map(key => cache.delete(key))
  );
  
  console.log(`Cache ${cacheName} cleared`);
}

async function cacheUrls(urls) {
  const cache = await caches.open(FULL_CACHE_NAME);
  
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.error('Failed to cache URL:', url, error);
      }
    })
  );
  
  console.log('URLs cached:', urls);
}

// Background sync for offline capability
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle any pending operations that failed while offline
  console.log('Performing background sync...');
  
  // This could include:
  // - Retry failed API requests
  // - Sync offline data
  // - Update cache with fresh content
}

// Push notification handling for mental health platform
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'astral-core-notification',
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.urgent || false,
    silent: false,
    ...data.options
  };
  
  // Mental health specific notification handling
  if (data.type === 'crisis') {
    options.requireInteraction = true;
    options.tag = 'crisis-alert';
    options.icon = '/icons/emergency-192x192.png';
    options.actions = [
      {
        action: 'emergency',
        title: 'Get Help Now',
        icon: '/icons/emergency-action.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-action.png'
      }
    ];
  } else if (data.type === 'wellness_reminder') {
    options.actions = [
      {
        action: 'check_in',
        title: 'Check In',
        icon: '/icons/wellness-action.png'
      },
      {
        action: 'dismiss',
        title: 'Later',
        icon: '/icons/dismiss-action.png'
      }
    ];
  } else if (data.type === 'appointment_reminder') {
    options.actions = [
      {
        action: 'view_appointment',
        title: 'View Details',
        icon: '/icons/calendar-action.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-action.png'
      }
    ];
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const notificationData = event.notification.data;
  const action = event.action;
  
  let targetUrl = '/';
  
  if (action) {
    switch (action) {
      case 'emergency':
        targetUrl = '/emergency';
        break;
      case 'check_in':
        targetUrl = '/wellness';
        break;
      case 'view_appointment':
        targetUrl = '/appointments';
        break;
      case 'dismiss':
        return; // Just close the notification
      default:
        targetUrl = notificationData?.url || '/';
    }
  } else if (notificationData?.url) {
    targetUrl = notificationData.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Enhanced background sync for mental health data
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'sync-journal-entries':
      event.waitUntil(syncJournalEntries());
      break;
    case 'sync-wellness-data':
      event.waitUntil(syncWellnessData());
      break;
    case 'sync-mood-tracking':
      event.waitUntil(syncMoodData());
      break;
    case 'background-sync':
      event.waitUntil(doBackgroundSync());
      break;
  }
});

async function syncJournalEntries() {
  try {
    console.log('Syncing journal entries...');
    // Sync offline journal entries with server
    const response = await fetch('/api/journal/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log('Journal entries synced successfully');
    }
  } catch (error) {
    console.error('Failed to sync journal entries:', error);
    throw error; // This will retry the sync later
  }
}

async function syncWellnessData() {
  try {
    console.log('Syncing wellness data...');
    const response = await fetch('/api/wellness/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log('Wellness data synced successfully');
    }
  } catch (error) {
    console.error('Failed to sync wellness data:', error);
    throw error;
  }
}

async function syncMoodData() {
  try {
    console.log('Syncing mood tracking data...');
    const response = await fetch('/api/mood/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log('Mood data synced successfully');
    }
  } catch (error) {
    console.error('Failed to sync mood data:', error);
    throw error;
  }
}

// Offline page for mental health support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip authentication and payment endpoints
  if (url.pathname.startsWith('/api/auth') || 
      url.pathname.startsWith('/api/payments')) {
    return;
  }
  
  // Prioritize critical mental health resources
  if (CRITICAL_RESOURCES.some(resource => url.pathname.startsWith(resource))) {
    event.respondWith(handleCriticalResource(request));
    return;
  }
  
  event.respondWith(handleRequest(request));
});

async function handleCriticalResource(request) {
  try {
    // Always try cache first for critical resources to ensure availability
    const cache = await caches.open(FULL_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Return cached version immediately for critical resources
      fetchAndUpdateCache(request, cache); // Update in background
      return cachedResponse;
    }
    
    // If not in cache, fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
    
  } catch (error) {
    console.error('Critical resource fetch failed:', error);
    // Return offline crisis support page
    return getOfflineCrisisPage();
  }
}

async function fetchAndUpdateCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
  } catch {
    // Silent fail for background updates
  }
}

async function getOfflineCrisisPage() {
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Crisis Support - Astral Core</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .crisis-container {
          max-width: 600px;
          background: rgba(255, 255, 255, 0.1);
          padding: 2rem;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          text-align: center;
        }
        .emergency-button {
          background: #ff6b35;
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          margin: 1rem;
          min-height: 60px;
          display: inline-block;
          text-decoration: none;
        }
        .support-info {
          background: rgba(255, 255, 255, 0.1);
          padding: 1.5rem;
          border-radius: 8px;
          margin-top: 2rem;
          text-align: left;
        }
        h1 { margin-bottom: 1rem; font-size: 2rem; }
        h2 { margin-bottom: 1rem; color: #ffd700; }
        p { line-height: 1.6; margin-bottom: 1rem; }
      </style>
    </head>
    <body>
      <div class="crisis-container">
        <h1>🆘 Crisis Support Available</h1>
        <p>You're currently offline, but help is still available 24/7.</p>
        
        <a href="tel:988" class="emergency-button">📞 Call 988 - Crisis Lifeline</a>
        <a href="tel:911" class="emergency-button">🚨 Call 911 - Emergency</a>
        
        <div class="support-info">
          <h2>Immediate Support Resources</h2>
          <p><strong>988 Suicide & Crisis Lifeline:</strong> 24/7 free and confidential support</p>
          <p><strong>Crisis Text Line:</strong> Text HOME to 741741</p>
          <p><strong>National Domestic Violence Hotline:</strong> 1-800-799-7233</p>
          <p><strong>SAMHSA National Helpline:</strong> 1-800-662-4357</p>
          
          <h2>Self-Care Reminders</h2>
          <p>• You are not alone</p>
          <p>• This feeling is temporary</p>
          <p>• Reach out to someone you trust</p>
          <p>• Professional help is available</p>
        </div>
        
        <button onclick="window.location.reload()" class="emergency-button">🔄 Try Reconnecting</button>
      </div>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

console.log('Service Worker loaded - Astral Core v7 Mental Health Platform');