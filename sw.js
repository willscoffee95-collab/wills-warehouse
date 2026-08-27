const CACHE = 'wills-warehouse-shell-v0.1.3';
const ASSETS = [
  './','./index.html','./app.css?v=0.1.3','./config.js?v=0.1.3','./app.js?v=0.1.3','./manifest.webmanifest',
  './logo.png','./icon-192.png','./icon-512.png','./maskable-512.png','./apple-touch-icon.png','./favicon-64.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const req = event.request;
  const isNavigation = req.mode === 'navigate';
  const isCoreAsset = /\/(app\.js|config\.js|app\.css)(\?|$)/.test(new URL(req.url).pathname + new URL(req.url).search);

  if (isNavigation || isCoreAsset) {
    event.respondWith(
      fetch(req).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return response;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy));
      return response;
    }))
  );
});
