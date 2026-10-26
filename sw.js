// Inkling service worker: keeps the app working offline.
// After changing index.html, bump VERSION so phones pick up the new build.
const VERSION = 'inkling-v4';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // the page itself: try the network first so updates arrive, fall back to the cached copy offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => { caches.open(VERSION).then(c => c.put('index.html', res.clone())); return res; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // pixel fonts from Google: serve from cache, refresh in the background
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(VERSION).then(cache => cache.match(req).then(hit => {
        const fresh = fetch(req).then(res => { cache.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || fresh;
      }))
    );
    return;
  }

  // everything else from our own folder: cache first
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
