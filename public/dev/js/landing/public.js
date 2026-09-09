(async function () {
  'use strict';
  const root = document.getElementById('store');
  const params = new URLSearchParams(location.search);
  const preview = params.get('preview') === '1';
  let lastSignature = '';
  function state(title, message, retry = false) {
    lastSignature = ''; delete root.dataset.renderedTemplate;
    root.replaceChildren(); const box = document.createElement('div'); box.className = 'page-state';
    const h = document.createElement('h1'); h.textContent = title; const p = document.createElement('p'); p.textContent = message; box.append(h,p);
    if (retry) { const b = document.createElement('button'); b.className = 'contact'; b.textContent = 'Volver a intentar'; b.onclick = () => load(); box.append(b); } root.append(box);
  }
  function show(data, replay = false) {
    if (!data || data.published !== true) return state('Catálogo no disponible', 'Esta tienda no está publicada en este momento.');
    const signature = JSON.stringify(data);
    if (!replay && signature === lastSignature) return;
    lastSignature = signature;
    if (replay) delete root.dataset.renderedTemplate;
    const templateChanged=root.dataset.renderedTemplate!==data.template;
    window.LandingRender(root, data, preview); document.title = `${data.name} · Catálogo`;
    if(preview && (templateChanged || replay)) window.scrollTo({top:0,behavior:'instant'});
    document.querySelector('meta[name="description"]').content = data.description || `Consulta el catálogo de ${data.name}.`;
  }
  if (preview) {
    state('Tu landing empieza aquí', 'Personaliza tu negocio para ver los cambios.');
    addEventListener('message', e => {
      if(e.origin!==location.origin || e.source!==parent) return;
      if(e.data?.type==='landing-preview') show(e.data.catalog,e.data.replay===true);
      if(e.data?.type==='landing-preview-section'){
        const target={cover:'.store-header',catalog:'#catalogo',contact:'.closing-banner'}[e.data.section];
        if(target)root.querySelector(target)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
      }
    });
    parent.postMessage({ type: 'landing-preview-ready' }, location.origin); return;
  }
  const slug = params.get('s') || location.pathname.match(/\/tienda\/([a-z0-9-]+)\/?$/)?.[1];
  if (!slug || !/^[a-z0-9][a-z0-9-]{2,38}[a-z0-9]$/.test(slug)) return state('No encontramos esta tienda', 'Revisa el enlace que te compartieron.');
  let lastFetch = 0, inFlight = false;
  async function load() {
    if (inFlight) return;
    inFlight = true; lastFetch = Date.now();
    try {
      const response = await fetch(`${window.LANDING_CONFIG.apiBase}/catalog/${encodeURIComponent(slug)}`, { credentials: 'omit', signal: AbortSignal.timeout(12000) });
      if (response.status === 404) { state('Catálogo no disponible', 'Esta tienda no está publicada en este momento.'); return; }
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Unavailable');
      show(await response.json()); document.getElementById('refreshNote').hidden = true;
    } catch (_) { state('No pudimos cargar el catálogo', 'Comprueba tu conexión y vuelve a intentarlo.', true); }
    finally { inFlight = false; }
  }
  await load();
  // Refresh only while visible. This endpoint reads a prepared object, never Firestore.
  setInterval(() => { if (!document.hidden && Date.now()-lastFetch >= 60000) load(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now()-lastFetch >= 60000) load(); });
})();
