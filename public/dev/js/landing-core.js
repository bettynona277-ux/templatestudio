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
  const RESERVED = new Set(['admin', 'api', 'dev', 'gestor', 'login', 'editor', 'tienda', 'landing', 's', 'www', 'app', 'soporte', 'help', 'disenosstreaming', 'js', 'logos', 'icons', 'fonts', 'docs', 'functions', 'scripts', 'assets', 'css', 'offline', 'index', 'manifest', 'sw', 'backup', 'catalogo', 'publicidad', 'precios', 'contacto', 'registro', 'cuenta', 'mi-landing', 'mi-pagina']);
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
  // ---------- plan VIP (lo activa el admin en users/{uid}; el editor lo copia a public_catalogs) ----------
  /** Dominio propio normalizado ("https://www.Bertha.com/" → "berthastreaming.com"); '' si no es válido. */
  function normDomain(v) {
    let h = String(v ?? '').trim().toLowerCase();
    h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '').replace(/\.+$/, '').replace(/^www\./, '');
    if (h.length < 4 || h.length > 253) return '';
    return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h) && !/(^|\.)disenosstreaming\.com$/.test(h) ? h : '';
  }
  // null/ausente = sin vencimiento; un valor que no sea un número positivo → 0 (vencido: falla cerrado, igual que server.js).
  const vipUntilNum = v => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n) : 0; };
  /** 'active' (VIP vigente) | 'expired' (VIP vencido) | 'none' (cliente normal). d = datos crudos o normalizados. */
  function vipState(d, now = Date.now()) {
    if (!d || d.vip !== true) return 'none';
    const until = vipUntilNum(d.vipUntil);
    // Prueba VIP gratis (vipTrial) vencida: la tienda vuelve a ser normal (sigue visible), no "VIP vencido".
    if (until !== null && until <= now) return d.vipTrial === true ? 'none' : 'expired';
    return 'active';
  }
  const vipActive = (d, now) => vipState(d, now) === 'active';
  /** Plantillas exclusivas del plan VIP (sin VIP se pintan con la indicada). */
  const VIP_TEMPLATES = Object.freeze({ navidad: 'pop', navidad2: 'pop', navidad3: 'pop' });

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
    { id: 'apple', name: 'Apple TV+', color: '#6E6E73', logo: '/logos/appletv.svg' },
    { id: 'universal', name: 'Universal+', color: '#1A1A8C', logo: '/logos/Universal.svg' },
    { id: 'iptv', name: 'IPTV', color: '#7C3AED', logo: '/logos/IPTV.svg' },
    { id: 'directv', name: 'DirecTV GO', color: '#00A3E0', logo: '/logos/directvgo.svg' },
    { id: 'l1max', name: 'L1 MAX', color: '#D4002A', logo: '/logos/l1max.svg' },
    { id: 'movistar', name: 'Movistar TV', color: '#019DF4', logo: '/logos/Movistar.svg' },
    { id: 'chatgpt', name: 'ChatGPT Plus', color: '#10A37F', logo: '/logos/ai-chatgpt.webp' },
    { id: 'canva', name: 'Canva Pro', color: '#00C4CC', logo: '/logos/Canva.svg' },
    { id: 'capcut', name: 'CapCut Pro', color: '#3A3A3A', logo: '/logos/Capcut.svg' },
    { id: 'deezer', name: 'Deezer', color: '#A238FF', logo: '/logos/Deezer.svg' },
    { id: 'viki', name: 'Viki Rakuten', color: '#1E90FF', logo: '/logos/viki.svg' },
    { id: 'googleone', name: 'Google One', color: '#4285F4', logo: '/logos/googleone.svg' },
    { id: 'gemini', name: 'Gemini', color: '#8E75FF', logo: '/logos/ai-gemini.webp' },
    { id: 'ufc', name: 'UFC Fight Pass', color: '#D20A0A', logo: '/logos/UFC.svg' },
    { id: 'fanatiz', name: 'Fanatiz', color: '#00C853', logo: '/logos/Fanatiz.svg' },
    { id: 'cablego', name: 'Cable Go', color: '#0057B8', logo: '/logos/cablego.svg' },
    { id: 'telelatino', name: 'Tele Latino', color: '#E3262E', logo: '/logos/telelatino.svg' },
    // Nuevas (sin logo propio aún: se muestra su inicial en su color; el dueño puede subir el logo del plan).
    { id: 'claude', name: 'Claude Pro', color: '#CA6240', logo: '/logos/ai-claude.webp' },
    { id: 'perplexity', name: 'Perplexity Pro', color: '#016272', logo: '/logos/ai-perplexity.webp' },
    { id: 'midjourney', name: 'Midjourney', color: '#111111', logo: '/logos/ai-midjourney.webp' },
    { id: 'googleai', name: 'Google AI Pro', color: '#8A2BE2', logo: '/logos/ai-googleai.webp' },
    { id: 'sora', name: 'Sora', color: '#1E40FF', logo: '/logos/ai-sora.webp' },
    { id: 'veo', name: 'Google Veo', color: '#3B5BFF', logo: '/logos/ai-veo.webp' },
    { id: 'kling', name: 'Kling AI', color: '#0B0B1F', logo: '/logos/ai-kling.webp' },
    { id: 'higgsfield', name: 'Higgsfield', color: '#111111', logo: '/logos/ai-higgsfield.webp' },
    { id: 'luma', name: 'Luma AI', color: '#270C76', logo: '/logos/ai-luma.webp' },
    { id: 'krea', name: 'Krea AI', color: '#111111', logo: '/logos/ai-krea.webp' },
    { id: 'elevenlabs', name: 'ElevenLabs', color: '#170821', logo: '/logos/ai-elevenlabs.webp' },
    { id: 'gamma', name: 'Gamma', color: '#8B2FC9', logo: '/logos/ai-gamma.webp' },
    { id: 'mistral', name: 'Mistral AI', color: '#111111', logo: '/logos/ai-mistral.webp' },
    { id: 'lovable', name: 'Lovable', color: '#FF5A36', logo: '/logos/ai-lovable.webp' },
    { id: 'grammarly', name: 'Grammarly', color: '#028A73', logo: '/logos/ai-grammarly.webp' },
    { id: 'adobeexpress', name: 'Adobe Express', color: '#7E02FB', logo: '/logos/ai-adobeexpress.webp' },
    { id: 'zapier', name: 'Zapier', color: '#FF4F00', logo: '/logos/ai-zapier.webp' },
    { id: 'n8n', name: 'n8n', color: '#EA4B71', logo: '/logos/ai-n8n.webp' },
    { id: 'copilot', name: 'Copilot Pro', color: '#0078D4', logo: '' },
    { id: 'grok', name: 'SuperGrok', color: '#1F1F1F', logo: '' },
    { id: 'adobe', name: 'Adobe Creative Cloud', color: '#FA0F00', logo: '' },
    { id: 'freepik', name: 'Freepik Premium', color: '#1273EB', logo: '' },
    { id: 'envato', name: 'Envato Elements', color: '#82B440', logo: '' },
    { id: 'picsart', name: 'Picsart Pro', color: '#C209C1', logo: '' },
    { id: 'office', name: 'Microsoft 365', color: '#D83B01', logo: '' },
    { id: 'duolingo', name: 'Duolingo Super', color: '#58CC02', logo: '' },
    { id: 'applemusic', name: 'Apple Music', color: '#FA243C', logo: '' },
    { id: 'tidal', name: 'Tidal', color: '#111111', logo: '' },
    { id: 'other', name: 'Otro', color: '#7C3AED', logo: '' }
  ];
  // Categoría por defecto de cada app (el dueño puede cambiarla por plan). Lo que no está aquí va a "Otros".
  const CATEGORY_OF = {
    netflix: 'Streaming', disney: 'Streaming', max: 'Streaming', prime: 'Streaming', youtube: 'Streaming', paramount: 'Streaming', vix: 'Streaming',
    crunchyroll: 'Streaming', apple: 'Streaming', universal: 'Streaming', viki: 'Streaming',
    iptv: 'TV en vivo', directv: 'TV en vivo', movistar: 'TV en vivo', cablego: 'TV en vivo', telelatino: 'TV en vivo',
    l1max: 'Deportes', ufc: 'Deportes', fanatiz: 'Deportes',
    spotify: 'Música', deezer: 'Música', applemusic: 'Música', tidal: 'Música',
    chatgpt: 'IA', gemini: 'IA', claude: 'IA', perplexity: 'IA', midjourney: 'IA', copilot: 'IA', grok: 'IA',
    googleai: 'IA', sora: 'IA', veo: 'IA', kling: 'IA', higgsfield: 'IA', luma: 'IA', krea: 'IA', elevenlabs: 'IA', gamma: 'IA', mistral: 'IA', lovable: 'IA',
    adobeexpress: 'Diseño', grammarly: 'Productividad', zapier: 'Automatización', n8n: 'Automatización',
    canva: 'Diseño', capcut: 'Diseño', adobe: 'Diseño', freepik: 'Diseño', envato: 'Diseño', picsart: 'Diseño',
    googleone: 'Productividad', office: 'Productividad', duolingo: 'Educación'
  };
  /** Categoría que se usa para un plan: la que eligió el dueño o la de su app ("Otros" si no se conoce). */
  const planCategory = p => text(p && p.category, 24) || CATEGORY_OF[platformInfo(p && p.platform).id] || 'Otros';
  const CATEGORIES = ['Streaming', 'TV en vivo', 'Deportes', 'Música', 'IA', 'Diseño', 'Productividad', 'Automatización', 'Educación', 'Otros'];
  const ALIASES = { googleaipro: 'googleai', geminiadvanced: 'gemini', googleveo: 'veo', veo3: 'veo', openaisora: 'sora', klingai: 'kling', lumaai: 'luma', dreammachine: 'luma', kreaai: 'krea', eleven: 'elevenlabs', gammaapp: 'gamma', mistralai: 'mistral', lechat: 'mistral', lovabledev: 'lovable', grammarlypremium: 'grammarly', adobeexpresspremium: 'adobeexpress', zapierpro: 'zapier', claudeai: 'claude', claudepro: 'claude', perplexitypro: 'perplexity', copilotpro: 'copilot', microsoft365: 'office', office365: 'office', adobecc: 'adobe', adobecreativecloud: 'adobe', freepikpremium: 'freepik', envatoelements: 'envato', duolingosuper: 'duolingo', supergrok: 'grok', picsartpro: 'picsart', disneyplus: 'disney', starplus: 'disney', star: 'disney', hbo: 'max', hbomax: 'max', primevideo: 'prime', amazon: 'prime', amazonprime: 'prime', amazonprimevideo: 'prime', youtubepremium: 'youtube', appletv: 'apple', chatgptplus: 'chatgpt', gpt: 'chatgpt', canvapro: 'canva', paramountplus: 'paramount', fightpass: 'ufc', cablegoperu: 'cablego', tvlatino: 'telelatino' };
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
  // Plantillas retiradas → la más parecida que sigue disponible.
  const RETIRED_TPL = { cine: 'premium', neon: 'premium', aurora: 'premium', kinetic: 'premium', bio: 'pop' };
  const tplId = v => { const t = String(v || '').trim().slice(0, 30); return RETIRED_TPL[t] || t || 'pop'; };
  const getTemplate = id => templates.get(id) || templates.values().next().value;
  /** Plantilla de reemplazo sin VIP: VIP_TEMPLATES (navidad → pop) o las registradas con vipOnly:true (fallback o 'pop').
   *  '' si la plantilla es libre. Las de temporada se registran con seasonal:true + vipOnly:true (el editor las agrupa). */
  function vipFallback(id) {
    if (VIP_TEMPLATES[id]) return VIP_TEMPLATES[id];
    const t = templates.get(id);
    return t && t.vipOnly ? (t.fallback && t.fallback !== id ? t.fallback : 'pop') : '';
  }

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
    template: 'pop', name: 'Mi Streaming', tagline: 'Tus plataformas favoritas al mejor precio',
    heroTitle: 'Todo el entretenimiento en un solo lugar',
    heroSubtitle: 'Cuentas y perfiles originales, activación inmediata y soporte por WhatsApp.',
    ctaText: 'Comprar por WhatsApp', whatsapp: '', whatsappMessage: 'Hola, quiero información sobre ',
    currency: 'PEN', logoUrl: '', coverUrl: '',
    // Horario de atención que ve el cliente ("24/7", "Lun a Sáb · 9 am a 9 pm"…). Lo usan las plantillas.
    hours: '24/7',
    theme: { primary: '#7C3AED', accent: '#22D3EE', mode: 'dark' },
    headerStyle: 'cover', motion: 'normal',
    plans: [], combos: [], links: [], benefits: [], faq: [], paymentMethods: [], reviews: [], promo: null, enabled: true
  });
  /** Límites de los textos (los usa normalize y el editor para la edición directa en la vista previa). */
  const LIMITS = Object.freeze({
    name: 80, tagline: 120, heroTitle: 120, heroSubtitle: 240, ctaText: 40, planTitle: 60, feature: 60, comboName: 60,
    price: 12, benefit: 80, faqQ: 120, faqA: 400, payment: 30, reviewName: 40, reviewText: 280, maxReviews: 12, maxCombos: 30,
    // Máximo técnico (= VIP) y plan Normal: plataformas (planes) y combos que se MUESTRAN en la tienda.
    maxPlans: 40, normalPlans: 10, normalCombos: 5, promoText: 60, maxApps: 40, hours: 40
  });
  /** Límites del plan: VIP = máximos técnicos; Normal = 10 plataformas y 5 combos visibles. */
  const planLimits = vip => vip ? { plans: LIMITS.maxPlans, combos: LIMITS.maxCombos } : { plans: LIMITS.normalPlans, combos: LIMITS.normalCombos };

  /** Reseñas de ejemplo del sistema (inventadas). Una reseña con exactamente este nombre y texto se trata como ejemplo
   *  (landings creadas antes de la ronda 6, sin la marca sample). Los ejemplos NO se publican en la tienda. */
  const SAMPLE_REVIEWS = Object.freeze([
    { name: 'Rosa M.', text: 'Me activaron Netflix en 10 minutos. Rápido y confiable, ya voy 4 meses comprando aquí.', stars: 5 },
    { name: 'Luis A.', text: 'Excelente atención por WhatsApp, me ayudaron a ponerlo en mi Smart TV paso a paso.', stars: 5 },
    { name: 'Carla P.', text: 'El combo con Disney+ me sale mucho más barato que pagar cada uno. 100% recomendado.', stars: 5 },
    { name: 'Jorge R.', text: 'Tuve un problema con mi perfil y me lo repusieron al toque. Muy serios.', stars: 5 },
    { name: 'Milagros T.', text: 'Pagué con Yape y en minutos ya tenía mi cuenta. Precios justos.', stars: 5 },
    { name: 'Diego S.', text: 'Buen servicio y cumplen. De noche a veces demoran un poquito en responder.', stars: 4 },
    // Variantes antiguas (sampleData y ronda 4).
    { name: 'Luis A.', text: 'Excelente atención por WhatsApp, me ayudaron a ponerlo en mi Smart TV.', stars: 5 },
    { name: 'Diego S.', text: 'Buen precio y cumplen. De noche a veces demoran un poquito en responder.', stars: 4 }
  ].map(Object.freeze));
  const SAMPLE_KEYS = new Set(SAMPLE_REVIEWS.map(r => r.name + '\n' + r.text));
  /** true si la reseña es de ejemplo: marcada sample:true o idéntica (nombre + texto) a una del sistema y no marcada sample:false. */
  const isSampleReview = r => !!r && (r.sample === true || (r.sample !== false && isSampleText(r)));
  /** true si nombre + texto son idénticos a una reseña de ejemplo del sistema (sin mirar la marca). La tienda pública nunca
   *  las muestra, aunque vengan con sample:false (p. ej. el dueño la editó y la dejó igual, o un documento manipulado). */
  function isSampleText(r) { return !!r && SAMPLE_KEYS.has(text(r.name, 40) + '\n' + text(r.text, 280)); }
  /** Clave de producto para estadísticas y data-lt-item: p_<id> (plan) o c_<id> (combo). */
  const itemKey = (kind, id) => { const k = String(id ?? '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 40); return k ? (kind === 'c' ? 'c_' : 'p_') + k : ''; };
  /** Promo (solo VIP): {text, endsAt (ms), planId?, comboId?} o null. */
  function normPromo(p) {
    if (!p || typeof p !== 'object') return null;
    const t = text(p.text, LIMITS.promoText), e = Number(p.endsAt);
    if (!t || !Number.isFinite(e) || e <= 0) return null;
    const planId = text(p.planId, 40), comboId = planId ? '' : text(p.comboId, 40);
    return { text: t, endsAt: Math.round(e), planId, comboId };
  }

  // Número de un precio escrito por el usuario ("15", "15,50"); NaN si no es número.
  const priceNum = v => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : NaN; };
  // Precio anterior solo si es mayor que el actual (si no, no es oferta y no se tacha).
  const offerOld = (price, old) => { const a = priceNum(price), b = priceNum(old); return (Number.isFinite(a) && Number.isFinite(b) && b <= a) ? '' : old; };

  /** Normaliza cualquier objeto al formato guardado. Úsalo antes de guardar y al leer. */
  function normalize(raw = {}, ownerUid = '') {
    const d = raw || {};
    const color = v => /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v) : '';
    const list = (arr, max) => Array.isArray(arr) ? arr.slice(0, max) : [];
    const plans = list(d.plans, LIMITS.maxPlans).map((p, i) => ({
      id: text(p?.id, 40) || `p${i}`, platform: platformInfo(p?.platform).id === 'other' ? text(p?.platform, 40) : platformInfo(p?.platform).id,
      title: text(p?.title, 60), price: text(p?.price, 12), oldPrice: text(p?.oldPrice, 12),
      period: text(p?.period, 24) || '1 mes', type: ['profile', 'full'].includes(p?.type) ? p.type : 'profile',
      features: list(p?.features, 6).map(f => text(f, 60)).filter(Boolean), badge: text(p?.badge, 24),
      // imageUrl: logo propio (app personalizada o reemplazo del logo del catálogo); color: color de la app propia.
      imageUrl: safeImage(p?.imageUrl), color: color(p?.color), visible: p?.visible !== false,
      // category: categoría elegida por el dueño ('' = la de la app; ver planCategory).
      category: text(p?.category, 24)
    })).filter(p => p.platform);
    plans.forEach(p => { p.oldPrice = offerOld(p.price, p.oldPrice); });
    const combos = list(d.combos, LIMITS.maxCombos).map((c, i) => ({
      id: text(c?.id, 40) || `c${i}`, name: text(c?.name, 60) || 'Combo',
      platforms: list(c?.platforms, 8).map(x => { const inf = platformInfo(x); return inf.id === 'other' ? text(x, 40) : inf.id; }).filter(Boolean),
      price: text(c?.price, 12), oldPrice: text(c?.oldPrice, 12), period: text(c?.period, 24) || '1 mes',
      // imageUrl: foto propia del combo (opcional, https); sin foto las plantillas muestran los logos.
      badge: text(c?.badge, 24), imageUrl: safeImage(c?.imageUrl), visible: c?.visible !== false
    })).filter(c => c.platforms.length);
    combos.forEach(c => { c.oldPrice = offerOld(c.price, c.oldPrice); });
    const links = list(d.links, 12).map(l => ({
      type: LINK_TYPES.some(t => t.id === l?.type) ? l.type : 'other',
      label: text(l?.label, 40), url: safeUrl(l?.url)
    })).filter(l => l.url);
    const theme = { primary: color(d.theme?.primary) || DEFAULTS.theme.primary, accent: color(d.theme?.accent) || DEFAULTS.theme.accent,
      mode: d.theme?.mode === 'light' ? 'light' : 'dark' };
    return {
      ownerUid: text(ownerUid || d.ownerUid, 128), slug: slugify(d.slug), template: tplId(d.template),
      name: text(d.name, 80) || DEFAULTS.name, tagline: text(d.tagline, 120), heroTitle: text(d.heroTitle, 120),
      heroSubtitle: text(d.heroSubtitle, 240), ctaText: text(d.ctaText, 40) || DEFAULTS.ctaText,
      whatsapp: phoneDigits(d.whatsapp), whatsappMessage: text(d.whatsappMessage, 160),
      hours: text(d.hours, 40) || DEFAULTS.hours,
      // Partes que el dueño ocultó con la X (portada, decoraciones, secciones). Se pueden volver a mostrar.
      hidden: [...new Set(list(d.hidden, 40).map(k => String(k || '').trim().slice(0, 24)).filter(k => /^[a-z0-9_-]+$/i.test(k)))],
      currency: CURRENCIES[d.currency] ? d.currency : 'PEN', logoUrl: safeImage(d.logoUrl), coverUrl: safeImage(d.coverUrl),
      // Versión ligera de la portada (≈800 px) para celulares; vacía si no existe.
      coverSmUrl: safeImage(d.coverSmUrl),
      theme, plans, combos, links,
      benefits: list(d.benefits, 6).map(b => text(b, 80)).filter(Boolean),
      faq: list(d.faq, 10).map(f => ({ q: text(f?.q, 120), a: text(f?.a, 400) })).filter(f => f.q && f.a),
      paymentMethods: list(d.paymentMethods, 8).map(p => text(p, 30)).filter(Boolean),
      // Reseñas de clientes: [{name, text, stars 1..5}] (máx. 12). Sin texto no se guardan.
      reviews: list(d.reviews, LIMITS.maxReviews).map(r => ({
        name: text(r?.name, LIMITS.reviewName), text: text(r?.text, LIMITS.reviewText),
        stars: Math.min(5, Math.max(1, Math.round(Number(r?.stars)) || 5)),
        // sample: reseña de ejemplo (inventada). Se ve en el editor; NO se publica en la tienda.
        sample: isSampleReview(r)
      })).filter(r => r.text),
      // Oferta con cuenta regresiva (solo se muestra con VIP vigente y antes de endsAt).
      promo: normPromo(d.promo),
      // Cabecera: 'cover' = portada propia de la plantilla; 'profile' = estilo perfil de Facebook (portada + logo redondo).
      headerStyle: d.headerStyle === 'profile' ? 'profile' : 'cover',
      // Nivel de animación: 'calm' (tranquilo), 'normal' (animado), 'max' (espectacular).
      motion: ['calm', 'normal', 'max'].includes(d.motion) ? d.motion : 'normal',
      enabled: d.enabled !== false,
      // Plan VIP: solo los copia el editor desde users/{uid} (las reglas de Firestore lo verifican).
      vip: d.vip === true, vipTrial: d.vip === true && d.vipTrial === true, vipUntil: vipUntilNum(d.vipUntil), customDomain: normDomain(d.customDomain),
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
      reviews: [
        { name: 'Rosa M.', text: 'Me activaron Netflix en 10 minutos. Rápido y confiable, ya voy 4 meses comprando aquí.', stars: 5 },
        { name: 'Luis A.', text: 'Excelente atención por WhatsApp, me ayudaron a ponerlo en mi Smart TV.', stars: 5 },
        { name: 'Diego S.', text: 'Buen precio y cumplen. De noche a veces demoran un poquito en responder.', stars: 4 }
      ],
      links: [{ type: 'instagram', url: 'https://instagram.com/' }, { type: 'tiktok', url: 'https://tiktok.com/' }]
    }, 'demo');
  }

  /** Contexto común que reciben las plantillas en render(root, data, ctx). */
  /** Solo lo visible: planes, combos, plataformas (sin repetir) y precio más bajo. */
  // Planes y combos se muestran si están visibles; sin precio salen con "Precio a consultar" y botón "Consultar".
  // Plan Normal (sin VIP vigente): solo los primeros 10 planes y 5 combos visibles (los datos no se borran: con VIP vuelven).
  const hasPrice = it => Number.isFinite(priceNum(it.price));
  function visibleInfo(data) {
    const lim = planLimits(vipActive(data));
    const allPlans = data.plans.filter(p => p.visible), allCombos = data.combos.filter(c => c.visible);
    let plans = allPlans.slice(0, lim.plans);
    const combos = allCombos.slice(0, lim.combos);
    // Categorías (Streaming, IA, Diseño…): con 2 o más, los planes se agrupan en el orden en que aparece cada categoría.
    const catNames = [...new Set(plans.map(planCategory))];
    const categories = catNames.length > 1 ? catNames.map(name => ({ name, count: plans.filter(p => planCategory(p) === name).length })) : [];
    if (categories.length) plans = catNames.flatMap(n => plans.filter(p => planCategory(p) === n));
    const platformIds = [...new Set(plans.map(p => p.platform).concat(combos.flatMap(c => c.platforms)))];
    const nums = plans.map(p => priceNum(p.price)).concat(combos.map(c => priceNum(c.price))).filter(Number.isFinite);
    const min = nums.length ? Math.min(...nums) : NaN;
    return { plans, combos, platformIds, categories, minPriceValue: min, minPrice: Number.isFinite(min) ? money(min, data.currency) : '',
      hiddenByLimit: { plans: allPlans.length - plans.length, combos: allCombos.length - combos.length } };
  }
  /** Logos y colores propios por plataforma, tomados de los planes (app personalizada o logo que reemplaza al del catálogo).
   *  Clave: id del catálogo o keyOf(nombre) para apps propias. El primer plan con logo manda. */
  function appOverrides(data) {
    const m = new Map();
    (data.plans || []).forEach(p => {
      const inf = platformInfo(p.platform), k = inf.id === 'other' ? 'x:' + keyOf(p.platform) : inf.id;
      const cur = m.get(k) || {};
      if (!cur.logo && p.imageUrl) cur.logo = p.imageUrl;
      if (!cur.color && p.color) cur.color = p.color;
      if (cur.logo || cur.color) m.set(k, cur);
    });
    return m;
  }
  function platformInfoWith(over) {
    return idOrName => {
      const inf = platformInfo(idOrName);
      const o = over.get(inf.id === 'other' ? 'x:' + keyOf(idOrName) : inf.id);
      return o ? { ...inf, logo: o.logo || inf.logo, color: o.color || inf.color } : inf;
    };
  }
  /** Promo vigente (VIP, con texto y antes de endsAt) + producto destacado visible (o null). */
  function activePromo(data, vis, now = Date.now()) {
    const p = data.promo;
    if (!p || !vipActive(data, now) || !(p.endsAt > now)) return null;
    // Si el VIP vence antes que la oferta, la franja se va al vencer el VIP (sin recargar la página).
    const until = vipUntilNum(data.vipUntil), endsAt = until !== null && until < p.endsAt ? until : p.endsAt;
    const plan = p.planId ? vis.plans.find(x => x.id === p.planId) : null;
    const combo = !plan && p.comboId ? vis.combos.find(x => x.id === p.comboId) : null;
    return { ...p, endsAt, plan: plan || null, combo: combo || null };
  }
  /** Cuenta regresiva: {d,h,m,s} hasta endsAt (o null si ya terminó). */
  function promoLeft(endsAt, now = Date.now()) {
    const ms = endsAt - now; if (!(ms > 0)) return null;
    return { d: Math.floor(ms / 864e5), h: Math.floor(ms % 864e5 / 36e5), m: Math.floor(ms % 36e5 / 6e4), s: Math.floor(ms % 6e4 / 1e3) };
  }
  function promoCountHtml(left) {
    const box = (v, l, u) => `<span class="lt-promo-u"><b data-u="${u}">${String(v).padStart(2, '0')}</b><small>${l}</small></span>`;
    return left.d > 0 ? box(left.d, left.d === 1 ? 'día' : 'días', 'd') + box(left.h, 'horas', 'h') + box(left.m, 'min', 'm')
      : box(left.h, 'horas', 'h') + box(left.m, 'min', 'm') + box(left.s, 'seg', 's');
  }
  const promoAria = l => l.d > 0 ? `Termina en ${l.d} ${l.d === 1 ? 'día' : 'días'} y ${l.h} horas` : `Termina en ${l.h} horas y ${l.m} minutos`;

  function buildContext(data, opts = {}) {
    // Sin VIP vigente la página se pinta quieta (noMotion): se trata como "reducir movimiento" y además sin
    // aparición al hacer scroll ni fundidos (todo visible desde el inicio).
    const vip = vipActive(data);
    const noMotion = !vip;
    // forceMotion (solo vista previa del editor): el dueño ve las animaciones que eligió aunque su equipo tenga
    // "reducir movimiento"; la tienda pública (sin preview) siempre respeta esa preferencia del visitante.
    const forceMotion = !!(opts.preview && opts.forceMotion);
    const reducedMotion = noMotion || (!forceMotion && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const vis = visibleInfo(data);
    const pInfo = platformInfoWith(appOverrides(data));
    const promo = activePromo(data, vis);
    const ed = path => opts.preview && path ? ` data-lt-edit="${esc(path)}"` : '';
    const buy = product => whatsappUrl(data.whatsapp, [data.whatsappMessage || DEFAULTS.whatsappMessage, String(product || '').trim() || 'tus planes'].join(' ').replace(/\s{2,}/g, ' ').trim());
    return {
      /** Solo planes/combos con visible !== false. Úsalos SIEMPRE (también en murales, marquesinas y contadores). */
      visiblePlans: vis.plans, visibleCombos: vis.combos, categories: vis.categories, planCategory,
      /** Ids de plataforma de planes y combos visibles, sin repetir. */
      platformIds: vis.platformIds,
      /** Precio más bajo visible ya formateado ("S/ 8") o '' si no hay precios; minPriceValue = número o NaN. */
      minPrice: vis.minPrice, minPriceValue: vis.minPriceValue,
      preview: !!opts.preview, reducedMotion,
      /** true en la vista previa del editor: se ignora "reducir movimiento" del equipo del dueño (no del visitante). */
      forceMotion,
      /** true si la tienda tiene VIP vigente (animaciones y plantillas exclusivas). */
      vip,
      /** true sin VIP: sin animaciones, bucles, partículas ni apariciones al hacer scroll (todo visible y quieto). */
      noMotion,
      /** Edición directa en la vista previa del editor: devuelve ' data-lt-edit="<path>"' solo si preview es true
       *  (en la tienda pública devuelve ''). Paths: name, tagline, heroTitle, heroSubtitle, ctaText,
       *  plans.<id>.title|price|features.<k>, combos.<id>.name|price, benefits.<i>, faq.<i>.q|a,
       *  reviews.<i>.name|text, paymentMethods.<i> (índices = posición en data ya normalizada). */
      ed,
      /** platformInfo con los logos/colores propios del usuario (apps personalizadas y logos reemplazados). */
      esc, money: v => money(v, data.currency), platformInfo: pInfo, linkIcon: t => LINK_ICONS[t] || LINK_ICONS.other,
      /** Marca "Hecho con Diseños Streaming": visible en Normal, oculta con VIP vigente. */
      showBrand: !vip,
      /** Atributo para estadísticas: ' data-lt-item="p_<id>"' (plan) / 'c_<id>' (combo). También en la tienda pública. */
      item: (kind, id) => { const k = itemKey(kind, id); return k ? ` data-lt-item="${k}"` : ''; },
      /** Promo vigente (solo VIP) o null: {text, endsAt, plan, combo}. promoHtml() = franja lista para insertar
       *  (la plantilla la pone justo debajo de su cabecera y la decora con CSS prefijado; el núcleo actualiza la cuenta). */
      promo,
      promoHtml: () => promoHtml(data, promo, { ed, buy, pInfo, preview: !!opts.preview }),
      linkLabel: l => l.label || (LINK_TYPES.find(t => t.id === l.type) || {}).label || 'Enlace',
      /** Enlace de WhatsApp con mensaje prellenado para un producto (texto libre). */
      buy,
      planTitle: p => p.title || `${platformInfo(p.platform).name}${p.type === 'full' ? ' · Cuenta completa' : ''}`,
      typeLabel: p => p.type === 'full' ? 'Cuenta completa' : 'Perfil',
      /** Horario de atención ("24/7" por defecto). hoursLong: true si no entra en una casilla corta (usar letra más chica). */
      hours: data.hours || DEFAULTS.hours,
      hoursLong: String(data.hours || DEFAULTS.hours).length > 7,
      hours247: /^24\s*\/\s*7$/.test(String(data.hours || DEFAULTS.hours).trim()),
      /** true si el usuario eligió la cabecera tipo perfil de Facebook. */
      profileMode: data.headerStyle === 'profile',
      motion: reducedMotion ? 'calm' : data.motion,
      /** HTML de la cabecera tipo perfil (portada ancha + logo redondo superpuesto + nombre + acciones).
       *  La plantilla la coloca arriba de todo cuando profileMode es true, y entonces NO pinta su
       *  propia cabecera de logo ni la imagen de portada en su hero (para no repetir). */
      profileHeader: () => profileHeaderHtml(data, !!opts.preview)
    };
  }

  // ---------- cabecera tipo perfil (compartida por todas las plantillas) ----------
  function profileHeaderHtml(d, edit) {
    const ed = path => edit ? ` data-lt-edit="${path}"` : '';
    const initial = esc((d.name || '?').trim().charAt(0).toUpperCase() || '?');
    const cover = d.coverUrl
      ? `<img class="ltp-cover-img" src="${esc(d.coverUrl)}" alt="" width="851" height="315" loading="eager" decoding="async" fetchpriority="high">`
      : '<span class="ltp-cover-fx" aria-hidden="true"><i></i><i></i><i></i></span>';
    const avatar = d.logoUrl
      ? `<img src="${esc(d.logoUrl)}" alt="Logo de ${esc(d.name)}" width="168" height="168" decoding="async">`
      : `<span class="ltp-initial">${initial}</span>`;
    const links = d.links.slice(0, 6).map(l => `<a class="ltp-social" href="${esc(l.url)}" target="_blank" rel="noopener" aria-label="${esc(l.label || (LINK_TYPES.find(t => t.id === l.type) || {}).label || 'Enlace')}">${LINK_ICONS[l.type] || LINK_ICONS.other}</a>`).join('');
    const count = visibleInfo(d).platformIds.length;
    return `<header class="ltp" data-lt-profile>
      <div class="ltp-cover">${cover}<span class="ltp-shade" aria-hidden="true"></span></div>
      <div class="ltp-body">
        <div class="ltp-avatar"><span class="ltp-ring" aria-hidden="true"></span><span class="ltp-avatar-in">${avatar}</span></div>
        <div class="ltp-info">
          <h1 class="ltp-name"><span${ed('name')}>${esc(d.name)}</span></h1>
          ${d.tagline ? `<p class="ltp-tag"${ed('tagline')}>${esc(d.tagline)}</p>` : ''}
          <p class="ltp-meta">${count ? `<span>${count} ${count === 1 ? 'plataforma' : 'plataformas'}</span>` : ''}${d.whatsapp ? `<span class="ltp-online"><i></i>${/^24\s*\/\s*7$/.test(String(d.hours || '24/7').trim()) ? 'Atención 24/7 por WhatsApp' : `Atención: ${esc(d.hours)}`}</span>` : ''}</p>
        </div>
        ${links ? `<div class="ltp-actions"><div class="ltp-socials">${links}</div></div>` : ''}
      </div>
    </header>`;
  }

  // ---------- oferta con cuenta regresiva (solo VIP) ----------
  const BOLT = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>';
  function promoHtml(d, promo, h) {
    if (!promo) return '';
    const left = promoLeft(promo.endsAt); if (!left) return '';
    let prod = '', item = '', href = h.buy(`Promo: ${promo.text}`);
    const it = promo.plan || promo.combo;
    if (it) {
      const isPlan = !!promo.plan;
      const name = isPlan ? (it.title || h.pInfo(it.platform).name) : it.name;
      const m = money(it.price, d.currency);
      const logo = isPlan ? h.pInfo(it.platform).logo : (it.imageUrl || '');
      const src = isPlan ? (it.imageUrl || logo) : logo;
      prod = `<span class="lt-promo-p">${src ? `<img src="${esc(src)}" alt="" width="26" height="26" decoding="async">` : ''}<span>${esc(name)}${m ? ` · <b>${esc(m)}</b>` : ''}</span></span>`;
      href = h.buy([`Promo: ${promo.text}`, name, m].filter(Boolean).join(' · '));
      item = ` data-lt-item="${itemKey(isPlan ? 'p' : 'c', it.id)}"`;
    }
    return `<aside class="lt-promo" data-lt-promo data-end="${promo.endsAt}" aria-label="Oferta por tiempo limitado"><div class="lt-promo-in">` +
      `<span class="lt-promo-tag">${BOLT}<span>Oferta</span></span>` +
      `<p class="lt-promo-t"><span${h.ed('promo.text')}>${esc(promo.text)}</span>${prod}</p>` +
      `<div class="lt-promo-cd" role="timer" aria-live="off" aria-label="${esc(promoAria(left))}"><span class="lt-promo-l">Termina en</span><span class="lt-promo-units">${promoCountHtml(left)}</span></div>` +
      (d.whatsapp && href ? `<a class="lt-promo-btn" data-lt-btn href="${esc(href)}" target="_blank" rel="noopener"${item}>${LINK_ICONS.whatsapp}<span>Lo quiero</span></a>` : '') +
      `</div></aside>`;
  }
  /** Actualiza la cuenta regresiva (cada minuto con días; cada segundo en el último día) y quita la franja al vencer. */
  function startPromo(root, ctx) {
    if (!ctx.promo) return null;
    let el = root.querySelector('[data-lt-promo]');
    if (!el) {
      // Plantilla sin franja propia: el núcleo la pone debajo de la cabecera.
      const html = ctx.promoHtml(); if (!html) return null;
      const head = root.querySelector('[data-lt-profile]') || root.querySelector('header') || null;
      if (head && head.parentNode === root) head.insertAdjacentHTML('afterend', html); else root.insertAdjacentHTML('afterbegin', html);
      el = root.querySelector('[data-lt-promo]'); if (!el) return null;
    }
    const end = Number(el.getAttribute('data-end'));
    const view = (root.ownerDocument && root.ownerDocument.defaultView) || root;
    let t = 0, mode = '';
    const tick = () => {
      const l = promoLeft(end);
      if (!l) { el.remove(); return; }
      const m = l.d > 0 ? 'd' : 's', units = el.querySelector('.lt-promo-units'), cd = el.querySelector('.lt-promo-cd');
      if (units) {
        if (m !== mode) units.innerHTML = promoCountHtml(l);
        else units.querySelectorAll('b[data-u]').forEach(b => { const v = String(l[b.getAttribute('data-u')]).padStart(2, '0'); if (b.textContent !== v) b.textContent = v; });
      }
      mode = m;
      if (cd) cd.setAttribute('aria-label', promoAria(l));
      const ms = end - Date.now();
      t = view.setTimeout(tick, m === 'd' ? (ms % 6e4) + 30 : (ms % 1e3) + 30);
    };
    tick();
    return () => view.clearTimeout(t);
  }

  const SHARED_CSS = `
  .lt-root .lt-part-off{display:none!important}
  .lt-root .lt-part-ghost{opacity:.28!important;filter:grayscale(1)!important}
  .lt-root section.lt-part-ghost,.lt-root div.lt-part-ghost,.lt-root figure.lt-part-ghost{outline:2px dashed rgba(139,92,246,.8);outline-offset:-4px}
  .lt-root .lt-part-layer{position:absolute;inset:0 0 auto 0;height:0;z-index:2147483000;pointer-events:none}
  .lt-root .lt-part-b{position:absolute;pointer-events:auto;display:grid;place-items:center;min-width:32px;height:32px;padding:0;border-radius:999px;border:2px solid #fff;background:rgba(17,17,24,.82);color:#fff;font:700 20px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);transition:transform .15s,background .15s}
  .lt-root .lt-part-b:hover{background:#e11d48;transform:scale(1.1)}
  .lt-root .lt-part-b.is-off{padding:0 14px;font-size:13px;background:#7c3aed;white-space:nowrap}
  .lt-root .lt-part-b.is-off:hover{background:#6d28d9}
  .lt-root .lt-cats{display:flex;gap:8px;margin:0 auto 22px;padding:4px 2px 6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;justify-content:center;flex-wrap:wrap;position:relative;z-index:3}
  .lt-root .lt-cats::-webkit-scrollbar{display:none}
  @media (max-width:640px){.lt-root .lt-cats{flex-wrap:nowrap;justify-content:flex-start;margin-left:-4px;margin-right:-4px;padding-left:4px;padding-right:4px;-webkit-mask:linear-gradient(90deg,transparent,#000 12px,#000 calc(100% - 24px),transparent);mask:linear-gradient(90deg,transparent,#000 12px,#000 calc(100% - 24px),transparent)}}
  .lt-root .lt-cat{flex:none;display:inline-flex;align-items:center;gap:7px;min-height:42px;padding:9px 16px;border-radius:999px;border:1.5px solid color-mix(in srgb,currentColor 22%,transparent);background:color-mix(in srgb,currentColor 7%,transparent);color:inherit;font:inherit;font-size:14.5px;font-weight:700;line-height:1;cursor:pointer;white-space:nowrap;transition:background .2s,border-color .2s,color .2s,transform .15s}
  .lt-root .lt-cat:hover{border-color:color-mix(in srgb,currentColor 45%,transparent)}
  .lt-root .lt-cat:active{transform:scale(.96)}
  .lt-root .lt-cat:focus-visible{outline:2px solid var(--lt-cat-acc);outline-offset:2px}
  .lt-root .lt-cat small{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:color-mix(in srgb,currentColor 14%,transparent);font-size:12px;font-weight:800}
  .lt-root .lt-cat.is-on{background:var(--lt-cat-acc);border-color:var(--lt-cat-acc);color:var(--lt-cat-on);box-shadow:0 8px 20px color-mix(in srgb,var(--lt-cat-acc) 35%,transparent)}
  .lt-root .lt-cat.is-on small{background:color-mix(in srgb,var(--lt-cat-on) 20%,transparent)}
  .lt-root .lt-cat-h{grid-column:1/-1;flex:1 1 100%!important;width:100%!important;max-width:none!important;min-width:100%!important;display:flex;align-items:center;gap:12px;margin:14px 0 2px;font-weight:800;font-size:clamp(17px,3.6vw,21px);letter-spacing:-.01em;text-align:left}
  .lt-root .lt-cat-h:first-child{margin-top:0}
  .lt-root .lt-cat-h::after{content:"";flex:1;height:2px;border-radius:2px;background:linear-gradient(90deg,color-mix(in srgb,currentColor 25%,transparent),transparent)}
  .lt-root .lt-cat-h::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--lt-cat-acc);flex:none}
  .lt-root .lt-cat-box.lt-cat-one .lt-cat-h{display:none}
  .lt-root .lt-cat-box [hidden]{display:none!important}
  .lt-root:not(.lt-static) .lt-cat-box.lt-cat-one>[data-lt-item]:not([hidden]){animation:lt-catin .45s cubic-bezier(.2,.8,.2,1) both}
  @keyframes lt-catin{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion: reduce){.lt-root:not(.lt-force-motion) .lt-cat-box>[data-lt-item]{animation:none!important}}
  .lt-root{isolation:isolate}
  .lt-root .ltp{position:relative;z-index:3;max-width:1100px;margin:0 auto;padding:0 0 8px;color:#fff;font-family:inherit}
  .lt-root .ltp-cover{position:relative;aspect-ratio:851/315;min-height:120px;overflow:hidden;border-radius:0 0 22px 22px;background:linear-gradient(135deg,var(--lt-primary),var(--lt-accent))}
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
  .lt-root .ltp-tag{margin:6px 0 0;opacity:.85;font-size:15px;overflow-wrap:anywhere}
  .lt-root .ltp-meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin:8px 0 0;font-size:13px;opacity:.75}
  .lt-root .ltp-online{display:inline-flex;align-items:center;gap:6px}
  .lt-root .ltp-online i{position:relative;width:8px;height:8px;border-radius:50%;background:#22c55e}
  .lt-root .ltp-online i::after{content:"";position:absolute;inset:0;border-radius:50%;background:#22c55e;animation:ltp-dot 2s ease-out infinite}
  .lt-root .ltp-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding-bottom:6px;animation:ltp-up .7s .3s ease-out both}
  .lt-root .ltp-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 20px;border-radius:999px;background:#22c55e;color:#04130a;font-weight:900;text-decoration:none}
  .lt-root .ltp-btn svg{width:20px;height:20px}
  .lt-root .ltp-socials{display:flex;gap:8px}
  .lt-root .ltp-social{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.12);color:inherit;border:1px solid rgba(255,255,255,.18)}
  .lt-root .ltp-social svg{width:20px;height:20px}
  @media(min-width:641px){.lt-root .ltp-body{align-items:flex-start}.lt-root .ltp-info,.lt-root .ltp-actions{padding-top:calc(clamp(96px,22vw,168px) / 2 + 12px)}}
  @media(max-width:640px){.lt-root .ltp-body{justify-content:center;text-align:center}.lt-root .ltp-info{flex-basis:100%}.lt-root .ltp-name,.lt-root .ltp-meta,.lt-root .ltp-actions{justify-content:center}}
  .lt-root.lt-light-profile .ltp{color:#111}
  .lt-root.lt-light-profile .ltp-avatar-in{border-color:#fff}
  .lt-root.lt-light-profile .ltp-social{background:rgba(0,0,0,.06);border-color:rgba(0,0,0,.12)}
  @keyframes ltp-kb{from{transform:scale(1)}to{transform:scale(1.05) translate(-1%,-1%)}}
  @keyframes ltp-blob{to{transform:translate(18%,22%) scale(1.25)}}
  @keyframes ltp-pop{from{opacity:0;transform:scale(.4) rotate(-12deg)}to{opacity:1;transform:none}}
  @keyframes ltp-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  @keyframes ltp-dot{0%{transform:scale(1);opacity:.6}80%,100%{transform:scale(3.2);opacity:0}}
  @keyframes ltp-spin{to{transform:rotate(360deg)}}
  @keyframes lt-shine{0%,60%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(220%) skewX(-20deg)}}
  @keyframes lt-float{0%{transform:translate3d(0,0,0);opacity:0}10%{opacity:.9}90%{opacity:.9}100%{transform:translate3d(var(--dx),-110vh,0);opacity:0}}
  /* --- nivel de animación --- */
  .lt-root[data-lt-motion="max"] .ltp-ring{animation:ltp-spin 4s linear infinite}
  .lt-root[data-lt-motion="max"] [data-lt-btn="main"]{position:relative;overflow:hidden;isolation:isolate}
  .lt-root[data-lt-motion="max"] [data-lt-btn="main"]::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);transform:translateX(-120%) skewX(-20deg);animation:lt-shine 3.2s ease-in-out infinite;pointer-events:none;z-index:1}
  .lt-root[data-lt-motion="max"] [data-lt-card]{transition:transform .25s ease-out;transform-style:preserve-3d;will-change:transform}
  .lt-root .lt-particles{position:fixed;inset:0;pointer-events:none;z-index:-1;overflow:hidden}
  .lt-root.lt-in-preview .lt-particles{position:absolute}
  .lt-root .lt-particles i{position:absolute;bottom:-20px;width:var(--s);height:var(--s);border-radius:50%;background:var(--c);opacity:0;animation:lt-float var(--t) linear var(--d) infinite;filter:none}
  .lt-root[data-lt-motion="calm"] *,.lt-root[data-lt-motion="calm"] *::before,.lt-root[data-lt-motion="calm"] *::after{animation-iteration-count:1!important}
  /* --- micro-interacciones (solo transform) --- */
  .lt-root [data-lt-btn]:active{transform:scale(.96)}
  .lt-root [data-lt-card]:active{transform:translateY(-3px)}
  /* --- barra de compra fija (móvil) --- */
  .lt-root .lt-bbw{display:none}
  /* Pie: solo el espacio justo para el botón flotante de WhatsApp (antes ~190px vacíos al final). */
  .lt-root [data-lt-foot]{padding-bottom:calc(40px + env(safe-area-inset-bottom,0px))!important}
  @media (max-width:720px){
    /* Con la barra de compra fija, el espacio va DENTRO del pie (mismo color) y no como franja vacía debajo. */
    .lt-root.lt-has-bb [data-lt-foot]{padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important}
    .lt-root.lt-has-bb [data-lt-fab]{display:none!important}
    .lt-root .lt-bbw{display:block;position:fixed;left:0;right:0;bottom:0;z-index:60;pointer-events:none;padding:0 10px calc(10px + env(safe-area-inset-bottom,0px))}
    .lt-root.lt-in-preview .lt-bbw{position:sticky;height:0;padding:0}
    .lt-root.lt-in-preview .lt-bb{position:absolute;left:10px;right:10px;bottom:10px}
  }
  .lt-root .lt-bb{display:flex;align-items:center;gap:10px;min-height:58px;padding:7px 7px 7px 18px;border-radius:18px;background:rgba(14,14,22,.94);color:#fff;text-decoration:none;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,255,255,.1);pointer-events:auto;transform:translateY(130%);opacity:0;transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .25s;-webkit-tap-highlight-color:transparent}
  .lt-root .lt-bbw.is-on .lt-bb{transform:none;opacity:1}
  .lt-root .lt-bbw.is-on .lt-bb:active{transform:scale(.97)}
  /* Un solo "latido" del botón verde al aparecer la barra (la primera vez que se pinta is-on). */
  .lt-root .lt-bbw.is-on .lt-bb-c{animation:lt-bbpulse .5s .35s cubic-bezier(.3,1.6,.5,1) 1 both}
  @keyframes lt-bbpulse{50%{transform:scale(1.05)}}
  /* Bucles del núcleo pausados cuando no se ven: brillo con la barra oculta, partículas en reposo,
     cabecera de perfil fuera de pantalla. Repintado (editor / datos nuevos): sin repetir entradas.
     (En pseudo-elementos se usa animation:none: en Chrome un ::after en pausa se recalcula en cada cuadro, ~400 ms/s con CPU 4x.) */
  .lt-root .lt-bbw:not(.is-on) [data-lt-btn="main"]::after{animation:none}
  .lt-root.lt-idle .lt-particles i{animation-play-state:paused}
  .lt-root .ltp.ltp-off :is(.ltp-cover-img,.ltp-ring,.ltp-cover-fx i){animation-play-state:paused}
  .lt-root .ltp.ltp-off .ltp-online i::after{animation:none}
  .lt-root.lt-rerender *,.lt-root.lt-rerender *::before,.lt-root.lt-rerender *::after{animation-delay:-30s!important}
  .lt-root .lt-bb-p{display:flex;flex-direction:column;line-height:1.1;min-width:0;white-space:nowrap}
  .lt-root .lt-bb-p small{font-size:11px;opacity:.7;font-weight:600}
  .lt-root .lt-bb-p b{font-size:18px;font-weight:900}
  .lt-root .lt-bb-c{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 16px;border-radius:13px;background:#25d366;color:#052e14;font-weight:900;font-size:15px;white-space:nowrap;position:relative;overflow:hidden}
  .lt-root .lt-bb-c svg{width:20px;height:20px;flex:none}
  .lt-root .lt-bb.is-solo .lt-bb-c{margin:0;flex:1}
  .lt-root .lt-bb.is-solo{padding-left:7px}
  @media (max-width:340px){.lt-root .lt-bb-c{padding:0 12px;font-size:14px}}
  /* --- oferta con cuenta regresiva (VIP): estructura común; cada plantilla la decora con su prefijo --- */
  .lt-root .lt-promo{position:relative;z-index:4;padding:10px 12px 0;max-width:1124px;margin:0 auto}
  .lt-root .lt-promo-in{position:relative;overflow:hidden;display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:12px 14px;border-radius:18px;background:linear-gradient(110deg,var(--lt-primary),var(--lt-accent));color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.25)}
  .lt-root .lt-promo-in::after{content:"";position:absolute;top:0;bottom:0;left:0;width:35%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);transform:translateX(-120%) skewX(-20deg);animation:lt-shine 3.6s 1s ease-in-out 3;pointer-events:none}
  .lt-root .lt-promo-tag{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;background:rgba(0,0,0,.28);font-weight:900;font-size:12px;letter-spacing:.06em;text-transform:uppercase;flex:none}
  .lt-root .lt-promo-tag svg{width:14px;height:14px}
  .lt-root .lt-promo-t{margin:0;flex:1 1 200px;min-width:0;font-weight:900;font-size:clamp(17px,4.4vw,22px);line-height:1.15;overflow-wrap:anywhere}
  .lt-root .lt-promo-p{display:flex;align-items:center;gap:7px;margin-top:5px;font-size:13px;font-weight:700;opacity:.95}
  .lt-root .lt-promo-p img{width:26px;height:26px;border-radius:8px;object-fit:cover;flex:none;background:#fff}
  .lt-root .lt-promo-cd{display:flex;align-items:center;gap:8px;flex:none}
  .lt-root .lt-promo-l{font-size:12px;font-weight:800;opacity:.9}
  .lt-root .lt-promo-units{display:flex;gap:5px}
  .lt-root .lt-promo-u{display:grid;justify-items:center;min-width:46px;padding:6px 4px 5px;border-radius:10px;background:rgba(0,0,0,.3);line-height:1}
  .lt-root .lt-promo-u b{font-size:20px;font-weight:900;font-variant-numeric:tabular-nums}
  .lt-root .lt-promo-u small{font-size:10px;font-weight:700;opacity:.85;margin-top:3px}
  .lt-root .lt-promo-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;background:#25d366;color:#052e14;font-weight:900;text-decoration:none;white-space:nowrap;flex:none}
  .lt-root .lt-promo-btn svg{width:18px;height:18px}
  @media (max-width:560px){.lt-root .lt-promo-cd{flex:1 1 100%;justify-content:space-between}.lt-root .lt-promo-btn{flex:1 1 100%}}
  /* --- sin VIP (lt-static): página quieta, todo visible desde el inicio, sin pérdida de diseño --- */
  .lt-root.lt-static *,.lt-root.lt-static *::before,.lt-root.lt-static *::after{animation:none!important;transition:none!important}
  .lt-root.lt-static .lt-particles{display:none!important}
  /* --- reducir movimiento: sin bucles, desplazamientos ni partículas; solo un fundido corto una vez --- */
  @keyframes lt-fade{from{opacity:0}to{opacity:1}}
  @media (prefers-reduced-motion: reduce){
    .lt-root *,.lt-root *::before,.lt-root *::after{animation:none!important;transition:none!important}
    .lt-root .lt-particles{display:none}
    .lt-root.lt-root>:not(.lt-particles):not(.lt-bbw){animation:lt-fade .45s ease-out both!important}
    .lt-root.lt-root .lt-bb{transition:opacity .3s!important;transform:none!important}
  }
  `;

  /** Efectos comunes según data.motion. Se aplica DESPUÉS de la plantilla. Devuelve función de limpieza. */
  function applyMotion(root, d, ctx) {
    root.dataset.ltMotion = ctx.noMotion ? 'none' : ctx.motion;
    root.classList.toggle('lt-in-preview', !!ctx.preview);
    root.classList.toggle('lt-force-motion', !!ctx.forceMotion && !ctx.noMotion);
    root.classList.toggle('lt-static', !!ctx.noMotion);
    if (ctx.noMotion || ctx.motion !== 'max') return null;
    const cleanups = [];
    // Partículas de colores de marca subiendo suavemente (12 en móvil, 20 en PC).
    const layer = document.createElement('div');
    layer.className = 'lt-particles'; layer.setAttribute('aria-hidden', 'true');
    const mobile = typeof innerWidth === 'number' && innerWidth < 720;
    const n = mobile ? 8 : 20;
    const colors = [d.theme.primary, d.theme.accent, '#ffffff'];
    let html = '';
    for (let i = 0; i < n; i++) {
      const s = 3 + Math.round(Math.random() * 6);
      html += `<i style="left:${Math.round(Math.random() * 100)}%;--s:${s}px;--c:${colors[i % 3]};--t:${(mobile ? 12 : 9) + Math.round(Math.random() * 10)}s;--d:-${Math.round(Math.random() * 15)}s;--dx:${Math.round(Math.random() * 80 - 40)}px"></i>`;
    }
    layer.innerHTML = html; root.prepend(layer);
    // Partículas en pausa con la pestaña oculta o tras 20 s sin desplazarse (se reanudan al mover la página).
    const view = root.ownerDocument && root.ownerDocument.defaultView;
    if (view) {
      let idleT = 0;
      const wake = () => { root.classList.remove('lt-idle'); clearTimeout(idleT); idleT = setTimeout(() => root.classList.add('lt-idle'), 20000); };
      const vis = () => { if (view.document.hidden) root.classList.add('lt-idle'); else wake(); };
      view.addEventListener('scroll', wake, { passive: true });
      view.document.addEventListener('visibilitychange', vis);
      wake();
      cleanups.push(() => { clearTimeout(idleT); view.removeEventListener('scroll', wake); view.document.removeEventListener('visibilitychange', vis); });
    }
    // Inclinación 3D de tarjetas solo con mouse (en táctil no aporta y gasta batería).
    const fine = typeof matchMedia === 'function' && matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (fine && !ctx.preview) {
      // Un solo cálculo por cuadro (rAF): leer el rect y escribir el transform juntos, sin layout forzado por evento.
      let last = null, raf = 0;
      const frame = () => {
        raf = 0;
        const e = last; last = null;
        const card = e && e.target.closest && e.target.closest('[data-lt-card]');
        if (!card || !root.contains(card)) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(800px) rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 10).toFixed(2)}deg) translateY(-4px)`;
      };
      const move = e => { last = e; if (!raf) raf = requestAnimationFrame(frame); };
      const leave = e => { const card = e.target.closest && e.target.closest('[data-lt-card]'); if (card && !card.contains(e.relatedTarget)) { last = null; card.style.transform = ''; } };
      root.addEventListener('pointermove', move, { passive: true });
      root.addEventListener('pointerout', leave, { passive: true });
      cleanups.push(() => { if (raf) cancelAnimationFrame(raf); root.removeEventListener('pointermove', move); root.removeEventListener('pointerout', leave); });
    }
    return () => cleanups.forEach(f => f());
  }

  /** Barra de compra fija en móvil (≤720px). Aparece tras pasar el hero y se oculta en el pie.
   *  Las plantillas marcan su hero con data-lt-hero, su pie con data-lt-foot y su botón flotante con data-lt-fab. */
  function applyBuyBar(root, d, ctx) {
    const href = ctx.buy('');
    if (!d.whatsapp || !href) return null;
    const price = ctx.minPrice;
    const wrap = document.createElement('div');
    wrap.className = 'lt-bbw';
    wrap.innerHTML = `<a class="lt-bb${price ? '' : ' is-solo'}" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${price ? 'Desde ' + esc(price) + ' · ' : ''}Pedir por WhatsApp">` +
      (price ? `<span class="lt-bb-p"><small>Desde</small><b>${esc(price)}</b></span>` : '') +
      `<span class="lt-bb-c" data-lt-btn="main">${LINK_ICONS.whatsapp}<span>Pedir por WhatsApp</span></span></a>`;
    root.appendChild(wrap);
    root.classList.add('lt-has-bb');
    const hero = root.querySelector('[data-lt-hero]') || root.querySelector('[data-lt-profile]');
    const foot = root.querySelector('[data-lt-foot]');
    if (typeof IntersectionObserver !== 'function' || !hero) { wrap.classList.add('is-on'); return null; }
    let pastHero = false, atFoot = false;
    const sync = () => wrap.classList.toggle('is-on', pastHero && !atFoot);
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.target === hero) pastHero = !e.isIntersecting && e.boundingClientRect.top < 0;
        else if (e.target === foot) atFoot = e.isIntersecting;
      });
      sync();
    }, { threshold: 0 });
    io.observe(hero); if (foot) io.observe(foot);
    return () => io.disconnect();
  }

  /** Tienda pública: mientras baja la imagen principal (portada con fetchpriority="high", casi siempre el LCP),
   *  los logos con loading="lazy" esperan (máx. 3 s) para no repartirse el ancho de banda de datos móviles con ella.
   *  Solo fuera del editor. Los lazy aún no han empezado a descargarse cuando se llama (mismo turno que innerHTML). */
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  function holdLazyImages(root, ctx) {
    if (ctx.preview || typeof document === 'undefined') return null;
    const hero = root.querySelector('img[fetchpriority="high"]');
    if (!hero || hero.complete) return null;
    const held = [...root.querySelectorAll('img[loading="lazy"][src]')].filter(img => !img.src.startsWith('data:'));
    if (!held.length) return null;
    held.forEach(img => { img.setAttribute('data-lt-src', img.getAttribute('src')); img.setAttribute('src', BLANK); });
    let done = false, timer = 0;
    const release = () => {
      if (done) return; done = true; clearTimeout(timer);
      hero.removeEventListener('load', release); hero.removeEventListener('error', release);
      held.forEach(img => { const src = img.getAttribute('data-lt-src'); img.removeAttribute('data-lt-src'); if (src && img.isConnected) img.setAttribute('src', src); });
    };
    hero.addEventListener('load', release); hero.addEventListener('error', release);
    timer = setTimeout(release, 3000);
    return () => { done = true; clearTimeout(timer); hero.removeEventListener('load', release); hero.removeEventListener('error', release); };
  }

  /** Ken Burns de la portada, anillo y puntito de la cabecera de perfil: en pausa cuando no se ve. */
  function pauseProfileOffscreen(root) {
    const prof = root.querySelector('[data-lt-profile]');
    const IO = root.ownerDocument && root.ownerDocument.defaultView && root.ownerDocument.defaultView.IntersectionObserver;
    if (!prof || typeof IO !== 'function') return null;
    const io = new IO(es => es.forEach(e => prof.classList.toggle('ltp-off', !e.isIntersecting)), { rootMargin: '100px 0px' });
    io.observe(prof);
    return () => io.disconnect();
  }

  /** Pestañas de categorías sobre los planes (todas las plantillas). Solo con 2+ categorías.
   *  Toma las tarjetas de plan ([data-lt-item^="p_"]) que pintó la plantilla, pone la barra antes de su contenedor,
   *  un subtítulo por categoría (en "Todos") y filtra al tocar. Los colores salen del acento de la plantilla. */
  function applyCategories(root, ctx, tpl) {
    const cats = ctx.categories || [];
    if (cats.length < 2) return null;
    const byId = new Map((ctx.visiblePlans || []).map(p => [itemKey('p', p.id), planCategory(p)]));
    // el contenedor con más tarjetas de plan (otras copias, como listas de la barra de compra, se ignoran)
    const found = [...root.querySelectorAll('[data-lt-item^="p_"]')].filter(el => byId.has(el.getAttribute('data-lt-item')) && el.parentElement);
    const groups = new Map();
    found.forEach(el => { const k = el.parentElement; groups.set(k, (groups.get(k) || []).concat(el)); });
    let box = null, cards = [];
    groups.forEach((list, k) => { if (list.length > cards.length) { box = k; cards = list; } });
    if (!box || cards.length < 2 || !box.parentElement) return null;
    const acc = (tpl.preview && /^#[0-9a-f]{6}$/i.test(tpl.preview.accent || '') ? tpl.preview.accent : '') || '#7c3aed';
    const lum = h => { const n = parseInt(h.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
    root.style.setProperty('--lt-cat-acc', acc);
    root.style.setProperty('--lt-cat-on', lum(acc) > .4 ? '#111111' : '#ffffff');
    cards.forEach(el => el.setAttribute('data-lt-cat', byId.get(el.getAttribute('data-lt-item'))));
    const doc = root.ownerDocument;
    // subtítulo antes de la primera tarjeta de cada categoría
    let last = '';
    cards.forEach(el => {
      const c = el.getAttribute('data-lt-cat');
      if (c === last) return; last = c;
      const h = doc.createElement('div');
      h.className = 'lt-cat-h'; h.setAttribute('data-lt-cat', c); h.setAttribute('role', 'heading'); h.setAttribute('aria-level', '3');
      h.innerHTML = `<span>${esc(c)}</span>`;
      box.insertBefore(h, el);
    });
    const bar = doc.createElement('div');
    bar.className = 'lt-cats'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Categorías');
    const all = [{ name: 'Todos', count: cards.length }].concat(cats);
    bar.innerHTML = all.map((c, i) => `<button type="button" role="tab" class="lt-cat${i ? '' : ' is-on'}" aria-selected="${!i}" data-lt-catb="${i ? esc(c.name) : ''}">${esc(c.name)}<small>${c.count}</small></button>`).join('');
    box.parentElement.insertBefore(bar, box);
    box.classList.add('lt-cat-box');
    const pick = name => {
      bar.querySelectorAll('.lt-cat').forEach(b => { const on = b.getAttribute('data-lt-catb') === name; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); });
      box.classList.toggle('lt-cat-one', !!name);
      box.querySelectorAll('[data-lt-cat]').forEach(el => { el.hidden = !!name && el.getAttribute('data-lt-cat') !== name; });
      // las tarjetas que aparecen ya se ven (sin esperar a la animación de entrada)
      box.querySelectorAll('[data-lt-item]').forEach(el => { if (!el.hidden) el.classList.add('is-in'); });
    };
    const onClick = e => {
      const b = e.target && e.target.closest ? e.target.closest('.lt-cat') : null;
      if (!b || !bar.contains(b)) return;
      e.preventDefault(); e.stopPropagation();
      pick(b.getAttribute('data-lt-catb') || '');
      // centra la pestaña elegida en la barra deslizable (celular)
      if (b.scrollIntoView) try { b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: ctx.reducedMotion ? 'auto' : 'smooth' }); } catch (_) {}
    };
    bar.addEventListener('click', onClick);
    return () => bar.removeEventListener('click', onClick);
  }

  /** Partes que se pueden ocultar con una X. Comunes a todas las plantillas + las que declare cada plantilla
   *  (registerTemplate({ parts: [{ k, label, sel, x }] })). x:true = lleva X en la vista previa; sin x
   *  (partículas, luces de fondo…) solo se activan/desactivan desde la lista del editor. */
  const COMMON_PARTS = [
    { k: 'cover', label: 'Portada', x: true },
    { k: 'benefits', label: 'Beneficios', sel: '.ltb-sec-benefits', x: true },
    { k: 'reviews', label: 'Opiniones', sel: '.ltb-sec-reviews', x: true },
    { k: 'pays', label: 'Métodos de pago', sel: '.ltb-sec-pays', x: true },
    { k: 'faq', label: 'Preguntas frecuentes', sel: '.ltb-sec-faq', x: true },
    { k: 'links', label: 'Redes sociales', sel: '.ltb-sec-links', x: true }
  ];
  /** Lista de partes de una plantilla (para el editor). */
  function partsFor(tid) {
    const t = templates.get(tid);
    return COMMON_PARTS.concat(t && Array.isArray(t.parts) ? t.parts : []);
  }
  /** Marca las partes (data-lt-part), oculta las elegidas y, en la vista previa del editor (opts.onPart),
   *  pone una X para ocultar o un botón "Mostrar" sobre lo oculto (se ve atenuado). */
  function applyParts(root, d, tpl, opts) {
    const hidden = new Set(d.hidden || []), defs = partsFor(tpl.id), doc = root.ownerDocument;
    const found = new Map();
    defs.forEach(p => {
      let els = [];
      if (p.k === 'cover') {
        const src = [d.coverUrl, d.coverSmUrl].filter(Boolean);
        els = src.length ? [...root.querySelectorAll('img')].filter(im => src.includes(im.getAttribute('src'))).map(im => im.parentElement).filter(Boolean) : [];
      } else if (p.sel) els = [...root.querySelectorAll(p.sel)];
      if (!els.length) return;
      found.set(p.k, els);
      els.forEach(el => { el.setAttribute('data-lt-part', p.k); if (hidden.has(p.k)) el.classList.add(opts.onPart ? 'lt-part-ghost' : 'lt-part-off'); });
    });
    root.__ltParts = [...found.keys()];
    if (typeof opts.onPart !== 'function' || !found.size) return null;
    // Capa de botones (vista previa): una X por parte y por bloque principal de la página.
    const layer = doc.createElement('div');
    layer.className = 'lt-part-layer';
    root.appendChild(layer);
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    const place = () => {
      const R = root.getBoundingClientRect(), W = root.clientWidth;
      let html = '';
      found.forEach((els, k) => {
        const def = defs.find(p => p.k === k), off = hidden.has(k);
        if (!def.x && !off) return;
        const seen = new Set();
        els.forEach(el => {
          // un botón por bloque principal (evita 10 X en 10 palmeras)
          let top = el; while (top.parentElement && top.parentElement !== root) top = top.parentElement;
          if (seen.has(top)) return;
          const tr = top.getBoundingClientRect();
          let r = el.getBoundingClientRect();
          if (!r.width || !r.height) { if (getComputedStyle(el).display === 'none') return; r = el.parentElement ? el.parentElement.getBoundingClientRect() : tr; }
          seen.add(top);
          const x = Math.max(tr.left - R.left + 6, Math.min(r.right - R.left - 40, tr.right - R.left - 40, W - 40));
          const y = Math.max(tr.top - R.top + 6, r.top - R.top + 6);
          html += `<button type="button" class="lt-part-b${off ? ' is-off' : ''}" data-lt-pk="${esc(k)}" style="left:${Math.round(off ? Math.max(6, x - 70) : x)}px;top:${Math.round(y)}px" aria-label="${off ? 'Mostrar' : 'Ocultar'} ${esc(def.label)}" title="${off ? 'Mostrar' : 'Ocultar'} ${esc(def.label)}">${off ? `<span>Mostrar ${esc(def.label.toLowerCase())}</span>` : '×'}</button>`;
        });
      });
      layer.innerHTML = html;
    };
    const onClick = e => {
      const b = e.target && e.target.closest ? e.target.closest('.lt-part-b') : null;
      if (!b || !layer.contains(b)) return;
      e.preventDefault(); e.stopPropagation();
      const k = b.getAttribute('data-lt-pk');
      opts.onPart(k, !hidden.has(k));
    };
    layer.addEventListener('click', onClick);
    const win = doc.defaultView || globalThis;
    let raf = 0; const again = () => { if (!raf) raf = win.requestAnimationFrame(() => { raf = 0; place(); }); };
    place();
    const t1 = win.setTimeout(place, 600), t2 = win.setTimeout(place, 1800);
    win.addEventListener('resize', again);
    const imgs = [...root.querySelectorAll('img')]; imgs.forEach(im => { if (!im.complete) im.addEventListener('load', again, { once: true }); });
    return () => { layer.removeEventListener('click', onClick); win.removeEventListener('resize', again); win.clearTimeout(t1); win.clearTimeout(t2); if (raf) win.cancelAnimationFrame(raf); };
  }

  // ============================ CANDADO DE DOMINIO ============================
  // Las plantillas de la tienda solo se pintan en dominios autorizados por Diseños Streaming.
  // Si alguien copia estos archivos a otro servidor, la plantilla no se muestra.
  // Pensado para NO afectar a los clientes actuales: todas las tiendas en planesvip.com y
  // disenosstreaming.com, el editor y los dominios propios que sirve el servidor siguen igual.
  // Lista editable: agrega aquí un dominio propio nuevo si en algún caso no llegara inyectado.
  const LT_ALLOW_HOSTS = ['disenosstreaming.com', 'planesvip.com'];
  const LT_ALLOW_EXTRA = [];
  function hostAllowed(opts) {
    try {
      // Editor / vista previa: siempre permitido (se pinta dentro de mi-landing.html).
      if (opts && (opts.preview || opts.editor)) return true;
      const g = (typeof window !== 'undefined') ? window : root;
      const loc = g && g.location ? g.location : null;
      let h = loc && typeof loc.hostname === 'string' ? loc.hostname.toLowerCase().replace(/\.$/, '') : '';
      // Sin host real (iframe srcdoc/blob, archivo local, pruebas): no bloquear.
      if (!h || h === 'null' || h === 'about' || /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(h) ||
          /\.(local|localhost|test|railway\.app|up\.railway\.app)$/.test(h)) return true;
      // Dominios propios de Diseños Streaming y subdominios de revendedores (*.planesvip.com).
      for (const base of LT_ALLOW_HOSTS.concat(LT_ALLOW_EXTRA)) {
        if (h === base || h === 'www.' + base || h.endsWith('.' + base)) return true;
      }
      // Dominio propio del cliente (plan VIP): el servidor sirve la tienda e inyecta __TIENDA__.host.
      const inj = g && g.__TIENDA__ && typeof g.__TIENDA__ === 'object' ? g.__TIENDA__ : null;
      if (inj && typeof inj.host === 'string' && inj.host.toLowerCase().replace(/\.$/, '') === h) return true;
      return false;
    } catch (_) { return true; } // ante cualquier duda, no romper la tienda del cliente
  }
  function renderBlocked(node) {
    try {
      node.className = 'lt-root lt-blocked';
      node.innerHTML = '<div style="min-height:70vh;display:flex;align-items:center;justify-content:center;padding:40px;' +
        'font:600 16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#555;text-align:center;background:#fff">' +
        '<div><div style="font-size:22px;font-weight:800;margin-bottom:8px;color:#111">Tienda no disponible</div>' +
        'Esta página fue creada con <a href="https://disenosstreaming.com" target="_blank" rel="noopener" ' +
        'style="color:#7c5cfc;font-weight:800;text-decoration:none">Diseños Streaming</a>.</div></div>';
    } catch (_) {}
  }

  function render(root, data, opts = {}) {
    if (!hostAllowed(opts)) { renderBlocked(root); return; }
    const d = normalize(data, data?.ownerUid);
    // Plantillas exclusivas VIP (navidad): sin VIP vigente se pinta la plantilla de reemplazo (pop).
    let tid = opts.template || d.template;
    if (vipFallback(tid) && !vipActive(d)) tid = vipFallback(tid);
    const tpl = getTemplate(tid);
    if (!tpl) { root.textContent = 'No hay plantillas cargadas.'; return; }
    // Repintado del mismo root con la misma plantilla (editor o datos nuevos en la tienda): ctx.rerender = true.
    const rerender = root.__ltTpl === tpl.id && root.childElementCount > 0;
    if (typeof root.__ltCleanup === 'function') { try { root.__ltCleanup(); } catch (_) {} }
    root.__ltCleanup = null;
    root.innerHTML = '';
    root.className = `lt-root lt-${tpl.id}${rerender ? ' lt-rerender' : ''}`;
    root.__ltTpl = tpl.id;
    root.style.setProperty('--lt-primary', d.theme.primary);
    root.style.setProperty('--lt-accent', d.theme.accent);
    injectCss('shared', SHARED_CSS);
    // En pantallas pequeñas se usa la portada ligera: menos datos para el cliente y menos descarga.
    const narrow = typeof innerWidth === 'number' && innerWidth <= 820;
    const view = (narrow && d.coverSmUrl) ? { ...d, coverUrl: d.coverSmUrl } : { ...d };
    // Portada oculta con la X: la plantilla se pinta como si no tuviera portada (usa su diseño sin portada).
    if (d.hidden.includes('cover')) { view.coverUrl = ''; view.coverSmUrl = ''; }
    // Reseñas de ejemplo: solo en la vista previa del editor (atenuadas, "Ejemplo — no se publica"); nunca en la tienda.
    // Las reseñas (también las de ejemplo) se publican tal cual: el dueño decide si las cambia.
    const ctx = buildContext(view, opts);
    ctx.rerender = rerender;
    tpl.render(root, view, ctx);
    // Encadena la limpieza de la plantilla con la de los efectos comunes.
    const tplCleanup = root.__ltCleanup;
    const motionCleanup = applyMotion(root, view, ctx);
    const barCleanup = applyBuyBar(root, view, ctx);
    const holdCleanup = holdLazyImages(root, ctx);
    const profCleanup = ctx.noMotion ? null : pauseProfileOffscreen(root);
    const promoCleanup = startPromo(root, ctx);
    const catCleanup = applyCategories(root, ctx, tpl);
    const partsCleanup = applyParts(root, view, tpl, opts);
    const extra = [partsCleanup, catCleanup, motionCleanup, barCleanup, holdCleanup, profCleanup, promoCleanup].filter(Boolean);
    if (extra.length) root.__ltCleanup = () => {
      try { tplCleanup && tplCleanup(); } finally { extra.forEach(f => { try { f(); } catch (_) {} }); }
    };
  }

  /** Copia de CSS para un documento de vista previa con forceMotion: anula las reglas
   *  @media (prefers-reduced-motion: reduce) (núcleo y plantillas) para que se vean las animaciones elegidas.
   *  Solo para iframes del editor; la tienda pública nunca la usa. */
  const RM_QUERY = /\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/g;
  function cssIgnoringReducedMotion(css) {
    return String(css || '').replace(RM_QUERY, '(prefers-reduced-motion: reduce) and (prefers-reduced-motion: no-preference)');
  }

  root.LandingCore = Object.freeze({
    FIREBASE, CLOUDINARY, STORAGE, COLLECTION, DEFAULTS, PLATFORMS, LINK_TYPES, LINK_ICONS, CURRENCIES,
    text, esc, keyOf, slugify, slugError, safeUrl, safeImage, phoneDigits, whatsappUrl, platformInfo, money,
    registerTemplate, listTemplates, getTemplate, injectCss, normalize, sampleData, buildContext, render,
    profileHeaderHtml, SHARED_CSS, visibleInfo, LIMITS, hasPrice,
    normDomain, vipState, vipActive, VIP_TEMPLATES, vipFallback,
    planLimits, SAMPLE_REVIEWS, isSampleReview, itemKey, normPromo, promoLeft, cssIgnoringReducedMotion,
    CATEGORY_OF, CATEGORIES, planCategory, partsFor
  });
})(typeof window !== 'undefined' ? window : globalThis);
