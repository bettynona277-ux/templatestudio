const CACHE_NAME = 'disenos-streaming-v11';
const ASSETS = [
  '/index-mobile.html',
  '/editor-mobile.html',
  '/manifest.json',
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
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch ? network first, fallback to cache
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Nunca cachear /dev/ ? siempre ir a la red
  if(url.pathname.startsWith('/dev/')) return;

  // Skip Firebase, Firestore, Cloudinary
  if(url.hostname.includes('firebase') ||
     url.hostname.includes('firestore') ||
     url.hostname.includes('cloudinary') ||
     url.hostname.includes('googleapis')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache solo archivos de producci?n (no /dev/)
        if(res.ok && (e.request.url.endsWith('.html') || e.request.url.endsWith('.json'))) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
