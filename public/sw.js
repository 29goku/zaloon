const CACHE_NAME = 'zaloon-v1';
const STATIC_CACHE_NAME = 'zaloon-static-v1';

// Shell assets to cache on install
const SHELL_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
];

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch((err) => {
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

// Helper: is this an API or Next.js internal route?
function isApiOrInternal(url) {
  const { pathname } = new URL(url);
  return (
    pathname.startsWith('/api/') ||
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
    // Cache-first for static assets
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
  } else if (isApiOrInternal(url)) {
    // Network-first for API/data requests — no offline fallback
    event.respondWith(fetch(request));
  } else {
    // Network-first for page navigations; fall back to offline page
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
            // Show offline fallback for navigate requests
            if (request.mode === 'navigate') {
              return caches.match('/offline');
            }
            return new Response('Offline', { status: 503 });
          });
        })
    );
  }
});
