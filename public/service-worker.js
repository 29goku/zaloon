const CACHE_NAME = 'zaloon-v2';
const STATIC_CACHE_NAME = 'zaloon-static-v2';

// Pre-cache the offline fallback and static shell assets
const SHELL_ASSETS = [
  '/offline',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// Install: cache shell assets; skipWaiting so new SW takes over immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Shell precache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: purge old caches, claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    /\.(svg|png|jpg|jpeg|gif|webp|woff2?|ico|css|js)$/.test(pathname)
  );
}

function isApiOrInternal(pathname) {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/data/') ||
    pathname.startsWith('/_next/image')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  const { pathname } = new URL(request.url);

  if (isStaticAsset(pathname)) {
    // Cache-first: static assets are content-hashed by Next.js
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  if (isApiOrInternal(pathname)) {
    // Network-only for API routes — no offline fallback for data
    event.respondWith(fetch(request));
    return;
  }

  // Network-first for all page navigations; fall back to cached version or /offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/offline');
          }
          return new Response('Offline', { status: 503 });
        })
      )
  );
});
