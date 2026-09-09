/* Shared catalogue rules. Keep private inventory out of public payloads. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LandingCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const text = (v, max = 160) => String(v ?? '').trim().slice(0, max);
  const key = v => text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const aliases = new Map([['disneyplus','disney'],['primevideo','prime'],['hbomax','max'],['hbo','max']]);
  const platformKey = v => aliases.get(key(v)) || key(v);
  const archived = v => ['norenovo', 'retiradodelcombo'].includes(key(v));
  const today = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  function safeImage(value) {
    try {
      const url = new URL(text(value, 1600));
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch (_) { return ''; }
  }
  function dateValid(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }
  function accountSummary(account, clients) {
    if (!account) return null;
    const active = clients.filter(c => !archived(c.state));
    const full = active.some(c => c.fullAccountSale === true);
    const rawCapacity = Number(account.capacity);
    const capacity = Number.isFinite(rawCapacity) ? Math.max(0, Math.floor(rawCapacity)) : 0;
    return { platform: text(account.platform, 80), profile: !full && active.length < capacity,
      full: capacity > 0 && active.length === 0, due: text(account.dueDate, 20) };
  }
  function options(inventory, prices = {}) {
    const platforms = new Map();
    Object.values(inventory || {}).forEach(a => { if (a && platformKey(a.platform)) platforms.set(platformKey(a.platform), a.platform); });
    return [...platforms].sort((a, b) => a[1].localeCompare(b[1], 'es')).flatMap(([id, platform]) => {
      const match = Object.entries(prices).find(([p]) => platformKey(p) === id)?.[1];
      return ['profile', 'full'].map(mode => ({ id: `${id}:${mode}`, platform, mode,
        name: `${platform} · ${mode === 'full' ? 'Cuenta completa' : 'Perfil'}`,
        price: mode === 'profile' ? money(match?.salePrice) : null }));
    });
  }
  function money(v) { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) && n > 0 && n <= 1000000 ? Math.round(n * 100) / 100 : null; }
  function sanitize(raw = {}) {
    const ids = new Set();
    const products = (Array.isArray(raw.products) ? raw.products : []).slice(0, 120).map(p => {
      const mode = p.mode === 'full' ? 'full' : 'profile';
      const platform = text(p.platform, 80);
      const id = `${platformKey(platform)}:${mode}`;
      if (!platformKey(platform) || ids.has(id)) return null;
      ids.add(id);
      return { id, platform, mode, name: text(p.name, 100) || platform, description: text(p.description, 260),
        duration: text(p.duration, 60), image: safeImage(p.image), enabled: p.enabled === true,
        featured: p.featured === true, showPrice: p.showPrice !== false,
        priceSource: p.priceSource === 'gestor' && mode === 'profile' ? 'gestor' : 'custom', price: money(p.price) };
    }).filter(Boolean);
    return { name: text(raw.name, 80), description: text(raw.description, 360), logo: safeImage(raw.logo), cover: safeImage(raw.cover),
      whatsapp: text(raw.whatsapp, 30).replace(/\D/g, ''), cta: text(raw.cta, 40) || 'Consultar por WhatsApp',
      template: ['catalog', 'elegant', 'compact', 'spotlight', 'neon', 'magazine'].includes(raw.template) ? raw.template : 'catalog',
      color: /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : '#146c60',
      font: ['system', 'serif', 'rounded'].includes(raw.font) ? raw.font : 'system',
      currency: ['PEN', 'USD', 'MXN', 'COP', 'CLP', 'ARS', 'EUR', 'BOB'].includes(raw.currency) ? raw.currency : 'PEN',
      showPrices: raw.showPrices === true, products };
  }
  function validate(config, slug) {
    if (!config.name) throw new Error('Escribe el nombre de tu negocio.');
    if (!/^[1-9]\d{7,14}$/.test(config.whatsapp)) throw new Error('Revisa tu WhatsApp: incluye el código de país y entre 8 y 15 dígitos.');
    if (!/^[a-z0-9][a-z0-9-]{2,38}[a-z0-9]$/.test(slug) || ['admin', 'demo', 'api', 'gestor', 'soporte'].includes(slug)) throw new Error('El enlace debe tener entre 4 y 40 letras minúsculas, números o guiones.');
    if (!config.products.some(p => p.enabled)) throw new Error('Selecciona al menos un producto para publicar.');
  }
  function publicCatalog(raw, inventory, prices, day = today()) {
    const c = sanitize(raw);
    const available = new Set();
    Object.values(inventory || {}).forEach(a => {
      // Missing/invalid expiry dates are deliberately excluded from the public offer.
      if (!a || !dateValid(a.due) || a.due < day) return;
      if (a.profile) available.add(`${platformKey(a.platform)}:profile`);
      if (a.full) available.add(`${platformKey(a.platform)}:full`);
    });
    const products = c.products.filter(p => p.enabled && available.has(p.id)).map(p => {
      const result = { id: p.id, name: p.name, description: p.description, duration: p.duration, image: p.image, mode: p.mode, featured: p.featured };
      const source = Object.entries(prices || {}).find(([name]) => platformKey(name) === platformKey(p.platform))?.[1];
      const price = p.priceSource === 'gestor' ? money(source?.salePrice) : p.price;
      if (c.showPrices && p.showPrice && price !== null) result.price = price;
      return result;
    });
    // Explicit allowlist: NEVER spread draft, account, client or settings objects here.
    return { schemaVersion: 1, published: true, name: c.name, description: c.description, logo: c.logo, cover: c.cover,
      whatsapp: c.whatsapp, cta: c.cta, template: c.template, color: c.color, font: c.font, currency: c.currency, products };
  }
  function whatsappUrl(phone, name, product) {
    const digits = text(phone, 30).replace(/\D/g, '');
    if (!/^[1-9]\d{7,14}$/.test(digits)) return '';
    const message = product ? `Hola, vi el catálogo de ${text(name, 80)} y me interesa ${text(product.name, 100)}${product.duration ? ` (${text(product.duration, 60)})` : ''}. ¿Sigue disponible?` : `Hola, vi el catálogo de ${text(name, 80)}. Quisiera más información.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }
  return { text, platformKey, archived, today, safeImage, accountSummary, options, money, sanitize, validate, publicCatalog, whatsappUrl };
});
