/*
 * Alisha Arcade — offline service worker.
 *
 * Versioning: bump CACHE_VERSION on every deploy that changes any file below.
 * Each version uses its own cache bucket; on activate we delete all other
 * buckets, so a new version fully replaces the old one (no stale files).
 *
 * Update behavior: "silent — apply on next launch". We deliberately do NOT
 * call skipWaiting(), so the new worker installs in the background and takes
 * over the next time the app is opened (never mid-game).
 */
const CACHE_VERSION = 'alisha-arcade-v1';

// Everything the app needs to run fully offline.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './games/tic-tac-toe.html',
  './games/tetris.html',
  './games/connect-4.html',
  './games/mango.html',
  './games/pac-man.html',
  './games/racing.html',
  './images/tic-tac-toe.png',
  './images/tetris.png',
  './images/connect-4.png',
  './images/mango.png',
  './images/pac-man.png',
  './images/racing.png',
  './images/apple-touch-icon.png',
  './images/app-icon-192.png',
  './images/app-icon-512.png',
  './images/app-banner.jpg'
];

// Pre-cache the app shell on install.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
  );
});

// On activate, drop every cache bucket that isn't the current version.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache-first for same-origin GETs, with a network fallback that also
// runtime-caches anything new. Navigations fall back to the cached shell.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
