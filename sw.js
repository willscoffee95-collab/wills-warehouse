const CACHE = 'wills-warehouse-shell-v1.5.2.22-inapp-refresh-safe';
const ASSETS = [
  './','./index.html','./app.css?v=1.5.2.22-inapp-refresh-safe','./config.js?v=0.6.6','./bridge.js?v=0.6.6','./wills-ui-v41.js?v=1.5.2.2','./app.js?v=1.5.2.22-inapp-refresh-safe','./wills-ui-v41.css?v=4.4.0',
  './feature-v1370.js?v=1.5.2.3','./manifest.webmanifest',
  './logo.png','./icon-192.png','./icon-512.png','./maskable-512.png','./apple-touch-icon.png','./favicon-64.png'
];


// Fail-safe: a stalled network request must never hold the PWA splash forever.
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    await Promise.allSettled(ASSETS.map(asset=>cache.add(asset)));
    await self.skipWaiting();
  }));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>
    Promise.all(keys.filter(key=>key.startsWith('wills-warehouse-shell-')&&key!==CACHE)
      .map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
async function wwFetchWithDeadlineV15222(request,timeoutMs){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(request,{signal:controller.signal});
    if(!response||!response.ok)throw Error('Warehouse asset tidak tersedia');
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
    return response;
  }catch(error){
    const cached=await caches.match(request);
    if(cached)return cached;
    if(request.mode==='navigate'){
      const shell=await caches.match('./index.html');
      if(shell)return shell;
    }
    throw error;
  }finally{clearTimeout(timer)}
}
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  const core=/\/(app\.js|bridge\.js|config\.js|app\.css|feature-v1370\.js|wills-ui-v41\.js|wills-ui-v41\.css)(\?|$)/.test(url.pathname+url.search);
  if(req.mode==='navigate'||core){
    event.respondWith(wwFetchWithDeadlineV15222(req,5000));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||
    wwFetchWithDeadlineV15222(req,5000)));
});
