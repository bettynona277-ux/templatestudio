/* Diseños Streaming · Plantillas de landing (grupo B): pop, premium, kinetic
 * Requiere js/landing-core.js (window.LandingCore). Sin dependencias.
 * Todo el CSS va prefijado con .lt-pop / .lt-premium / .lt-kinetic y las
 * clases internas usan el prefijo ltb- para no chocar con el editor.
 */
(function (G) {
  'use strict';
  const LC = G.LandingCore;
  if (!LC) { if (G.console) G.console.warn('landing-templates-b: falta LandingCore'); return; }

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
  // 1) POP — colorida, stickers con sombra dura, formas flotando
  // =====================================================================
  const CSS_POP = baseCss('pop') + `
.lt-pop{--pp-ink:#1b1530;--pp-bg:#fff8ee;--pp-yel:#ffd23f;--pp-pink:#ff7ac0;--pp-mint:#5ee6b0;background:var(--pp-bg);color:var(--pp-ink);font-family:ui-rounded,"SF Pro Rounded","Nunito","Varela Round","Arial Rounded MT Bold",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.lt-pop .ltb-brand b{font-weight:900;font-size:20px;letter-spacing:-.01em}
.lt-pop .ltb-brand img,.lt-pop .ltb-mono{border:3px solid var(--pp-ink);box-shadow:3px 3px 0 var(--pp-ink)}
.lt-pop .ltb-mono{background:var(--lt-primary);color:var(--ltb-on-p);font-size:20px;rotate:-6deg}
.lt-pop .ltb-headcta{display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#0c2a17;border:3px solid var(--pp-ink);border-radius:999px;padding:7px 14px;font-weight:900;font-size:14px;text-decoration:none;box-shadow:3px 3px 0 var(--pp-ink);transition:transform .25s cubic-bezier(.3,1.8,.5,1)}
.lt-pop .ltb-headcta:hover{transform:scale(1.07) rotate(-2deg)}
.lt-pop .ltb-headcta svg{width:18px;height:18px}
.lt-pop .ltb-hero{position:relative;overflow:hidden;padding:26px 0 76px}
.lt-pop .ltb-hero-in{position:relative;z-index:2;display:grid;gap:40px;align-items:center}
@media (min-width:860px){.lt-pop .ltb-hero-in{grid-template-columns:1.15fr .85fr}.lt-pop .ltb-hero{padding:48px 0 104px}}
.lt-pop .ltb-kicker{display:inline-block;background:var(--pp-yel);border:3px solid var(--pp-ink);border-radius:999px;padding:6px 14px;font-weight:900;font-size:14px;box-shadow:3px 3px 0 var(--pp-ink);rotate:-3deg;max-width:100%;overflow-wrap:anywhere}
.lt-pop .ltb-h1{font-size:clamp(36px,10vw,78px);line-height:1.02;margin:20px 0 16px;font-weight:900;letter-spacing:-.03em;overflow-wrap:anywhere;animation:pp-pop .8s cubic-bezier(.3,1.5,.5,1) both}
.lt-pop .ltb-hl{position:relative;display:inline-block;z-index:0}
.lt-pop .ltb-hl::before{content:"";position:absolute;left:-.08em;right:-.08em;bottom:.02em;height:.4em;background:var(--lt-accent);border-radius:.18em;z-index:-1;rotate:-2deg;transform-origin:left center;animation:pp-mark .7s .55s cubic-bezier(.3,1.4,.5,1) both}
.lt-pop .ltb-sub{font-size:clamp(16px,4.3vw,20px);max-width:560px;margin:0 0 28px;font-weight:600;color:#3d3556}
.lt-pop .ltb-ctas{display:flex;flex-wrap:wrap;gap:16px}
.lt-pop .ltb-from{background:#fff;border:3px solid var(--pp-ink);box-shadow:3px 3px 0 var(--pp-ink);font-weight:800}
.lt-pop .ltb-fl{border:2px solid var(--pp-ink)}
.lt-pop .ltb-btn{border:3px solid var(--pp-ink);border-radius:999px;font-size:17px;font-weight:900;box-shadow:5px 5px 0 var(--pp-ink);transition:transform .3s cubic-bezier(.3,1.8,.5,1),box-shadow .15s;background:#fff;color:var(--pp-ink)}
.lt-pop .ltb-btn:hover{transform:translateY(-3px) scale(1.04) rotate(-1deg)}
.lt-pop .ltb-btn:active{transform:translate(4px,4px);box-shadow:1px 1px 0 var(--pp-ink)}
.lt-pop .ltb-cta,.lt-pop .ltb-buy{background:var(--lt-primary);color:var(--ltb-on-p)}
.lt-pop .ltb-cta{font-size:19px;min-height:60px;padding:14px 28px;animation:pp-bounce 2.8s 1.2s ease-in-out 3}
.lt-pop .ltb-shapes{position:absolute;inset:0;z-index:0;pointer-events:none}
.lt-pop .ltb-s{position:absolute;display:block;border:3px solid var(--pp-ink);animation:pp-float 7s ease-in-out infinite alternate}
.lt-pop .ltb-s-c1{width:92px;height:92px;border-radius:50%;background:var(--lt-primary);top:5%;right:-30px;animation-duration:8s}
.lt-pop .ltb-s-c2{width:44px;height:44px;border-radius:50%;background:var(--pp-yel);bottom:9%;left:5%;animation-duration:5.5s}
.lt-pop .ltb-s-st,.lt-pop .ltb-s-st2{border:0;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);animation:pp-spin 16s linear infinite}
.lt-pop .ltb-s-st{width:62px;height:62px;background:var(--pp-yel);bottom:30%;right:5%}
.lt-pop .ltb-s-st2{width:34px;height:34px;background:var(--lt-accent);top:16%;left:52%;animation-duration:11s;animation-direction:reverse}
.lt-pop .ltb-s-pl{width:120px;height:40px;border-radius:999px;background:var(--lt-accent);top:1%;left:-40px;rotate:-18deg}
.lt-pop .ltb-s-pl2{width:84px;height:30px;border-radius:999px;background:var(--pp-pink);bottom:3%;right:32%;rotate:24deg;animation-duration:6s}
.lt-pop .ltb-s-rg{width:74px;height:74px;border-radius:50%;background:transparent;border:11px solid var(--pp-pink);top:44%;left:-34px;animation-duration:9s}
.lt-pop .ltb-s-tr{width:56px;height:48px;border:0;background:var(--pp-mint);clip-path:polygon(50% 0,100% 100%,0 100%);top:62%;right:-8px;animation-duration:6.5s}
.lt-pop .ltb-s-dot{width:150px;height:150px;border:0;background:radial-gradient(var(--pp-ink) 2px,transparent 2.6px) 0 0/16px 16px;opacity:.14;top:26%;right:18%;animation:none}
@keyframes pp-float{from{transform:translateY(0) rotate(0)}to{transform:translateY(-24px) rotate(12deg)}}
@keyframes pp-spin{to{transform:rotate(360deg)}}
@keyframes pp-pop{from{opacity:0;transform:scale(.7) rotate(-4deg)}to{opacity:1;transform:none}}
@keyframes pp-mark{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes pp-bounce{0%,100%,40%{translate:0 0}10%{translate:0 -9px}20%{translate:0 0}28%{translate:0 -4px}}
@keyframes pp-wiggle{0%,78%,100%{transform:rotate(0)}84%{transform:rotate(-9deg)}90%{transform:rotate(8deg)}95%{transform:rotate(-3deg)}}
.lt-pop .ltb-cover{margin:0;position:relative;border:4px solid var(--pp-ink);border-radius:26px;box-shadow:10px 10px 0 var(--lt-primary),10px 10px 0 3px var(--pp-ink);rotate:3deg;background:#fff;max-width:520px;width:calc(100% - 14px);justify-self:center;transition:rotate .5s cubic-bezier(.3,1.7,.5,1)}
.lt-pop .ltb-cover:hover{rotate:0deg}
.lt-pop .ltb-cover img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:22px}
.lt-pop .ltb-cover::before{content:"";position:absolute;top:-17px;left:50%;width:110px;height:30px;margin-left:-55px;background:rgba(255,210,63,.9);border:2px solid var(--pp-ink);rotate:-5deg;z-index:1}
.lt-pop .ltb-stickers{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:380px;width:100%;justify-self:center;padding:8px}
.lt-pop .ltb-stk{display:block;background:#fff;border:3px solid var(--pp-ink);border-radius:24px;padding:9px;box-shadow:5px 5px 0 var(--pp-ink);rotate:calc((var(--i) - 2.5) * 4deg);animation:pp-float 4.2s calc(var(--i) * -.7s) ease-in-out infinite alternate}
.lt-pop .ltb-stk .ltb-logo{width:100%;height:auto;aspect-ratio:1;border-radius:16px;border:0;font-size:30px}
.lt-pop .ltb-h2{font-weight:900;letter-spacing:-.025em}
.lt-pop .ltb-h2::after{content:"";display:block;width:76px;height:12px;margin-top:12px;border-radius:999px;background:var(--lt-accent);border:3px solid var(--pp-ink)}
.lt-pop .ltb-sec-plans{background:radial-gradient(rgba(27,21,48,.13) 1.5px,transparent 2px) 0 0/22px 22px}
.lt-pop .ltb-grid{gap:32px 24px}
.lt-pop .ltb-card{--rot:-1.6deg;background:#fff;border:3px solid var(--pp-ink);border-radius:24px;padding:22px 20px 20px;box-shadow:7px 7px 0 var(--pp-ink);rotate:var(--rot);transition:rotate .45s cubic-bezier(.3,1.7,.5,1),transform .45s cubic-bezier(.3,1.7,.5,1),box-shadow .2s}
.lt-pop .ltb-card:nth-child(2n){--rot:1.4deg}
.lt-pop .ltb-card:nth-child(3n){--rot:-.7deg}
.lt-pop .ltb-card:hover,.lt-pop .ltb-card:focus-within,.lt-pop .ltb-card:active{rotate:0deg;transform:translateY(-6px);box-shadow:10px 12px 0 var(--lt-primary),10px 12px 0 3px var(--pp-ink)}
.lt-pop .ltb-logo{border:3px solid var(--pp-ink)}
.lt-pop .ltb-title{font-weight:900;font-size:19px}
.lt-pop .ltb-type{display:inline-block;margin-top:5px;background:var(--pp-mint);border:2px solid var(--pp-ink);border-radius:999px;padding:1px 9px;font-size:11px;font-weight:900}
.lt-pop .ltb-price strong{font-weight:900;font-size:40px;letter-spacing:-.02em}
.lt-pop .ltb-old{color:#c8103f;font-weight:800}
.lt-pop .ltb-per{font-weight:700}
.lt-pop .ltb-feats{font-weight:600}
.lt-pop .ltb-feats li::before{content:"✓";flex:none;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--lt-accent);color:var(--ltb-on-a);border:2px solid var(--pp-ink);font-size:11px;font-weight:900;line-height:1}
.lt-pop .ltb-badge{position:absolute;z-index:2;top:-17px;right:14px;max-width:70%;background:var(--pp-pink);color:var(--pp-ink);border:3px solid var(--pp-ink);border-radius:12px;padding:4px 10px;font-weight:900;font-size:12px;text-transform:uppercase;rotate:5deg;box-shadow:3px 3px 0 var(--pp-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:pp-wiggle 3s ease-in-out 2}
.lt-pop .ltb-sec-combos{background:var(--lt-primary);color:var(--ltb-on-p);border-top:4px solid var(--pp-ink);border-bottom:4px solid var(--pp-ink);overflow:hidden}
.lt-pop .ltb-sec-combos::before{content:"";position:absolute;inset:0;background:radial-gradient(rgba(255,255,255,.22) 2px,transparent 2.6px) 0 0/26px 26px;pointer-events:none}
.lt-pop .ltb-combo{background:var(--pp-yel);color:var(--pp-ink)}
.lt-pop .ltb-combo:nth-child(2n){background:#ffd0ea}
.lt-pop .ltb-combo:nth-child(3n){background:#c9f7e3}
.lt-pop .ltb-combo .ltb-title{font-size:25px;padding-right:10px}
.lt-pop .ltb-combo .ltb-logos{gap:0;padding-left:2px}
.lt-pop .ltb-combo .ltb-logos .ltb-logo{margin-right:-10px;box-shadow:2px 2px 0 var(--pp-ink);border-radius:28%;transition:transform .3s cubic-bezier(.3,1.8,.5,1)}
.lt-pop .ltb-combo:hover .ltb-logos .ltb-logo{transform:translateY(-4px) rotate(-8deg)}
.lt-pop .ltb-incl{font-weight:700}
.lt-pop .ltb-bens li{background:#fff;border:3px solid var(--pp-ink);border-radius:18px;padding:14px 16px;font-weight:800;box-shadow:4px 4px 0 var(--pp-ink)}
.lt-pop .ltb-bens li:nth-child(2n){rotate:1deg}
.lt-pop .ltb-bens li:nth-child(2n+1){rotate:-1deg}
.lt-pop .ltb-bn{flex:none;display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--lt-primary);color:var(--ltb-on-p);border:3px solid var(--pp-ink);font-weight:900;font-size:14px}
.lt-pop .ltb-pays li{background:#fff;border:3px solid var(--pp-ink);border-radius:999px;padding:8px 18px;font-weight:900;box-shadow:3px 3px 0 var(--pp-ink)}
.lt-pop .ltb-pays li:nth-child(3n+1){background:var(--pp-yel)}
.lt-pop .ltb-pays li:nth-child(3n+2){background:#c9f7e3}
.lt-pop .ltb-faq details{background:#fff;border:3px solid var(--pp-ink);border-radius:18px;box-shadow:4px 4px 0 var(--pp-ink)}
.lt-pop .ltb-faq summary{font-weight:900}
.lt-pop .ltb-faq p{color:#3d3556;font-weight:600}
.lt-pop .ltb-sec-links{background:var(--pp-yel);border-top:4px solid var(--pp-ink)}
.lt-pop .ltb-sec-links .ltb-h2{text-align:center}
.lt-pop .ltb-sec-links .ltb-h2::after{margin-left:auto;margin-right:auto}
.lt-pop .ltb-link{background:#fff;border:3px solid var(--pp-ink);border-radius:999px;box-shadow:4px 4px 0 var(--pp-ink);font-weight:900;transition:transform .3s cubic-bezier(.3,1.8,.5,1)}
.lt-pop .ltb-link:hover{transform:translateY(-3px) rotate(-2deg)}
.lt-pop .ltb-link svg{color:var(--pp-ink)}
.lt-pop .ltb-foot{border-top:4px solid var(--pp-ink);background:var(--pp-bg);font-weight:700}
.lt-pop .ltb-made a{font-weight:900;text-decoration-thickness:3px;text-decoration-color:var(--lt-accent)}
.lt-pop .ltb-fab{border:3px solid var(--pp-ink);box-shadow:4px 4px 0 var(--pp-ink)}
.lt-pop .ltb-fab svg{animation:pp-wiggle 3s 2s ease-in-out 3}
@media (max-width:480px){.lt-pop .ltb-s:not(.ltb-s-c1):not(.ltb-s-st){animation:none}.lt-pop .ltb-stk{animation:none}}
/* cabecera tipo perfil: estilo sticker */
.lt-pop .ltb-hero.ltb-hero-p{padding-top:14px}
.lt-pop .ltp{color:var(--pp-ink)}
.lt-pop .ltp-cover{margin:12px 12px 0;border:3px solid var(--pp-ink);border-radius:24px;box-shadow:6px 6px 0 var(--pp-ink)}
.lt-pop .ltp-shade{background:linear-gradient(180deg,transparent 60%,rgba(27,21,48,.25))}
.lt-pop .ltp-avatar{box-shadow:5px 5px 0 var(--pp-ink);background:var(--pp-ink)}
.lt-pop .ltp-ring{inset:3px}
.lt-pop.lt-light-profile .ltp-avatar-in{border:3px solid var(--pp-ink);background:var(--lt-primary)}
.lt-pop .ltp-initial{color:var(--ltb-on-p)}
.lt-pop .ltp-name{font-weight:900;letter-spacing:-.02em}
.lt-pop .ltp-check{color:var(--lt-primary)}
.lt-pop .ltp-tag{font-weight:700;opacity:1;color:#3d3556}
.lt-pop .ltp-meta{font-weight:700;opacity:.85}
.lt-pop .ltp-btn{border:3px solid var(--pp-ink);box-shadow:4px 4px 0 var(--pp-ink);color:#0c2a17}
.lt-pop.lt-light-profile .ltp-social{background:#fff;border:3px solid var(--pp-ink);box-shadow:3px 3px 0 var(--pp-ink);color:var(--pp-ink)}
/* nivel 'max': confeti de formas al cargar */
.lt-pop .ltb-confetti{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden}
.lt-pop .ltb-confetti i{position:absolute;top:-30px;left:var(--x);width:var(--w,12px);height:var(--h,12px);background:var(--c);border:2px solid var(--pp-ink);border-radius:var(--br,2px);opacity:0;animation:pp-conf var(--t,2.8s) var(--d,0s) cubic-bezier(.25,.6,.45,1) forwards}
.lt-pop .ltb-confetti i.st{border:0;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
@keyframes pp-conf{0%{opacity:1;transform:translate3d(0,0,0) rotate(0)}80%{opacity:1}100%{opacity:0;transform:translate3d(var(--dx,0),680px,0) rotate(var(--r,540deg))}}
@media (max-width:420px){.lt-pop .ltb-s-c1{width:64px;height:64px}.lt-pop .ltb-s-st2,.lt-pop .ltb-s-dot{display:none}.lt-pop .ltb-headcta span{display:none}.lt-pop .ltb-headcta{padding:8px}}
`;

  function renderPop(root, d, ctx) {
    LC.injectCss('pop', CSS_POP);
    const cl = setup(root, ctx, d);
    const { plans, combos } = visible(d, ctx);
    const wa = d.whatsapp ? ctx.buy('tus planes') : '';
    const title = d.heroTitle || LC.DEFAULTS.heroTitle;
    const words = title.split(/\s+/).filter(Boolean);
    const last = words.pop() || '';
    const h1 = `${ctx.esc(words.join(' '))} <span class="ltb-hl">${ctx.esc(last)}</span>`;
    const shapes = `<div class="ltb-shapes" aria-hidden="true">${['c1', 'c2', 'st', 'st2', 'pl', 'pl2', 'rg', 'tr', 'dot'].map(s => `<i class="ltb-s ltb-s-${s}"></i>`).join('')}</div>`;
    const pids = platformIds(plans, combos).slice(0, 6);
    const art = d.coverUrl && !ctx.profileMode
      ? `<figure class="ltb-cover"><img src="${ctx.esc(d.coverUrl)}" alt="" decoding="async" fetchpriority="high"></figure>`
      : (pids.length ? `<div class="ltb-stickers" aria-hidden="true">${pids.map((p, i) => `<span class="ltb-stk" style="--i:${i}">${logoHtml(ctx, p, 'ltb-logo')}</span>`).join('')}</div>` : '');
    // Confeti (solo 'max'): CSS puro, una sola vez; desaparece con el siguiente render.
    let confetti = '';
    if (ctx.motion === 'max') {
      const cols = [safeColor(d.theme.primary), safeColor(d.theme.accent), '#ffd23f', '#ff7ac0', '#5ee6b0'];
      let bits = '';
      for (let i = 0; i < 22; i++) {
        const k = i % 4;
        const size = k === 1 ? '--w:16px;--h:8px' : k === 2 ? '--w:12px;--h:12px;--br:50%' : k === 3 ? '--w:18px;--h:18px' : '--w:10px;--h:14px';
        bits += `<i${k === 3 ? ' class="st"' : ''} style="--x:${(i * 4.6 + (i % 3) * 7) % 100}%;--c:${cols[i % cols.length]};${size};--d:${((i * 0.11) % 1.2).toFixed(2)}s;--t:${(2.4 + (i % 5) * 0.25).toFixed(2)}s;--dx:${(i % 2 ? 1 : -1) * (20 + (i * 13) % 70)}px;--r:${(i % 2 ? 1 : -1) * (360 + (i * 47) % 360)}deg"></i>`;
      }
      confetti = `<div class="ltb-confetti" aria-hidden="true">${bits}</div>`;
    }
    if (ctx.profileMode) root.classList.add('lt-light-profile');
    const html =
      top(ctx, d, wa) +
      `<section class="ltb-hero${ctx.profileMode ? ' ltb-hero-p' : ''}" data-lt-hero>${shapes}${confetti}<div class="ltb-wrap ltb-hero-in"><div class="ltb-hero-txt">` +
      `<span class="ltb-kicker">${ctx.esc((!ctx.profileMode && d.tagline) || '¡Activación inmediata!')}</span>` +
      `<h1 class="ltb-h1">${h1}</h1><p class="ltb-sub">${ctx.esc(d.heroSubtitle || LC.DEFAULTS.heroSubtitle)}</p>` + fromChip(ctx) +
      `<div class="ltb-ctas">${heroCta(ctx, d, wa)}${plans.length && wa ? '<button type="button" class="ltb-btn ltb-ghost" data-goto="plans">Ver precios</button>' : ''}</div>` +
      `</div>${art}</div></section>` +
      (plans.length ? sec('plans', 'Elige tu plataforma', `<div class="ltb-grid">${plans.map((p, i) => planCard(ctx, p, i)).join('')}</div>`) : '') +
      (combos.length ? sec('combos', 'Combos que convienen', `<div class="ltb-grid">${combos.map((c, i) => comboCard(ctx, c, i)).join('')}</div>`) : '') +
      benefitsSec(ctx, d, '¿Por qué con nosotros?') +
      paysSec(ctx, d, 'Paga como quieras') +
      faqSec(ctx, d, 'Preguntas frecuentes') +
      linksSec(ctx, d, 'Síguenos') +
      footer(ctx, d) + fab(ctx, wa);
    root.innerHTML = html;
    reveal(root, ctx, cl);
  }

  // =====================================================================
  // 2) PREMIUM — oscuro elegante, dorado, serif, brillo, tabla y membresías
  // =====================================================================
  const PR_SERIF = '"Didot","Bodoni 72","Bodoni MT","Playfair Display","Cormorant Garamond","Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif';
  const CSS_PREMIUM = baseCss('premium') + `
.lt-premium{--pr-bg:#0b0a08;--pr-gold:#d9b46a;--pr-gold2:#f4e2b0;--pr-grad:linear-gradient(135deg,#f6e6b8,#d9b46a 55%,#b0863b);--pr-line:rgba(217,180,106,.24);--pr-txt:#f1ebdd;--pr-mut:#b5ab95;background:var(--pr-bg);color:var(--pr-txt);font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
.lt-premium .ltb-h1,.lt-premium .ltb-h2,.lt-premium .ltb-title,.lt-premium .ltb-price strong,.lt-premium .ltb-brand b,.lt-premium .ltb-bn,.lt-premium .ltb-tprice b,.lt-premium .ltb-faq summary{font-family:${PR_SERIF};font-weight:400}
.lt-premium .ltb-head{max-width:none;margin:0;padding:16px max(18px,calc((100% - 1084px) / 2));border-bottom:1px solid var(--pr-line)}
.lt-premium .ltb-brand b{font-size:22px;letter-spacing:.02em}
.lt-premium .ltb-brand img,.lt-premium .ltb-mono{border-radius:50%;border:1px solid var(--pr-gold)}
.lt-premium .ltb-mono{background:transparent;color:var(--pr-gold);font-family:${PR_SERIF};font-weight:400;font-size:21px}
.lt-premium .ltb-headcta{display:inline-flex;align-items:center;gap:8px;color:var(--pr-gold2);border:1px solid var(--pr-line);border-radius:999px;padding:9px 16px;text-decoration:none;font-size:12px;letter-spacing:.16em;text-transform:uppercase;transition:border-color .4s,background .4s}
.lt-premium .ltb-headcta:hover{border-color:var(--pr-gold);background:rgba(217,180,106,.08)}
.lt-premium .ltb-headcta svg{width:16px;height:16px}
.lt-premium .ltb-hero{position:relative;overflow:hidden;isolation:isolate;min-height:min(86vh,780px);display:grid;align-items:center;text-align:center;padding:76px 0 92px}
.lt-premium .ltb-hero-bg{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.lt-premium .ltb-hero-bg img{width:100%;height:100%;object-fit:cover;opacity:.55}
.lt-premium .ltb-hero-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,10,8,.5),rgba(11,10,8,.78) 62%,#0b0a08)}
.lt-premium .ltb-aura{position:absolute;width:150%;height:150%;left:-25%;top:-25%;background:radial-gradient(closest-side at 30% 34%,rgba(217,180,106,.26),transparent 72%);animation:pr-aura 18s ease-in-out infinite alternate}
.lt-premium .ltb-aura2{position:absolute;width:120%;height:120%;left:-10%;top:-10%;background:radial-gradient(closest-side at 72% 64%,var(--lt-primary),transparent 70%);opacity:.22;animation:pr-aura 22s ease-in-out infinite alternate-reverse}
.lt-premium .ltb-lines{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 79px,rgba(217,180,106,.08) 79px 80px);-webkit-mask-image:linear-gradient(180deg,transparent,#000 30%,#000 70%,transparent);mask-image:linear-gradient(180deg,transparent,#000 30%,#000 70%,transparent)}
@keyframes pr-aura{from{transform:translate3d(-4%,-3%,0) scale(1)}to{transform:translate3d(4%,3%,0) scale(1.1)}}
.lt-premium .ltb-hero-txt>*{animation:pr-fade 1.1s cubic-bezier(.2,.7,.2,1) both}
.lt-premium .ltb-hero-txt>:nth-child(2){animation-delay:.15s}
.lt-premium .ltb-hero-txt>:nth-child(4){animation-delay:.45s}
.lt-premium .ltb-hero-txt>:nth-child(5){animation-delay:.6s}
.lt-premium .ltb-hero-txt>:nth-child(6){animation-delay:.72s}
.lt-premium .ltb-from{border:1px solid var(--pr-line);color:var(--pr-mut);letter-spacing:.06em;background:rgba(217,180,106,.06);margin:-12px 0 28px}
.lt-premium .ltb-from b{font-family:${PR_SERIF};font-weight:400;font-size:1.4em;color:var(--pr-gold2);letter-spacing:0}
.lt-premium .ltb-fl{box-shadow:0 0 0 2px var(--pr-bg)}
@media (max-width:540px){.lt-premium .ltb-tcap,.lt-premium .ltb-tablewrap{display:none}}
.lt-premium .ltb-hero-txt .ltb-rule{animation:pr-draw 1.4s .35s cubic-bezier(.2,.7,.2,1) both}
@keyframes pr-fade{from{opacity:0;translate:0 20px}to{opacity:1;translate:0 0}}
@keyframes pr-draw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.lt-premium .ltb-eyebrow{display:inline-flex;align-items:center;gap:14px;color:var(--pr-gold);font-size:12px;letter-spacing:.32em;text-transform:uppercase;max-width:100%;overflow-wrap:anywhere}
.lt-premium .ltb-eyebrow::before,.lt-premium .ltb-eyebrow::after{content:"";width:32px;height:1px;background:var(--pr-gold);flex:none}
.lt-premium .ltb-h1{font-size:clamp(40px,10.5vw,106px);line-height:1.03;margin:22px auto 20px;max-width:15ch;letter-spacing:-.012em;overflow-wrap:anywhere}
.lt-premium .ltb-h1 em{font-style:italic;color:var(--pr-gold2)}
.lt-premium .ltb-rule{display:block;width:140px;height:1px;margin:0 auto 24px;background:linear-gradient(90deg,transparent,var(--pr-gold),transparent)}
.lt-premium .ltb-sub{color:var(--pr-mut);font-size:clamp(16px,4vw,19px);max-width:560px;margin:0 auto 36px;line-height:1.7}
.lt-premium .ltb-ctas{display:flex;flex-wrap:wrap;gap:14px;justify-content:center}
.lt-premium .ltb-btn{border-radius:999px;font-size:13px;letter-spacing:.16em;text-transform:uppercase;font-weight:600;border:1px solid var(--pr-gold);color:var(--pr-gold2);background:transparent;position:relative;overflow:hidden;transition:background .4s,color .4s,transform .4s}
.lt-premium .ltb-btn:hover{background:rgba(217,180,106,.12);transform:translateY(-2px)}
.lt-premium .ltb-btn svg{width:18px;height:18px}
.lt-premium .ltb-cta,.lt-premium .ltb-cta:hover,.lt-premium .ltb-buy,.lt-premium .ltb-buy:hover{background:var(--pr-grad);color:#1b1407;border-color:transparent}
.lt-premium .ltb-cta{padding:14px 30px;min-height:54px}
.lt-premium .ltb-cta::before,.lt-premium .ltb-card::after{content:"";position:absolute;top:-50%;left:-70%;width:45%;height:200%;background:linear-gradient(90deg,transparent,rgba(255,250,230,.55),transparent);transform:translateX(0) rotate(18deg);animation:pr-shine 5.5s 1.4s ease-in-out infinite;pointer-events:none}
.lt-premium .ltb-card::after{background:linear-gradient(90deg,transparent,rgba(244,226,176,.12),transparent);animation-duration:7s;animation-delay:calc(var(--i,0) * .8s + 1s)}
@keyframes pr-shine{0%{transform:translateX(0) rotate(18deg)}38%,100%{transform:translateX(480%) rotate(18deg)}}
.lt-premium .ltb-sec{padding:80px 0}
.lt-premium .ltb-h2{font-size:clamp(32px,7.5vw,56px);text-align:center;margin-bottom:44px;line-height:1.08}
.lt-premium .ltb-h2 small{display:block;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:var(--pr-gold);margin-bottom:14px}
.lt-premium .ltb-h2 small::after{content:"";display:block;width:1px;height:26px;margin:12px auto 0;background:linear-gradient(var(--pr-gold),transparent)}
.lt-premium .ltb-grid{gap:24px}
.lt-premium .ltb-card{background:linear-gradient(180deg,#17140f,#0f0d0a);border:1px solid var(--pr-line);border-radius:20px;padding:28px 24px 24px;overflow:hidden;transition:border-color .5s,transform .5s cubic-bezier(.2,.7,.2,1)}
.lt-premium .ltb-card:hover{border-color:var(--pr-gold);transform:translateY(-5px)}
.lt-premium .ltb-card::before{content:"";position:absolute;left:24px;right:24px;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--pc,var(--pr-gold)),transparent)}
.lt-premium .ltb-logo{border-radius:28%;width:54px;height:54px;box-shadow:0 0 0 1px var(--pr-line),0 0 0 6px rgba(217,180,106,.06)}
.lt-premium .ltb-title{font-size:23px;line-height:1.15}
.lt-premium .ltb-type{color:var(--pr-gold);letter-spacing:.2em;font-weight:500;font-size:12px}
.lt-premium .ltb-price{padding:16px 0;border-top:1px solid var(--pr-line);border-bottom:1px solid var(--pr-line)}
.lt-premium .ltb-price strong{font-size:44px;color:var(--pr-gold2)}
.lt-premium .ltb-old,.lt-premium .ltb-per{color:var(--pr-mut)}
.lt-premium .ltb-feats{color:#ddd5c3}
.lt-premium .ltb-feats li::before{content:"";flex:none;width:14px;height:1px;background:var(--pr-gold);margin-top:.78em}
.lt-premium .ltb-badge{align-self:flex-start;max-width:100%;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#1b1407;background:var(--pr-grad);border-radius:999px;padding:5px 12px;font-weight:700;overflow-wrap:anywhere;font-size:12px;letter-spacing:.18em}
.lt-premium .ltb-tablewrap{margin-top:64px;overflow-x:auto;border:1px solid var(--pr-line);border-radius:20px;background:#0f0d0a}
.lt-premium .ltb-tcap{text-align:center;color:var(--pr-gold);font-size:11px;letter-spacing:.34em;text-transform:uppercase;margin:64px 0 0}
.lt-premium .ltb-tcap+.ltb-tablewrap{margin-top:18px}
.lt-premium .ltb-table{width:100%;border-collapse:collapse;font-size:15px}
.lt-premium .ltb-table th,.lt-premium .ltb-table td{padding:15px 18px;text-align:left;border-bottom:1px solid var(--pr-line);vertical-align:middle;font-weight:400}
.lt-premium .ltb-table thead th{font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;color:var(--pr-gold);font-weight:500}
.lt-premium .ltb-table tbody tr:last-child>*{border-bottom:0}
.lt-premium .ltb-table tbody tr{transition:background .3s}
.lt-premium .ltb-table tbody tr:hover{background:rgba(217,180,106,.06)}
.lt-premium .ltb-tp{display:flex;align-items:center;gap:12px;min-width:0}
.lt-premium .ltb-tp b{display:block;font-weight:600;overflow-wrap:anywhere}
.lt-premium .ltb-tp small{display:block;color:var(--pr-mut);font-size:12px}
.lt-premium .ltb-table .ltb-logo{width:34px;height:34px;font-size:15px;box-shadow:0 0 0 1px var(--pr-line)}
.lt-premium .ltb-tright{text-align:right!important;white-space:nowrap}
.lt-premium .ltb-tprice s{display:block;color:var(--pr-mut);font-size:12px}
.lt-premium .ltb-tprice b{color:var(--pr-gold2);font-size:21px}
.lt-premium .ltb-tbuy{display:inline-block;color:var(--pr-gold2);text-decoration:none;border-bottom:1px solid var(--pr-gold);font-size:11px;letter-spacing:.18em;text-transform:uppercase;white-space:nowrap;padding:8px 0 4px}
@media (max-width:540px){.lt-premium .ltb-hide-s{display:none}.lt-premium .ltb-table th,.lt-premium .ltb-table td{padding:12px 10px}.lt-premium .ltb-table{font-size:14px}}
.lt-premium .ltb-sec-combos{background:radial-gradient(ellipse at 50% 0,rgba(217,180,106,.1),transparent 60%)}
.lt-premium .ltb-combo{text-align:center;align-items:center;padding:38px 24px 28px}
.lt-premium .ltb-roman{font-size:11px;letter-spacing:.36em;text-transform:uppercase;color:var(--pr-gold)}
.lt-premium .ltb-combo .ltb-badge{align-self:center}
.lt-premium .ltb-combo .ltb-title{font-size:32px}
.lt-premium .ltb-combo .ltb-logos{justify-content:center}
.lt-premium .ltb-combo .ltb-logo{width:40px;height:40px;font-size:16px}
.lt-premium .ltb-incl{color:var(--pr-mut)}
.lt-premium .ltb-combo .ltb-price{justify-content:center;width:100%}
.lt-premium .ltb-combo.is-feat{border-color:var(--pr-gold);background:radial-gradient(ellipse at 50% 0,rgba(217,180,106,.2),transparent 65%),linear-gradient(180deg,#1b170f,#0f0d0a)}
.lt-premium .ltb-bens{gap:0 32px}
.lt-premium .ltb-bens li{border-top:1px solid var(--pr-line);padding:20px 0;gap:18px;color:#e6dfcf}
.lt-premium .ltb-bn{flex:none;color:var(--pr-gold);font-size:30px;line-height:1;min-width:44px}
.lt-premium .ltb-pays{justify-content:center}
.lt-premium .ltb-pays li{border:1px solid var(--pr-line);border-radius:999px;padding:9px 20px;letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:var(--pr-gold2)}
.lt-premium .ltb-faq{margin:0 auto;gap:0}
.lt-premium .ltb-faq details{border-bottom:1px solid var(--pr-line)}
.lt-premium .ltb-faq summary{font-size:20px;padding:20px 46px 20px 4px}
.lt-premium .ltb-faq summary::after{color:var(--pr-gold);font-family:system-ui,sans-serif;font-weight:300}
.lt-premium .ltb-faq p{color:var(--pr-mut);padding:0 4px 20px;line-height:1.7}
.lt-premium .ltb-link{border:1px solid var(--pr-line);border-radius:999px;color:var(--pr-txt);font-weight:500;letter-spacing:.06em;transition:border-color .4s,background .4s}
.lt-premium .ltb-link:hover{border-color:var(--pr-gold);background:rgba(217,180,106,.08)}
.lt-premium .ltb-link svg{color:var(--pr-gold)}
.lt-premium .ltb-foot{border-top:1px solid var(--pr-line);color:var(--pr-mut);letter-spacing:.06em}
.lt-premium .ltb-made a{color:var(--pr-gold2);text-decoration:none;border-bottom:1px solid var(--pr-gold)}
.lt-premium .ltb-fab{box-shadow:0 0 0 1px var(--pr-gold),0 12px 30px rgba(0,0,0,.5)}
@media (max-width:420px){.lt-premium .ltb-headcta span{display:none}.lt-premium .ltb-headcta{padding:9px}}
/* cabecera tipo perfil: serif y dorado */
.lt-premium .ltb-hero.ltb-hero-p{min-height:0;padding:56px 0 76px}
.lt-premium .ltp-cover{border-radius:0 0 18px 18px;box-shadow:inset 0 -1px 0 var(--pr-gold)}
.lt-premium .ltp-ring{background:conic-gradient(from 0deg,#f6e6b8,#d9b46a,#8a6526,#d9b46a,#f6e6b8)}
.lt-premium .ltp-avatar-in{border-color:var(--pr-bg);background:#14110c}
.lt-premium .ltp-initial{font-family:${PR_SERIF};font-weight:400;color:var(--pr-gold2)}
.lt-premium .ltp-name{font-family:${PR_SERIF};font-weight:400;letter-spacing:.01em;color:var(--pr-txt)}
.lt-premium .ltp-check{color:var(--pr-gold)}
.lt-premium .ltp-tag{color:var(--pr-mut);opacity:1;letter-spacing:.02em}
.lt-premium .ltp-meta{color:var(--pr-gold);opacity:.9;font-size:11px;letter-spacing:.22em;text-transform:uppercase}
.lt-premium .ltp-btn{background:var(--pr-grad);color:#1b1407;font-weight:600;font-size:12px;letter-spacing:.16em;text-transform:uppercase}
.lt-premium .ltp-social{background:transparent;border:1px solid var(--pr-line);color:var(--pr-gold)}
/* nivel 'max': destellos dorados; el brillo del botón lo pone el núcleo */
.lt-premium[data-lt-motion="max"] .ltb-cta::before{display:none}
.lt-premium .ltb-spark{position:absolute;inset:0;pointer-events:none}
.lt-premium .ltb-spark i{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);background:var(--pr-grad);clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);opacity:0;animation:pr-twinkle var(--t,3.2s) var(--d,0s) ease-in-out infinite}
@keyframes pr-twinkle{0%,100%{opacity:0;transform:scale(.2) rotate(0)}50%{opacity:1;transform:scale(1) rotate(90deg)}}
`;
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

  function renderPremium(root, d, ctx) {
    LC.injectCss('premium', CSS_PREMIUM);
    const cl = setup(root, ctx, d);
    const { plans, combos } = visible(d, ctx);
    const wa = d.whatsapp ? ctx.buy('tus planes') : '';
    const title = d.heroTitle || LC.DEFAULTS.heroTitle;
    const words = title.split(/\s+/).filter(Boolean);
    const last = words.length > 1 ? words.pop() : '';
    const h1 = `${ctx.esc(words.join(' '))}${last ? ` <em>${ctx.esc(last)}</em>` : ''}`;
    let spark = '';
    if (ctx.motion === 'max') {
      for (let i = 0; i < 12; i++) spark += `<i style="--x:${(i * 37 + 7) % 94}%;--y:${(i * 53 + 11) % 88}%;--s:${8 + (i * 5) % 14}px;--d:-${((i * 0.47) % 3).toFixed(2)}s;--t:${(2.6 + (i % 4) * 0.5).toFixed(1)}s"></i>`;
      spark = `<div class="ltb-spark">${spark}</div>`;
    }
    const bg = `<div class="ltb-hero-bg" aria-hidden="true">${d.coverUrl && !ctx.profileMode
      ? `<img src="${ctx.esc(d.coverUrl)}" alt="" decoding="async" fetchpriority="high">`
      : '<div class="ltb-aura"></div><div class="ltb-aura2"></div><div class="ltb-lines"></div>'}${spark}</div>`;
    let table = '';
    if (plans.length > 1) {
      const rows = plans.map(p => {
        const m = ctx.money(p.price), o = ctx.money(p.oldPrice), url = planBuy(ctx, p);
        return `<tr><th scope="row"><div class="ltb-tp">${logoHtml(ctx, p.platform, 'ltb-logo', p.imageUrl, ctx.planTitle(p))}<div><b>${ctx.esc(ctx.planTitle(p))}</b><small>${ctx.esc(ctx.typeLabel(p))}</small></div></div></th>` +
          `<td class="ltb-hide-s">${ctx.esc(p.period)}</td>` +
          `<td class="ltb-tprice ltb-tright">${o && m ? `<s><span class="ltb-sr">Antes </span>${ctx.esc(o)}</s>` : ''}<b>${ctx.esc(m || 'Consultar')}</b></td>` +
          `<td class="ltb-tright">${url ? `<a class="ltb-tbuy" data-lt-btn href="${ctx.esc(url)}" target="_blank" rel="noopener">Pedir</a>` : ''}</td></tr>`;
      }).join('');
      table = `<p class="ltb-tcap" data-rv>Compara de un vistazo</p><div class="ltb-tablewrap" data-rv><table class="ltb-table"><thead><tr><th scope="col">Plataforma</th><th scope="col" class="ltb-hide-s">Periodo</th><th scope="col" class="ltb-tright">Precio</th><th scope="col"><span class="ltb-sr">Comprar</span></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    const featIdx = combos.findIndex(c => c.badge);
    const html =
      top(ctx, d, wa) +
      `<section class="ltb-hero${ctx.profileMode ? ' ltb-hero-p' : ''}" data-lt-hero>${bg}<div class="ltb-wrap"><div class="ltb-hero-txt">` +
      `<span class="ltb-eyebrow">${ctx.esc(ctx.profileMode ? 'Streaming premium' : (d.tagline || d.name))}</span>` +
      `<h1 class="ltb-h1">${h1}</h1><span class="ltb-rule" aria-hidden="true"></span>` +
      `<p class="ltb-sub">${ctx.esc(d.heroSubtitle || LC.DEFAULTS.heroSubtitle)}</p>` + fromChip(ctx) +
      `<div class="ltb-ctas">${heroCta(ctx, d, wa)}${plans.length && wa ? '<button type="button" class="ltb-btn" data-goto="plans">Ver planes</button>' : ''}</div>` +
      `</div></div></section>` +
      (plans.length ? sec('plans', '<small>Catálogo</small>Planes individuales', `<div class="ltb-grid">${plans.map((p, i) => planCard(ctx, p, i)).join('')}</div>${table}`) : '') +
      (combos.length ? sec('combos', '<small>Membresías</small>Todo en una sola suscripción', `<div class="ltb-grid">${combos.map((c, i) => comboCard(ctx, c, i, `<span class="ltb-roman">Membresía ${ROMAN[i] || i + 1}</span>`, i === featIdx ? 'is-feat' : '')).join('')}</div>`) : '') +
      benefitsSec(ctx, d, '<small>La diferencia</small>Un servicio a tu altura') +
      paysSec(ctx, d, '<small>Pagos</small>Métodos aceptados') +
      faqSec(ctx, d, '<small>Dudas</small>Preguntas frecuentes') +
      linksSec(ctx, d, '<small>Contacto</small>Encuéntranos') +
      footer(ctx, d) + fab(ctx, wa);
    root.innerHTML = html;
    reveal(root, ctx, cl);
  }

  // =====================================================================
  // 3) KINETIC — tipografía cinética, palabras que rotan, marquesinas
  // =====================================================================
  const CSS_KINETIC = baseCss('kinetic') + `
.lt-kinetic{--kn-bg:#07070a;--kn-card:#111117;--kn-txt:#f6f6f1;--kn-mut:#a9a9b6;--kn-line:rgba(255,255,255,.12);--kn-disp:"Anton","Bebas Neue","Oswald","Impact","Haettenschweiler","Arial Narrow Bold","Roboto Condensed",system-ui,-apple-system,sans-serif;background:var(--kn-bg);color:var(--kn-txt);font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
.lt-kinetic .ltb-h1,.lt-kinetic .ltb-h2,.lt-kinetic .ltb-rot,.lt-kinetic .ltb-mq-track,.lt-kinetic .ltb-price strong,.lt-kinetic .ltb-title,.lt-kinetic .ltb-brand b,.lt-kinetic .ltb-num,.lt-kinetic .ltb-ghost,.lt-kinetic .ltb-bens li,.lt-kinetic .ltb-bigname{font-family:var(--kn-disp);font-weight:900;text-transform:uppercase;letter-spacing:-.005em}
.lt-kinetic .ltb-brand b{font-size:22px;letter-spacing:.02em}
.lt-kinetic .ltb-brand img,.lt-kinetic .ltb-mono{border-radius:4px}
.lt-kinetic .ltb-mono{background:var(--lt-primary);color:var(--ltb-on-p);font-family:var(--kn-disp);font-size:22px;rotate:-4deg}
.lt-kinetic .ltb-headcta{display:inline-flex;align-items:center;gap:8px;background:var(--kn-txt);color:var(--kn-bg);border-radius:4px;padding:9px 14px;text-decoration:none;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:.06em;transition:transform .2s}
.lt-kinetic .ltb-headcta:hover{transform:translate(-2px,-2px)}
.lt-kinetic .ltb-headcta svg{width:17px;height:17px}
.lt-kinetic .ltb-hero{position:relative;overflow:hidden;isolation:isolate;container-type:inline-size;padding:34px 0 70px}
.lt-kinetic .ltb-hero-bg{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.lt-kinetic .ltb-hero-bg img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.34;filter:grayscale(1) contrast(1.15)}
.lt-kinetic .ltb-hero-bg::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(155deg,var(--lt-primary),transparent 55%);opacity:.42}
.lt-kinetic .ltb-hero-bg::after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(7,7,10,.1),#07070a 94%)}
.lt-kinetic .ltb-gridbg{position:absolute;left:0;right:0;top:-60px;bottom:-60px;background-image:linear-gradient(var(--kn-line) 1px,transparent 1px),linear-gradient(90deg,var(--kn-line) 1px,transparent 1px);background-size:60px 60px;opacity:.55;-webkit-mask-image:radial-gradient(ellipse at 50% 40%,#000 15%,transparent 72%);mask-image:radial-gradient(ellipse at 50% 40%,#000 15%,transparent 72%);animation:kn-grid 5s linear infinite}
.lt-kinetic .ltb-glow{position:absolute;width:80vmax;height:80vmax;right:-38vmax;top:-40vmax;background:radial-gradient(closest-side,var(--lt-primary),transparent);opacity:.32;animation:kn-pulse 5s ease-in-out infinite alternate}
.lt-kinetic .ltb-ghost{position:absolute;z-index:2;bottom:2%;left:0;white-space:nowrap;font-size:clamp(90px,30vw,320px);line-height:1;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.1);animation:kn-drift 28s linear infinite alternate}
@keyframes kn-grid{to{transform:translateY(60px)}}
@keyframes kn-pulse{from{transform:scale(.9);opacity:.22}to{transform:scale(1.12);opacity:.42}}
@keyframes kn-drift{from{transform:translateX(0)}to{transform:translateX(-45%)}}
@keyframes kn-blink{50%{opacity:.15}}
.lt-kinetic .ltb-kicker{display:inline-flex;align-items:center;gap:10px;font-size:12px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:var(--kn-mut);max-width:100%;overflow-wrap:anywhere}
.lt-kinetic .ltb-kicker i{width:10px;height:10px;border-radius:50%;background:var(--kn-hi);flex:none}
.lt-kinetic .ltb-from{background:var(--kn-card);border:1px solid var(--kn-line);border-radius:6px;text-transform:uppercase;letter-spacing:.08em;font-size:13px;font-weight:800;color:var(--kn-mut)}
.lt-kinetic .ltb-from b{font-family:var(--kn-disp);font-size:1.7em;color:var(--kn-hi);letter-spacing:0}
.lt-kinetic .ltb-fl{border-radius:6px;box-shadow:0 0 0 2px var(--kn-card)}
.lt-kinetic .ltb-h1{margin:16px 0 18px;line-height:.9;font-size:clamp(34px,12vw,150px);font-size:clamp(26px,min(15cqi,calc(128cqi / var(--kn-len,8))),150px)}
.lt-kinetic .ltb-w{display:inline-block;white-space:nowrap}
.lt-kinetic .ltb-w:last-child{color:var(--kn-hi)}
.lt-kinetic .ltb-ch{display:inline-block;animation:kn-in .7s calc(var(--d) * 36ms + 120ms) cubic-bezier(.2,.9,.25,1.15) both}
@keyframes kn-in{from{opacity:0;transform:translateY(.7em) rotate(12deg) scale(.5)}to{opacity:1;transform:none}}
.lt-kinetic .ltb-rotline{display:flex;flex-direction:column;gap:6px;margin:0 0 22px}
.lt-kinetic .ltb-rotlbl{font-size:13px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--kn-mut)}
.lt-kinetic .ltb-rot{display:grid;overflow:hidden;padding-bottom:.08em;line-height:1;perspective:700px;font-size:clamp(30px,10vw,100px);font-size:clamp(26px,min(11cqi,calc(118cqi / var(--kn-rlen,8))),100px)}
.lt-kinetic .ltb-rw{grid-area:1/1;opacity:0;transform:translateY(55%) rotateX(-80deg);transform-origin:50% 100%;transition:transform .6s cubic-bezier(.2,.8,.2,1),opacity .4s;overflow-wrap:anywhere}
.lt-kinetic .ltb-rw.is-on{opacity:1;transform:none}
.lt-kinetic .ltb-rw.is-out{opacity:0;transform:translateY(-55%) rotateX(80deg);transform-origin:50% 0}
.lt-kinetic .ltb-rw span{background:linear-gradient(var(--wc),var(--wc)) 0 94%/100% .14em no-repeat;-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:0 .03em}
.lt-kinetic .ltb-sub{color:var(--kn-mut);font-size:clamp(16px,4.2vw,19px);max-width:560px;margin:0 0 28px}
.lt-kinetic .ltb-ctas{display:flex;flex-wrap:wrap;gap:16px}
.lt-kinetic .ltb-btn{border-radius:4px;text-transform:uppercase;letter-spacing:.06em;font-weight:900;background:var(--lt-primary);color:var(--ltb-on-p);border:0;box-shadow:5px 5px 0 var(--lt-accent);transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s}
.lt-kinetic .ltb-btn:hover{transform:translate(-3px,-3px);box-shadow:8px 8px 0 var(--lt-accent)}
.lt-kinetic .ltb-btn:active{transform:translate(4px,4px);box-shadow:0 0 0 var(--lt-accent)}
.lt-kinetic .ltb-cta{min-height:56px;padding:14px 26px;font-size:16px}
.lt-kinetic .ltb-ghostbtn{background:transparent;color:var(--kn-txt);box-shadow:inset 0 0 0 2px var(--kn-txt)}
.lt-kinetic .ltb-ghostbtn:hover{box-shadow:inset 0 0 0 2px var(--kn-txt),5px 5px 0 var(--lt-accent)}
.lt-kinetic .ltb-mq{position:relative;height:clamp(140px,16vw,250px);overflow:hidden;margin:-14px 0;z-index:2;pointer-events:none}
.lt-kinetic .ltb-mq-band{position:absolute;left:-10%;width:120%;top:50%;padding:12px 0;transform:translateY(-50%) rotate(-4deg);background:var(--lt-primary);color:var(--ltb-on-p);overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,.45)}
.lt-kinetic .ltb-mq-band.b2{transform:translateY(-50%) rotate(3deg);background:var(--lt-accent);color:var(--ltb-on-a)}
.lt-kinetic .ltb-mq-track{display:flex;width:max-content;align-items:center;font-size:clamp(24px,6vw,46px);line-height:1;white-space:nowrap;animation:kn-mq 26s linear infinite}
.lt-kinetic .b2 .ltb-mq-track{animation-direction:reverse;animation-duration:34s}
.lt-kinetic .ltb-mq-track span{padding:0 .35em}
.lt-kinetic .ltb-mq-track i{font-style:normal;font-size:.55em;opacity:.85;padding:0 .2em}
@keyframes kn-mq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.lt-kinetic .ltb-sec{padding:64px 0}
.lt-kinetic .ltb-h2{font-size:clamp(40px,11vw,108px);line-height:.92;margin-bottom:34px}
.lt-kinetic .ltb-h2 .ltb-o{color:transparent;-webkit-text-stroke:1.5px var(--kn-txt)}
.lt-kinetic.ltb-rv [data-rv].is-in{animation-name:kn-up}
@keyframes kn-up{from{opacity:0;translate:0 46px;scale:.92}to{opacity:1;translate:0 0;scale:1}}
.lt-kinetic .ltb-grid{gap:18px}
.lt-kinetic .ltb-card{background:var(--kn-card);border:1px solid var(--kn-line);border-radius:6px;padding:24px 20px 20px;overflow:hidden;transition:transform .35s cubic-bezier(.2,.8,.2,1),border-color .35s}
.lt-kinetic .ltb-card:hover{transform:translateY(-6px);border-color:var(--pc,var(--lt-primary))}
.lt-kinetic .ltb-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--pc,var(--lt-primary));transform:scaleY(.3);transform-origin:top;transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.lt-kinetic .ltb-card:hover::before{transform:scaleY(1)}
.lt-kinetic .ltb-card>:not(.ltb-num){position:relative;z-index:1}
.lt-kinetic .ltb-num{position:absolute;right:10px;top:2px;font-size:78px;line-height:1;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.16);pointer-events:none;transition:transform .5s}
.lt-kinetic .ltb-card:hover .ltb-num{transform:translateX(-8px)}
.lt-kinetic .ltb-badge{align-self:flex-start;max-width:100%;background:var(--lt-accent);color:var(--ltb-on-a);font-weight:900;text-transform:uppercase;font-size:12px;letter-spacing:.06em;padding:5px 10px;transform:skewX(-10deg);overflow-wrap:anywhere}
.lt-kinetic .ltb-logo{border-radius:10px}
.lt-kinetic .ltb-title{font-size:clamp(21px,6.2vw,26px);line-height:1;padding-right:56px}
.lt-kinetic .ltb-type{display:inline-block;margin-top:6px;color:var(--kn-hi);letter-spacing:.14em;font-size:11px}
.lt-kinetic .ltb-price strong{font-size:58px;line-height:.9}
.lt-kinetic .ltb-old{color:var(--kn-mut)}
.lt-kinetic .ltb-per{color:var(--kn-mut)}
.lt-kinetic .ltb-feats{color:#d6d6de}
.lt-kinetic .ltb-feats li::before{content:"→";flex:none;color:var(--kn-hi);font-weight:900}
.lt-kinetic .ltb-combo{border-top:6px solid var(--lt-primary)}
.lt-kinetic .ltb-combo .ltb-title{font-size:clamp(26px,8vw,36px)}
.lt-kinetic .ltb-combo .ltb-logo{border-radius:28%;box-shadow:0 0 0 2px var(--kn-card),0 0 0 3px var(--kn-line);transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.lt-kinetic .ltb-combo:hover .ltb-logo{transform:translateY(-4px)}
.lt-kinetic .ltb-combo:hover .ltb-logo:nth-child(2n){transform:translateY(4px)}
.lt-kinetic .ltb-incl{color:var(--kn-mut)}
.lt-kinetic .ltb-bens{gap:0 28px}
.lt-kinetic .ltb-bens li{border-top:1px solid var(--kn-line);padding:18px 0;font-size:clamp(22px,5.6vw,32px);line-height:1;gap:16px}
.lt-kinetic .ltb-bn{flex:none;color:var(--kn-hi);font-size:.7em}
.lt-kinetic .ltb-pays li{border:2px solid var(--kn-line);border-radius:4px;padding:9px 16px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;font-size:13px;transition:border-color .3s}
.lt-kinetic .ltb-pays li:hover{border-color:var(--kn-hi)}
.lt-kinetic .ltb-faq{gap:0}
.lt-kinetic .ltb-faq details{border-top:1px solid var(--kn-line)}
.lt-kinetic .ltb-faq details:last-child{border-bottom:1px solid var(--kn-line)}
.lt-kinetic .ltb-faq summary{font-size:18px;font-weight:800;padding-left:0}
.lt-kinetic .ltb-faq summary::after{color:var(--kn-hi)}
.lt-kinetic .ltb-faq p{color:var(--kn-mut);padding-left:0}
.lt-kinetic .ltb-links{justify-content:flex-start}
.lt-kinetic .ltb-link{border:2px solid var(--kn-txt);border-radius:4px;text-transform:uppercase;letter-spacing:.06em;font-weight:900;transition:background .25s,color .25s,transform .25s}
.lt-kinetic .ltb-link:hover{background:var(--kn-txt);color:var(--kn-bg);transform:translateY(-3px)}
.lt-kinetic .ltb-foot{border-top:1px solid var(--kn-line);color:var(--kn-mut)}
.lt-kinetic .ltb-bigname{display:block;margin:0 0 14px;font-size:clamp(40px,12vw,120px);line-height:.9;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.35);overflow-wrap:anywhere}
.lt-kinetic .ltb-made a{color:var(--kn-txt);font-weight:800}
.lt-kinetic .ltb-fab{border-radius:16px;rotate:-6deg;box-shadow:5px 5px 0 var(--lt-accent)}
.lt-kinetic .ltb-fab::before{border-radius:16px}
@media (max-width:420px){.lt-kinetic .ltb-headcta span{display:none}.lt-kinetic .ltb-headcta{padding:9px}}
/* cabecera tipo perfil: tipografía display */
.lt-kinetic .ltb-hero.ltb-hero-p{padding-top:20px}
.lt-kinetic .ltp-cover{border-radius:0 0 6px 6px}
.lt-kinetic .ltp-avatar-in{border-color:var(--kn-bg)}
.lt-kinetic .ltp-initial{font-family:var(--kn-disp);font-weight:900}
.lt-kinetic .ltp-name{font-family:var(--kn-disp);font-weight:900;text-transform:uppercase;letter-spacing:.01em;font-size:clamp(30px,7vw,54px);line-height:.95}
.lt-kinetic .ltp-check{color:var(--kn-hi)}
.lt-kinetic .ltp-tag{color:var(--kn-mut);opacity:1}
.lt-kinetic .ltp-meta{text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:800}
.lt-kinetic .ltp-btn{border-radius:4px;text-transform:uppercase;letter-spacing:.06em;box-shadow:5px 5px 0 var(--lt-accent)}
.lt-kinetic .ltp-social{border-radius:4px;background:transparent;border:2px solid var(--kn-txt)}
/* nivel 'max': cintas y nombre fantasma más rápidos */
.lt-kinetic[data-lt-motion="max"] .ltb-mq-track{animation-duration:13s}
.lt-kinetic[data-lt-motion="max"] .b2 .ltb-mq-track{animation-duration:17s}
.lt-kinetic[data-lt-motion="max"] .ltb-ghost{animation-duration:14s}
.lt-kinetic[data-lt-motion="max"] .ltb-w:last-child .ltb-ch{animation:kn-in .7s calc(var(--d) * 36ms + 120ms) cubic-bezier(.2,.9,.25,1.15) both,kn-hop 2.4s calc(var(--d) * 60ms + 1.6s) ease-in-out infinite}
@keyframes kn-hop{0%,70%,100%{translate:0 0}80%{translate:0 -.12em}}
`;

  function marquee(ctx, items, cls) {
    let arr = items.filter(Boolean);
    if (!arr.length) return '';
    while (arr.length < 8) arr = arr.concat(arr);
    const half = arr.map(t => `<span>${ctx.esc(t)}</span><i>✦</i>`).join('');
    return `<div class="ltb-mq-band ${cls}"><div class="ltb-mq-track">${half}${half}</div></div>`;
  }

  function renderKinetic(root, d, ctx) {
    LC.injectCss('kinetic', CSS_KINETIC);
    const cl = setup(root, ctx, d);
    root.style.setProperty('--kn-hi', readable('#07070a', [d.theme.accent, d.theme.primary, '#ffffff'], 4));
    const { plans, combos } = visible(d, ctx);
    const wa = d.whatsapp ? ctx.buy('tus planes') : '';
    const title = d.heroTitle || LC.DEFAULTS.heroTitle;
    const tWords = title.split(/\s+/).filter(Boolean);
    const longest = Math.max(6, ...tWords.map(w => [...w].length));
    let n = 0;
    const h1 = tWords.map(w => `<span class="ltb-w">${[...w].map(ch => `<span class="ltb-ch" style="--d:${Math.min(n++, 45)}">${ctx.esc(ch)}</span>`).join('')}</span>`).join(' ');
    const pids = platformIds(plans, combos).slice(0, 8);
    const rot = pids.length ? pids.map(p => ({ name: ctx.platformInfo(p).name, color: safeColor(ctx.platformInfo(p).color) }))
      : ['Netflix', 'Disney+', 'Max', 'Prime Video'].map(x => ({ name: x, color: safeColor(ctx.platformInfo(x).color) }));
    const rlen = Math.max(6, ...rot.flatMap(r => String(r.name).split(/\s+/).map(w => [...w].length)));
    const bg = `<div class="ltb-hero-bg" aria-hidden="true">${d.coverUrl && !ctx.profileMode ? `<img src="${ctx.esc(d.coverUrl)}" alt="" decoding="async" fetchpriority="high">` : ''}<div class="ltb-glow"></div><div class="ltb-gridbg"></div><div class="ltb-ghost">${ctx.esc(d.name)}</div></div>`;
    const mq1 = `<div class="ltb-mq" aria-hidden="true">${marquee(ctx, rot.map(r => r.name), 'b1')}${marquee(ctx, (d.benefits.length ? d.benefits : ['Activación inmediata', 'Soporte por WhatsApp', 'Garantía total']), 'b2')}</div>`;
    const num = i => `<span class="ltb-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>`;
    const html =
      top(ctx, d, wa) +
      `<section class="ltb-hero${ctx.profileMode ? ' ltb-hero-p' : ''}" data-lt-hero>${bg}<div class="ltb-wrap"><div class="ltb-hero-txt">` +
      `<span class="ltb-kicker"><i aria-hidden="true"></i>${ctx.esc((!ctx.profileMode && d.tagline) || 'Disponible ahora')}</span>` +
      `<h1 class="ltb-h1" aria-label="${ctx.esc(title)}" style="--kn-len:${longest}"><span aria-hidden="true">${h1}</span></h1>` +
      `<div class="ltb-rotline"><span class="ltb-rotlbl">Disfruta ya</span><span class="ltb-sr">${ctx.esc(rot.map(r => r.name).join(', '))}</span>` +
      `<span class="ltb-rot" aria-hidden="true" style="--kn-rlen:${rlen}">${rot.map((r, i) => `<span class="ltb-rw${i === 0 ? ' is-on' : ''}" style="--wc:${r.color}"><span>${ctx.esc(r.name)}</span></span>`).join('')}</span></div>` +
      `<p class="ltb-sub">${ctx.esc(d.heroSubtitle || LC.DEFAULTS.heroSubtitle)}</p>` + fromChip(ctx) +
      `<div class="ltb-ctas">${heroCta(ctx, d, wa)}${plans.length && wa ? '<button type="button" class="ltb-btn ltb-ghostbtn" data-goto="plans">Ver precios</button>' : ''}</div>` +
      `</div></div></section>` + mq1 +
      (plans.length ? sec('plans', 'Elige <span class="ltb-o">tu plan</span>', `<div class="ltb-grid">${plans.map((p, i) => planCard(ctx, p, i, num(i), true)).join('')}</div>`) : '') +
      (combos.length ? sec('combos', 'Combos <span class="ltb-o">full</span>', `<div class="ltb-grid">${combos.map((c, i) => comboCard(ctx, c, i, num(i))).join('')}</div>`) : '') +
      benefitsSec(ctx, d, 'Por qué <span class="ltb-o">nosotros</span>') +
      paysSec(ctx, d, 'Paga <span class="ltb-o">fácil</span>') +
      faqSec(ctx, d, 'Preguntas <span class="ltb-o">frecuentes</span>') +
      linksSec(ctx, d, 'Sí<span class="ltb-o">guenos</span>') +
      footer(ctx, d, `<span class="ltb-bigname" aria-hidden="true">${ctx.esc(d.name)}</span>`) + fab(ctx, wa);
    root.innerHTML = html;
    reveal(root, ctx, cl);
    // Palabras que rotan en el hero
    const ws = [...root.querySelectorAll('.ltb-rw')];
    // En 'calm' la palabra queda fija (sin rotador).
    if (!ctx.reducedMotion && ctx.motion !== 'calm' && ws.length > 1) {
      let k = 0;
      const t = setInterval(() => {
        const cur = ws[k]; k = (k + 1) % ws.length;
        ws.forEach(w => w.classList.remove('is-out'));
        cur.classList.remove('is-on'); cur.classList.add('is-out');
        ws[k].classList.add('is-on');
      }, 2200);
      cl.push(() => clearInterval(t));
    }
  }

  // ---------- registro ----------
  LC.registerTemplate({
    id: 'pop', name: 'Pop', description: 'Colorida y alegre: stickers, formas flotando y botones con rebote. Ideal para TikTok e Instagram',
    tags: ['claro', 'colorida', 'animada'], preview: { bg: '#fff8ee', fg: '#1b1530', accent: '#ff7ac0' }, render: renderPop
  });
  LC.registerTemplate({
    id: 'premium', name: 'Premium', description: 'Elegante en negro y dorado: serif grande, brillos, tabla comparativa y membresías',
    tags: ['oscuro', 'elegante', 'animada'], preview: { bg: '#0b0a08', fg: '#f1ebdd', accent: '#d9b46a' }, render: renderPremium
  });
  LC.registerTemplate({
    id: 'kinetic', name: 'Kinetic', description: 'Tipografía en movimiento: títulos letra por letra, plataformas que rotan y cintas de texto',
    tags: ['oscuro', 'tipografía', 'animada'], preview: { bg: '#07070a', fg: '#f6f6f1', accent: '#22D3EE' }, render: renderKinetic
  });
})(typeof window !== 'undefined' ? window : globalThis);
