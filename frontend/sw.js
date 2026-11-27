// Auto Part - Service Worker for PWA / Offline support
const CACHE_NAME = 'autopart-v2';
const ASSETS = [
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/sales.js',
  './js/pos.js',
  './js/qr.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
