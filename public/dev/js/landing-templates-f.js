/* Diseños Streaming · Plantilla de landing "Rosa Glam" (rosa): femenina y minimalista en ciruela y rosa.
 * Requiere js/landing-core.js (window.LandingCore). Sin dependencias.
 * CSS prefijado con .lt-rosa; clases internas ltb- (comunes) y ltr- (rosa).
 */
(function (G) {
  'use strict';
  const LC = G.LandingCore;
  if (!LC) { if (G.console) G.console.warn('landing-templates-f: falta LandingCore'); return; }

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
  // ROSA GLAM — femenina y minimalista: portada ciruela con brillo rosa, franja rosa con contadores blancos,
  // tarjetas-foto redondeadas, sección "sobre nosotros" rosa con dos fotos superpuestas.
  // Espacios para personajes y decoraciones (PNG/webp en js/img/). Vacíos = cuadro con X para reemplazar.
  // =====================================================================
  const RS_IMG = (() => {
    try { const s = G.document && G.document.currentScript && G.document.currentScript.src; if (s) return new URL('img/', s).href; } catch (_) {}
    return '/js/img/';
  })();
  const RS_ART = {
    hero: '',          // personaje de la portada (PNG sin fondo, vertical ~900×1100)
    card1: '', card2: '', card3: '',   // fotos de las 3 tarjetas "Para ti que…" (verticales ~600×760)
    about1: '', about2: '',            // fotos de "¿Quién te atiende?" (color y blanco y negro, ~700×900)
    deco: ''           // decoración flotante opcional (PNG sin fondo: billetes, corazones, palomitas…)
  };
  const RS_I = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    sparkle: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>',
    zap: '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    headset: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    cal: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'
  };
  const rsi = (k, cls = 'ltr-ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${RS_I[k]}</svg>`;
  /** Resalta en rosa las últimas palabras del título (como "R$10.000 todos os meses" de la referencia). */
  function rsAccent(ctx, text, n) {
    const w = String(text || '').trim().split(/\s+/);
    if (w.length < 3) return `<span class="ltr-hl">${ctx.esc(w.join(' '))}</span>`;
    const k = Math.min(n, w.length - 1);
    return `${ctx.esc(w.slice(0, -k).join(' '))} <span class="ltr-hl">${ctx.esc(w.slice(-k).join(' '))}</span>`;
  }
  /** Imagen de personaje/decoración o, si falta, cuadro con X y una etiqueta (para reemplazar). */
  const rsArt = (key, cls, label, alt = '') => RS_ART[key]
    ? `<img class="ltr-art ${cls}" src="${RS_IMG}${RS_ART[key]}" alt="${alt}" decoding="async" loading="${key === 'hero' ? 'eager' : 'lazy'}">`
    : `<div class="ltr-slot ${cls}" role="img" aria-label="${label}"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0L100 100M100 0L0 100" stroke="currentColor" stroke-width=".6" vector-effect="non-scaling-stroke"/></svg><span>${label}</span></div>`;
  function rsPrice(ctx, price, old, period, path) {
    const m = ctx.money(price), o = ctx.money(old);
    if (!m) return `<div class="ltr-price is-ask"><strong${ed(ctx, path)}>Precio a consultar</strong></div>`;
    return `<div class="ltr-price">${o ? `<s><span class="ltb-sr">Antes </span>${ctx.esc(o)}</s>` : ''}<strong${ed(ctx, path)}>${ctx.esc(m)}</strong>${period ? `<small>/ ${ctx.esc(period)}</small>` : ''}</div>`;
  }
  function rsPlan(ctx, p, i) {
    const inf = ctx.platformInfo(p.platform), url = planBuy(ctx, p);
    const feats = p.features.length ? `<ul class="ltr-feats">${p.features.map((f, k) => `<li>${rsi('check')}<span${ed(ctx, `plans.${p.id}.features.${k}`)}>${ctx.esc(f)}</span></li>`).join('')}</ul>` : `<p class="ltr-type">${ctx.esc(ctx.typeLabel(p))}</p>`;
    return `<article class="ltb-card ltr-card" data-rv data-lt-card${itm(ctx, 'p', p.id)} style="--i:${i % 8}">` +
      `${p.badge ? `<span class="ltr-tag">${ctx.esc(p.badge)}</span>` : ''}` +
      `<div class="ltr-ctop">${logoHtml(ctx, p.platform, 'ltb-logo', p.imageUrl, ctx.planTitle(p))}<div><h3 class="ltb-title"${ed(ctx, `plans.${p.id}.title`)}>${ctx.esc(p.title || inf.name)}</h3><span class="ltr-sub">${ctx.esc(ctx.typeLabel(p))}</span></div></div>` +
      `${feats}<div class="ltr-cbot">${rsPrice(ctx, p.price, p.oldPrice, p.period, `plans.${p.id}.price`)}` +
      `${url ? `<a class="ltr-btn ltr-sm" data-lt-btn href="${ctx.esc(url)}" target="_blank" rel="noopener">${ctx.money(p.price) ? 'Lo quiero' : 'Consultar'}</a>` : ''}</div></article>`;
  }
  function rsCombo(ctx, c, i) {
    const url = comboBuy(ctx, c), names = c.platforms.map(x => ctx.platformInfo(x).name);
    return `<article class="ltb-card ltr-combo" data-rv data-lt-card${itm(ctx, 'c', c.id)} style="--i:${i % 8}">` +
      `${c.badge ? `<span class="ltr-tag">${ctx.esc(c.badge)}</span>` : ''}` +
      (c.imageUrl ? comboPhoto(ctx, c) : `<div class="ltr-clogos">${c.platforms.map(x => logoHtml(ctx, x, 'ltb-logo')).join('')}</div>`) +
      `<h3 class="ltb-title"${ed(ctx, `combos.${c.id}.name`)}>${ctx.esc(c.name)}</h3><p class="ltr-incl">${ctx.esc(names.join(' + '))}</p>` +
      `${rsPrice(ctx, c.price, c.oldPrice, c.period, `combos.${c.id}.price`)}` +
      `${url ? `<a class="ltr-btn" data-lt-btn href="${ctx.esc(url)}" target="_blank" rel="noopener">${ctx.money(c.price) ? 'Quiero este combo' : 'Consultar precio'}</a>` : ''}</article>`;
  }
  const rsHead = (html, sub) => `<div class="ltr-hd" data-rv><h2 class="ltb-h2">${html}</h2>${sub ? `<p>${sub}</p>` : ''}</div>`;

  const CSS_ROSA = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Great+Vibes&display=swap');` + baseCss('rosa') + `
.lt-rosa{--r-plum:#2a0d1e;--r-plum2:#4a1433;--r-wine:#6b1945;--r-pink:#ff3d8f;--r-pink2:#e8237a;--r-pink3:#ff8ab9;--r-blush:#ffe1ee;--r-tx:#fff6fa;--r-mut:#f4c6da;--r-ink:#2a0d1e;background:var(--r-plum);color:var(--r-tx);font-family:Poppins,"Segoe UI",system-ui,-apple-system,Roboto,sans-serif}
.lt-rosa .ltb-wrap{max-width:1060px}
.lt-rosa .ltb-h1,.lt-rosa .ltb-h2,.lt-rosa h3{font-weight:700;letter-spacing:-.015em}
.lt-rosa .ltr-hl{color:var(--r-pink3);background:linear-gradient(90deg,#ff7eb3,#ff3d8f);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.lt-rosa .ltr-ic{width:18px;height:18px;flex:none}
/* portada */
.lt-rosa .ltr-hero{position:relative;overflow:hidden;background:radial-gradient(ellipse 55% 75% at 78% 40%,rgba(255,61,143,.55),transparent 65%),radial-gradient(ellipse 70% 60% at 100% 100%,rgba(232,35,122,.45),transparent 70%),linear-gradient(115deg,#24091a 0%,#3d1029 45%,#7a1b4f 100%)}
.lt-rosa .ltr-hero::after{content:"";position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(180deg,transparent,rgba(42,13,30,.55));pointer-events:none}
.lt-rosa .ltr-top{position:relative;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 0 0}
.lt-rosa .ltr-brand{display:flex;align-items:center;gap:10px;min-width:0;color:#fff;text-decoration:none}
.lt-rosa .ltr-brand img,.lt-rosa .ltr-mono{width:42px;height:42px;border-radius:50%;object-fit:cover;flex:none;border:2px solid rgba(255,255,255,.7)}
.lt-rosa .ltr-mono{display:grid;place-items:center;background:var(--r-pink);font-weight:800;font-size:18px}
.lt-rosa .ltr-brand b{display:block;font-family:"Great Vibes",cursive;font-weight:400;font-size:clamp(24px,5.6vw,30px);line-height:1;overflow-wrap:anywhere}
.lt-rosa .ltr-brand small{display:block;margin-top:2px;font-size:11px;letter-spacing:.06em;color:var(--r-mut)}
.lt-rosa .ltr-hwa{flex:none;display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);color:#fff;font-weight:600;font-size:13.5px;text-decoration:none;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.lt-rosa .ltr-hwa svg{width:18px;height:18px}
.lt-rosa .ltr-hin{position:relative;z-index:3;display:grid;gap:10px;align-items:end}
@media (min-width:860px){.lt-rosa .ltr-hin{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);min-height:540px}}
.lt-rosa .ltr-htx{padding:34px 0 60px;align-self:center;min-width:0}
.lt-rosa .ltb-h1{margin:0 0 16px;font-size:clamp(30px,6.6vw,50px);line-height:1.12;text-wrap:balance}
.lt-rosa .ltb-sub{margin:0 0 18px;max-width:42ch;font-size:clamp(14.5px,3.7vw,16.5px);line-height:1.55;color:var(--r-mut)}
.lt-rosa .ltr-facts{list-style:none;margin:0 0 24px;padding:0;display:grid;gap:7px;font-size:14.5px;color:#fff}
.lt-rosa .ltr-facts li{display:flex;align-items:center;gap:9px}
.lt-rosa .ltr-facts .ltr-ic{color:var(--r-pink3)}
.lt-rosa .ltr-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:52px;padding:14px 26px;border-radius:10px;border:0;cursor:pointer;overflow:hidden;color:#fff;font-weight:700;font-size:15.5px;letter-spacing:.01em;text-decoration:none;text-align:center;background:linear-gradient(135deg,#ff5fa2 0%,#ff3d8f 45%,#e8237a 100%);box-shadow:0 10px 26px rgba(232,35,122,.4);transition:transform .2s cubic-bezier(.3,1.6,.5,1),box-shadow .2s}
.lt-rosa .ltr-btn svg{width:20px;height:20px;flex:none}
.lt-rosa .ltr-btn:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(232,35,122,.5)}
.lt-rosa .ltr-btn:active{transform:scale(.97)}
.lt-rosa .ltr-btn::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent);transform:skewX(-20deg);pointer-events:none;opacity:0}
.lt-rosa .ltr-hero .ltr-btn{min-width:min(100%,320px)}
.lt-rosa .ltr-from{margin:14px 0 0;font-size:14px;color:var(--r-mut)}
.lt-rosa .ltr-from b{color:#fff;font-size:17px}
.lt-rosa .ltr-hart{position:relative;align-self:end;justify-self:center;width:min(430px,90%);aspect-ratio:9/11}
@media (max-width:859px){.lt-rosa .ltr-hart{order:-1;width:min(250px,66%);margin-top:14px}.lt-rosa .ltr-htx{padding-top:10px;text-align:center}.lt-rosa .ltr-facts{justify-items:center}.lt-rosa .ltb-sub{margin-left:auto;margin-right:auto}}
.lt-rosa .ltr-hart::before{content:"";position:absolute;left:6%;right:6%;bottom:0;height:78%;border-radius:50% 50% 0 0;background:radial-gradient(circle at 50% 60%,rgba(255,120,180,.55),transparent 68%);filter:blur(14px)}
.lt-rosa .ltr-art{position:relative;z-index:1;width:100%;height:100%;object-fit:cover;display:block}
.lt-rosa .ltr-hart .ltr-art{object-fit:contain;object-position:bottom;filter:drop-shadow(0 20px 40px rgba(30,0,15,.5))}
.lt-rosa .ltr-slot{position:relative;z-index:1;display:grid;place-items:center;width:100%;height:100%;border:2px dashed rgba(255,138,185,.65);border-radius:22px;color:rgba(255,138,185,.45);background:rgba(255,61,143,.06);overflow:hidden}
.lt-rosa .ltr-slot svg{position:absolute;inset:0;width:100%;height:100%}
.lt-rosa .ltr-slot span{position:relative;max-width:86%;padding:6px 12px;border-radius:99px;background:#fff;color:var(--r-pink2);font-size:11.5px;font-weight:700;text-align:center}
.lt-rosa .ltr-hart .ltr-slot{border-radius:22px 22px 0 0;border-bottom:0}
.lt-rosa .ltr-sign{position:absolute;z-index:2;right:4%;bottom:7%;font-family:"Great Vibes",cursive;font-size:clamp(24px,5vw,34px);color:#fff;opacity:.85;text-shadow:0 2px 12px rgba(0,0,0,.35);pointer-events:none;max-width:70%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.lt-rosa .ltr-deco{position:absolute;z-index:2;pointer-events:none;width:clamp(70px,12vw,130px);height:auto;opacity:.9}
.lt-rosa .ltr-deco.a{left:-2%;top:18%}.lt-rosa .ltr-deco.b{right:-2%;top:6%;transform:scaleX(-1)}
/* corazones y destellos (pocos, livianos) */
.lt-rosa .ltr-float{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}
.lt-rosa .ltr-float i{position:absolute;left:var(--x);bottom:-30px;width:var(--s);height:var(--s);color:var(--c);opacity:0}
.lt-rosa .ltr-float b{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);color:var(--c);opacity:0}
.lt-rosa .ltr-float svg{width:100%;height:100%;fill:currentColor;stroke:none;display:block}
.lt-rosa .ltr-fx{position:relative;overflow:hidden}
.lt-rosa .ltr-fx>.ltr-float{z-index:0}
.lt-rosa .ltr-fx>.ltb-wrap,.lt-rosa .ltr-tail .ltb-sec{position:relative;z-index:1}
.lt-rosa .ltr-tail{background:radial-gradient(ellipse 60% 40% at 50% 0%,rgba(255,61,143,.12),transparent 70%)}
.lt-rosa .ltr-orb{position:absolute;inset:8% 4% 18%;z-index:2;pointer-events:none}
.lt-rosa .ltr-orb i{position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px;color:#ffd1e5;opacity:0}
.lt-rosa .ltr-orb i:nth-child(2){color:#ff8ab9;width:14px;height:14px;margin:-7px}
.lt-rosa .ltr-orb svg{width:100%;height:100%;fill:currentColor;display:block;filter:drop-shadow(0 0 6px rgba(255,138,185,.9))}
.lt-rosa .ltr-burst{position:fixed;z-index:9999;width:0;height:0;pointer-events:none}
.lt-rosa .ltr-burst i{position:absolute;left:-7px;top:-7px;width:14px;height:14px;color:#ff5fa2;animation:ltr-burst .85s cubic-bezier(.2,.8,.3,1) both}
.lt-rosa .ltr-burst i:nth-child(2n){color:#ffd1e5}
.lt-rosa .ltr-burst svg{width:100%;height:100%;fill:currentColor;display:block}
/* "Portada normal": la portada va como banner redondeado bajo la cabecera */
.lt-rosa .ltr-cov{position:relative;z-index:3;margin:18px 0 0;border-radius:20px;overflow:hidden;aspect-ratio:851/315;max-height:340px;width:100%;border:1px solid rgba(255,138,185,.35);box-shadow:0 18px 44px rgba(10,0,6,.45)}
.lt-rosa .ltr-cov img{width:100%;height:100%;object-fit:cover;display:block}
.lt-rosa:not(.lt-static) .ltr-cov{animation:ltr-in .9s .1s cubic-bezier(.16,1,.3,1) both}
/* en "Portada tipo Facebook" la cabecera de perfil va arriba: estilo rosa */
.lt-rosa .ltp{background:linear-gradient(180deg,#2a0d1e,#3d1029)}
.lt-rosa .ltp-ring{background:conic-gradient(#ff3d8f,#ffd1e5,#ff8ab9,#e8237a,#ff3d8f)}
.lt-rosa .ltp-avatar-in{border-color:#2a0d1e}
.lt-rosa .ltp-name{font-family:"Great Vibes",cursive;font-weight:400;font-size:clamp(34px,7vw,46px);letter-spacing:0}
.lt-rosa .ltp-tag,.lt-rosa .ltp-meta{color:var(--r-mut)}
.lt-rosa .ltp-online i{background:#ff8ab9}
.lt-rosa .ltp-social{background:rgba(255,255,255,.1);border-color:rgba(255,138,185,.4);color:#fff}
.lt-rosa.ltb-pm .ltr-hin{min-height:0}
@media (min-width:860px){.lt-rosa.ltb-pm .ltr-hin{min-height:460px}}
/* franja rosa con contadores */
.lt-rosa .ltr-band{position:relative;overflow:hidden;padding:34px 0 38px;text-align:center;background:linear-gradient(110deg,#ff4d97 0%,#ff2f86 40%,#e8237a 70%,#ff4d97 100%);background-size:220% 100%;color:#fff}
.lt-rosa .ltr-band h2{margin:0 auto 22px;max-width:30ch;font-size:clamp(19px,4.6vw,27px);font-weight:500;line-height:1.3}
.lt-rosa .ltr-band h2 b{font-weight:800}
.lt-rosa .ltr-stats{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px}
.lt-rosa .ltr-slabel{font-size:14px;font-weight:600;line-height:1.2;text-align:left;padding-bottom:3px;border-bottom:1.5px solid rgba(255,255,255,.8);margin-right:6px}
.lt-rosa .ltr-stat{display:grid;place-items:center;min-width:86px;padding:12px 10px 10px;border-radius:12px;background:#fff;color:var(--r-pink2);box-shadow:0 10px 24px rgba(120,0,50,.25);line-height:1.05}
.lt-rosa .ltr-stat b{font-size:clamp(22px,5vw,28px);font-weight:800}
.lt-rosa .ltr-stat.is-long{max-width:190px}
.lt-rosa .ltr-stat.is-long b{font-size:clamp(14px,3.6vw,17px);line-height:1.2;text-align:center;overflow-wrap:anywhere}
.lt-rosa .ltr-stat small{margin-top:4px;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
@media (max-width:520px){.lt-rosa .ltr-stat.is-long{flex:1 1 100%;max-width:none;order:9}.lt-rosa .ltr-slabel br{display:none}.lt-rosa .ltr-slabel{flex-basis:100%;text-align:center;border:0;margin:0 0 2px}.lt-rosa .ltr-stat{min-width:0;flex:1 1 0}}
/* secciones */
.lt-rosa .ltb-sec{position:relative;padding:clamp(52px,8vw,78px) 0}
.lt-rosa .ltr-dark{background:radial-gradient(ellipse 70% 60% at 50% 0%,rgba(255,61,143,.16),transparent 70%),linear-gradient(180deg,#2a0d1e,#3a1029)}
.lt-rosa .ltr-pinksec{background:radial-gradient(ellipse 60% 70% at 85% 30%,rgba(255,255,255,.22),transparent 60%),linear-gradient(160deg,#ff7eb3 0%,#f04d92 55%,#d9286f 100%)}
.lt-rosa .ltr-hd{text-align:center;margin:0 0 32px}
.lt-rosa .ltb-h2{margin:0;font-size:clamp(26px,5.6vw,38px);line-height:1.15;color:#fff}
.lt-rosa .ltr-dark .ltb-h2 .ltr-hl{-webkit-text-fill-color:transparent}
.lt-rosa .ltr-hd p{margin:10px auto 0;max-width:52ch;color:var(--r-mut);font-size:15px}
/* "¿Por qué comprar con nosotros?": 3 tarjetas-foto */
.lt-rosa .ltr-pics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,3vw,26px)}
@media (max-width:640px){.lt-rosa .ltr-pics{grid-template-columns:1fr;max-width:340px;margin:0 auto}}
.lt-rosa .ltr-pic{margin:0;text-align:center}
.lt-rosa .ltr-pic .ltr-frame{aspect-ratio:4/5;border-radius:22px;overflow:hidden;box-shadow:0 18px 40px rgba(10,0,6,.45);transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.lt-rosa .ltr-pic .ltr-frame .ltr-slot{border-radius:22px}
.lt-rosa .ltr-pic figcaption{margin:14px auto 0;max-width:24ch;font-size:14.5px;font-weight:600;line-height:1.4;overflow-wrap:anywhere}
.lt-rosa .ltr-frame{position:relative}
.lt-rosa .ltr-frame::after,.lt-rosa .ltr-aart :is(.ltr-p1,.ltr-p2)::after{content:"";position:absolute;top:0;bottom:0;left:-70%;width:45%;z-index:2;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-18deg);pointer-events:none;opacity:0}
.lt-rosa .ltr-frame img,.lt-rosa .ltr-aart img{transition:transform .6s cubic-bezier(.2,.8,.2,1)}
@media (hover:hover){.lt-rosa .ltr-pic:hover .ltr-frame img,.lt-rosa .ltr-aart>div:hover img{transform:scale(1.06)}.lt-rosa .ltr-pic:hover .ltr-frame{box-shadow:0 22px 50px rgba(232,35,122,.4)}}
/* planes */
.lt-rosa .ltr-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:16px}
.lt-rosa .ltr-grid>*{flex:0 1 calc((100% - 32px) / 3);min-width:min(100%,250px)}
@media (max-width:860px){.lt-rosa .ltr-grid>*{flex-basis:calc((100% - 16px) / 2)}}
.lt-rosa .ltr-card{gap:12px;padding:20px 18px 18px;border-radius:20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,138,185,.22);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:transform .35s cubic-bezier(.3,1.5,.5,1),border-color .3s,box-shadow .3s}
.lt-rosa .ltr-card:hover{transform:translateY(-5px);border-color:rgba(255,138,185,.6);box-shadow:0 18px 40px rgba(232,35,122,.22)}
.lt-rosa .ltr-ctop{display:flex;align-items:center;gap:12px;min-width:0}
.lt-rosa .ltr-ctop>div{min-width:0}
.lt-rosa .ltr-ctop .ltb-logo{width:50px;height:50px;border-radius:14px;flex:none;box-shadow:0 6px 14px rgba(0,0,0,.3)}
.lt-rosa .ltr-card .ltb-title{margin:0;font-size:17px;overflow-wrap:anywhere}
.lt-rosa .ltr-sub,.lt-rosa .ltr-type{font-size:12.5px;color:var(--r-mut);margin:0}
.lt-rosa .ltr-feats{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:13.5px;color:#fbe3ee}
.lt-rosa .ltr-feats li{display:flex;gap:7px;align-items:flex-start;overflow-wrap:anywhere}
.lt-rosa .ltr-feats .ltr-ic{width:15px;height:15px;margin-top:2px;color:var(--r-pink3)}
.lt-rosa .ltr-cbot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:auto;padding-top:6px}
.lt-rosa .ltr-price{display:flex;align-items:baseline;flex-wrap:wrap;gap:3px 6px}
.lt-rosa .ltr-price strong{font-size:24px;font-weight:800;color:#fff}
.lt-rosa .ltr-price.is-ask strong{font-size:15px;font-weight:700}
.lt-rosa .ltr-price small{font-size:12px;color:var(--r-mut)}
.lt-rosa .ltr-price s{font-size:13px;color:var(--r-mut)}
.lt-rosa .ltr-sm{min-height:42px;padding:9px 18px;font-size:14px;border-radius:9px}
.lt-rosa .ltr-tag{position:absolute;top:-10px;left:18px;padding:4px 12px;border-radius:99px;background:#fff;color:var(--r-pink2);font-size:11px;font-weight:800;box-shadow:0 6px 14px rgba(0,0,0,.25);max-width:calc(100% - 36px);overflow-wrap:anywhere}
/* combos (sobre rosa) */
.lt-rosa .ltr-combos{display:flex;flex-wrap:wrap;justify-content:center;gap:18px}
.lt-rosa .ltr-combos>*{flex:0 1 330px;min-width:min(100%,280px)}
.lt-rosa .ltr-combo{align-items:center;text-align:center;gap:10px;padding:26px 20px 22px;border-radius:22px;background:#fff;color:var(--r-ink);box-shadow:0 18px 44px rgba(120,0,50,.25)}
.lt-rosa .ltr-combo .ltr-tag{left:50%;transform:translateX(-50%);background:var(--r-pink2);color:#fff}
.lt-rosa .ltr-clogos{display:flex;justify-content:center}
.lt-rosa .ltr-clogos .ltb-logo{width:46px;height:46px;border-radius:50%;margin:0 -6px;border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.18)}
.lt-rosa .ltr-combo .ltb-title{margin:2px 0 0;font-size:20px;color:var(--r-ink);overflow-wrap:anywhere}
.lt-rosa .ltr-incl{margin:0;font-size:13.5px;color:#8a4a68;overflow-wrap:anywhere}
.lt-rosa .ltr-combo .ltr-price{justify-content:center;margin:4px 0}
.lt-rosa .ltr-combo .ltr-price strong{font-size:34px;color:var(--r-pink2)}
.lt-rosa .ltr-combo .ltr-price small,.lt-rosa .ltr-combo .ltr-price s{color:#a0607e}
.lt-rosa .ltr-combo .ltr-btn{width:100%;margin-top:auto}
.lt-rosa .ltb-cph{border-radius:14px;width:100%}
/* sobre nosotros */
.lt-rosa .ltr-about{display:grid;gap:30px;align-items:center}
@media (min-width:820px){.lt-rosa .ltr-about{grid-template-columns:1.05fr .95fr;gap:44px}}
.lt-rosa .ltr-atx h2{margin:0 0 14px;font-size:clamp(32px,7vw,48px);line-height:1.05;color:#fff;overflow-wrap:anywhere}
.lt-rosa .ltr-atx p{margin:0 0 12px;font-size:15px;line-height:1.65;color:#fff;opacity:.95}
.lt-rosa .ltr-atx p b{font-weight:800}
.lt-rosa .ltr-atx .ltr-btn{margin-top:8px;background:#fff;color:var(--r-pink2);box-shadow:0 10px 26px rgba(120,0,50,.25)}
.lt-rosa .ltr-aart{position:relative;justify-self:center;width:min(420px,100%);aspect-ratio:1/1}
.lt-rosa .ltr-aart .ltr-p1,.lt-rosa .ltr-aart .ltr-p2{position:absolute;border-radius:20px;overflow:hidden;box-shadow:0 22px 50px rgba(90,0,40,.35)}
.lt-rosa .ltr-aart .ltr-p1{left:0;top:4%;width:60%;height:88%;border:5px solid rgba(255,255,255,.85)}
.lt-rosa .ltr-aart .ltr-p2{right:0;top:18%;width:48%;height:66%;border:5px solid rgba(255,255,255,.85)}
.lt-rosa .ltr-aart .ltr-p2 .ltr-art{filter:grayscale(1)}
.lt-rosa .ltr-aart .ltr-slot{border-radius:15px;background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.7);color:rgba(255,255,255,.55)}
@media (max-width:819px){.lt-rosa .ltr-atx{text-align:center}}
/* reseñas, pagos, preguntas, redes */
.lt-rosa .ltb-revs{gap:16px}
.lt-rosa .ltb-rev{background:rgba(255,255,255,.06);border:1px solid rgba(255,138,185,.22);border-radius:18px}
.lt-rosa .ltb-stars i.on{color:#ff8ab9}
.lt-rosa .ltb-rq p{color:#fbe3ee}
.lt-rosa .ltb-rav{background:linear-gradient(135deg,#ff5fa2,#e8237a);color:#fff}
.lt-rosa :is(.ltb-sec-pays,.ltb-sec-faq,.ltb-sec-links) .ltb-h2{text-align:center;margin-bottom:22px}
.lt-rosa :is(.ltb-sec-pays,.ltb-sec-faq,.ltb-sec-links){padding:clamp(34px,6vw,50px) 0}
.lt-rosa .ltb-pays,.lt-rosa .ltb-links{justify-content:center}
.lt-rosa .ltb-pays li{padding:10px 18px;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(255,138,185,.35);font-weight:600}
.lt-rosa .ltb-faq{max-width:720px;margin:0 auto}
.lt-rosa .ltb-faq details{background:rgba(255,255,255,.06);border:1px solid rgba(255,138,185,.22);border-radius:14px}
.lt-rosa .ltb-faq summary::after{color:var(--r-pink3)}
.lt-rosa .ltb-faq p{color:var(--r-mut)}
.lt-rosa .ltb-link{background:rgba(255,255,255,.08);border:1px solid rgba(255,138,185,.35);border-radius:99px}
.lt-rosa .ltb-link svg{color:var(--r-pink3)}
.lt-rosa .ltb-foot{text-align:center;padding-top:28px;background:#22091a;color:#c993ad;font-size:12.5px;border-top:1px solid rgba(255,138,185,.15)}
.lt-rosa .ltb-foot .ltr-fsign{display:block;margin:0 0 6px;font-family:"Great Vibes",cursive;font-size:30px;color:#ff8ab9}
.lt-rosa .ltb-made a{color:#ff8ab9}
.lt-rosa .ltb-fab{background:linear-gradient(135deg,#ff5fa2,#e8237a)!important;box-shadow:0 10px 26px rgba(232,35,122,.5)!important}
.lt-rosa .lt-promo-in{background:#3d1029;border:1px solid rgba(255,138,185,.4);color:#fff;border-radius:16px}
.lt-rosa .lt-promo-tag,.lt-rosa .lt-promo-btn{background:linear-gradient(135deg,#ff5fa2,#e8237a);color:#fff}
.lt-rosa .lt-promo-u{background:#fff;color:var(--r-pink2)}
/* ===== movimiento (solo VIP, suave y liviano: transform/opacity) ===== */
.lt-rosa:not(.lt-static) .ltr-top{animation:ltr-in .7s .05s cubic-bezier(.16,1,.3,1) both}
.lt-rosa:not(.lt-static) .ltr-htx .ltb-h1{animation:ltr-in .9s .15s cubic-bezier(.16,1,.3,1) both}
.lt-rosa:not(.lt-static) .ltr-htx .ltb-sub{animation:ltr-in .9s .27s cubic-bezier(.16,1,.3,1) both}
.lt-rosa:not(.lt-static) .ltr-facts li{animation:ltr-in .7s calc(.36s + var(--k) * .08s) cubic-bezier(.16,1,.3,1) both}
.lt-rosa:not(.lt-static) .ltr-htx .ltr-btn,.lt-rosa:not(.lt-static) .ltr-from{animation:ltr-in .8s .55s cubic-bezier(.16,1,.3,1) both}
.lt-rosa:not(.lt-static) .ltr-hart>.ltr-art,.lt-rosa:not(.lt-static) .ltr-hart>.ltr-slot{animation:ltr-rise 1.1s .2s cubic-bezier(.16,1,.3,1) both}
.lt-rosa:not(.lt-static) .ltr-sign{animation:ltr-write 1.4s .9s cubic-bezier(.2,.8,.2,1) both}
.lt-rosa:not(.lt-static) .ltr-hart::before{animation:ltr-glow 4s ease-in-out infinite alternate}
.lt-rosa:not(.lt-static) .ltr-float i{animation:ltr-up var(--t) var(--d) ease-in infinite}
.lt-rosa:not(.lt-static) .ltr-deco.a{animation:ltr-bob 5s ease-in-out infinite alternate}
.lt-rosa:not(.lt-static) .ltr-deco.b{animation:ltr-bobr 6s -2s ease-in-out infinite alternate}
.lt-rosa:not(.lt-static) .ltr-btn::after{animation:ltr-shine 4s 1.6s ease-in-out infinite}
.lt-rosa:not(.lt-static) .ltr-band{animation:ltr-pan 10s ease-in-out infinite alternate}
.lt-rosa:not(.lt-static).ltb-rv .ltr-band .is-in .ltr-stat{animation:ltr-pop .6s calc(var(--k) * .09s + .1s) cubic-bezier(.3,1.6,.5,1) both}
.lt-rosa:not(.lt-static) .ltr-float b{animation:ltr-tw var(--t) var(--d) ease-in-out infinite}
.lt-rosa:not(.lt-static) .ltr-orb i{animation:ltr-orbit 9s linear infinite;animation-delay:calc(var(--k) * -3s)}
.lt-rosa:not(.lt-static) .ltr-hl{background-image:linear-gradient(90deg,#ff7eb3,#ff3d8f,#ffc2dc,#ff3d8f,#ff7eb3);background-size:250% 100%;animation:ltr-pan 6s ease-in-out infinite alternate}
.lt-rosa:not(.lt-static).ltb-rv .ltr-pic.is-in .ltr-frame{animation:ltr-rise .9s calc(var(--rvd,0ms) + .05s) cubic-bezier(.16,1,.3,1) both,ltr-bobf 5.5s calc(1s + var(--i,0) * .7s) ease-in-out infinite alternate}
.lt-rosa:not(.lt-static) .ltr-frame::after,.lt-rosa:not(.lt-static) .ltr-aart :is(.ltr-p1,.ltr-p2)::after{animation:ltr-shine 7s calc(2s + var(--i,0) * 1.2s) ease-in-out infinite}
.lt-rosa:not(.lt-static) .ltr-aart .ltr-p2::after{animation-delay:3.5s}
.lt-rosa:not(.lt-static).ltb-rv .ltr-aart.is-in .ltr-p1{animation:ltr-sl .9s .05s cubic-bezier(.16,1,.3,1) both,ltr-bobf 6s 1.1s ease-in-out infinite alternate}
.lt-rosa:not(.lt-static).ltb-rv .ltr-aart.is-in .ltr-p2{animation:ltr-sr .9s .25s cubic-bezier(.16,1,.3,1) both,ltr-bobf 6s 3s ease-in-out infinite alternate-reverse}
.lt-rosa:not(.lt-static).ltb-rv .ltr-card.is-in .ltb-logo{animation:ltr-pop .6s calc(var(--rvd,0ms) + .25s) cubic-bezier(.3,1.6,.5,1) both}
.lt-rosa:not(.lt-static) .ltr-tag{animation:ltr-tag 2.8s ease-in-out infinite}
.lt-rosa:not(.lt-static) .ltr-combo .ltr-tag{animation-name:ltr-tagc}
.lt-rosa .ltr-combo::before{content:"";position:absolute;inset:-5px;border-radius:27px;border:3px solid rgba(255,255,255,.95);box-shadow:0 0 22px rgba(255,255,255,.6);opacity:0;pointer-events:none}
.lt-rosa:not(.lt-static) .ltr-combo::before{animation:ltr-halo 3.6s ease-in-out infinite;animation-delay:calc(var(--i,0) * -1.2s)}
.lt-rosa:not(.lt-static) .ltr-band .is-in .ltr-stat b{display:inline-block;animation:ltr-beat 3.2s calc(1.4s + var(--k) * .4s) ease-in-out infinite}
.lt-rosa:not(.lt-static) .ltr-fsign{animation:ltr-glowt 3s ease-in-out infinite alternate}
.lt-rosa :is(.ltr-fx.ltr-zz,.ltb-off) :is(i,b,.ltr-hl,.ltr-frame,.ltr-p1,.ltr-p2,.ltr-tag),.lt-rosa :is(.ltr-fx.ltr-zz,.ltb-off) :is(.ltr-frame,.ltr-p1,.ltr-p2)::after,.lt-rosa :is(.ltr-fx.ltr-zz,.ltb-off) .ltr-combo::before,.lt-rosa .ltr-band.ltr-zz{animation-play-state:paused!important}
@keyframes ltr-tw{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:.9;transform:scale(1) rotate(45deg)}}
@keyframes ltr-orbit{0%{opacity:0;transform:rotate(0) translateX(150px) rotate(0) scale(.6)}10%,85%{opacity:1}50%{transform:rotate(180deg) translateX(150px) rotate(-180deg) scale(1.1)}100%{opacity:0;transform:rotate(360deg) translateX(150px) rotate(-360deg) scale(.6)}}
@keyframes ltr-bobf{from{transform:translateY(0)}to{transform:translateY(-10px)}}
@keyframes ltr-tag{0%,100%{box-shadow:0 6px 14px rgba(0,0,0,.25),0 0 0 0 rgba(255,255,255,.55)}50%{box-shadow:0 6px 14px rgba(0,0,0,.25),0 0 0 6px rgba(255,255,255,0)}}
@keyframes ltr-tagc{0%,100%{box-shadow:0 0 0 0 rgba(232,35,122,.5)}50%{box-shadow:0 0 0 7px rgba(232,35,122,0)}}
@keyframes ltr-halo{0%,100%{opacity:0}50%{opacity:.9}}
@keyframes ltr-beat{0%,80%,100%{transform:scale(1)}88%{transform:scale(1.12)}94%{transform:scale(.98)}}
@keyframes ltr-glowt{from{text-shadow:0 0 0 rgba(255,138,185,0)}to{text-shadow:0 0 18px rgba(255,138,185,.75)}}
@keyframes ltr-burst{0%{opacity:1;transform:translate(0,0) scale(.4) rotate(0)}70%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(1) rotate(var(--r))}}
@keyframes ltr-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes ltr-rise{from{opacity:0;transform:translateY(34px) scale(.97)}to{opacity:1;transform:none}}
@keyframes ltr-write{from{opacity:0;clip-path:inset(0 100% 0 0)}to{opacity:.85;clip-path:inset(0 -5% 0 0)}}
@keyframes ltr-glow{from{opacity:.7;transform:scale(.95)}to{opacity:1;transform:scale(1.05)}}
@keyframes ltr-up{0%{opacity:0;transform:translate3d(0,0,0) rotate(0)}15%{opacity:.85}85%{opacity:.5}100%{opacity:0;transform:translate3d(var(--dx),calc(var(--h,560px) * -1),0) rotate(var(--r))}}
@keyframes ltr-bob{from{transform:translateY(0) rotate(-4deg)}to{transform:translateY(-12px) rotate(4deg)}}
@keyframes ltr-bobr{from{transform:scaleX(-1) translateY(0) rotate(-4deg)}to{transform:scaleX(-1) translateY(-12px) rotate(4deg)}}
@keyframes ltr-shine{0%,65%{left:-60%;opacity:0}66%{opacity:1}100%{left:130%;opacity:1}}
@keyframes ltr-pan{from{background-position:0% 50%}to{background-position:100% 50%}}
@keyframes ltr-pop{from{opacity:0;transform:scale(.6) translateY(10px)}to{opacity:1;transform:none}}
@keyframes ltr-sl{from{opacity:0;transform:translateX(-30px) rotate(-3deg)}to{opacity:1;transform:none}}
@keyframes ltr-sr{from{opacity:0;transform:translateX(30px) rotate(3deg)}to{opacity:1;transform:none}}
.lt-rosa .ltb-off :is(.ltr-hart,.ltr-float i,.ltr-deco,.ltr-btn,.ltr-orb i),.lt-rosa .ltb-off :is(.ltr-hart,.ltr-btn)::before,.lt-rosa .ltb-off :is(.ltr-hart,.ltr-btn)::after{animation-play-state:paused!important}
@media (max-width:520px){.lt-rosa .ltr-hwa span{display:none}.lt-rosa .ltr-hwa{padding:9px}.lt-rosa .ltr-float i:nth-child(n+7){display:none}.lt-rosa .ltr-float b:nth-last-child(-n+2){display:none}@keyframes ltr-orbit{0%{opacity:0;transform:rotate(0) translateX(105px) rotate(0) scale(.6)}10%,85%{opacity:1}50%{transform:rotate(180deg) translateX(105px) rotate(-180deg) scale(1.1)}100%{opacity:0;transform:rotate(360deg) translateX(105px) rotate(-360deg) scale(.6)}}}
`;

  function renderRosa(root, d, ctx) {
    LC.injectCss('rosa', CSS_ROSA);
    const cl = setup(root, ctx, d, 'rosa');
    const pm = !!ctx.profileMode && typeof ctx.profileHeader === 'function';
    if (pm) root.classList.add('ltb-pm');
    const { plans, combos } = visible(d, ctx);
    const wa = d.whatsapp ? ctx.buy('tus planes') : '';
    const ids = ctx.platformIds || platformIds(plans, combos);
    const ini = ctx.esc((d.name.trim().charAt(0) || 'S').toUpperCase());
    const mark = d.logoUrl ? `<img src="${ctx.esc(d.logoUrl)}" alt="" width="42" height="42" decoding="async">` : `<span class="ltr-mono" aria-hidden="true">${ini}</span>`;
    const cta = (label, path, cls = '') => wa ? `<a class="ltr-btn${cls}" data-lt-btn="main" href="${ctx.esc(wa)}" target="_blank" rel="noopener">${ctx.linkIcon('whatsapp')}<span${path ? ed(ctx, path) : ''}>${ctx.esc(label)}</span></a>` : `<button type="button" class="ltr-btn${cls}" data-goto="plans">Ver planes</button>`;
    // Partículas por sección (corazones y destellos que suben + destellos que titilan en su sitio).
    // Semilla fija (mismo dibujo en cada visita); se pausan fuera de pantalla.
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const fx = !(ctx.noMotion || ctx.reducedMotion);
    const pals = { dark: ['#ff8ab9', '#ffd1e5', '#ff3d8f'], pink: ['#ffffff', '#ffe1ee', '#ffd1e5'] };
    const parts = (n, tw, h, pal = 'dark') => !fx ? '' : `<div class="ltr-float" aria-hidden="true" style="--h:${h}px">` +
      Array.from({ length: n }, (_, k) => `<i style="--x:${(3 + rnd() * 94).toFixed(1)}%;--s:${(9 + rnd() * 13).toFixed(0)}px;--t:${(10 + rnd() * 9).toFixed(1)}s;--d:${(-rnd() * 18).toFixed(1)}s;--dx:${(rnd() * 80 - 40).toFixed(0)}px;--r:${(rnd() * 70 - 35).toFixed(0)}deg;--c:${pals[pal][k % 3]}"><svg viewBox="0 0 24 24">${k % 3 === 1 ? RS_I.sparkle : RS_I.heart}</svg></i>`).join('') +
      Array.from({ length: tw }, (_, k) => `<b style="--x:${(4 + rnd() * 92).toFixed(1)}%;--y:${(6 + rnd() * 86).toFixed(1)}%;--s:${(8 + rnd() * 10).toFixed(0)}px;--t:${(2.4 + rnd() * 2.6).toFixed(1)}s;--d:${(-rnd() * 5).toFixed(1)}s;--c:${pals[pal][(k + 1) % 3]}"><svg viewBox="0 0 24 24">${RS_I.sparkle}</svg></b>`).join('') + '</div>';
    const floats = parts(13, 5, 620);
    const deco = RS_ART.deco ? `<img class="ltr-deco a" src="${RS_IMG}${RS_ART.deco}" alt="" decoding="async"><img class="ltr-deco b" src="${RS_IMG}${RS_ART.deco}" alt="" decoding="async">` : '';
    const facts = [['zap', 'Activación inmediata'], ['headset', ctx.hours247 === false ? `Atención: ${ctx.hours}` : 'Atención 24/7 por WhatsApp'], ['shield', 'Cuentas originales con garantía']];
    // franja: datos reales de la tienda (o la cuenta regresiva de Navidad/Año Nuevo si la oferta no está activa)
    const stats = [];
    if (ids.length) stats.push([String(ids.length), ids.length === 1 ? 'App' : 'Apps', 1]);
    if (ctx.minPrice) stats.push([ctx.minPrice.replace(/\s+/g, '\u00a0'), 'desde', 1]);
    stats.push([ctx.hours || '24/7', ctx.hours247 === false ? 'horario' : 'atención', 0, !!ctx.hoursLong]);
    if (combos.length) stats.push([String(combos.length), combos.length === 1 ? 'combo' : 'combos', 1]);
    const bens = d.benefits.slice(0, 3);
    while (bens.length < 3) bens.push(['Precios bajos, sin pagar de más', 'Cuentas estables todo el mes', 'Atención rápida por WhatsApp'][bens.length]);
    const aboutTxt = `<p>En <b>${ctx.esc(d.name)}</b> te ayudamos a disfrutar tus plataformas favoritas sin complicaciones: cuentas y perfiles originales, activación en minutos y atención directa por WhatsApp.</p>` +
      `<p>${ctx.esc(d.tagline || 'Tus plataformas favoritas al mejor precio')}. Escríbenos y te recomendamos el plan perfecto para ti.</p>`;
    const html =
      (pm ? ctx.profileHeader() : '') +
      `<section class="ltr-hero" data-lt-hero>${floats}${deco}<div class="ltb-wrap">` +
      (pm ? '' : `<div class="ltr-top"><a class="ltr-brand" href="#" data-goto="plans">${mark}<span><b${ed(ctx, 'name')}>${ctx.esc(d.name)}</b>${d.tagline ? `<small${ed(ctx, 'tagline')}>${ctx.esc(d.tagline)}</small>` : ''}</span></a>` +
        `${wa ? `<a class="ltr-hwa" data-lt-btn href="${ctx.esc(wa)}" target="_blank" rel="noopener">${ctx.linkIcon('whatsapp')}<span>WhatsApp</span></a>` : ''}</div>` +
        (d.coverUrl ? `<figure class="ltr-cov"><img src="${ctx.esc(d.coverUrl)}" alt="Portada de ${ctx.esc(d.name)}" width="1200" height="444" decoding="async" fetchpriority="high"></figure>` : '')) +
      `<div class="ltr-hin"><div class="ltr-htx"><h1 class="ltb-h1"${ed(ctx, 'heroTitle')}>${rsAccent(ctx, d.heroTitle || LC.DEFAULTS.heroTitle, 3)}</h1>` +
      `<p class="ltb-sub"${ed(ctx, 'heroSubtitle')}>${ctx.esc(d.heroSubtitle || LC.DEFAULTS.heroSubtitle)}</p>` +
      `<ul class="ltr-facts">${facts.map(([ic, t], k) => `<li style="--k:${k}">${rsi(ic)}<span>${t}</span></li>`).join('')}</ul>` +
      `${cta(d.ctaText, 'ctaText')}${ctx.minPrice ? `<p class="ltr-from">Planes desde <b>${ctx.esc(ctx.minPrice)}</b></p>` : ''}</div>` +
      `<div class="ltr-hart">${fx ? `<span class="ltr-orb" aria-hidden="true">${[0, 1, 2].map(k => `<i style="--k:${k}"><svg viewBox="0 0 24 24">${k === 1 ? RS_I.heart : RS_I.sparkle}</svg></i>`).join('')}</span>` : ''}${rsArt('hero', '', 'Personaje (PNG sin fondo)')}<span class="ltr-sign" aria-hidden="true">${ctx.esc(d.name)}</span></div></div></div></section>` +
      promo(ctx) +
      `<section class="ltr-band ltr-fx">${parts(4, 7, 260, 'pink')}<div class="ltb-wrap" data-rv><h2>Todas tus plataformas favoritas en un solo lugar, <b>con atención de verdad</b></h2>` +
      `<div class="ltr-stats"><span class="ltr-slabel">Aquí <br>tienes:</span>${stats.slice(0, 4).map(([n, l, c, lg], k) => `<span class="ltr-stat${lg ? ' is-long' : ''}" style="--k:${k}"><b${c ? ' data-rs-num' : ''}>${ctx.esc(n)}</b><small>${ctx.esc(l)}</small></span>`).join('')}</div></div></section>` +
      `<section class="ltb-sec ltb-sec-benefits ltr-dark ltr-fx">${parts(7, 5, 900)}<div class="ltb-wrap">${rsHead(`¿Por qué comprar <span class="ltr-hl">con nosotros?</span>`)}` +
      `<div class="ltr-pics">${bens.map((b, i) => `<figure class="ltr-pic" data-rv style="--i:${i}"><div class="ltr-frame">${rsArt('card' + (i + 1), '', 'Foto ' + (i + 1))}</div><figcaption${i < d.benefits.length ? ed(ctx, `benefits.${i}`) : ''}>${ctx.esc(b)}</figcaption></figure>`).join('')}</div></div></section>` +
      (plans.length ? `<section class="ltb-sec ltb-sec-plans ltr-dark ltr-fx">${parts(8, 6, 1100)}<div class="ltb-wrap">${rsHead(`Elige tu <span class="ltr-hl">plataforma favorita</span>`, 'Cuentas originales, estables y al mejor precio.')}<div class="ltr-grid">${plans.map((p, i) => rsPlan(ctx, p, i)).join('')}</div></div></section>` : '') +
      (combos.length ? `<section class="ltb-sec ltb-sec-combos ltr-pinksec ltr-fx">${parts(7, 6, 800, 'pink')}<div class="ltb-wrap">${rsHead('Combos para ahorrar más')}<div class="ltr-combos">${combos.map((c, i) => rsCombo(ctx, c, i)).join('')}</div></div></section>` : '') +
      `<section class="ltb-sec ltb-sec-who ltr-fx ${combos.length ? 'ltr-dark' : 'ltr-pinksec'}">${parts(7, 5, 800, combos.length ? 'dark' : 'pink')}<div class="ltb-wrap"><div class="ltr-about"><div class="ltr-atx" data-rv><h2>${ctx.esc(d.name)}</h2>${aboutTxt}${cta('Escríbenos ahora')}</div>` +
      `<div class="ltr-aart" data-rv><div class="ltr-p1">${rsArt('about1', '', 'Foto a color')}</div><div class="ltr-p2">${rsArt('about2', '', 'Foto en blanco y negro')}</div></div></div></div></section>` +
      (d.reviews && d.reviews.length ? `<section class="ltb-sec ltb-sec-reviews ltr-dark ltr-fx">${parts(6, 4, 700)}<div class="ltb-wrap">${rsHead(`Lo que dicen <span class="ltr-hl">nuestras clientas</span>`)}${reviewsHtml(ctx, d)}</div></section>` : '') +
      `<div class="ltr-tail ltr-fx">${parts(8, 6, 1000)}` + (d.paymentMethods.length ? sec('pays', `Paga <span class="ltr-hl">como quieras</span>`, `<ul class="ltb-pays" data-rv>${d.paymentMethods.map((p, i) => `<li${ed(ctx, `paymentMethods.${i}`)}>${ctx.esc(p)}</li>`).join('')}</ul>`) : '') +
      faqSec(ctx, d, `Preguntas <span class="ltr-hl">frecuentes</span>`) +
      linksSec(ctx, d, `Síguenos en <span class="ltr-hl">redes</span>`) +
      '</div>' + footer(ctx, d, `<span class="ltr-fsign">${ctx.esc(d.name)}</span>`) + fab(ctx, wa);
    root.innerHTML = html;
    motionKit(root, ctx, cl);
    rsMotion(root, ctx, cl);
  }
  /** ANIM (VIP): pausa partículas fuera de pantalla (también franja y cierre), cuenta de números y corazones al tocar. */
  function rsMotion(root, ctx, cl) {
    if (ctx.noMotion || typeof G.IntersectionObserver !== 'function') return;
    const fxs = root.querySelectorAll('.ltr-fx');
    const io = new G.IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('ltr-zz', !en.isIntersecting)), { rootMargin: '120px 0px 120px 0px' });
    fxs.forEach(e => io.observe(e));
    cl.push(() => io.disconnect());
    if (ctx.reducedMotion) return;
    // cuenta 0 → número en la franja (6 apps, S/ 8, 2 combos)
    if (!cl.still && typeof G.requestAnimationFrame === 'function') {
      const nums = [...root.querySelectorAll('[data-rs-num]')], live = new Map();
      const cio = new G.IntersectionObserver(es => es.forEach(en => {
        if (!en.isIntersecting) return; cio.unobserve(en.target);
        const el = en.target, txt = el.textContent, m = txt.match(/\d+(?:[.,]\d{1,2})?/);
        if (!m) return;
        const num = m[0], dec = (num.split(/[.,]/)[1] || '').length, sep = num.includes(',') ? ',' : '.', to = parseFloat(num.replace(',', '.'));
        if (!(to > 0)) return;
        const t0 = G.performance ? G.performance.now() : Date.now(), dur = 1100;
        el.__rsTxt = txt;
        const step = now => {
          if (!el.isConnected) return live.delete(el);
          const k = Math.min(1, Math.max(0, (now - t0) / dur)), v = to * (1 - Math.pow(1 - k, 3));
          el.textContent = k < 1 ? txt.replace(num, v.toFixed(dec).replace('.', sep)) : txt;
          if (k < 1) live.set(el, G.requestAnimationFrame(step)); else live.delete(el);
        };
        live.set(el, G.requestAnimationFrame(step));
      }), { threshold: .5 });
      nums.forEach(e => cio.observe(e));
      cl.push(() => { cio.disconnect(); live.forEach((id, el) => { G.cancelAnimationFrame(id); if (el.__rsTxt != null) el.textContent = el.__rsTxt; }); });
    }
    // corazones y destellos que salen del dedo al tocar un botón
    if (ctx.preview) return;
    const down = e => {
      const b = e.target && e.target.closest ? e.target.closest('[data-lt-btn],.ltr-btn') : null;
      if (!b || !root.contains(b)) return;
      const layer = root.ownerDocument.createElement('div');
      layer.className = 'ltr-burst'; layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
      let h = '';
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + Math.random() * .5, dd = 40 + Math.random() * 46; h += `<i style="--x:${(Math.cos(a) * dd).toFixed(0)}px;--y:${(Math.sin(a) * dd - 24).toFixed(0)}px;--r:${(Math.random() * 80 - 40).toFixed(0)}deg"><svg viewBox="0 0 24 24">${k % 2 ? RS_I.sparkle : RS_I.heart}</svg></i>`; }
      layer.innerHTML = h; root.appendChild(layer);
      G.setTimeout(() => layer.remove(), 900);
    };
    root.addEventListener('pointerdown', down, { passive: true });
    cl.push(() => root.removeEventListener('pointerdown', down));
  }

  LC.registerTemplate({
    id: 'rosa', parts: [{ k: 'hero', label: 'Personaje', sel: '.ltr-hart', x: true }, { k: 'sign', label: 'Firma', sel: '.ltr-sign', x: true }, { k: 'deco', label: 'Decoración flotante', sel: '.ltr-deco', x: true }, { k: 'hearts', label: 'Corazones y destellos', sel: '.ltr-float,.ltr-orb' }, { k: 'who', label: 'Fotos de quién atiende', sel: '.ltr-aart', x: true }], name: 'Rosa Glam', description: 'Femenina y minimalista: ciruela con rosa, fotos redondeadas y detalles con corazones',
    tags: ['femenina', 'elegante', 'animada'], preview: { bg: '#2a0d1e', fg: '#fff6fa', accent: '#ff3d8f' }, render: renderRosa
  });

  // =====================================================================
  // VERANO — piscina tropical luminosa: cielo celeste con sol, palmeras reales (PNG), sol con las apps de la tienda,
  // franja de agua con borde rosado, tarjetas blancas sobre agua con reflejos, arena con lentes y coco,
  // y cierre con flamenco flotando. Imágenes optimizadas en js/img/vr-*.webp.
  // =====================================================================
  const VR_IMG = RS_IMG;
  const VR = { palm1: 'vr-palma1.webp', palm2: 'vr-palma2.webp', shades: 'vr-lentes.webp', flamingo: 'vr-flamenco.webp', water: 'vr-agua.webp', coco: 'vr-coco.webp' };
  const VR_I = {
    zap: RS_I.zap, shield: RS_I.shield, headset: RS_I.headset, heart: RS_I.heart, sparkle: RS_I.sparkle, check: RS_I.check,
    devices: '<rect width="14" height="10" x="2" y="4" rx="1.5"/><path d="M6 18h6M9 14v4"/><rect width="6" height="10" x="16" y="9" rx="1.5"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  const vri = (k, cls = 'ltv-ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${VR_I[k]}</svg>`;
  /** Cáusticas (luz en el fondo de la piscina): ruido SVG convertido en líneas brillantes; mosaico sin cortes. */
  const vrCaustic = (seed, f1, f2) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='f' x='0' y='0' width='1' height='1'><feTurbulence type='fractalNoise' baseFrequency='${f1} ${f2}' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1 0 0 0 0'/><feComponentTransfer><feFuncA type='table' tableValues='0 0 0 .1 .55 1 .55 .1 0 0 0'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(#f)'/></svg>`)}")`;
  const VR_C1 = vrCaustic(4, 0.0125, 0.0175), VR_C2 = vrCaustic(9, 0.015, 0.01);
  const vrImg = (k, cls, eager) => `<img class="${cls}" src="${VR_IMG}${VR[k]}" alt="" decoding="async" loading="${eager ? 'eager' : 'lazy'}" draggable="false">`;
  const vrPalm = (cls, k = 'palm1', eager) => `<span class="ltv-palm ${cls}" aria-hidden="true">${vrImg(k, '', eager)}</span>`;
  /** Palabras del título; las 2 últimas van resaltadas con marcador amarillo. */
  function vrTitle(ctx, text) {
    const w = String(text || '').trim().split(/\s+/).filter(Boolean), k = w.length >= 4 ? 3 : w.length >= 2 ? 1 : 0;
    const a = w.slice(0, w.length - k).join(' '), b = w.slice(w.length - k).join(' ');
    return `${a ? `<span class="ltv-tw">${ctx.esc(a)}</span> ` : ''}${b ? `<span class="ltv-mk"><span>${ctx.esc(b)}</span></span>` : ''}`;
  }
  const vrMark = (ctx, text) => { const w = String(text).split(' '); return w.length < 2 ? `<span class="ltv-mk"><span>${ctx.esc(text)}</span></span>` : `${ctx.esc(w.slice(0, -2).join(' '))} <span class="ltv-mk"><span>${ctx.esc(w.slice(-2).join(' '))}</span></span>`; };
  const vrHead = (html, sub, cls = '') => `<div class="ltv-hd ${cls}" data-rv><h2 class="ltb-h2"><i class="ltv-tick l" aria-hidden="true"></i>${html}<i class="ltv-tick r" aria-hidden="true"></i></h2>${sub ? `<p>${sub}</p>` : ''}</div>`;
  function vrPrice(ctx, price, old, period, path) {
    const m = ctx.money(price), o = ctx.money(old);
    if (!m) return `<div class="ltv-price is-ask"><strong${ed(ctx, path)}>Precio a consultar</strong></div>`;
    return `<div class="ltv-price">${o ? `<s><span class="ltb-sr">Antes </span>${ctx.esc(o)}</s>` : ''}<strong${ed(ctx, path)}>${ctx.esc(m)}</strong>${period ? `<small>/ ${ctx.esc(period)}</small>` : ''}</div>`;
  }
  function vrPlan(ctx, p, i) {
    const inf = ctx.platformInfo(p.platform), url = planBuy(ctx, p);
    return `<article class="ltb-card ltv-app" data-rv data-lt-card${itm(ctx, 'p', p.id)} style="--i:${i % 8}">` +
      `${p.badge ? `<span class="ltv-badge">${ctx.esc(p.badge)}</span>` : ''}` +
      `<div class="ltv-atop">${logoHtml(ctx, p.platform, 'ltb-logo', p.imageUrl, ctx.planTitle(p))}<div class="ltv-aname"><h3 class="ltb-title"${ed(ctx, `plans.${p.id}.title`)}>${ctx.esc(p.title || inf.name)}</h3><span>${ctx.esc(ctx.typeLabel(p))}</span></div></div>` +
      vrPrice(ctx, p.price, p.oldPrice, p.period, `plans.${p.id}.price`) +
      (p.features.length ? `<ul class="ltv-feats">${p.features.map((f, k) => `<li>${vri('check')}<span${ed(ctx, `plans.${p.id}.features.${k}`)}>${ctx.esc(f)}</span></li>`).join('')}</ul>` : '') +
      `${url ? `<a class="ltv-abtn" data-lt-btn href="${ctx.esc(url)}" target="_blank" rel="noopener"><span>${ctx.money(p.price) ? 'Lo quiero' : 'Consultar'}</span>${vri('arrow')}</a>` : ''}</article>`;
  }
  function vrCombo(ctx, c, i) {
    const url = comboBuy(ctx, c), names = c.platforms.map(x => ctx.platformInfo(x).name), n = c.platforms.length;
    return `<article class="ltb-card ltv-combo${i % 2 ? ' is-alt' : ''}" data-rv data-lt-card${itm(ctx, 'c', c.id)} style="--i:${i % 8}">` +
      `<header class="ltv-chead"><i class="ltv-caus" aria-hidden="true"></i>${c.badge ? `<span class="ltv-badge">${ctx.esc(c.badge)}</span>` : ''}` +
      `<h3 class="ltb-title"${ed(ctx, `combos.${c.id}.name`)}>${ctx.esc(c.name)}</h3><p>${n} ${n === 1 ? 'app' : 'apps'} en un solo pago</p>` +
      `<div class="ltv-clogos">${c.platforms.map((x, k) => `<span style="--k:${k}">${logoHtml(ctx, x, 'ltb-logo')}</span>`).join('')}</div></header>` +
      (c.imageUrl ? comboPhoto(ctx, c) : '') +
      `<div class="ltv-cbody">${vrPrice(ctx, c.price, c.oldPrice, c.period, `combos.${c.id}.price`)}<ul class="ltv-feats">${names.map(x => `<li>${vri('check')}<span>${ctx.esc(x)}</span></li>`).join('')}</ul>` +
      `${url ? `<a class="ltv-cbtn" data-lt-btn href="${ctx.esc(url)}" target="_blank" rel="noopener"><span>${ctx.money(c.price) ? 'Quiero este combo' : 'Consultar precio'}</span>${vri('arrow')}</a>` : ''}</div></article>`;
  }

  const CSS_VERANO = `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Manrope:wght@500;600;700;800&display=swap');` + baseCss('verano') + `
.lt-verano{--v-ink:#073b4c;--v-ink2:#2f5f6c;--v-teal:#0a8fa3;--v-teal2:#066e82;--v-aqua:#0bbfd3;--v-foam:#d9f7f8;--v-sun:#ffd43b;--v-sun2:#ffb020;--v-green:#22c55e;--v-pink:#ff4fa3;--v-sand:#f7e3b8;background:#eafaff;color:var(--v-ink);font-family:Manrope,"Segoe UI",system-ui,-apple-system,Roboto,sans-serif}
.lt-verano .ltb-wrap{max-width:1120px}
.lt-verano .ltb-h1,.lt-verano .ltb-h2,.lt-verano h3,.lt-verano .ltv-price strong{font-family:"Bricolage Grotesque",Manrope,system-ui,sans-serif;letter-spacing:-.025em}
.lt-verano .ltv-ic{width:18px;height:18px;flex:none}
/* marcador amarillo bajo palabras clave */
.lt-verano .ltv-mk{position:relative;display:inline-block;white-space:nowrap;z-index:0}
.lt-verano .ltv-mk::before{content:"";position:absolute;z-index:-1;left:-.12em;right:-.14em;bottom:.04em;height:.5em;border-radius:.18em .4em .22em .5em;background:linear-gradient(90deg,#ffe14d,#ffd21f 60%,#ffe66b);transform:rotate(-1.5deg) skewX(-8deg);transform-origin:left center}
/* palmeras reales */
.lt-verano .ltv-palm{position:absolute;z-index:4;pointer-events:none;width:var(--pw,clamp(150px,20vw,280px))}
.lt-verano .ltv-palm img{display:block;width:100%;height:auto;transform-origin:20% 100%;user-select:none}
/* ===== cielo / portada ===== */
.lt-verano .ltv-sky{position:relative;overflow:hidden;background:radial-gradient(ellipse 45% 55% at 82% 30%,rgba(255,236,150,.55),transparent 70%),linear-gradient(180deg,#38c1f5 0%,#6fd6fb 32%,#aee9fd 62%,#d8f6ff 100%)}
.lt-verano .ltv-cloud{position:absolute;z-index:0;left:0;top:var(--y);width:var(--w);height:calc(var(--w) * .32);pointer-events:none;opacity:var(--o,.9);transform:translateX(var(--x0));filter:blur(4px)}
.lt-verano .ltv-cloud::before{content:"";position:absolute;left:6%;right:6%;bottom:0;height:52%;border-radius:999px;background:#fff}
.lt-verano .ltv-cloud::after{content:"";position:absolute;left:26%;width:42%;bottom:20%;height:92%;border-radius:50%;background:#fff;box-shadow:-34% 26% 0 -8% #fff,46% 20% 0 -12% #fff}
.lt-verano .ltv-sky .ltv-palm.tl{left:-46px;top:-40px;--pw:clamp(150px,19vw,260px);transform:rotate(-150deg) scaleX(-1)}
.lt-verano .ltv-sky .ltv-palm.tr{right:-60px;top:-50px;--pw:clamp(170px,22vw,300px);transform:rotate(150deg)}
.lt-verano .ltv-sky .ltv-palm.mr{right:-70px;top:44%;--pw:clamp(130px,16vw,230px);transform:rotate(-120deg) scaleX(-1)}
.lt-verano .ltv-top{position:relative;z-index:6;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 0 0}
.lt-verano .ltv-brand{display:flex;align-items:center;gap:10px;min-width:0;padding:6px 18px 6px 6px;border-radius:999px;background:rgba(255,255,255,.75);border:1px solid #fff;box-shadow:0 10px 26px rgba(7,59,76,.12);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:var(--v-ink);text-decoration:none}
.lt-verano .ltv-brand img,.lt-verano .ltv-mono{width:40px;height:40px;border-radius:50%;object-fit:cover;flex:none}
.lt-verano .ltv-mono{display:grid;place-items:center;background:linear-gradient(135deg,var(--v-aqua),var(--v-teal2));color:#fff;font:800 17px "Bricolage Grotesque",sans-serif}
.lt-verano .ltv-brand b{display:block;font:800 16px/1.15 "Bricolage Grotesque",sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(48vw,300px)}
.lt-verano .ltv-brand small{display:block;font-size:11.5px;font-weight:600;color:var(--v-ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(48vw,300px)}
.lt-verano .ltv-nav{display:none;gap:4px;padding:0;margin:0;list-style:none}
@media (min-width:980px){.lt-verano .ltv-nav{display:flex}}
.lt-verano .ltv-nav button{border:0;background:none;cursor:pointer;padding:8px 12px;border-radius:999px;font:700 14.5px Manrope,sans-serif;color:var(--v-ink);transition:background .2s}
.lt-verano .ltv-nav button:hover{background:rgba(255,255,255,.6)}
.lt-verano .ltv-hwa{flex:none;display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:999px;background:linear-gradient(180deg,#34d46c,#16a34a);color:#fff;font-weight:800;font-size:14.5px;text-decoration:none;box-shadow:0 10px 22px rgba(22,163,74,.35)}
.lt-verano .ltv-hwa svg{width:18px;height:18px}
.lt-verano .ltv-cov{position:relative;z-index:5;margin:16px 0 0;border-radius:26px;overflow:hidden;aspect-ratio:851/315;max-height:340px;border:4px solid #fff;box-shadow:0 22px 44px rgba(7,59,76,.2)}
.lt-verano .ltv-cov img{width:100%;height:100%;object-fit:cover;display:block}
.lt-verano .ltp{position:relative;z-index:5;color:var(--v-ink)}
.lt-verano .ltp-cover{border:4px solid #fff;border-top:0;box-shadow:0 22px 44px rgba(7,59,76,.2);background:linear-gradient(135deg,#0bbfd3,#ffd43b)}
.lt-verano .ltp-ring{background:conic-gradient(#ffd43b,#ff4fa3,#0bbfd3,#22c55e,#ffd43b)}
.lt-verano .ltp-avatar-in{border-color:#fff;background:#fff}
.lt-verano .ltp-initial{display:grid;place-items:center;width:100%;height:100%;color:#fff;font-family:"Bricolage Grotesque",sans-serif;background:linear-gradient(135deg,var(--v-aqua),var(--v-teal2))}
.lt-verano .ltp-name{font:800 clamp(26px,5.4vw,38px)/1.05 "Bricolage Grotesque",sans-serif;letter-spacing:-.02em;color:var(--v-ink)}
.lt-verano .ltp-tag{color:var(--v-ink2);opacity:1;font-weight:600}
.lt-verano .ltp-meta{color:var(--v-ink);opacity:.8;font-weight:700}
.lt-verano .ltp-online i{background:var(--v-green)}
.lt-verano .ltp-social{background:#fff;border-color:#fff;color:var(--v-ink);box-shadow:0 6px 14px rgba(7,59,76,.12)}
.lt-verano .ltv-hero{position:relative;z-index:3}
.lt-verano .ltv-hin{position:relative;display:grid;gap:18px;align-items:center;padding:34px 0 20px}
@media (min-width:900px){.lt-verano .ltv-hin{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:30px;padding:40px 0 70px;min-height:470px}}
.lt-verano .ltv-htx{min-width:0;position:relative;z-index:2}
.lt-verano .ltb-h1{margin:0 0 16px;font-size:clamp(38px,6.2vw,70px);font-weight:800;line-height:1.02;color:var(--v-ink);text-wrap:balance}
.lt-verano .ltv-sub{margin:0 0 24px;max-width:44ch;font-size:clamp(15.5px,3.8vw,18px);line-height:1.55;font-weight:600;color:var(--v-ink2)}
.lt-verano .ltv-ctas{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.lt-verano .ltv-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:54px;padding:14px 26px;border-radius:999px;border:0;cursor:pointer;overflow:hidden;font:800 16px/1.1 Manrope,sans-serif;text-decoration:none;text-align:center;color:#2a1a00;background:linear-gradient(180deg,#ffe45c 0%,#ffd21f 55%,#ffbf00 100%);box-shadow:0 5px 0 #e0a500,0 14px 26px rgba(224,165,0,.35);transition:transform .18s cubic-bezier(.3,1.5,.5,1),box-shadow .18s}
.lt-verano .ltv-btn svg{width:20px;height:20px;flex:none}
.lt-verano .ltv-btn:hover{transform:translateY(-2px)}
.lt-verano .ltv-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #e0a500,0 6px 12px rgba(224,165,0,.3)}
.lt-verano .ltv-btn::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:36%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent);transform:skewX(-20deg);pointer-events:none;opacity:0}
.lt-verano .ltv-btn.is-green{color:#fff;background:linear-gradient(180deg,#3ddc77,#16a34a);box-shadow:0 5px 0 #0f7a36,0 14px 26px rgba(22,163,74,.35)}
.lt-verano .ltv-ghost{display:inline-flex;align-items:center;min-height:54px;padding:14px 24px;border-radius:999px;border:0;background:#fff;color:var(--v-ink);font:800 15.5px Manrope,sans-serif;cursor:pointer;box-shadow:0 10px 22px rgba(7,59,76,.12)}
.lt-verano .ltv-proof{display:flex;flex-wrap:wrap;gap:10px 20px;margin:22px 0 0;padding:0;list-style:none;font-size:14px;font-weight:800;color:var(--v-ink)}
.lt-verano .ltv-proof li{display:flex;align-items:center;gap:8px}
.lt-verano .ltv-proof .ltv-ic{width:24px;height:24px;padding:4px;border-radius:50%;background:var(--v-aqua);color:#fff}
.lt-verano .ltv-proof li:nth-child(2) .ltv-ic{background:#0ea5e9}.lt-verano .ltv-proof li:nth-child(3) .ltv-ic{background:var(--v-green)}
/* sol con las apps */
.lt-verano .ltv-stage{position:relative;justify-self:center;width:min(460px,100%);aspect-ratio:1}
.lt-verano .ltv-glow{position:absolute;inset:-12%;border-radius:50%;background:radial-gradient(circle,rgba(255,233,140,.9) 0,rgba(255,214,90,.45) 38%,transparent 66%)}
.lt-verano .ltv-orb{position:absolute;inset:6%;border-radius:50%;background:radial-gradient(circle at 38% 30%,#fffbe0 0%,#ffe766 32%,#ffc928 66%,#ffa91a 100%);box-shadow:0 0 0 10px rgba(255,255,255,.35),0 30px 70px rgba(255,150,20,.35)}
.lt-verano .ltv-tiles{position:absolute;inset:20% 14% 22%;display:grid;grid-template-columns:repeat(3,1fr);gap:8%;align-content:center;justify-items:center;transform:rotate(-6deg)}
.lt-verano .ltv-tiles.n4{grid-template-columns:repeat(2,1fr);inset:18% 22% 22%}
.lt-verano .ltv-tile{width:100%;max-width:96px;aspect-ratio:1}
.lt-verano .ltv-tile .ltb-logo{width:100%;height:100%;border-radius:24%;box-shadow:0 14px 24px rgba(160,80,0,.32),0 0 0 3px rgba(255,255,255,.7)}
.lt-verano .ltv-hart{position:absolute;inset:6% 4% 8%;z-index:2}
.lt-verano .ltv-hart img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 22px 26px rgba(7,59,76,.3))}
.lt-verano .ltv-chip{position:absolute;z-index:3;left:-2%;top:6%;padding:10px 16px;border-radius:18px;background:#fff;box-shadow:0 16px 30px rgba(7,59,76,.18);font-weight:800;font-size:12px;color:var(--v-ink2);line-height:1.1}
.lt-verano .ltv-chip b{display:block;font:800 24px/1 "Bricolage Grotesque",sans-serif;color:var(--v-ink);margin-top:3px}
@media (max-width:899px){.lt-verano .ltv-htx{text-align:center}.lt-verano .ltv-sub{margin-left:auto;margin-right:auto}.lt-verano .ltv-ctas,.lt-verano .ltv-proof{justify-content:center}.lt-verano .ltv-stage{width:min(320px,82%)}}
/* franja de agua con borde rosado (imagen) */
.lt-verano .ltv-edge{position:relative;z-index:4;height:clamp(64px,14.6vw,260px);margin-top:clamp(-70px,-5vw,-30px);background:url("${VR_IMG}${VR.water}") center bottom/100% 100% no-repeat;pointer-events:none;margin-bottom:-3px}
.lt-verano .ltv-edge::after{content:"";position:absolute;inset:40% 0 0;background-image:${VR_C1};background-size:300px 300px;mix-blend-mode:screen;opacity:.35;-webkit-mask:linear-gradient(180deg,transparent,#000 30%);mask:linear-gradient(180deg,transparent,#000 30%)}
/* ===== piscina (planes) ===== */
.lt-verano .ltv-fx{position:relative;overflow:hidden}
.lt-verano .ltv-fx>.ltb-wrap{position:relative;z-index:3}
.lt-verano .ltv-pool{margin-top:-2px;color:#fff;background:linear-gradient(180deg,#03aec6 0%,#06b6cc 8%,#0cc3d8 35%,#14c9db 70%,#7ddfea 100%)}
.lt-verano .ltv-pool::before{content:"";position:absolute;left:0;right:0;top:0;height:70px;z-index:2;pointer-events:none;background:linear-gradient(180deg,#03aec6,rgba(3,174,198,0))}
.lt-verano .ltv-c{position:absolute;inset:-50%;z-index:0;pointer-events:none;mix-blend-mode:screen}
.lt-verano .ltv-c.a{background-image:${VR_C1};background-size:400px 400px;opacity:.45}
.lt-verano .ltv-c.b{background-image:${VR_C2};background-size:560px 560px;opacity:.3}
.lt-verano .ltb-sec{padding:clamp(52px,7vw,84px) 0}
.lt-verano .ltv-pool.ltb-sec{padding-top:clamp(20px,3vw,36px)}
.lt-verano .ltv-hd{margin:0 0 32px;text-align:center}
.lt-verano .ltv-hd .ltb-h2{position:relative;display:inline-block;margin:0;font-size:clamp(32px,5.6vw,52px);font-weight:800;line-height:1.05;color:inherit}
.lt-verano .ltv-pool .ltv-hd .ltb-h2{text-shadow:0 3px 0 rgba(4,110,130,.35),0 10px 24px rgba(4,110,130,.3)}
.lt-verano .ltv-hd p{margin:10px auto 0;max-width:48ch;font-size:16px;font-weight:700;opacity:.9}
.lt-verano .ltv-tick{position:absolute;top:2px;width:22px;height:26px}
.lt-verano .ltv-tick::before,.lt-verano .ltv-tick::after{content:"";position:absolute;left:0;width:16px;height:4px;border-radius:4px;background:var(--v-sun)}
.lt-verano .ltv-tick::before{top:4px;transform:rotate(-40deg)}.lt-verano .ltv-tick::after{top:16px;transform:rotate(-8deg)}
.lt-verano .ltv-tick.l{left:-30px}.lt-verano .ltv-tick.r{right:-34px;transform:scaleX(-1)}
@media (max-width:420px){.lt-verano .ltv-tick{display:none}}
.lt-verano .ltv-pool .ltv-palm.pl{left:-80px;top:30%;--pw:clamp(140px,16vw,230px);transform:rotate(-40deg)}
.lt-verano .ltv-pool .ltv-palm.pr{right:-70px;bottom:6%;--pw:clamp(130px,15vw,220px);transform:rotate(200deg) scaleX(-1)}
.lt-verano .ltv-apps{display:flex;flex-wrap:wrap;justify-content:center;gap:18px}
.lt-verano .ltv-apps>*{flex:0 1 calc((100% - 36px) / 3);min-width:min(100%,250px)}
@media (max-width:900px){.lt-verano .ltv-apps>*{flex-basis:calc((100% - 18px) / 2)}}
.lt-verano .ltv-app{gap:12px;padding:20px;border-radius:24px;background:rgba(255,255,255,.96);color:var(--v-ink);box-shadow:0 18px 36px rgba(3,90,105,.22),0 0 0 4px rgba(255,255,255,.35);transition:transform .35s cubic-bezier(.3,1.4,.5,1),box-shadow .3s}
.lt-verano .ltv-app:hover{transform:translateY(-6px) rotate(-.5deg);box-shadow:0 26px 46px rgba(3,90,105,.28),0 0 0 4px rgba(255,255,255,.5)}
.lt-verano .ltv-atop{display:flex;align-items:center;gap:12px;min-width:0}
.lt-verano .ltv-atop .ltb-logo{width:56px;height:56px;border-radius:16px;box-shadow:0 8px 16px rgba(0,0,0,.18)}
.lt-verano .ltv-aname{min-width:0}
.lt-verano .ltv-app .ltb-title{font-size:19px;overflow-wrap:anywhere}
.lt-verano .ltv-aname span{font-size:12.5px;font-weight:700;color:var(--v-ink2)}
.lt-verano .ltv-price{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px}
.lt-verano .ltv-price strong{font-size:34px;font-weight:800;line-height:1;color:var(--v-ink)}
.lt-verano .ltv-price small{font-size:13px;font-weight:700;color:var(--v-ink2)}
.lt-verano .ltv-price s{font-size:14px;font-weight:700;color:#8aa3aa}
.lt-verano .ltv-price.is-ask strong{font-size:20px}
.lt-verano .ltv-feats{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:14px;font-weight:700;color:var(--v-ink2)}
.lt-verano .ltv-feats li{display:flex;gap:8px;align-items:flex-start;overflow-wrap:anywhere}
.lt-verano .ltv-feats .ltv-ic{width:18px;height:18px;padding:3px;border-radius:50%;stroke-width:3.4;background:var(--v-green);color:#fff}
.lt-verano .ltv-abtn,.lt-verano .ltv-cbtn{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;min-height:48px;padding:10px 10px 10px 20px;border-radius:999px;font:800 15px Manrope,sans-serif;text-decoration:none;color:#fff;background:linear-gradient(135deg,#12b5c9,#066e82);box-shadow:0 10px 20px rgba(6,110,130,.3);transition:transform .2s}
.lt-verano .ltv-abtn:hover,.lt-verano .ltv-cbtn:hover{transform:translateY(-2px)}
.lt-verano .ltv-abtn .ltv-ic,.lt-verano .ltv-cbtn .ltv-ic{width:30px;height:30px;padding:7px;border-radius:50%;background:#fff;color:var(--v-teal2);transition:transform .25s}
.lt-verano .ltv-abtn:hover .ltv-ic,.lt-verano .ltv-cbtn:hover .ltv-ic{transform:translateX(3px)}
.lt-verano .ltv-badge{position:absolute;top:-12px;right:18px;z-index:4;padding:5px 13px;border-radius:999px;background:linear-gradient(180deg,#ffe45c,#ffc400);color:#3a2600;font-size:11.5px;font-weight:800;max-width:calc(100% - 36px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-shadow:0 8px 16px rgba(224,165,0,.35)}
.lt-verano .ltv-bubbles{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}
.lt-verano .ltv-bubbles i{position:absolute;bottom:-20px;left:var(--x);width:var(--s);height:var(--s);border-radius:50%;border:1.5px solid rgba(255,255,255,.8);background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.85),rgba(255,255,255,.1) 45%,transparent 60%);opacity:0}
/* ===== playa (combos) ===== */
.lt-verano .ltv-beach{color:var(--v-ink);background:linear-gradient(180deg,#7ddfea 0%,#c5f1f6 22%,#ecfbfd 48%,#fdf6e6 76%,#f7e3b8 88%,#efd29b 100%)}
.lt-verano .ltv-beach::after{content:"";position:absolute;left:0;right:0;bottom:0;height:16%;z-index:0;pointer-events:none;background-image:radial-gradient(rgba(170,120,50,.18) 1px,transparent 1.4px),radial-gradient(rgba(255,255,255,.5) 1px,transparent 1.4px);background-size:9px 9px,13px 13px;background-position:0 0,4px 6px;-webkit-mask:linear-gradient(180deg,transparent,#000 40%);mask:linear-gradient(180deg,transparent,#000 40%)}
.lt-verano .ltv-beach .ltv-palm.bl{left:-70px;top:4%;--pw:clamp(130px,15vw,220px);transform:rotate(-30deg)}
.lt-verano .ltv-beach .ltv-palm.br{right:-60px;top:10%;--pw:clamp(130px,15vw,220px);transform:rotate(210deg) scaleX(-1)}
.lt-verano .ltv-combos{display:flex;flex-wrap:wrap;justify-content:center;gap:24px;align-items:flex-start}
.lt-verano .ltv-combos>*{flex:0 1 360px;min-width:min(100%,290px)}
.lt-verano .ltv-combo{gap:0;padding:0;border-radius:28px;background:#fff;box-shadow:0 26px 50px rgba(7,59,76,.14);overflow:visible;transition:transform .35s cubic-bezier(.3,1.4,.5,1)}
.lt-verano .ltv-combo:hover{transform:translateY(-6px)}
.lt-verano .ltv-chead{position:relative;overflow:hidden;padding:24px 22px 18px;border-radius:28px 28px 0 0;background:linear-gradient(160deg,#b9f0f6 0%,#e3fafc 60%,#fff 100%)}
.lt-verano .ltv-combo.is-alt .ltv-chead{background:linear-gradient(160deg,#ffd9e8 0%,#fff0e0 60%,#fff 100%)}
.lt-verano .ltv-chead .ltv-caus{position:absolute;inset:-50%;z-index:0;background-image:${VR_C1};background-size:300px 300px;opacity:.55;mix-blend-mode:overlay;pointer-events:none}
.lt-verano .ltv-chead>*:not(.ltv-caus){position:relative;z-index:1}
.lt-verano .ltv-chead .ltb-title{margin:0;font-size:clamp(25px,4.8vw,30px);overflow-wrap:anywhere}
.lt-verano .ltv-chead p{margin:2px 0 0;font-weight:700;font-size:14px;color:var(--v-ink2)}
.lt-verano .ltv-chead .ltv-badge{top:auto;right:auto;display:inline-block;margin:0 0 10px;background:var(--v-aqua);color:#fff;box-shadow:none}
.lt-verano .ltv-combo.is-alt .ltv-chead .ltv-badge{background:linear-gradient(180deg,#ff7ab8,#ff4fa3)}
.lt-verano .ltv-clogos{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}
.lt-verano .ltv-clogos .ltb-logo{width:46px;height:46px;border-radius:14px;box-shadow:0 6px 14px rgba(0,0,0,.16)}
.lt-verano .ltv-cbody{display:flex;flex-direction:column;gap:14px;padding:8px 22px 22px}
.lt-verano .ltv-combo .ltv-price strong{font-size:42px}
.lt-verano .ltv-combo .ltb-cph{margin:0 22px 8px;border-radius:18px;overflow:hidden}
.lt-verano .ltv-deco{position:absolute;z-index:4;pointer-events:none}
.lt-verano .ltv-deco img{display:block;width:100%;height:auto}
.lt-verano .ltv-deco.shades{left:max(-20px,calc(50% - 680px));bottom:4%;width:clamp(110px,15vw,210px)}
.lt-verano .ltv-deco.coco{right:max(-10px,calc(50% - 670px));bottom:3%;width:clamp(100px,13vw,180px)}
@media (max-width:760px){.lt-verano .ltv-deco.shades{bottom:1%;left:-24px}.lt-verano .ltv-deco.coco{bottom:1%;right:-14px}.lt-verano .ltv-beach{padding-bottom:120px}}
.lt-verano .ltv-trust{position:relative;z-index:5;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px;margin:clamp(-46px,-4vw,-30px) auto 0;padding:0;list-style:none}
.lt-verano .ltv-trust li{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:20px;background:#fff;box-shadow:0 14px 30px rgba(7,59,76,.12);font-weight:800;font-size:14.5px;line-height:1.3;color:var(--v-ink);min-width:0}
.lt-verano .ltv-trust span{overflow-wrap:anywhere}
.lt-verano .ltv-trust .ltv-ib{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#22d3ee,#0891b2);color:#fff}
.lt-verano .ltv-trust li:nth-child(4n+2) .ltv-ib{background:linear-gradient(135deg,#ffe45c,#ffb020)}
.lt-verano .ltv-trust li:nth-child(4n+3) .ltv-ib{background:linear-gradient(135deg,#ff8aa0,#ff4f6d)}
.lt-verano .ltv-trust li:nth-child(4n+4) .ltv-ib{background:linear-gradient(135deg,#4ade80,#16a34a)}
.lt-verano .ltv-tw2{background:linear-gradient(180deg,#efd29b 0,#efd29b 50%,#e3f8fb 50%)}
/* ===== agua clara (reseñas) ===== */
.lt-verano .ltv-shallow{background:linear-gradient(180deg,#e3f8fb,#c6f0f5 60%,#e3f8fb)}
.lt-verano .ltv-shallow .ltv-c.a{opacity:.85}.lt-verano .ltv-shallow .ltv-c.b{opacity:.6}
.lt-verano .ltb-revs{gap:16px}
.lt-verano .ltb-rev{background:#fff;border:0;border-radius:22px;box-shadow:0 14px 30px rgba(7,90,105,.12);color:var(--v-ink)}
.lt-verano .ltb-stars i.on{color:#ffc400}
.lt-verano .ltb-rq p{color:var(--v-ink2);font-weight:600}
.lt-verano .ltb-rav{background:linear-gradient(135deg,#ff9a3c,#ff4fa3);color:#fff}
.lt-verano .ltb-rdots i{background:rgba(7,59,76,.25)}.lt-verano .ltb-rdots i.on{background:var(--v-teal)}
.lt-verano .ltv-light{position:relative;overflow:hidden;background:linear-gradient(180deg,#e3f8fb,#f4fcfd 30%,#fffaf0)}
.lt-verano .ltv-light .ltv-palm.ll{left:-80px;top:2%;--pw:clamp(120px,14vw,200px);transform:rotate(-40deg)}
.lt-verano .ltv-light .ltv-palm.lr{right:-80px;top:24%;--pw:clamp(120px,14vw,200px);transform:rotate(220deg) scaleX(-1)}
.lt-verano .ltv-light>*{position:relative;z-index:2}
.lt-verano .ltv-light>.ltv-palm{position:absolute;z-index:1}
.lt-verano :is(.ltb-sec-pays,.ltb-sec-faq,.ltb-sec-links){padding:clamp(34px,5vw,50px) 0}
.lt-verano :is(.ltb-sec-pays,.ltb-sec-faq,.ltb-sec-links) .ltb-h2{text-align:center;font-size:clamp(26px,5vw,36px);font-weight:800;color:var(--v-ink);margin-bottom:18px}
.lt-verano .ltb-pays,.lt-verano .ltb-links{justify-content:center}
.lt-verano .ltb-pays li{padding:10px 20px;border-radius:999px;background:#fff;color:var(--v-ink);font-weight:800;box-shadow:0 8px 18px rgba(7,59,76,.1)}
.lt-verano .ltb-pays li:nth-child(3n+1){background:linear-gradient(180deg,#d946ef,#a21caf);color:#fff}
.lt-verano .ltb-pays li:nth-child(3n+2){background:linear-gradient(180deg,#22d3ee,#0891b2);color:#fff}
.lt-verano .ltb-faq{max-width:760px;margin:0 auto}
.lt-verano .ltb-faq details{background:#fff;border:0;border-radius:18px;box-shadow:0 10px 22px rgba(7,59,76,.08)}
.lt-verano .ltb-faq summary{color:var(--v-ink);font-weight:800}
.lt-verano .ltb-faq summary::after{color:var(--v-ink)}
.lt-verano .ltb-faq p{color:var(--v-ink2)}
.lt-verano .ltb-link{background:#fff;border:0;border-radius:999px;color:var(--v-ink);font-weight:800;box-shadow:0 8px 18px rgba(7,59,76,.1)}
.lt-verano .ltb-link svg{color:var(--v-teal)}
/* ===== cierre: atardecer + piscina + flamenco ===== */
.lt-verano .ltv-end{position:relative;overflow:hidden;text-align:center;background:radial-gradient(ellipse 50% 60% at 70% 70%,rgba(255,170,90,.55),transparent 70%),linear-gradient(180deg,#fffaf0 0%,#ffe9c2 40%,#ffcf96 70%,#ffb57d 100%)}
.lt-verano .ltv-end .ltv-palm.el{left:-60px;top:-30px;--pw:clamp(150px,19vw,260px);transform:rotate(-150deg) scaleX(-1)}
.lt-verano .ltv-end .ltv-palm.er{right:-60px;top:-30px;--pw:clamp(150px,19vw,260px);transform:rotate(150deg)}
.lt-verano .ltv-din{position:relative;z-index:5;padding:clamp(56px,8vw,90px) 0 clamp(40px,6vw,60px)}
.lt-verano .ltv-din h2{margin:0 auto 12px;max-width:15ch;font-size:clamp(36px,6.6vw,62px);font-weight:800;line-height:1.04;color:var(--v-ink)}
.lt-verano .ltv-din p{margin:0 auto 26px;max-width:44ch;font-weight:700;color:var(--v-ink2);font-size:16px}
.lt-verano .ltv-end .ltv-edge{margin-top:0}
.lt-verano .ltv-endpool{height:clamp(30px,4vw,60px);background:linear-gradient(180deg,#05b4cb,#068da3)}
.lt-verano .ltv-flam{position:absolute;z-index:6;right:max(2%,calc(50% - 600px));bottom:clamp(16px,3vw,46px);width:clamp(130px,18vw,240px)}
.lt-verano .ltv-flam img{display:block;width:100%;height:auto;filter:drop-shadow(0 18px 18px rgba(3,80,95,.35))}
@media (max-width:640px){.lt-verano .ltv-din{padding-bottom:110px}.lt-verano .ltv-flam{right:-10px}}
.lt-verano .ltb-foot{text-align:center;padding-top:24px;background:#063747;color:rgba(255,255,255,.75);font-size:12.5px;font-weight:600}
.lt-verano .ltb-made a{color:#7fe3e6}
.lt-verano .ltb-fab{background:#25d366!important}
.lt-verano .lt-promo-in{background:#fff;border:0;color:var(--v-ink);border-radius:22px;box-shadow:0 16px 34px rgba(7,59,76,.14)}
.lt-verano .lt-promo-tag,.lt-verano .lt-promo-btn{background:linear-gradient(180deg,#ffe45c,#ffc400);color:#2a1a00}
.lt-verano .lt-promo-u{background:var(--v-teal2);color:#fff}
.lt-verano .ltv-palm{translate:0 var(--py,0px)}
.lt-verano .ltv-stage{transform:perspective(900px) rotateY(var(--tx,0deg)) rotateX(var(--ty,0deg));transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.lt-verano .ltv-rays{position:absolute;inset:-26%;border-radius:50%;pointer-events:none;background:repeating-conic-gradient(rgba(255,240,170,.55) 0deg 5deg,rgba(255,240,170,0) 5deg 15deg);-webkit-mask:radial-gradient(circle,#000 30%,transparent 68%);mask:radial-gradient(circle,#000 30%,transparent 68%)}
.lt-verano .ltv-ring{position:absolute;inset:1%;border-radius:50%;border:2px dashed rgba(255,255,255,.75);pointer-events:none}
.lt-verano .ltv-drops{position:absolute;left:50%;bottom:6%;width:0;height:0;z-index:3}
.lt-verano .ltv-drops i{position:absolute;left:0;bottom:0;width:var(--s);height:calc(var(--s) * 1.3);border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:radial-gradient(circle at 35% 30%,#fff,#a5ecf5 50%,#16c1d6);opacity:0}
.lt-verano .ltv-leaves,.lt-verano .ltv-glints{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}
.lt-verano .ltv-leaves i{position:absolute;top:-30px;left:var(--x);width:var(--s);height:var(--s);color:var(--c);opacity:0}
.lt-verano .ltv-leaves svg,.lt-verano .ltv-glints svg{width:100%;height:100%;display:block}
.lt-verano .ltv-glints i{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);color:#fff;opacity:0;filter:drop-shadow(0 0 4px rgba(255,255,255,.9))}
.lt-verano .ltv-glints svg{fill:currentColor}
.lt-verano .ltv-edge .ltv-glints{z-index:1}
.lt-verano .ltv-gull{position:absolute;z-index:1;left:0;top:var(--y);width:var(--w);opacity:0;pointer-events:none}
.lt-verano .ltv-gull svg{width:100%;height:auto;display:block}
.lt-verano .ltv-app::after{content:"";position:absolute;top:0;bottom:0;left:-70%;width:40%;border-radius:inherit;background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent);transform:skewX(-18deg);pointer-events:none;opacity:0}
.lt-verano .ltv-app{overflow:hidden}
.lt-verano .ltv-app .ltv-badge{top:12px;right:12px}
.lt-verano .ltv-rip{position:absolute;left:12%;right:12%;bottom:6%;height:22%;border-radius:50%;border:2px solid rgba(255,255,255,.8);opacity:0;pointer-events:none}
.lt-verano .ltv-pool .lt-cat{background:rgba(255,255,255,.9);border-color:#fff;color:var(--v-ink);box-shadow:0 6px 14px rgba(3,90,105,.15)}
.lt-verano .ltv-pool .lt-cat.is-on{background:linear-gradient(180deg,#ffe45c,#ffc400);border-color:#ffc400;color:#2a1a00}
.lt-verano .ltv-pool .lt-cat-h{color:#fff;text-shadow:0 2px 8px rgba(3,90,105,.35)}
.lt-verano .ltv-ripple{position:fixed;z-index:9999;width:0;height:0;pointer-events:none}
.lt-verano .ltv-ripple i{position:absolute;left:-40px;top:-40px;width:80px;height:80px;border-radius:50%;border:2.5px solid rgba(255,255,255,.95);box-shadow:0 0 0 1.5px rgba(11,191,211,.5);animation:ltv-rip .9s cubic-bezier(.2,.7,.3,1) both}
.lt-verano .ltv-ripple i:nth-child(2){animation-delay:.12s}.lt-verano .ltv-ripple i:nth-child(3){animation-delay:.24s}
/* ===== movimiento (solo VIP; transform/opacity; se pausa fuera de pantalla) ===== */
.lt-verano:not(.lt-static) .ltv-palm img{animation:ltv-sway 5.5s ease-in-out infinite alternate}
.lt-verano:not(.lt-static) .ltv-palm:nth-of-type(2n) img{animation-duration:6.8s;animation-delay:-2s}
.lt-verano:not(.lt-static) .ltv-palm:nth-of-type(3n) img{animation-duration:7.6s;animation-delay:-4s}
.lt-verano:not(.lt-static) .ltv-cloud{animation:ltv-drift var(--t) linear infinite;animation-delay:var(--d)}
.lt-verano:not(.lt-static) .ltv-glow{animation:ltv-pulse 4s ease-in-out infinite alternate}
.lt-verano:not(.lt-static) .ltv-orb{animation:ltv-pop 1s .15s cubic-bezier(.3,1.4,.5,1) both}
.lt-verano:not(.lt-static) .ltv-tile{animation:ltv-tile .7s calc(.45s + var(--k) * .09s) cubic-bezier(.3,1.6,.5,1) both,ltv-bob calc(3.6s + var(--k) * .4s) calc(1.4s + var(--k) * .25s) ease-in-out infinite alternate}
.lt-verano:not(.lt-static) .ltv-hart{animation:ltv-up 1s .3s cubic-bezier(.16,1,.3,1) both}
.lt-verano:not(.lt-static) .ltv-chip{animation:ltv-tile .7s 1s cubic-bezier(.3,1.6,.5,1) both,ltv-bob 3.4s 1.8s ease-in-out infinite alternate}
.lt-verano:not(.lt-static) .ltb-h1{animation:ltv-up .9s .1s cubic-bezier(.16,1,.3,1) both}
.lt-verano:not(.lt-static) .ltb-h1 .ltv-mk::before{animation:ltv-mark .7s .8s cubic-bezier(.6,0,.3,1) both}
.lt-verano:not(.lt-static) .ltv-sub{animation:ltv-up .9s .3s cubic-bezier(.16,1,.3,1) both}
.lt-verano:not(.lt-static) .ltv-ctas{animation:ltv-up .9s .45s cubic-bezier(.16,1,.3,1) both}
.lt-verano:not(.lt-static) .ltv-proof{animation:ltv-up .9s .6s cubic-bezier(.16,1,.3,1) both}
.lt-verano:not(.lt-static).ltb-rv .ltv-hd.is-in .ltv-mk::before,.lt-verano:not(.lt-static).ltb-rv .ltv-din.is-in .ltv-mk::before{animation:ltv-mark .7s .3s cubic-bezier(.6,0,.3,1) both}
.lt-verano:not(.lt-static) .ltv-tick{animation:ltv-tick 1.8s ease-in-out infinite}
.lt-verano:not(.lt-static) .ltv-btn::after{animation:ltv-shine 4.5s 1.6s ease-in-out infinite}
.lt-verano:not(.lt-static) .ltv-edge{animation:ltv-wob 5s ease-in-out infinite alternate}
.lt-verano:not(.lt-static) .ltv-edge::after{animation:ltv-bgp 18s linear infinite}
.lt-verano:not(.lt-static) .ltv-c.a{animation:ltv-ca 24s linear infinite}
.lt-verano:not(.lt-static) .ltv-c.b{animation:ltv-cb 32s linear infinite}
.lt-verano:not(.lt-static) .ltv-chead .ltv-caus{animation:ltv-ca 20s linear infinite}
.lt-verano:not(.lt-static) .ltv-bubbles i{animation:ltv-bub var(--t) var(--d) ease-in infinite}
.lt-verano:not(.lt-static).ltb-rv .ltv-app.is-in .ltb-logo{animation:ltv-tile .6s calc(var(--rvd,0ms) + .2s) cubic-bezier(.3,1.6,.5,1) both}
.lt-verano:not(.lt-static).ltb-rv .ltv-combo.is-in .ltv-clogos span{animation:ltv-tile .6s calc(var(--rvd,0ms) + .25s + var(--k) * .07s) cubic-bezier(.3,1.6,.5,1) both}
.lt-verano:not(.lt-static) .ltv-deco.shades img{animation:ltv-rock 4.5s ease-in-out infinite alternate}
.lt-verano:not(.lt-static) .ltv-deco.coco img{animation:ltv-rock 5.5s -2s ease-in-out infinite alternate-reverse}
.lt-verano:not(.lt-static).ltb-rv .ltv-trust.is-in li{animation:ltv-up .7s calc(var(--k) * .08s) cubic-bezier(.16,1,.3,1) both}
.lt-verano:not(.lt-static) .ltv-flam img{animation:ltv-float 3.6s ease-in-out infinite alternate}
.lt-verano:not(.lt-static) .ltv-rays{animation:ltv-spin 40s linear infinite}
.lt-verano:not(.lt-static) .ltv-ring{animation:ltv-spin 30s linear infinite reverse}
.lt-verano:not(.lt-static) .ltv-drops i{animation:ltv-drop var(--t) var(--d) cubic-bezier(.3,.6,.5,1) infinite}
.lt-verano:not(.lt-static) .ltv-leaves i{animation:ltv-fall var(--t) var(--d) linear infinite}
.lt-verano:not(.lt-static) .ltv-glints i{animation:ltv-tw var(--t) var(--d) ease-in-out infinite}
.lt-verano:not(.lt-static) .ltv-gull{animation:ltv-fly var(--t) linear infinite;animation-delay:var(--d)}
.lt-verano:not(.lt-static) .ltv-gull svg{animation:ltv-flap .45s ease-in-out infinite alternate}
.lt-verano:not(.lt-static) .ltv-app::after{animation:ltv-shine2 7s calc(1.5s + var(--i,0) * .6s) ease-in-out infinite}
.lt-verano:not(.lt-static) .ltv-badge{animation:ltv-wig 3.5s ease-in-out infinite}
.lt-verano:not(.lt-static) .ltv-chead .ltv-badge{animation:ltv-wig 3.5s 1s ease-in-out infinite}
.lt-verano:not(.lt-static).ltb-rv .ltv-trust.is-in .ltv-ib{animation:ltv-hop 3s calc(1s + var(--k,0) * .35s) ease-in-out infinite}
.lt-verano .ltv-trust li{--k:0}
.lt-verano:not(.lt-static) .ltb-stars i.on{display:inline-block;animation:ltv-star 3s ease-in-out infinite}
.lt-verano:not(.lt-static) .ltb-stars i.on:nth-child(2){animation-delay:.15s}.lt-verano:not(.lt-static) .ltb-stars i.on:nth-child(3){animation-delay:.3s}.lt-verano:not(.lt-static) .ltb-stars i.on:nth-child(4){animation-delay:.45s}.lt-verano:not(.lt-static) .ltb-stars i.on:nth-child(5){animation-delay:.6s}
.lt-verano:not(.lt-static) .ltv-flam{animation:ltv-paddle 9s ease-in-out infinite alternate}
.lt-verano:not(.lt-static) .ltv-rip{animation:ltv-ring 3s ease-out infinite}
.lt-verano:not(.lt-static) .ltv-rip:nth-child(2){animation-delay:1.5s}
.lt-verano:not(.lt-static) .ltv-pays li,.lt-verano:not(.lt-static) .ltb-pays li{transition:transform .25s}
.lt-verano .ltb-pays li:hover{transform:translateY(-3px) rotate(-2deg)}
@keyframes ltv-spin{to{transform:rotate(360deg)}}
@keyframes ltv-drop{0%{opacity:0;transform:translate(0,0) scale(.5)}10%{opacity:1}45%{transform:translate(calc(var(--dx) * .6),var(--up)) scale(1)}100%{opacity:0;transform:translate(var(--dx),20px) scale(.7)}}
@keyframes ltv-fall{0%{opacity:0;transform:translate(0,0) rotate(0)}8%{opacity:.95}50%{transform:translate(calc(var(--dx) * -.5),calc(var(--h) * .5)) rotate(calc(var(--r) * .5))}92%{opacity:.85}100%{opacity:0;transform:translate(var(--dx),var(--h)) rotate(var(--r))}}
@keyframes ltv-tw{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:1;transform:scale(1) rotate(45deg)}}
@keyframes ltv-fly{0%{opacity:0;transform:translate(-60px,0)}8%{opacity:.95}50%{transform:translate(50vw,-26px)}92%{opacity:.95}100%{opacity:0;transform:translate(calc(100vw + 60px),10px)}}
@keyframes ltv-flap{from{transform:scaleY(1)}to{transform:scaleY(.4)}}
@keyframes ltv-shine2{0%,80%{left:-70%;opacity:0}81%{opacity:1}100%{left:130%;opacity:1}}
@keyframes ltv-wig{0%,86%,100%{transform:none}89%{transform:rotate(-7deg) scale(1.08)}92%{transform:rotate(6deg)}95%{transform:rotate(-3deg)}}
@keyframes ltv-hop{0%,70%,100%{transform:none}78%{transform:translateY(-7px) rotate(-6deg)}86%{transform:translateY(0) rotate(3deg)}}
@keyframes ltv-star{0%,70%,100%{transform:none;filter:none}80%{transform:scale(1.35) rotate(15deg);filter:drop-shadow(0 0 6px rgba(255,200,0,.9))}}
@keyframes ltv-paddle{from{transform:translateX(0)}to{transform:translateX(-60px)}}
@keyframes ltv-ring{from{opacity:.9;transform:scale(.6)}to{opacity:0;transform:scale(1.5)}}
@keyframes ltv-sway{from{transform:rotate(-3deg)}to{transform:rotate(3.5deg)}}
@keyframes ltv-drift{from{transform:translateX(var(--x0))}to{transform:translateX(calc(var(--x0) + 100vw + var(--w)))}}
@keyframes ltv-pulse{from{opacity:.75;transform:scale(.95)}to{opacity:1;transform:scale(1.05)}}
@keyframes ltv-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@keyframes ltv-tile{from{opacity:0;transform:translateY(18px) scale(.6)}to{opacity:1;transform:none}}
@keyframes ltv-bob{from{translate:0 0}to{translate:0 -8px}}
@keyframes ltv-up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes ltv-mark{from{transform:rotate(-1.5deg) skewX(-8deg) scaleX(0)}to{transform:rotate(-1.5deg) skewX(-8deg) scaleX(1)}}
@keyframes ltv-tick{0%,100%{opacity:.4;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}
.lt-verano .ltv-tick.r{animation-name:ltv-tickr!important}
@keyframes ltv-tickr{0%,100%{opacity:.4;transform:scaleX(-1) translateY(0)}50%{opacity:1;transform:scaleX(-1) translateY(-3px)}}
@keyframes ltv-shine{0%,62%{left:-60%;opacity:0}63%{opacity:1}100%{left:130%;opacity:1}}
@keyframes ltv-wob{from{transform:translateY(0)}to{transform:translateY(4px)}}
@keyframes ltv-bgp{from{background-position:0 0}to{background-position:300px 300px}}
@keyframes ltv-ca{from{transform:translate(0,0)}to{transform:translate(400px,400px)}}
@keyframes ltv-cb{from{transform:translate(0,0)}to{transform:translate(-560px,280px)}}
@keyframes ltv-bub{0%{opacity:0;transform:translateY(0)}15%{opacity:.85}100%{opacity:0;transform:translate(var(--dx),-900px)}}
@keyframes ltv-rock{from{transform:rotate(-4deg) translateY(0)}to{transform:rotate(3deg) translateY(-6px)}}
@keyframes ltv-float{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-12px) rotate(3deg)}}
@keyframes ltv-rip{from{opacity:1;transform:scale(.15)}to{opacity:0;transform:scale(1.3)}}
.lt-verano :is(.ltv-fx.ltv-zz,.ltb-off) :is(.ltv-rays,.ltv-ring,.ltv-drops i,.ltv-leaves i,.ltv-glints i,.ltv-gull,.ltv-gull svg,.ltv-badge,.ltv-ib,.ltb-stars i,.ltv-flam,.ltv-rip),.lt-verano :is(.ltv-fx.ltv-zz,.ltb-off) .ltv-app::after,.lt-verano :is(.ltv-fx.ltv-zz,.ltb-off) :is(.ltv-palm img,.ltv-cloud,.ltv-glow,.ltv-tile,.ltv-chip,.ltv-tick,.ltv-btn,.ltv-edge,.ltv-c,.ltv-caus,.ltv-bubbles i,.ltv-deco img,.ltv-flam img),.lt-verano :is(.ltv-fx.ltv-zz,.ltb-off) :is(.ltv-btn,.ltv-edge)::after{animation-play-state:paused!important}
@media (max-width:560px){.lt-verano .ltv-brand small{display:none}.lt-verano .ltv-hwa span{display:none}.lt-verano .ltv-hwa{padding:11px}.lt-verano .ltv-cloud:nth-of-type(n+4){display:none}.lt-verano .ltv-bubbles i:nth-child(n+6),.lt-verano .ltv-leaves i:nth-child(n+4),.lt-verano .ltv-glints i:nth-child(n+5),.lt-verano .ltv-gull:nth-of-type(n+2){display:none}.lt-verano .ltv-ghost{display:none}.lt-verano .ltv-sky .ltv-palm.mr,.lt-verano .ltv-pool .ltv-palm.pl,.lt-verano .ltv-light .ltv-palm.lr{display:none}.lt-verano .ltv-sky .ltv-palm.tl{--pw:120px;left:-50px;top:-50px}.lt-verano .ltv-sky .ltv-palm.tr{--pw:130px;right:-50px;top:-60px}
.lt-verano .ltv-apps{gap:12px}.lt-verano .ltv-apps>*{flex-basis:calc((100% - 12px) / 2);min-width:0}.lt-verano .ltv-app{padding:16px 13px;gap:10px;border-radius:20px}.lt-verano .ltv-atop{flex-direction:column;align-items:flex-start;gap:8px}.lt-verano .ltv-atop .ltb-logo{width:46px;height:46px;border-radius:14px}.lt-verano .ltv-app .ltb-title{font-size:16px}.lt-verano .ltv-app .ltv-price strong{font-size:27px}.lt-verano .ltv-app .ltv-feats{font-size:12.5px}.lt-verano .ltv-abtn{min-height:42px;padding:6px 6px 6px 14px;font-size:14px}.lt-verano .ltv-abtn span{white-space:nowrap}.lt-verano .ltv-abtn .ltv-ic{width:28px;height:28px;padding:6px}.lt-verano .ltv-app .ltv-badge{right:10px}}
`;

  function renderVerano(root, d, ctx) {
    LC.injectCss('verano', CSS_VERANO);
    const cl = setup(root, ctx, d, 'verano');
    const pm = !!ctx.profileMode && typeof ctx.profileHeader === 'function';
    if (pm) root.classList.add('ltb-pm', 'lt-light-profile');
    const { plans, combos } = visible(d, ctx);
    const wa = d.whatsapp ? ctx.buy('tus planes') : '';
    const fx = !(ctx.noMotion || ctx.reducedMotion);
    let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const ids = ctx.platformIds || platformIds(plans, combos);
    const ini = ctx.esc((d.name.trim().charAt(0) || 'S').toUpperCase());
    const mark = d.logoUrl ? `<img src="${ctx.esc(d.logoUrl)}" alt="" width="40" height="40" decoding="async">` : `<span class="ltv-mono" aria-hidden="true">${ini}</span>`;
    const cta = (label, path, cls = '') => wa ? `<a class="ltv-btn${cls}" data-lt-btn="main" href="${ctx.esc(wa)}" target="_blank" rel="noopener">${ctx.linkIcon('whatsapp')}<span${path ? ed(ctx, path) : ''}>${ctx.esc(label)}</span></a>` : `<button type="button" class="ltv-btn${cls}" data-goto="plans">Ver planes</button>`;
    const clouds = [[5, 240, 8, .9, 130], [14, 170, 52, .75, 160], [26, 300, 78, .55, 180], [9, 140, 95, .65, 150]].map(([y, w, x, o, t], k) =>
      `<span class="ltv-cloud" aria-hidden="true" style="--y:${y}%;--w:${w}px;--x0:calc(${x}vw - ${w}px);--o:${o};--t:${t}s;--d:-${(k * 37) % 120}s"></span>`).join('');
    const hours247 = ctx.hours247 !== false, hours = ctx.hours || '24/7';
    const nav = [['plans', 'Planes', plans.length], ['combos', 'Combos', combos.length], ['reviews', 'Opiniones', d.reviews && d.reviews.length], ['faq', 'Preguntas', d.faq && d.faq.length]].filter(x => x[2]);
    const tiles = ids.slice(0, 6), tcls = tiles.length === 4 ? ' n4' : '';
    const proof = [`<li>${vri('zap')}Activación inmediata</li>`, `<li>${vri('clock')}${hours247 ? 'Atención 24/7' : `Atención: ${ctx.esc(hours)}`}</li>`, `<li>${vri('shield')}Plataformas seguras</li>`];
    const bens = d.benefits.length ? d.benefits.slice() : ['Activación inmediata', 'Cuentas seguras y confiables', 'En todos tus dispositivos'];
    const icons = ['zap', 'shield', 'devices', 'star', 'heart', 'sun'];
    const trust = bens.map((b, i) => [icons[i % icons.length], b, i < d.benefits.length ? `benefits.${i}` : '']);
    if (!hours247 || !bens.some(b => /24\s*\/\s*7|soporte|atenci/i.test(b))) trust.push(['headset', hours247 ? 'Atención 24/7 por WhatsApp' : `Atención: ${hours}`, '']);
    const LEAF = '<svg viewBox="0 0 24 24"><path d="M12 2C5 7 4 15 12 22c8-7 7-15 0-20z" fill="currentColor"/><path d="M12 5v15" stroke="rgba(0,60,25,.35)" stroke-width="1.3" fill="none"/></svg>';
    const leaves = (n, h) => fx ? `<div class="ltv-leaves" aria-hidden="true" style="--h:${h}px">${Array.from({ length: n }, (_, k) => `<i style="--x:${(4 + rnd() * 92).toFixed(1)}%;--s:${(14 + rnd() * 12).toFixed(0)}px;--t:${(12 + rnd() * 9).toFixed(1)}s;--d:${(-rnd() * 18).toFixed(1)}s;--dx:${(rnd() * 180 - 90).toFixed(0)}px;--r:${(rnd() * 540 - 270).toFixed(0)}deg;--c:${['#22b866', '#5ad48a', '#14934d'][k % 3]}">${LEAF}</i>`).join('')}</div>` : '';
    const glints = (n, y0, y1) => fx ? `<div class="ltv-glints" aria-hidden="true">${Array.from({ length: n }, () => `<i style="--x:${(3 + rnd() * 94).toFixed(1)}%;--y:${(y0 + rnd() * (y1 - y0)).toFixed(0)}%;--s:${(10 + rnd() * 12).toFixed(0)}px;--t:${(1.8 + rnd() * 2.2).toFixed(1)}s;--d:${(-rnd() * 4).toFixed(1)}s"><svg viewBox="0 0 24 24">${VR_I.sparkle}</svg></i>`).join('')}</div>` : '';
    const gulls = fx ? [[12, 30, 28, 0], [20, 24, 36, -12], [8, 20, 32, -22]].map(([y, w, t, dl]) => `<span class="ltv-gull" aria-hidden="true" style="--y:${y}%;--w:${w}px;--t:${t}s;--d:${dl}s"><svg viewBox="0 0 40 14"><path d="M1 10Q10 1 20 9Q30 1 39 10" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg></span>`).join('') : '';
    const drops = fx ? `<span class="ltv-drops">${Array.from({ length: 9 }, (_, k) => `<i style="--dx:${((k / 8 - .5) * 260).toFixed(0)}px;--up:-${(50 + rnd() * 80).toFixed(0)}px;--s:${(7 + rnd() * 7).toFixed(0)}px;--t:${(1.6 + rnd() * 1.2).toFixed(1)}s;--d:${(-rnd() * 3).toFixed(1)}s"></i>`).join('')}</span>` : '';
    const bubbles = n => fx ? `<div class="ltv-bubbles" aria-hidden="true">${Array.from({ length: n }, () => `<i style="--x:${(3 + rnd() * 94).toFixed(1)}%;--s:${(6 + rnd() * 12).toFixed(0)}px;--t:${(8 + rnd() * 8).toFixed(1)}s;--d:${(-rnd() * 14).toFixed(1)}s;--dx:${(rnd() * 40 - 20).toFixed(0)}px"></i>`).join('')}</div>` : '';
    const stage = `<div class="ltv-stage" aria-hidden="true"><span class="ltv-rays"></span><span class="ltv-glow"></span><span class="ltv-orb"></span><span class="ltv-ring"></span>` + drops +
      `<div class="ltv-tiles${tcls}">${tiles.map((id, k) => `<span class="ltv-tile" style="--k:${k}">${logoHtml(ctx, id, 'ltb-logo')}</span>`).join('')}</div>` +
      (ctx.minPrice ? `<span class="ltv-chip">Planes desde<b>${ctx.esc(ctx.minPrice)}</b></span>` : '') + '</div>';
    const html =
      `<div class="ltv-sky ltv-fx">${clouds}${gulls}${leaves(5, 900)}${glints(6, 4, 60)}${vrPalm('tl', 'palm2', true)}${vrPalm('tr', 'palm1', true)}${vrPalm('mr', 'palm2')}` +
      (pm ? ctx.profileHeader() : '') +
      `<section class="ltv-hero" data-lt-hero><div class="ltb-wrap">` +
      (pm ? '' : `<div class="ltv-top"><a class="ltv-brand" href="#" data-goto="plans">${mark}<span><b${ed(ctx, 'name')}>${ctx.esc(d.name)}</b>${d.tagline ? `<small${ed(ctx, 'tagline')}>${ctx.esc(d.tagline)}</small>` : ''}</span></a>` +
        `${nav.length > 1 ? `<ul class="ltv-nav">${nav.map(([k, l]) => `<li><button type="button" data-goto="${k}">${l}</button></li>`).join('')}</ul>` : ''}` +
        `${wa ? `<a class="ltv-hwa" data-lt-btn href="${ctx.esc(wa)}" target="_blank" rel="noopener">${ctx.linkIcon('whatsapp')}<span>WhatsApp</span></a>` : ''}</div>` +
        (d.coverUrl ? `<figure class="ltv-cov"><img src="${ctx.esc(d.coverUrl)}" alt="Portada de ${ctx.esc(d.name)}" width="1200" height="444" decoding="async" fetchpriority="high"></figure>` : '')) +
      `<div class="ltv-hin"><div class="ltv-htx"><h1 class="ltb-h1"${ed(ctx, 'heroTitle')}>${vrTitle(ctx, d.heroTitle || LC.DEFAULTS.heroTitle)}</h1>` +
      `<p class="ltv-sub"${ed(ctx, 'heroSubtitle')}>${ctx.esc(d.heroSubtitle || LC.DEFAULTS.heroSubtitle)}</p>` +
      `<div class="ltv-ctas">${cta(d.ctaText, 'ctaText')}${plans.length ? '<button type="button" class="ltv-ghost" data-goto="plans">Ver planes</button>' : ''}</div>` +
      `<ul class="ltv-proof">${proof.join('')}</ul></div>${stage}</div></div></section>` +
      `<div class="ltv-edge" aria-hidden="true">${glints(8, 35, 90)}</div></div>` +
      promo(ctx) +
      (plans.length ? `<section class="ltb-sec ltb-sec-plans ltv-pool ltv-fx"><i class="ltv-c a" aria-hidden="true"></i><i class="ltv-c b" aria-hidden="true"></i>${bubbles(10)}${vrPalm('pl', 'palm1')}${vrPalm('pr', 'palm2')}<div class="ltb-wrap">${vrHead('Nuestras apps', 'Elige tu plataforma favorita y empieza a ver hoy mismo.')}<div class="ltv-apps">${plans.map((p, i) => vrPlan(ctx, p, i)).join('')}</div></div></section>` : '') +
      `<section class="ltb-sec ltb-sec-combos ltv-beach ltv-fx">${leaves(6, 1300)}${vrPalm('bl', 'palm2')}${vrPalm('br', 'palm1')}<div class="ltb-wrap">` +
      (combos.length ? `${vrHead(vrMark(ctx, 'Combos de verano'), 'Junta tus apps favoritas y ahorra en un solo pago.')}<div class="ltv-combos">${combos.map((c, i) => vrCombo(ctx, c, i)).join('')}</div>` : vrHead(vrMark(ctx, 'Tu verano, sin límites'), 'Todo lo que necesitas para disfrutar tus series y películas.')) +
      `</div><span class="ltv-deco shades" aria-hidden="true">${vrImg('shades', '')}</span><span class="ltv-deco coco" aria-hidden="true">${vrImg('coco', '')}</span><div style="height:clamp(60px,8vw,110px)"></div></section>` +
      `<div class="ltv-tw2 ltb-sec-benefits"><div class="ltb-wrap"><ul class="ltv-trust" data-rv>${trust.map(([ic, t, path], k) => `<li style="--k:${k}"><span class="ltv-ib">${vri(ic)}</span><span${path ? ed(ctx, path) : ''}>${ctx.esc(t)}</span></li>`).join('')}</ul></div></div>` +
      (d.reviews && d.reviews.length ? `<section class="ltb-sec ltb-sec-reviews ltv-shallow ltv-fx"><i class="ltv-c a" aria-hidden="true"></i><i class="ltv-c b" aria-hidden="true"></i>${bubbles(6)}<div class="ltb-wrap">${vrHead(vrMark(ctx, 'Clientes felices'), 'Lo que dicen quienes ya disfrutan su verano con nosotros.')}${reviewsHtml(ctx, d)}</div></section>` : '') +
      `<div class="ltv-light ltv-fx">${leaves(5, 1200)}${vrPalm('ll', 'palm1')}${vrPalm('lr', 'palm2')}` +
      (d.paymentMethods.length ? sec('pays', 'Paga como quieras', `<ul class="ltb-pays" data-rv>${d.paymentMethods.map((p, i) => `<li${ed(ctx, `paymentMethods.${i}`)}>${ctx.esc(p)}</li>`).join('')}</ul>`) : '') +
      faqSec(ctx, d, 'Preguntas frecuentes') + linksSec(ctx, d, 'Síguenos en redes') + '</div>' +
      `<section class="ltv-end ltv-fx">${vrPalm('el', 'palm2')}${vrPalm('er', 'palm1')}` +
      `<div class="ltb-wrap ltv-din" data-rv><h2>${vrMark(ctx, 'Tu verano, en streaming')}</h2><p>Escríbenos por WhatsApp y activamos tu plan en minutos.</p>${cta(d.ctaText, '', ' is-green')}</div>` +
      `<div class="ltv-edge" aria-hidden="true"></div><div class="ltv-endpool"></div>${glints(6, 70, 95)}${leaves(3, 500)}<span class="ltv-flam" aria-hidden="true"><i class="ltv-rip"></i><i class="ltv-rip"></i>${vrImg('flamingo', '')}</span></section>` +
      footer(ctx, d) + fab(ctx, wa);
    root.innerHTML = html;
    motionKit(root, ctx, cl);
    vrMotion(root, ctx, cl);
  }
  /** ANIM (VIP): pausa fuera de pantalla y onda de agua al tocar un botón. */
  function vrMotion(root, ctx, cl) {
    if (ctx.noMotion || typeof G.IntersectionObserver !== 'function') return;
    const io = new G.IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('ltv-zz', !en.isIntersecting)), { rootMargin: '120px 0px 120px 0px' });
    root.querySelectorAll('.ltv-fx').forEach(e => io.observe(e));
    cl.push(() => io.disconnect());
    if (ctx.reducedMotion) return;
    // el sol con las apps se inclina siguiendo el mouse (PC) y las palmeras de arriba bajan más lento al hacer scroll
    const stage = root.querySelector('.ltv-stage'), sky = root.querySelector('.ltv-sky'), palms = sky ? [...sky.querySelectorAll('.ltv-palm')] : [];
    const win = root.ownerDocument.defaultView || G;
    if (stage && win.matchMedia && win.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      let raf = 0;
      const mv = e => {
        if (raf) return;
        raf = win.requestAnimationFrame(() => {
          raf = 0; const r = stage.getBoundingClientRect();
          const x = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / r.width)), y = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / r.height));
          stage.style.setProperty('--tx', (x * 10).toFixed(2) + 'deg'); stage.style.setProperty('--ty', (-y * 10).toFixed(2) + 'deg');
        });
      };
      const out = () => { stage.style.setProperty('--tx', '0deg'); stage.style.setProperty('--ty', '0deg'); };
      sky.addEventListener('pointermove', mv, { passive: true }); sky.addEventListener('pointerleave', out);
      cl.push(() => { sky.removeEventListener('pointermove', mv); sky.removeEventListener('pointerleave', out); if (raf) win.cancelAnimationFrame(raf); });
    }
    if (sky && palms.length && !ctx.preview) {
      let raf = 0;
      const sc = () => {
        if (raf) return;
        raf = win.requestAnimationFrame(() => {
          raf = 0; const top = sky.getBoundingClientRect().top;
          if (top < -sky.offsetHeight) return;
          const v = Math.min(0, top) * -0.18;
          palms.forEach((pl, k) => pl.style.setProperty('--py', (v * (k % 2 ? 1.25 : .85)).toFixed(1) + 'px'));
        });
      };
      win.addEventListener('scroll', sc, { passive: true });
      cl.push(() => { win.removeEventListener('scroll', sc); if (raf) win.cancelAnimationFrame(raf); });
    }
    if (ctx.preview) return;
    const down = e => {
      const b = e.target && e.target.closest ? e.target.closest('[data-lt-btn],.ltv-btn,.ltv-abtn,.ltv-cbtn') : null;
      if (!b || !root.contains(b)) return;
      const layer = root.ownerDocument.createElement('div');
      layer.className = 'ltv-ripple'; layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
      layer.innerHTML = '<i></i><i></i><i></i>'; root.appendChild(layer);
      G.setTimeout(() => layer.remove(), 1300);
    };
    root.addEventListener('pointerdown', down, { passive: true });
    cl.push(() => root.removeEventListener('pointerdown', down));
  }

  LC.registerTemplate({
    id: 'verano', parts: [{ k: 'palms', label: 'Palmeras', sel: '.ltv-palm', x: true }, { k: 'sun', label: 'Sol con tus apps', sel: '.ltv-stage', x: true }, { k: 'water', label: 'Franja de agua', sel: '.ltv-edge', x: true }, { k: 'beach', label: 'Lentes y coco', sel: '.ltv-deco', x: true }, { k: 'flamingo', label: 'Flamenco', sel: '.ltv-flam', x: true }, { k: 'clouds', label: 'Nubes y gaviotas', sel: '.ltv-cloud,.ltv-gull' }, { k: 'leaves', label: 'Hojas, burbujas y destellos', sel: '.ltv-leaves,.ltv-glints,.ltv-bubbles' }], name: 'Verano', description: 'Piscina tropical: cielo celeste, sol con tus apps, palmeras, agua con reflejos y flamenco',
    tags: ['clara', 'temporada', 'animada'], preview: { bg: '#6fd6fb', fg: '#073b4c', accent: '#ffd21f' }, render: renderVerano
  });
})(typeof window !== 'undefined' ? window : globalThis);
