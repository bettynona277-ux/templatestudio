const IS_DEV_SCOPE = self.registration.scope.includes('/dev/');
const CACHE_PREFIX = `disenos-streaming-${IS_DEV_SCOPE ? 'dev-' : ''}`;
const CACHE_NAME = `${CACHE_PREFIX}v280`;
// Shared by production and dev; app releases must not discard image downloads.
const CLOUDINARY_CACHE = 'disenos-streaming-cloudinary-v2';
const CLOUDINARY_MAX_ENTRIES = 256;
const cloudinaryPending = new Map();

// --- Conexiones lentas -------------------------------------------------------
// Copia de la ultima version del gestor que cargo bien. Solo se usa cuando la
// red falla o tarda demasiado; cada carga correcta la reemplaza, asi que nunca
// queda mas de una version atras. No se borra al subir CACHE_NAME.
const SHELL_CACHE = `${CACHE_PREFIX}shell-v1`;
// Librerias externas (Firebase, fuentes, flatpickr, lucide): se sirven desde
// cache al instante y se actualizan en segundo plano.
const LIBS_CACHE = 'disenos-streaming-libs-v1';
const SHELL_PAGE = /\/gestor(-mobile|-login)?(\.html)?$/;
const LIB_HOSTS = ['www.gstatic.com','fonts.gstatic.com','fonts.googleapis.com','cdn.jsdelivr.net','unpkg.com'];
// Con copia guardada: si la red no responde en este tiempo se abre la copia.
const SHELL_FAST_TIMEOUT = 6000;
// Sin copia guardada: se espera mas antes de mostrar "Conexion inestable".
const SHELL_SLOW_TIMEOUT = 25000;

function shellKey(url){
  return new URL(url.pathname.replace(/\.html$/, ''), url.origin).href;
}
async function saveShell(url, response){
  if(!response || response.status !== 200 || response.redirected || response.type !== 'basic') return;
  try{ await (await caches.open(SHELL_CACHE)).put(shellKey(url), response); }catch(_){}
}
async function cachedShell(url){
  try{ return await (await caches.open(SHELL_CACHE)).match(shellKey(url)); }catch(_){ return undefined; }
}
async function shellResponse(event, url){
  const cached = await cachedShell(url);
  const network = fetch(event.request, { cache:'no-store' });
  // La descarga sigue aunque se responda con la copia: la proxima vez abre la version nueva.
  event.waitUntil(network.then(res => saveShell(url, res.clone())).catch(() => {}));
  const timeout = new Promise(resolve => setTimeout(() => resolve('timeout'), cached ? SHELL_FAST_TIMEOUT : SHELL_SLOW_TIMEOUT));
  const result = await Promise.race([network.catch(() => 'error'), timeout]);
  if(result instanceof Response && result.status < 500) return result;
  if(cached) return cached;
  if(result === 'timeout'){
    // Sin copia: se sigue esperando a la red; solo un error real muestra la pantalla offline.
    try{ const late = await network; if(late.status < 500) return late; }catch(_){}
  }
  const fallback = await caches.open(CACHE_NAME).then(cache => cache.match(OFFLINE_URL));
  return fallback || new Response('Sin conexión. Vuelve a intentarlo.', { status:503, headers:{'Content-Type':'text/plain; charset=utf-8'} });
}
async function libResponse(event){
  const cache = await caches.open(LIBS_CACHE).catch(() => null);
  const hit = cache ? await cache.match(event.request) : undefined;
  const network = fetch(event.request).then(res => {
    if(cache && (res.ok || res.type === 'opaque')) cache.put(event.request, res.clone()).catch(() => {});
    return res;
  });
  if(hit){ event.waitUntil(network.catch(() => {})); return hit; }
  return network;
}

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
const OFFLINE_URL = new URL('offline.html', SCOPE_URL).pathname;
const ASSETS = [
  ...['manifest.json','manifest-gestor.json','offline.html']
    .map(path => new URL(path, SCOPE_URL).pathname),
  ...['icons/icon-192.png','icons/icon-512.png']
    .map(path => new URL(path, self.location.origin + '/').pathname)
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
  if(e.request.headers.has('X-DS-Connectivity-Probe')) {
    e.respondWith(fetch(e.request, { cache:'no-store' }).catch(() =>
      new Response(null, { status:503, statusText:'Offline' })
    ));
    return;
  }
  // El worker de produccion tiene scope raiz y tambien ve /dev. No debe
  // interceptarlo: una respuesta cacheada de produccion hacia que el gestor
  // movil de desarrollo terminara navegando a /gestor.html.
  if(!IS_DEV_SCOPE && url.pathname.startsWith('/dev/')) return;
  if(url.pathname.endsWith('/sw.js')) {
    e.respondWith(fetch(e.request, { cache:'no-store' }));
    return;
  }
  const isNavigation = e.request.mode === 'navigate';
  const isHtml = e.request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html');

  if((isNavigation || isHtml) && url.origin === self.location.origin && SHELL_PAGE.test(url.pathname)) {
    e.respondWith(shellResponse(e, url));
    return;
  }

  if(LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(libResponse(e));
    return;
  }

  if(isNavigation || isHtml) {
    e.respondWith(
      (async() => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const response = await fetch(e.request, { cache:'no-store', signal:controller.signal });
          if(response.status < 500) return response;
        } catch(_) {
        } finally {
          clearTimeout(timeout);
        }
        const fallback = await caches.open(CACHE_NAME).then(cache => cache.match(OFFLINE_URL));
        return fallback || new Response('Sin conexión. Vuelve a intentarlo.', { status:503, headers:{'Content-Type':'text/plain; charset=utf-8'} });
      })()
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
