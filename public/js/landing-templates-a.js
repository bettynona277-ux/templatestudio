/* Diseños Streaming · Landings de revendedores
 * Plantillas A: "cine", "neon" y "aurora".
 * Requiere js/landing-core.js (window.LandingCore). Sin dependencias externas.
 * Contrato: docs/landings/CONTRATO.md
 */
(function (W) {
  'use strict';
  const LC = W.LandingCore;
  if (!LC) { if (W.console) console.error('landing-templates-a: falta LandingCore'); return; }

  /* =====================================================================
   * Utilidades compartidas (no tocan nada fuera de root)
   * ===================================================================== */
  const WA_ICON = (LC.LINK_ICONS && LC.LINK_ICONS.whatsapp) || '';

  // Luminancia relativa para elegir texto blanco/negro sobre el color del usuario.
  function luminance(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return 0;
    const n = parseInt(m[1], 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  const onColor = hex => (luminance(hex) > 0.42 ? '#0b0b10' : '#ffffff');

  // Registra funciones de limpieza en root.__ltCleanup (el núcleo lo resetea en cada render).
  function addCleanup(root, fn) {
    if (!root.__ltFns || typeof root.__ltCleanup !== 'function') {
      root.__ltFns = [];
      root.__ltCleanup = function () {
        const fns = root.__ltFns || [];
        root.__ltFns = [];
        fns.forEach(f => { try { f(); } catch (_) {} });
      };
    }
    root.__ltFns.push(fn);
  }

  function prepareRoot(root, data, ctx) {
    root.__ltFns = [];
    root.__ltCleanup = null;
    root.style.setProperty('--lt-on-primary', onColor(data.theme.primary));
    root.style.setProperty('--lt-on-accent', onColor(data.theme.accent));
    if (ctx.reducedMotion) root.classList.add('lt-rm');
    if (ctx.preview) root.classList.add('lt-prev');
    if (ctx.profileMode) root.classList.add('lt-pm');
  }
  // Cabecera tipo perfil (núcleo) cuando el usuario la eligió.
  const profileTop = ctx => (ctx.profileMode && typeof ctx.profileHeader === 'function') ? ctx.profileHeader() : '';

  // Logo de plataforma: imagen (SVG de /logos/) o círculo con inicial y su color.
  function platLogo(ctx, id, cls) {
    const p = ctx.platformInfo(id);
    const name = ctx.esc(p.name || 'Plataforma');
    const color = /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#7C3AED';
    const initial = ctx.esc((String(p.name || '?').trim().charAt(0) || '?').toUpperCase());
    if (p.logo) {
      return `<span class="${cls}" style="--pc:${color}"><img src="${ctx.esc(p.logo)}" alt="${name}" loading="lazy" decoding="async" width="64" height="64" data-ini="${initial}"></span>`;
    }
    return `<span class="${cls} lt-ini" style="--pc:${color}" role="img" aria-label="${name}">${initial}</span>`;
  }
  const platColor = (ctx, id) => { const c = ctx.platformInfo(id).color; return /^#[0-9a-f]{6}$/i.test(c) ? c : '#7C3AED'; };

  // Si una imagen de logo falla, se reemplaza por la inicial (listeners en hijos de root: mueren con innerHTML).
  function wireImgFallback(root) {
    root.querySelectorAll('img[data-ini]').forEach(img => {
      img.addEventListener('error', () => {
        const box = img.parentNode;
        if (!box) return;
        box.classList.add('lt-ini');
        box.textContent = img.getAttribute('data-ini') || '?';
      }, { once: true });
    });
  }

  function brandMark(data, ctx, cls) {
    if (data.logoUrl) return `<img class="${cls}" src="${ctx.esc(data.logoUrl)}" alt="${ctx.esc(data.name)}" decoding="async">`;
    const ini = ctx.esc((String(data.name || '?').trim().charAt(0) || '?').toUpperCase());
    return `<span class="${cls} lt-mono" aria-hidden="true">${ini}</span>`;
  }

  // Botón de compra/WhatsApp. data-lt-btn = brillo del núcleo en 'max'. shine: capa interna
  // (para botones que ya usan ::after o necesitan overflow visible, p. ej. el brillo neón).
  function btn(ctx, href, inner, cls, aria, shine) {
    const a = aria ? ` aria-label="${ctx.esc(aria)}"` : '';
    const mark = shine ? '' : ' data-lt-btn';
    const body = shine ? inner + SHN : inner;
    return href
      ? `<a class="${cls}"${mark} href="${ctx.esc(href)}" target="_blank" rel="noopener"${a}>${body}</a>`
      : `<span class="${cls} lt-off"${mark} aria-disabled="true"${a}>${body}</span>`;
  }
  // Capa vacía que recibe el brillo del núcleo sin pisar los ::before/::after propios.
  const SHN = '<i class="lt-shn" data-lt-btn aria-hidden="true"></i>';

  // Plural simple: pl(1,'plataforma','plataformas') -> '1 plataforma'.
  const pl = (n, s, p) => `${n} ${n === 1 ? s : p}`;

  const visiblePlans = d => d.plans.filter(p => p.visible);
  const visibleCombos = d => d.combos.filter(c => c.visible);

  function planBuyText(ctx, p) {
    const title = ctx.planTitle(p);
    const type = ctx.typeLabel(p);
    return [title, title.includes(type) ? '' : type, ctx.money(p.price)].filter(Boolean).join(' · ');
  }
  function comboBuyText(ctx, c) {
    const names = c.platforms.map(x => ctx.platformInfo(x).name).join(' + ');
    return [`${c.name} (${names})`, ctx.money(c.price)].filter(Boolean).join(' · ');
  }

  // Datos de un plan ya escapados, para que cada plantilla los componga a su estilo.
  function planView(ctx, p) {
    const info = ctx.platformInfo(p.platform);
    const price = ctx.money(p.price);
    const old = ctx.money(p.oldPrice);
    return {
      color: platColor(ctx, p.platform),
      name: ctx.esc(info.name),
      title: ctx.esc(ctx.planTitle(p)),
      type: ctx.esc(ctx.typeLabel(p)),
      isFull: p.type === 'full',
      price: price ? ctx.esc(price) : 'Consultar',
      old: old && old !== price ? ctx.esc(old) : '',
      period: ctx.esc(p.period),
      badge: ctx.esc(p.badge),
      features: p.features.map(f => `<li>${ctx.esc(f)}</li>`).join(''),
      image: p.imageUrl ? ctx.esc(p.imageUrl) : '',
      href: ctx.buy(planBuyText(ctx, p))
    };
  }
  function comboView(ctx, c) {
    const price = ctx.money(c.price);
    const old = ctx.money(c.oldPrice);
    return {
      name: ctx.esc(c.name),
      names: ctx.esc(c.platforms.map(x => ctx.platformInfo(x).name).join(' · ')),
      price: price ? ctx.esc(price) : 'Consultar',
      old: old && old !== price ? ctx.esc(old) : '',
      period: ctx.esc(c.period),
      badge: ctx.esc(c.badge),
      colors: c.platforms.map(x => platColor(ctx, x)),
      href: ctx.buy(comboBuyText(ctx, c))
    };
  }

  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z"/></svg>';
  const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  // Secciones comunes (el estilo lo pone cada plantilla con su prefijo).
  function benefitsHtml(data, ctx, title) {
    if (!data.benefits.length) return '';
    return `<section class="lt-sec lt-rv" aria-label="Beneficios"><h2 class="lt-h2">${title}</h2>
      <ul class="lt-ben">${data.benefits.map((b, i) => `<li class="lt-rv" style="--i:${i}"><span class="lt-ck">${CHECK}</span><span>${ctx.esc(b)}</span></li>`).join('')}</ul></section>`;
  }
  function payHtml(data, ctx, title) {
    if (!data.paymentMethods.length) return '';
    return `<section class="lt-sec lt-rv" aria-label="Métodos de pago"><h2 class="lt-h2">${title}</h2>
      <div class="lt-pay">${data.paymentMethods.map(p => `<span>${ctx.esc(p)}</span>`).join('')}</div></section>`;
  }
  function faqHtml(data, ctx, title) {
    if (!data.faq.length) return '';
    return `<section class="lt-sec lt-rv" aria-label="Preguntas frecuentes"><h2 class="lt-h2">${title}</h2>
      <div class="lt-faq">${data.faq.map(f => `<details><summary><span>${ctx.esc(f.q)}</span><i aria-hidden="true">+</i></summary><p>${ctx.esc(f.a)}</p></details>`).join('')}</div></section>`;
  }
  function linksHtml(data, ctx, title) {
    if (!data.links.length) return '';
    return `<section class="lt-sec lt-rv lt-lsec" aria-label="Redes y enlaces"><h2 class="lt-h2">${title}</h2>
      <div class="lt-links">${data.links.map(l => {
        const label = ctx.esc(ctx.linkLabel(l));
        return `<a class="lt-lk lt-lk-${ctx.esc(l.type)}" href="${ctx.esc(l.url)}" target="_blank" rel="noopener" aria-label="${label}" title="${label}">${ctx.linkIcon(l.type)}</a>`;
      }).join('')}</div></section>`;
  }
  function footerHtml(data, ctx) {
    return `<footer class="lt-foot"><div>${ctx.esc(data.name)} · ${new Date().getFullYear()}</div>
      <a href="https://disenosstreaming.com/" target="_blank" rel="noopener">Hecho con <b>Diseños Streaming</b></a></footer>`;
  }
  function fabHtml(data, ctx) {
    if (!data.whatsapp) return '';
    const href = ctx.buy('');
    if (!href) return '';
    return `<div class="lt-fabw"><a class="lt-fab" href="${ctx.esc(href)}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">${WA_ICON}${SHN}</a></div>`;
  }

  // Apariciones al hacer scroll. Sin IntersectionObserver o con movimiento reducido: todo visible.
  function setupReveal(root, ctx, onShow) {
    const els = Array.from(root.querySelectorAll('.lt-rv'));
    const show = el => { el.classList.add('lt-in'); if (onShow) onShow(el); };
    // Al terminar la entrada se quitan las clases para que las transiciones propias (hover) no hereden el retraso.
    const settle = el => el.addEventListener('transitionend', function done(ev) {
      if (ev.target !== el || ev.propertyName !== 'opacity') return;
      el.removeEventListener('transitionend', done);
      el.classList.remove('lt-rv', 'lt-in');
    });
    if (ctx.reducedMotion || typeof W.IntersectionObserver !== 'function') { els.forEach(show); return; }
    root.classList.add('lt-js');
    const pending = new Set(els);
    const reveal = el => { if (!pending.has(el)) return; pending.delete(el); io.unobserve(el); settle(el); show(el); };
    // Lo que ya quedó por encima de la pantalla (salto directo al final, ancla, etc.) también se muestra.
    const sweepAbove = () => { pending.forEach(el => { if (el.getBoundingClientRect().bottom < 0) reveal(el); }); };
    let fired = false;
    const io = new W.IntersectionObserver(entries => {
      fired = true;
      entries.forEach(e => { if (e.isIntersecting) reveal(e.target); });
      sweepAbove();
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(el => io.observe(el));
    let raf = 0;
    const onScroll = () => {
      if (raf || !pending.size) return;
      raf = (W.requestAnimationFrame || (f => W.setTimeout(f, 16)))(() => { raf = 0; sweepAbove(); });
    };
    W.addEventListener('scroll', onScroll, { passive: true, capture: true });
    // Respaldo: si a los 2,5 s el observer nunca respondió (no funciona), se muestra todo.
    const timer = W.setTimeout(() => { if (!fired) Array.from(pending).forEach(reveal); }, 2500);
    addCleanup(root, () => {
      io.disconnect();
      W.clearTimeout(timer);
      W.removeEventListener('scroll', onScroll, { capture: true });
      if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf);
      pending.clear();
    });
  }

  // CSS compartido, generado con el prefijo de cada plantilla.
  function baseCss(P) {
    return `
${P}{position:relative;overflow-x:hidden;overflow-x:clip;min-height:100%;-webkit-font-smoothing:antialiased;line-height:1.45;text-align:left}
${P} *,${P} *::before,${P} *::after{box-sizing:border-box}
${P} img{max-width:100%;display:block}
${P} a{color:inherit;text-decoration:none;-webkit-tap-highlight-color:transparent}
${P} h1,${P} h2,${P} h3,${P} p,${P} ul{margin:0;padding:0}
${P} ul{list-style:none}
${P} .lt-off{opacity:.55;cursor:not-allowed}
${P} .lt-wrap{width:100%;max-width:1180px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}
${P} .lt-ini{display:grid;place-items:center;font-weight:800;color:#fff;background:var(--pc,#7C3AED);text-shadow:0 1px 2px rgba(0,0,0,.45)}
${P} .lt-mono{display:grid;place-items:center;font-weight:900;color:var(--lt-on-primary,#fff);background:var(--lt-primary)}
${P} .lt-ben{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:12px}
${P} .lt-ben li{display:flex;align-items:center;gap:12px;font-weight:600;min-width:0;overflow-wrap:anywhere}
${P} .lt-ben li>span:last-child{min-width:0}
${P} h1,${P} h2,${P} h3,${P} .lt-sub,${P} .lt-cnames,${P} .lt-feat li{overflow-wrap:anywhere}
${P} .lt-ck{flex:0 0 32px;width:32px;height:32px;border-radius:50%;display:grid;place-items:center}
${P} .lt-ck svg{width:18px;height:18px}
${P} .lt-pay{display:flex;flex-wrap:wrap;gap:10px}
${P} .lt-pay span{overflow-wrap:anywhere;max-width:100%;padding:10px 18px;border-radius:999px;font-weight:700;font-size:.95rem}
${P} .lt-faq{display:grid;gap:10px}
${P} .lt-faq details{border-radius:14px;overflow:hidden}
${P} .lt-faq summary{overflow-wrap:anywhere;min-width:0;list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;font-weight:700}
${P} .lt-faq summary::-webkit-details-marker{display:none}
${P} .lt-faq summary span{min-width:0}
${P} .lt-faq summary i{flex:0 0 auto;font-style:normal;font-size:1.4rem;line-height:1;transition:transform .25s}
${P} .lt-faq details[open] summary i{transform:rotate(45deg)}
${P} .lt-faq p{padding:0 18px 16px;opacity:.85;overflow-wrap:anywhere}
${P} .lt-links{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
${P} .lt-lk{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;transition:transform .2s}
${P} .lt-lk svg{width:24px;height:24px}
${P} .lt-lk:hover,${P} .lt-lk:focus-visible{transform:translateY(-3px) scale(1.06)}
${P} .lt-lsec{text-align:center}
${P} .lt-foot{overflow-wrap:anywhere;text-align:center;padding:34px 16px 96px;font-size:.85rem;opacity:.75;display:grid;gap:6px}
${P} .lt-foot a:hover{text-decoration:underline}
${P} .lt-fabw{position:fixed;right:16px;bottom:16px;z-index:50}
${P}.lt-prev .lt-fabw{position:sticky;bottom:0;height:0;z-index:50}
${P}.lt-prev .lt-fab{position:absolute;right:16px;bottom:16px}
${P} .lt-fab{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:#1fae54;color:#fff;box-shadow:0 10px 26px rgba(0,0,0,.45);position:relative}
${P} .lt-fab svg{width:32px;height:32px;position:relative;z-index:1}
${P} .lt-fab::before,${P} .lt-fab::after{content:"";position:absolute;inset:0;border-radius:50%;background:#25d366;opacity:.6;animation:${P.slice(1)}-pulse 2.2s ease-out infinite;z-index:0}
${P} .lt-fab::after{animation-delay:1.1s}
@media (max-width:480px){${P} .lt-fab{width:52px;height:52px}${P} .lt-fab svg{width:28px;height:28px}${P} .lt-fabw{right:12px;bottom:12px}${P}.lt-prev .lt-fab{right:12px;bottom:12px}}
@keyframes ${P.slice(1)}-pulse{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.9);opacity:0}}
${P} :focus-visible{outline:3px solid var(--lt-accent);outline-offset:3px}
${P}.lt-js .lt-rv{opacity:0;transform:translateY(26px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1);transition-delay:calc(var(--i,0) * 70ms)}
${P}.lt-js .lt-rv.lt-in{opacity:1;transform:none}
${P} .lt-shn{position:absolute;inset:0;border-radius:inherit;pointer-events:none}
${P}[data-lt-motion] .lt-shn[data-lt-btn]{position:absolute;inset:0;border-radius:inherit;pointer-events:none}
${P}[data-lt-motion="calm"] *,${P}[data-lt-motion="calm"] *::before,${P}[data-lt-motion="calm"] *::after{animation-fill-mode:both!important}
${P}.lt-pm .ltp-avatar-in{border-color:var(--lt-bg0,#000)}
${P}.lt-rm *,${P}.lt-rm *::before,${P}.lt-rm *::after{animation:none!important;transition:none!important}
@media (prefers-reduced-motion:reduce){${P} *,${P} *::before,${P} *::after{animation:none!important;transition:none!important}${P} .lt-rv{opacity:1!important;transform:none!important}}
`;
  }

  /* =====================================================================
   * 1) CINE — estilo plataforma de streaming
   * ===================================================================== */
  const CINE_CSS = baseCss('.lt-cine') + `
.lt-cine{--lt-bg0:#000;background:#000;color:#fff;font-family:"Helvetica Neue",Helvetica,Arial,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.lt-cine .lt-top{position:absolute;top:0;left:0;right:0;z-index:6;display:flex;align-items:center;gap:12px;padding:14px clamp(16px,4vw,40px);background:linear-gradient(rgba(0,0,0,.8),rgba(0,0,0,0))}
.lt-cine .lt-brand{width:44px;height:44px;border-radius:10px;object-fit:cover;flex:0 0 auto;font-size:1.3rem}
.lt-cine .lt-bname{min-width:0}
.lt-cine .lt-bname b{display:block;font-size:1.15rem;font-weight:900;letter-spacing:.02em;text-transform:uppercase;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-cine .lt-bname small{display:block;font-size:.78rem;color:#cfcfcf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-cine .lt-topcta{margin-left:auto;flex:0 0 auto;background:var(--lt-primary);color:var(--lt-on-primary);font-weight:800;font-size:.85rem;padding:9px 14px;border-radius:6px}
.lt-cine .lt-hero{position:relative;min-height:min(92vh,780px);display:flex;align-items:flex-end;overflow:hidden;isolation:isolate}
.lt-cine .lt-hbg{position:absolute;inset:0;z-index:-2}
.lt-cine .lt-hbg>img{width:100%;height:100%;object-fit:cover;animation:lt-cine-kb 22s ease-in-out infinite alternate;transform-origin:60% 40%}
@media (max-width:720px){.lt-cine .lt-hbg>img{animation:none}}
@keyframes lt-cine-kb{from{transform:scale(1)}to{transform:scale(1.12) translate(-1.5%,1%)}}
.lt-cine .lt-wall{position:absolute;top:-35%;left:-30%;width:160%;height:170%;display:flex;flex-direction:column;justify-content:center;gap:14px;transform:rotate(-14deg)}
.lt-cine .lt-wrow{display:flex;gap:14px;width:max-content;animation:lt-cine-slide 46s linear infinite;will-change:transform}
.lt-cine .lt-wrow:nth-child(even){animation-direction:reverse;animation-duration:58s}
@keyframes lt-cine-slide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.lt-cine .lt-tile{flex:0 0 auto;width:118px;height:168px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(160deg,var(--pc) 0%,#111 115%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);opacity:.78}
.lt-cine .lt-tile .lt-tl{width:58px;height:58px;border-radius:14px;overflow:hidden;font-size:1.6rem}
.lt-cine .lt-tile .lt-tl img{width:100%;height:100%;object-fit:cover}
.lt-cine .lt-shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(to top,#000 4%,rgba(0,0,0,.55) 40%,rgba(0,0,0,.25) 70%,rgba(0,0,0,.7) 100%),linear-gradient(to right,rgba(0,0,0,.85) 0%,rgba(0,0,0,.2) 75%)}
.lt-cine .lt-hc{padding:120px clamp(16px,4vw,40px) clamp(36px,7vh,72px);max-width:760px;width:100%}
.lt-cine .lt-kick{display:inline-flex;align-items:center;gap:8px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;font-size:.72rem;color:#fff;margin-bottom:12px}
.lt-cine .lt-kick::before{content:"";width:22px;height:30px;background:var(--lt-primary);clip-path:polygon(0 0,35% 0,100% 100%,65% 100%);display:inline-block}
.lt-cine h1{font-size:clamp(2.2rem,9.5vw,4.9rem);line-height:.98;font-weight:900;letter-spacing:-.02em;text-shadow:0 4px 30px rgba(0,0,0,.6);overflow-wrap:anywhere;animation:lt-cine-up .9s cubic-bezier(.2,.7,.2,1) both}
.lt-cine .lt-sub{margin-top:14px;font-size:clamp(1rem,2.6vw,1.2rem);color:#e6e6e6;max-width:560px;animation:lt-cine-up .9s .12s cubic-bezier(.2,.7,.2,1) both}
.lt-cine .lt-hbtns{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px;animation:lt-cine-up .9s .24s cubic-bezier(.2,.7,.2,1) both}
@keyframes lt-cine-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
.lt-cine .lt-b1,.lt-cine .lt-b2{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:14px 24px;border-radius:6px;font-weight:800;font-size:1.02rem;transition:transform .2s,opacity .2s;max-width:100%}
.lt-cine .lt-b1 svg,.lt-cine .lt-b2 svg{width:22px;height:22px;flex:0 0 auto}
.lt-cine .lt-b1{background:var(--lt-primary);color:var(--lt-on-primary);box-shadow:0 10px 30px rgba(0,0,0,.4)}
.lt-cine .lt-b2{background:rgba(109,109,110,.7);color:#fff}
.lt-cine .lt-b1:hover,.lt-cine .lt-b2:hover{transform:scale(1.04)}
.lt-cine .lt-rowsec{padding-top:26px;position:relative}
.lt-cine .lt-rowsec h2,.lt-cine .lt-h2{white-space:nowrap;font-size:clamp(1.25rem,3.6vw,1.7rem);font-weight:900;letter-spacing:-.01em}
.lt-cine .lt-rowhead{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;padding:0 clamp(16px,4vw,40px)}
.lt-cine .lt-rowhead span{font-size:.85rem;color:#a3a3a3;font-weight:600}
.lt-cine .lt-arrs{margin-left:auto;display:none;gap:8px}
.lt-cine .lt-arr{width:38px;height:38px;border-radius:50%;border:0;background:#222;color:#fff;display:grid;place-items:center;cursor:pointer;transition:background .2s}
.lt-cine .lt-arr:hover{background:#3a3a3a}
.lt-cine .lt-arr svg{width:18px;height:18px}
.lt-cine .lt-arr[data-d="-1"] svg{transform:rotate(180deg)}
@media (hover:hover) and (min-width:720px){.lt-cine .lt-arrs{display:flex}}
.lt-cine .lt-row{display:flex;gap:12px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-padding:0 clamp(16px,4vw,40px);padding:18px clamp(16px,4vw,40px) 30px;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
.lt-cine .lt-row::-webkit-scrollbar{display:none}
.lt-cine .lt-card{flex:0 0 clamp(230px,72vw,262px);scroll-snap-align:start;background:#151515;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;transition:transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s;position:relative;transform-origin:center}
@media (hover:hover){.lt-cine .lt-card:hover{transform:scale(1.06);box-shadow:0 18px 40px rgba(0,0,0,.7),0 0 0 2px var(--lt-primary);z-index:3}}
.lt-cine .lt-poster{position:relative;height:132px;display:grid;place-items:center;background:radial-gradient(120% 90% at 30% 20%,var(--pc) 0%,#0c0c0c 95%);overflow:hidden}
.lt-cine .lt-poster>img.lt-pimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.lt-cine .lt-poster::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,#151515 0%,transparent 55%)}
.lt-cine .lt-plogo{width:74px;height:74px;border-radius:18px;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.5);font-size:2rem;position:relative;z-index:1;transition:transform .35s}
.lt-cine .lt-plogo img{width:100%;height:100%;object-fit:cover}
@media (hover:hover){.lt-cine .lt-card:hover .lt-plogo{transform:scale(1.08) rotate(-3deg)}}
.lt-cine .lt-badge{position:absolute;top:10px;left:0;z-index:2;background:var(--lt-primary);color:var(--lt-on-primary);font-size:.7rem;font-weight:900;letter-spacing:.05em;text-transform:uppercase;padding:5px 10px 5px 12px;border-radius:0 4px 4px 0;max-width:58%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-cine .lt-type{position:absolute;top:10px;right:10px;z-index:2;font-size:.7rem;font-weight:800;padding:4px 8px;border-radius:4px;background:rgba(0,0,0,.65);color:#fff;border:1px solid rgba(255,255,255,.25)}
.lt-cine .lt-cb{padding:12px 14px 14px;display:flex;flex-direction:column;gap:10px;flex:1}
.lt-cine .lt-ct{font-weight:800;font-size:1.05rem;line-height:1.2;overflow-wrap:anywhere}
.lt-cine .lt-feat{display:grid;gap:4px;font-size:.84rem;color:#bdbdbd}
.lt-cine .lt-feat li{padding-left:16px;position:relative;overflow-wrap:anywhere}
.lt-cine .lt-feat li::before{content:"";position:absolute;left:0;top:.5em;width:7px;height:7px;border-radius:50%;background:#46d369}
.lt-cine .lt-price{margin-top:auto;display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px}
.lt-cine .lt-price b{font-size:1.65rem;font-weight:900;letter-spacing:-.02em}
.lt-cine .lt-price s{color:#8c8c8c;font-size:.95rem}
.lt-cine .lt-price small{color:#a3a3a3;font-size:.8rem;width:100%}
.lt-cine .lt-buy{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--lt-primary);color:var(--lt-on-primary);font-weight:800;padding:11px;border-radius:6px;transition:filter .2s}
.lt-cine .lt-buy svg{width:16px;height:16px}
.lt-cine .lt-buy:hover{filter:brightness(1.12)}
.lt-cine .lt-t10{flex:0 0 auto;display:flex;align-items:flex-end;scroll-snap-align:start}
.lt-cine .lt-num{font-size:clamp(104px,27vw,190px);line-height:.78;font-weight:900;color:#000;-webkit-text-stroke:3px #8a8a8a;letter-spacing:-.04em;margin-right:-6px;padding-left:4px;position:relative;z-index:0;user-select:none;font-family:Impact,"Arial Black","Helvetica Neue",Arial,sans-serif}
.lt-cine .lt-combo{flex:0 0 clamp(214px,60vw,250px);position:relative;z-index:1;background:linear-gradient(170deg,#1d1d1d,#0f0f0f);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;transition:transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s;box-shadow:0 0 0 1px rgba(255,255,255,.08)}
@media (hover:hover){.lt-cine .lt-t10:hover .lt-combo{transform:scale(1.05);box-shadow:0 18px 40px rgba(0,0,0,.7),0 0 0 2px var(--lt-primary)}}
.lt-cine .lt-cstrip{height:8px;display:flex}
.lt-cine .lt-cstrip i{flex:1}
.lt-cine .lt-stack{display:flex;padding:18px 14px 4px}
.lt-cine .lt-stack .lt-sl{width:46px;height:46px;border-radius:12px;overflow:hidden;margin-right:-10px;box-shadow:0 0 0 3px #181818;font-size:1.2rem;flex:0 0 auto}
.lt-cine .lt-stack .lt-sl img{width:100%;height:100%;object-fit:cover}
.lt-cine .lt-combo .lt-badge{position:static;display:inline-block;border-radius:4px;padding:4px 8px;align-self:flex-start;max-width:100%}
.lt-cine .lt-cnames{font-size:.8rem;color:#a3a3a3;overflow-wrap:anywhere}
.lt-cine .lt-sec{padding:40px 0 0}
.lt-cine .lt-sec .lt-h2{margin-bottom:16px}
.lt-cine .lt-ben li{background:#141414;border-radius:8px;padding:14px;border-left:3px solid var(--lt-primary)}
.lt-cine .lt-ck{background:#222;background:color-mix(in srgb,var(--lt-primary) 22%,#000);color:#46d369}
.lt-cine .lt-pay span{background:#1c1c1c;border:1px solid #333}
.lt-cine .lt-faq details{background:#1c1c1c}
.lt-cine .lt-faq summary{font-size:1.02rem}
.lt-cine .lt-lk{background:#1c1c1c;color:#fff;box-shadow:inset 0 0 0 1px #3a3a3a}
.lt-cine .lt-lk:hover{background:var(--lt-primary);color:var(--lt-on-primary)}
.lt-cine .lt-foot{border-top:1px solid #222;margin-top:46px;color:#8c8c8c;opacity:1}
@media (max-width:480px){.lt-cine .lt-num{margin-right:2px;letter-spacing:0}}
@media (max-width:420px){.lt-cine .lt-topcta{display:none}.lt-cine .lt-hbtns a,.lt-cine .lt-hbtns span{flex:1 1 100%}}
/* cabecera tipo perfil */
.lt-cine .lt-hero.lt-hero-p{min-height:clamp(340px,56vh,500px)}
.lt-cine .lt-hero-p .lt-hc{padding-top:56px}
.lt-cine .ltp-name{text-transform:uppercase;letter-spacing:.01em}
.lt-cine .ltp-cover{border-radius:0 0 10px 10px}
.lt-cine .ltp-btn{border-radius:6px;background:var(--lt-primary);color:var(--lt-on-primary)}
.lt-cine .ltp-social{border-radius:8px;background:#1c1c1c;border-color:#3a3a3a}
/* nivel 'max': brillo que barre los pósters y muro más veloz */
.lt-cine[data-lt-motion="max"] .lt-card[data-lt-card]{transition:transform .25s ease-out,box-shadow .3s}
.lt-cine[data-lt-motion="max"] .lt-poster::before{content:"";position:absolute;top:0;bottom:0;left:0;width:45%;z-index:2;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.3),transparent);transform:translateX(-130%) skewX(-18deg);animation:lt-cine-sweep 3.8s ease-in-out infinite}
.lt-cine[data-lt-motion="max"] .lt-card:nth-child(3n+2) .lt-poster::before{animation-delay:.7s}
.lt-cine[data-lt-motion="max"] .lt-card:nth-child(3n) .lt-poster::before{animation-delay:1.4s}
.lt-cine[data-lt-motion="max"] .lt-wrow{animation-duration:30s}
.lt-cine[data-lt-motion="max"] .lt-wrow:nth-child(even){animation-duration:38s}
@keyframes lt-cine-sweep{0%,50%{transform:translateX(-130%) skewX(-18deg)}100%{transform:translateX(330%) skewX(-18deg)}}
`;

  function cineRender(root, data, ctx) {
    LC.injectCss('cine', CINE_CSS);
    prepareRoot(root, data, ctx);
    const esc = ctx.esc;
    const plans = visiblePlans(data);
    const combos = visibleCombos(data);
    const mainHref = ctx.buy('');
    const heroTitle = data.heroTitle || LC.DEFAULTS.heroTitle;
    const heroSub = data.heroSubtitle || LC.DEFAULTS.heroSubtitle;

    // Fondo: portada del usuario o muro animado de "pósters" con las plataformas.
    let bg;
    if (data.coverUrl && !ctx.profileMode) {
      bg = `<div class="lt-hbg"><img src="${esc(data.coverUrl)}" alt="" fetchpriority="high" decoding="async"></div>`;
    } else {
      let ids = data.platforms.length ? data.platforms.slice() : ['netflix', 'disney', 'max', 'prime', 'spotify', 'youtube'];
      while (ids.length < 7) ids = ids.concat(ids);
      ids = ids.slice(0, 9);
      const rows = [0, 1, 2, 3].map(r => {
        const rot = ids.slice(r * 2 % ids.length).concat(ids.slice(0, r * 2 % ids.length));
        const tiles = rot.map(id => `<div class="lt-tile" style="--pc:${platColor(ctx, id)}">${platLogo(ctx, id, 'lt-tl')}</div>`).join('');
        return `<div class="lt-wrow">${tiles}${tiles}</div>`;
      }).join('');
      bg = `<div class="lt-hbg" aria-hidden="true"><div class="lt-wall">${rows}</div></div>`;
    }

    const planCard = p => {
      const v = planView(ctx, p);
      const visual = v.image ? `<img class="lt-pimg" src="${v.image}" alt="" loading="lazy" decoding="async">` : '';
      return `<article class="lt-card" data-lt-card>
        <div class="lt-poster" style="--pc:${v.color}">${visual}${platLogo(ctx, p.platform, 'lt-plogo')}
          ${v.badge ? `<span class="lt-badge">${v.badge}</span>` : ''}<span class="lt-type">${v.type}</span></div>
        <div class="lt-cb"><h3 class="lt-ct">${v.title}</h3>
          ${v.features ? `<ul class="lt-feat">${v.features}</ul>` : ''}
          <div class="lt-price"><b>${v.price}</b>${v.old ? `<s>${v.old}</s>` : ''}<small>${v.period}</small></div>
          ${btn(ctx, v.href, `${PLAY}Comprar`, 'lt-buy', `Comprar ${ctx.planTitle(p)}`)}</div></article>`;
    };

    const rowSec = (id, title, note, inner) => `<section class="lt-rowsec lt-rv" id="${id}" aria-label="${esc(title)}">
      <div class="lt-rowhead"><h2>${esc(title)}</h2>${note ? `<span>${esc(note)}</span>` : ''}
        <div class="lt-arrs"><button type="button" class="lt-arr" data-d="-1" aria-label="Anterior">${CHEV}</button><button type="button" class="lt-arr" data-d="1" aria-label="Siguiente">${CHEV}</button></div></div>
      <div class="lt-row">${inner}</div></section>`;

    // Planes agrupados: perfiles y cuentas completas como filas separadas (si hay de ambos).
    const profiles = plans.filter(p => p.type !== 'full');
    const fulls = plans.filter(p => p.type === 'full');
    let planRows = '';
    if (profiles.length && fulls.length) {
      planRows = rowSec('lt-planes', 'Perfiles', pl(profiles.length, 'disponible', 'disponibles'), profiles.map(planCard).join('')) +
        rowSec('lt-planes-full', 'Cuentas completas', pl(fulls.length, 'disponible', 'disponibles'), fulls.map(planCard).join(''));
    } else if (plans.length) {
      planRows = rowSec('lt-planes', 'Planes populares', pl(plans.length, 'disponible', 'disponibles'), plans.map(planCard).join(''));
    }

    const comboRow = combos.length ? rowSec('lt-combos', 'Top combos', 'Más plataformas, menos precio', combos.map((c, i) => {
      const v = comboView(ctx, c);
      const strip = v.colors.map(col => `<i style="background:${col}"></i>`).join('');
      const logos = c.platforms.map(x => platLogo(ctx, x, 'lt-sl')).join('');
      return `<div class="lt-t10"><span class="lt-num" aria-hidden="true">${i + 1}</span>
        <article class="lt-combo" data-lt-card><div class="lt-cstrip">${strip}</div><div class="lt-stack">${logos}</div>
          <div class="lt-cb">${v.badge ? `<span class="lt-badge">${v.badge}</span>` : ''}<h3 class="lt-ct">${v.name}</h3>
            <p class="lt-cnames">${v.names}</p>
            <div class="lt-price"><b>${v.price}</b>${v.old ? `<s>${v.old}</s>` : ''}<small>${v.period}</small></div>
            ${btn(ctx, v.href, `${PLAY}Comprar`, 'lt-buy', `Comprar ${c.name}`)}</div></article></div>`;
    }).join('')) : '';

    const firstSec = plans.length ? '#lt-planes' : (combos.length ? '#lt-combos' : '');
    root.innerHTML = (ctx.profileMode ? profileTop(ctx) : `
      <header class="lt-top">${brandMark(data, ctx, 'lt-brand')}
        <div class="lt-bname"><b>${esc(data.name)}</b>${data.tagline ? `<small>${esc(data.tagline)}</small>` : ''}</div>
        ${mainHref ? btn(ctx, mainHref, 'Contáctanos', 'lt-topcta') : ''}</header>`) + `
      <section class="lt-hero${ctx.profileMode ? ' lt-hero-p' : ''}">${bg}<div class="lt-shade"></div>
        <div class="lt-hc">
          <div class="lt-kick">${data.platforms.length ? pl(data.platforms.length, 'plataforma', 'plataformas') : 'Streaming'}</div>
          <h1>${esc(heroTitle)}</h1><p class="lt-sub">${esc(heroSub)}</p>
          <div class="lt-hbtns">${btn(ctx, mainHref, `${PLAY}${esc(data.ctaText)}`, 'lt-b1')}
            ${firstSec ? `<a class="lt-b2" href="${firstSec}">Ver planes</a>` : ''}</div>
        </div></section>
      <main>${planRows}${comboRow}
        <div class="lt-wrap">${benefitsHtml(data, ctx, '¿Por qué elegirnos?')}${payHtml(data, ctx, 'Métodos de pago')}${faqHtml(data, ctx, 'Preguntas frecuentes')}${linksHtml(data, ctx, 'Síguenos')}</div>
      </main>${footerHtml(data, ctx)}${fabHtml(data, ctx)}`;

    // Flechas de carrusel (escritorio). Listeners en hijos de root.
    root.querySelectorAll('.lt-rowsec').forEach(sec => {
      const row = sec.querySelector('.lt-row');
      sec.querySelectorAll('.lt-arr').forEach(b => b.addEventListener('click', () => {
        const d = Number(b.getAttribute('data-d')) || 1;
        if (row && row.scrollBy) row.scrollBy({ left: d * row.clientWidth * 0.85, behavior: ctx.reducedMotion ? 'auto' : 'smooth' });
      }));
    });
    // Enlaces internos (#lt-planes) sin cambiar la URL ni depender de ids globales.
    root.querySelectorAll('a[href^="#lt-"]').forEach(a => a.addEventListener('click', ev => {
      const t = root.querySelector(a.getAttribute('href'));
      if (t && t.scrollIntoView) { ev.preventDefault(); t.scrollIntoView({ behavior: ctx.reducedMotion ? 'auto' : 'smooth', block: 'start' }); }
    }));
    wireImgFallback(root);
    setupReveal(root, ctx);
  }

  LC.registerTemplate({
    id: 'cine', name: 'Cine',
    description: 'Estilo Netflix: portada gigante, filas de planes tipo carrusel y "Top combos"',
    tags: ['oscuro', 'animada', 'carrusel'],
    preview: { bg: '#000000', fg: '#ffffff', accent: '#e50914' },
    render: cineRender
  });

  /* =====================================================================
   * 2) NEÓN — cyberpunk oscuro, bordes que respiran y giran
   * ===================================================================== */
  const NEON_CSS = baseCss('.lt-neon') + `
.lt-neon{--lt-bg0:#05040d;background:#05040d;color:#eef4ff;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --nP:#fff;--nP:color-mix(in srgb,var(--lt-primary) 55%,#fff);--nA:#fff;--nA:color-mix(in srgb,var(--lt-accent) 55%,#fff)}
.lt-neon .lt-mono-f{font-family:ui-monospace,"SF Mono","Cascadia Mono","Roboto Mono",Menlo,Consolas,monospace}
.lt-neon .lt-top{position:relative;z-index:5;display:flex;align-items:center;gap:12px;padding:14px clamp(16px,4vw,40px);border-bottom:1px solid rgba(255,255,255,.08);background:rgba(5,4,13,.85)}
.lt-neon .lt-brand{width:44px;height:44px;border-radius:12px;object-fit:cover;flex:0 0 auto;font-size:1.3rem;box-shadow:0 0 0 2px var(--lt-primary),0 0 18px var(--lt-primary)}
.lt-neon .lt-bname{min-width:0}
.lt-neon .lt-bname b{display:block;font-size:1.1rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-neon .lt-bname small{display:block;font-size:.74rem;color:var(--nA);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.04em}
.lt-neon .lt-live{margin-left:auto;flex:0 0 auto;display:flex;align-items:center;gap:8px;font-size:.72rem;letter-spacing:.14em;color:var(--nA)}
.lt-neon .lt-live i{width:9px;height:9px;border-radius:50%;background:var(--lt-accent);box-shadow:0 0 10px var(--lt-accent);animation:lt-neon-blink 1.4s steps(2,end) infinite}
@keyframes lt-neon-blink{50%{opacity:.2}}
.lt-neon .lt-hero{position:relative;overflow:hidden;isolation:isolate;min-height:min(86vh,720px);display:flex;align-items:center;justify-content:center;text-align:center;padding:60px 0 150px}
.lt-neon .lt-hbg{position:absolute;inset:0;z-index:-3}
.lt-neon .lt-hbg img{width:100%;height:100%;object-fit:cover;opacity:.45}
.lt-neon .lt-hbg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,4,13,.7),rgba(5,4,13,.35) 50%,#05040d 92%)}
.lt-neon .lt-sun{position:absolute;left:50%;bottom:30%;width:min(78vw,420px);aspect-ratio:1;margin-left:calc(min(78vw,420px) / -2);border-radius:50%;z-index:-2;
  background:linear-gradient(180deg,var(--lt-accent),var(--lt-primary) 70%);opacity:.55;
  -webkit-mask:repeating-linear-gradient(180deg,#000 0 14px,transparent 14px 20px);mask:repeating-linear-gradient(180deg,#000 0 14px,transparent 14px 20px);
  animation:lt-neon-sun 6s ease-in-out infinite alternate}
@keyframes lt-neon-sun{from{transform:translateY(0) scale(1)}to{transform:translateY(-14px) scale(1.04)}}
.lt-neon .lt-gw{position:absolute;left:-40%;right:-40%;bottom:0;height:46%;perspective:260px;perspective-origin:50% 0;z-index:-1;overflow:hidden}
.lt-neon .lt-grid{position:absolute;inset:0;transform:rotateX(62deg);transform-origin:50% 0;overflow:hidden}
.lt-neon .lt-grid i{position:absolute;left:0;right:0;top:-120px;bottom:-120px;
  background-image:linear-gradient(var(--lt-primary) 2px,transparent 2px),linear-gradient(90deg,var(--lt-primary) 2px,transparent 2px);
  background-size:60px 60px;opacity:.75;animation:lt-neon-grid 1.3s linear infinite;will-change:transform}
@keyframes lt-neon-grid{from{transform:translateY(-60px)}to{transform:translateY(0)}}
.lt-neon .lt-gw::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#05040d 0%,rgba(5,4,13,.2) 45%,rgba(5,4,13,.6) 100%)}
.lt-neon .lt-hc{position:relative;padding:0 clamp(16px,4vw,40px);max-width:900px;width:100%}
.lt-neon .lt-tag{display:inline-block;font-size:.72rem;letter-spacing:.24em;text-transform:uppercase;color:var(--nA);border:1px solid var(--lt-accent);padding:7px 14px;border-radius:999px;margin-bottom:18px;box-shadow:0 0 14px rgba(0,0,0,.4),inset 0 0 12px rgba(255,255,255,.04)}
.lt-neon h1{position:relative;font-size:clamp(2.1rem,9vw,4.8rem);line-height:1;font-weight:900;text-transform:uppercase;letter-spacing:-.01em;color:#fff;
  text-shadow:0 0 6px rgba(255,255,255,.55),0 0 22px var(--lt-primary),0 0 48px var(--lt-primary);overflow-wrap:anywhere}
.lt-neon .lt-glitch::before,.lt-neon .lt-glitch::after{content:attr(data-text);position:absolute;inset:0;pointer-events:none;opacity:0;text-shadow:none}
.lt-neon .lt-glitch::before{color:var(--lt-accent);clip-path:inset(12% 0 58% 0);animation:lt-neon-g1 5s steps(1,end) infinite}
.lt-neon .lt-glitch::after{color:var(--lt-primary);clip-path:inset(62% 0 8% 0);animation:lt-neon-g2 5s steps(1,end) infinite}
@keyframes lt-neon-g1{0%,88%,100%{opacity:0;transform:none}89%{opacity:.9;transform:translate(-4px,-1px)}91%{opacity:.9;transform:translate(3px,1px)}93%{opacity:0}}
@keyframes lt-neon-g2{0%,89%,100%{opacity:0;transform:none}90%{opacity:.85;transform:translate(4px,1px)}92%{opacity:.85;transform:translate(-3px,0)}94%{opacity:0}}
.lt-neon .lt-sub{margin:18px auto 0;max-width:600px;font-size:clamp(1rem,2.6vw,1.18rem);color:#cdd6ea}
.lt-neon .lt-hbtns{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:28px}
.lt-neon .lt-b1,.lt-neon .lt-b2{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:15px 26px;border-radius:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:.92rem;transition:transform .2s;max-width:100%}
.lt-neon .lt-b1 svg{width:22px;height:22px;flex:0 0 auto}
.lt-neon .lt-b1{background:var(--lt-primary);color:var(--lt-on-primary)}
.lt-neon .lt-b2{border:2px solid var(--lt-accent);color:var(--nA);background:rgba(5,4,13,.6)}
.lt-neon .lt-b1:hover,.lt-neon .lt-b2:hover{transform:translateY(-2px)}
.lt-neon .lt-glow{position:relative}
.lt-neon .lt-glow::after{content:"";position:absolute;inset:-2px;border-radius:inherit;pointer-events:none;box-shadow:0 0 14px var(--lt-primary),0 0 34px var(--lt-primary);animation:lt-neon-breathe 2.8s ease-in-out infinite}
.lt-neon .lt-b2.lt-glow::after{box-shadow:0 0 14px var(--lt-accent),0 0 30px var(--lt-accent);animation-delay:1.4s}
@keyframes lt-neon-breathe{0%,100%{opacity:.35}50%{opacity:1}}
.lt-neon .lt-sec{padding:56px 0 0}
.lt-neon .lt-h2{font-size:clamp(1.4rem,4.2vw,2.1rem);font-weight:900;text-transform:uppercase;letter-spacing:.04em;margin-bottom:22px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.lt-neon .lt-h2 small{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:.72rem;font-weight:600;letter-spacing:.2em;color:var(--nA);border:1px solid rgba(255,255,255,.18);padding:4px 10px;border-radius:6px}
.lt-neon .lt-h2::after{content:"";flex:1 1 40px;height:2px;min-width:40px;background:linear-gradient(90deg,var(--lt-primary),var(--lt-accent),transparent)}
.lt-neon .lt-gridp{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,252px),1fr));gap:18px}
.lt-neon .lt-nc{position:relative;border-radius:18px;padding:2px;overflow:hidden;isolation:isolate;background:rgba(255,255,255,.1);transition:transform .3s cubic-bezier(.2,.7,.2,1)}
.lt-neon .lt-nc::before{content:"";position:absolute;inset:-100%;z-index:-1;background:conic-gradient(from 0deg,var(--lt-primary),var(--lt-accent) 25%,transparent 40%,transparent 60%,var(--lt-primary) 75%,var(--lt-accent));
  animation:lt-neon-spin 5s linear infinite;animation-play-state:paused;will-change:transform}
.lt-neon .lt-nc.lt-hot::before{animation-play-state:running}
@media (hover:hover){.lt-neon .lt-nc:hover{transform:translateY(-6px)}.lt-neon .lt-nc:hover::before{animation-play-state:running}}
@keyframes lt-neon-spin{to{transform:rotate(360deg)}}
.lt-neon .lt-in2{position:relative;height:100%;border-radius:16px;background:linear-gradient(165deg,#110f26,#07061a 70%);padding:18px;display:flex;flex-direction:column;gap:12px}
.lt-neon .lt-nh{display:flex;align-items:center;gap:12px;min-width:0}
.lt-neon .lt-pl{width:54px;height:54px;flex:0 0 auto;border-radius:14px;overflow:hidden;font-size:1.5rem;box-shadow:0 0 0 1px rgba(255,255,255,.15),0 0 18px var(--pc)}
.lt-neon .lt-pl img{width:100%;height:100%;object-fit:cover}
.lt-neon .lt-nt{min-width:0}
.lt-neon .lt-nt h3{font-size:1.08rem;font-weight:800;line-height:1.2;overflow-wrap:anywhere}
.lt-neon .lt-type{display:inline-block;margin-top:4px;font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--nA)}
.lt-neon .lt-badge{align-self:flex-start;font-size:.66rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;padding:5px 9px;border-radius:6px;background:var(--lt-accent);color:var(--lt-on-accent);box-shadow:0 0 14px var(--lt-accent);max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-neon .lt-pimg{width:100%;height:110px;object-fit:cover;border-radius:10px}
.lt-neon .lt-feat{display:grid;gap:6px;font-size:.88rem;color:#c3cbe0}
.lt-neon .lt-feat li{position:relative;padding-left:20px;overflow-wrap:anywhere}
.lt-neon .lt-feat li::before{content:">";position:absolute;left:0;color:var(--nA);font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:800}
.lt-neon .lt-price{margin-top:auto;display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px}
.lt-neon .lt-price b{font-size:1.9rem;font-weight:900;color:#fff;text-shadow:0 0 12px var(--lt-accent)}
.lt-neon .lt-price s{color:#8b93a8}
.lt-neon .lt-price small{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:.74rem;color:#9aa4bd;width:100%;letter-spacing:.08em}
.lt-neon .lt-buy{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;font-size:.85rem;border:2px solid var(--lt-primary);color:#fff;background:rgba(255,255,255,.03);transition:background .2s,color .2s,box-shadow .2s}
.lt-neon .lt-buy:hover,.lt-neon .lt-buy:focus-visible{background:var(--lt-primary);color:var(--lt-on-primary);box-shadow:0 0 22px var(--lt-primary)}
.lt-neon .lt-buy svg{width:16px;height:16px}
.lt-neon .lt-cl{display:flex;flex-wrap:wrap;gap:8px}
.lt-neon .lt-cl .lt-pl{width:44px;height:44px;border-radius:12px;font-size:1.2rem}
.lt-neon .lt-cnames{font-size:.8rem;color:#9aa4bd;overflow-wrap:anywhere}
.lt-neon .lt-ben li{padding:14px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.1)}
.lt-neon .lt-ck{color:var(--lt-on-accent);background:var(--lt-accent);box-shadow:0 0 14px var(--lt-accent)}
.lt-neon .lt-pay span{border:1px solid var(--lt-accent);color:var(--nA);font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;letter-spacing:.06em;background:rgba(255,255,255,.03)}
.lt-neon .lt-faq details{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.1)}
.lt-neon .lt-faq details[open]{border-color:var(--lt-primary);box-shadow:0 0 18px rgba(0,0,0,.4),inset 0 0 0 1px var(--lt-primary)}
.lt-neon .lt-faq summary i{color:var(--nA)}
.lt-neon .lt-lk{color:#fff;border:2px solid var(--lt-accent);background:rgba(255,255,255,.03);box-shadow:0 0 12px rgba(0,0,0,.4)}
.lt-neon .lt-lk:hover{box-shadow:0 0 18px var(--lt-accent);color:var(--nA)}
.lt-neon .lt-foot{margin-top:56px;border-top:1px solid rgba(255,255,255,.08);font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:.76rem;letter-spacing:.06em;color:#9aa4bd;opacity:1}
.lt-neon .lt-fab{box-shadow:0 0 0 2px #25d366,0 0 24px #25d366}
@media (max-width:420px){.lt-neon .lt-live span{display:none}.lt-neon .lt-hbtns>*{flex:1 1 100%}}
/* cabecera tipo perfil */
.lt-neon .lt-hero.lt-hero-p{min-height:0;padding:44px 0 128px}
.lt-neon .ltp-cover{box-shadow:0 1px 0 var(--lt-primary),0 14px 40px -14px var(--lt-primary)}
.lt-neon .ltp-ring{box-shadow:0 0 14px var(--lt-primary),0 0 34px var(--lt-accent)}
.lt-neon .ltp-name{text-transform:uppercase;letter-spacing:.04em;text-shadow:0 0 6px rgba(255,255,255,.5),0 0 20px var(--lt-primary)}
.lt-neon .ltp-check{filter:drop-shadow(0 0 6px var(--lt-accent))}
.lt-neon .ltp-tag{color:var(--nA);opacity:1}
.lt-neon .ltp-meta{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;letter-spacing:.06em}
.lt-neon .ltp-btn{border-radius:12px;text-transform:uppercase;letter-spacing:.06em;box-shadow:0 0 0 2px #25d366,0 0 22px rgba(37,211,102,.7)}
.lt-neon .ltp-social{border:2px solid var(--lt-accent);background:rgba(255,255,255,.03);box-shadow:0 0 12px rgba(0,0,0,.4)}
/* nivel 'max': parpadeo de letrero en el título */
.lt-neon[data-lt-motion="max"] .lt-hero h1{animation:lt-neon-flick 4.6s linear infinite}
.lt-neon[data-lt-motion="max"] .lt-grid i{animation-duration:.9s}
@keyframes lt-neon-flick{0%,86%,100%{opacity:1}87%{opacity:.35}88%{opacity:1}90%{opacity:.5}91%{opacity:1}95%{opacity:.75}96%{opacity:1}}
`;

  function neonRender(root, data, ctx) {
    LC.injectCss('neon', NEON_CSS);
    prepareRoot(root, data, ctx);
    const esc = ctx.esc;
    const plans = visiblePlans(data);
    const combos = visibleCombos(data);
    const mainHref = ctx.buy('');
    const heroTitle = data.heroTitle || LC.DEFAULTS.heroTitle;
    const heroSub = data.heroSubtitle || LC.DEFAULTS.heroSubtitle;
    const cover = data.coverUrl && !ctx.profileMode ? `<div class="lt-hbg"><img src="${esc(data.coverUrl)}" alt="" fetchpriority="high" decoding="async"></div>` : '';

    const planCards = plans.map((p, i) => {
      const v = planView(ctx, p);
      return `<article class="lt-nc lt-rv${v.badge ? ' lt-hot' : ''}" data-lt-card style="--i:${i % 4}">
        <div class="lt-in2">${v.badge ? `<span class="lt-badge">${v.badge}</span>` : ''}
          <div class="lt-nh">${platLogo(ctx, p.platform, 'lt-pl')}<div class="lt-nt"><h3>${v.title}</h3><span class="lt-type">// ${v.type}</span></div></div>
          ${v.image ? `<img class="lt-pimg" src="${v.image}" alt="" loading="lazy" decoding="async">` : ''}
          ${v.features ? `<ul class="lt-feat">${v.features}</ul>` : ''}
          <div class="lt-price"><b>${v.price}</b>${v.old ? `<s>${v.old}</s>` : ''}<small>/ ${v.period}</small></div>
          ${btn(ctx, v.href, `${CHEV}Comprar`, 'lt-buy', `Comprar ${ctx.planTitle(p)}`)}</div></article>`;
    }).join('');

    const comboCards = combos.map((c, i) => {
      const v = comboView(ctx, c);
      return `<article class="lt-nc lt-hot lt-rv" data-lt-card style="--i:${i % 4}">
        <div class="lt-in2">${v.badge ? `<span class="lt-badge">${v.badge}</span>` : ''}
          <div class="lt-nt"><h3>${v.name}</h3><span class="lt-type">// ${pl(c.platforms.length, 'plataforma', 'plataformas')}</span></div>
          <div class="lt-cl">${c.platforms.map(x => platLogo(ctx, x, 'lt-pl')).join('')}</div>
          <p class="lt-cnames">${v.names}</p>
          <div class="lt-price"><b>${v.price}</b>${v.old ? `<s>${v.old}</s>` : ''}<small>/ ${v.period}</small></div>
          ${btn(ctx, v.href, `${CHEV}Comprar`, 'lt-buy', `Comprar ${c.name}`)}</div></article>`;
    }).join('');

    root.innerHTML = (ctx.profileMode ? profileTop(ctx) : `
      <header class="lt-top">${brandMark(data, ctx, 'lt-brand')}
        <div class="lt-bname"><b>${esc(data.name)}</b>${data.tagline ? `<small>${esc(data.tagline)}</small>` : ''}</div>
        <div class="lt-live lt-mono-f" aria-hidden="true"><i></i><span>ONLINE</span></div></header>`) + `
      <section class="lt-hero${ctx.profileMode ? ' lt-hero-p' : ''}">${cover}<div class="lt-sun" aria-hidden="true"></div>
        <div class="lt-gw" aria-hidden="true"><div class="lt-grid"><i></i></div></div>
        <div class="lt-hc">
          <span class="lt-tag lt-mono-f">${data.platforms.length ? `${pl(data.platforms.length, 'plataforma', 'plataformas')} · activación rápida` : 'Streaming'}</span>
          <h1 class="lt-glitch" data-text="${esc(heroTitle)}">${esc(heroTitle)}</h1>
          <p class="lt-sub">${esc(heroSub)}</p>
          <div class="lt-hbtns">${btn(ctx, mainHref, `${WA_ICON}${esc(data.ctaText)}`, 'lt-b1 lt-glow', '', true)}
            ${plans.length || combos.length ? `<a class="lt-b2 lt-glow" href="#lt-n-${plans.length ? 'planes' : 'combos'}">Ver planes</a>` : ''}</div>
        </div></section>
      <main class="lt-wrap">
        ${plans.length ? `<section class="lt-sec" id="lt-n-planes" aria-label="Planes"><h2 class="lt-h2 lt-rv">Planes <small>${pl(plans.length, 'plan', 'planes')} online</small></h2><div class="lt-gridp">${planCards}</div></section>` : ''}
        ${combos.length ? `<section class="lt-sec" id="lt-n-combos" aria-label="Combos"><h2 class="lt-h2 lt-rv">Combos <small>ahorro máximo</small></h2><div class="lt-gridp">${comboCards}</div></section>` : ''}
        ${benefitsHtml(data, ctx, 'Beneficios')}${payHtml(data, ctx, 'Métodos de pago')}${faqHtml(data, ctx, 'Preguntas frecuentes')}${linksHtml(data, ctx, 'Síguenos')}
      </main>${footerHtml(data, ctx)}${fabHtml(data, ctx)}`;

    root.querySelectorAll('a[href^="#lt-"]').forEach(a => a.addEventListener('click', ev => {
      const t = root.querySelector(a.getAttribute('href'));
      if (t && t.scrollIntoView) { ev.preventDefault(); t.scrollIntoView({ behavior: ctx.reducedMotion ? 'auto' : 'smooth', block: 'start' }); }
    }));
    wireImgFallback(root);
    setupReveal(root, ctx);
  }

  LC.registerTemplate({
    id: 'neon', name: 'Neón',
    description: 'Cyberpunk oscuro: bordes de neón que respiran, título glitch y grilla animada',
    tags: ['oscuro', 'animada', 'gamer'],
    preview: { bg: '#05040d', fg: '#eef4ff', accent: '#22d3ee' },
    render: neonRender
  });

  /* =====================================================================
   * 3) AURORA — degradado aurora, glassmorphism y marquesina de logos
   * ===================================================================== */
  const AURORA_CSS = baseCss('.lt-aurora') + `
.lt-aurora{--lt-bg0:#070a1a;display:flow-root;background:#070a1a;color:#f4f6ff;font-family:ui-rounded,"SF Pro Rounded",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --aA:#fff;--aA:color-mix(in srgb,var(--lt-accent) 45%,#fff);--glass:rgba(22,26,52,.78)}
.lt-aurora .lt-abg{position:absolute;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.lt-aurora .lt-abg b{position:absolute;width:80vmax;height:80vmax;max-width:1100px;max-height:1100px;border-radius:50%;opacity:.5;
  background:radial-gradient(circle at center,var(--c) 0%,transparent 62%);will-change:transform;animation:lt-au-f1 22s ease-in-out infinite alternate}
.lt-aurora .lt-abg b:nth-child(1){--c:var(--lt-primary);top:-30vmax;left:-25vmax}
.lt-aurora .lt-abg b:nth-child(2){--c:var(--lt-accent);top:-20vmax;right:-35vmax;animation-name:lt-au-f2;animation-duration:26s}
.lt-aurora .lt-abg b:nth-child(3){--c:#ff4fb8;top:35%;left:-40vmax;opacity:.28;animation-duration:30s}
.lt-aurora .lt-abg b:nth-child(4){--c:var(--lt-primary);top:65%;right:-40vmax;opacity:.32;animation-name:lt-au-f2;animation-duration:34s}
@keyframes lt-au-f1{0%{transform:translate(0,0) scale(1)}50%{transform:translate(12vmax,6vmax) scale(1.15)}100%{transform:translate(4vmax,14vmax) scale(.95)}}
@keyframes lt-au-f2{0%{transform:translate(0,0) scale(1.05)}50%{transform:translate(-14vmax,8vmax) scale(.9)}100%{transform:translate(-6vmax,-4vmax) scale(1.12)}}
.lt-aurora>header,.lt-aurora>main,.lt-aurora>section,.lt-aurora>footer{position:relative;z-index:1}
.lt-aurora .lt-glass{background:var(--glass);border:1px solid rgba(255,255,255,.16);box-shadow:0 20px 50px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.12)}
@media (hover:hover) and (min-width:721px){
  @supports ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px))){.lt-aurora{--glass:rgba(255,255,255,.08)}.lt-aurora .lt-glass{-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%)}}}
.lt-aurora .lt-top{display:flex;align-items:center;gap:12px;margin:14px clamp(12px,3vw,32px) 0;padding:10px 12px;border-radius:20px}
.lt-aurora .lt-brand{width:42px;height:42px;border-radius:14px;object-fit:cover;flex:0 0 auto;font-size:1.25rem}
.lt-aurora .lt-bname{min-width:0}
.lt-aurora .lt-bname b{display:block;font-size:1.08rem;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-aurora .lt-bname small{display:block;font-size:.78rem;color:#c7cde6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-aurora .lt-topcta{margin-left:auto;flex:0 0 auto;display:flex;align-items:center;gap:6px;font-weight:700;font-size:.85rem;padding:9px 14px;border-radius:999px;background:#fff;color:#0b0d1d}
.lt-aurora .lt-topcta svg{width:18px;height:18px}
.lt-aurora .lt-hero{text-align:center;padding:clamp(48px,10vh,110px) clamp(16px,4vw,40px) 40px;max-width:980px;margin:0 auto}
.lt-aurora .lt-pill{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;font-size:.8rem;font-weight:700;margin-bottom:20px}
.lt-aurora .lt-pill i{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 0 rgba(74,222,128,.6);animation:lt-au-dot 2s infinite}
@keyframes lt-au-dot{0%{box-shadow:0 0 0 0 rgba(74,222,128,.6)}100%{box-shadow:0 0 0 10px rgba(74,222,128,0)}}
.lt-aurora h1{font-size:clamp(2.3rem,8.6vw,5.2rem);line-height:1.02;font-weight:800;letter-spacing:-.035em;overflow-wrap:anywhere;color:#fff}
@supports (color:color-mix(in srgb,red 50%,blue)) and ((-webkit-background-clip:text) or (background-clip:text)){
  .lt-aurora h1{background:linear-gradient(100deg,#fff 30%,var(--aA) 70%,#fff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}}
.lt-aurora .lt-sub{margin:18px auto 0;max-width:620px;font-size:clamp(1rem,2.6vw,1.22rem);color:#d3d8ee}
.lt-aurora .lt-hbtns{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:28px}
.lt-aurora .lt-b1,.lt-aurora .lt-b2{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:15px 26px;border-radius:999px;font-weight:800;font-size:1rem;transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s;max-width:100%}
.lt-aurora .lt-b1 svg{width:22px;height:22px;flex:0 0 auto}
.lt-aurora .lt-b1{background:var(--lt-primary);color:var(--lt-on-primary);box-shadow:0 14px 34px rgba(0,0,0,.35)}
.lt-aurora .lt-b2{color:#fff}
.lt-aurora .lt-b1:hover,.lt-aurora .lt-b2:hover{transform:translateY(-3px)}
.lt-aurora .lt-cover{margin:34px auto 0;max-width:860px;border-radius:26px;padding:8px;animation:lt-au-bob 7s ease-in-out infinite alternate}
.lt-aurora .lt-cover img{width:100%;max-height:440px;object-fit:cover;border-radius:20px}
@keyframes lt-au-bob{from{transform:translateY(0)}to{transform:translateY(-10px)}}
.lt-aurora .lt-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-width:640px;margin:34px auto 0}
.lt-aurora .lt-stat{border-radius:18px;padding:14px 8px;text-align:center;min-width:0}
.lt-aurora .lt-stat b{display:block;font-size:clamp(1.3rem,5vw,1.9rem);font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-aurora .lt-stat span{font-size:.76rem;color:#c7cde6}
.lt-aurora .lt-mq{position:relative;z-index:1;overflow:hidden;padding:18px 0;margin-top:10px;-webkit-mask:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.lt-aurora .lt-mqt{display:flex;width:max-content;animation:lt-au-mq 32s linear infinite;will-change:transform}
.lt-aurora .lt-mq:hover .lt-mqt{animation-play-state:paused}
@keyframes lt-au-mq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.lt-aurora .lt-chip{margin-right:14px;display:flex;align-items:center;gap:10px;padding:8px 16px 8px 8px;border-radius:999px;white-space:nowrap;font-weight:700;font-size:.92rem}
.lt-aurora .lt-chip .lt-cl{width:34px;height:34px;border-radius:50%;overflow:hidden;font-size:.95rem;flex:0 0 auto}
.lt-aurora .lt-chip .lt-cl img{width:100%;height:100%;object-fit:cover}
.lt-aurora.lt-rm .lt-mq{overflow-x:auto}
@media (prefers-reduced-motion:reduce){.lt-aurora .lt-mq{overflow-x:auto}}
.lt-aurora .lt-sec{padding:60px 0 0}
.lt-aurora .lt-h2{font-size:clamp(1.6rem,5vw,2.5rem);font-weight:800;letter-spacing:-.03em;margin-bottom:8px;text-align:center}
.lt-aurora .lt-lead{text-align:center;color:#c7cde6;margin-bottom:26px}
.lt-aurora .lt-sec>.lt-h2{margin-bottom:22px}
.lt-aurora .lt-sec>.lt-h2+.lt-lead{margin-top:-14px}
.lt-aurora .lt-gridp{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:16px}
.lt-aurora .lt-ac{position:relative;border-radius:24px;padding:20px;display:flex;flex-direction:column;gap:12px;transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s;overflow:hidden}
.lt-aurora .lt-ac::before{content:"";position:absolute;top:-60px;right:-60px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,var(--pc,var(--lt-primary)) 0%,transparent 70%);opacity:.45;pointer-events:none}
@media (hover:hover){.lt-aurora .lt-ac:hover{transform:translateY(-6px)}}
.lt-aurora .lt-ah{display:flex;align-items:center;gap:12px;position:relative;min-width:0}
.lt-aurora .lt-pl{width:56px;height:56px;border-radius:16px;overflow:hidden;flex:0 0 auto;font-size:1.5rem;box-shadow:0 8px 20px rgba(0,0,0,.3)}
.lt-aurora .lt-pl img{width:100%;height:100%;object-fit:cover}
.lt-aurora .lt-ah h3{font-size:1.1rem;font-weight:800;line-height:1.2;overflow-wrap:anywhere}
.lt-aurora .lt-type{display:inline-block;margin-top:4px;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.14);color:#fff}
.lt-aurora .lt-badge{align-self:flex-start;position:relative;font-size:.72rem;font-weight:800;padding:5px 12px;border-radius:999px;background:var(--lt-accent);color:var(--lt-on-accent);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lt-aurora .lt-pimg{width:100%;height:120px;object-fit:cover;border-radius:16px}
.lt-aurora .lt-feat{display:grid;gap:7px;font-size:.9rem;color:#dfe3f5;position:relative}
.lt-aurora .lt-feat li{display:flex;gap:8px;align-items:flex-start;overflow-wrap:anywhere;min-width:0}
.lt-aurora .lt-feat li::before{content:"";flex:0 0 16px;height:16px;margin-top:3px;border-radius:50%;background:var(--aA);-webkit-mask:radial-gradient(circle,#000 34%,transparent 36%);mask:radial-gradient(circle,#000 34%,transparent 36%)}
.lt-aurora .lt-price{margin-top:auto;display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;position:relative}
.lt-aurora .lt-price b{font-size:2rem;font-weight:800;letter-spacing:-.03em}
.lt-aurora .lt-price s{color:#a3abc8}
.lt-aurora .lt-price small{color:#c7cde6;font-size:.82rem}
.lt-aurora .lt-buy{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:999px;font-weight:800;background:#fff;color:#0b0d1d;transition:transform .2s,background .2s,color .2s}
.lt-aurora .lt-buy svg{width:18px;height:18px}
.lt-aurora .lt-buy:hover{background:var(--lt-primary);color:var(--lt-on-primary);transform:scale(1.02)}
.lt-aurora .lt-cls{display:flex;padding-left:6px}
.lt-aurora .lt-cls .lt-pl{width:46px;height:46px;border-radius:50%;margin-left:-8px;box-shadow:0 0 0 3px rgba(20,24,50,.9);font-size:1.1rem}
.lt-aurora .lt-cnames{font-size:.82rem;color:#c7cde6;overflow-wrap:anywhere;position:relative}
.lt-aurora .lt-combo{background:linear-gradient(150deg,rgba(255,255,255,.14),rgba(255,255,255,.04)),var(--glass)}
.lt-aurora .lt-ac h3{position:relative}
.lt-aurora .lt-ben li{border-radius:18px;padding:16px}
.lt-aurora .lt-ck{background:var(--lt-accent);color:var(--lt-on-accent)}
.lt-aurora .lt-ben,.lt-aurora .lt-pay{max-width:980px;margin:0 auto}
.lt-aurora .lt-pay{justify-content:center}
.lt-aurora .lt-pay span{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18)}
.lt-aurora .lt-faq{max-width:760px;margin:0 auto}
.lt-aurora .lt-faq details{background:var(--glass);border:1px solid rgba(255,255,255,.14)}
.lt-aurora .lt-lk{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2)}
.lt-aurora .lt-lk:hover{background:#fff;color:#0b0d1d}
.lt-aurora .lt-foot{position:relative;z-index:1;margin-top:60px;color:#c7cde6;opacity:1}
.lt-aurora.lt-js .lt-rv{transform:translateY(30px) scale(.97)}
.lt-aurora.lt-js .lt-rv.lt-in{transform:none}
@media (max-width:420px){.lt-aurora .lt-topcta span{display:none}.lt-aurora .lt-hbtns>*{flex:1 1 100%}.lt-aurora .lt-stat span{font-size:.7rem}}
/* cabecera tipo perfil */
.lt-aurora .lt-hero.lt-hero-p{padding-top:clamp(28px,6vh,60px)}
.lt-aurora .ltp-cover{border-radius:0 0 28px 28px;box-shadow:0 20px 50px rgba(0,0,0,.3),inset 0 0 0 1px rgba(255,255,255,.14)}
.lt-aurora .ltp-name{letter-spacing:-.02em;font-weight:800}
.lt-aurora .ltp-btn{box-shadow:0 14px 34px rgba(0,0,0,.35)}
.lt-aurora .ltp-social{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2)}
/* nivel 'max': más manchas de aurora */
.lt-aurora .lt-abg b:nth-child(5){--c:var(--lt-accent);top:22%;left:20%;opacity:.3;animation-duration:18s}
.lt-aurora .lt-abg b:nth-child(6){--c:#ffb547;top:48%;right:-30vmax;opacity:.22;animation-name:lt-au-f2;animation-duration:20s}
.lt-aurora .lt-abg b:nth-child(7){--c:#ff4fb8;top:80%;left:-20vmax;opacity:.26;animation-duration:24s}
`;

  // Contador animado (requestAnimationFrame) que se cancela en la limpieza.
  function countUp(root, el, ctx) {
    const target = Number(el.getAttribute('data-n'));
    if (!Number.isFinite(target) || target <= 0 || ctx.reducedMotion || typeof W.requestAnimationFrame !== 'function') return;
    const suffix = el.getAttribute('data-s') || '';
    const t0 = (W.performance && W.performance.now) ? W.performance.now() : Date.now();
    const dur = 1200;
    let raf = 0;
    const step = now => {
      const k = Math.min(1, ((now || Date.now()) - t0) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
      if (k < 1) raf = W.requestAnimationFrame(step);
    };
    el.textContent = '0' + suffix;
    raf = W.requestAnimationFrame(step);
    addCleanup(root, () => { if (raf && W.cancelAnimationFrame) W.cancelAnimationFrame(raf); });
  }

  function auroraRender(root, data, ctx) {
    LC.injectCss('aurora', AURORA_CSS);
    prepareRoot(root, data, ctx);
    const esc = ctx.esc;
    const plans = visiblePlans(data);
    const combos = visibleCombos(data);
    const mainHref = ctx.buy('');
    const heroTitle = data.heroTitle || LC.DEFAULTS.heroTitle;
    const heroSub = data.heroSubtitle || LC.DEFAULTS.heroSubtitle;

    // Estadísticas: plataformas, opciones y precio más bajo.
    const prices = plans.map(p => Number(String(p.price).replace(',', '.'))).concat(combos.map(c => Number(String(c.price).replace(',', '.'))))
      .filter(n => Number.isFinite(n) && n > 0);
    const minPrice = prices.length ? ctx.money(Math.min.apply(null, prices)) : '';
    const nPlat = data.platforms.length;
    const nOpt = plans.length + combos.length;
    const stats = [];
    if (nPlat) stats.push(`<div class="lt-stat lt-glass"><b data-n="${nPlat}" data-s="+">${nPlat}+</b><span>${nPlat === 1 ? 'plataforma' : 'plataformas'}</span></div>`);
    if (nOpt) stats.push(`<div class="lt-stat lt-glass"><b data-n="${nOpt}">${nOpt}</b><span>${nOpt === 1 ? 'opción' : 'planes y combos'}</span></div>`);
    if (minPrice) stats.push(`<div class="lt-stat lt-glass"><b>${esc(minPrice)}</b><span>precio desde</span></div>`);
    const statsHtml = stats.length ? `<div class="lt-stats lt-rv" style="grid-template-columns:repeat(${stats.length},minmax(0,1fr))">${stats.join('')}</div>` : '';

    // Marquesina infinita de logos (se repite para llenar y se duplica para el bucle).
    let mq = '';
    if (nPlat) {
      let ids = data.platforms.slice();
      while (ids.length < 8) ids = ids.concat(data.platforms);
      const chips = ids.map(id => `<span class="lt-chip lt-glass">${platLogo(ctx, id, 'lt-cl')}${esc(ctx.platformInfo(id).name)}</span>`).join('');
      mq = `<section class="lt-mq" aria-label="Plataformas disponibles"><div class="lt-mqt">${chips}<span style="display:contents" aria-hidden="true">${chips}</span></div></section>`;
    }

    const planCards = plans.map((p, i) => {
      const v = planView(ctx, p);
      return `<article class="lt-ac lt-glass lt-rv" data-lt-card style="--pc:${v.color};--i:${i % 4}">
        ${v.badge ? `<span class="lt-badge">${v.badge}</span>` : ''}
        <div class="lt-ah">${platLogo(ctx, p.platform, 'lt-pl')}<div style="min-width:0"><h3>${v.title}</h3><span class="lt-type">${v.type}</span></div></div>
        ${v.image ? `<img class="lt-pimg" src="${v.image}" alt="" loading="lazy" decoding="async">` : ''}
        ${v.features ? `<ul class="lt-feat">${v.features}</ul>` : ''}
        <div class="lt-price"><b>${v.price}</b>${v.old ? `<s>${v.old}</s>` : ''}<small>/ ${v.period}</small></div>
        ${btn(ctx, v.href, `${WA_ICON}Comprar`, 'lt-buy', `Comprar ${ctx.planTitle(p)}`)}</article>`;
    }).join('');

    const comboCards = combos.map((c, i) => {
      const v = comboView(ctx, c);
      return `<article class="lt-ac lt-glass lt-combo lt-rv" data-lt-card style="--pc:${v.colors[0] || '#7C3AED'};--i:${i % 4}">
        ${v.badge ? `<span class="lt-badge">${v.badge}</span>` : ''}
        <div class="lt-cls">${c.platforms.map(x => platLogo(ctx, x, 'lt-pl')).join('')}</div>
        <h3>${v.name}</h3><p class="lt-cnames">${v.names}</p>
        <div class="lt-price"><b>${v.price}</b>${v.old ? `<s>${v.old}</s>` : ''}<small>/ ${v.period}</small></div>
        ${btn(ctx, v.href, `${WA_ICON}Comprar combo`, 'lt-buy', `Comprar ${c.name}`)}</article>`;
    }).join('');

    root.innerHTML = profileTop(ctx) + `
      <div class="lt-abg" aria-hidden="true"><b></b><b></b><b></b><b></b>${ctx.motion === 'max' ? '<b></b><b></b><b></b>' : ''}</div>
      ${ctx.profileMode ? '' : `<header class="lt-top lt-glass">${brandMark(data, ctx, 'lt-brand')}
        <div class="lt-bname"><b>${esc(data.name)}</b>${data.tagline ? `<small>${esc(data.tagline)}</small>` : ''}</div>
        ${mainHref ? btn(ctx, mainHref, `${WA_ICON}<span>Escríbenos</span>`, 'lt-topcta', 'Escríbenos por WhatsApp') : ''}</header>`}
      <section class="lt-hero${ctx.profileMode ? ' lt-hero-p' : ''}">
        <span class="lt-pill lt-glass"><i aria-hidden="true"></i>Atención inmediata por WhatsApp</span>
        <h1>${esc(heroTitle)}</h1><p class="lt-sub">${esc(heroSub)}</p>
        <div class="lt-hbtns">${btn(ctx, mainHref, `${WA_ICON}${esc(data.ctaText)}`, 'lt-b1')}
          ${nOpt ? `<a class="lt-b2 lt-glass" href="#lt-a-${plans.length ? 'planes' : 'combos'}">Ver planes</a>` : ''}</div>
        ${data.coverUrl && !ctx.profileMode ? `<div class="lt-cover lt-glass"><img src="${esc(data.coverUrl)}" alt="" fetchpriority="high" decoding="async"></div>` : ''}
        ${statsHtml}
      </section>
      ${mq}
      <main class="lt-wrap">
        ${plans.length ? `<section class="lt-sec" id="lt-a-planes" aria-label="Planes"><h2 class="lt-h2 lt-rv">Elige tu plan</h2><p class="lt-lead lt-rv">Paga solo lo que vas a ver. Activación rápida.</p><div class="lt-gridp">${planCards}</div></section>` : ''}
        ${combos.length ? `<section class="lt-sec" id="lt-a-combos" aria-label="Combos"><h2 class="lt-h2 lt-rv">Combos que ahorran</h2><p class="lt-lead lt-rv">Varias plataformas, un solo pago.</p><div class="lt-gridp">${comboCards}</div></section>` : ''}
        ${benefitsHtml(data, ctx, '¿Por qué elegirnos?').replace(/<li class="lt-rv"/g, '<li class="lt-rv lt-glass"')}
        ${payHtml(data, ctx, 'Métodos de pago')}${faqHtml(data, ctx, 'Preguntas frecuentes')}${linksHtml(data, ctx, 'Síguenos')}
      </main>${footerHtml(data, ctx)}${fabHtml(data, ctx)}`;

    root.querySelectorAll('a[href^="#lt-"]').forEach(a => a.addEventListener('click', ev => {
      const t = root.querySelector(a.getAttribute('href'));
      if (t && t.scrollIntoView) { ev.preventDefault(); t.scrollIntoView({ behavior: ctx.reducedMotion ? 'auto' : 'smooth', block: 'start' }); }
    }));
    wireImgFallback(root);
    setupReveal(root, ctx, el => {
      if (el.classList.contains('lt-stats')) el.querySelectorAll('b[data-n]').forEach(b => countUp(root, b, ctx));
    });
  }

  LC.registerTemplate({
    id: 'aurora', name: 'Aurora',
    description: 'Degradado aurora animado, tarjetas de vidrio y marquesina de plataformas',
    tags: ['oscuro', 'animada', 'elegante'],
    preview: { bg: '#070a1a', fg: '#f4f6ff', accent: '#8b5cf6' },
    render: auroraRender
  });
})(typeof window !== 'undefined' ? window : globalThis);
