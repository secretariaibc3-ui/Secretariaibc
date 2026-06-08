const CACHE_NAME = 'ibc-cache-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/api/manifest'
];

// Utility to check if a request is for navigation or index.html
const isIndexRequest = (request) => {
  const url = new URL(request.url);
  return (
    url.pathname === '/' || 
    url.pathname === '/index.html' || 
    url.pathname === '/api/manifest' ||
    request.mode === 'navigate'
  );
};

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching critical assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Message listener to trigger skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Cleaning old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests or non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Don't cache Firestore/Firebase API requests or version check
  if (url.origin.includes('firestore.googleapis.com') || 
      url.origin.includes('firebaseinstallations.googleapis.com') ||
      url.origin.includes('identitytoolkit.googleapis.com') ||
      url.pathname.includes('/version.json')) {
    return;
  }

  // Network First for index/manifest to ensure fresh content
  if (isIndexRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache First with Network Fallback for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(event.request).then((networkResponse) => {
        // Only cache valid responses
        // We allow caching cross-origin (opaque) responses for images from specific domains
        const isFirebaseStorage = url.origin.includes('firebasestorage.googleapis.com');
        
        if (!networkResponse || networkResponse.status !== 200) {
          if (!isFirebaseStorage || networkResponse.type !== 'opaque') {
             return networkResponse;
          }
        }
        
        // Don't cache opaque responses unless they are from trusted domains like Firebase Storage
        if (networkResponse.type === 'opaque' && !isFirebaseStorage) {
          return networkResponse;
        }
        
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // If fetch fails (offline), could return a fallback page if needed
      });
    })
  );
});

// Handle push notifications if implemented in future
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Novo do Sistema IBC';
  const options = {
    body: data.body || 'Você tem uma nova atualização.',
    icon: '/logo-secretariaibc.png',
    badge: '/logo-secretariaibc.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
