/* Diseños Streaming · Landings de revendedores
 * Núcleo compartido por el editor (mi-landing.html), la página pública
 * (tienda.html) y las plantillas (js/landing-templates-*.js).
 * Sin dependencias. Expone window.LandingCore.
 */
(function (root) {
  'use strict';

  const FIREBASE = Object.freeze({
    apiKey: 'AIzaSyA2zuPnReyy7eeTC8Lw_UfkfSg96-V5UnY',
    authDomain: 'plantillas-bfaeb.firebaseapp.com',
    projectId: 'plantillas-bfaeb'
  });
  const CLOUDINARY = Object.freeze({ cloud: 'dwqtksxrp', preset: 'templatestudio', folder: 'landings' });
  // Imágenes de landings: Firebase Storage (no Cloudinary). Ruta: landings/{uid}/{archivo}.
  const STORAGE = Object.freeze({ bucket: 'plantillas-bfaeb.firebasestorage.app', folder: 'landings', maxBytes: 1024 * 1024 });
  const COLLECTION = 'public_catalogs';

  // ---------- utilidades de texto ----------
  const text = (v, max = 160) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const keyOf = v => String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

  // ---------- slug ----------
  const RESERVED = new Set(['admin', 'api', 'dev', 'gestor', 'login', 'editor', 'tienda', 'landing', 's', 'www', 'app', 'soporte', 'help', 'disenosstreaming']);
  function slugify(v) {
    return String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }
  function slugError(slug) {
    if (!slug) return 'Escribe el nombre de tu enlace.';
    if (slug.length < 3) return 'Usa al menos 3 letras o números.';
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) return 'Solo letras, números y guiones.';
    if (RESERVED.has(slug)) return 'Ese nombre está reservado. Prueba otro.';
    return '';
  }

  // ---------- enlaces ----------
  function safeUrl(value) {
    try {
      let raw = text(value, 1000);
      if (!raw) return '';
      if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = 'https://' + raw;
      const url = new URL(raw);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
      return url.href;
    } catch (_) { return ''; }
  }
  function safeImage(value) {
    const url = safeUrl(value);
    return url.startsWith('https://') ? url : '';
  }
  const phoneDigits = v => String(v ?? '').replace(/\D+/g, '').slice(0, 16);
  function whatsappUrl(phone, message) {
    const n = phoneDigits(phone);
    if (!n) return '';
    return `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  }
  // Tipos de enlaces personalizados. icon = nombre corto usado por las plantillas.
  const LINK_TYPES = [
    { id: 'whatsapp', label: 'WhatsApp' }, { id: 'instagram', label: 'Instagram' },
    { id: 'tiktok', label: 'TikTok' }, { id: 'facebook', label: 'Facebook' },
    { id: 'telegram', label: 'Telegram' }, { id: 'youtube', label: 'YouTube' },
    { id: 'web', label: 'Sitio web' }, { id: 'other', label: 'Otro enlace' }
  ];
  const LINK_ICONS = {
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 3c.4 2.2 1.8 3.6 4 3.8v3.3a7.6 7.6 0 0 1-4-1.2v6.5A6.1 6.1 0 1 1 10.5 9.3v3.4a2.8 2.8 0 1 0 2.8 2.8V3h3.3Z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8Z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.9 4.3 18.8 19c-.2 1-.8 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.7-7.9c.4-.3-.1-.5-.6-.2L6.8 12.9 2.2 11.5c-1-.3-1-1 .2-1.5l18-6.9c.8-.3 1.6.2 1.5 1.2Z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.8 15V9l5.7 3-5.7 3Z"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>'
  };

  // ---------- plataformas ----------
  const PLATFORMS = [
    { id: 'netflix', name: 'Netflix', color: '#E50914', logo: '/logos/Netflix.svg' },
    { id: 'disney', name: 'Disney+', color: '#113CCF', logo: '/logos/Disney.svg' },
    { id: 'max', name: 'Max', color: '#002BE7', logo: '/logos/max.svg' },
    { id: 'prime', name: 'Prime Video', color: '#00A8E1', logo: '/logos/primevideo.svg' },
    { id: 'spotify', name: 'Spotify', color: '#1DB954', logo: '/logos/Spotify.svg' },
    { id: 'youtube', name: 'YouTube Premium', color: '#FF0000', logo: '/logos/youtube.svg' },
    { id: 'paramount', name: 'Paramount+', color: '#0064FF', logo: '/logos/Paramount.svg' },
    { id: 'vix', name: 'ViX', color: '#FF5A00', logo: '/logos/vix.svg' },
    { id: 'crunchyroll', name: 'Crunchyroll', color: '#F47521', logo: '/logos/Crunchyroll.svg' },
    { id: 'apple', name: 'Apple TV+', color: '#555555', logo: '/logos/Apple%20tv.svg' },
    { id: 'universal', name: 'Universal+', color: '#1A1A8C', logo: '/logos/Universal.svg' },
    { id: 'iptv', name: 'IPTV', color: '#7C3AED', logo: '/logos/IPTV.svg' },
    { id: 'directv', name: 'DirecTV GO', color: '#00A3E0', logo: '/logos/Directv%20Go.svg' },
    { id: 'l1max', name: 'L1 MAX', color: '#D4002A', logo: '/logos/L1%20MAX.svg' },
    { id: 'movistar', name: 'Movistar TV', color: '#019DF4', logo: '/logos/Movistar.svg' },
    { id: 'chatgpt', name: 'ChatGPT Plus', color: '#10A37F', logo: '/logos/Chat%20GPT.svg' },
    { id: 'canva', name: 'Canva Pro', color: '#00C4CC', logo: '/logos/Canva.svg' },
    { id: 'capcut', name: 'CapCut Pro', color: '#111111', logo: '/logos/Capcut.svg' },
    { id: 'deezer', name: 'Deezer', color: '#A238FF', logo: '/logos/Deezer.svg' },
    { id: 'viki', name: 'Viki Rakuten', color: '#1E90FF', logo: '/logos/viki.svg' },
    { id: 'googleone', name: 'Google One', color: '#4285F4', logo: '/logos/Google%20One.svg' },
    { id: 'gemini', name: 'Gemini', color: '#8E75FF', logo: '/logos/GEMINI.svg' },
    { id: 'ufc', name: 'UFC Fight Pass', color: '#D20A0A', logo: '/logos/UFC.svg' },
    { id: 'fanatiz', name: 'Fanatiz', color: '#00C853', logo: '/logos/Fanatiz.svg' },
    { id: 'other', name: 'Otro', color: '#7C3AED', logo: '' }
  ];
  const ALIASES = { disneyplus: 'disney', hbo: 'max', hbomax: 'max', primevideo: 'prime', amazon: 'prime', youtubepremium: 'youtube', appletv: 'apple', chatgptplus: 'chatgpt', gpt: 'chatgpt', canvapro: 'canva', paramountplus: 'paramount' };
  function platformInfo(idOrName) {
    const k = keyOf(idOrName);
    const id = ALIASES[k] || k;
    return PLATFORMS.find(p => p.id === id) || PLATFORMS.find(p => keyOf(p.name) === k) ||
      { id: 'other', name: text(idOrName, 40) || 'Otro', color: '#7C3AED', logo: '' };
  }

  // ---------- dinero ----------
  const CURRENCIES = { PEN: 'S/', USD: '$', MXN: '$', COP: '$', ARS: '$', CLP: '$', BOB: 'Bs', EUR: '€', USDT: 'USDT' };
  function money(value, currency = 'PEN') {
    const n = Number(String(value ?? '').replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return '';
    const sym = CURRENCIES[currency] || currency || '';
    const num = n % 1 === 0 ? String(n) : n.toFixed(2);
    return sym === 'USDT' ? `${num} USDT` : `${sym} ${num}`;
  }

  // ---------- plantillas (registro) ----------
  const templates = new Map();
  /** def = { id, name, description, tags:[...], preview:{bg,fg,accent}, render(root, data, ctx) }
   *  render pinta TODO dentro de root (un elemento vacío). Debe ser idempotente,
   *  no tocar fuera de root (estilos con prefijo .lt-<id>), y respetar ctx.reducedMotion. */
  function registerTemplate(def) {
    if (!def || !def.id || typeof def.render !== 'function') throw new Error('Plantilla inválida');
    templates.set(def.id, Object.freeze({ ...def }));
  }
  const listTemplates = () => [...templates.values()];
  const getTemplate = id => templates.get(id) || templates.values().next().value;

  // Inserta una vez una hoja de estilos por plantilla (id único).
  function injectCss(id, css) {
    if (typeof document === 'undefined') return;
    const domId = 'lt-css-' + id;
    if (document.getElementById(domId)) return;
    const style = document.createElement('style');
    style.id = domId; style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------- modelo de datos ----------
  const DEFAULTS = Object.freeze({
    template: 'cine', name: 'Mi Streaming', tagline: 'Tus plataformas favoritas al mejor precio',
    heroTitle: 'Todo el entretenimiento en un solo lugar',
    heroSubtitle: 'Cuentas y perfiles originales, activación inmediata y soporte por WhatsApp.',
    ctaText: 'Comprar por WhatsApp', whatsapp: '', whatsappMessage: 'Hola, quiero información sobre ',
    currency: 'PEN', logoUrl: '', coverUrl: '',
    theme: { primary: '#7C3AED', accent: '#22D3EE', mode: 'dark' },
    headerStyle: 'cover', motion: 'normal',
    plans: [], combos: [], links: [], benefits: [], faq: [], paymentMethods: [], enabled: true
  });

  /** Normaliza cualquier objeto al formato guardado. Úsalo antes de guardar y al leer. */
  function normalize(raw = {}, ownerUid = '') {
    const d = raw || {};
    const color = v => /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v) : '';
    const list = (arr, max) => Array.isArray(arr) ? arr.slice(0, max) : [];
    const plans = list(d.plans, 40).map((p, i) => ({
      id: text(p?.id, 40) || `p${i}`, platform: platformInfo(p?.platform).id === 'other' ? text(p?.platform, 40) : platformInfo(p?.platform).id,
      title: text(p?.title, 60), price: text(p?.price, 12), oldPrice: text(p?.oldPrice, 12),
      period: text(p?.period, 24) || '1 mes', type: ['profile', 'full'].includes(p?.type) ? p.type : 'profile',
      features: list(p?.features, 6).map(f => text(f, 60)).filter(Boolean), badge: text(p?.badge, 24),
      imageUrl: safeImage(p?.imageUrl), visible: p?.visible !== false
    })).filter(p => p.platform);
    const combos = list(d.combos, 20).map((c, i) => ({
      id: text(c?.id, 40) || `c${i}`, name: text(c?.name, 60) || 'Combo',
      platforms: list(c?.platforms, 8).map(x => { const inf = platformInfo(x); return inf.id === 'other' ? text(x, 40) : inf.id; }).filter(Boolean),
      price: text(c?.price, 12), oldPrice: text(c?.oldPrice, 12), period: text(c?.period, 24) || '1 mes',
      badge: text(c?.badge, 24), visible: c?.visible !== false
    })).filter(c => c.platforms.length);
    const links = list(d.links, 12).map(l => ({
      type: LINK_TYPES.some(t => t.id === l?.type) ? l.type : 'other',
      label: text(l?.label, 40), url: safeUrl(l?.url)
    })).filter(l => l.url);
    const theme = { primary: color(d.theme?.primary) || DEFAULTS.theme.primary, accent: color(d.theme?.accent) || DEFAULTS.theme.accent,
      mode: d.theme?.mode === 'light' ? 'light' : 'dark' };
    return {
      ownerUid: text(ownerUid || d.ownerUid, 128), slug: slugify(d.slug), template: text(d.template, 30) || DEFAULTS.template,
      name: text(d.name, 80) || DEFAULTS.name, tagline: text(d.tagline, 120), heroTitle: text(d.heroTitle, 120),
      heroSubtitle: text(d.heroSubtitle, 240), ctaText: text(d.ctaText, 40) || DEFAULTS.ctaText,
      whatsapp: phoneDigits(d.whatsapp), whatsappMessage: text(d.whatsappMessage, 160),
      currency: CURRENCIES[d.currency] ? d.currency : 'PEN', logoUrl: safeImage(d.logoUrl), coverUrl: safeImage(d.coverUrl),
      // Versión ligera de la portada (≈800 px) para celulares; vacía si no existe.
      coverSmUrl: safeImage(d.coverSmUrl),
      theme, plans, combos, links,
      benefits: list(d.benefits, 6).map(b => text(b, 80)).filter(Boolean),
      faq: list(d.faq, 10).map(f => ({ q: text(f?.q, 120), a: text(f?.a, 400) })).filter(f => f.q && f.a),
      paymentMethods: list(d.paymentMethods, 8).map(p => text(p, 30)).filter(Boolean),
      // Cabecera: 'cover' = portada propia de la plantilla; 'profile' = estilo perfil de Facebook (portada + logo redondo).
      headerStyle: d.headerStyle === 'profile' ? 'profile' : 'cover',
      // Nivel de animación: 'calm' (tranquilo), 'normal' (animado), 'max' (espectacular).
      motion: ['calm', 'normal', 'max'].includes(d.motion) ? d.motion : 'normal',
      enabled: d.enabled !== false,
      // Compatibilidad con la regla existente de Firestore (lista obligatoria, <= 50).
      platforms: [...new Set(plans.map(p => p.platform).concat(combos.flatMap(c => c.platforms)))].slice(0, 50),
      updatedAt: Date.now()
    };
  }

  /** Datos de ejemplo para vista previa y miniaturas de plantillas. */
  function sampleData() {
    return normalize({
      ...DEFAULTS, name: 'StreamZone', whatsapp: '51900000000', slug: 'demo',
      plans: [
        { platform: 'netflix', price: '15', oldPrice: '20', type: 'profile', badge: 'Más vendido', features: ['Perfil personal', 'Calidad 4K', 'Garantía 30 días'] },
        { platform: 'disney', price: '10', type: 'profile', features: ['Perfil personal', 'Star+ incluido'] },
        { platform: 'max', price: '10', type: 'profile', features: ['Perfil personal', 'HD'] },
        { platform: 'prime', price: '8', type: 'profile', features: ['Perfil personal'] },
        { platform: 'spotify', price: '9', type: 'full', features: ['Cuenta propia', 'Sin anuncios'] },
        { platform: 'youtube', price: '9', type: 'full', features: ['Sin anuncios', 'YouTube Music'] }
      ],
      combos: [
        { name: 'Combo Cine', platforms: ['netflix', 'disney', 'max'], price: '30', oldPrice: '35', badge: 'Ahorra S/ 5' },
        { name: 'Combo Total', platforms: ['netflix', 'disney', 'max', 'prime', 'spotify'], price: '45', oldPrice: '52', badge: 'Mejor precio' }
      ],
      benefits: ['Activación inmediata', 'Soporte 24/7 por WhatsApp', 'Garantía en todo el periodo', 'Pago fácil: Yape, Plin, transferencia'],
      faq: [{ q: '¿Cuánto tarda la entrega?', a: 'Entre 5 y 15 minutos después de confirmar tu pago.' },
        { q: '¿Qué pasa si falla mi cuenta?', a: 'Te la reponemos sin costo durante todo el periodo contratado.' }],
      paymentMethods: ['Yape', 'Plin', 'Transferencia'],
      links: [{ type: 'instagram', url: 'https://instagram.com/' }, { type: 'tiktok', url: 'https://tiktok.com/' }]
    }, 'demo');
  }

  /** Contexto común que reciben las plantillas en render(root, data, ctx). */
  function buildContext(data, opts = {}) {
    const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {
      preview: !!opts.preview, reducedMotion,
      esc, money: v => money(v, data.currency), platformInfo, linkIcon: t => LINK_ICONS[t] || LINK_ICONS.other,
      linkLabel: l => l.label || (LINK_TYPES.find(t => t.id === l.type) || {}).label || 'Enlace',
      /** Enlace de WhatsApp con mensaje prellenado para un producto (texto libre). */
      buy: product => whatsappUrl(data.whatsapp, [data.whatsappMessage || DEFAULTS.whatsappMessage, product || ''].join(' ').replace(/\s{2,}/g, ' ').trim()),
      planTitle: p => p.title || `${platformInfo(p.platform).name}${p.type === 'full' ? ' · Cuenta completa' : ''}`,
      typeLabel: p => p.type === 'full' ? 'Cuenta completa' : 'Perfil',
      /** true si el usuario eligió la cabecera tipo perfil de Facebook. */
      profileMode: data.headerStyle === 'profile',
      motion: reducedMotion ? 'calm' : data.motion,
      /** HTML de la cabecera tipo perfil (portada ancha + logo redondo superpuesto + nombre + acciones).
       *  La plantilla la coloca arriba de todo cuando profileMode es true, y entonces NO pinta su
       *  propia cabecera de logo ni la imagen de portada en su hero (para no repetir). */
      profileHeader: () => profileHeaderHtml(data)
    };
  }

  // ---------- cabecera tipo perfil (compartida por todas las plantillas) ----------
  function profileHeaderHtml(d) {
    const initial = esc((d.name || '?').trim().charAt(0).toUpperCase() || '?');
    const cover = d.coverUrl
      ? `<img class="ltp-cover-img" src="${esc(d.coverUrl)}" alt="" loading="eager" decoding="async">`
      : '<span class="ltp-cover-fx" aria-hidden="true"><i></i><i></i><i></i></span>';
    const avatar = d.logoUrl
      ? `<img src="${esc(d.logoUrl)}" alt="Logo de ${esc(d.name)}" decoding="async">`
      : `<span class="ltp-initial">${initial}</span>`;
    const wa = whatsappUrl(d.whatsapp, (d.whatsappMessage || DEFAULTS.whatsappMessage).replace(/\s+$/, '') + ' tus planes');
    const links = d.links.slice(0, 6).map(l => `<a class="ltp-social" href="${esc(l.url)}" target="_blank" rel="noopener" aria-label="${esc(l.label || (LINK_TYPES.find(t => t.id === l.type) || {}).label || 'Enlace')}">${LINK_ICONS[l.type] || LINK_ICONS.other}</a>`).join('');
    const count = new Set(d.plans.filter(p => p.visible).map(p => p.platform)).size;
    return `<header class="ltp" data-lt-profile>
      <div class="ltp-cover">${cover}<span class="ltp-shade" aria-hidden="true"></span></div>
      <div class="ltp-body">
        <div class="ltp-avatar"><span class="ltp-ring" aria-hidden="true"></span><span class="ltp-avatar-in">${avatar}</span></div>
        <div class="ltp-info">
          <h1 class="ltp-name">${esc(d.name)} <span class="ltp-check" title="Tienda verificada" aria-label="Tienda verificada"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l2.4 2.1 3.2-.4.9 3.1 2.9 1.5-1 3 1 3-2.9 1.5-.9 3.1-3.2-.4L12 22l-2.4-2.1-3.2.4-.9-3.1-2.9-1.5 1-3-1-3 2.9-1.5.9-3.1 3.2.4z"/><path fill="#fff" d="M10.6 15.6 7.4 12.4l1.4-1.4 1.8 1.8 4.6-4.6 1.4 1.4z"/></svg></span></h1>
          ${d.tagline ? `<p class="ltp-tag">${esc(d.tagline)}</p>` : ''}
          <p class="ltp-meta">${count ? `<span>${count} ${count === 1 ? 'plataforma' : 'plataformas'}</span>` : ''}<span class="ltp-online"><i></i>Atención por WhatsApp</span></p>
        </div>
        <div class="ltp-actions">
          ${wa ? `<a class="ltp-btn" data-lt-btn href="${esc(wa)}" target="_blank" rel="noopener">${LINK_ICONS.whatsapp}<span>Escríbenos</span></a>` : ''}
          ${links ? `<div class="ltp-socials">${links}</div>` : ''}
        </div>
      </div>
    </header>`;
  }

  const SHARED_CSS = `
  .lt-root .ltp{position:relative;z-index:3;max-width:1100px;margin:0 auto;padding:0 0 8px;color:#fff;font-family:inherit}
  .lt-root .ltp-cover{position:relative;height:clamp(150px,34vw,340px);overflow:hidden;border-radius:0 0 22px 22px;background:linear-gradient(135deg,var(--lt-primary),var(--lt-accent))}
  @media(min-width:1100px){.lt-root .ltp-cover{border-radius:0 0 26px 26px}}
  .lt-root .ltp-cover-img{width:100%;height:100%;object-fit:cover;display:block;transform-origin:50% 40%;animation:ltp-kb 18s ease-in-out infinite alternate}
  .lt-root .ltp-cover-fx{position:absolute;inset:0;overflow:hidden}
  .lt-root .ltp-cover-fx i{position:absolute;width:60%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.35),transparent 65%);animation:ltp-blob 9s ease-in-out infinite alternate}
  .lt-root .ltp-cover-fx i:nth-child(1){left:-10%;top:-30%}
  .lt-root .ltp-cover-fx i:nth-child(2){right:-15%;top:10%;animation-duration:12s;background:radial-gradient(circle,rgba(0,0,0,.25),transparent 65%)}
  .lt-root .ltp-cover-fx i:nth-child(3){left:30%;bottom:-50%;animation-duration:14s}
  .lt-root .ltp-shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(0,0,0,.45))}
  .lt-root .ltp-body{position:relative;display:flex;flex-wrap:wrap;align-items:flex-end;gap:14px 20px;padding:0 20px;margin-top:calc(clamp(96px,22vw,168px) / -2)}
  .lt-root .ltp-avatar{position:relative;width:clamp(96px,22vw,168px);aspect-ratio:1;flex:0 0 auto;border-radius:50%;padding:5px;animation:ltp-pop .7s cubic-bezier(.2,1.4,.4,1) both}
  .lt-root .ltp-ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,var(--lt-primary),var(--lt-accent),var(--lt-primary))}
  .lt-root .ltp-avatar-in{position:relative;display:grid;place-items:center;width:100%;height:100%;border-radius:50%;overflow:hidden;background:#111;border:4px solid #0b0b12}
  .lt-root .ltp-avatar-in img{width:100%;height:100%;object-fit:cover}
  .lt-root .ltp-initial{font-size:clamp(38px,9vw,64px);font-weight:900;color:#fff}
  .lt-root .ltp-info{flex:1 1 240px;min-width:0;padding-bottom:4px;animation:ltp-up .7s .15s ease-out both}
  .lt-root .ltp-name{display:flex;align-items:center;gap:8px;margin:0;font-size:clamp(24px,5.4vw,40px);line-height:1.1;font-weight:900;overflow-wrap:anywhere;color:inherit}
  .lt-root .ltp-check{display:inline-grid;width:.8em;height:.8em;flex:0 0 auto;color:var(--lt-accent)}
  .lt-root .ltp-check svg{width:100%;height:100%}
  .lt-root .ltp-tag{margin:6px 0 0;opacity:.85;font-size:15px;overflow-wrap:anywhere}
  .lt-root .ltp-meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin:8px 0 0;font-size:13px;opacity:.75}
  .lt-root .ltp-online{display:inline-flex;align-items:center;gap:6px}
  .lt-root .ltp-online i{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:ltp-dot 2s infinite}
  .lt-root .ltp-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding-bottom:6px;animation:ltp-up .7s .3s ease-out both}
  .lt-root .ltp-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 20px;border-radius:999px;background:#22c55e;color:#04130a;font-weight:900;text-decoration:none}
  .lt-root .ltp-btn svg{width:20px;height:20px}
  .lt-root .ltp-socials{display:flex;gap:8px}
  .lt-root .ltp-social{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.12);color:inherit;border:1px solid rgba(255,255,255,.18)}
  .lt-root .ltp-social svg{width:20px;height:20px}
  @media(max-width:640px){.lt-root .ltp-body{justify-content:center;text-align:center}.lt-root .ltp-info{flex-basis:100%}.lt-root .ltp-name,.lt-root .ltp-meta,.lt-root .ltp-actions{justify-content:center}}
  .lt-root.lt-light-profile .ltp{color:#111}
  .lt-root.lt-light-profile .ltp-avatar-in{border-color:#fff}
  .lt-root.lt-light-profile .ltp-social{background:rgba(0,0,0,.06);border-color:rgba(0,0,0,.12)}
  @keyframes ltp-kb{from{transform:scale(1)}to{transform:scale(1.12) translate(-2%,-2%)}}
  @keyframes ltp-blob{to{transform:translate(18%,22%) scale(1.25)}}
  @keyframes ltp-pop{from{opacity:0;transform:scale(.4) rotate(-12deg)}to{opacity:1;transform:none}}
  @keyframes ltp-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  @keyframes ltp-dot{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}80%,100%{box-shadow:0 0 0 9px rgba(34,197,94,0)}}
  @keyframes ltp-spin{to{transform:rotate(360deg)}}
  @keyframes lt-shine{0%,60%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(220%) skewX(-20deg)}}
  @keyframes lt-float{0%{transform:translate3d(0,0,0);opacity:0}10%{opacity:.9}90%{opacity:.9}100%{transform:translate3d(var(--dx),-110vh,0);opacity:0}}
  /* --- nivel de animación --- */
  .lt-root[data-lt-motion="max"] .ltp-ring{animation:ltp-spin 4s linear infinite}
  .lt-root[data-lt-motion="max"] [data-lt-btn]{position:relative;overflow:hidden;isolation:isolate}
  .lt-root[data-lt-motion="max"] [data-lt-btn]::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);transform:translateX(-120%) skewX(-20deg);animation:lt-shine 3.2s ease-in-out infinite;pointer-events:none;z-index:1}
  .lt-root[data-lt-motion="max"] [data-lt-card]{transition:transform .25s ease-out;transform-style:preserve-3d;will-change:transform}
  .lt-root .lt-particles{position:fixed;inset:0;pointer-events:none;z-index:2;overflow:hidden}
  .lt-root.lt-in-preview .lt-particles{position:absolute}
  .lt-root .lt-particles i{position:absolute;bottom:-20px;width:var(--s);height:var(--s);border-radius:50%;background:var(--c);opacity:0;animation:lt-float var(--t) linear var(--d) infinite;filter:none}
  .lt-root[data-lt-motion="calm"] *,.lt-root[data-lt-motion="calm"] *::before,.lt-root[data-lt-motion="calm"] *::after{animation-iteration-count:1!important}
  @media (prefers-reduced-motion: reduce){.lt-root *,.lt-root *::before,.lt-root *::after{animation:none!important;transition:none!important}.lt-root .lt-particles{display:none}}
  `;

  /** Efectos comunes según data.motion. Se aplica DESPUÉS de la plantilla. Devuelve función de limpieza. */
  function applyMotion(root, d, ctx) {
    root.dataset.ltMotion = ctx.motion;
    root.classList.toggle('lt-in-preview', !!ctx.preview);
    if (ctx.motion !== 'max') return null;
    const cleanups = [];
    // Partículas de colores de marca subiendo suavemente (12 en móvil, 20 en PC).
    const layer = document.createElement('div');
    layer.className = 'lt-particles'; layer.setAttribute('aria-hidden', 'true');
    const n = (typeof innerWidth === 'number' && innerWidth < 720) ? 12 : 20;
    const colors = [d.theme.primary, d.theme.accent, '#ffffff'];
    let html = '';
    for (let i = 0; i < n; i++) {
      const s = 3 + Math.round(Math.random() * 6);
      html += `<i style="left:${Math.round(Math.random() * 100)}%;--s:${s}px;--c:${colors[i % 3]};--t:${9 + Math.round(Math.random() * 10)}s;--d:-${Math.round(Math.random() * 15)}s;--dx:${Math.round(Math.random() * 80 - 40)}px"></i>`;
    }
    layer.innerHTML = html; root.prepend(layer);
    // Inclinación 3D de tarjetas solo con mouse (en táctil no aporta y gasta batería).
    const fine = typeof matchMedia === 'function' && matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (fine) {
      const move = e => {
        const card = e.target.closest && e.target.closest('[data-lt-card]');
        if (!card || !root.contains(card)) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(800px) rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 10).toFixed(2)}deg) translateY(-4px)`;
      };
      const leave = e => { const card = e.target.closest && e.target.closest('[data-lt-card]'); if (card && !card.contains(e.relatedTarget)) card.style.transform = ''; };
      root.addEventListener('pointermove', move, { passive: true });
      root.addEventListener('pointerout', leave, { passive: true });
      cleanups.push(() => { root.removeEventListener('pointermove', move); root.removeEventListener('pointerout', leave); });
    }
    return () => cleanups.forEach(f => f());
  }

  function render(root, data, opts = {}) {
    const d = normalize(data, data?.ownerUid);
    const tpl = getTemplate(opts.template || d.template);
    if (!tpl) { root.textContent = 'No hay plantillas cargadas.'; return; }
    if (typeof root.__ltCleanup === 'function') { try { root.__ltCleanup(); } catch (_) {} }
    root.__ltCleanup = null;
    root.innerHTML = '';
    root.className = `lt-root lt-${tpl.id}`;
    root.style.setProperty('--lt-primary', d.theme.primary);
    root.style.setProperty('--lt-accent', d.theme.accent);
    injectCss('shared', SHARED_CSS);
    // En pantallas pequeñas se usa la portada ligera: menos datos para el cliente y menos descarga.
    const narrow = typeof innerWidth === 'number' && innerWidth <= 820;
    const view = (narrow && d.coverSmUrl) ? { ...d, coverUrl: d.coverSmUrl } : d;
    const ctx = buildContext(view, opts);
    tpl.render(root, view, ctx);
    // Encadena la limpieza de la plantilla con la de los efectos comunes.
    const tplCleanup = root.__ltCleanup;
    const motionCleanup = applyMotion(root, view, ctx);
    if (motionCleanup) root.__ltCleanup = () => { try { tplCleanup && tplCleanup(); } finally { motionCleanup(); } };
  }

  root.LandingCore = Object.freeze({
    FIREBASE, CLOUDINARY, STORAGE, COLLECTION, DEFAULTS, PLATFORMS, LINK_TYPES, LINK_ICONS, CURRENCIES,
    text, esc, keyOf, slugify, slugError, safeUrl, safeImage, phoneDigits, whatsappUrl, platformInfo, money,
    registerTemplate, listTemplates, getTemplate, injectCss, normalize, sampleData, buildContext, render,
    profileHeaderHtml, SHARED_CSS
  });
})(typeof window !== 'undefined' ? window : globalThis);
