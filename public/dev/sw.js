const IS_DEV_SCOPE = self.registration.scope.includes('/dev/');
const CACHE_PREFIX = `disenos-streaming-${IS_DEV_SCOPE ? 'dev-' : ''}`;
const CACHE_NAME = `${CACHE_PREFIX}v269`;
// Shared by production and dev; app releases must not discard image downloads.
const CLOUDINARY_CACHE = 'disenos-streaming-cloudinary-v2';
const CLOUDINARY_MAX_ENTRIES = 256;
const cloudinaryPending = new Map();

async function cachedCloudinaryResponse(request){
  let cache;
  try{
    cache = await caches.open(CLOUDINARY_CACHE);
    const hit = await cache.match(request);
    if(hit) return hit;
  }catch(_){ /* Storage unavailable: image delivery must still work. */ }

  // Keep URL, request mode and headers intact (CORS and format negotiation).
  const key = JSON.stringify([request.url, request.mode, request.credentials,
    request.cache, request.redirect, [...request.headers.entries()]]);
  let pending = cloudinaryPending.get(key);
  if(!pending){
    pending = (async () => {
      const response = await fetch(request);
      if(cache && response.status === 200 && response.type !== 'opaque' &&
         !/no-store|private|no-cache/i.test(response.headers.get('Cache-Control') || '')){
        try{
          await cache.put(request, response.clone());
          const keys = await cache.keys();
          await Promise.all(keys.slice(0, Math.max(0, keys.length - CLOUDINARY_MAX_ENTRIES))
            .map(old => cache.delete(old)));
        }catch(_){ /* Quota errors must not break previews or exports. */ }
      }
      return response;
    })();
    cloudinaryPending.set(key, pending);
  }
  try{
    return (await pending).clone();
  }finally{
    if(cloudinaryPending.get(key) === pending) cloudinaryPending.delete(key);
  }
}
const SCOPE_URL = new URL(self.registration.scope);
const ASSETS = [
  'manifest.json',
  'manifest-gestor.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
].map(path => new URL(path, SCOPE_URL).pathname);

// Install ? cache assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate ? clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      // Produccion y /dev comparten origen: cada worker solo limpia sus propias
      // versiones para no invalidar ni responder con cache del otro entorno.
      Promise.all(keys.filter(k => ((new RegExp('^' + CACHE_PREFIX + 'v[0-9]+$')).test(k) && k !== CACHE_NAME) || k === 'disenos-streaming-cloudinary-v1').map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch ? network first, fallback to cache
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // El worker de produccion tiene scope raiz y tambien ve /dev. No debe
  // interceptarlo: una respuesta cacheada de produccion hacia que el gestor
  // movil de desarrollo terminara navegando a /gestor.html.
  if(!IS_DEV_SCOPE && url.pathname.startsWith('/dev/')) return;
  const isNavigation = e.request.mode === 'navigate';
  const isHtml = e.request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html');

  if(isNavigation || isHtml || url.pathname.endsWith('/sw.js')) {
    e.respondWith(
      fetch(e.request, { cache:'no-store' })
        .catch(() => caches.match(e.request))
        .then(res => res || new Response('Sin conexión', { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
    );
    return;
  }

  if(url.hostname === 'res.cloudinary.com') {
    // Only immutable versioned public images are safe for persistent cache-first.
    // Signed/query URLs, unversioned assets and explicit reloads use HTTP caching.
    if(!/^\/[^/]+\/image\/upload\/(?:[^/]+\/)*v[0-9]+\//.test(url.pathname) ||
       url.search || e.request.headers.has('range') ||
       e.request.credentials === 'include' ||
       !['default', 'force-cache', 'only-if-cached'].includes(e.request.cache)) return;
    const response = cachedCloudinaryResponse(e.request);
    e.respondWith(response);
    e.waitUntil(response.then(() => undefined, () => undefined));
    return;
  }

  // Skip Firebase, Firestore and Google APIs
  if(url.hostname.includes('firebase') ||
     url.hostname.includes('firestore') ||
     url.hostname.includes('googleapis')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Mantener datos de app frescos; solo cachear manifest/iconos, nunca pantallas HTML.
        if(res.ok && url.pathname.endsWith('.json')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
      .then(res => res || new Response(null, { status: 504, statusText: 'Offline' }))
  );
});
