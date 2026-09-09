(async function () {
  'use strict';
  const C = window.LandingCore, $ = id => document.getElementById(id);
  const form = $('editorForm'), fields = $('editorFields');
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  let user = null, draft = C.sanitize({}), published = false, fixedSlug = '', version = 0, dirty = false, busy = false;
  let inventory = {}, prices = {}, timer;
  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(timer); timer = setTimeout(() => { $('toast').hidden = true; }, 5000); }
  function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
  function setBusy(value) { busy = value; fields.disabled = value; $('save').disabled = value; $('publish').disabled = value; $('pause').disabled = value || !published; }
  async function api(path, body) {
    if (!user) throw new Error('Inicia sesión para continuar.');
    const response = await fetch(`${window.LANDING_CONFIG.apiBase}/${path}`, {
      method: body ? 'POST' : 'GET', headers: { 'Authorization': `Bearer ${await user.getIdToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000), cache: 'no-store'
    });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('La publicación aún no está conectada. Configura el servicio de landing para este sitio.');
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.'); return data;
  }
  function tab(name) {
    document.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('selected', b.dataset.tab === name); b.setAttribute('aria-current', b.dataset.tab === name ? 'page' : 'false'); });
    document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== name; });
  }
  function readForm() {
    const raw = { ...draft };
    for (const name of ['name','description','logo','cover','whatsapp','cta','template','color','font','currency']) raw[name] = form.elements.namedItem(name).value;
    raw.showPrices = form.elements.showPrices.checked;
    // Preserve product object identities: their controls keep references until rerender.
    draft = { ...C.sanitize(raw), products: draft.products }; return draft;
  }
  function fillForm() {
    for (const name of ['name','description','logo','cover','whatsapp','cta','template','color','font','currency']) form.elements.namedItem(name).value = draft[name];
    form.elements.showPrices.checked = draft.showPrices; renderProducts(); preview();
  }
  function markDirty() { dirty = true; status('Cambios sin publicar · Guarda un borrador o publica cuando esté listo.'); }
  function preview() {
    $('previewTemplateName').textContent = {catalog:'Cine',elegant:'Premiere',compact:'Express',spotlight:'Estreno',neon:'Neón',magazine:'Cartelera'}[draft.template] || 'Cine';
    document.querySelectorAll('[data-color]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color === draft.color)));
    $('preview').contentWindow?.postMessage({ type: 'landing-preview', catalog: C.publicCatalog(draft, inventory, prices) }, location.origin);
  }
  function mergeOptions() {
    const existing = new Set(draft.products.map(p => p.id));
    for (const item of C.options(inventory, prices)) if (!existing.has(item.id)) draft.products.push({ ...item, enabled: item.mode === 'profile', priceSource: item.mode === 'profile' ? 'gestor' : 'custom', description: '', duration: '', image: '', showPrice: true, featured: false });
    draft = C.sanitize(draft);
  }
  function label(text, control) { const l = document.createElement('label'); l.append(document.createTextNode(text), control); return l; }
  function input(type, value, update, max) {
    const i = document.createElement('input'); i.type = type; if (type === 'checkbox') i.checked = value; else i.value = value ?? '';
    if (max) i.maxLength = max; if (type === 'number') { i.min = '0.01'; i.max = '1000000'; i.step = '.01'; }
    i.addEventListener('input', () => { update(type === 'checkbox' ? i.checked : i.value); markDirty(); preview(); }); return i;
  }
  function renderProducts() {
    const root = $('products'); root.replaceChildren();
    if (!draft.products.length) { const p = document.createElement('p'); p.className = 'help'; p.textContent = 'Añade cuentas en el gestor y pulsa «Actualizar productos del gestor» para preparar tu catálogo.'; root.append(p); }
    draft.products.forEach((p, index) => {
      const details = document.createElement('details'), summary = document.createElement('summary'), body = document.createElement('div');
      const modeLabel = p.mode === 'full' ? 'Cuenta completa' : 'Perfil';
      const toggle = input('checkbox', p.enabled, v => { p.enabled = v; }); toggle.setAttribute('aria-label', `Ofrecer ${p.name} · ${modeLabel}`); toggle.addEventListener('click', e => e.stopPropagation());
      const title = document.createElement('span'); title.textContent = `${p.name} · ${modeLabel}`; summary.append(toggle, title);
      body.append(label('Nombre del producto', input('text', p.name, v => { p.name = v; title.textContent = `${v} · ${modeLabel}`; toggle.setAttribute('aria-label', `Ofrecer ${v} · ${modeLabel}`); }, 100)));
      body.append(label('Descripción', input('text', p.description, v => { p.description = v; }, 260)));
      body.append(label('Duración de la oferta', input('text', p.duration, v => { p.duration = v; }, 60)));
      body.append(label('Imagen · enlace HTTPS', input('url', p.image, v => { p.image = v; }, 1600)));
      const source = document.createElement('select');
      for (const [value, text] of [['gestor','Usar precio del gestor'],['custom','Precio para esta landing']]) { if (value === 'gestor' && p.mode === 'full') continue; const opt = document.createElement('option'); opt.value = value; opt.textContent = text; source.append(opt); }
      source.value = p.priceSource;
      const price = input('number', p.price, v => { p.price = C.money(v); }); price.disabled = p.priceSource === 'gestor';
      source.onchange = () => { p.priceSource = source.value; price.disabled = source.value === 'gestor'; markDirty(); preview(); };
      body.append(label('Origen del precio', source), label('Precio personalizado', price));
      for (const [field, name] of [['showPrice','Permitir mostrar el precio de este producto'],['featured','Destacar producto']]) { const l = label(name, input('checkbox', p[field], v => { p[field] = v; })); l.className = 'toggle'; body.append(l); }
      const order = document.createElement('div'); order.className = 'order-buttons';
      for (const [offset, text] of [[-1,'↑ Subir'],[1,'↓ Bajar']]) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'button secondary'; b.textContent = text; b.disabled = index+offset < 0 || index+offset >= draft.products.length;
        b.onclick = () => { [draft.products[index],draft.products[index+offset]] = [draft.products[index+offset],draft.products[index]]; renderProducts(); markDirty(); preview(); }; order.append(b);
      }
      body.append(order); details.append(summary, body); root.append(details);
    });
  }
  function link() { const url = new URL('tienda.html', location.href); url.searchParams.set('s', fixedSlug || $('slug').value.trim()); return url.href; }
  function updateLink() {
    $('publicLink').textContent = $('slug').value ? link() : 'Elige una dirección para tu tienda.';
    $('copyLink').disabled = !published; $('visitLink').hidden = !published; if (published) $('visitLink').href = link();
    $('slug').readOnly = !!fixedSlug; $('pause').disabled = busy || !published;
  }
  async function save(publish = false) {
    if (busy) return; readForm(); const slug = $('slug').value.trim();
    try { if (publish) C.validate(draft, slug); } catch (err) { toast(err.message); tab(!draft.name || !/^[1-9]\d{7,14}$/.test(draft.whatsapp) ? 'brand' : 'share'); return; }
    setBusy(true); status(publish ? 'Preparando tu publicación…' : 'Guardando borrador…');
    try {
      if (demo) { localStorage.setItem('landing-demo-draft', JSON.stringify(draft)); toast('Borrador de demostración guardado en este navegador. No se publicó.'); }
      else {
        const result = await api(publish ? 'publish' : 'draft', { config: draft, slug, expectedVersion: version });
        version = result.version; published = result.published; fixedSlug = result.slug || fixedSlug;
        toast(publish ? 'Diseño guardado. El catálogo se está sincronizando.' : 'Borrador guardado.');
      }
      dirty = false; updateLink(); status(demo ? 'Demostración · los cambios no se publican.' : published ? 'Diseño guardado · los cambios aparecerán al terminar la sincronización.' : 'Borrador guardado · tu landing aún no está publicada.');
    } catch (err) { status(err.message, true); toast(err.message); } finally { setBusy(false); }
  }
  form.addEventListener('submit', e => e.preventDefault());
  form.addEventListener('input', e => { if (e.target.name) { readForm(); markDirty(); preview(); } });
  // Some native pickers emit change only; the preview deduplicates identical data.
  form.addEventListener('change', e => { if (e.target.name) { readForm(); markDirty(); preview(); } });
  $('slug').addEventListener('input', () => { updateLink(); markDirty(); });
  document.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => tab(b.dataset.tab); });
  document.querySelectorAll('[data-next]').forEach(b => { b.onclick = () => { tab(b.dataset.next); if (innerWidth <= 800) document.querySelector('.tabs').scrollIntoView({ behavior: 'smooth' }); }; });
  document.querySelectorAll('[data-device]').forEach(b => { b.onclick = () => { $('preview').classList.toggle('mobile', b.dataset.device === 'mobile'); document.querySelectorAll('[data-device]').forEach(n => n.classList.toggle('selected', n === b)); }; });
  document.querySelectorAll('[data-color]').forEach(b => { b.onclick = () => { form.elements.color.value = b.dataset.color; readForm(); markDirty(); preview(); }; });
  $('expandPreview').onclick = () => { const expanded = document.body.classList.toggle('focus-preview'); $('expandPreview').setAttribute('aria-pressed', String(expanded)); $('expandPreview').setAttribute('aria-label', expanded ? 'Volver al editor' : 'Ampliar vista previa'); $('expandPreview').title = expanded ? 'Volver al editor' : 'Ampliar vista previa'; };
  const previewNavigation=document.createElement('nav');previewNavigation.className='preview-navigation';previewNavigation.setAttribute('aria-label','Recorrer vista previa');
  for(const [section,label] of [['cover','Portada'],['catalog','Catálogo'],['contact','Contacto']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>$('preview').contentWindow?.postMessage({type:'landing-preview-section',section},location.origin);previewNavigation.append(button);}
  document.querySelector('.preview-stage').before(previewNavigation);
  $('replayMotion').onclick = () => { $('preview').contentWindow?.postMessage({type:'landing-preview',catalog:C.publicCatalog(draft,inventory,prices),replay:true},location.origin); };
  document.querySelectorAll('[data-area]').forEach(b => { b.onclick = () => { document.body.classList.toggle('preview-area', b.dataset.area === 'preview'); document.querySelectorAll('[data-area]').forEach(n => n.classList.toggle('selected', n === b)); }; });
  addEventListener('message', e => { if (e.origin === location.origin && e.source === $('preview').contentWindow && e.data?.type === 'landing-preview-ready') preview(); });
  $('preview').addEventListener('load', preview);
  $('save').onclick = () => save(false); $('publish').onclick = () => save(true);
  $('copyLink').onclick = async () => { try { await navigator.clipboard.writeText(link()); toast('Enlace copiado.'); } catch (_) { toast('No se pudo copiar. Selecciona el enlace para copiarlo.'); } };
  $('testWhatsapp').onclick = () => { readForm(); const url = C.whatsappUrl(draft.whatsapp, draft.name); if (!url) return toast('Escribe un WhatsApp válido con código de país.'); window.open(url, '_blank', 'noopener,noreferrer'); };
  $('pause').onclick = () => $('pauseDialog').showModal(); $('cancelPause').onclick = () => $('pauseDialog').close();
  $('confirmPause').onclick = async () => {
    $('pauseDialog').close(); setBusy(true);
    try { const result = await api('pause', { expectedVersion: version }); published = false; version = result.version; updateLink(); status('Landing pausada. El catálogo se retirará al terminar la sincronización y vencer la caché.'); toast('Publicación pausada.'); }
    catch (err) { toast(err.message); status(err.message, true); } finally { setBusy(false); }
  };
  $('refreshProducts').onclick = async () => {
    if (demo) return toast('Estos productos son de demostración.');
    setBusy(true);
    try { const result = await api('editor'); inventory = result.inventory; prices = result.prices; const before = JSON.stringify(draft.products); mergeOptions(); if (JSON.stringify(draft.products) !== before) markDirty(); renderProducts(); preview(); toast('Productos actualizados.'); }
    catch (err) { toast(err.message); } finally { setBusy(false); }
  };
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  if (matchMedia('(max-width:800px)').matches) document.querySelector('.back-link').href = 'gestor-mobile.html';
  try {
    if (demo) {
      $('demoNotice').hidden = false;
      inventory = { a: { platform: 'Netflix', profile: true, full: false, due: '2099-12-31' }, b: { platform: 'Disney+', profile: true, full: true, due: '2099-12-31' }, c: { platform: 'Prime Video', profile: true, full: false, due: '2099-12-31' } };
      prices = { Netflix: { salePrice: 15 }, 'Disney+': { salePrice: 12 }, 'Prime Video': { salePrice: 10 } };
      let saved; try { saved = JSON.parse(localStorage.getItem('landing-demo-draft')); } catch (_) {}
      draft = C.sanitize(saved || { name: 'Nova Streaming', description: 'Tus historias favoritas, en un solo lugar. Elige tu plataforma y te ayudamos a comenzar.', showPrices: true, color: '#146c60' });
      mergeOptions(); if (!saved) draft.products.forEach(p => { p.name = p.platform; p.duration = '30 días'; p.description = 'Disfruta tus series y películas favoritas.'; p.featured = p.platform === 'Netflix'; });
      status('Demostración · prueba las plantillas y la personalización.');
    } else {
      const [{ initializeApp }, { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence }] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'), import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')
      ]);
      const app = initializeApp({ apiKey: 'AIzaSyA2zuPnReyy7eeTC8Lw_UfkfSg96-V5UnY', authDomain: 'plantillas-bfaeb.firebaseapp.com', projectId: 'plantillas-bfaeb', appId: '1:382002543593:web:87ad0a3b3c1f32b3daa978' });
      const auth = getAuth(app); await setPersistence(auth, browserLocalPersistence);
      user = await new Promise(resolve => { const off = onAuthStateChanged(auth, u => { off(); resolve(u); }); });
      if (!user) { location.replace(`gestor-login.html?next=${encodeURIComponent('/mi-landing.html')}`); return; }
      const result = await api('editor'); inventory = result.inventory; prices = result.prices;
      draft = C.sanitize(result.draft); version = result.version; published = result.published; fixedSlug = result.slug || ''; $('slug').value = fixedSlug || result.draftSlug || ''; mergeOptions();
      status(published ? 'Tu landing está publicada. Los cambios de diseño se guardan al publicar.' : 'Empieza con tu negocio, elige una plantilla y prepara tu catálogo.');
    }
    fillForm(); updateLink(); setBusy(false);
  } catch (err) { status(err.message || 'No se pudo conectar. Recarga la página para volver a intentarlo.', true); }
})();
