/* Diseños Streaming · Plantilla de landing "Neón Lima" (lima): negro con verde lima neón, estilo lanzamiento/evento.
 * Requiere js/landing-core.js (window.LandingCore). Sin dependencias.
 * CSS prefijado con .lt-lima; clases internas ltb- (comunes) y lts- (neón).
 */
(function (G) {
  'use strict';
  const LC = G.LandingCore;
  if (!LC) { if (G.console) G.console.warn('landing-templates-e: falta LandingCore'); return; }

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
    if (img && img.tagName === 'IMG' && img.closest && img.closest('.ltb-cph')) { img.closest('.ltb-cph').remove(); return; }
    // Decoraciones (ramas, regalo): si la imagen no está en el servidor se ocultan, nunca se ve el ícono de imagen rota.
    if (img && img.tagName === 'IMG' && /(^|\s)ltz-(rama|rama2|regalo|frama)(\s|$)/.test(img.className)) { img.style.display = 'none'; return; }
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
  /** Atributo de edición directa (solo en la vista previa del editor; '' en la tienda o con un núcleo viejo). */
  const ed = (ctx, path) => (ctx && typeof ctx.ed === 'function') ? ctx.ed(path) : '';
  /** Marca de producto para las estadísticas de la tienda (data-lt-item, núcleo ronda 6; '' con un núcleo viejo). */
  const itm = (ctx, kind, id) => (ctx && typeof ctx.item === 'function') ? ctx.item(kind, id) : '';
  /** Franja de oferta con cuenta regresiva (solo VIP; '' si no hay promo vigente). Va justo debajo de la cabecera. */
  const promo = ctx => (ctx && ctx.promo && typeof ctx.promoHtml === 'function') ? ctx.promoHtml() : '';
  function btn(ctx, url, label, cls, icon, main, editPath) {
    const inner = `${icon ? ctx.linkIcon('whatsapp') : ''}<span${editPath ? ed(ctx, editPath) : ''}>${ctx.esc(label)}</span>`;
    // data-lt-btn: micro-interacción del núcleo; "main" = botón principal (único con brillo en 'max').
    const mark = main ? 'data-lt-btn="main"' : 'data-lt-btn';
    if (!url) return `<span class="ltb-btn ${cls} is-off" ${mark} aria-disabled="true">${inner}</span>`;
    return `<a class="ltb-btn ${cls}" ${mark} href="${ctx.esc(url)}" target="_blank" rel="noopener">${inner}</a>`;
  }
  function priceHtml(ctx, price, old, period, editPath) {
    const m = ctx.money(price), o = ctx.money(old);
    return `<div class="ltb-price">${o && m ? `<s class="ltb-old"><span class="ltb-sr">Antes </span>${ctx.esc(o)}</s>` : ''}<strong${editPath ? ed(ctx, editPath) : ''}${m ? '' : ' class="ltb-ask"'}>${ctx.esc(m || 'Precio a consultar')}</strong>${m && period ? `<span class="ltb-per">/ ${ctx.esc(period)}</span>` : ''}</div>`;
  }
  function planCard(ctx, p, i, extra = '', short = false) {
    const inf = ctx.platformInfo(p.platform);
    // short: sin " · Cuenta completa" en el título (la etiqueta ya va aparte en .ltb-type)
    const tt = short ? (p.title || inf.name) : ctx.planTitle(p);
    const feats = p.features.length ? `<ul class="ltb-feats">${p.features.map((f, k) => `<li><span${ed(ctx, `plans.${p.id}.features.${k}`)}>${ctx.esc(f)}</span></li>`).join('')}</ul>` : '';
    return `<article class="ltb-card ltb-plan" data-rv data-lt-card${itm(ctx, 'p', p.id)} style="--i:${i % 8};--pc:${safeColor(inf.color)}">${extra}` +
      `${p.badge ? `<span class="ltb-badge">${ctx.esc(p.badge)}</span>` : ''}` +
      `<div class="ltb-card-top">${logoHtml(ctx, p.platform, 'ltb-logo', p.imageUrl, ctx.planTitle(p))}<div class="ltb-meta"><h3 class="ltb-title"${ed(ctx, `plans.${p.id}.title`)}>${ctx.esc(tt)}</h3><span class="ltb-type">${ctx.esc(ctx.typeLabel(p))}</span></div></div>` +
      `${priceHtml(ctx, p.price, p.oldPrice, p.period, `plans.${p.id}.price`)}${feats}${btn(ctx, planBuy(ctx, p), ctx.money(p.price) ? 'Comprar' : 'Consultar', 'ltb-buy', true)}</article>`;
  }
  /** Foto propia del combo (combo.imageUrl, https validada por el núcleo). Sin foto: logos de sus plataformas. */
  const comboPhoto = (ctx, c) => c.imageUrl ? `<figure class="ltb-cph"><img src="${ctx.esc(c.imageUrl)}" alt="${ctx.esc(c.name)}" width="640" height="360" loading="lazy" decoding="async"></figure>` : '';
  function comboCard(ctx, c, i, extra = '', cls = '') {
    const names = c.platforms.map(x => ctx.platformInfo(x).name);
    return `<article class="ltb-card ltb-combo ${cls}${c.imageUrl ? ' has-ph' : ''}" data-rv data-lt-card${itm(ctx, 'c', c.id)} style="--i:${i % 8}">${extra}` +
      `${c.badge ? `<span class="ltb-badge">${ctx.esc(c.badge)}</span>` : ''}` +
      comboPhoto(ctx, c) +
      `<h3 class="ltb-title"${ed(ctx, `combos.${c.id}.name`)}>${ctx.esc(c.name)}</h3>` +
      (c.imageUrl ? '' : `<div class="ltb-logos">${c.platforms.map(x => logoHtml(ctx, x, 'ltb-logo')).join('')}</div>`) +
      `<p class="ltb-incl">${ctx.esc(names.join(' + '))}</p>` +
      `${priceHtml(ctx, c.price, c.oldPrice, c.period, `combos.${c.id}.price`)}${btn(ctx, comboBuy(ctx, c), ctx.money(c.price) ? 'Comprar combo' : 'Consultar', 'ltb-buy', true)}</article>`;
  }
  function header(ctx, d, wa) {
    const mark = d.logoUrl
      ? `<img src="${ctx.esc(d.logoUrl)}" alt="" width="42" height="42" decoding="async">`
      : `<span class="ltb-mono" aria-hidden="true">${ctx.esc((d.name.trim().charAt(0) || 'S').toUpperCase())}</span>`;
    return `<header class="ltb-head"><div class="ltb-brand">${mark}<b${ed(ctx, 'name')}>${ctx.esc(d.name)}</b></div>` +
      `${wa ? `<a class="ltb-headcta" data-lt-btn href="${ctx.esc(wa)}" target="_blank" rel="noopener">${ctx.linkIcon('whatsapp')}<span>WhatsApp</span></a>` : ''}</header>`;
  }
  const sec = (kind, title, body) => `<section class="ltb-sec ltb-sec-${kind}"><div class="ltb-wrap">${title ? `<h2 class="ltb-h2" data-rv>${title}</h2>` : ''}${body}</div></section>`;
  const benefitsSec = (ctx, d, t) => !d.benefits.length ? '' : sec('benefits', t, `<ul class="ltb-bens">${d.benefits.map((b, i) => `<li data-rv style="--i:${i}"><span class="ltb-bn" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span${ed(ctx, `benefits.${i}`)}>${ctx.esc(b)}</span></li>`).join('')}</ul>`);
  const paysSec = (ctx, d, t) => !d.paymentMethods.length ? '' : sec('pays', t, `<ul class="ltb-pays" data-rv>${d.paymentMethods.map((p, i) => `<li${ed(ctx, `paymentMethods.${i}`)}>${ctx.esc(p)}</li>`).join('')}</ul>`);
  const faqSec = (ctx, d, t) => !d.faq.length ? '' : sec('faq', t, `<div class="ltb-faq">${d.faq.map((f, i) => `<details data-rv style="--i:${i}"><summary><span${ed(ctx, `faq.${i}.q`)}>${ctx.esc(f.q)}</span></summary><p${ed(ctx, `faq.${i}.a`)}>${ctx.esc(f.a)}</p></details>`).join('')}</div>`);
  const linksSec = (ctx, d, t) => !d.links.length ? '' : sec('links', t, `<div class="ltb-links" data-rv>${d.links.map(l => `<a class="ltb-link" href="${ctx.esc(l.url)}" target="_blank" rel="noopener">${ctx.linkIcon(l.type)}<span>${ctx.esc(ctx.linkLabel(l))}</span></a>`).join('')}</div>`);
  /** Reseñas: tarjetas con estrellas, texto y nombre. Carrusel con snap en celular, grilla en PC.
   *  ANIM: el carril (no cada tarjeta) lleva data-rv; las tarjetas entran escalonadas desde la derecha
   *  (sugiere deslizar) y las estrellas se encienden una a una. Las tarjetas fuera de pantalla en
   *  horizontal ya no se quedan invisibles esperando al observer. */
  function reviewsHtml(ctx, d, rv = true) {
    return `<div class="ltb-revs"${rv ? ' data-rv' : ''}>${d.reviews.map((r, i) => {
      const s = Math.min(5, Math.max(1, Math.round(Number(r.stars)) || 5));
      const nm = r.name || 'Cliente';
      // Reseña de ejemplo: solo llega aquí en la vista previa del editor (el núcleo la quita de la tienda).
      const smp = false; // las reseñas de ejemplo se muestran como cualquier otra
      return `<figure class="ltb-rev${smp ? ' is-sample' : ''}" style="--i:${Math.min(i, 5)}">${smp ? '<span class="ltb-rsample">Ejemplo — no se publica</span>' : ''}` +
        `<span class="ltb-stars" role="img" aria-label="${s} de 5 estrellas">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= s ? 'on' : ''}" style="--k:${k - 1}" aria-hidden="true">★</i>`).join('')}</span>` +
        `<blockquote class="ltb-rq"><p${ed(ctx, `reviews.${i}.text`)}>${ctx.esc(r.text)}</p></blockquote>` +
        `<figcaption class="ltb-rby"><span class="ltb-rav" aria-hidden="true">${ctx.esc((nm.trim().charAt(0) || 'C').toUpperCase())}</span><b${r.name ? ed(ctx, `reviews.${i}.name`) : ''}>${ctx.esc(nm)}</b></figcaption></figure>`;
    }).join('')}</div>`;
  }
  const reviewsSec = (ctx, d, t) => !(d.reviews && d.reviews.length) ? '' : sec('reviews', t, reviewsHtml(ctx, d));
  const footer = (ctx, d, extra = '') => `<footer class="ltb-foot" data-lt-foot>${extra}<p>© ${new Date().getFullYear()} ${ctx.esc(d.name)}</p>${ctx.showBrand === false ? '' : '<p class="ltb-made">Hecho con <a href="https://disenosstreaming.com" target="_blank" rel="noopener">Diseños Streaming</a></p>'}</footer>`;
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
  const heroCta = (ctx, d, wa) => wa ? btn(ctx, wa, d.ctaText, 'ltb-cta', true, true, 'ctaText') : `<button type="button" class="ltb-btn ltb-cta" data-goto="plans">Ver planes</button>`;

  /** Prepara root: variables de contraste, listeners dentro de root y __ltCleanup.
   *  ANIM: en la vista previa del editor, si se repinta la MISMA plantilla/nivel/cabecera (p. ej. tras editar
   *  un texto) la página queda "quieta" (ltb-still): sin entradas, apariciones ni confeti repetidos. */
  function setup(root, ctx, d, id) {
    root.style.setProperty('--ltb-on-p', ink(d.theme.primary));
    root.style.setProperty('--ltb-on-a', ink(d.theme.accent));
    if (ctx.reducedMotion) root.classList.add('ltb-rm');
    if (ctx.preview) root.classList.add('ltb-preview');
    if (ctx.profileMode) root.classList.add('ltb-pm');
    const key = [id, ctx.motion, ctx.profileMode ? 1 : 0].join('|');
    const still = !!ctx.preview && root.__ltbKey === key;
    root.__ltbKey = key;
    if (still) root.classList.add('ltb-still');
    const cleanups = [];
    cleanups.still = still;
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
  /** Aparición al hacer scroll. Sin IntersectionObserver o en la vista previa "quieta": todo visible.
   *  ANIM: escalonado por lote (lo que entra junto a la vez: 0, 70, 140 ms…, máx. 350 ms) en lugar de por índice
   *  fijo (la 6.ª tarjeta ya no espera 450 ms estando a la vista). threshold 0: los bloques muy altos
   *  (40 planes en un panel) también aparecen. */
  function reveal(root, ctx, cleanups) {
    const els = [...root.querySelectorAll('[data-rv]')];
    // Sin VIP (ctx.noMotion): todo visible desde el inicio, sin aparición al hacer scroll.
    if (cleanups.still || ctx.noMotion || typeof G.IntersectionObserver !== 'function') { els.forEach(e => e.classList.add('is-in')); return; }
    root.classList.add('ltb-rv');
    let fired = false;
    const io = new G.IntersectionObserver(entries => {
      fired = true;
      let k = 0;
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.style.setProperty('--rvd', Math.min(k++, 5) * 70 + 'ms');
        en.target.classList.add('is-in'); io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0 });
    els.forEach(e => io.observe(e));
    // Respaldo: si el observer no responde en 2,5 s, se muestra todo (nunca queda contenido invisible).
    const timer = G.setTimeout(() => { if (!fired) els.forEach(e => e.classList.add('is-in')); }, 2500);
    cleanups.push(() => { io.disconnect(); G.clearTimeout(timer); });
  }
  /** ANIM: pausa los bucles (formas, auras, nieve, brillos, partículas propias) de las secciones que no están en
   *  pantalla: clase ltb-off → animation-play-state:paused. Ahorra CPU/GPU y batería en celulares. */
  function pauseOffscreen(root, cleanups, ctx) {
    if ((ctx && ctx.noMotion) || typeof G.IntersectionObserver !== 'function') return;
    const els = root.querySelectorAll('[data-lt-hero],[data-lt-profile],.ltb-sec');
    const io = new G.IntersectionObserver(entries => {
      entries.forEach(en => en.target.classList.toggle('ltb-off', !en.isIntersecting));
    }, { rootMargin: '120px 0px 120px 0px', threshold: 0 });
    els.forEach(e => io.observe(e));
    cleanups.push(() => io.disconnect());
  }
  /** ANIM: onda al tocar botones de compra (confirmación inmediata antes de abrir WhatsApp). Solo transform/opacity.
   *  No en la vista previa (el toque edita el texto) ni con movimiento reducido. */
  function tapRipple(root, ctx, cleanups) {
    if (ctx.preview || ctx.reducedMotion) return;
    const down = e => {
      const b = e.target && e.target.closest ? e.target.closest('.ltb-btn,.ltb-headcta') : null;
      if (!b || !root.contains(b) || b.classList.contains('is-off')) return;
      const r = b.getBoundingClientRect(), s = Math.ceil(Math.max(r.width, r.height) * 2.2);
      const x = (e.clientX || r.left + r.width / 2) - r.left - s / 2, y = (e.clientY || r.top + r.height / 2) - r.top - s / 2;
      const i = b.ownerDocument.createElement('span');
      i.className = 'ltb-rip'; i.setAttribute('aria-hidden', 'true');
      i.style.cssText = `width:${s}px;height:${s}px;left:${x.toFixed(0)}px;top:${y.toFixed(0)}px`;
      b.appendChild(i);
      G.setTimeout(() => i.remove(), 700);
    };
    root.addEventListener('pointerdown', down, { passive: true });
    cleanups.push(() => root.removeEventListener('pointerdown', down));
  }
  /** ANIM: carrusel de reseñas (celular): puntos indicadores y avance automático suave cada 5 s.
   *  Solo si hay desborde horizontal, la sección está en pantalla, la pestaña visible y nadie la tocó.
   *  Se detiene para siempre al primer toque/rueda/foco del usuario, con 'calm' o movimiento reducido,
   *  y mientras se edita un texto en la vista previa. scrollTo smooth + scroll-snap = desplazamiento en el compositor. */
  function reviewsMotion(root, ctx, cleanups) {
    const track = root.querySelector('.ltb-revs');
    if (!track || track.children.length < 2) return;
    const cards = [...track.children];
    const doc = track.ownerDocument;
    const dots = doc.createElement('div');
    dots.className = 'ltb-rdots'; dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = cards.map((_, k) => `<i${k ? '' : ' class="on"'}></i>`).join('');
    track.after(dots);
    if (typeof G.IntersectionObserver !== 'function') return;
    let cur = 0;
    const dio = new G.IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { cur = cards.indexOf(en.target); [...dots.children].forEach((x, k) => x.classList.toggle('on', k === cur)); } });
    }, { root: track, threshold: 0.6 });
    cards.forEach(c => dio.observe(c));
    cleanups.push(() => dio.disconnect());
    if (ctx.reducedMotion || ctx.motion === 'calm') return;
    let timer = 0, stopped = false;
    const stop = () => { stopped = true; G.clearInterval(timer); timer = 0; };
    const tick = () => {
      if (stopped || doc.hidden || track.scrollWidth <= track.clientWidth + 4) return;
      if (root.querySelector('[contenteditable],[data-lt-editing]')) return;
      const next = (cur + 1) % cards.length;
      track.scrollTo({ left: cards[next].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' });
    };
    const vio = new G.IntersectionObserver(entries => {
      const on = entries.some(en => en.isIntersecting);
      if (on && !timer && !stopped) timer = G.setInterval(tick, 5000);
      else if (!on && timer) { G.clearInterval(timer); timer = 0; }
    }, { threshold: 0.5 });
    vio.observe(track);
    const evs = ['pointerdown', 'wheel', 'focusin', 'keydown'];
    evs.forEach(t => track.addEventListener(t, stop, { passive: true }));
    cleanups.push(() => { stop(); vio.disconnect(); evs.forEach(t => track.removeEventListener(t, stop)); });
  }
  /** ANIM: todo el movimiento común tras pintar. */
  function motionKit(root, ctx, cleanups) {
    reveal(root, ctx, cleanups);
    pauseOffscreen(root, cleanups, ctx);
    tapRipple(root, ctx, cleanups);
    reviewsMotion(root, ctx, cleanups);
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
${s} .ltb-price strong.ltb-ask{font-size:20px;line-height:1.15;letter-spacing:0}
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
${s} .ltb-fab::before{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #25D366;animation:ltb-ping-${id} 2.2s 1.6s ease-out 3}
@keyframes ltb-fabin-${id}{from{opacity:0;transform:scale(0) rotate(-90deg)}to{opacity:1;transform:none}}
@keyframes ltb-ping-${id}{from{transform:scale(1);opacity:.85}to{transform:scale(1.75);opacity:0}}
@media (max-width:480px){${s} .ltb-fabwrap{right:12px;bottom:12px}${s} .ltb-fab{width:52px;height:52px}${s} .ltb-fab svg{width:28px;height:28px}}
${s} .ltb-pays li,${s} .ltb-faq,${s} .ltb-faq summary,${s} .ltb-faq p,${s} .ltb-foot,${s} .ltb-link span,${s} .ltb-incl,${s} .ltb-sub,${s} .ltb-eyebrow,${s} .ltb-price,${s} .ltb-tp b{overflow-wrap:anywhere;min-width:0}
${s} .ltb-pays li{max-width:100%}
${s} .ltb-revs{display:grid;grid-auto-flow:column;grid-auto-columns:min(84%,330px);gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 4px 18px;margin:0 -4px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
@media (min-width:860px){${s} .ltb-revs{grid-auto-flow:row;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-columns:auto;overflow:visible}}
${s} .ltb-rev{margin:0;scroll-snap-align:start;display:flex;flex-direction:column;gap:12px;min-width:0;padding:20px}
${s} .ltb-stars{display:flex;gap:2px;font-size:18px;line-height:1;letter-spacing:0}
${s} .ltb-stars i{font-style:normal;opacity:.25}
${s} .ltb-stars i.on{opacity:1;color:#f5b301}
${s} .ltb-rq{margin:0;flex:1}
${s} .ltb-rq p{margin:0;font-size:15px;line-height:1.5;overflow-wrap:anywhere}
${s} .ltb-rby{display:flex;align-items:center;gap:10px;min-width:0}
${s} .ltb-rby b{min-width:0;overflow-wrap:anywhere}
${s} .ltb-rav{flex:none;display:grid;place-items:center;width:38px;height:38px;border-radius:50%;font-weight:800;background:var(--lt-primary);color:var(--ltb-on-p)}
${s}.ltb-rv [data-rv]:not(.is-in){opacity:0}
${s}.ltb-rv [data-rv].is-in{animation:ltb-up-${id} .65s var(--rvd,0ms) cubic-bezier(.16,1,.3,1) both}
@keyframes ltb-up-${id}{from{opacity:0;translate:0 22px}to{opacity:1;translate:0 0}}
/* ANIM: reseñas — el carril aparece de golpe y sus tarjetas entran escalonadas desde la derecha; las estrellas se encienden una a una */
${s}.ltb-rv .ltb-revs[data-rv].is-in{animation:none}
${s}.ltb-rv .is-in>.ltb-rev,${s}.ltb-rv .is-in .ltb-revs>.ltb-rev{animation:ltb-rin-${id} .6s calc(var(--rvd,0ms) + var(--i,0) * 90ms) cubic-bezier(.16,1,.3,1) both}
${s}.ltb-rv .is-in .ltb-stars i.on{animation:ltb-star-${id} .45s calc(var(--rvd,0ms) + var(--i,0) * 90ms + 320ms + var(--k,0) * 60ms) cubic-bezier(.3,1.6,.5,1) both}
@keyframes ltb-rin-${id}{from{opacity:0;translate:32px 0}to{opacity:1;translate:0 0}}
@keyframes ltb-star-${id}{from{opacity:0;scale:.3}to{opacity:1;scale:1}}
${s} .ltb-rev.is-sample{position:relative;outline:2px dashed rgba(245,158,11,.9);outline-offset:-2px}
${s} .ltb-rev.is-sample>:not(.ltb-rsample){opacity:.45}
${s} .ltb-rsample{align-self:flex-start;display:inline-block;padding:3px 9px;border-radius:999px;background:#f59e0b;color:#1a1204;font:800 11px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.02em}
${s} .ltb-cph{margin:0;border-radius:16px;overflow:hidden;aspect-ratio:16/9;background:rgba(127,127,127,.15)}
${s} .ltb-cph img{width:100%;height:100%;object-fit:cover}
${s} .ltb-rdots{display:flex;justify-content:center;gap:8px;height:8px;margin:2px 0 0}
${s} .ltb-rdots i{width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.22;transition:opacity .3s,transform .3s cubic-bezier(.3,1.6,.5,1)}
${s} .ltb-rdots i.on{opacity:.85;transform:scale(1.35)}
@media (min-width:860px){${s} .ltb-rdots{display:none}}
/* ANIM: micro-interacción al tocar: onda (ltb-rip, creada por JS) + presión rápida (80 ms) y suelta suave */
${s} .ltb-btn,${s} .ltb-headcta{position:relative;overflow:hidden;isolation:isolate}
${s} .ltb-btn>:not(.ltb-rip),${s} .ltb-headcta>:not(.ltb-rip){position:relative;z-index:1}
${s} .ltb-btn:active,${s} .ltb-headcta:active{transition-duration:.08s}
${s} .ltb-rip{position:absolute;z-index:0;border-radius:50%;background:currentColor;pointer-events:none;opacity:0;transform:scale(0);animation:ltb-rip-${id} .6s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes ltb-rip-${id}{0%{opacity:.3;transform:scale(0)}100%{opacity:0;transform:scale(1)}}
/* ANIM: bucles en pausa cuando su sección no está en pantalla (clase ltb-off, IntersectionObserver). Lista cerrada de
   elementos con bucle (no '*'): no congela entradas a medias y el cambio de clase no recalcula estilos de toda la sección. */
${s} .ltb-off :is(.ltb-s,.ltb-stk,.ltb-cta,.ltb-aura,.ltb-aura2,.ltb-spark i,.ltn-sw,.ltn-glint,.ltn-bokeh i,.ltn-snow3,.ltn-tile,.ltp-cover-fx i,.ltp-cover-img,.ltp-ring),${s} .ltb-off :is(.ltn-snow,.ltb-cta,.ltp-online i)::before,${s} .ltb-off :is(.ltn-snow,[data-lt-btn="main"],.ltp-online i)::after{animation-play-state:paused!important}
/* ANIM: vista previa — repintado tras editar: nada vuelve a entrar (todas las entradas ya terminadas; los bucles siguen) */
${s}.ltb-still *,${s}.ltb-still *::before,${s}.ltb-still *::after{animation-delay:-30s!important}
/* ANIM: texto en edición quieto y legible: sin animaciones ni transiciones en él ni en sus contenedores,
   y sin elevar/inclinar tarjetas ni botones bajo el cursor en la vista previa */
${s} [contenteditable],${s} [data-lt-editing],${s} :has(>[contenteditable]),${s} [data-lt-card]:has([contenteditable]),${s} .ltb-hero-txt:has([contenteditable])>*{animation:none!important;transition:none!important}
${s}.ltb-preview [data-lt-card]:is(:hover,:active,:focus-within),${s} [data-lt-card]:has([contenteditable]){transform:none!important;rotate:var(--rot,0deg)!important}
${s}.ltb-preview .ltb-btn:has([data-lt-edit]):is(:hover,:active),${s} .ltb-btn:has([contenteditable]){transform:none!important;translate:none!important}
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
  // NEÓN — negro con verde lima neón (estilo lanzamiento de curso/evento): luces de estadio verdes,
  // franja lima a todo el ancho, tarjetas gris carbón con íconos lima, tarjeta de precio con borde que brilla,
  // insignia circular que gira y espacio para un personaje (PNG recortado).
  // =====================================================================
  const NE_IMG = (() => {
    try { const s = G.document && G.document.currentScript && G.document.currentScript.src; if (s) return new URL('img/', s).href; } catch (_) {}
    return '/js/img/';
  })();
  // Personajes (PNG/webp con fondo transparente). Vacíos = se muestra el cuadro con X para reemplazar.
  const NE_PERSON = '';       // portada (a la derecha del título)
  const NE_PERSON2 = 'ne-duo2.webp'; // sección "¿Quién te atiende?" (a color, sobre un escenario lima)
  const NE_I = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    zap: '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
    headset: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    gift: '<path d="M12 7v14"/><path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"/><rect x="3" y="7" width="18" height="4" rx="1"/>',
    card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'
  };
  const nei = (k, cls = 'lts-ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NE_I[k]}</svg>`;
  /** Resalta en lima las últimas palabras de un título (como "e bem pago do mercado!" en la referencia). */
  function neAccent(ctx, text, n) {
    const w = String(text || '').trim().split(/\s+/);
    if (w.length < 3) return `<span class="lts-hl">${ctx.esc(w.join(' '))}</span>`;
    const k = Math.min(n, w.length - 1);
    return `${ctx.esc(w.slice(0, -k).join(' '))} <span class="lts-hl">${ctx.esc(w.slice(-k).join(' '))}</span>`;
  }
  /** Cuadro para el personaje: imagen si existe; si no, marco con X (para reemplazar). */
  const neSlot = (src, cls, label) => src
    ? `<img class="lts-person ${cls}" src="${NE_IMG}${src}" alt="" width="900" height="1100" decoding="async">`
    : `<div class="lts-slot ${cls}" role="img" aria-label="${label}"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0L100 100M100 0L0 100" stroke="currentColor" stroke-width=".6" vector-effect="non-scaling-stroke"/></svg><span>${label}</span></div>`;
  /** Texto del aro que gira: nombre corto (cortado en una palabra, máx. ~18 letras) para que las letras no se
   *  aprieten con nombres largos ("Inversiones Streaming Premium del Norte" → "INVERSIONES STREAMING"). */
  function neRingText(d, min) {
    const w = String(d.name || 'Streaming').trim().toUpperCase().split(/\s+/);
    let n = w[0].slice(0, 18);
    for (let k = 1; k < w.length && (n + ' ' + w[k]).length <= 18; k++) n += ' ' + w[k];
    const txt = `${n} · ${/^24\s*\/\s*7$/.test(String(d.hours || '24/7').trim()) ? 'STREAMING 24/7' : 'STREAMING'} · `;
    return txt.length < min ? txt + txt : txt;
  }
  /** Insignia circular con texto que gira (como el sello de la referencia). */
  const NE_PLAY = '<svg class="lts-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.6v12.8a.9.9 0 0 0 1.37.77l10.2-6.4a.9.9 0 0 0 0-1.54l-10.2-6.4A.9.9 0 0 0 8.5 5.6z"/></svg>';
  function neBadge(ctx, d) {
    const rep = neRingText(d, 30);
    // En el sello va un "play" (no el logo): el logo ya está en la barra o en la foto de perfil, así no se repite.
    const mark = NE_PLAY;
    return `<div class="lts-badge" aria-hidden="true"><svg class="lts-ring" viewBox="0 0 200 200"><defs><path id="ltsCirc" d="M100 100m-74 0a74 74 0 1 1 148 0a74 74 0 1 1-148 0"/></defs><text><textPath href="#ltsCirc" textLength="462">${ctx.esc(rep.slice(0, 64))}</textPath></text></svg><span class="lts-bc">${mark}</span></div>`;
  }
  /** Lado derecho de la portada:
   *  - "Portada tipo Facebook" (profile) = portada (o un degradado neón si no hay) + foto de perfil redonda encima + sello.
   *  - "Portada normal" (cover) = solo la portada con el sello; sin portada, el sello grande que gira con un "play" al centro
   *    (el logo ya va en la barra de arriba, no se repite ni aparece una foto de perfil grande). */
  function neMedia(ctx, d) {
    const ini = ctx.esc((d.name.trim().charAt(0) || 'S').toUpperCase());
    const av = d.logoUrl ? `<img src="${ctx.esc(d.logoUrl)}" alt="Logo de ${ctx.esc(d.name)}" width="320" height="320" decoding="async" fetchpriority="high">` : `<b aria-hidden="true">${ini}</b>`;
    const ring = `<svg class="lts-ring" viewBox="0 0 200 200" aria-hidden="true"><defs><path id="ltsCircP" d="M100 100m-86 0a86 86 0 1 1 172 0a86 86 0 1 1-172 0"/></defs><text><textPath href="#ltsCircP" textLength="536">${ctx.esc(neRingText(d, 34).slice(0, 70))}</textPath></text></svg>`;
    // "Portada tipo Facebook": portada + foto de perfil redonda encima. "Portada normal": solo la portada (con el sello).
    if (d.coverUrl || ctx.profileMode) {
      const cov = d.coverUrl ? `<figure class="lts-cov"><img src="${ctx.esc(d.coverUrl)}" alt="Portada de ${ctx.esc(d.name)}" width="851" height="315" decoding="async" fetchpriority="high"></figure>`
        : `<figure class="lts-cov is-fx" aria-hidden="true"><i></i><i></i></figure>`;
      return `<div class="lts-media is-cover${ctx.profileMode ? '' : ' is-norm'}">${cov}` +
        `${ctx.profileMode ? `<span class="lts-av">${av}</span>` : ''}${neBadge(ctx, d)}</div>`;
    }
    return `<div class="lts-media is-prof is-mark"><div class="lts-pf">${ring}<span class="lts-av">${NE_PLAY}</span></div></div>`;
  }
  function nePrice(ctx, price, old, period, path, big) {
    const m = ctx.money(price), o = ctx.money(old);
    if (!m) return `<div class="lts-price is-ask"><strong${ed(ctx, path)}>Precio a consultar</strong></div>`;
    return `<div class="lts-price${big ? ' is-big' : ''}">${o ? `<span class="lts-old">De: <s><span class="ltb-sr">Antes </span>${ctx.esc(o)}</s></span>` : ''}<strong data-lts-num${ed(ctx, path)}>${ctx.esc(m)}</strong>${period ? `<small>/ ${ctx.esc(period)}</small>` : ''}</div>`;
  }
  function nePlan(ctx, p, i) {
    const inf = ctx.platformInfo(p.platform), url = planBuy(ctx, p);
    const feats = p.features.length ? `<ul class="lts-feats">${p.features.map((f, k) => `<li${ed(ctx, `plans.${p.id}.features.${k}`)}>${ctx.esc(f)}</li>`).join('')}</ul>` : `<p class="lts-type">${ctx.esc(ctx.typeLabel(p))}</p>`;
    return `<article class="ltb-card lts-card" data-rv data-lt-card${itm(ctx, 'p', p.id)} style="--i:${i % 8}">` +
      `${p.badge ? `<span class="lts-tag">${ctx.esc(p.badge)}</span>` : ''}` +
      `<span class="lts-icon">${logoHtml(ctx, p.platform, 'ltb-logo', p.imageUrl, ctx.planTitle(p))}</span>` +
      `<h3 class="ltb-title"${ed(ctx, `plans.${p.id}.title`)}>${ctx.esc(p.title || inf.name)}</h3>${feats}` +
      `${nePrice(ctx, p.price, p.oldPrice, p.period, `plans.${p.id}.price`)}` +
      `${url ? `<a class="lts-mini" data-lt-btn href="${ctx.esc(url)}" target="_blank" rel="noopener">${ctx.money(p.price) ? 'Pedir ahora' : 'Consultar'} ${nei('down', 'lts-ar')}</a>` : ''}</article>`;
  }
  function neCombo(ctx, c, i, d) {
    const url = comboBuy(ctx, c), names = c.platforms.map(x => ctx.platformInfo(x).name);
    const mark = d.logoUrl ? `<img src="${ctx.esc(d.logoUrl)}" alt="" width="40" height="40" loading="lazy" decoding="async">` : '';
    return `<article class="lts-plan${i === 0 ? ' is-top' : ''}" data-rv data-lt-card${itm(ctx, 'c', c.id)} style="--i:${i % 8}">` +
      `<div class="lts-pbrand">${mark}<b>${ctx.esc(d.name)}</b></div>` +
      (c.imageUrl ? comboPhoto(ctx, c) : `<div class="lts-plogos">${c.platforms.map(x => logoHtml(ctx, x, 'ltb-logo')).join('')}</div>`) +
      `<h3${ed(ctx, `combos.${c.id}.name`)}>${ctx.esc(c.name)}</h3>` +
      `<ul class="lts-incl">${names.map(n => `<li>${ctx.esc(n)}</li>`).join('')}<li>Atención por WhatsApp.</li></ul>` +
      `<p class="lts-bonus">${c.badge ? ctx.esc(c.badge) : 'Activación inmediata y garantía.'}</p>` +
      `${nePrice(ctx, c.price, c.oldPrice, c.period, `combos.${c.id}.price`, true)}` +
      `${url ? `<a class="lts-btn lts-pbtn" data-lt-btn href="${ctx.esc(url)}" target="_blank" rel="noopener"><span>${ctx.money(c.price) ? 'Quiero aprovechar la promoción' : 'Consultar precio'}</span></a>` : ''}` +
      `<ul class="lts-trust"><li>${nei('shield')}<span>Pago<br>seguro</span></li><li>${nei('zap')}<span>Activación<br>inmediata</span></li><li>${nei('headset')}<span>${ctx.hours247 === false ? `Atención<br>${ctx.esc(ctx.hours)}` : 'Soporte<br>24/7'}</span></li></ul></article>`;
  }
  /** Imagen de "¿Quién te atiende?": escenario lima con rejilla, las cabezas salen del marco, luz de borde,
   *  chispas y dos etiquetas flotantes. Sin imagen = cuadro con X. */
  function neWho() {
    if (!NE_PERSON2) return `<div class="lts-wart" data-rv>${neSlot('', '', 'Foto (PNG sin fondo)')}</div>`;
    const sp = [[8, 30, 0], [88, 22, 1.2], [14, 70, 2.1], [92, 62, .6], [50, 8, 1.7], [76, 88, 2.6]];
    return `<div class="lts-wart has-img" data-rv><div class="lts-wstage" aria-hidden="true"><i></i></div>` +
      `<img class="lts-person" src="${NE_IMG}${NE_PERSON2}" alt="" width="760" height="979" loading="lazy" decoding="async">` +
      `<span class="lts-wfloor" aria-hidden="true"></span>` +
      `<span class="lts-wsp" aria-hidden="true">${sp.map(([x, y, d]) => `<i style="left:${x}%;top:${y}%;--d:${d}s"></i>`).join('')}</span>` +
      `<span class="lts-wchip a" aria-hidden="true">${nei('zap')}Activación en minutos</span>` +
      `<span class="lts-wchip b" aria-hidden="true">${nei('headset')}Te atendemos por WhatsApp</span></div>`;
  }
  const neHead = (html, sub) => `<div class="lts-hd" data-rv><h2 class="ltb-h2">${html}</h2>${sub ? `<p>${sub}</p>` : ''}</div>`;

  const NE_LIME = '#b8ff2c';
  const CSS_NEON = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');` + baseCss('lima') + `
.lt-lima{--n-bg:#060805;--n-bg2:#0b0e09;--n-card:#1b1e19;--n-card2:#141712;--n-line:rgba(255,255,255,.08);--n-lime:${NE_LIME};--n-lime2:#8fe000;--n-lime3:#d6ff7a;--n-ink:#0a0d06;--n-tx:#f1f5ea;--n-mut:#a6ad9c;--n-glow:rgba(184,255,44,.42);background:var(--n-bg);color:var(--n-tx);font-family:Montserrat,"Segoe UI",system-ui,-apple-system,Roboto,sans-serif}
.lt-lima .ltb-wrap{max-width:1080px}
.lt-lima .ltb-h1,.lt-lima .ltb-h2,.lt-lima h3{font-weight:800;letter-spacing:-.02em}
.lt-lima .lts-hl{color:var(--n-lime);text-shadow:0 0 22px rgba(184,255,44,.35)}
/* trama de puntos (semitono) en los bordes */
.lt-lima .lts-dots{position:absolute;inset:0;pointer-events:none;background:radial-gradient(rgba(184,255,44,.22) 1px,transparent 1.6px) 0 0/14px 14px;-webkit-mask:radial-gradient(ellipse 60% 70% at 0% 50%,#000,transparent 70%),radial-gradient(ellipse 60% 70% at 100% 50%,#000,transparent 70%);mask:radial-gradient(ellipse 60% 70% at 0% 50%,#000,transparent 70%),radial-gradient(ellipse 60% 70% at 100% 50%,#000,transparent 70%);opacity:.5}
/* portada */
.lt-lima .lts-hero{position:relative;overflow:hidden;padding:22px 0 0;background:
 radial-gradient(ellipse 50% 60% at 74% 46%,rgba(150,255,0,.38),transparent 62%),
 radial-gradient(ellipse 90% 70% at 70% 0%,rgba(110,200,0,.22),transparent 60%),
 radial-gradient(ellipse 120% 90% at 30% 100%,#0d1408,transparent 70%),
 linear-gradient(180deg,#0a1006 0%,#060805 100%)}
.lt-lima .lts-stadium{position:absolute;inset:0;pointer-events:none;opacity:.55;background:
 radial-gradient(3px 3px at 12% 18%,rgba(220,255,160,.9),transparent 70%),radial-gradient(2px 2px at 22% 12%,rgba(220,255,160,.7),transparent 70%),radial-gradient(3px 3px at 36% 8%,rgba(220,255,160,.6),transparent 70%),radial-gradient(2px 2px at 58% 6%,rgba(220,255,160,.7),transparent 70%),radial-gradient(3px 3px at 84% 10%,rgba(220,255,160,.8),transparent 70%),radial-gradient(2px 2px at 94% 22%,rgba(220,255,160,.6),transparent 70%),
 repeating-linear-gradient(100deg,transparent 0 46px,rgba(184,255,44,.035) 46px 48px);filter:blur(.3px)}
.lt-lima .lts-beam{position:absolute;top:-30%;width:28%;height:160%;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(184,255,44,.16),transparent);transform:rotate(18deg);filter:blur(10px)}
.lt-lima .lts-beam.a{left:46%}.lt-lima .lts-beam.b{left:78%;width:18%;opacity:.7}
.lt-lima .lts-top{position:relative;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:12px}
.lt-lima .lts-brand{display:flex;align-items:center;gap:10px;min-width:0}
.lt-lima .lts-brand img,.lt-lima .lts-brand .lts-mono{width:40px;height:40px;border-radius:10px;object-fit:cover;flex:none}
.lt-lima .lts-mono{display:grid;place-items:center;background:var(--n-lime);color:var(--n-ink);font-weight:900;font-size:20px}
.lt-lima .lts-brand b{display:block;font-size:clamp(15px,4.4vw,20px);font-weight:900;letter-spacing:.02em;text-transform:uppercase;color:var(--n-lime);line-height:1;overflow-wrap:anywhere}
.lt-lima .lts-brand small{display:block;margin-top:3px;font-size:11px;color:var(--n-mut);font-weight:600}
.lt-lima .lts-hwa{flex:none;display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:999px;border:1.5px solid rgba(184,255,44,.55);color:var(--n-lime);font-weight:700;font-size:13.5px;text-decoration:none;background:rgba(184,255,44,.06)}
.lt-lima .lts-hwa svg{width:18px;height:18px}
.lt-lima .lts-hin{position:relative;z-index:3;display:grid;align-items:end;gap:10px;margin-top:10px}
@media (min-width:860px){.lt-lima .lts-hin{grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:clamp(28px,4vw,56px);min-height:500px;align-items:center}.lt-lima .lts-htx .ltb-h1{font-size:clamp(34px,4.3vw,58px)}}
@media (max-width:859px){.lt-lima .lts-htx{text-align:center}.lt-lima .lts-htx .ltb-sub{margin-left:auto;margin-right:auto}}
.lt-lima .lts-htx{padding:28px 0 56px;min-width:0;align-self:center}
.lt-lima .ltb-h1{margin:0 0 18px;font-size:clamp(30px,7.4vw,56px);line-height:1.04;overflow-wrap:break-word;text-wrap:balance}
.lt-lima .ltb-sub{margin:0 0 28px;max-width:38ch;font-size:clamp(15px,3.8vw,18px);line-height:1.5;color:#d7dccf}
.lt-lima .lts-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:15px 30px;border-radius:12px;border:0;cursor:pointer;overflow:hidden;color:var(--n-ink);font-weight:800;font-size:clamp(15.5px,4vw,17px);text-decoration:none;background:linear-gradient(180deg,#d4ff6a 0%,${NE_LIME} 45%,#93e400 100%);box-shadow:0 0 0 1px rgba(214,255,122,.6) inset,0 10px 30px rgba(150,255,0,.32),0 0 60px rgba(150,255,0,.18);transition:transform .2s cubic-bezier(.3,1.6,.5,1),box-shadow .2s}
.lt-lima .lts-btn svg{width:20px;height:20px;flex:none}
.lt-lima .lts-btn:hover{transform:translateY(-2px);box-shadow:0 0 0 1px rgba(214,255,122,.8) inset,0 14px 36px rgba(150,255,0,.42),0 0 80px rgba(150,255,0,.25)}
.lt-lima .lts-btn:active{transform:scale(.97)}
.lt-lima .lts-btn::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.65),transparent);transform:skewX(-20deg);pointer-events:none;opacity:0}
.lt-lima .lts-from{margin:16px 0 0;font-size:14px;color:var(--n-mut)}
.lt-lima .lts-from b{color:var(--n-lime);font-size:17px}
.lt-lima .lts-hart{position:relative;align-self:end;justify-self:center;width:min(440px,92%);aspect-ratio:9/11}
@media (max-width:859px){.lt-lima .lts-hart{order:-1;width:min(300px,80%);margin-top:6px}.lt-lima .lts-htx{padding-top:6px}}
.lt-lima .lts-hart::before{content:"";position:absolute;left:8%;right:8%;bottom:4%;height:70%;border-radius:50%;background:radial-gradient(circle,rgba(170,255,40,.55),transparent 66%);filter:blur(18px)}
.lt-lima .lts-person{position:relative;z-index:1;width:100%;height:100%;object-fit:contain;object-position:bottom;filter:drop-shadow(0 20px 40px rgba(0,0,0,.6))}
.lt-lima .lts-slot{position:relative;z-index:1;display:grid;place-items:center;width:100%;height:100%;border:2px dashed rgba(184,255,44,.6);border-radius:18px 18px 0 0;color:rgba(184,255,44,.45);background:rgba(184,255,44,.04)}
.lt-lima .lts-slot svg{position:absolute;inset:0;width:100%;height:100%}
.lt-lima .lts-slot span{position:relative;padding:6px 12px;border-radius:8px;background:#0b0e09;color:var(--n-lime);font-size:12px;font-weight:700;text-align:center}
.lt-lima .lts-badge{position:absolute;z-index:2;right:-2%;bottom:16%;width:clamp(100px,24vw,150px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#13200a,#0a0f06 70%);border:1.5px solid rgba(184,255,44,.6);box-shadow:0 0 30px rgba(150,255,0,.3)}
.lt-lima .lts-ring{position:absolute;inset:0;width:100%;height:100%}
.lt-lima .lts-ring text{fill:var(--n-lime);font-size:15px;font-weight:800;letter-spacing:2.5px}
.lt-lima .lts-bc{position:absolute;inset:27%;display:grid;place-items:center;border-radius:50%;background:var(--n-lime);color:var(--n-ink);overflow:hidden;box-shadow:0 0 18px rgba(184,255,44,.6)}
.lt-lima .lts-bc img{width:100%;height:100%;object-fit:cover}
.lt-lima .lts-bc b{font-weight:900;font-size:clamp(20px,5vw,30px)}
.lt-lima .lts-play{width:46%;height:46%;fill:currentColor;margin-left:6%}
.lt-lima .lts-cov.is-fx{background:radial-gradient(ellipse 60% 90% at 18% 10%,rgba(184,255,44,.55),transparent 60%),radial-gradient(ellipse 50% 80% at 88% 100%,rgba(120,255,0,.35),transparent 65%),linear-gradient(135deg,#1a2a08,#0b1006 55%,#16240a)}
.lt-lima .lts-cov.is-fx i{position:absolute;inset:0;background:linear-gradient(rgba(184,255,44,.07) 1px,transparent 1px) 0 0/22px 22px,linear-gradient(90deg,rgba(184,255,44,.07) 1px,transparent 1px) 0 0/22px 22px}
.lt-lima .lts-cov.is-fx i+i{background:linear-gradient(100deg,transparent 30%,rgba(214,255,122,.16) 48%,transparent 66%)}
/* portada + foto de perfil */
.lt-lima .lts-media{position:relative;justify-self:center;align-self:center;width:100%;max-width:520px;margin:10px 0 40px}
.lt-lima .lts-media::before{content:"";position:absolute;left:5%;right:5%;top:15%;bottom:0;border-radius:50%;background:radial-gradient(circle,rgba(170,255,40,.42),transparent 66%);filter:blur(22px);pointer-events:none}
.lt-lima .lts-cov{position:relative;margin:0;aspect-ratio:851/315;border-radius:18px;overflow:hidden;background:#11160c;border:1.5px solid rgba(184,255,44,.55);box-shadow:0 0 0 6px rgba(184,255,44,.06),0 24px 50px rgba(0,0,0,.6),0 0 50px rgba(150,255,0,.2)}
.lt-lima .lts-cov img{width:100%;height:100%;object-fit:cover}
.lt-lima .lts-cov::after{content:"";position:absolute;top:0;bottom:0;left:-50%;width:30%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-18deg);opacity:0;pointer-events:none}
.lt-lima .lts-av{position:relative;display:grid;place-items:center;border-radius:50%;overflow:hidden;background:var(--n-lime);color:var(--n-ink);font-weight:900}
.lt-lima .lts-av img{width:100%;height:100%;object-fit:cover}
.lt-lima .is-cover .lts-av{position:absolute;left:7%;bottom:-38px;z-index:2;width:clamp(76px,24%,118px);aspect-ratio:1;border:4px solid #0a0d07;box-shadow:0 0 0 2.5px var(--n-lime),0 0 26px rgba(150,255,0,.5),0 12px 24px rgba(0,0,0,.5);font-size:clamp(34px,8vw,48px)}
.lt-lima .is-cover .lts-badge{right:3%;bottom:-42px;top:auto;width:clamp(78px,23%,116px)}
@media (max-width:600px){.lt-lima .is-cover .lts-badge{right:2%}.lt-lima .is-cover .lts-badge .lts-ring text{font-size:16px}}
.lt-lima .lts-pf{position:relative;width:min(360px,78%);aspect-ratio:1;margin:0 auto}
.lt-lima .lts-pf .lts-ring{inset:0}
.lt-lima .lts-pf .lts-ring text{font-size:12.5px;letter-spacing:3px}
.lt-lima .is-prof .lts-av{position:absolute;inset:15%;border:5px solid #0a0d07;box-shadow:0 0 0 3px var(--n-lime),0 0 40px rgba(150,255,0,.55),0 20px 40px rgba(0,0,0,.55);font-size:clamp(56px,14vw,96px)}
.lt-lima .is-prof .lts-pf::after{content:"";position:absolute;inset:10%;border-radius:50%;border:1.5px dashed rgba(184,255,44,.45);pointer-events:none}
@media (max-width:859px){.lt-lima .lts-media{order:-1;max-width:460px;margin:8px auto 46px}.lt-lima .lts-pf{width:min(270px,72%)}.lt-lima .is-prof{margin-bottom:10px}}
/* franja lima */
.lt-lima .lts-band{position:relative;z-index:3;padding:14px 18px;text-align:center;color:var(--n-ink);font-weight:800;font-size:clamp(14px,3.6vw,18px);background:linear-gradient(90deg,#86d600 0%,#b8ff2c 22%,#d8ff7c 50%,#b8ff2c 78%,#86d600 100%);box-shadow:0 0 50px rgba(150,255,0,.35);overflow:hidden}
.lt-lima .lts-band::after{content:"";position:absolute;top:0;bottom:0;left:-30%;width:22%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);opacity:0}
.lt-lima .lts-chev{position:absolute;left:50%;bottom:-17px;z-index:4;display:grid;place-items:center;width:34px;height:34px;margin-left:-17px;border-radius:50%;background:#0b0e09;border:2px solid var(--n-lime);color:var(--n-lime);box-shadow:0 0 16px rgba(184,255,44,.5)}
.lt-lima .lts-chev svg{width:18px;height:18px}
.lt-lima .lts-bandw{position:relative}
/* secciones */
.lt-lima .ltb-sec{padding:clamp(52px,8vw,76px) 0;background:var(--n-bg)}
.lt-lima .ltb-sec-benefits{padding-top:clamp(64px,9vw,84px)}
.lt-lima :is(.ltb-sec-pays,.ltb-sec-faq,.ltb-sec-links){padding:clamp(36px,5vw,48px) 0}
.lt-lima .ltb-sec-pays{padding-top:clamp(52px,8vw,76px)}
.lt-lima .ltb-sec-links{padding-bottom:clamp(52px,8vw,76px)}
.lt-lima .lts-hd{text-align:center;margin:0 0 clamp(26px,4vw,38px)}
.lt-lima .ltb-h2,.lt-lima .lts-ideal h2,.lt-lima .lts-wtx h2{margin:0;font-size:clamp(27px,5.6vw,42px);line-height:1.1;font-weight:600;text-wrap:balance}
.lt-lima .ltb-h2 .lts-hl{font-weight:800}
.lt-lima .lts-hd p{margin:10px auto 0;max-width:52ch;color:var(--n-mut);font-size:15px}
/* ideal para */
.lt-lima .lts-ideal{display:grid;gap:26px;align-items:center}
@media (min-width:820px){.lt-lima .lts-ideal{grid-template-columns:1fr 1fr;gap:40px}}
.lt-lima .lts-ideal h2{margin:0 0 14px;overflow-wrap:anywhere}
.lt-lima .lts-ideal h2 .lts-hl{font-weight:900;text-transform:uppercase}
.lt-lima .lts-ideal p{margin:0;color:var(--n-mut);font-size:15px;line-height:1.6}
.lt-lima .lts-ilist{list-style:none;margin:0;padding:4px 0 4px 22px;border-left:2px solid var(--n-lime);display:grid;gap:16px;position:relative}
.lt-lima .lts-ilist::before{content:"";position:absolute;left:-2px;top:0;bottom:0;width:2px;box-shadow:0 0 14px 1px rgba(184,255,44,.6);pointer-events:none}
.lt-lima .lts-ilist li{display:flex;gap:12px;align-items:flex-start;font-size:15.5px;line-height:1.45;overflow-wrap:anywhere}
.lt-lima .lts-ilist .lts-ic{flex:none;width:20px;height:20px;margin-top:2px;color:var(--n-lime)}
/* planes */
.lt-lima .lts-grid{--cols:4;--gap:16px;display:flex;flex-wrap:wrap;justify-content:center;gap:22px var(--gap)}
.lt-lima .lts-grid>.lts-card{flex:0 0 calc((100% - (var(--cols) - 1) * var(--gap)) / var(--cols));min-width:0}
@media (max-width:1023px){.lt-lima .lts-grid{--cols:3}}
@media (max-width:719px){.lt-lima .lts-grid{--cols:2;--gap:12px}}
.lt-lima .lts-card .lts-price{margin-top:auto;padding-top:4px}
.lt-lima .lts-card{gap:10px;align-items:center;text-align:center;padding:26px 18px 20px;border-radius:14px;background:linear-gradient(180deg,#22251f 0%,#151813 100%);border:1px solid var(--n-line);box-shadow:0 12px 30px rgba(0,0,0,.35);transition:transform .3s cubic-bezier(.3,1.6,.5,1),border-color .3s,box-shadow .3s}
.lt-lima .lts-card:hover{transform:translateY(-5px);border-color:rgba(184,255,44,.55);box-shadow:0 16px 40px rgba(0,0,0,.45),0 0 30px rgba(150,255,0,.15)}
.lt-lima .lts-icon{display:grid;place-items:center;width:72px;height:72px;margin-bottom:6px;border-radius:18px;border:1.5px solid rgba(184,255,44,.55);background:radial-gradient(circle,rgba(184,255,44,.14),transparent 70%);box-shadow:0 0 22px rgba(150,255,0,.18)}
.lt-lima .lts-icon .ltb-logo{width:48px;height:48px;border-radius:12px}
.lt-lima .lts-card .ltb-title{font-size:18px;color:#fff}
@media (max-width:719px){.lt-lima .lts-card{padding:24px 10px 16px;gap:8px}.lt-lima .lts-icon{width:60px;height:60px;border-radius:16px}.lt-lima .lts-icon .ltb-logo{width:40px;height:40px;border-radius:10px}.lt-lima .lts-card .ltb-title{font-size:15.5px}.lt-lima .lts-card .lts-feats,.lt-lima .lts-card .lts-type{font-size:12.5px}.lt-lima .lts-card .lts-price strong{font-size:24px}}
.lt-lima .lts-type,.lt-lima .lts-feats{margin:0;padding:0;list-style:none;color:var(--n-mut);font-size:13.5px;line-height:1.5}
.lt-lima .lts-feats li{overflow-wrap:anywhere}
.lt-lima .lts-price{display:flex;flex-direction:column;align-items:center;gap:2px;margin-top:4px}
.lt-lima .lts-price strong{font-size:28px;font-weight:900;color:var(--n-lime);letter-spacing:-.02em;line-height:1.05;text-shadow:0 0 18px rgba(184,255,44,.3)}
.lt-lima .lts-price.is-ask strong{font-size:16px;font-weight:700}
.lt-lima .lts-price small{font-size:12.5px;color:var(--n-mut)}
.lt-lima .lts-old{font-size:13px;color:var(--n-mut)}
.lt-lima .lts-old s{color:#d7dccf}
.lt-lima .lts-mini{display:inline-flex;align-items:center;gap:4px;margin-top:6px;color:var(--n-lime);font-weight:700;font-size:13.5px;text-decoration:none;border-bottom:1px solid rgba(184,255,44,.4);padding-bottom:2px}
.lt-lima .lts-ar{width:15px;height:15px;transform:rotate(-90deg)}
.lt-lima .lts-tag{position:absolute;z-index:1;top:-11px;left:50%;transform:translateX(-50%);padding:3px 11px;border-radius:999px;background:var(--n-lime);color:var(--n-ink);font-size:11px;font-weight:800;line-height:1.4;white-space:nowrap;max-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis;box-shadow:0 0 16px rgba(184,255,44,.45)}
.lt-lima .lts-cta-row{display:flex;justify-content:center;margin-top:34px}
/* combos: tarjeta de precio */
.lt-lima .lts-plans{display:flex;flex-wrap:wrap;justify-content:center;align-items:stretch;gap:24px 22px}
.lt-lima .lts-plans>.lts-plan{flex:0 0 min(100%,330px);min-width:0}
.lt-lima .lts-plan{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;padding:30px 20px 22px;border-radius:16px;text-align:center;background:radial-gradient(ellipse 80% 40% at 50% 0%,rgba(184,255,44,.10),transparent 70%),linear-gradient(180deg,#1d211a,#121510);border:1.5px solid rgba(184,255,44,.35);box-shadow:0 20px 50px rgba(0,0,0,.5),0 0 40px rgba(150,255,0,.10);isolation:isolate}
.lt-lima .lts-plan.is-top{border-color:transparent;background:radial-gradient(ellipse 80% 40% at 50% 0%,rgba(184,255,44,.14),transparent 70%) padding-box,linear-gradient(180deg,#1d211a,#121510) padding-box,conic-gradient(from var(--lts-a,0deg),#b8ff2c,#2a3a12 25%,#d8ff7c 50%,#2a3a12 75%,#b8ff2c) border-box;box-shadow:0 20px 60px rgba(0,0,0,.55),0 0 60px rgba(150,255,0,.22)}
@property --lts-a{syntax:'<angle>';inherits:false;initial-value:0deg}
.lt-lima .lts-pbrand{display:flex;align-items:center;justify-content:center;gap:8px;max-width:100%;color:var(--n-lime);font-weight:900;letter-spacing:.04em;text-transform:uppercase;font-size:15px;line-height:1.2;text-align:left;overflow-wrap:anywhere}
.lt-lima .lts-pbrand img{flex:none}
.lt-lima .lts-pbrand img{width:28px;height:28px;border-radius:7px;object-fit:cover}
.lt-lima .lts-plogos{display:flex;justify-content:center;margin:4px 0}
.lt-lima .lts-plogos .ltb-logo{width:42px;height:42px;border-radius:50%;border:3px solid #171a14;margin:0 -6px;box-shadow:0 0 0 1px rgba(184,255,44,.35)}
.lt-lima .lts-plan h3{margin:2px 0 0;font-size:21px;color:#fff;overflow-wrap:anywhere}
.lt-lima .lts-incl{list-style:none;margin:0;padding:0;display:grid;gap:7px;color:#d7dccf;font-size:14.5px}
.lt-lima .lts-bonus{margin:4px 0 0;color:var(--n-lime);font-weight:700;font-size:14.5px}
.lt-lima .lts-price.is-big{margin-top:auto;padding-top:10px}
.lt-lima .lts-price.is-big strong{font-size:clamp(46px,12vw,64px);text-shadow:0 0 28px rgba(184,255,44,.45)}
.lt-lima .lts-price.is-big .lts-old{font-size:17px;font-weight:700;color:#fff}
.lt-lima .lts-pbtn{width:100%;margin-top:10px;min-height:52px;padding:13px 14px;font-size:15px}
.lt-lima .lts-pbtn span{line-height:1.25;text-wrap:balance}
.lt-lima .lts-trust{list-style:none;margin:12px 0 0;padding:14px 0 0;width:100%;display:flex;justify-content:space-around;gap:6px;border-top:1px solid var(--n-line)}
.lt-lima .lts-trust li{display:flex;align-items:center;gap:6px;text-align:left;font-size:10.5px;line-height:1.2;color:var(--n-mut)}
.lt-lima .lts-trust span{max-width:14ch;overflow-wrap:anywhere}
.lt-lima .lts-trust .lts-ic{width:18px;height:18px;color:var(--n-lime);flex:none}
.lt-lima .ltb-cph{border-radius:12px;width:100%}
/* reseñas */
.lt-lima .ltb-revs{gap:16px}
.lt-lima .ltb-rev{background:linear-gradient(180deg,#1d201a,#141712);border:1px solid var(--n-line);border-radius:14px}
.lt-lima .ltb-stars i.on{color:var(--n-lime)}
.lt-lima .ltb-rq p{color:#d7dccf}
.lt-lima .ltb-rav{background:var(--n-lime);color:var(--n-ink)}
/* quién te atiende */
.lt-lima .lts-who{display:grid;gap:26px;align-items:center}
@media (min-width:820px){.lt-lima .lts-who{grid-template-columns:.9fr 1.1fr;gap:40px}}
.lt-lima .lts-wart{position:relative;justify-self:center;width:min(380px,84%);aspect-ratio:9/10;margin-right:5%}
.lt-lima .lts-wart::before{content:"";position:absolute;right:-11%;top:11%;width:46%;height:80%;border-radius:0 14px 14px 0;background:linear-gradient(180deg,#f2f5ee,#cfd6c4);clip-path:polygon(30% 0,100% 0,100% 100%,0 100%);opacity:.9}
.lt-lima .lts-wart::after{content:"";position:absolute;left:10%;right:10%;bottom:-6%;height:30%;border-radius:50%;background:radial-gradient(closest-side,rgba(150,255,0,.35),transparent);filter:blur(14px);pointer-events:none}
.lt-lima .lts-wart .lts-person{filter:grayscale(1) contrast(1.05) drop-shadow(0 20px 40px rgba(0,0,0,.6))}
.lt-lima .lts-wart .lts-slot{z-index:1;border-radius:16px;border:1.5px solid rgba(184,255,44,.55);color:rgba(184,255,44,.22);background:radial-gradient(ellipse 70% 55% at 50% 100%,rgba(150,255,0,.16),transparent 70%),linear-gradient(rgba(184,255,44,.05) 1px,transparent 1px) 0 0/24px 24px,linear-gradient(90deg,rgba(184,255,44,.05) 1px,transparent 1px) 0 0/24px 24px,linear-gradient(180deg,#12170d,#0a0d07);box-shadow:0 0 0 6px rgba(184,255,44,.05),0 24px 50px rgba(0,0,0,.55),0 0 40px rgba(150,255,0,.12);overflow:hidden}
.lt-lima .lts-wart .lts-slot span{border:1px solid rgba(184,255,44,.45);border-radius:12px;line-height:1.35;padding:7px 14px;max-width:86%;box-shadow:0 0 18px rgba(0,0,0,.6)}
.lt-lima .lts-wtx .lts-wname{display:inline-flex;align-items:center;gap:8px;margin:0 0 10px;color:var(--n-lime);font-weight:900;text-transform:uppercase;letter-spacing:.06em;font-size:14px}
.lt-lima .lts-wtx h2{margin:0 0 14px}
.lt-lima .lts-wtx p{margin:0 0 12px;color:var(--n-mut);line-height:1.6;font-size:15px}
.lt-lima .lts-wtx .lts-btn{margin-top:10px}
.lt-lima .lts-wart.has-img{aspect-ratio:760/1000;margin:24px 0 0}
.lt-lima .lts-wart.has-img::before,.lt-lima .lts-wart.has-img::after{content:none}
.lt-lima .lts-wstage{position:absolute;left:3%;right:3%;top:24%;bottom:6%;border-radius:22px;overflow:hidden;border:1.5px solid rgba(184,255,44,.5);background:radial-gradient(ellipse 80% 60% at 50% 105%,rgba(150,255,0,.32),transparent 70%),radial-gradient(ellipse 60% 50% at 50% 0%,rgba(184,255,44,.14),transparent 70%),linear-gradient(rgba(184,255,44,.06) 1px,transparent 1px) 0 0/26px 26px,linear-gradient(90deg,rgba(184,255,44,.06) 1px,transparent 1px) 0 0/26px 26px,linear-gradient(180deg,#141b0d,#0a0d07);box-shadow:0 0 0 7px rgba(184,255,44,.05),0 30px 60px rgba(0,0,0,.6),0 0 60px rgba(150,255,0,.16)}
.lt-lima .lts-wstage i{position:absolute;top:0;bottom:0;left:-40%;width:34%;background:linear-gradient(100deg,transparent,rgba(214,255,122,.12),transparent);transform:skewX(-18deg)}
.lt-lima .lts-wart.has-img .lts-person{position:absolute;z-index:1;left:0;right:0;bottom:6%;width:100%;height:auto;max-height:none;filter:saturate(1.05) contrast(1.04) drop-shadow(0 0 1.5px rgba(214,255,122,.55)) drop-shadow(-10px 0 28px rgba(150,255,0,.22)) drop-shadow(0 26px 30px rgba(0,0,0,.55));-webkit-mask:linear-gradient(180deg,#000 82%,transparent 99%);mask:linear-gradient(180deg,#000 82%,transparent 99%)}
.lt-lima .lts-wfloor{position:absolute;z-index:2;left:3%;right:3%;bottom:6%;height:22%;border-radius:0 0 22px 22px;background:linear-gradient(180deg,transparent,rgba(10,13,7,.85) 70%,#0a0d07);pointer-events:none}
.lt-lima .lts-wfloor::after{content:"";position:absolute;left:10%;right:10%;bottom:-2px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--n-lime),transparent);box-shadow:0 0 18px var(--n-lime)}
.lt-lima .lts-wsp{position:absolute;inset:0;z-index:3;pointer-events:none}
.lt-lima .lts-wsp i{position:absolute;width:6px;height:6px;border-radius:50%;background:var(--n-lime3);box-shadow:0 0 10px var(--n-lime),0 0 20px rgba(150,255,0,.5);opacity:.75}
.lt-lima .lts-wchip{position:absolute;z-index:4;display:inline-flex;align-items:center;gap:7px;padding:9px 13px;border-radius:12px;font-size:12.5px;font-weight:800;white-space:nowrap;color:var(--n-tx);background:rgba(16,20,12,.88);border:1px solid rgba(184,255,44,.45);box-shadow:0 12px 30px rgba(0,0,0,.55),0 0 22px rgba(150,255,0,.15);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.lt-lima .lts-wchip .lts-ic{width:16px;height:16px;padding:4px;box-sizing:content-box;border-radius:8px;background:var(--n-lime);color:var(--n-ink)}
.lt-lima .lts-wchip.a{left:-6%;top:44%}
.lt-lima .lts-wchip.b{right:-6%;bottom:16%}
@media (max-width:819px){.lt-lima .lts-wchip{font-size:11.5px;padding:7px 10px}.lt-lima .lts-wchip.a{left:-4%}.lt-lima .lts-wchip.b{right:-4%}}
.lt-lima:not(.lt-static) .lts-wstage i{animation:lts-wsh 5.5s ease-in-out infinite}
@keyframes lts-wsh{0%,55%{left:-40%}100%{left:120%}}
.lt-lima:not(.lt-static) .lts-wsp i{animation:lts-tw 2.8s var(--d) ease-in-out infinite}
@keyframes lts-tw{0%,100%{opacity:.15;transform:scale(.5)}50%{opacity:1;transform:scale(1.15)}}
.lt-lima:not(.lt-static) .lts-wchip.a{animation:lts-fl 4.2s ease-in-out infinite}
.lt-lima:not(.lt-static) .lts-wchip.b{animation:lts-fl 4.8s 1.1s ease-in-out infinite}
@keyframes lts-fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.lt-lima:not(.lt-static) .lts-wfloor::after{animation:lts-glow 3s ease-in-out infinite alternate}
.lt-lima .ltb-off :is(.lts-wstage i,.lts-wsp i,.lts-wchip),.lt-lima .ltb-off .lts-wfloor::after{animation-play-state:paused!important}
@media (max-width:819px){.lt-lima .lts-wtx{text-align:center}.lt-lima .lts-wtx p{max-width:56ch;margin-left:auto;margin-right:auto}.lt-lima .lts-wart{margin-right:0;width:min(320px,78%)}}
.lt-lima :is(.ltb-sec-pays,.ltb-sec-faq,.ltb-sec-links) .ltb-h2{text-align:center;margin-bottom:clamp(22px,3.5vw,30px)}
.lt-lima .ltb-pays,.lt-lima .ltb-links{justify-content:center}
.lt-lima .ltb-faq{max-width:720px;margin:0 auto}
/* pagos, preguntas, enlaces */
.lt-lima .ltb-pays li{padding:10px 18px;border-radius:10px;background:#171a14;border:1px solid rgba(184,255,44,.3);color:#e9eee2;font-weight:600}
.lt-lima .ltb-faq details{background:#151813;border:1px solid var(--n-line);border-radius:12px}
.lt-lima .ltb-faq summary::after{color:var(--n-lime)}
.lt-lima .ltb-faq p{color:var(--n-mut)}
.lt-lima .ltb-link{background:#151813;border:1px solid rgba(184,255,44,.3);border-radius:10px}
.lt-lima .ltb-link svg{color:var(--n-lime)}
/* pie */
.lt-lima .ltb-foot{display:flex;flex-wrap:wrap;justify-content:center;text-align:center;gap:6px 22px;padding:26px 18px 100px;border-top:1px solid var(--n-line);background:#050604;color:#7d8474;font-size:12.5px}
.lt-lima .ltb-foot p{margin:0}
.lt-lima .ltb-made a{color:var(--n-lime)}
.lt-lima .ltb-fab{background:var(--n-lime)!important;color:var(--n-ink)!important;box-shadow:0 0 30px rgba(150,255,0,.45)!important}
/* cabecera tipo perfil y oferta */
.lt-lima .ltp-ring{background:conic-gradient(#b8ff2c,#2a3a12,#d8ff7c,#2a3a12,#b8ff2c)}
.lt-lima .lt-promo-in{background:#11150d;border:1px solid rgba(184,255,44,.45);color:#fff;border-radius:14px}
.lt-lima .lt-promo-tag,.lt-lima .lt-promo-btn{background:var(--n-lime);color:var(--n-ink)}
/* chispas al tocar */
.lts-burst{position:fixed;z-index:70;width:0;height:0;pointer-events:none}
.lts-burst i{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;background:${NE_LIME};box-shadow:0 0 8px ${NE_LIME};animation:lts-burst .7s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes lts-burst{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(.3)}}
/* partículas de luz que suben */
.lt-lima .lts-motes{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}
.lt-lima .lts-motes i{position:absolute;bottom:-10px;left:var(--x);width:var(--s);height:var(--s);border-radius:50%;background:${NE_LIME};box-shadow:0 0 10px ${NE_LIME};opacity:0}
/* ===== movimiento (solo VIP) ===== */
.lt-lima:not(.lt-static) .lts-beam.a{animation:lts-beam 9s ease-in-out infinite alternate}
.lt-lima:not(.lt-static) .lts-beam.b{animation:lts-beam 12s -4s ease-in-out infinite alternate}
@keyframes lts-beam{from{transform:rotate(18deg) translateX(-60px);opacity:.5}to{transform:rotate(24deg) translateX(60px);opacity:1}}
.lt-lima:not(.lt-static) .lts-hart::before{animation:lts-glow 3.6s ease-in-out infinite alternate}
@keyframes lts-glow{from{opacity:.65;transform:scale(.94)}to{opacity:1;transform:scale(1.06)}}
.lt-lima:not(.lt-static) .lts-ring{animation:lts-spin 16s linear infinite}
@keyframes lts-spin{to{transform:rotate(360deg)}}
.lt-lima:not(.lt-static) .lts-motes i{animation:lts-mote var(--t) var(--d) linear infinite}
@keyframes lts-mote{0%{opacity:0;transform:translate3d(0,0,0)}12%{opacity:.9}80%{opacity:.6}100%{opacity:0;transform:translate3d(var(--dx),-560px,0)}}
.lt-lima:not(.lt-static) .lts-top{animation:lts-in .7s .05s cubic-bezier(.16,1,.3,1) both}
.lt-lima:not(.lt-static) .lts-htx .ltb-h1{animation:lts-in .8s .15s cubic-bezier(.16,1,.3,1) both}
.lt-lima:not(.lt-static) .lts-htx .ltb-sub{animation:lts-in .8s .28s cubic-bezier(.16,1,.3,1) both}
.lt-lima:not(.lt-static) .lts-htx .lts-btn,.lt-lima:not(.lt-static) .lts-from{animation:lts-in .8s .4s cubic-bezier(.16,1,.3,1) both}
.lt-lima:not(.lt-static) .lts-hart>.lts-person,.lt-lima:not(.lt-static) .lts-hart>.lts-slot{animation:lts-rise 1s .2s cubic-bezier(.16,1,.3,1) both}
.lt-lima:not(.lt-static) .lts-badge{animation:lts-pop .7s .8s cubic-bezier(.3,1.6,.5,1) both}
.lt-lima:not(.lt-static) .lts-cov{animation:lts-rise 1s .15s cubic-bezier(.16,1,.3,1) both}
.lt-lima:not(.lt-static) .lts-cov::after{animation:lts-covsh 1.3s 1.1s ease-in-out both}
@keyframes lts-covsh{0%{left:-50%;opacity:1}100%{left:130%;opacity:1}}
.lt-lima:not(.lt-static) .is-cover .lts-av{animation:lts-pop .7s .6s cubic-bezier(.3,1.6,.5,1) both}
.lt-lima:not(.lt-static) .is-prof .lts-av{animation:lts-pop .8s .2s cubic-bezier(.3,1.6,.5,1) both,lts-avglow 3.2s 1.2s ease-in-out infinite alternate}
@keyframes lts-avglow{from{box-shadow:0 0 0 3px var(--n-lime),0 0 30px rgba(150,255,0,.4),0 20px 40px rgba(0,0,0,.55)}to{box-shadow:0 0 0 3px var(--n-lime),0 0 60px rgba(150,255,0,.75),0 20px 40px rgba(0,0,0,.55)}}
.lt-lima:not(.lt-static) .is-prof .lts-pf::after{animation:lts-spin 28s linear infinite reverse}
.lt-lima:not(.lt-static) .lts-media::before{animation:lts-glow 3.6s ease-in-out infinite alternate}
@keyframes lts-in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes lts-rise{from{opacity:0;transform:translateY(40px) scale(.96)}to{opacity:1;transform:none}}
@keyframes lts-pop{from{opacity:0;transform:scale(.4) rotate(-40deg)}to{opacity:1;transform:none}}
.lt-lima:not(.lt-static) .lts-btn::after{animation:lts-shine 3.4s 1.4s ease-in-out infinite}
@keyframes lts-shine{0%,62%{left:-60%;opacity:0}63%{opacity:1}100%{left:130%;opacity:1}}
.lt-lima:not(.lt-static) .lts-htx .lts-btn{animation:lts-in .8s .4s cubic-bezier(.16,1,.3,1) both,lts-pulse 2.8s 1.6s ease-in-out infinite}
@keyframes lts-pulse{0%,100%{box-shadow:0 0 0 1px rgba(214,255,122,.6) inset,0 10px 30px rgba(150,255,0,.32),0 0 60px rgba(150,255,0,.18)}50%{box-shadow:0 0 0 1px rgba(214,255,122,.8) inset,0 10px 34px rgba(150,255,0,.5),0 0 90px rgba(150,255,0,.35)}}
.lt-lima:not(.lt-static) .lts-band::after{animation:lts-bshine 5s 1s ease-in-out infinite}
@keyframes lts-bshine{0%,70%{left:-30%;opacity:0}71%{opacity:1}100%{left:120%;opacity:1}}
.lt-lima:not(.lt-static) .lts-chev{animation:lts-bob 1.8s ease-in-out infinite}
@keyframes lts-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
.lt-lima:not(.lt-static).ltb-rv .lts-card.is-in .lts-icon{animation:lts-ic 1s calc(var(--rvd,0ms) + .2s) ease-out both}
@keyframes lts-ic{0%{box-shadow:0 0 0 rgba(150,255,0,0)}40%{box-shadow:0 0 34px rgba(150,255,0,.55)}100%{box-shadow:0 0 22px rgba(150,255,0,.18)}}
.lt-lima:not(.lt-static) .lts-plan.is-top{animation:lts-rot 5s linear infinite}
.lt-lima:not(.lt-static).ltb-rv .lts-plan.is-top.is-in{animation:ltb-up-lima .65s var(--rvd,0ms) cubic-bezier(.16,1,.3,1) both,lts-rot 5s linear infinite}
@keyframes lts-rot{to{--lts-a:360deg}}
.lt-lima:not(.lt-static).ltb-rv .lts-wart.is-in::before{animation:lts-slide .9s .1s cubic-bezier(.16,1,.3,1) both}
@keyframes lts-slide{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:.9}}
.lt-lima .ltb-off :is(.lts-av,.lts-media,.lts-pf,.lts-beam,.lts-hart,.lts-ring,.lts-motes i,.lts-btn,.lts-band,.lts-chev,.lts-plan.is-top.is-in),.lt-lima .ltb-off :is(.lts-media,.lts-pf,.lts-hart,.lts-btn,.lts-band)::before,.lt-lima .ltb-off :is(.lts-pf,.lts-hart,.lts-btn,.lts-band)::after{animation-play-state:paused!important}
@media (max-width:420px){.lt-lima .lts-plan{padding:28px 16px 20px}.lt-lima .lts-pbtn{font-size:14.5px;padding:13px 10px}.lt-lima .lts-pbrand{font-size:13px}}
@media (max-width:520px){.lt-lima .lts-hwa span{display:none}.lt-lima .lts-hwa{padding:9px}.lt-lima .lts-trust li{font-size:10px}}
`;

  function renderNeon(root, d, ctx) {
    LC.injectCss('lima', CSS_NEON);
    const cl = setup(root, ctx, d, 'lima');
    const { plans, combos } = visible(d, ctx);
    const wa = d.whatsapp ? ctx.buy('tus planes') : '';
    const mark = d.logoUrl ? `<img src="${ctx.esc(d.logoUrl)}" alt="" width="40" height="40" decoding="async">` : `<span class="lts-mono" aria-hidden="true">${ctx.esc((d.name.trim().charAt(0) || 'S').toUpperCase())}</span>`;
    const mainCta = (label, path) => wa ? `<a class="lts-btn" data-lt-btn="main" href="${ctx.esc(wa)}" target="_blank" rel="noopener">${ctx.linkIcon('whatsapp')}<span${path ? ed(ctx, path) : ''}>${ctx.esc(label)}</span></a>` : `<button type="button" class="lts-btn" data-goto="plans">Ver planes</button>`;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const motes = (ctx.noMotion || ctx.reducedMotion) ? '' : `<div class="lts-motes" aria-hidden="true">${Array.from({ length: 14 }, () => `<i style="--x:${(rnd() * 100).toFixed(1)}%;--s:${(2 + rnd() * 3).toFixed(1)}px;--t:${(7 + rnd() * 7).toFixed(1)}s;--d:${(-rnd() * 12).toFixed(1)}s;--dx:${(rnd() * 80 - 40).toFixed(0)}px"></i>`).join('')}</div>`;
    const bens = d.benefits.slice(0, 5);
    const html =
      `<section class="lts-hero" data-lt-hero><div class="lts-stadium" aria-hidden="true"></div><span class="lts-beam a" aria-hidden="true"></span><span class="lts-beam b" aria-hidden="true"></span>${motes}` +
      `<div class="ltb-wrap"><div class="lts-top"><div class="lts-brand">${ctx.profileMode ? '' : mark}<div><b${ed(ctx, 'name')}>${ctx.esc(d.name)}</b>${d.tagline ? `<small${ed(ctx, 'tagline')}>${ctx.esc(d.tagline)}</small>` : ''}</div></div>` +
      `${wa ? `<a class="lts-hwa" data-lt-btn href="${ctx.esc(wa)}" target="_blank" rel="noopener">${ctx.linkIcon('whatsapp')}<span>WhatsApp</span></a>` : ''}</div>` +
      `<div class="lts-hin"><div class="lts-htx"><h1 class="ltb-h1"${ed(ctx, 'heroTitle')}>${neAccent(ctx, d.heroTitle || LC.DEFAULTS.heroTitle, 3)}</h1>` +
      `<p class="ltb-sub"${ed(ctx, 'heroSubtitle')}>${ctx.esc(d.heroSubtitle || LC.DEFAULTS.heroSubtitle)}</p>${mainCta(d.ctaText, 'ctaText')}` +
      `${ctx.minPrice ? `<p class="lts-from">Planes desde <b>${ctx.esc(ctx.minPrice)}</b></p>` : ''}</div>` +
      `${neMedia(ctx, d)}</div></div></section>` +
      promo(ctx) +
      `<div class="lts-bandw"><div class="lts-band">Todas tus plataformas favoritas reunidas en un solo lugar</div><span class="lts-chev" aria-hidden="true">${nei('down')}</span></div>` +
      (bens.length ? `<section class="ltb-sec ltb-sec-benefits"><div class="lts-dots" aria-hidden="true"></div><div class="ltb-wrap"><div class="lts-ideal" data-rv><div><h2>Con <span class="lts-hl">${ctx.esc(d.name)}</span> tienes:</h2><p>Películas, series, deportes y música sin pagar de más: cuentas originales, activación rápida y atención directa por WhatsApp.</p></div>` +
        `<ul class="lts-ilist">${bens.map((b, i) => `<li>${nei('check')}<span${ed(ctx, `benefits.${i}`)}>${ctx.esc(b)}</span></li>`).join('')}</ul></div></div></section>` : '') +
      (plans.length ? `<section class="ltb-sec ltb-sec-plans"><div class="ltb-wrap">${neHead(`Elige tu <span class="lts-hl">plataforma favorita</span>`)}<div class="lts-grid">${plans.map((p, i) => nePlan(ctx, p, i)).join('')}</div>${wa ? `<div class="lts-cta-row" data-rv>${mainCta('Quiero mi cuenta ahora')}</div>` : ''}</div></section>` : '') +
      (combos.length ? `<section class="ltb-sec ltb-sec-combos"><div class="lts-dots" aria-hidden="true"></div><div class="ltb-wrap">${neHead(`No pierdas esta oportunidad,<br>asegura hoy <span class="lts-hl">tu combo!</span>`)}<div class="lts-plans">${combos.map((c, i) => neCombo(ctx, c, i, d)).join('')}</div></div></section>` : '') +
      (d.reviews && d.reviews.length ? `<section class="ltb-sec ltb-sec-reviews"><div class="ltb-wrap">${neHead(`Lo que dicen <span class="lts-hl">nuestros clientes</span>`)}${reviewsHtml(ctx, d)}</div></section>` : '') +
      `<section class="ltb-sec ltb-sec-who"><div class="ltb-wrap"><div class="lts-who">${neWho()}` +
      `<div class="lts-wtx" data-rv><p class="lts-wname">${ctx.esc(d.name)}</p><h2>¿Quién te va a <span class="lts-hl">atender?</span></h2>` +
      `<p>Somos un equipo que te ayuda a disfrutar tus plataformas favoritas sin complicaciones: te activamos la cuenta en minutos y te acompañamos por WhatsApp todo el mes.</p>` +
      `${d.tagline ? `<p>${ctx.esc(d.tagline)}.</p>` : ''}${mainCta('Escríbenos ahora')}</div></div></div></section>` +
      (d.paymentMethods.length ? sec('pays', `Paga <span class="lts-hl">como quieras</span>`, `<ul class="ltb-pays" data-rv>${d.paymentMethods.map((p, i) => `<li${ed(ctx, `paymentMethods.${i}`)}>${ctx.esc(p)}</li>`).join('')}</ul>`) : '') +
      faqSec(ctx, d, `Preguntas <span class="lts-hl">frecuentes</span>`) +
      linksSec(ctx, d, `Síguenos en <span class="lts-hl">redes</span>`) +
      footer(ctx, d) + fab(ctx, wa);
    root.innerHTML = html;
    neCount(root, ctx, cl);
    neBurst(root, ctx, cl);
    motionKit(root, ctx, cl);
  }
  /** ANIM (VIP): el precio grande cuenta desde 0 al aparecer (respeta el formato "S/ 28,85" o "S/ 9.90").
   *  Solo con un número simple (entero o con 1-2 decimales): "S/ 1,250.50" u otros formatos se dejan quietos.
   *  Si el editor empieza a editar el precio (contenteditable / data-lt-editing) se detiene y devuelve el texto. */
  function neCount(root, ctx, cl) {
    if (ctx.noMotion || ctx.reducedMotion || cl.still || typeof G.IntersectionObserver !== 'function' || typeof G.requestAnimationFrame !== 'function') return;
    const els = [...root.querySelectorAll('.lts-price.is-big [data-lts-num]')];
    if (!els.length) return;
    const editing = el => el.isContentEditable || el.hasAttribute('data-lt-editing') || !!el.closest('[contenteditable],[data-lt-editing]');
    const running = new Map();
    const io = new G.IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return; io.unobserve(en.target);
      const el = en.target, txt = el.textContent, m = txt.match(/\d[\d.,]*/);
      if (!m || !/^\d+(?:[.,]\d{1,2})?$/.test(m[0]) || editing(el)) return;
      const num = m[0], dec = (num.split(/[.,]/)[1] || '').length, sep = num.includes(',') ? ',' : '.', target = parseFloat(num.replace(',', '.'));
      if (!(target > 0)) return;
      const t0 = G.performance ? G.performance.now() : Date.now(), dur = 900;
      const step = now => {
        if (!el.isConnected) return running.delete(el);
        if (editing(el)) { if (el.textContent !== txt) el.textContent = txt; return running.delete(el); }
        const k = Math.min(1, Math.max(0, (now - t0) / dur)), v = target * (1 - Math.pow(1 - k, 3));
        el.textContent = k < 1 ? txt.replace(num, v.toFixed(dec).replace('.', sep)) : txt;
        if (k < 1) running.set(el, G.requestAnimationFrame(step)); else running.delete(el);
      };
      el.__ltsTxt = txt;
      running.set(el, G.requestAnimationFrame(step));
    }), { threshold: .4 });
    els.forEach(e => io.observe(e));
    // Toque/foco (p. ej. el editor va a editar el precio): termina la cuenta al instante con el texto real.
    const finish = () => { running.forEach((id, el) => { G.cancelAnimationFrame(id); if (el.__ltsTxt != null) el.textContent = el.__ltsTxt; }); running.clear(); };
    root.addEventListener('pointerdown', finish, true);
    root.addEventListener('focusin', finish, true);
    cl.push(() => { io.disconnect(); finish(); root.removeEventListener('pointerdown', finish, true); root.removeEventListener('focusin', finish, true); });
  }
  /** ANIM (VIP): chispas lima desde el dedo al tocar un botón. */
  function neBurst(root, ctx, cl) {
    if (ctx.preview || ctx.reducedMotion || ctx.noMotion) return;
    const down = e => {
      const b = e.target && e.target.closest ? e.target.closest('[data-lt-btn],.lts-btn') : null;
      if (!b || !root.contains(b)) return;
      const layer = root.ownerDocument.createElement('div');
      layer.className = 'lts-burst'; layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
      let h = '';
      for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2 + Math.random() * .4, dd = 34 + Math.random() * 44; h += `<i style="--x:${(Math.cos(a) * dd).toFixed(0)}px;--y:${(Math.sin(a) * dd).toFixed(0)}px"></i>`; }
      layer.innerHTML = h; root.appendChild(layer);
      G.setTimeout(() => layer.remove(), 760);
    };
    root.addEventListener('pointerdown', down, { passive: true });
    cl.push(() => root.removeEventListener('pointerdown', down));
  }

  LC.registerTemplate({
    id: 'lima', parts: [{ k: 'lights', label: 'Luces de estadio', sel: '.lts-stadium,.lts-beam,.lts-motes,.lts-dots' }, { k: 'badge', label: 'Sello giratorio', sel: '.lts-badge', x: true }, { k: 'who', label: '¿Quién te va a atender?', sel: '.ltb-sec-who', x: true }], name: 'Neón Lima', description: 'Negro con verde lima neón, estilo lanzamiento: luces, franja lima y tarjeta de precio que brilla',
    tags: ['oscura', 'moderna', 'animada'], preview: { bg: '#060805', fg: '#f1f5ea', accent: NE_LIME }, render: renderNeon
  });
})(typeof window !== 'undefined' ? window : globalThis);
