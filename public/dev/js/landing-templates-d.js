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
  // NAVIDAD — noche con nieve, luces, regalos y bastones de caramelo
  // Dibujos 100% propios (SVG/CSS), sin imágenes externas.
  // =====================================================================
  const NV_FONT = 'ui-rounded,"SF Pro Rounded","Nunito","Varela Round","Arial Rounded MT Bold",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  const CANDY = 'repeating-linear-gradient(-45deg,#d7262f 0 9px,#fff 9px 18px)';
  const CSS_NAVIDAD = baseCss('navidad') + `
.lt-navidad{--nv-ink:#13213f;--nv-mut:#4a5878;--nv-red:#d7262f;--nv-red2:#a50f1a;--nv-green:#1f9a45;--nv-green2:#147233;--nv-gold:#ffcf4a;--nv-night:#0b1e4a;--nv-bg:#f3f8ff;background:var(--nv-bg);color:var(--nv-ink);font-family:${NV_FONT}}
.lt-navidad .ltb-h1,.lt-navidad .ltb-h2,.lt-navidad .ltb-title,.lt-navidad .ltb-price strong,.lt-navidad .ltb-brand b{font-weight:900;letter-spacing:-.02em}
/* ---- cabecera propia ---- */
.lt-navidad .ltn-top{background:var(--nv-night);color:#fff}
.lt-navidad .ltb-brand img,.lt-navidad .ltb-mono{border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px var(--nv-red)}
.lt-navidad .ltb-mono{background:var(--nv-red);color:#fff;font-size:20px}
.lt-navidad .ltb-headcta{display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#06301a;border-radius:999px;padding:8px 14px;font-weight:900;font-size:14px;text-decoration:none;box-shadow:0 4px 0 #128c4a}
.lt-navidad .ltb-headcta svg{width:18px;height:18px}
/* ---- luces ---- */
.lt-navidad .ltn-lights{position:absolute;left:0;right:0;top:0;height:38px;display:flex;overflow:hidden;z-index:3;pointer-events:none}
.lt-navidad .ltn-lights i{position:relative;flex:0 0 64px;height:38px}
.lt-navidad .ltn-lights i::before{content:"";position:absolute;left:0;right:0;top:-12px;height:24px;border-bottom:2px solid #2c6b3f;border-radius:0 0 50% 50%}
.lt-navidad .ltn-lights i::after{content:"";position:absolute;left:50%;top:13px;width:10px;height:16px;margin-left:-5px;border-radius:50% 50% 50% 50%/40% 40% 60% 60%;background:var(--c);box-shadow:0 0 10px 2px var(--c);animation:nv-twinkle 1.6s calc(var(--k) * -.4s) ease-in-out infinite alternate}
@keyframes nv-twinkle{from{opacity:1}to{opacity:.35}}
/* ---- hero: noche, luna, nieve, colinas ---- */
.lt-navidad .ltn-hero{position:relative;overflow:hidden;color:#fff;padding:64px 0 130px;background:radial-gradient(1.4px 1.4px at 30px 40px,#fff 50%,transparent 52%) 0 0/170px 130px,radial-gradient(1px 1px at 110px 90px,rgba(255,255,255,.8) 50%,transparent 52%) 0 0/170px 130px,linear-gradient(180deg,#081638 0%,#0f2f72 50%,#2468c9 100%)}
.lt-navidad.ltb-pm .ltn-hero{margin:16px 12px 0;border-radius:26px;padding:56px 0 120px}
@media (min-width:860px){.lt-navidad .ltn-hero{padding:84px 0 160px}}
.lt-navidad .ltn-moon{position:absolute;top:58px;right:7%;width:84px;height:84px;border-radius:50%;background:radial-gradient(circle at 38% 38%,#fffbe6,#ffe9a8 70%);box-shadow:0 0 50px 12px rgba(255,236,170,.35);z-index:0}
.lt-navidad .ltn-moon::after{content:"";position:absolute;width:18px;height:18px;border-radius:50%;background:rgba(214,190,120,.35);top:46px;left:20px;box-shadow:24px -18px 0 -4px rgba(214,190,120,.3)}
.lt-navidad .ltn-sleigh{position:absolute;top:70px;left:0;width:200px;height:56px;z-index:1;color:#0a1a40;opacity:.9;animation:nv-fly 17s 1.5s linear infinite;transform:translateX(-240px)}
@keyframes nv-fly{0%{transform:translate(-240px,30px)}50%{transform:translate(50vw,-6px)}100%{transform:translate(110vw,20px)}}
.lt-navidad .ltn-snow{position:absolute;left:0;right:0;top:-320px;bottom:0;pointer-events:none;z-index:2}
.lt-navidad .ltn-snow::before,.lt-navidad .ltn-snow::after{content:"";position:absolute;inset:0;will-change:transform}
.lt-navidad .ltn-snow::before{background-image:radial-gradient(2.4px 2.4px at 20px 30px,#fff 50%,transparent 55%),radial-gradient(2px 2px at 90px 140px,#fff 50%,transparent 55%),radial-gradient(3px 3px at 150px 70px,rgba(255,255,255,.9) 50%,transparent 55%),radial-gradient(1.8px 1.8px at 60px 190px,#fff 50%,transparent 55%),radial-gradient(2.6px 2.6px at 180px 220px,rgba(255,255,255,.85) 50%,transparent 55%);background-size:220px 240px;animation:nv-fall1 14s linear infinite}
.lt-navidad .ltn-snow::after{background-image:radial-gradient(4px 4px at 40px 60px,rgba(255,255,255,.95) 50%,transparent 56%),radial-gradient(3.4px 3.4px at 210px 200px,rgba(255,255,255,.8) 50%,transparent 56%),radial-gradient(5px 5px at 130px 270px,rgba(255,255,255,.7) 50%,transparent 56%);background-size:320px 320px;animation:nv-fall2 19s linear infinite}
@keyframes nv-fall1{from{transform:translate3d(0,0,0)}to{transform:translate3d(-30px,240px,0)}}
@keyframes nv-fall2{from{transform:translate3d(0,0,0)}to{transform:translate3d(40px,320px,0)}}
.lt-navidad .ltn-hills{position:absolute;left:0;right:0;bottom:-1px;width:100%;height:120px;z-index:2;display:block}
.lt-navidad .ltn-hero-in{position:relative;z-index:3;display:grid;gap:34px;align-items:center}
@media (min-width:860px){.lt-navidad .ltn-hero-in{grid-template-columns:1.1fr .9fr}}
.lt-navidad .ltn-kick{position:relative;display:inline-block;max-width:calc(100% - 28px);margin:0 14px;padding:8px 18px;background:linear-gradient(180deg,#e23540,var(--nv-red2));color:#fff;font-weight:900;font-size:14px;letter-spacing:.02em;border-radius:4px;box-shadow:0 6px 0 rgba(0,0,0,.18);overflow-wrap:anywhere}
.lt-navidad .ltn-kick::before,.lt-navidad .ltn-kick::after{content:"";position:absolute;top:8px;bottom:-6px;width:18px;background:#8a0c16;z-index:-1}
.lt-navidad .ltn-kick::before{left:-12px;clip-path:polygon(0 0,100% 0,100% 100%,0 100%,40% 50%)}
.lt-navidad .ltn-kick::after{right:-12px;clip-path:polygon(0 0,100% 0,60% 50%,100% 100%,0 100%)}
.lt-navidad .ltb-h1{position:relative;font-size:clamp(36px,9.6vw,74px);line-height:1.04;margin:22px 0 16px;color:#fff;text-shadow:0 4px 0 #0b3b8c,0 12px 28px rgba(0,0,0,.35);overflow-wrap:anywhere;animation:nv-drop .9s cubic-bezier(.3,1.4,.5,1) both}
.lt-navidad .ltn-gold{color:var(--nv-gold)}
.lt-navidad .ltb-h1::before{content:"";position:absolute;left:-6px;top:-.16em;width:min(100%,11em);height:.36em;background:radial-gradient(circle at 12px 2px,#fff 9px,transparent 10px) 0 4px/22px 18px repeat-x,linear-gradient(#fff,#fff) 0 0/100% 8px no-repeat;border-radius:10px;filter:drop-shadow(0 2px 0 rgba(10,40,100,.25));opacity:.95;pointer-events:none}
@keyframes nv-drop{from{opacity:0;transform:translateY(-24px) scale(.96)}to{opacity:1;transform:none}}
.lt-navidad .ltb-sub{font-size:clamp(16px,4.2vw,20px);max-width:560px;margin:0 0 22px;font-weight:600;color:#dbe8ff}
.lt-navidad .ltb-from{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);color:#fff;font-weight:700}
.lt-navidad .ltb-fl{border:2px solid #fff}
.lt-navidad .ltn-count{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin:0 0 24px;font-weight:800;color:#fff}
.lt-navidad .ltn-count-box{display:flex;gap:6px}
.lt-navidad .ltn-count-box span{display:grid;place-items:center;min-width:58px;padding:6px 8px 5px;border-radius:12px;background:#fff;color:var(--nv-red);line-height:1;box-shadow:0 5px 0 #c5d6f2}
.lt-navidad .ltn-count-box b{font-size:24px;font-weight:900}
.lt-navidad .ltn-count-box small{font-size:11px;color:var(--nv-mut);font-weight:800;margin-top:3px}
.lt-navidad .ltn-count-msg{font-size:22px;font-weight:900;color:var(--nv-gold)}
.lt-navidad .ltb-ctas{display:flex;flex-wrap:wrap;gap:14px}
/* ---- botones tipo caramelo ---- */
.lt-navidad .ltb-btn{border-radius:999px;font-size:17px;font-weight:900;color:#fff;background:linear-gradient(180deg,#2fbf55,var(--nv-green));box-shadow:0 5px 0 var(--nv-green2),0 10px 18px rgba(20,114,51,.3);border:0;transition:transform .25s cubic-bezier(.3,1.8,.5,1),box-shadow .15s;text-shadow:0 1px 0 rgba(0,0,0,.2)}
.lt-navidad .ltb-btn:hover{transform:translateY(-2px) scale(1.03)}
.lt-navidad .ltb-btn:active{transform:translateY(4px);box-shadow:0 1px 0 var(--nv-green2)}
.lt-navidad .ltb-cta{font-size:19px;min-height:60px;padding:14px 30px;animation:nv-jingle 3s 1.4s ease-in-out 3}
.lt-navidad .ltb-cta svg{animation:nv-bell 3s 1.4s ease-in-out 3;transform-origin:50% 10%}
.lt-navidad .ltb-ghost{background:transparent;border:2px solid rgba(255,255,255,.7);box-shadow:none}
@keyframes nv-jingle{0%,30%,100%{rotate:0deg}6%{rotate:-3deg}12%{rotate:3deg}18%{rotate:-2deg}24%{rotate:1deg}}
@keyframes nv-bell{0%,30%,100%{transform:rotate(0)}8%{transform:rotate(-18deg)}16%{transform:rotate(16deg)}24%{transform:rotate(-8deg)}}
/* ---- árbol con logos como esferas ---- */
.lt-navidad .ltn-tree{position:relative;width:100%;max-width:340px;justify-self:center;aspect-ratio:5/6}
.lt-navidad .ltn-tree svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.lt-navidad .ltn-star{transform-origin:50% 50%;transform-box:fill-box;animation:nv-star 3s ease-in-out infinite alternate}
@keyframes nv-star{from{transform:scale(.92) rotate(-6deg)}to{transform:scale(1.08) rotate(6deg)}}
.lt-navidad .ltn-orn{position:absolute;left:var(--x);top:var(--y);width:var(--s,17%);aspect-ratio:1;margin-left:calc(var(--s,17%) / -2);border-radius:50%;padding:3px;background:#fff;box-shadow:0 6px 14px rgba(0,0,0,.35),0 0 0 3px var(--ring,#ffcf4a);transform-origin:50% -30%;animation:nv-swing 3.4s calc(var(--k) * -.6s) ease-in-out infinite alternate}
.lt-navidad .ltn-orn::before{content:"";position:absolute;left:50%;top:-9px;width:12px;height:9px;margin-left:-6px;border-radius:3px 3px 0 0;background:#c9a23a}
.lt-navidad .ltn-orn .ltb-logo{width:100%;height:100%;border-radius:50%;font-size:18px}
@keyframes nv-swing{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}
.lt-navidad .ltn-frame{position:relative;margin:18px 0 0;justify-self:center;max-width:500px;width:calc(100% - 16px);background:#fff;padding:10px;border-radius:20px;box-shadow:0 18px 40px rgba(0,0,0,.35);rotate:-2.5deg}
.lt-navidad .ltn-frame img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px}
.lt-navidad .ltn-frame::before{content:"";position:absolute;inset:0;margin:auto;width:20px;background:linear-gradient(90deg,#b5121c,#e2313b,#b5121c);opacity:.92;border-radius:2px}
.lt-navidad .ltn-frame::after{content:"";position:absolute;top:-10px;left:-10px;right:-10px;height:22px;background:radial-gradient(circle at 12px 4px,#fff 10px,transparent 11px) 0 4px/22px 20px repeat-x,linear-gradient(#fff,#fff) 0 0/100% 10px no-repeat;border-radius:12px;filter:drop-shadow(0 2px 1px rgba(0,0,0,.15))}
.lt-navidad .ltn-frame .ltn-bow{top:calc(50% - 10px);left:50%}
/* ---- moño ---- */
.lt-navidad .ltn-bow{position:absolute;z-index:2;width:18px;height:16px;margin-left:-9px;border-radius:5px;background:linear-gradient(180deg,#ffe38a,#e0a92c);box-shadow:0 2px 0 #b4821d}
.lt-navidad .ltn-bow::before,.lt-navidad .ltn-bow::after{content:"";position:absolute;top:-9px;width:30px;height:22px;border:7px solid #f5c443;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;box-sizing:border-box}
.lt-navidad .ltn-bow::before{right:12px;rotate:-24deg}
.lt-navidad .ltn-bow::after{left:12px;rotate:24deg}
/* ---- títulos con cinta ---- */
.lt-navidad .ltb-h2{text-align:center}
.lt-navidad .ltn-rib{position:relative;display:inline-block;max-width:calc(100% - 40px);padding:12px 26px;background:linear-gradient(180deg,#e23540,var(--nv-red2));color:#fff;font-size:clamp(22px,5.6vw,34px);border-radius:6px;box-shadow:0 8px 0 rgba(120,8,18,.25);overflow-wrap:anywhere}
.lt-navidad .ltn-rib::before,.lt-navidad .ltn-rib::after{content:"";position:absolute;top:12px;bottom:-10px;width:26px;background:#8a0c16;z-index:-1}
.lt-navidad .ltn-rib::before{left:-18px;clip-path:polygon(0 0,100% 0,100% 100%,0 100%,40% 50%)}
.lt-navidad .ltn-rib::after{right:-18px;clip-path:polygon(0 0,100% 0,60% 50%,100% 100%,0 100%)}
.lt-navidad .ltn-rib i{font-style:normal;margin-right:8px}
/* ---- planes: cajas de regalo ---- */
.lt-navidad .ltb-sec-plans{background:radial-gradient(2px 2px at 16px 16px,#cfe0fa 50%,transparent 55%) 0 0/44px 44px}
.lt-navidad .ltb-grid{gap:40px 24px}
.lt-navidad .ltn-gift{gap:0;padding:0;margin-top:14px;transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.lt-navidad .ltn-lid{position:relative;height:58px;margin:0 -5px;border-radius:14px 14px 6px 6px;background:linear-gradient(180deg,#e6353f,#b5121c);box-shadow:0 6px 0 rgba(120,8,18,.25);transition:transform .45s cubic-bezier(.3,1.8,.5,1);z-index:1}
.lt-navidad .ltn-lid::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:22px;margin-left:-11px;background:linear-gradient(90deg,#e0a92c,#ffe38a,#e0a92c)}
.lt-navidad .ltn-lid::after{content:"";position:absolute;top:-8px;left:-3px;right:-3px;height:20px;background:radial-gradient(circle at 12px 4px,#fff 9px,transparent 10px) 0 4px/22px 18px repeat-x,linear-gradient(#fff,#fff) 0 0/100% 8px no-repeat;border-radius:10px;filter:drop-shadow(0 2px 0 rgba(10,40,100,.12))}
.lt-navidad .ltn-lid .ltn-bow{top:-18px;left:50%}
.lt-navidad .ltn-tag{position:absolute;left:12px;top:22px;z-index:3;max-width:calc(50% - 26px);padding:3px 9px;border-radius:999px;background:#fff;color:var(--nv-red);font-size:11px;font-weight:900;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 0 rgba(0,0,0,.15)}
.lt-navidad .ltn-body{display:flex;flex-direction:column;gap:14px;flex:1;padding:20px 18px 18px;border:6px solid transparent;border-top:0;border-radius:0 0 18px 18px;background:linear-gradient(#fff,#fff) padding-box,${CANDY} border-box;box-shadow:0 18px 30px rgba(19,33,63,.12)}
.lt-navidad .ltn-gift:hover .ltn-lid,.lt-navidad .ltn-gift:focus-within .ltn-lid{transform:translateY(-10px) rotate(-4deg)}
.lt-navidad .ltn-gift:hover{transform:translateY(-3px)}
.lt-navidad .ltb-logo{border:3px solid #fff;box-shadow:0 4px 12px rgba(19,33,63,.22)}
.lt-navidad .ltb-type{color:var(--nv-green2)}
.lt-navidad .ltb-price strong{font-size:38px;color:var(--nv-red)}
.lt-navidad .ltb-old{color:var(--nv-mut);font-weight:700}
.lt-navidad .ltb-per{color:var(--nv-mut);font-weight:700}
.lt-navidad .ltb-feats{color:var(--nv-mut);font-weight:600}
.lt-navidad .ltb-feats li::before{content:"❄";flex:none;color:#3a7bd5;font-size:14px;line-height:1.4}
/* ---- combos: fondo rojo nevado ---- */
.lt-navidad .ltb-sec-combos{background:radial-gradient(2.4px 2.4px at 20px 24px,rgba(255,255,255,.55) 50%,transparent 55%) 0 0/60px 60px,radial-gradient(1.6px 1.6px at 48px 50px,rgba(255,255,255,.4) 50%,transparent 55%) 0 0/60px 60px,linear-gradient(180deg,#c51722,#8f0c16);color:#fff;padding-top:84px}
.lt-navidad .ltb-sec-combos::before{content:"";position:absolute;top:-1px;left:0;right:0;height:30px;background:radial-gradient(circle at 18px 6px,var(--nv-bg) 15px,transparent 16px) 0 0/34px 26px repeat-x,linear-gradient(var(--nv-bg),var(--nv-bg)) 0 0/100% 6px no-repeat}
.lt-navidad .ltb-sec-combos .ltn-rib{background:linear-gradient(180deg,#2fbf55,var(--nv-green2));box-shadow:0 8px 0 rgba(0,0,0,.2)}
.lt-navidad .ltb-sec-combos .ltn-rib::before,.lt-navidad .ltb-sec-combos .ltn-rib::after{background:#0d5a26}
.lt-navidad .ltn-combo{color:var(--nv-ink);padding:26px 20px 20px;border:7px solid transparent;border-radius:22px;background:linear-gradient(#fff,#fff) padding-box,repeating-linear-gradient(45deg,var(--nv-green) 0 8px,#fff 8px 13px,var(--nv-red) 13px 21px,#fff 21px 26px) border-box;box-shadow:0 16px 32px rgba(60,0,8,.35)}
.lt-navidad .ltn-holly{position:absolute;top:-22px;left:-16px;width:74px;height:54px;z-index:2;pointer-events:none}
.lt-navidad .ltn-combo .ltn-cbadge{position:absolute;top:-16px;right:14px;max-width:62%;padding:5px 12px;border-radius:8px;background:var(--nv-gold);color:#5a3a00;font-weight:900;font-size:12px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 3px 0 #c9971d;animation:nv-jingle 3.2s 1s ease-in-out 2}
.lt-navidad .ltn-combo .ltb-title{font-size:24px;padding-left:34px}
.lt-navidad .ltn-combo .ltb-logos{gap:0}
.lt-navidad .ltn-combo .ltb-logos .ltb-logo{margin-right:-10px;border-radius:50%;transition:transform .3s cubic-bezier(.3,1.8,.5,1)}
.lt-navidad .ltn-combo:hover .ltb-logos .ltb-logo{transform:translateY(-5px)}
.lt-navidad .ltn-combo .ltb-incl{color:var(--nv-mut);font-weight:700}
/* ---- beneficios: esferas ---- */
.lt-navidad .ltb-bens li{background:#fff;border-radius:18px;padding:14px 16px;font-weight:800;box-shadow:0 10px 22px rgba(19,33,63,.1)}
.lt-navidad .ltb-bn{position:relative;flex:none;display:grid;place-items:center;width:42px;height:42px;margin-top:6px;border-radius:50%;color:#fff;font-weight:900;font-size:14px;background:radial-gradient(circle at 34% 30%,#ff8a8f,var(--nv-red) 45%,var(--nv-red2))}
.lt-navidad .ltb-bens li:nth-child(3n+2) .ltb-bn{background:radial-gradient(circle at 34% 30%,#8fe0a6,var(--nv-green) 45%,var(--nv-green2))}
.lt-navidad .ltb-bens li:nth-child(3n) .ltb-bn{background:radial-gradient(circle at 34% 30%,#fff1b8,#f0b72c 45%,#c98d0e);color:#4a3000}
.lt-navidad .ltb-bn::before{content:"";position:absolute;top:-7px;left:50%;width:12px;height:8px;margin-left:-6px;border-radius:3px 3px 0 0;background:#c9a23a}
/* ---- pagos, FAQ, enlaces ---- */
.lt-navidad .ltb-pays{justify-content:center}
.lt-navidad .ltb-pays li{padding:9px 18px;border-radius:999px;font-weight:900;border:4px solid transparent;background:linear-gradient(#fff,#fff) padding-box,${CANDY} border-box}
.lt-navidad .ltb-faq{margin:0 auto}
.lt-navidad .ltb-faq details{background:#fff;border-radius:18px;box-shadow:0 10px 22px rgba(19,33,63,.1);border-left:6px solid var(--nv-green)}
.lt-navidad .ltb-faq details:nth-child(2n){border-left-color:var(--nv-red)}
.lt-navidad .ltb-faq summary{font-weight:900}
.lt-navidad .ltb-faq p{color:var(--nv-mut);font-weight:600}
.lt-navidad .ltb-link{background:#fff;border-radius:999px;box-shadow:0 6px 0 #d4e2f7;font-weight:900;color:var(--nv-ink)}
.lt-navidad .ltb-link:hover{transform:translateY(-2px)}
.lt-navidad .ltb-link svg{color:var(--nv-red)}
/* ---- pie ---- */
.lt-navidad .ltb-foot{position:relative;background:var(--nv-night);color:#cfdcf5;padding-top:70px;margin-top:40px}
.lt-navidad .ltb-foot::before{content:"";position:absolute;top:-1px;left:0;right:0;height:30px;background:radial-gradient(circle at 18px 6px,var(--nv-bg) 15px,transparent 16px) 0 0/34px 26px repeat-x,linear-gradient(var(--nv-bg),var(--nv-bg)) 0 0/100% 6px no-repeat}
.lt-navidad .ltn-felices{font-size:24px;font-weight:900;color:#fff;margin:0 0 10px!important}
.lt-navidad .ltn-snowman{width:70px;height:84px;margin:0 auto 6px;display:block}
.lt-navidad .ltb-made a{color:var(--nv-gold);font-weight:900}
.lt-navidad .ltb-fab{box-shadow:0 8px 20px rgba(0,0,0,.3)}
.lt-navidad .ltb-fab::after{content:"";position:absolute;top:-14px;right:-6px;width:30px;height:26px;background:var(--nv-red);clip-path:polygon(10% 100%,90% 100%,70% 20%,45% 0);rotate:18deg;filter:drop-shadow(0 4px 0 #fff)}
/* ---- cabecera tipo perfil ---- */
.lt-navidad .ltp{color:var(--nv-ink)}
.lt-navidad .ltp-avatar{background:#fff}
.lt-navidad .ltp-ring{background:${CANDY}}
.lt-navidad .ltp-tag{color:var(--nv-mut);opacity:1;font-weight:700}
.lt-navidad.lt-light-profile .ltp-social{background:#fff;color:var(--nv-red);box-shadow:0 4px 0 #d4e2f7}
/* ---- móvil ---- */
@media (max-width:859px){.lt-navidad .ltn-tree{max-width:250px}.lt-navidad .ltn-moon{width:56px;height:56px;top:50px;right:5%}.lt-navidad .ltn-sleigh{width:150px;top:58px}}
@media (max-width:480px){.lt-navidad .ltn-snow::after{display:none}.lt-navidad .ltb-headcta span{display:none}.lt-navidad .ltb-headcta{padding:8px}.lt-navidad .ltn-count-box span{min-width:52px}}
/* niveles de animación */
.lt-navidad[data-lt-motion="calm"] .ltn-sleigh{display:none}
.lt-navidad .ltn-snow3{display:none}
.lt-navidad[data-lt-motion="max"] .ltn-snow3{display:block;position:absolute;inset:-260px 0 0;pointer-events:none;z-index:2;background-image:radial-gradient(6px 6px at 70px 80px,rgba(255,255,255,.95) 50%,transparent 56%),radial-gradient(5px 5px at 230px 190px,rgba(255,255,255,.85) 50%,transparent 56%);background-size:300px 260px;animation:nv-fall3 9s linear infinite}
@keyframes nv-fall3{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50px,260px,0)}}
.lt-navidad.ltb-rm .ltn-sleigh{display:none}
@media (prefers-reduced-motion:reduce){.lt-navidad .ltn-sleigh{display:none}}
`;

  const NV_LIGHTS = ['#ff4d5a', '#ffd23f', '#3ee07a', '#4db8ff', '#ff8af0'];
  const nvLights = () => `<div class="ltn-lights" aria-hidden="true">${Array.from({ length: 30 }, (_, k) => `<i style="--c:${NV_LIGHTS[k % NV_LIGHTS.length]};--k:${k % 7}"></i>`).join('')}</div>`;
  const NV_HILLS = '<svg class="ltn-hills" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70 C 180 20 360 30 520 62 C 700 96 860 30 1040 40 C 1200 50 1320 80 1440 58 L1440 120 L0 120 Z" fill="#cfe1fb"/><path d="M0 92 C 200 60 380 100 600 84 C 820 68 980 108 1200 88 C 1300 80 1380 86 1440 92 L1440 120 L0 120 Z" fill="var(--nv-bg)"/></svg>';
  const NV_SLEIGH = '<svg class="ltn-sleigh" viewBox="0 0 200 56" aria-hidden="true" fill="currentColor"><path d="M8 34 h44 c6 0 9-4 11-10 l3-8 h5 l-4 14 c-2 8-7 12-15 12 H12 c-4 0-6-3-4-8z"/><path d="M4 46 h58 c5 0 8-2 10-6" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="30" cy="18" r="5"/><path d="M22 28 c0-7 4-10 8-10 s8 3 8 10z"/><path d="M26 14 l6-8 3 7z"/><path d="M66 22 L112 26 M66 24 L160 26" stroke="currentColor" stroke-width="1.2" fill="none"/><g><ellipse cx="124" cy="30" rx="15" ry="6.5"/><path d="M134 27 l6-10 4 1-5 11z"/><circle cx="143" cy="16" r="4.2"/><path d="M142 12 l-3-7 M141 9 l-4-2 M145 12 l2-8 M146 8 l4-2" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M114 34 l-5 12 M120 35 l-1 12 M130 35 l3 12 M136 33 l7 10" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></g><g><ellipse cx="170" cy="28" rx="15" ry="6.5"/><path d="M180 25 l6-10 4 1-5 11z"/><circle cx="189" cy="14" r="4.2"/><path d="M188 10 l-3-7 M187 7 l-4-2 M191 10 l2-8 M192 6 l4-2" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M160 32 l-6 11 M166 33 l-2 12 M176 33 l4 11 M182 31 l7 9" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></g></svg>';
  const NV_TREE = '<svg viewBox="0 0 100 120" aria-hidden="true"><defs><linearGradient id="nvT" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2fae58"/><stop offset="1" stop-color="#11602d"/></linearGradient></defs><rect x="44" y="98" width="12" height="14" rx="2" fill="#7a4a24"/><path d="M50 14 L76 48 H64 L84 74 H70 L92 102 H8 L30 74 H16 L36 48 H24 Z" fill="url(#nvT)"/><path d="M28 50 Q50 58 72 46 M20 76 Q50 86 80 72" stroke="#ffcf4a" stroke-width="1.6" fill="none" stroke-dasharray="1 3.2" stroke-linecap="round"/><path d="M50 30 L76 48 H64 Z M50 30 L84 74 H70 Z" fill="rgba(255,255,255,.07)"/><rect x="4" y="100" width="22" height="16" rx="2" fill="#d7262f"/><rect x="13" y="100" width="4" height="16" fill="#ffcf4a"/><rect x="74" y="102" width="22" height="14" rx="2" fill="#3a7bd5"/><rect x="83" y="102" width="4" height="14" fill="#fff"/><rect x="58" y="106" width="16" height="10" rx="2" fill="#ffcf4a"/><g class="ltn-star"><path d="M50 2 l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L50 20.6l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2Z" fill="#ffd94a" stroke="#fff3b0" stroke-width=".8"/></g></svg>';
  const NV_HOLLY = '<svg class="ltn-holly" viewBox="0 0 74 54" aria-hidden="true"><path d="M8 30 C14 18 26 12 38 20 C34 22 33 26 35 29 C30 28 27 31 27 35 C23 32 19 33 16 37 C15 33 12 31 8 30Z" fill="#1f9a45"/><path d="M66 26 C58 14 46 12 36 22 C40 23 41 27 40 30 C44 28 48 30 48 34 C52 31 56 32 59 35 C59 31 62 28 66 26Z" fill="#147233"/><circle cx="34" cy="28" r="6" fill="#d7262f"/><circle cx="42" cy="33" r="5.5" fill="#e6353f"/><circle cx="31" cy="37" r="5" fill="#b5121c"/><circle cx="32" cy="26" r="1.8" fill="#fff" opacity=".7"/></svg>';
  const NV_SNOWMAN = '<svg class="ltn-snowman" viewBox="0 0 70 84" aria-hidden="true"><circle cx="35" cy="60" r="20" fill="#fff"/><circle cx="35" cy="30" r="14" fill="#fff"/><path d="M21 22 h28 v4 H21z" fill="#13213f"/><path d="M25 22 V8 h20 v14z" fill="#13213f"/><rect x="25" y="16" width="20" height="3" fill="#d7262f"/><circle cx="30" cy="29" r="1.8" fill="#13213f"/><circle cx="40" cy="29" r="1.8" fill="#13213f"/><path d="M35 32 l9 3 -9 1z" fill="#ff8a2a"/><path d="M22 41 h26 l-3 6 H25z" fill="#d7262f"/><path d="M42 44 l6 12 -5 1z" fill="#d7262f"/><circle cx="35" cy="56" r="1.8" fill="#13213f"/><circle cx="35" cy="64" r="1.8" fill="#13213f"/></svg>';

  /** Cuenta regresiva a Navidad (o Año Nuevo después del 25). */
  function nvCountdown(now) {
    const y = now.getFullYear(), m = now.getMonth(), dd = now.getDate();
    if (m === 11 && dd === 25) return { msg: '¡Feliz Navidad! 🎄' };
    if (m === 0 && dd === 1) return { msg: '¡Feliz Año Nuevo! 🎆' };
    const toNY = m === 11 && dd > 25;
    const target = toNY ? new Date(y + 1, 0, 1) : new Date(y, 11, 25);
    const ms = Math.max(0, target - now);
    if (ms > 60 * 864e5) return { hide: true }; // lejos de las fiestas: no se muestra
    return { label: toNY ? 'para Año Nuevo' : 'para Navidad', d: Math.floor(ms / 864e5), h: Math.floor(ms % 864e5 / 36e5), mi: Math.floor(ms % 36e5 / 6e4) };
  }
  function nvCountHtml(c) {
    if (c.hide) return '';
    if (c.msg) return `<span class="ltn-count-msg">${c.msg}</span>`;
    const box = (v, l) => `<span><b>${String(v).padStart(2, '0')}</b><small>${l}</small></span>`;
    return `<span class="ltn-count-box">${box(c.d, c.d === 1 ? 'día' : 'días')}${box(c.h, 'horas')}${box(c.mi, 'min')}</span><span>${c.label} 🎄</span>`;
  }

  function nvPlanCard(ctx, p, i) {
    const inf = ctx.platformInfo(p.platform);
    const tt = p.title || inf.name;
    const feats = p.features.length ? `<ul class="ltb-feats">${p.features.map(f => `<li>${ctx.esc(f)}</li>`).join('')}</ul>` : '';
    return `<article class="ltb-card ltn-gift" data-rv data-lt-card style="--i:${i % 8}">` +
      `<div class="ltn-lid" aria-hidden="true"><span class="ltn-bow"></span></div>` +
      `${p.badge ? `<span class="ltn-tag">${ctx.esc(p.badge)}</span>` : ''}` +
      `<div class="ltn-body"><div class="ltb-card-top">${logoHtml(ctx, p.platform, 'ltb-logo', p.imageUrl, ctx.planTitle(p))}<div class="ltb-meta"><h3 class="ltb-title">${ctx.esc(tt)}</h3><span class="ltb-type">${ctx.esc(ctx.typeLabel(p))}</span></div></div>` +
      `${priceHtml(ctx, p.price, p.oldPrice, p.period)}${feats}${btn(ctx, planBuy(ctx, p), 'Lo quiero', 'ltb-buy', true)}</div></article>`;
  }
  function nvComboCard(ctx, c, i) {
    const names = c.platforms.map(x => ctx.platformInfo(x).name);
    return `<article class="ltb-card ltn-combo" data-rv data-lt-card style="--i:${i % 8}">${NV_HOLLY}` +
      `${c.badge ? `<span class="ltn-cbadge">${ctx.esc(c.badge)}</span>` : ''}` +
      `<h3 class="ltb-title">${ctx.esc(c.name)}</h3>` +
      `<div class="ltb-logos">${c.platforms.map(x => logoHtml(ctx, x, 'ltb-logo')).join('')}</div>` +
      `<p class="ltb-incl">${ctx.esc(names.join(' + '))}</p>` +
      `${priceHtml(ctx, c.price, c.oldPrice, c.period)}${btn(ctx, comboBuy(ctx, c), 'Pedir combo', 'ltb-buy', true)}</article>`;
  }
  const nvTitle = (icon, t) => `<span class="ltn-rib"><i aria-hidden="true">${icon}</i>${t}</span>`;

  function renderNavidad(root, d, ctx) {
    LC.injectCss('navidad', CSS_NAVIDAD);
    const cl = setup(root, ctx, d);
    const { plans, combos } = visible(d, ctx);
    const wa = d.whatsapp ? ctx.buy('tus planes') : '';
    const title = d.heroTitle || LC.DEFAULTS.heroTitle;
    const words = title.split(/\s+/).filter(Boolean);
    const last = words.pop() || '';
    const h1 = `${ctx.esc(words.join(' '))} <span class="ltn-gold">${ctx.esc(last)}</span>`;
    const pids = (ctx.platformIds || platformIds(plans, combos)).slice(0, 6);
    const SPOTS = [[50, 27, 15], [35, 46, 15], [65, 45, 15], [27, 66, 16], [50, 63, 16], [73, 67, 16]];
    const RINGS = ['#ffcf4a', '#ff4d5a', '#3ee07a', '#4db8ff', '#ffcf4a', '#ff8af0'];
    const art = d.coverUrl && !ctx.profileMode
      ? `<figure class="ltn-frame"><img src="${ctx.esc(d.coverUrl)}" alt="" decoding="async" fetchpriority="high"><span class="ltn-bow" aria-hidden="true"></span></figure>`
      : `<div class="ltn-tree" aria-hidden="true">${NV_TREE}${pids.map((p, k) => `<span class="ltn-orn" style="--x:${SPOTS[k][0]}%;--y:${SPOTS[k][1]}%;--s:${SPOTS[k][2]}%;--k:${k};--ring:${RINGS[k]}">${logoHtml(ctx, p, 'ltb-logo')}</span>`).join('')}</div>`;
    if (ctx.profileMode) root.classList.add('lt-light-profile');
    const cd = nvCountdown(new Date());
    const html =
      (ctx.profileMode && typeof ctx.profileHeader === 'function' ? ctx.profileHeader() : `<div class="ltn-top">${header(ctx, d, wa)}</div>`) +
      `<section class="ltn-hero" data-lt-hero>${nvLights()}<span class="ltn-moon" aria-hidden="true"></span>${ctx.motion === 'calm' ? '' : NV_SLEIGH}<div class="ltn-snow" aria-hidden="true"></div><div class="ltn-snow3" aria-hidden="true"></div>${NV_HILLS}` +
      `<div class="ltb-wrap ltn-hero-in"><div class="ltn-hero-txt">` +
      `<span class="ltn-kick">${ctx.esc((!ctx.profileMode && d.tagline) || '¡Especial de Navidad!')}</span>` +
      `<h1 class="ltb-h1">${h1}</h1><p class="ltb-sub">${ctx.esc(d.heroSubtitle || LC.DEFAULTS.heroSubtitle)}</p>` +
      (cd.hide ? '' : `<div class="ltn-count" role="timer" aria-live="off">${nvCountHtml(cd)}</div>`) + fromChip(ctx) +
      `<div class="ltb-ctas">${heroCta(ctx, d, wa)}${plans.length && wa ? '<button type="button" class="ltb-btn ltb-ghost" data-goto="plans">Ver regalos</button>' : ''}</div>` +
      `</div>${art}</div></section>` +
      (plans.length ? sec('plans', nvTitle('🎁', 'Elige tu regalo'), `<div class="ltb-grid">${plans.map((p, i) => nvPlanCard(ctx, p, i)).join('')}</div>`) : '') +
      (combos.length ? sec('combos', nvTitle('🎄', 'Combos navideños'), `<div class="ltb-grid">${combos.map((c, i) => nvComboCard(ctx, c, i)).join('')}</div>`) : '') +
      benefitsSec(ctx, d, nvTitle('⭐', '¿Por qué con nosotros?')) +
      paysSec(ctx, d, nvTitle('🔔', 'Paga como quieras')) +
      faqSec(ctx, d, nvTitle('❄', 'Preguntas frecuentes')) +
      linksSec(ctx, d, nvTitle('✨', 'Síguenos')) +
      footer(ctx, d, `${NV_SNOWMAN}<p class="ltn-felices">¡Felices fiestas!</p>`) + fab(ctx, wa);
    root.innerHTML = html;
    // Cuenta regresiva: se actualiza cada 30 s (se limpia en el siguiente render).
    const box = root.querySelector('.ltn-count');
    if (box && !cd.msg && !cd.hide) {
      const t = G.setInterval(() => { box.innerHTML = nvCountHtml(nvCountdown(new Date())); }, 30000);
      cl.push(() => G.clearInterval(t));
    }
    reveal(root, ctx, cl);
  }

  LC.registerTemplate({
    id: 'navidad', name: 'Navidad', description: 'Noche nevada con luces, árbol, regalos y cuenta regresiva a Navidad',
    tags: ['festiva', 'navidad', 'animada'], preview: { bg: '#0f2f72', fg: '#ffffff', accent: '#d7262f' }, render: renderNavidad
  });
})(typeof window !== 'undefined' ? window : globalThis);
