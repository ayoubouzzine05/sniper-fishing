/*
 * Sniper Fishing service worker.
 *
 * Strategy (deliberately conservative — we must NEVER serve stale forecasts
 * as if they were live):
 *  - App shell: precache the offline fallback on install; runtime-cache
 *    versioned /_next/static assets (cache-first, they are immutable).
 *  - HTML navigations: network-first with cache fallback; if both fail
 *    (offline) respond with the offline page.
 *  - Everything else (fonts, tiles, API): network-only. Map tiles and
 *    provider APIs are explicitly NOT cached as "current" data — the app
 *    labels cached provider data itself (in memory) and shows its age.
 */

const VERSION = 'sniper-v1';
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;

const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL && k !== STATIC)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never intercept cross-origin (providers, tiles)

  // Immutable hashed assets: cache-first.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Navigations: network-first, offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((cache) => cache.put(url.pathname, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const shell = await caches.open(SHELL);
          const cachedNav = await shell.match(req);
          if (cachedNav) return cachedNav;
          const offline = await shell.match(OFFLINE_URL);
          if (offline) return offline;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }
});
