const CACHE = 'wills-warehouse-shell-v0.4.0-role-split-thermal-ui';
const ASSETS = [
  './','./index.html','./app.css?v=0.4.0','./config.js?v=0.4.0','./bridge.js?v=0.4.0','./app.js?v=0.4.0','./manifest.webmanifest',
  './logo.png','./icon-192.png','./icon-512.png','./maskable-512.png','./apple-touch-icon.png','./favicon-64.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const req = event.request;
  const isNavigation = req.mode === 'navigate';
  const isCoreAsset = /\/(app\.js|bridge\.js|config\.js|app\.css)(\?|$)/.test(url.pathname + url.search);
  if (isNavigation || isCoreAsset) {
    event.respondWith(fetch(req).then(response => { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(req,copy)); return response; }).catch(()=>caches.match(req).then(c=>c||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(req,copy)); return response; })));
});
