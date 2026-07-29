const CACHE_NAME = 'zaloon-v1';
const STATIC_CACHE_NAME = 'zaloon-static-v1';

// Shell assets to cache on install
const STATIC_ASSETS = ['/', '/dashboard', '/manifest.json', '/favicon.svg'];

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Non-fatal: some shell assets may not exist yet during dev
        console.warn('[SW] Shell precache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: is this a static asset request?
function isStaticAsset(url) {
  const { pathname } = new URL(url);
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    /\.(svg|png|jpg|jpeg|gif|webp|woff2?|ico|css|js)$/.test(pathname)
  );
}

// Helper: is this an API or dashboard navigation request?
function isNetworkFirst(url) {
  const { pathname } = new URL(url);
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/dashboard/') ||
    pathname.startsWith('/_next/data/') ||
    pathname.startsWith('/_next/image')
  );
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = request.url;

  // Skip cross-origin requests
  if (!url.startsWith(self.location.origin)) return;

  if (isStaticAsset(url)) {
    // Cache-first for static assets (js, css, images)
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        });
      })
    );
  } else if (isNetworkFirst(url)) {
    // Network-first for /api/ and /dashboard/ routes
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => cached || new Response('Offline', { status: 503 }));
        })
    );
  } else {
    // Network-first for other page navigations; fall back to cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            if (request.mode === 'navigate') {
              return caches.match('/dashboard');
            }
            return new Response('Offline', { status: 503 });
          });
        })
    );
  }
});
