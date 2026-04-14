// Service Worker for Traffic Camera Finder PWA
// Provides offline app shell caching and smart caching strategies

const CACHE_VERSION = 'v1';
const CACHE_NAME = `traffic-camera-finder-${CACHE_VERSION}`;

// App shell assets to cache on install
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/CameraService.js',
  './js/GeolocationService.js',
  './js/MapView.js',
  './js/FilterController.js',
  './js/StatusDisplay.js',
  './manifest.json',
  // Leaflet CDN files
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install event: cache app shell assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell assets');
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] App shell cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[Service Worker] Failed to cache app shell:', error);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activated successfully');
        return self.clients.claim(); // Take control of all pages immediately
      })
  );
});

// Fetch event: implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Network-only for API requests (camera data)
  if (url.pathname.includes('/api/')) {
    // Let the app handle API requests with its own caching logic
    return;
  }
  
  // Network-first for map tiles (OpenStreetMap)
  if (url.hostname.includes('tile.openstreetmap.org') || 
      url.hostname.includes('openstreetmap.org')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Cache-first for app shell assets
  event.respondWith(cacheFirstStrategy(request));
});

// Cache-first strategy: try cache, fall back to network
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses for future use
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache-first strategy failed:', error);
    throw error;
  }
}

// Network-first strategy: try network, fall back to cache
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful tile responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('[Service Worker] Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Both network and cache failed
    console.error('[Service Worker] Network-first strategy failed:', error);
    throw error;
  }
}
