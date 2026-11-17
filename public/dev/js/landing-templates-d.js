/* Diseños Streaming · Plantilla de landing de temporada: Navidad
 * Requiere js/landing-core.js (window.LandingCore). Sin dependencias.
 * CSS prefijado con .lt-navidad; clases internas ltb- (comunes) y ltn- (navidad).
 */
(function (G) {
  'use strict';
  const LC = G.LandingCore;
  if (!LC) { if (G.console) G.console.warn('landing-templates-d: falta LandingCore'); return; }

  // ---------- color ----------
  const HEX = /^#[0-9a-f]{6}$/i;
  const safeColor = c => HEX.test(String(c || '')) ? String(c) : '#7C3AED';
  function lum(hex) {
    const h = safeColor(hex).slice(1);
    const c = [0, 2, 4].map(i => { const v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /** Texto legible (negro o blanco) sobre un fondo dado. */
  const ink = hex => contrast(hex, '#111111') >= contrast(hex, '#ffffff') ? '#111111' : '#ffffff';
  /** Primer color con contraste suficiente sobre bg; si ninguno, blanco/negro. */
  function readable(bg, cands, min = 3.2) {
    for (const c of cands) if (HEX.test(String(c || '')) && contrast(c, bg) >= min) return c;
    return ink(bg);
  }

  // ---------- piezas comunes ----------
  function logoHtml(ctx, pid, cls, src, alt) {
    const inf = ctx.platformInfo(pid);
    const name = String(inf.name || pid || '?');
    const color = safeColor(inf.color);
    const ini = (name.trim().charAt(0) || '?').toUpperCase();
    const url = src || inf.logo;
    const label = ctx.esc(alt || name);
    if (!url) return `<span class="${cls} lt-ini" role="img" aria-label="${label}" style="background:${color};color:${ink(color)}">${ctx.esc(ini)}</span>`;
    return `<img class="${cls}" src="${ctx.esc(url)}" alt="${label}" width="56" height="56" loading="lazy" decoding="async" data-ini="${ctx.esc(ini)}" data-c="${color}">`;
  }
  // Si un logo no carga, se cambia por el círculo con la inicial (listener dentro de root).
  function onImgError(e) {
    const img = e.target;
    if (!img || img.tagName !== 'IMG' || !img.getAttribute('data-ini')) return;
    const s = img.ownerDocument.createElement('span');
    s.className = img.className + ' lt-ini';
    s.setAttribute('role', 'img'); s.setAttribute('aria-label', img.getAttribute('alt') || '');
    const c = safeColor(img.getAttribute('data-c')); s.style.background = c; s.style.color = ink(c);
    s.textContent = img.getAttribute('data-ini');
    img.replaceWith(s);
  }
  // Solo lo visible (ctx.visiblePlans/visibleCombos del núcleo; respaldo por si se usa un núcleo viejo).
  const visible = (d, ctx) => ({ plans: (ctx && ctx.visiblePlans) || d.plans.filter(p => p.visible), combos: (ctx && ctx.visibleCombos) || d.combos.filter(c => c.visible) });
  const platformIds = (plans, combos) => [...new Set(plans.map(p => p.platform).concat(combos.flatMap(c => c.platforms)))];
  function planBuy(ctx, p) {
    const title = ctx.planTitle(p), type = ctx.typeLabel(p);
    const parts = [title]; if (!title.includes(type)) parts.push(type);
    const m = ctx.money(p.price); if (m) parts.push(m); if (p.period) parts.push(p.period);
    return ctx.buy(parts.join(' · '));
  }
  function comboBuy(ctx, c) {
    const names = c.platforms.map(x => ctx.platformInfo(x).name).join(' + ');
    const parts = [`${c.name} (${names})`]; const m = ctx.money(c.price); if (m) parts.push(m); if (c.period) parts.push(c.period);
    return ctx.buy(parts.join(' · '));
  }
  function btn(ctx, url, label, cls, icon, main) {
    const inner = `${icon ? ctx.linkIcon('whatsapp') : ''}<span>${ctx.esc(label)}</span>`;
    // data-lt-btn: micro-interacción del núcleo; "main" = botón principal (único con brillo en 'max').
    const mark = main ? 'data-lt-btn="main"' : 'data-lt-btn';
    if (!url) return `<span class="ltb-btn ${cls} is-off" ${mark} aria-disabled="true">${inner}</span>`;
    return `<a class="ltb-btn ${cls}" ${mark} href="${ctx.esc(url)}" target="_blank" rel="noopener">${inner}</a>`;
  }
  function priceHtml(ctx, price, old, period) {
    const m = ctx.money(price), o = ctx.money(old);
    return `<div class="ltb-price">${o && m ? `<s class="ltb-old"><span class="ltb-sr">Antes </span>${ctx.esc(o)}</s>` : ''}<strong>${ctx.esc(m || 'Consultar')}</strong>${m && period ? `<span class="ltb-per">/ ${ctx.esc(period)}</span>` : ''}</div>`;
  }
  function planCard(ctx, p, i, extra = '', short = false) {
    const inf = ctx.platformInfo(p.platform);
    // short: sin " · Cuenta completa" en el título (la etiqueta ya va aparte en .ltb-type)
    const tt = short ? (p.title || inf.name) : ctx.planTitle(p);
    const feats = p.features.length ? `<ul class="ltb-feats">${p.features.map(f => `<li>${ctx.esc(f)}</li>`).join('')}</ul>` : '';
    return `<article class="ltb-card ltb-plan" data-rv data-lt-card style="--i:${i % 8};--pc:${safeColor(inf.color)}">${extra}` +
      `${p.badge ? `<span class="ltb-badge">${ctx.esc(p.badge)}</span>` : ''}` +
      `<div class="ltb-card-top">${logoHtml(ctx, p.platform, 'ltb-logo', p.imageUrl, ctx.planTitle(p))}<div class="ltb-meta"><h3 class="ltb-title">${ctx.esc(tt)}</h3><span class="ltb-type">${ctx.esc(ctx.typeLabel(p))}</span></div></div>` +
      `${priceHtml(ctx, p.price, p.oldPrice, p.period)}${feats}${btn(ctx, planBuy(ctx, p), 'Comprar', 'ltb-buy', true)}</article>`;
  }
  function comboCard(ctx, c, i, extra = '', cls = '') {
    const names = c.platforms.map(x => ctx.platformInfo(x).name);
    return `<article class="ltb-card ltb-combo ${cls}" data-rv data-lt-card style="--i:${i % 8}">${extra}` +
      `${c.badge ? `<span class="ltb-badge">${ctx.esc(c.badge)}</span>` : ''}` +
      `<h3 class="ltb-title">${ctx.esc(c.name)}</h3>` +
      `<div class="ltb-logos">${c.platforms.map(x => logoHtml(ctx, x, 'ltb-logo')).join('')}</div>` +
      `<p class="ltb-incl">${ctx.esc(names.join(' + '))}</p>` +
      `${priceHtml(ctx, c.price, c.oldPrice, c.period)}${btn(ctx, comboBuy(ctx, c), 'Comprar combo', 'ltb-buy', true)}</article>`;
  }
  function header(ctx, d, wa) {
    const mark = d.logoUrl
      ? `<img src="${ctx.esc(d.logoUrl)}" alt="" width="42" height="42" decoding="async">`
      : `<span class="ltb-mono" aria-hidden="true">${ctx.esc((d.name.trim().charAt(0) || 'S').toUpperCase())}</span>`;
    return `<header class="ltb-head"><div class="ltb-brand">${mark}<b>${ctx.esc(d.name)}</b></div>` +
      `${wa ? `<a class="ltb-headcta" data-lt-btn href="${ctx.esc(wa)}" target="_blank" rel="noopener">${ctx.linkIcon('whatsapp')}<span>WhatsApp</span></a>` : ''}</header>`;
  }
  const sec = (kind, title, body) => `<section class="ltb-sec ltb-sec-${kind}"><div class="ltb-wrap">${title ? `<h2 class="ltb-h2" data-rv>${title}</h2>` : ''}${body}</div></section>`;
  const benefitsSec = (ctx, d, t) => !d.benefits.length ? '' : sec('benefits', t, `<ul class="ltb-bens">${d.benefits.map((b, i) => `<li data-rv style="--i:${i}"><span class="ltb-bn" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span>${ctx.esc(b)}</span></li>`).join('')}</ul>`);
  const paysSec = (ctx, d, t) => !d.paymentMethods.length ? '' : sec('pays', t, `<ul class="ltb-pays" data-rv>${d.paymentMethods.map(p => `<li>${ctx.esc(p)}</li>`).join('')}</ul>`);
  const faqSec = (ctx, d, t) => !d.faq.length ? '' : sec('faq', t, `<div class="ltb-faq">${d.faq.map((f, i) => `<details data-rv style="--i:${i}"><summary>${ctx.esc(f.q)}</summary><p>${ctx.esc(f.a)}</p></details>`).join('')}</div>`);
  const linksSec = (ctx, d, t) => !d.links.length ? '' : sec('links', t, `<div class="ltb-links" data-rv>${d.links.map(l => `<a class="ltb-link" href="${ctx.esc(l.url)}" target="_blank" rel="noopener">${ctx.linkIcon(l.type)}<span>${ctx.esc(ctx.linkLabel(l))}</span></a>`).join('')}</div>`);
  const footer = (ctx, d, extra = '') => `<footer class="ltb-foot" data-lt-foot>${extra}<p>© ${new Date().getFullYear()} ${ctx.esc(d.name)}</p><p class="ltb-made">Hecho con <a href="https://disenosstreaming.com" target="_blank" rel="noopener">Diseños Streaming</a></p></footer>`;
  // El brillo del núcleo va en una capa interna (.ltb-shn): el ::before del botón es el anillo que late.
  const fab = (ctx, wa) => wa ? `<div class="ltb-fabwrap" data-lt-fab><a class="ltb-fab" data-lt-btn href="${ctx.esc(wa)}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">${ctx.linkIcon('whatsapp')}</a></div>` : '';
  /** Chip "Desde S/ X" para el hero, con hasta 3 logos de plataformas visibles (ctx.minPrice / ctx.platformIds). */
  function fromChip(ctx) {
    if (!ctx.minPrice) return '';
    const logos = (ctx.platformIds || []).slice(0, 3).map(id => logoHtml(ctx, id, 'ltb-fl')).join('');
    return `<div class="ltb-from">${logos ? `<span class="ltb-fls" aria-hidden="true">${logos}</span>` : ''}<span>Desde <b>${ctx.esc(ctx.minPrice)}</b></span></div>`;
  }
  /** Cabecera: tipo perfil (núcleo) o la barra propia de la plantilla. */
  const top = (ctx, d, wa) => (ctx.profileMode && typeof ctx.profileHeader === 'function') ? ctx.profileHeader() : header(ctx, d, wa);
  const heroCta = (ctx, d, wa) => wa ? btn(ctx, wa, d.ctaText, 'ltb-cta', true, true) : `<button type="button" class="ltb-btn ltb-cta" data-goto="plans">Ver planes</button>`;

  /** Prepara root: variables de contraste, listeners dentro de root y __ltCleanup. */
  function setup(root, ctx, d) {
    root.style.setProperty('--ltb-on-p', ink(d.theme.primary));
    root.style.setProperty('--ltb-on-a', ink(d.theme.accent));
    if (ctx.reducedMotion) root.classList.add('ltb-rm');
    if (ctx.preview) root.classList.add('ltb-preview');
    if (ctx.profileMode) root.classList.add('ltb-pm');
    const cleanups = [];
    const onClick = e => {
      const g = e.target && e.target.closest ? e.target.closest('[data-goto]') : null;
      if (!g || !root.contains(g)) return;
      const t = root.querySelector('.ltb-sec-' + g.getAttribute('data-goto'));
      if (t && t.scrollIntoView) { e.preventDefault(); t.scrollIntoView({ behavior: ctx.reducedMotion ? 'auto' : 'smooth', block: 'start' }); }
    };
    root.addEventListener('error', onImgError, true);
    root.addEventListener('click', onClick);
    cleanups.push(() => { root.removeEventListener('error', onImgError, true); root.removeEventListener('click', onClick); });
    root.__ltCleanup = () => { while (cleanups.length) { try { cleanups.pop()(); } catch (_) {} } };
    return cleanups;
  }
  /** Aparición al hacer scroll. Sin IntersectionObserver o con reducedMotion: todo visible. */
  function reveal(root, ctx, cleanups) {
    const els = [...root.querySelectorAll('[data-rv]')];
    if (typeof G.IntersectionObserver !== 'function') { els.forEach(e => e.classList.add('is-in')); return; }
    root.classList.add('ltb-rv');
    let fired = false;
    const io = new G.IntersectionObserver(entries => {
      fired = true;
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    els.forEach(e => io.observe(e));
    // Respaldo: si el observer no responde en 2,5 s, se muestra todo (nunca queda contenido invisible).
    const timer = G.setTimeout(() => { if (!fired) els.forEach(e => e.classList.add('is-in')); }, 2500);
    cleanups.push(() => { io.disconnect(); G.clearTimeout(timer); });
  }

  /** CSS estructural común, con el prefijo de cada plantilla. */
  function baseCss(id) {
    const s = '.lt-' + id;
    return `
${s}{position:relative;overflow-x:clip;min-height:100%;line-height:1.5;-webkit-text-size-adjust:100%;-webkit-font-smoothing:antialiased}
${s} *,${s} *::before,${s} *::after{box-sizing:border-box}
${s} img{max-width:100%;display:block}
${s} a{color:inherit}
${s} button{font:inherit}
${s} .ltb-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
${s} .ltb-wrap{width:100%;max-width:1120px;margin:0 auto;padding:0 18px}
${s} .ltb-sec{padding:56px 0;position:relative}
${s} .ltb-h2{margin:0 0 26px;font-size:clamp(26px,6.5vw,44px);line-height:1.08;overflow-wrap:anywhere}
${s} .ltb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:22px}
${s} .ltb-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;max-width:1120px;margin:0 auto;position:relative;z-index:3}
${s} .ltb-brand{display:flex;align-items:center;gap:10px;min-width:0}
${s} .ltb-brand img,${s} .ltb-mono{width:42px;height:42px;border-radius:12px;object-fit:cover;flex:none}
${s} .ltb-mono{display:grid;place-items:center;font-weight:800}
${s} .ltb-brand b{font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
${s} .ltb-headcta{flex:none}
${s} .ltb-logo{width:52px;height:52px;border-radius:14px;flex:none;object-fit:cover}
.lt-premium .ltb-logo,.lt-kinetic .ltb-logo{outline:1px solid rgba(255,255,255,.16);outline-offset:-1px}
${s} .lt-ini{display:grid;place-items:center;font-weight:800;font-size:22px;line-height:1}
${s} .ltb-card{position:relative;display:flex;flex-direction:column;gap:14px;min-width:0}
${s} .ltb-card-top{display:flex;align-items:center;gap:12px;min-width:0}
${s} .ltb-meta{min-width:0}
${s} .ltb-title{margin:0;font-size:18px;line-height:1.15;overflow-wrap:anywhere}
${s} .ltb-type{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
${s} .ltb-price{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px}
${s} .ltb-price strong{font-size:34px;line-height:1}
${s} .ltb-old{font-size:15px}
${s} .ltb-per{font-size:14px;opacity:.8}
${s} .ltb-feats{list-style:none;margin:0;padding:0;display:grid;gap:7px;font-size:14px}
${s} .ltb-feats li{display:flex;gap:9px;align-items:flex-start;min-width:0;overflow-wrap:anywhere}
${s} .ltb-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:12px 22px;text-decoration:none;font-weight:800;cursor:pointer;-webkit-tap-highlight-color:transparent;text-align:center;max-width:100%}
${s} .ltb-btn svg{width:20px;height:20px;flex:none}
${s} .ltb-btn.is-off{opacity:.5;cursor:not-allowed}
${s} .ltb-card .ltb-btn{margin-top:auto;width:100%}
${s} .ltb-logos{display:flex;flex-wrap:wrap;gap:8px}
${s} .ltb-logos .ltb-logo{width:42px;height:42px;border-radius:12px;font-size:17px}
${s} .ltb-incl{margin:0;font-size:14px}
${s} .ltb-bens{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:14px}
${s} .ltb-bens li{display:flex;align-items:center;gap:12px;min-width:0;overflow-wrap:anywhere}
${s} .ltb-pays{display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:0}
${s} .ltb-faq{display:grid;gap:12px;max-width:760px}
${s} .ltb-faq summary{cursor:pointer;list-style:none;font-weight:700;padding:16px 46px 16px 18px;position:relative}
${s} .ltb-faq summary::-webkit-details-marker{display:none}
${s} .ltb-faq summary::after{content:"+";position:absolute;right:18px;top:50%;transform:translateY(-50%);font-size:24px;line-height:1;transition:transform .25s}
${s} .ltb-faq details[open] summary::after{transform:translateY(-50%) rotate(45deg)}
${s} .ltb-faq p{margin:0;padding:0 18px 16px}
${s} .ltb-links{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
${s} .ltb-link{display:inline-flex;align-items:center;gap:10px;min-height:48px;padding:10px 20px;text-decoration:none;font-weight:700;max-width:100%}
${s} .ltb-link svg{width:22px;height:22px;flex:none}
${s} .ltb-foot{padding:36px 18px 104px;text-align:center;font-size:13px}
${s} .ltb-foot p{margin:4px 0}
${s} .ltb-fabwrap{position:fixed;right:16px;bottom:16px;z-index:40}
${s}.ltb-preview .ltb-fabwrap{position:sticky;right:auto;bottom:16px;display:flex;justify-content:flex-end;padding:0 16px 16px;pointer-events:none}
${s} .ltb-fab{position:relative;pointer-events:auto;width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:#25D366;color:#fff;box-shadow:0 10px 26px rgba(0,0,0,.32);text-decoration:none;animation:ltb-fabin-${id} .7s .8s cubic-bezier(.3,1.6,.5,1) both}
${s} .ltb-fab svg{width:32px;height:32px}
${s} .ltb-fab::before{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #25D366;animation:ltb-ping-${id} 2.2s 1.6s ease-out infinite}
@keyframes ltb-fabin-${id}{from{opacity:0;transform:scale(0) rotate(-90deg)}to{opacity:1;transform:none}}
@keyframes ltb-ping-${id}{from{transform:scale(1);opacity:.85}to{transform:scale(1.75);opacity:0}}
@media (max-width:480px){${s} .ltb-fabwrap{right:12px;bottom:12px}${s} .ltb-fab{width:52px;height:52px}${s} .ltb-fab svg{width:28px;height:28px}}
${s} .ltb-pays li,${s} .ltb-faq,${s} .ltb-faq summary,${s} .ltb-faq p,${s} .ltb-foot,${s} .ltb-link span,${s} .ltb-incl,${s} .ltb-sub,${s} .ltb-eyebrow,${s} .ltb-price,${s} .ltb-tp b{overflow-wrap:anywhere;min-width:0}
${s} .ltb-pays li{max-width:100%}
${s}.ltb-rv [data-rv]:not(.is-in){opacity:0}
${s}.ltb-rv [data-rv].is-in{animation:ltb-up-${id} .75s calc(var(--i,0) * 90ms) cubic-bezier(.2,.75,.25,1) both}
@keyframes ltb-up-${id}{from{opacity:0;translate:0 28px}to{opacity:1;translate:0 0}}
${s} .ltb-shn{position:absolute;inset:0;border-radius:inherit;pointer-events:none}
${s}[data-lt-motion] .ltb-shn[data-lt-btn]{position:absolute;inset:0;border-radius:inherit;pointer-events:none}
${s}[data-lt-motion="max"] .ltb-card[data-lt-card]{transition:transform .25s ease-out,rotate .45s cubic-bezier(.3,1.7,.5,1),box-shadow .2s,border-color .4s}
${s}[data-lt-motion="calm"] *,${s}[data-lt-motion="calm"] *::before,${s}[data-lt-motion="calm"] *::after{animation-fill-mode:both!important}
${s} .ltb-from{display:inline-flex;align-items:center;gap:10px;max-width:100%;padding:6px 14px 6px 6px;border-radius:999px;font-size:15px;margin:0 0 22px;overflow-wrap:anywhere}
${s} .ltb-from b{font-size:1.15em;font-weight:900}
${s} .ltb-fls{display:flex;flex:none}
${s} .ltb-fl{width:28px;height:28px;border-radius:50%;object-fit:cover;font-size:12px;flex:none}
${s} .ltb-fl+.ltb-fl{margin-left:-8px}
@keyframes ltb-fade-${id}{from{opacity:0}to{opacity:1}}
${s}.ltb-rm *,${s}.ltb-rm *::before,${s}.ltb-rm *::after{animation:none!important;transition:none!important}
${s}.ltb-rm.ltb-rv [data-rv].is-in{animation:ltb-fade-${id} .45s ease-out both!important}
@media (prefers-reduced-motion:reduce){${s} *,${s} *::before,${s} *::after{animation:none!important;transition:none!important}${s}.ltb-rv [data-rv].is-in{animation:ltb-fade-${id} .45s ease-out both!important}}
`;
  }

  // =====================================================================
  // NAVIDAD — rojo terciopelo, guirnalda de pino con esferas 3D, dorado,
  // cupones redondos, vitrina con moño y paneles con marco de caramelo.
  // Todo dibujado con SVG/CSS propio (sin imágenes externas).
  // =====================================================================
  const NV_GOLD = 'linear-gradient(180deg,#fff4c6 0%,#f5cf62 42%,#d29a2b 72%,#a8711a 100%)';
  const NV_CANDY = 'repeating-linear-gradient(-45deg,#d7172b 0 10px,#fff 10px 20px)';
  const CSS_NAVIDAD = `@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');` + baseCss('navidad') + `
.lt-navidad{--nv-red:#c8102e;--nv-red2:#8e0a18;--nv-deep:#5c050c;--nv-ink:#3a0a10;--nv-mut:#7a4a50;--nv-cream:#fff8ec;--nv-green:#137a3e;--nv-green2:#0b5229;--nv-gold:#f2c75a;--nv-script:"Great Vibes","Brush Script MT","Segoe Script",cursive;background:radial-gradient(ellipse 130% 55% at 50% 0%,#e8202f 0%,#b80f1f 38%,#860816 72%,#5c050c 100%) #6a0610;color:#fff;font-family:"Poppins","Montserrat",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.lt-navidad::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(1.6px 1.6px at 14px 18px,rgba(255,255,255,.28) 50%,transparent 55%) 0 0/52px 52px,radial-gradient(1.2px 1.2px at 38px 40px,rgba(255,220,160,.25) 50%,transparent 55%) 0 0/52px 52px}
.lt-navidad .ltb-h1,.lt-navidad .ltb-h2,.lt-navidad .ltb-title,.lt-navidad .ltb-price strong,.lt-navidad .ltb-brand b{font-weight:800;letter-spacing:-.015em}
/* cabecera propia */
.lt-navidad .ltn-top{position:relative;z-index:5;background:linear-gradient(180deg,rgba(60,2,8,.55),transparent)}
.lt-navidad .ltb-brand img,.lt-navidad .ltb-mono{border-radius:50%;border:2px solid var(--nv-gold);box-shadow:0 0 0 3px rgba(242,199,90,.25)}
.lt-navidad .ltb-mono{background:${NV_GOLD};color:var(--nv-red2);font-size:20px;font-weight:900}
.lt-navidad .ltb-headcta{display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#063a1c;border-radius:999px;padding:8px 14px;font-weight:800;font-size:14px;text-decoration:none;box-shadow:0 3px 0 #128c4a}
.lt-navidad .ltb-headcta svg{width:18px;height:18px}
/* guirnalda */
.lt-navidad .ltn-garland{position:absolute;left:0;right:0;top:0;width:100%;height:clamp(118px,16vw,200px);z-index:4;pointer-events:none;overflow:visible;filter:drop-shadow(0 8px 10px rgba(40,0,6,.45))}
.lt-navidad .ltn-sw{transform-box:fill-box;transform-origin:50% 0;animation:nv-swing 3.6s ease-in-out infinite alternate}
.lt-navidad .ltn-sw:nth-of-type(2n){animation-duration:4.4s;animation-delay:-1.2s}
.lt-navidad .ltn-sw:nth-of-type(3n){animation-duration:3.1s;animation-delay:-2s}
@keyframes nv-swing{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
.lt-navidad .ltn-glint{animation:nv-glint 2.4s ease-in-out infinite alternate}
@keyframes nv-glint{from{opacity:.25}to{opacity:1}}
/* hero */
.lt-navidad .ltn-hero{position:relative;overflow:hidden;padding:clamp(120px,15vw,190px) 0 64px}
.lt-navidad.ltb-pm .ltn-hero{padding-top:clamp(110px,13vw,170px)}
.lt-navidad .ltn-bokeh{position:absolute;inset:0;z-index:0;pointer-events:none}
.lt-navidad .ltn-bokeh i{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);border-radius:50%;background:radial-gradient(circle,rgba(255,214,140,.42),rgba(255,214,140,0) 68%);animation:nv-bk var(--t,9s) var(--d,0s) ease-in-out infinite alternate}
@keyframes nv-bk{from{opacity:.35;transform:translateY(0)}to{opacity:1;transform:translateY(-18px)}}
.lt-navidad .ltn-snow{position:absolute;left:0;right:0;top:-300px;bottom:0;pointer-events:none;z-index:1}
.lt-navidad .ltn-snow::before,.lt-navidad .ltn-snow::after{content:"";position:absolute;inset:0;will-change:transform}
.lt-navidad .ltn-snow::before{background-image:radial-gradient(2.4px 2.4px at 20px 30px,#fff 50%,transparent 55%),radial-gradient(2px 2px at 95px 150px,rgba(255,255,255,.9) 50%,transparent 55%),radial-gradient(2.8px 2.8px at 160px 80px,rgba(255,255,255,.85) 50%,transparent 55%),radial-gradient(1.8px 1.8px at 60px 210px,#fff 50%,transparent 55%);background-size:230px 250px;animation:nv-f1 15s linear infinite}
.lt-navidad .ltn-snow::after{background-image:radial-gradient(4px 4px at 50px 70px,rgba(255,255,255,.8) 50%,transparent 56%),radial-gradient(3.2px 3.2px at 220px 220px,rgba(255,255,255,.7) 50%,transparent 56%);background-size:300px 300px;animation:nv-f2 21s linear infinite}
@keyframes nv-f1{to{transform:translate3d(-30px,250px,0)}}
@keyframes nv-f2{to{transform:translate3d(40px,300px,0)}}
.lt-navidad .ltn-hero-in{position:relative;z-index:3;display:grid;gap:40px;align-items:center}
@media (min-width:880px){.lt-navidad .ltn-hero-in{grid-template-columns:1.1fr .9fr}}
@media (max-width:879px){.lt-navidad .ltn-hero-txt{text-align:center}.lt-navidad .ltn-coupons,.lt-navidad .ltb-ctas,.lt-navidad .ltn-count{justify-content:center}.lt-navidad .ltb-sub{margin-left:auto;margin-right:auto}}
.lt-navidad .ltn-script{margin:0;font-family:var(--nv-script);font-weight:400;font-size:clamp(46px,11vw,84px);line-height:1;background:${NV_GOLD};-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(90,5,12,.55));padding:0 .1em;animation:nv-in .9s .1s cubic-bezier(.2,.8,.2,1) both}
.lt-navidad .ltb-h1{font-size:clamp(30px,6vw,56px);line-height:1.08;margin:6px 0 14px;color:#fff;text-shadow:0 3px 0 rgba(90,5,12,.6),0 10px 30px rgba(40,0,6,.45);overflow-wrap:break-word;animation:nv-in .9s .25s cubic-bezier(.2,.8,.2,1) both}
@keyframes nv-in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.lt-navidad .ltb-sub{font-size:clamp(15px,4vw,19px);max-width:540px;margin:0 0 24px;color:#ffe2df;font-weight:500}
/* cupones redondos */
.lt-navidad .ltn-coupons{list-style:none;margin:0 0 22px;padding:0;display:flex;flex-wrap:wrap;gap:12px}
.lt-navidad .ltn-cp{position:relative;width:clamp(92px,24vw,112px);aspect-ratio:1;border-radius:50%;padding:5px;background:${NV_GOLD};box-shadow:0 10px 22px rgba(40,0,6,.45);animation:nv-pop .7s calc(.4s + var(--k) * .12s) cubic-bezier(.3,1.6,.5,1) both}
.lt-navidad .ltn-cp>span{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ec2c3d,#b30d1f 60%,#7d0714);border:2px dashed rgba(255,240,200,.7);text-align:center;line-height:1.05;padding:6px}
.lt-navidad .ltn-cp small{font-size:9.5px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;color:#ffe3a6;text-transform:uppercase;letter-spacing:.04em}
.lt-navidad .ltn-cp b{font-size:clamp(16px,4.4vw,21px);font-weight:900;color:#fff;margin:2px 0;overflow-wrap:anywhere}
.lt-navidad .ltn-cp::before{content:"";position:absolute;top:-10px;left:50%;width:26px;height:16px;margin-left:-13px;background:radial-gradient(circle at 30% 40%,#e6353f 4px,transparent 5px),radial-gradient(circle at 70% 40%,#e6353f 4px,transparent 5px),radial-gradient(ellipse at 15% 70%,#137a3e 6px,transparent 7px),radial-gradient(ellipse at 85% 70%,#0b5229 6px,transparent 7px)}
@keyframes nv-pop{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:none}}
/* cuenta regresiva */
.lt-navidad .ltn-count{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 26px;font-weight:700;color:#ffe3a6;font-size:14px}
.lt-navidad .ltn-count-box{display:flex;gap:6px}
.lt-navidad .ltn-count-box span{display:grid;place-items:center;min-width:54px;padding:6px 6px 5px;border-radius:10px;background:var(--nv-cream);color:var(--nv-red);line-height:1;box-shadow:0 4px 0 #d9b25a}
.lt-navidad .ltn-count-box b{font-size:22px;font-weight:900}
.lt-navidad .ltn-count-box small{font-size:10px;color:var(--nv-mut);font-weight:700;margin-top:3px}
.lt-navidad .ltn-count-msg{font-family:var(--nv-script);font-size:40px;color:var(--nv-gold)}
/* botones */
.lt-navidad .ltb-ctas{display:flex;flex-wrap:wrap;gap:12px}
.lt-navidad .ltb-btn{border-radius:999px;font-size:16px;font-weight:800;border:0;color:#fff;background:linear-gradient(180deg,#ef3543,#b80f1f);box-shadow:0 4px 0 #6e0711,0 10px 18px rgba(80,0,10,.3);transition:transform .25s cubic-bezier(.3,1.8,.5,1),box-shadow .15s}
.lt-navidad .ltb-btn:hover{transform:translateY(-2px)}
.lt-navidad .ltb-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #6e0711}
.lt-navidad .ltb-cta{background:${NV_GOLD};color:#5c050c;font-size:18px;min-height:58px;padding:14px 30px;box-shadow:0 5px 0 #8a5a12,0 14px 26px rgba(40,0,6,.45)}
.lt-navidad .ltb-cta:active{box-shadow:0 1px 0 #8a5a12}
.lt-navidad .ltb-ghost{background:transparent;color:#fff;border:2px solid rgba(255,227,166,.75);box-shadow:none}
/* vitrina con moño */
.lt-navidad .ltn-show{position:relative;justify-self:center;width:calc(100% - 10px);max-width:440px;margin-top:26px;padding:42px 20px 22px;border-radius:26px;border:9px solid transparent;background:linear-gradient(var(--nv-cream),var(--nv-cream)) padding-box,${NV_CANDY} border-box;box-shadow:0 26px 50px rgba(40,0,6,.55);color:var(--nv-ink);text-align:center;animation:nv-in 1s .35s cubic-bezier(.2,.8,.2,1) both}
.lt-navidad .ltn-show h3{margin:0 0 14px;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--nv-red)}
.lt-navidad .ltn-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.lt-navidad .ltn-tile{position:relative;background:#fff;border-radius:18px;padding:8px;box-shadow:0 8px 18px rgba(90,5,12,.14);animation:nv-float 4s calc(var(--k) * -.7s) ease-in-out infinite alternate}
.lt-navidad .ltn-tile .ltb-logo{width:100%;height:auto;aspect-ratio:1;border-radius:13px;font-size:26px}
@keyframes nv-float{from{transform:translateY(0)}to{transform:translateY(-6px)}}
.lt-navidad .ltn-show-min{margin:16px 0 0;font-weight:700;color:var(--nv-mut);font-size:14px}
.lt-navidad .ltn-show-min b{color:var(--nv-red);font-size:20px}
.lt-navidad .ltn-photo{position:relative;justify-self:center;width:calc(100% - 10px);max-width:500px;margin:26px 0 0;padding:10px;border-radius:22px;background:var(--nv-cream);box-shadow:0 26px 50px rgba(40,0,6,.55)}
.lt-navidad .ltn-photo img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px}
/* moño grande */
.lt-navidad .ltn-bigbow{position:absolute;left:50%;top:-34px;width:120px;height:62px;margin-left:-60px;z-index:3;filter:drop-shadow(0 6px 6px rgba(60,0,8,.35))}
.lt-navidad .ltn-photo::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:22px;margin-left:-11px;background:linear-gradient(90deg,#9c0b1a,#e2313b,#9c0b1a);opacity:.9}
/* paneles de sección */
.lt-navidad .ltb-sec{padding:58px 0 30px}
.lt-navidad .ltb-sec .ltb-wrap{position:relative}
.lt-navidad .ltn-panel{position:relative;padding:58px 18px 24px;border-radius:28px;border:9px solid transparent;background:linear-gradient(var(--nv-cream),var(--nv-cream)) padding-box,${NV_CANDY} border-box;box-shadow:0 26px 50px rgba(40,0,6,.45);color:var(--nv-ink)}
@media (min-width:700px){.lt-navidad .ltn-panel{padding:66px 28px 30px}}
.lt-navidad .ltn-panel-g{background:linear-gradient(var(--nv-cream),var(--nv-cream)) padding-box,repeating-linear-gradient(-45deg,#137a3e 0 10px,#fff 10px 20px) border-box}
.lt-navidad .ltb-h2{position:absolute;left:50%;top:0;transform:translate(-50%,-62%);z-index:3;margin:0;width:max-content;max-width:calc(100% - 50px);text-align:center}
.lt-navidad .ltn-rib{position:relative;display:inline-block;padding:13px 28px 14px;border-radius:6px;background:linear-gradient(180deg,#ee3444,#a50d1d);color:#fff;font-size:clamp(19px,5vw,28px);box-shadow:0 8px 16px rgba(60,0,8,.35);text-shadow:0 2px 0 rgba(0,0,0,.2);overflow-wrap:anywhere}
.lt-navidad .ltn-rib::before,.lt-navidad .ltn-rib::after{content:"";position:absolute;top:12px;bottom:-11px;width:30px;background:#6e0711;z-index:-1}
.lt-navidad .ltn-rib::before{left:-20px;clip-path:polygon(0 0,100% 0,100% 100%,0 100%,38% 50%)}
.lt-navidad .ltn-rib::after{right:-20px;clip-path:polygon(0 0,100% 0,62% 50%,100% 100%,0 100%)}
.lt-navidad .ltn-panel-g .ltn-rib{background:linear-gradient(180deg,#22a356,#0d5d2f)}
.lt-navidad .ltn-panel-g .ltn-rib::before,.lt-navidad .ltn-panel-g .ltn-rib::after{background:#063d1e}
.lt-navidad .ltn-sprig{position:absolute;width:110px;height:80px;z-index:2;pointer-events:none;filter:drop-shadow(0 4px 4px rgba(60,0,8,.3))}
.lt-navidad .ltn-sprig.l{top:-30px;left:-24px}
.lt-navidad .ltn-sprig.r{top:-30px;right:-24px;transform:scaleX(-1)}
@media (max-width:520px){.lt-navidad .ltn-sprig{width:80px;height:58px}.lt-navidad .ltn-sprig.l{left:-14px}.lt-navidad .ltn-sprig.r{right:-14px}}
/* tarjetas de plan */
.lt-navidad .ltb-grid{gap:22px}
.lt-navidad .ltn-card{background:#fff;border-radius:20px;padding:20px 18px 18px;border:1px solid #f3dcd6;box-shadow:0 12px 26px rgba(90,5,12,.1);transition:transform .3s cubic-bezier(.3,1.6,.5,1),box-shadow .3s}
.lt-navidad .ltn-card:hover{transform:translateY(-5px);box-shadow:0 20px 36px rgba(90,5,12,.18)}
.lt-navidad .ltn-lg{position:relative;flex:none}
.lt-navidad .ltn-lg::after{content:"";position:absolute;top:-13px;right:-9px;width:30px;height:24px;background:linear-gradient(160deg,#ef3543,#a50d1d);clip-path:polygon(0 100%,100% 100%,78% 30%,40% 0);rotate:20deg;filter:drop-shadow(0 3px 0 #fff)}
.lt-navidad .ltn-lg::before{content:"";position:absolute;top:-17px;right:4px;width:9px;height:9px;border-radius:50%;background:#fff;z-index:1;box-shadow:0 1px 2px rgba(0,0,0,.25)}
.lt-navidad .ltb-logo{box-shadow:0 4px 12px rgba(90,5,12,.18)}
.lt-navidad .ltb-title{color:var(--nv-ink)}
.lt-navidad .ltb-type{color:var(--nv-green)}
.lt-navidad .ltb-feats{color:var(--nv-mut);font-weight:500}
.lt-navidad .ltb-feats li::before{content:"✦";flex:none;color:var(--nv-red);font-size:13px;line-height:1.5}
.lt-navidad .ltn-pricetag{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.lt-navidad .ltn-buyrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:auto}
.lt-navidad .ltn-buyrow .ltb-btn{flex:1 1 120px;width:auto;margin-top:0}
.lt-navidad .ltn-combo.ltn-hs{padding-top:30px}
.lt-navidad .ltn-combo .ltn-stamp{right:auto;left:-10px;rotate:-12deg}
.lt-navidad .ltn-combo.ltn-hs .ltb-title{padding-left:52px;padding-right:0}
.lt-navidad .ltn-pricetag .ltb-price{display:inline-flex;align-items:baseline;gap:6px;background:linear-gradient(180deg,#ef3543,#b80f1f);color:#fff;border-radius:14px;padding:8px 14px;box-shadow:0 4px 0 #7d0714}
.lt-navidad .ltn-pricetag .ltb-price strong{font-size:30px;color:#fff}
.lt-navidad .ltn-pricetag .ltb-old{color:#ffd0d3;font-size:13px}
.lt-navidad .ltn-pricetag .ltb-per{color:#ffe3a6;font-size:12px;opacity:1}
/* sello de oferta */
.lt-navidad .ltn-stamp{position:absolute;top:-14px;right:-10px;z-index:3;display:grid;place-items:center;width:66px;height:66px;border-radius:50%;padding:7px;background:radial-gradient(circle at 35% 30%,#ef3543,#a50d1d);border:3px solid var(--nv-gold);color:#fff;font-size:9.5px;font-weight:800;line-height:1.1;text-align:center;text-transform:uppercase;rotate:12deg;box-shadow:0 6px 12px rgba(90,5,12,.35);overflow:hidden;overflow-wrap:normal;word-break:normal;hyphens:none;animation:nv-stamp 3.4s 1s ease-in-out 3}
@keyframes nv-stamp{0%,70%,100%{transform:scale(1)}80%{transform:scale(1.12)}90%{transform:scale(.96)}}
/* combos */
.lt-navidad .ltn-crow{display:grid;gap:18px}
.lt-navidad .ltn-combo{background:#fff;border-radius:20px;padding:20px 18px 18px;border:2px dashed #e7b9b2;box-shadow:0 12px 26px rgba(90,5,12,.1);display:grid;gap:12px}
@media (min-width:760px){.lt-navidad .ltn-combo{grid-template-columns:1fr auto;align-items:center;gap:8px 28px;padding:22px 26px}.lt-navidad .ltn-combo .ltn-cbuy{grid-column:2;grid-row:1/span 3;display:grid;gap:12px;justify-items:stretch;min-width:220px}}
.lt-navidad .ltn-cbuy{display:grid;gap:12px}
.lt-navidad .ltn-combo .ltb-title{font-size:22px;padding-right:56px}
.lt-navidad .ltn-combo .ltb-logos{gap:0}
.lt-navidad .ltn-combo .ltb-logos .ltb-logo{margin-right:-10px;border-radius:50%;border:3px solid #fff}
.lt-navidad .ltn-combo .ltb-incl{color:var(--nv-mut);font-weight:600}
.lt-navidad .ltn-combo .ltb-btn{width:100%}
/* beneficios */
.lt-navidad .ltb-bens li{background:#fff;border-radius:16px;padding:14px 16px;font-weight:700;color:var(--nv-ink);box-shadow:0 8px 18px rgba(90,5,12,.08)}
.lt-navidad .ltb-bn{position:relative;flex:none;display:grid;place-items:center;width:42px;height:42px;margin-top:6px;border-radius:50%;color:#fff;font-weight:900;font-size:13px;background:radial-gradient(circle at 33% 28%,#ffb0b5 0,#ef3543 18%,#b30d1f 55%,#5c050c)}
.lt-navidad .ltb-bens li:nth-child(3n+2) .ltb-bn{background:radial-gradient(circle at 33% 28%,#fff6cf 0,#f5cf62 22%,#c48a20 60%,#6b4508);color:#4a2c00}
.lt-navidad .ltb-bens li:nth-child(3n) .ltb-bn{background:radial-gradient(circle at 33% 28%,#b9f3cc 0,#22a356 22%,#0d5d2f 60%,#04301a)}
.lt-navidad .ltb-bn::before{content:"";position:absolute;top:-7px;left:50%;width:12px;height:8px;margin-left:-6px;border-radius:3px 3px 0 0;background:${NV_GOLD}}
.lt-navidad .ltb-pays{justify-content:center}
.lt-navidad .ltb-pays li{padding:10px 20px;border-radius:999px;font-weight:800;color:#5c050c;background:${NV_GOLD};box-shadow:0 4px 0 #8a5a12}
.lt-navidad .ltb-faq{margin:0 auto}
.lt-navidad .ltb-faq details{background:#fff;border-radius:16px;box-shadow:0 8px 18px rgba(90,5,12,.08);border:1px solid #f3dcd6}
.lt-navidad .ltb-faq summary{color:var(--nv-ink)}
.lt-navidad .ltb-faq summary::after{color:var(--nv-red)}
.lt-navidad .ltb-faq p{color:var(--nv-mut)}
.lt-navidad .ltb-links{gap:12px}
.lt-navidad .ltb-link{background:#fff;color:var(--nv-ink);border-radius:999px;box-shadow:0 6px 14px rgba(90,5,12,.12)}
.lt-navidad .ltb-link svg{color:var(--nv-red)}
/* pie */
.lt-navidad .ltb-foot{position:relative;margin-top:40px;padding-top:64px;background:linear-gradient(180deg,#4a0309,#2c0105);color:#f3c9c4}
.lt-navidad .ltb-foot::before{content:"";position:absolute;top:-1px;left:0;right:0;height:26px;background:radial-gradient(circle at 17px 4px,#fff 14px,transparent 15px) 0 0/34px 24px repeat-x,linear-gradient(#fff,#fff) 0 0/100% 5px no-repeat;opacity:.95}
.lt-navidad .ltn-felices{font-family:var(--nv-script);font-size:46px;line-height:1.1;margin:0 0 8px!important;background:${NV_GOLD};-webkit-background-clip:text;background-clip:text;color:transparent}
.lt-navidad .ltb-made a{color:var(--nv-gold);font-weight:800}
.lt-navidad .ltb-fab::after{content:"";position:absolute;top:-15px;right:-7px;width:30px;height:26px;background:linear-gradient(160deg,#ef3543,#a50d1d);clip-path:polygon(10% 100%,90% 100%,72% 22%,42% 0);rotate:18deg;filter:drop-shadow(0 4px 0 #fff)}
/* cabecera tipo perfil sobre fondo rojo */
.lt-navidad .ltp-ring{background:${NV_GOLD}}
.lt-navidad .ltp-cover{box-shadow:0 14px 30px rgba(40,0,6,.45);border-bottom:4px solid var(--nv-gold)}
.lt-navidad .ltp-avatar-in{border-color:#7d0714}
.lt-navidad .ltp-name{text-shadow:0 2px 0 rgba(60,0,8,.5)}
.lt-navidad .ltp-tag{color:#ffe2df;opacity:1}
/* niveles */
.lt-navidad .ltn-snow3{display:none}
.lt-navidad[data-lt-motion="max"] .ltn-snow3{display:block;position:absolute;inset:-260px 0 0;pointer-events:none;z-index:1;background-image:radial-gradient(5px 5px at 70px 80px,rgba(255,255,255,.9) 50%,transparent 56%),radial-gradient(4px 4px at 230px 190px,rgba(255,255,255,.8) 50%,transparent 56%);background-size:300px 260px;animation:nv-f3 10s linear infinite}
@keyframes nv-f3{to{transform:translate3d(-50px,260px,0)}}
@media (max-width:480px){.lt-navidad .ltn-snow::after{display:none}.lt-navidad .ltb-headcta span{display:none}.lt-navidad .ltb-headcta{padding:8px}.lt-navidad .ltn-tile{animation:none}}
`;

  // ---------- dibujos ----------
  /** Guirnalda de pino (agujas generadas) con esferas 3D colgando. viewBox 1200x200. */
  const NV_GARLAND = (() => {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const greens = ['#0a4a27', '#0f6334', '#16783f', '#0c5530', '#1d8a4a'];
    const anchors = [[-20, 4], [300, 4], [600, 4], [900, 4], [1220, 4]];
    let needles = '';
    for (let s = 0; s < 4; s++) {
      const [x0, y0] = anchors[s], [x2, y2] = anchors[s + 1];
      const cx = (x0 + x2) / 2, cy = 112;
      for (let i = 0; i <= 64; i++) {
        const t = i / 64, mt = 1 - t;
        const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x2, y = mt * mt * y0 + 2 * mt * t * cy + t * t * y2;
        for (let n = 0; n < 5; n++) {
          const a = rnd() * Math.PI * 2, L = 12 + rnd() * 14;
          needles += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(a) * L).toFixed(1)} ${(Math.sin(a) * L * .8).toFixed(1)}" stroke="${greens[(i + n) % greens.length]}"/>`;
        }
      }
    }
    const balls = [[150, 58, 34, 22, 'r'], [300, 4, 66, 17, 'g'], [450, 58, 22, 27, 'g'], [600, 4, 96, 22, 'r'], [750, 58, 40, 18, 's'], [900, 4, 62, 25, 'r'], [1050, 58, 28, 21, 'g'], [60, 30, 40, 15, 'r'], [1140, 30, 44, 16, 's']];
    const ball = ([x, y, len, r, c]) => `<g class="ltn-sw"><line x1="${x}" y1="${y}" x2="${x}" y2="${y + len}" stroke="#e9c46a" stroke-width="1.5"/><rect x="${x - r * .32}" y="${y + len - 3}" width="${r * .64}" height="${r * .42}" rx="2" fill="url(#nvCap)"/><circle cx="${x}" cy="${y + len + r}" r="${r}" fill="url(#nvB${c})"/><ellipse class="ltn-glint" cx="${x - r * .38}" cy="${y + len + r * .6}" rx="${r * .22}" ry="${r * .14}" fill="#fff" opacity=".8" transform="rotate(-30 ${x - r * .38} ${y + len + r * .6})"/></g>`;
    const berries = [[300, 12], [600, 12], [900, 12], [150, 70], [450, 70], [750, 70], [1050, 70]].map(([x, y]) => `<circle cx="${x - 7}" cy="${y}" r="6" fill="#d7172b"/><circle cx="${x + 5}" cy="${y + 3}" r="5.5" fill="#ef3543"/><circle cx="${x - 1}" cy="${y + 9}" r="5" fill="#b30d1f"/>`).join('');
    const grad = (id, a, b, c, d) => `<radialGradient id="${id}" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="${a}"/><stop offset=".28" stop-color="${b}"/><stop offset=".65" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></radialGradient>`;
    return `<svg class="ltn-garland" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><defs>${grad('nvBr', '#ffd0d3', '#ff4a55', '#c8102e', '#4a040c')}${grad('nvBg', '#fffbe0', '#ffd968', '#cf9426', '#5e3c06')}${grad('nvBs', '#ffffff', '#eef1f6', '#aab4c4', '#59627a')}<linearGradient id="nvCap" x1="0" x2="1"><stop offset="0" stop-color="#a8711a"/><stop offset=".5" stop-color="#fff0b3"/><stop offset="1" stop-color="#a8711a"/></linearGradient></defs><g stroke-width="2.4" stroke-linecap="round" fill="none">${needles}</g>${berries}${balls.map(ball).join('')}</svg>`;
  })();
  const NV_SPRIG = (() => {
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const greens = ['#0a4a27', '#0f6334', '#16783f', '#1d8a4a'];
    let p = '';
    [[[10, 20], [100, 60]], [[14, 24], [70, 8]]].forEach(([a, b]) => {
      for (let i = 0; i <= 18; i++) {
        const t = i / 18, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        for (let n = 0; n < 4; n++) { const an = rnd() * 6.28, L = 7 + rnd() * 8; p += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(an) * L).toFixed(1)} ${(Math.sin(an) * L).toFixed(1)}" stroke="${greens[(i + n) % 4]}"/>`; }
      }
    });
    return cls => `<svg class="ltn-sprig ${cls}" viewBox="0 0 110 80" aria-hidden="true"><g stroke-width="2" stroke-linecap="round" fill="none">${p}</g><circle cx="22" cy="30" r="9" fill="url(#nvSr)"/><circle cx="38" cy="22" r="6" fill="#d7172b"/><circle cx="33" cy="32" r="5" fill="#ef3543"/><defs><radialGradient id="nvSr" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fffbe0"/><stop offset=".3" stop-color="#ffd968"/><stop offset=".7" stop-color="#cf9426"/><stop offset="1" stop-color="#5e3c06"/></radialGradient></defs></svg>`;
  })();
  const NV_BOW = '<svg class="ltn-bigbow" viewBox="0 0 120 62" aria-hidden="true"><defs><linearGradient id="nvBw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a66"/><stop offset=".6" stop-color="#c8102e"/><stop offset="1" stop-color="#7d0714"/></linearGradient></defs><path d="M60 30 C40 2 6 0 8 22 C9 38 34 40 60 30Z" fill="url(#nvBw)"/><path d="M60 30 C80 2 114 0 112 22 C111 38 86 40 60 30Z" fill="url(#nvBw)"/><path d="M54 34 L40 60 L48 56 L52 62 L58 36Z M66 34 L80 60 L72 56 L68 62 L62 36Z" fill="#a50d1d"/><path d="M22 14 C30 12 44 18 54 28" stroke="#ff9aa1" stroke-width="2" fill="none" opacity=".7"/><path d="M98 14 C90 12 76 18 66 28" stroke="#ff9aa1" stroke-width="2" fill="none" opacity=".7"/><rect x="50" y="22" width="20" height="18" rx="6" fill="#e2313b" stroke="#7d0714" stroke-width="1.5"/></svg>';

  function nvCountdown(now) {
    const y = now.getFullYear(), m = now.getMonth(), dd = now.getDate();
    if (m === 11 && dd === 25) return { msg: '¡Feliz Navidad!' };
    if (m === 0 && dd === 1) return { msg: '¡Feliz Año Nuevo!' };
    const toNY = m === 11 && dd > 25;
    const target = toNY ? new Date(y + 1, 0, 1) : new Date(y, 11, 25);
    const ms = Math.max(0, target - now);
    if (ms > 60 * 864e5) return { hide: true };
    return { label: toNY ? 'para Año Nuevo' : 'para Navidad', d: Math.floor(ms / 864e5), h: Math.floor(ms % 864e5 / 36e5), mi: Math.floor(ms % 36e5 / 6e4) };
  }
  function nvCountHtml(c) {
    if (c.hide) return '';
    if (c.msg) return `<span class="ltn-count-msg">${c.msg}</span>`;
    const box = (v, l) => `<span><b>${String(v).padStart(2, '0')}</b><small>${l}</small></span>`;
    return `<span>Faltan</span><span class="ltn-count-box">${box(c.d, c.d === 1 ? 'día' : 'días')}${box(c.h, 'horas')}${box(c.mi, 'min')}</span><span>${c.label}</span>`;
  }

  function nvPlanCard(ctx, p, i) {
    const inf = ctx.platformInfo(p.platform);
    const feats = p.features.length ? `<ul class="ltb-feats">${p.features.map(f => `<li>${ctx.esc(f)}</li>`).join('')}</ul>` : '';
    return `<article class="ltb-card ltn-card" data-rv data-lt-card style="--i:${i % 8}">` +
      `${p.badge ? `<span class="ltn-stamp">${ctx.esc(p.badge)}</span>` : ''}` +
      `<div class="ltb-card-top"><span class="ltn-lg">${logoHtml(ctx, p.platform, 'ltb-logo', p.imageUrl, ctx.planTitle(p))}</span><div class="ltb-meta"><h3 class="ltb-title">${ctx.esc(p.title || inf.name)}</h3><span class="ltb-type">${ctx.esc(ctx.typeLabel(p))}</span></div></div>` +
      `${feats}<div class="ltn-buyrow"><div class="ltn-pricetag">${priceHtml(ctx, p.price, p.oldPrice, p.period)}</div>${btn(ctx, planBuy(ctx, p), 'Comprar', 'ltb-buy', true)}</div></article>`;
  }
  function nvComboCard(ctx, c, i) {
    const names = c.platforms.map(x => ctx.platformInfo(x).name);
    return `<article class="ltb-card ltn-combo${c.badge ? ' ltn-hs' : ''}" data-rv data-lt-card style="--i:${i % 8}">` +
      `${c.badge ? `<span class="ltn-stamp">${ctx.esc(c.badge)}</span>` : ''}` +
      `<h3 class="ltb-title">${ctx.esc(c.name)}</h3>` +
      `<div class="ltb-logos">${c.platforms.map(x => logoHtml(ctx, x, 'ltb-logo')).join('')}</div>` +
      `<p class="ltb-incl">${ctx.esc(names.join(' + '))}</p>` +
      `<div class="ltn-cbuy"><div class="ltn-pricetag">${priceHtml(ctx, c.price, c.oldPrice, c.period)}</div>${btn(ctx, comboBuy(ctx, c), 'Pedir combo', 'ltb-buy', true)}</div></article>`;
  }
  /** Sección con panel crema, cinta de título y ramitas de pino en las esquinas. */
  const nvSec = (kind, title, body, green) => `<section class="ltb-sec ltb-sec-${kind}"><div class="ltb-wrap"><div class="ltn-panel${green ? ' ltn-panel-g' : ''}" data-rv>${NV_SPRIG('l')}${NV_SPRIG('r')}<h2 class="ltb-h2"><span class="ltn-rib">${title}</span></h2>${body}</div></div></section>`;

  function renderNavidad(root, d, ctx) {
    LC.injectCss('navidad', CSS_NAVIDAD);
    const cl = setup(root, ctx, d);
    // Con logo o portada se usa siempre la cabecera tipo perfil (portada ancha + logo redondo).
    const pm = !!(ctx.profileMode || d.coverUrl || d.logoUrl) && typeof ctx.profileHeader === 'function';
    if (pm) root.classList.add('ltb-pm');
    const { plans, combos } = visible(d, ctx);
    const wa = d.whatsapp ? ctx.buy('tus planes') : '';
    const pids = (ctx.platformIds || platformIds(plans, combos)).slice(0, 6);
    const bokeh = `<div class="ltn-bokeh" aria-hidden="true">${[[6, 30, 160, 9], [78, 22, 220, 11], [40, 70, 120, 8], [88, 66, 180, 10], [18, 82, 140, 12], [58, 40, 90, 7]].map(([x, y, s, t], k) => `<i style="--x:${x}%;--y:${y}%;--s:${s}px;--t:${t}s;--d:${-k}s"></i>`).join('')}</div>`;
    const coupons = [];
    if (ctx.minPrice) coupons.push(['Desde', ctx.minPrice, 'el mes']);
    if (pids.length) coupons.push(['Tenemos', String((ctx.platformIds || pids).length), 'apps']);
    coupons.push(['Atención', '24/7', 'WhatsApp']);
    const couponsHtml = `<ul class="ltn-coupons">${coupons.slice(0, 3).map((c, k) => `<li class="ltn-cp" style="--k:${k}"><span>${c[0] ? `<small>${ctx.esc(c[0])}</small>` : ''}<b>${ctx.esc(c[1])}</b><small>${ctx.esc(c[2])}</small></span></li>`).join('')}</ul>`;
    const art = (pids.length ? `<div class="ltn-show">${NV_BOW}<h3>Plataformas disponibles</h3><div class="ltn-tiles">${pids.map((p, k) => `<span class="ltn-tile" style="--k:${k}">${logoHtml(ctx, p, 'ltb-logo')}</span>`).join('')}</div>${ctx.minPrice ? `<p class="ltn-show-min">Desde <b>${ctx.esc(ctx.minPrice)}</b></p>` : ''}</div>` : '');
    const cd = nvCountdown(new Date());
    const html =
      (pm ? ctx.profileHeader() : `<div class="ltn-top">${header(ctx, d, wa)}</div>`) +
      `<section class="ltn-hero" data-lt-hero>${bokeh}<div class="ltn-snow" aria-hidden="true"></div><div class="ltn-snow3" aria-hidden="true"></div>${NV_GARLAND}` +
      `<div class="ltb-wrap ltn-hero-in"><div class="ltn-hero-txt">` +
      `<p class="ltn-script">${ctx.esc((!pm && d.tagline && d.tagline.length <= 22) ? d.tagline : 'Feliz Navidad')}</p>` +
      `<h1 class="ltb-h1">${ctx.esc(d.heroTitle || LC.DEFAULTS.heroTitle)}</h1><p class="ltb-sub">${ctx.esc(d.heroSubtitle || LC.DEFAULTS.heroSubtitle)}</p>` +
      couponsHtml +
      (cd.hide ? '' : `<div class="ltn-count" role="timer" aria-live="off">${nvCountHtml(cd)}</div>`) +
      `<div class="ltb-ctas">${heroCta(ctx, d, wa)}${plans.length && wa ? '<button type="button" class="ltb-btn ltb-ghost" data-goto="plans">Ver precios</button>' : ''}</div>` +
      `</div>${art}</div></section>` +
      (plans.length ? nvSec('plans', 'Regalos de Navidad', `<div class="ltb-grid">${plans.map((p, i) => nvPlanCard(ctx, p, i)).join('')}</div>`) : '') +
      (combos.length ? nvSec('combos', 'Combos navideños', `<div class="ltn-crow">${combos.map((c, i) => nvComboCard(ctx, c, i)).join('')}</div>`, true) : '') +
      (d.benefits.length ? nvSec('benefits', '¿Por qué con nosotros?', `<ul class="ltb-bens">${d.benefits.map((b, i) => `<li style="--i:${i}"><span class="ltb-bn" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span>${ctx.esc(b)}</span></li>`).join('')}</ul>`, true) : '') +
      (d.paymentMethods.length ? nvSec('pays', 'Paga como quieras', `<ul class="ltb-pays">${d.paymentMethods.map(p => `<li>${ctx.esc(p)}</li>`).join('')}</ul>`) : '') +
      (d.faq.length ? nvSec('faq', 'Preguntas frecuentes', `<div class="ltb-faq">${d.faq.map(f => `<details><summary>${ctx.esc(f.q)}</summary><p>${ctx.esc(f.a)}</p></details>`).join('')}</div>`, true) : '') +
      (d.links.length ? nvSec('links', 'Síguenos', `<div class="ltb-links">${d.links.map(l => `<a class="ltb-link" href="${ctx.esc(l.url)}" target="_blank" rel="noopener">${ctx.linkIcon(l.type)}<span>${ctx.esc(ctx.linkLabel(l))}</span></a>`).join('')}</div>`) : '') +
      footer(ctx, d, `<p class="ltn-felices">Felices fiestas</p>`) + fab(ctx, wa);
    root.innerHTML = html;
    const box = root.querySelector('.ltn-count');
    if (box && !cd.msg) {
      const t = G.setInterval(() => { box.innerHTML = nvCountHtml(nvCountdown(new Date())); }, 30000);
      cl.push(() => G.clearInterval(t));
    }
    reveal(root, ctx, cl);
  }

  LC.registerTemplate({
    id: 'navidad', name: 'Navidad', description: 'Roja elegante: guirnalda con esferas brillantes, dorado, cupones de precio y cuenta regresiva',
    tags: ['festiva', 'navidad', 'animada'], preview: { bg: '#b80f1f', fg: '#ffffff', accent: '#f2c75a' }, render: renderNavidad
  });
})(typeof window !== 'undefined' ? window : globalThis);
