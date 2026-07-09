const CACHE_NAME = 'disenos-streaming-v167';
const CLOUDINARY_CACHE = 'disenos-streaming-cloudinary-v1';
const ASSETS = [
  '/manifest.json',
  '/manifest-gestor.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

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
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== CLOUDINARY_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch ? network first, fallback to cache
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isNavigation = e.request.mode === 'navigate';
  const isHtml = e.request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html');

  if(isNavigation || isHtml || url.pathname.endsWith('/sw.js')) {
    e.respondWith(
      fetch(e.request, { cache:'no-store' })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  if(url.hostname.includes('res.cloudinary.com')) {
    const cacheUrl = new URL(e.request.url);
    cacheUrl.search = '';
    cacheUrl.hash = '';
    const cacheRequest = new Request(cacheUrl.toString(), {
      method:'GET',
      headers:e.request.headers,
      mode:e.request.mode,
      credentials:e.request.credentials,
      redirect:e.request.redirect,
      referrer:e.request.referrer
    });
    e.respondWith(
      caches.open(CLOUDINARY_CACHE).then(cache =>
        cache.match(cacheRequest).then(hit => {
          if(hit) return hit;
          return fetch(e.request).then(res => {
            if(res.ok && res.type !== 'opaque') cache.put(cacheRequest, res.clone());
            return res;
          }).catch(() => hit);
        })
      )
    );
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
  );
});
