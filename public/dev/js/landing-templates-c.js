/* Diseños Streaming · Landings de revendedores
 * Plantillas C: "bio" (link-in-bio para TikTok / Instagram).
 * La más simple y ligera: cabecera tipo perfil SIEMPRE, botones grandes por plan,
 * combos compactos, beneficios en chips, FAQ y redes. Máximo 3 animaciones infinitas propias.
 * Requiere js/landing-core.js (window.LandingCore). Contrato: docs/landings/CONTRATO.md
 */
(function (W) {
  'use strict';
  const LC = W.LandingCore;
  if (!LC) { if (W.console) W.console.error('landing-templates-c: falta LandingCore'); return; }

  const HEX = /^#[0-9a-f]{6}$/i;
  const safeColor = c => HEX.test(String(c || '')) ? String(c) : '#7C3AED';
  function lum(hex) {
    const h = safeColor(hex).slice(1);
    const c = [0, 2, 4].map(i => { const v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  const ink = hex => (lum(hex) > 0.4 ? '#0b0b10' : '#ffffff');

  // Logo de plataforma: imagen (/logos/...) o círculo con inicial. Si la imagen falla, se cambia por la inicial.
  function logo(ctx, id, cls, src) {
    const p = ctx.platformInfo(id);
    const color = safeColor(p.color);
    const ini = ctx.esc((String(p.name || '?').trim().charAt(0) || '?').toUpperCase());
    const url = src || p.logo;
    if (!url) return `<span class="${cls} lb-ini" style="background:${color};color:${ink(color)}" role="img" aria-label="${ctx.esc(p.name)}">${ini}</span>`;
    return `<img class="${cls}" src="${ctx.esc(url)}" alt="${ctx.esc(p.name)}" width="48" height="48" loading="lazy" decoding="async" data-ini="${ini}" data-c="${color}">`;
  }
  function onImgError(e) {
    const img = e.target;
    if (!img || img.tagName !== 'IMG' || !img.getAttribute('data-ini')) return;
    const s = img.ownerDocument.createElement('span');
    const c = safeColor(img.getAttribute('data-c'));
    s.className = img.className + ' lb-ini'; s.style.background = c; s.style.color = ink(c);
    s.setAttribute('role', 'img'); s.setAttribute('aria-label', img.getAttribute('alt') || '');
    s.textContent = img.getAttribute('data-ini');
    img.replaceWith(s);
  }

  const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  const CSS = `
.lt-bio{--lb-bg:#0c0c14;--lb-card:rgba(255,255,255,.07);--lb-line:rgba(255,255,255,.13);--lb-mut:#b9bccd;position:relative;overflow-x:hidden;overflow-x:clip;min-height:100%;
  background:var(--lb-bg);color:#f5f6fb;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;line-height:1.45;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}
.lt-bio *,.lt-bio *::before,.lt-bio *::after{box-sizing:border-box}
.lt-bio img{max-width:100%;display:block}
.lt-bio a{color:inherit;text-decoration:none;-webkit-tap-highlight-color:transparent}
.lt-bio h2,.lt-bio h3,.lt-bio p,.lt-bio ul{margin:0;padding:0}
.lt-bio ul{list-style:none}
.lt-bio :focus-visible{outline:3px solid var(--lt-accent);outline-offset:3px}
/* fondo: degradado suave de los colores de marca (1 animación infinita) */
.lt-bio .lb-bg{position:absolute;inset:0;z-index:-1;overflow:hidden;pointer-events:none}
.lt-bio .lb-bg::before,.lt-bio .lb-bg::after{content:"";position:absolute;width:90vmax;height:90vmax;max-width:1000px;max-height:1000px;border-radius:50%;opacity:.32}
.lt-bio .lb-bg::before{left:-40vmax;top:-30vmax;background:radial-gradient(circle,var(--lt-primary),transparent 62%);animation:lb-drift 24s ease-in-out infinite alternate}
.lt-bio .lb-bg::after{right:-45vmax;top:30%;background:radial-gradient(circle,var(--lt-accent),transparent 62%);opacity:.2}
@keyframes lb-drift{to{transform:translate(14vmax,10vmax) scale(1.1)}}
/* cabecera de perfil (núcleo) adaptada a columna de bio */
.lt-bio .ltp{max-width:620px}
.lt-bio .ltp-cover{height:clamp(130px,36vw,210px)}
@media (min-width:640px){.lt-bio .ltp-cover{margin:14px 14px 0;border-radius:24px}}
.lt-bio .ltp-cover-fx i,.lt-bio .ltp-cover-img{animation:none}
.lt-bio .ltp-body{justify-content:center;text-align:center}
.lt-bio .ltp-info{flex-basis:100%;padding-top:0!important}
.lt-bio .ltp-actions{padding-top:0!important}
.lt-bio .ltp-body{align-items:flex-end!important}
.lt-bio .ltp-name,.lt-bio .ltp-meta,.lt-bio .ltp-actions{justify-content:center}
.lt-bio .ltp-avatar-in{border-color:var(--lb-bg)}
.lt-bio .ltp-social{background:var(--lb-card);border-color:var(--lb-line)}
/* columna */
.lt-bio .lb-col{width:100%;max-width:620px;margin:0 auto;padding:6px 16px 0}
.lt-bio .lb-sec{margin-top:26px}
.lt-bio .lb-h2{font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--lb-mut);margin:0 4px 12px;display:flex;align-items:center;gap:10px}
.lt-bio .lb-h2::after{content:"";flex:1;height:1px;background:var(--lb-line)}
/* filtros (solo con más de 5 productos) */
.lt-bio .lb-filters{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:18px -16px 0;padding:2px 16px}
.lt-bio .lb-filters::-webkit-scrollbar{display:none}
.lt-bio .lb-f{flex:none;min-height:38px;padding:0 16px;border-radius:999px;border:1px solid var(--lb-line);background:var(--lb-card);color:inherit;font:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:background .2s,color .2s,transform .15s}
.lt-bio .lb-f:active{transform:scale(.95)}
.lt-bio .lb-f[aria-pressed="true"]{background:#fff;color:#0c0c14;border-color:#fff}
.lt-bio[data-lb-f="profile"] .lb-item:not([data-k="profile"]),.lt-bio[data-lb-f="full"] .lb-item:not([data-k="full"]),
.lt-bio[data-lb-f="combo"] .lb-plans,.lt-bio[data-lb-f="profile"] .lb-combos,.lt-bio[data-lb-f="full"] .lb-combos{display:none}
/* botones de plan */
.lt-bio .lb-list{display:grid;gap:10px}
.lt-bio .lb-item{position:relative;display:flex;align-items:center;gap:12px;min-height:74px;padding:11px 11px 11px 12px;border-radius:22px;background:var(--lb-card);border:1px solid var(--lb-line);
  transition:transform .2s cubic-bezier(.2,.8,.2,1),border-color .2s,background .2s;animation:lb-in .5s cubic-bezier(.2,.8,.2,1) backwards;animation-delay:calc(min(var(--i,0),10) * 45ms + 150ms)}
@media (hover:hover){.lt-bio .lb-item:hover{transform:translateY(-2px);border-color:var(--pc,var(--lt-primary));background:rgba(255,255,255,.1)}}
.lt-bio .lb-item[data-lt-card]:active{transform:scale(.98)}
.lt-bio .lb-logo{width:48px;height:48px;flex:none;border-radius:14px;object-fit:cover;font-weight:900;font-size:20px}
.lt-bio .lb-ini{display:grid;place-items:center}
.lt-bio .lb-txt{min-width:0;flex:1}
.lt-bio .lb-name{display:block;font-weight:800;font-size:16.5px;line-height:1.2;overflow-wrap:anywhere}
.lt-bio .lb-sub{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin-top:3px;font-size:12.5px;color:var(--lb-mut)}
.lt-bio .lb-badge{font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;background:var(--lt-accent);color:var(--lb-on-a);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lt-bio .lb-price{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:1px;text-align:right}
.lt-bio .lb-price s{font-size:12px;color:var(--lb-mut)}
.lt-bio .lb-pill{display:inline-flex;align-items:center;gap:4px;min-height:40px;padding:0 10px 0 14px;border-radius:14px;background:var(--lt-primary);color:var(--lb-on-p);font-weight:900;font-size:16px;white-space:nowrap}
.lt-bio .lb-pill svg{width:16px;height:16px}
.lt-bio .lb-per{font-size:11px;color:var(--lb-mut)}
.lt-bio .lb-off{opacity:.55;pointer-events:none}
/* combos compactos */
.lt-bio .lb-combos .lb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:10px}
.lt-bio .lb-combo{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:22px;border:1px solid var(--lb-line);
  background:linear-gradient(150deg,color-mix(in srgb,var(--c1) 26%,transparent),transparent 70%),var(--lb-card);
  transition:transform .2s cubic-bezier(.2,.8,.2,1),border-color .2s;animation:lb-in .5s cubic-bezier(.2,.8,.2,1) backwards;animation-delay:calc(min(var(--i,0),10) * 45ms + 250ms)}
@media (hover:hover){.lt-bio .lb-combo:hover{transform:translateY(-2px);border-color:var(--lt-accent)}}
.lt-bio .lb-combo[data-lt-card]:active{transform:scale(.98)}
.lt-bio .lb-ch{display:flex;align-items:center;justify-content:space-between;gap:8px}
.lt-bio .lb-ch h3{font-size:17px;font-weight:900;line-height:1.15;overflow-wrap:anywhere;min-width:0}
.lt-bio .lb-stack{display:flex;flex-wrap:wrap;row-gap:6px;padding-left:6px}
.lt-bio .lb-stack .lb-logo{width:34px;height:34px;border-radius:10px;margin-left:-6px;box-shadow:0 0 0 2px var(--lb-bg);font-size:14px}
.lt-bio .lb-cf{display:flex;align-items:center;justify-content:space-between;gap:10px}
.lt-bio .lb-cnames{font-size:12.5px;color:var(--lb-mut);overflow-wrap:anywhere;min-width:0}
/* beneficios en chips de 1 línea */
.lt-bio .lb-chips{display:flex;flex-wrap:wrap;gap:8px}
.lt-bio .lb-chip{display:inline-flex;align-items:center;gap:7px;max-width:100%;padding:8px 13px 8px 9px;border-radius:999px;background:var(--lb-card);border:1px solid var(--lb-line);font-size:13.5px;font-weight:700}
.lt-bio .lb-chip span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lt-bio .lb-chip i{flex:none;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--lt-accent);color:var(--lb-on-a)}
.lt-bio .lb-chip i svg{width:12px;height:12px}
.lt-bio .lb-pays{margin-top:10px;font-size:13px;color:var(--lb-mut);text-align:center;overflow-wrap:anywhere}
.lt-bio .lb-pays b{color:#fff;font-weight:700}
/* FAQ */
.lt-bio .lb-faq{display:grid;gap:8px}
.lt-bio .lb-faq details{border-radius:18px;background:var(--lb-card);border:1px solid var(--lb-line)}
.lt-bio .lb-faq summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;font-weight:700;font-size:15px;overflow-wrap:anywhere}
.lt-bio .lb-faq summary::-webkit-details-marker{display:none}
.lt-bio .lb-faq summary::after{content:"+";flex:none;font-size:22px;line-height:1;color:var(--lb-mut);transition:transform .2s}
.lt-bio .lb-faq details[open] summary::after{transform:rotate(45deg)}
.lt-bio .lb-faq p{padding:0 16px 14px;color:var(--lb-mut);font-size:14px;overflow-wrap:anywhere}
/* redes */
.lt-bio .lb-links{display:grid;gap:8px}
.lt-bio .lb-link{display:flex;align-items:center;justify-content:center;gap:10px;min-height:54px;padding:0 18px;border-radius:999px;background:var(--lb-card);border:1px solid var(--lb-line);font-weight:800;transition:background .2s,transform .15s}
.lt-bio .lb-link svg{width:22px;height:22px;flex:none}
.lt-bio .lb-link:hover{background:rgba(255,255,255,.14)}
.lt-bio .lb-link:active{transform:scale(.97)}
.lt-bio .lb-foot{text-align:center;padding:30px 16px 40px;font-size:12.5px;color:var(--lb-mut);overflow-wrap:anywhere}
.lt-bio .lb-foot a{text-decoration:underline;text-underline-offset:3px}
/* botón flotante (escritorio; en móvil lo reemplaza la barra de compra del núcleo) — 1 animación infinita */
.lt-bio .lb-fabw{position:fixed;right:18px;bottom:18px;z-index:50}
.lt-bio.lt-in-preview .lb-fabw{position:sticky;bottom:0;height:0}
.lt-bio.lt-in-preview .lb-fab{position:absolute;right:16px;bottom:16px}
.lt-bio .lb-fab{position:relative;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:#25d366;color:#fff;box-shadow:0 10px 26px rgba(0,0,0,.45)}
.lt-bio .lb-fab svg{width:30px;height:30px;position:relative;z-index:1}
.lt-bio .lb-fab::before{content:"";position:absolute;inset:0;border-radius:50%;background:#25d366;opacity:.5;animation:lb-ping 2.4s ease-out infinite}
@keyframes lb-ping{to{transform:scale(1.8);opacity:0}}
@keyframes lb-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes lb-fade{from{opacity:0}to{opacity:1}}
.lt-bio[data-lt-motion="calm"] .lb-bg::before{animation-fill-mode:both!important}
/* reducir movimiento: solo fundido una vez */
.lt-bio.lb-rm *,.lt-bio.lb-rm *::before,.lt-bio.lb-rm *::after{animation:none!important;transition:none!important}
.lt-bio.lb-rm .lb-item,.lt-bio.lb-rm .lb-combo{animation:lb-fade .4s ease-out both!important}
@media (prefers-reduced-motion:reduce){.lt-bio *,.lt-bio *::before,.lt-bio *::after{animation:none!important;transition:none!important}
  .lt-bio .lb-item,.lt-bio .lb-combo{animation:lb-fade .4s ease-out both!important}}
`;

  function render(root, data, ctx) {
    LC.injectCss('bio', CSS);
    const esc = ctx.esc;
    const plans = ctx.visiblePlans || data.plans.filter(p => p.visible);
    const combos = ctx.visibleCombos || data.combos.filter(c => c.visible);
    root.style.setProperty('--lb-on-p', ink(data.theme.primary));
    root.style.setProperty('--lb-on-a', ink(data.theme.accent));
    if (ctx.reducedMotion) root.classList.add('lb-rm');

    const money = v => ctx.money(v);
    const planItem = (p, i) => {
      const info = ctx.platformInfo(p.platform);
      const price = money(p.price), old = money(p.oldPrice);
      const title = p.title || info.name;
      const text = [ctx.planTitle(p), ctx.typeLabel(p), price, p.period].filter(Boolean).join(' · ');
      const href = ctx.buy(text);
      const tag = href ? `a href="${esc(href)}" target="_blank" rel="noopener"` : 'div';
      const close = href ? 'a' : 'div';
      return `<${tag} class="lb-item${href ? '' : ' lb-off'}" data-lt-card data-k="${p.type === 'full' ? 'full' : 'profile'}" style="--i:${i};--pc:${safeColor(info.color)}" aria-label="${esc(`Pedir ${ctx.planTitle(p)} ${price || ''}`.trim())}">` +
        logo(ctx, p.platform, 'lb-logo', p.imageUrl) +
        `<span class="lb-txt"><span class="lb-name">${esc(title)}</span><span class="lb-sub"><span>${esc(ctx.typeLabel(p))}</span>${p.badge ? `<span class="lb-badge">${esc(p.badge)}</span>` : ''}</span></span>` +
        `<span class="lb-price">${old ? `<s>${esc(old)}</s>` : ''}<span class="lb-pill">${esc(price || 'Consultar')}${ARROW}</span>${price && p.period ? `<span class="lb-per">${esc(p.period)}</span>` : ''}</span></${close}>`;
    };
    const comboCard = (c, i) => {
      const names = c.platforms.map(x => ctx.platformInfo(x).name);
      const price = money(c.price), old = money(c.oldPrice);
      const href = ctx.buy([`${c.name} (${names.join(' + ')})`, price, c.period].filter(Boolean).join(' · '));
      const tag = href ? `a href="${esc(href)}" target="_blank" rel="noopener"` : 'div';
      const close = href ? 'a' : 'div';
      return `<${tag} class="lb-combo${href ? '' : ' lb-off'}" data-lt-card style="--i:${i};--c1:${safeColor(ctx.platformInfo(c.platforms[0]).color)}">` +
        `<span class="lb-ch"><h3>${esc(c.name)}</h3>${c.badge ? `<span class="lb-badge">${esc(c.badge)}</span>` : ''}</span>` +
        `<span class="lb-stack">${c.platforms.map(x => logo(ctx, x, 'lb-logo')).join('')}</span>` +
        `<span class="lb-cf"><span class="lb-cnames">${esc(names.join(' + '))}</span><span class="lb-price">${old ? `<s>${esc(old)}</s>` : ''}<span class="lb-pill">${esc(price || 'Consultar')}${ARROW}</span></span></span></${close}>`;
    };

    const total = plans.length + combos.length;
    const hasFull = plans.some(p => p.type === 'full'), hasProf = plans.some(p => p.type !== 'full');
    const filters = total > 5 ? [['all', 'Todos'], hasProf && hasFull ? ['profile', 'Perfiles'] : null, hasProf && hasFull ? ['full', 'Cuentas completas'] : null, combos.length && plans.length ? ['combo', 'Combos'] : null]
      .filter(Boolean) : [];
    const filtersHtml = filters.length > 2 ? `<div class="lb-filters" role="group" aria-label="Filtrar">${filters.map(([k, l], i) => `<button type="button" class="lb-f" data-f="${k}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div>` : '';

    const wa = data.whatsapp ? ctx.buy('') : '';
    const pays = data.paymentMethods.length ? `<p class="lb-pays">Pagos: ${data.paymentMethods.map(p => `<b>${esc(p)}</b>`).join(' · ')}</p>` : '';
    root.innerHTML =
      `<div class="lb-bg" aria-hidden="true"></div>` +
      ctx.profileHeader() +
      `<main class="lb-col">${filtersHtml}` +
      (plans.length ? `<section class="lb-sec lb-plans" aria-label="Planes"><h2 class="lb-h2">Planes</h2><div class="lb-list">${plans.map(planItem).join('')}</div></section>` : '') +
      (combos.length ? `<section class="lb-sec lb-combos" aria-label="Combos"><h2 class="lb-h2">Combos</h2><div class="lb-grid">${combos.map(comboCard).join('')}</div></section>` : '') +
      (data.benefits.length || pays ? `<section class="lb-sec" aria-label="Beneficios">${data.benefits.length ? `<ul class="lb-chips">${data.benefits.map(b => `<li class="lb-chip"><i>${CHECK}</i><span>${esc(b)}</span></li>`).join('')}</ul>` : ''}${pays}</section>` : '') +
      (data.faq.length ? `<section class="lb-sec" aria-label="Preguntas frecuentes"><h2 class="lb-h2">Preguntas</h2><div class="lb-faq">${data.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div></section>` : '') +
      (data.links.length ? `<section class="lb-sec" aria-label="Redes"><h2 class="lb-h2">Síguenos</h2><div class="lb-links">${data.links.map(l => `<a class="lb-link" href="${esc(l.url)}" target="_blank" rel="noopener">${ctx.linkIcon(l.type)}<span>${esc(ctx.linkLabel(l))}</span></a>`).join('')}</div></section>` : '') +
      `</main><footer class="lb-foot" data-lt-foot>${esc(data.name)} · <a href="https://disenosstreaming.com/" target="_blank" rel="noopener">Hecho con Diseños Streaming</a></footer>` +
      (wa ? `<div class="lb-fabw" data-lt-fab><a class="lb-fab" data-lt-btn href="${esc(wa)}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">${ctx.linkIcon('whatsapp')}</a></div>` : '');

    // Listeners solo dentro de root (mueren con innerHTML); se quitan igual en la limpieza.
    const onClick = e => {
      const b = e.target && e.target.closest ? e.target.closest('.lb-f') : null;
      if (!b || !root.contains(b)) return;
      const f = b.getAttribute('data-f');
      if (f === 'all') delete root.dataset.lbF; else root.dataset.lbF = f;
      root.querySelectorAll('.lb-f').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    };
    root.addEventListener('click', onClick);
    root.addEventListener('error', onImgError, true);
    root.__ltCleanup = () => { root.removeEventListener('click', onClick); root.removeEventListener('error', onImgError, true); delete root.dataset.lbF; };
  }

  LC.registerTemplate({
    id: 'bio', name: 'Bio',
    description: 'Link-in-bio para TikTok e Instagram: tu perfil, botones grandes por plan y combos. La más simple y rápida',
    tags: ['oscuro', 'simple', 'ligera'],
    preview: { bg: '#0c0c14', fg: '#f5f6fb', accent: '#7C3AED' },
    render
  });
})(typeof window !== 'undefined' ? window : globalThis);
