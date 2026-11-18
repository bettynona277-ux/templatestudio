/* Diseños Streaming · Plantillas de landing de temporada: Navidad (roja) y Navidad Regalo (navidad2)
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
.lt-navidad .ltn-balls{filter:none}
/* ANIM: el destello de las esferas solo en 'max' (9 bucles menos en 'normal'); las esferas de los extremos no se ven en celular */
.lt-navidad[data-lt-motion="max"] .ltn-glint{animation:nv-glint 2.4s ease-in-out infinite alternate}
@media (max-width:600px){.lt-navidad .ltn-edge{display:none}}
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
/* ANIM: la nieve cae solo en vertical exactamente una baldosa (250/300 px): el bucle ya no 'salta' 30-40 px de lado cada 15-21 s */
@keyframes nv-f1{to{transform:translate3d(0,250px,0)}}
@keyframes nv-f2{to{transform:translate3d(0,300px,0)}}
.lt-navidad .ltn-hero-in{position:relative;z-index:3;display:grid;gap:40px;align-items:center}
.lt-navidad .ltn-hero-in>*{min-width:0}
.lt-navidad .ltn-hero .ltb-h1,.lt-navidad .ltn-hero .ltb-sub{overflow-wrap:anywhere}
@media (min-width:880px){.lt-navidad .ltn-hero-in{grid-template-columns:1.1fr .9fr}}
@media (max-width:879px){.lt-navidad .ltn-hero-txt{text-align:center}.lt-navidad .ltn-coupons,.lt-navidad .ltb-ctas,.lt-navidad .ltn-count{justify-content:center}.lt-navidad .ltb-sub{margin-left:auto;margin-right:auto}}
.lt-navidad .ltn-script{margin:0;font-family:var(--nv-script);font-weight:400;font-size:clamp(46px,11vw,84px);line-height:1;background:${NV_GOLD};-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(90,5,12,.55));padding:0 .1em;animation:nv-in .9s .1s cubic-bezier(.2,.8,.2,1) both}
.lt-navidad .ltb-h1{font-size:clamp(30px,6vw,56px);line-height:1.08;margin:6px 0 14px;color:#fff;text-shadow:0 3px 0 rgba(90,5,12,.6),0 10px 30px rgba(40,0,6,.45);overflow-wrap:break-word;animation:nv-in .8s .18s cubic-bezier(.16,1,.3,1) both}
@keyframes nv-in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.lt-navidad .ltb-sub{font-size:clamp(15px,4vw,19px);max-width:540px;margin:0 0 24px;color:#ffe2df;font-weight:500;animation:nv-in .7s .28s cubic-bezier(.16,1,.3,1) both}
/* ANIM: coreografía — guión, título, subtítulo, cupones (el de precio primero), cuenta regresiva y botones (visibles a ~0,45 s) */
.lt-navidad .ltn-count{animation:nv-in .6s .5s cubic-bezier(.16,1,.3,1) both}
.lt-navidad .ltn-hero .ltb-ctas{animation:nv-in .6s .42s cubic-bezier(.16,1,.3,1) both}
/* cupones redondos */
.lt-navidad .ltn-coupons{list-style:none;margin:0 0 22px;padding:0;display:flex;flex-wrap:wrap;gap:12px}
.lt-navidad .ltn-cp{position:relative;width:clamp(92px,24vw,112px);aspect-ratio:1;border-radius:50%;padding:5px;background:${NV_GOLD};box-shadow:0 10px 22px rgba(40,0,6,.45);animation:nv-pop .6s calc(.32s + var(--k) * .1s) cubic-bezier(.3,1.6,.5,1) both}
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
.lt-navidad .ltn-tile{position:relative;background:#fff;border-radius:18px;padding:8px;box-shadow:0 8px 18px rgba(90,5,12,.14);animation:nv-tile .5s calc(.55s + var(--k) * 70ms) cubic-bezier(.3,1.6,.5,1) both,nv-float 4s calc(var(--k) * -.7s) ease-in-out infinite alternate}
@keyframes nv-tile{from{opacity:0;scale:.4}to{opacity:1;scale:1}}
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
.lt-navidad .ltn-defs{position:absolute;width:0;height:0;overflow:hidden}
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
.lt-navidad .ltn-pricetag .ltb-price strong.ltb-ask{font-size:16px}
.lt-navidad .ltn-pricetag .ltb-old{color:#ffd0d3;font-size:13px}
.lt-navidad .ltn-pricetag .ltb-per{color:#ffe3a6;font-size:12px;opacity:1}
/* sello de oferta */
.lt-navidad .ltn-stamp{position:absolute;top:-14px;right:-10px;z-index:3;display:grid;place-items:center;width:66px;height:66px;border-radius:50%;padding:7px;background:radial-gradient(circle at 35% 30%,#ef3543,#a50d1d);border:3px solid var(--nv-gold);color:#fff;font-size:9.5px;font-weight:800;line-height:1.1;text-align:center;text-transform:uppercase;rotate:12deg;box-shadow:0 6px 12px rgba(90,5,12,.35);overflow:hidden;overflow-wrap:normal;word-break:normal;hyphens:none}
/* ANIM: el sello late UNA vez cuando su tarjeta aparece (antes 3 veces al cargar, fuera de pantalla) */
.lt-navidad.ltb-rv .is-in>.ltn-stamp{animation:nv-stamp 1.1s calc(var(--rvd,0ms) + .5s) ease-in-out both}
@keyframes nv-stamp{0%,100%{transform:scale(1)}35%{transform:scale(1.16)}65%{transform:scale(.95)}}
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
.lt-navidad .ltb-rev{background:#fff;border-radius:18px;border:1px solid #f3dcd6;box-shadow:0 10px 22px rgba(90,5,12,.1);color:var(--nv-ink);position:relative}
.lt-navidad .ltb-rev::after{content:"";position:absolute;top:-7px;right:18px;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 33% 28%,#ffd0d4 0,#e2313b 30%,#8a0614 75%);box-shadow:0 2px 4px rgba(0,0,0,.25)}
.lt-navidad .ltb-stars i.on{color:#d4a017}
.lt-navidad .ltb-rq p{font-weight:600}
.lt-navidad .ltb-rby b{color:#8a0614}
.lt-navidad .ltb-rav{background:radial-gradient(circle at 33% 28%,#ff8a92 0,#d7172b 40%,#7d0714);color:#fff}
.lt-navidad .ltb-revs{padding-top:10px}
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
@keyframes nv-f3{to{transform:translate3d(0,260px,0)}}
@media (max-width:480px){.lt-navidad .ltn-snow::after{display:none}.lt-navidad .ltb-headcta span{display:none}.lt-navidad .ltb-headcta{padding:8px}.lt-navidad .ltn-tile{animation:nv-tile .5s calc(.55s + var(--k) * 70ms) cubic-bezier(.3,1.6,.5,1) both}.lt-navidad .ltn-bokeh i:nth-child(n+4){display:none}}
/* ronda 6: oferta con cuenta regresiva (cinta roja y dorada) y foto propia del combo */
.lt-navidad .lt-promo{z-index:6;margin-bottom:10px}
.lt-navidad .lt-promo-in{background:linear-gradient(110deg,#137a3e,#0b5229);color:#fff;border:2px dashed var(--nv-gold);border-radius:20px;box-shadow:0 14px 30px rgba(40,0,5,.35)}
.lt-navidad .lt-promo-tag{background:var(--nv-gold);color:#5c050c}
.lt-navidad .lt-promo-u{background:#fff8ec;color:var(--nv-red)}
.lt-navidad .lt-promo-u small{color:var(--nv-ink)}
.lt-navidad .lt-promo-btn{background:var(--nv-gold);color:#5c050c}
.lt-navidad .ltb-cph{border-radius:14px;border:3px solid #fff;box-shadow:0 8px 18px rgba(90,5,12,.15)}
@media (min-width:760px){.lt-navidad .ltn-combo.has-ph .ltb-cph{grid-column:1}}
`;

  // ---------- dibujos ----------
  /** Guirnalda de pino (agujas generadas) con esferas 3D colgando. viewBox 1200x200.
   *  ANIM: las agujas se agrupan en UN <path> por color (5 nodos en vez de ~1300: HTML ~90 KB → ~25 KB y
   *  pintado inicial mucho más barato) y van en su propio SVG estático con la sombra; las esferas que se
   *  mecen van en otro SVG superpuesto, sin filtro, para que su movimiento no obligue a repintar la sombra
   *  del pino. Las esferas de los extremos (fuera de cuadro en celular) se ocultan en pantallas angostas. */
  const NV_GARLAND = (() => {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const greens = ['#0a4a27', '#0f6334', '#16783f', '#0c5530', '#1d8a4a'];
    const anchors = [[-20, 4], [300, 4], [600, 4], [900, 4], [1220, 4]];
    const byColor = greens.map(() => []);
    for (let s = 0; s < 4; s++) {
      const [x0, y0] = anchors[s], [x2, y2] = anchors[s + 1];
      const cx = (x0 + x2) / 2, cy = 112;
      for (let i = 0; i <= 64; i++) {
        const t = i / 64, mt = 1 - t;
        const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x2, y = mt * mt * y0 + 2 * mt * t * cy + t * t * y2;
        for (let n = 0; n < 5; n++) {
          const a = rnd() * Math.PI * 2, L = 12 + rnd() * 14;
          byColor[(i + n) % greens.length].push(`M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(a) * L).toFixed(1)} ${(Math.sin(a) * L * .8).toFixed(1)}`);
        }
      }
    }
    const needles = greens.map((g, k) => `<path d="${byColor[k].join('')}" stroke="${g}"/>`).join('');
    const balls = [[150, 58, 34, 22, 'r'], [300, 4, 66, 17, 'g'], [450, 58, 22, 27, 'g'], [600, 4, 96, 22, 'r'], [750, 58, 40, 18, 's'], [900, 4, 62, 25, 'r'], [1050, 58, 28, 21, 'g'], [60, 30, 40, 15, 'r'], [1140, 30, 44, 16, 's']];
    const ball = ([x, y, len, r, c]) => `<g class="ltn-sw${x < 240 || x > 960 ? ' ltn-edge' : ''}"><line x1="${x}" y1="${y}" x2="${x}" y2="${y + len}" stroke="#e9c46a" stroke-width="1.5"/><rect x="${x - r * .32}" y="${y + len - 3}" width="${r * .64}" height="${r * .42}" rx="2" fill="url(#nvCap)"/><circle cx="${x}" cy="${y + len + r}" r="${r}" fill="url(#nvB${c})"/><ellipse class="ltn-glint" cx="${x - r * .38}" cy="${y + len + r * .6}" rx="${r * .22}" ry="${r * .14}" fill="#fff" opacity=".8" transform="rotate(-30 ${x - r * .38} ${y + len + r * .6})"/></g>`;
    const berries = [[300, 12], [600, 12], [900, 12], [150, 70], [450, 70], [750, 70], [1050, 70]].map(([x, y]) => `<circle cx="${x - 7}" cy="${y}" r="6" fill="#d7172b"/><circle cx="${x + 5}" cy="${y + 3}" r="5.5" fill="#ef3543"/><circle cx="${x - 1}" cy="${y + 9}" r="5" fill="#b30d1f"/>`).join('');
    const grad = (id, a, b, c, d) => `<radialGradient id="${id}" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="${a}"/><stop offset=".28" stop-color="${b}"/><stop offset=".65" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></radialGradient>`;
    return `<svg class="ltn-garland" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><g stroke-width="2.4" stroke-linecap="round" fill="none">${needles}</g>${berries}</svg>` +
      `<svg class="ltn-garland ltn-balls" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><defs>${grad('nvBr', '#ffd0d3', '#ff4a55', '#c8102e', '#4a040c')}${grad('nvBg', '#fffbe0', '#ffd968', '#cf9426', '#5e3c06')}${grad('nvBs', '#ffffff', '#eef1f6', '#aab4c4', '#59627a')}<linearGradient id="nvCap" x1="0" x2="1"><stop offset="0" stop-color="#a8711a"/><stop offset=".5" stop-color="#fff0b3"/><stop offset="1" stop-color="#a8711a"/></linearGradient></defs>${balls.map(ball).join('')}</svg>`;
  })();
  const NV_SPRIG = (() => {
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const greens = ['#0a4a27', '#0f6334', '#16783f', '#1d8a4a'];
    // ANIM: un <path> por color (4 nodos por ramita en vez de 152; hay 2 ramitas por panel).
    const byColor = greens.map(() => []);
    [[[10, 20], [100, 60]], [[14, 24], [70, 8]]].forEach(([a, b]) => {
      for (let i = 0; i <= 18; i++) {
        const t = i / 18, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        for (let n = 0; n < 4; n++) { const an = rnd() * 6.28, L = 7 + rnd() * 8; byColor[(i + n) % 4].push(`M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(an) * L).toFixed(1)} ${(Math.sin(an) * L).toFixed(1)}`); }
      }
    });
    const p = greens.map((g, k) => `<path d="${byColor[k].join('')}" stroke="${g}"/>`).join('');
    // UX/ANIM: la ramita se define UNA vez (<symbol>) y cada esquina la reutiliza con <use> (antes 14 copias completas).
    const def = `<svg class="ltn-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><symbol id="ltnSprig" viewBox="0 0 110 80"><g stroke-width="2" stroke-linecap="round" fill="none">${p}</g><circle cx="22" cy="30" r="9" fill="url(#nvSr)"/><circle cx="38" cy="22" r="6" fill="#d7172b"/><circle cx="33" cy="32" r="5" fill="#ef3543"/><radialGradient id="nvSr" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fffbe0"/><stop offset=".3" stop-color="#ffd968"/><stop offset=".7" stop-color="#cf9426"/><stop offset="1" stop-color="#5e3c06"/></radialGradient></symbol></defs></svg>`;
    const f = cls => `<svg class="ltn-sprig ${cls}" viewBox="0 0 110 80" aria-hidden="true"><use href="#ltnSprig" width="110" height="80"/></svg>`;
    f.def = def;
    return f;
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
    const feats = p.features.length ? `<ul class="ltb-feats">${p.features.map((f, k) => `<li><span${ed(ctx, `plans.${p.id}.features.${k}`)}>${ctx.esc(f)}</span></li>`).join('')}</ul>` : '';
    return `<article class="ltb-card ltn-card" data-rv data-lt-card${itm(ctx, 'p', p.id)} style="--i:${i % 8}">` +
      `${p.badge ? `<span class="ltn-stamp">${ctx.esc(p.badge)}</span>` : ''}` +
      `<div class="ltb-card-top"><span class="ltn-lg">${logoHtml(ctx, p.platform, 'ltb-logo', p.imageUrl, ctx.planTitle(p))}</span><div class="ltb-meta"><h3 class="ltb-title"${ed(ctx, `plans.${p.id}.title`)}>${ctx.esc(p.title || inf.name)}</h3><span class="ltb-type">${ctx.esc(ctx.typeLabel(p))}</span></div></div>` +
      `${feats}<div class="ltn-buyrow"><div class="ltn-pricetag">${priceHtml(ctx, p.price, p.oldPrice, p.period, `plans.${p.id}.price`)}</div>${btn(ctx, planBuy(ctx, p), ctx.money(p.price) ? 'Comprar' : 'Consultar', 'ltb-buy', true)}</div></article>`;
  }
  function nvComboCard(ctx, c, i) {
    const names = c.platforms.map(x => ctx.platformInfo(x).name);
    return `<article class="ltb-card ltn-combo${c.badge ? ' ltn-hs' : ''}${c.imageUrl ? ' has-ph' : ''}" data-rv data-lt-card${itm(ctx, 'c', c.id)} style="--i:${i % 8}">` +
      `${c.badge ? `<span class="ltn-stamp">${ctx.esc(c.badge)}</span>` : ''}` +
      comboPhoto(ctx, c) +
      `<h3 class="ltb-title"${ed(ctx, `combos.${c.id}.name`)}>${ctx.esc(c.name)}</h3>` +
      (c.imageUrl ? '' : `<div class="ltb-logos">${c.platforms.map(x => logoHtml(ctx, x, 'ltb-logo')).join('')}</div>`) +
      `<p class="ltb-incl">${ctx.esc(names.join(' + '))}</p>` +
      `<div class="ltn-cbuy"><div class="ltn-pricetag">${priceHtml(ctx, c.price, c.oldPrice, c.period, `combos.${c.id}.price`)}</div>${btn(ctx, comboBuy(ctx, c), ctx.money(c.price) ? 'Pedir combo' : 'Consultar', 'ltb-buy', true)}</div></article>`;
  }
  /** Sección con panel crema, cinta de título y ramitas de pino en las esquinas. */
  const nvSec = (kind, title, body, green) => `<section class="ltb-sec ltb-sec-${kind}"><div class="ltb-wrap"><div class="ltn-panel${green ? ' ltn-panel-g' : ''}" data-rv>${NV_SPRIG('l')}${NV_SPRIG('r')}<h2 class="ltb-h2"><span class="ltn-rib">${title}</span></h2>${body}</div></div></section>`;

  function renderNavidad(root, d, ctx) {
    LC.injectCss('navidad', CSS_NAVIDAD);
    const cl = setup(root, ctx, d, 'navidad');
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
      (pm ? ctx.profileHeader() : `<div class="ltn-top">${header(ctx, d, wa)}</div>`) + promo(ctx) +
      `<section class="ltn-hero" data-lt-hero>${bokeh}<div class="ltn-snow" aria-hidden="true"></div><div class="ltn-snow3" aria-hidden="true"></div>${NV_GARLAND}` +
      `<div class="ltb-wrap ltn-hero-in"><div class="ltn-hero-txt">` +
      `<p class="ltn-script"${(!pm && d.tagline && d.tagline.length <= 22) ? ed(ctx, 'tagline') : ''}>${ctx.esc((!pm && d.tagline && d.tagline.length <= 22) ? d.tagline : 'Feliz Navidad')}</p>` +
      `<h1 class="ltb-h1"${ed(ctx, 'heroTitle')}>${ctx.esc(d.heroTitle || LC.DEFAULTS.heroTitle)}</h1><p class="ltb-sub"${ed(ctx, 'heroSubtitle')}>${ctx.esc(d.heroSubtitle || LC.DEFAULTS.heroSubtitle)}</p>` +
      couponsHtml +
      (cd.hide ? '' : `<div class="ltn-count" role="timer" aria-live="off">${nvCountHtml(cd)}</div>`) +
      `<div class="ltb-ctas">${heroCta(ctx, d, wa)}${plans.length && wa ? '<button type="button" class="ltb-btn ltb-ghost" data-goto="plans">Ver precios</button>' : ''}</div>` +
      `</div>${art}</div></section>` +
      (plans.length ? nvSec('plans', 'Regalos de Navidad', `<div class="ltb-grid">${plans.map((p, i) => nvPlanCard(ctx, p, i)).join('')}</div>`) : '') +
      (combos.length ? nvSec('combos', 'Combos navideños', `<div class="ltn-crow">${combos.map((c, i) => nvComboCard(ctx, c, i)).join('')}</div>`, true) : '') +
      (d.reviews && d.reviews.length ? nvSec('reviews', 'Lo que dicen nuestros clientes', reviewsHtml(ctx, d, false)) : '') +
      (d.benefits.length ? nvSec('benefits', '¿Por qué con nosotros?', `<ul class="ltb-bens">${d.benefits.map((b, i) => `<li style="--i:${i}"><span class="ltb-bn" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span${ed(ctx, `benefits.${i}`)}>${ctx.esc(b)}</span></li>`).join('')}</ul>`, true) : '') +
      (d.paymentMethods.length ? nvSec('pays', 'Paga como quieras', `<ul class="ltb-pays">${d.paymentMethods.map((p, i) => `<li${ed(ctx, `paymentMethods.${i}`)}>${ctx.esc(p)}</li>`).join('')}</ul>`) : '') +
      (d.faq.length ? nvSec('faq', 'Preguntas frecuentes', `<div class="ltb-faq">${d.faq.map((f, i) => `<details><summary><span${ed(ctx, `faq.${i}.q`)}>${ctx.esc(f.q)}</span></summary><p${ed(ctx, `faq.${i}.a`)}>${ctx.esc(f.a)}</p></details>`).join('')}</div>`, true) : '') +
      (d.links.length ? nvSec('links', 'Síguenos', `<div class="ltb-links">${d.links.map(l => `<a class="ltb-link" href="${ctx.esc(l.url)}" target="_blank" rel="noopener">${ctx.linkIcon(l.type)}<span>${ctx.esc(ctx.linkLabel(l))}</span></a>`).join('')}</div>`) : '') +
      footer(ctx, d, `<p class="ltn-felices">Felices fiestas</p>`) + fab(ctx, wa) + NV_SPRIG.def;
    root.innerHTML = html;
    const box = root.querySelector('.ltn-count');
    if (box && !cd.msg) {
      const t = G.setInterval(() => { box.innerHTML = nvCountHtml(nvCountdown(new Date())); }, 30000);
      cl.push(() => G.clearInterval(t));
    }
    motionKit(root, ctx, cl);
  }

  LC.registerTemplate({
    id: 'navidad', name: 'Navidad', description: 'Roja elegante: guirnalda con esferas brillantes, dorado, cupones de precio y cuenta regresiva',
    // Plantilla de temporada exclusiva VIP (sin VIP vigente se pinta 'fallback'). El editor la agrupa en "De temporada · VIP".
    seasonal: true, vipOnly: true, fallback: 'pop',
    tags: ['festiva', 'navidad', 'animada'], preview: { bg: '#b80f1f', fg: '#ffffff', accent: '#f2c75a' }, render: renderNavidad
  });
  // =====================================================================
  // NAVIDAD REGALO (id navidad2) — "caja de regalo": gris niebla, papel blanco y cinta de raso roja.
  // La portada es un regalo atado con cinta y moño; cada plan es un regalito con su cinta.
  // Un solo momento orquestado al cargar (la cinta se ata y el moño aparece) + respuesta al tocar.
  // Tipografía Outfit. Íconos de Lucide (lucide.dev, licencia ISC).
  // =====================================================================
  const LUC = {
    gift: '<path d="M12 7v14"/><path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"/><rect x="3" y="7" width="18" height="4" rx="1"/>',
    zap: '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    sparkles: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>',
    card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M6 14h2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>'
  };
  const luc = (k, cls = 'ltg-ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LUC[k]}</svg>`;
  /** Moño de raso (viewBox 120x70). */
  const GF_BOW = cls => `<svg class="${cls}" viewBox="0 0 120 72" aria-hidden="true"><defs><linearGradient id="ltgBw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0525A"/><stop offset=".55" stop-color="#E0242F"/><stop offset="1" stop-color="#A80F19"/></linearGradient></defs>` +
    `<path class="ltg-tail" d="M54 38 42 70l9-4 4 6 9-32zM66 38l12 32-9-4-4 6-9-32z" fill="#B5121C"/>` +
    `<path d="M60 34C36 0 2 6 8 28c5 16 32 12 52 6Z" fill="url(#ltgBw)"/><path d="M60 34C84 0 118 6 112 28c-5 16-32 12-52 6Z" fill="url(#ltgBw)"/>` +
    `<path d="M20 16c10-2 24 4 34 14M100 16c-10-2-24 4-34 14" stroke="#FF9AA0" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".75"/>` +
    `<rect x="50" y="24" width="20" height="20" rx="6" fill="#E0242F" stroke="#A80F19" stroke-width="1.4"/></svg>`;
  function gfPlanCard(ctx, p, i) {
    const inf = ctx.platformInfo(p.platform);
    const feats = p.features.length ? `<ul class="ltb-feats">${p.features.map((f, k) => `<li>${luc('check')}<span${ed(ctx, `plans.${p.id}.features.${k}`)}>${ctx.esc(f)}</span></li>`).join('')}</ul>` : '';
    return `<article class="ltb-card ltg-gift" data-rv data-lt-card${itm(ctx, 'p', p.id)} style="--i:${i % 8}">` +
      `<div class="ltg-lid">${p.badge ? `<span class="ltg-tag">${ctx.esc(p.badge)}</span>` : ''}<span class="ltg-lg">${logoHtml(ctx, p.platform, 'ltb-logo', p.imageUrl, ctx.planTitle(p))}</span></div>` +
      `<div class="ltg-body"><h3 class="ltb-title"${ed(ctx, `plans.${p.id}.title`)}>${ctx.esc(p.title || inf.name)}</h3><span class="ltb-type">${ctx.esc(ctx.typeLabel(p))}</span>` +
      `${priceHtml(ctx, p.price, p.oldPrice, p.period, `plans.${p.id}.price`)}${feats}${btn(ctx, planBuy(ctx, p), ctx.money(p.price) ? 'Pedir' : 'Consultar', 'ltb-buy', true)}</div></article>`;
  }
  function gfComboCard(ctx, c, i) {
    const names = c.platforms.map(x => ctx.platformInfo(x).name);
    return `<article class="ltb-card ltg-combo${c.imageUrl ? ' has-ph' : ''}" data-rv data-lt-card${itm(ctx, 'c', c.id)} style="--i:${i % 8}">` +
      `<span class="ltg-cr" aria-hidden="true"></span>${c.badge ? `<span class="ltg-tag">${ctx.esc(c.badge)}</span>` : ''}` +
      comboPhoto(ctx, c) +
      `<h3 class="ltb-title"${ed(ctx, `combos.${c.id}.name`)}>${ctx.esc(c.name)}</h3>` +
      (c.imageUrl ? '' : `<div class="ltb-logos">${c.platforms.map(x => logoHtml(ctx, x, 'ltb-logo')).join('')}</div>`) +
      `<p class="ltb-incl">${ctx.esc(names.join(' + '))}</p>` +
      `<div class="ltg-cbuy">${priceHtml(ctx, c.price, c.oldPrice, c.period, `combos.${c.id}.price`)}${btn(ctx, comboBuy(ctx, c), ctx.money(c.price) ? 'Pedir combo' : 'Consultar', 'ltb-buy', true)}</div></article>`;
  }
  const gfSec = (kind, title, body) => `<section class="ltb-sec ltb-sec-${kind}"><div class="ltb-wrap"><h2 class="ltb-h2" data-rv>${title}</h2>${body}</div></section>`;

  const GF_RIB = 'linear-gradient(90deg,#B5121C,#E0242F 38%,#F0525A 50%,#E0242F 62%,#B5121C)';
  const GF_RIBH = 'linear-gradient(180deg,#B5121C,#E0242F 38%,#F0525A 50%,#E0242F 62%,#B5121C)';
  const CSS_NAVIDAD2 = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');` + baseCss('navidad2') + `
.lt-navidad2{--g-mist:#ECEDEF;--g-paper:#fff;--g-ink:#16181C;--g-mut:#5E636C;--g-line:#DCDEE2;--g-red:#E0242F;--g-red2:#B5121C;--g-sh:0 18px 40px rgba(60,64,74,.13);background:var(--g-mist);color:var(--g-ink);font-family:Outfit,"Segoe UI",system-ui,-apple-system,Roboto,sans-serif}
.lt-navidad2 .ltb-wrap{max-width:1080px}
.lt-navidad2 .ltb-h1,.lt-navidad2 .ltb-h2,.lt-navidad2 .ltb-title{font-weight:800;letter-spacing:-.03em}
/* cabecera propia */
.lt-navidad2 .ltg-top .ltb-head{padding:16px 18px}
.lt-navidad2 .ltb-brand img,.lt-navidad2 .ltb-mono{border-radius:12px}
.lt-navidad2 .ltb-mono{background:var(--g-ink);color:#fff;font-size:19px}
.lt-navidad2 .ltb-brand b{font-weight:800;letter-spacing:-.02em}
.lt-navidad2 .ltb-headcta{display:inline-flex;align-items:center;gap:6px;color:var(--g-red);font-weight:600;font-size:15px;text-decoration:none;padding:8px 4px}
.lt-navidad2 .ltb-headcta svg{width:19px;height:19px}
/* portada: la caja de regalo */
.lt-navidad2 .ltg-hero{padding:6px 0 34px}
.lt-navidad2 .ltg-hero .ltb-wrap{padding:0 14px}
.lt-navidad2 .ltg-box{position:relative;overflow:hidden;background:var(--g-paper);border-radius:24px;box-shadow:var(--g-sh);padding:30px 22px 26px;display:grid;gap:26px}
@media (min-width:880px){.lt-navidad2 .ltg-box{grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr);align-items:center;padding:56px 56px 52px}}
.lt-navidad2 .ltg-rv,.lt-navidad2 .ltg-rh{position:absolute;z-index:1;pointer-events:none}
.lt-navidad2 .ltg-rv{top:0;bottom:0;right:20px;width:22px;background:${GF_RIB};transform-origin:50% 0}
.lt-navidad2 .ltg-rh{left:0;right:0;top:106px;height:22px;background:${GF_RIBH};transform-origin:0 50%}
@media (min-width:880px){.lt-navidad2 .ltg-rv{right:32%;width:30px}.lt-navidad2 .ltg-rh{top:118px;height:30px}}
.lt-navidad2 .ltg-bow{position:absolute;z-index:3;width:100px;height:60px;right:-19px;top:82px}
@media (min-width:880px){.lt-navidad2 .ltg-bow{right:calc(32% + 15px - 70px);top:86px;width:140px;height:84px}}
.lt-navidad2 .ltg-txt{position:relative;z-index:2;min-width:0}
.lt-navidad2 .ltg-label{display:inline-block;margin:0 0 70px;padding:6px 12px;border-radius:8px;background:var(--g-ink);color:#fff;font-size:13px;font-weight:600;transform:rotate(-3deg)}
@media (min-width:880px){.lt-navidad2 .ltg-label{margin-bottom:84px}}
.lt-navidad2 .ltb-h1{font-size:clamp(30px,8.2vw,64px);line-height:1.02;margin:0 0 14px;padding-right:40px;overflow-wrap:break-word;hyphens:manual}
@media (min-width:880px){.lt-navidad2 .ltb-h1{padding-right:0;max-width:12ch}}
.lt-navidad2 .ltb-sub{font-size:16px;line-height:1.5;color:var(--g-mut);margin:0 0 24px;max-width:32ch;padding-right:40px}
@media (min-width:880px){.lt-navidad2 .ltb-sub{padding-right:0;font-size:18px}}
.lt-navidad2 .ltg-ctabar{position:relative;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:58px;padding:14px 18px;border-radius:14px;background:var(--g-ink);color:#fff;text-decoration:none;font-weight:600;font-size:16.5px;box-shadow:0 10px 22px rgba(22,24,28,.22);transition:transform .2s cubic-bezier(.3,1.6,.5,1)}
.lt-navidad2 .ltg-ctabar:active{transform:scale(.98)}
.lt-navidad2 .ltg-ctabar .ltg-cl{display:inline-flex;align-items:center;gap:9px;min-width:0}
.lt-navidad2 .ltg-ctabar svg{width:20px;height:20px;flex:none}
.lt-navidad2 .ltg-ctabar small{flex:none;font-size:14px;font-weight:600;color:#C9CCD2}
.lt-navidad2 .ltg-ctabar small b{color:#FF6B72;font-size:17px;font-weight:800}
.lt-navidad2 .ltg-more{display:inline-block;margin:14px 0 0;padding:6px 2px;background:none;border:0;color:var(--g-ink);font-weight:600;font-size:15px;text-decoration:underline;text-decoration-color:var(--g-red);text-decoration-thickness:2px;text-underline-offset:5px;cursor:pointer}
.lt-navidad2 .ltg-count{margin:16px 0 0;font-size:14px;color:var(--g-mut)}
.lt-navidad2 .ltg-count b{color:var(--g-ink)}
/* tarjetita colgante de regalo (logos) */
.lt-navidad2 .ltg-gtag{position:relative;z-index:2;justify-self:center;width:min(300px,100%);margin-top:4px;padding:22px 20px 20px;border-radius:16px;background:#F5F6F8;border:1px solid var(--g-line);transform:rotate(2.5deg);transform-origin:50% 0}
.lt-navidad2 .ltg-gtag::before{content:"";position:absolute;top:10px;left:50%;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:var(--g-mist);box-shadow:inset 0 1px 2px rgba(0,0,0,.18)}
.lt-navidad2 .ltg-gtag p{margin:10px 0 12px;font-size:14px;color:var(--g-mut);text-align:center}
.lt-navidad2 .ltg-gtag p b{color:var(--g-ink)}
.lt-navidad2 .ltg-glogos{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.lt-navidad2 .ltg-glogos .ltb-logo{width:100%;height:auto;aspect-ratio:1;border-radius:14px;font-size:22px;box-shadow:0 4px 10px rgba(60,64,74,.12)}
@media (max-width:879px){.lt-navidad2 .ltg-gtag{display:none}}
.lt-navidad2 .ltg-strip{display:flex;align-items:center;gap:10px;margin:16px 4px 0;font-size:14px;color:var(--g-mut)}
.lt-navidad2 .ltg-strip span{display:flex}
.lt-navidad2 .ltg-strip .ltb-logo{width:34px;height:34px;border-radius:50%;border:2px solid var(--g-mist);font-size:13px}
.lt-navidad2 .ltg-strip .ltb-logo+.ltb-logo{margin-left:-10px}
@media (min-width:880px){.lt-navidad2 .ltg-strip{display:none}}
/* el único momento orquestado: la cinta se ata y aparece el moño (solo VIP) */
.lt-navidad2:not(.lt-static) .ltg-rv{animation:ltg-tieV .7s .15s cubic-bezier(.65,0,.35,1) both}
.lt-navidad2:not(.lt-static) .ltg-rh{animation:ltg-tieH .7s .35s cubic-bezier(.65,0,.35,1) both}
.lt-navidad2:not(.lt-static) .ltg-bow{animation:ltg-bow .8s 1s cubic-bezier(.3,1.7,.45,1) both}
.lt-navidad2:not(.lt-static) .ltg-label{animation:ltg-drop .6s .05s cubic-bezier(.3,1.5,.5,1) both}
.lt-navidad2:not(.lt-static) .ltg-gtag{animation:ltg-swing 1.4s 1.25s cubic-bezier(.3,1.4,.5,1) both}
@keyframes ltg-tieV{from{transform:scaleY(0)}to{transform:none}}
@keyframes ltg-tieH{from{transform:scaleX(0)}to{transform:none}}
@keyframes ltg-bow{from{opacity:0;transform:scale(.2) rotate(-20deg)}to{opacity:1;transform:none}}
@keyframes ltg-drop{from{opacity:0;transform:translateY(-14px) rotate(-12deg)}to{opacity:1;transform:rotate(-3deg)}}
@keyframes ltg-swing{0%{opacity:0;transform:rotate(-14deg)}40%{opacity:1;transform:rotate(7deg)}70%{transform:rotate(1deg)}100%{opacity:1;transform:rotate(2.5deg)}}
/* secciones */
.lt-navidad2 .ltb-sec{padding:34px 0}
.lt-navidad2 .ltb-sec .ltb-wrap{padding:0 14px}
.lt-navidad2 .ltb-h2{font-size:clamp(28px,6vw,40px);line-height:1.05;margin:0 0 18px;padding:0 4px}
/* planes: regalitos */
.lt-navidad2 .ltg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
@media (min-width:700px){.lt-navidad2 .ltg-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}}
@media (min-width:1000px){.lt-navidad2 .ltg-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.lt-navidad2 .ltg-gift{gap:0;background:var(--g-paper);border-radius:18px;overflow:hidden;box-shadow:0 8px 20px rgba(60,64,74,.08)}
.lt-navidad2 .ltg-lid{position:relative;display:grid;place-items:center;height:104px;background:linear-gradient(#fff,#fff) padding-box}
.lt-navidad2 .ltg-lid::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:12px;margin-left:-6px;background:${GF_RIB}}
.lt-navidad2 .ltg-lid::after{content:"";position:absolute;left:0;right:0;top:50%;height:12px;margin-top:-6px;background:${GF_RIBH}}
.lt-navidad2 .ltg-lg{position:relative;z-index:1;border-radius:16px;box-shadow:0 0 0 5px #fff,0 8px 16px rgba(60,64,74,.18);transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.lt-navidad2 .ltg-lg .ltb-logo{width:56px;height:56px;border-radius:16px}
.lt-navidad2 .ltg-body{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;padding:6px 14px 14px;flex:1;min-width:0}
.lt-navidad2 .ltg-body .ltb-title{font-size:17px}
.lt-navidad2 .ltb-type{font-size:12.5px;font-weight:600;color:var(--g-mut);text-transform:none;letter-spacing:0}
.lt-navidad2 .ltb-price{justify-content:center;margin:6px 0 2px}
.lt-navidad2 .ltb-price strong{font-size:28px;letter-spacing:-.03em;font-weight:800}
.lt-navidad2 .ltb-price strong.ltb-ask{font-size:16px}
.lt-navidad2 .ltb-old{color:#9AA0A9}
.lt-navidad2 .ltb-per{font-size:13px;color:var(--g-mut)}
.lt-navidad2 .ltb-feats{gap:4px;font-size:13px;color:var(--g-mut);margin:4px 0 6px;text-align:left}
.lt-navidad2 .ltb-feats li{gap:6px;align-items:center}
.lt-navidad2 .ltb-feats .ltg-ic{width:14px;height:14px;flex:none;color:var(--g-red)}
.lt-navidad2 .ltb-btn{border-radius:12px;font-weight:600;font-size:15px;border:0;background:var(--g-ink);color:#fff;transition:transform .2s cubic-bezier(.3,1.6,.5,1),background .2s}
.lt-navidad2 .ltb-btn:active{transform:scale(.97)}
.lt-navidad2 .ltg-gift .ltb-btn{min-height:44px;padding:10px 12px;margin-top:auto}
.lt-navidad2 .ltg-gift .ltb-btn svg{width:17px;height:17px}
.lt-navidad2 .ltg-tag{position:absolute;z-index:2;top:10px;left:10px;max-width:calc(100% - 20px);padding:4px 9px;border-radius:7px;background:var(--g-ink);color:#fff;font-size:11.5px;font-weight:600;transform:rotate(-4deg);overflow-wrap:anywhere;line-height:1.25}
/* abrir el regalo: la cinta se desata (respuesta al pasar el mouse o tocar) */
.lt-navidad2 .ltg-lid::before,.lt-navidad2 .ltg-lid::after{transition:transform .45s cubic-bezier(.65,0,.35,1)}
@media (hover:hover){.lt-navidad2:not(.lt-static) .ltg-gift:hover .ltg-lid::before{transform:translateY(-104%)}.lt-navidad2:not(.lt-static) .ltg-gift:hover .ltg-lid::after{transform:translateX(104%)}.lt-navidad2:not(.lt-static) .ltg-gift:hover .ltg-lg{transform:translateY(-4px) scale(1.06)}}
/* combos */
.lt-navidad2 .ltg-crow{display:grid;gap:14px}
@media (min-width:760px){.lt-navidad2 .ltg-crow{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}
.lt-navidad2 .ltg-combo{gap:10px;background:var(--g-paper);border-radius:18px;padding:20px 18px 18px 46px;box-shadow:0 8px 20px rgba(60,64,74,.08);overflow:hidden}
.lt-navidad2 .ltg-cr{position:absolute;top:0;bottom:0;left:16px;width:14px;background:${GF_RIB}}
.lt-navidad2 .ltg-combo .ltg-tag{position:relative;top:auto;left:auto;align-self:flex-start}
.lt-navidad2 .ltg-combo .ltb-title{font-size:21px}
.lt-navidad2 .ltg-combo .ltb-logos{gap:0}
.lt-navidad2 .ltg-combo .ltb-logos .ltb-logo{width:40px;height:40px;border-radius:50%;border:3px solid #fff;margin-right:-10px;box-shadow:0 3px 8px rgba(60,64,74,.15)}
.lt-navidad2 .ltg-combo .ltb-incl{color:var(--g-mut);font-size:14px}
.lt-navidad2 .ltg-cbuy{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:auto;padding-top:6px}
.lt-navidad2 .ltg-cbuy .ltb-price{margin:0;justify-content:flex-start}
.lt-navidad2 .ltg-cbuy .ltb-btn{width:auto;margin-top:0;flex:1 1 140px;min-height:46px}
.lt-navidad2 .ltb-cph{border-radius:12px}
/* reseñas, beneficios, pagos, preguntas, enlaces */
.lt-navidad2 .ltb-rev{background:var(--g-paper);border-radius:18px;box-shadow:0 8px 20px rgba(60,64,74,.08)}
.lt-navidad2 .ltb-stars i.on{color:var(--g-red)}
.lt-navidad2 .ltb-rav{background:var(--g-ink);color:#fff}
.lt-navidad2 .ltg-bens{list-style:none;margin:0;padding:6px 18px;background:var(--g-paper);border-radius:18px;box-shadow:0 8px 20px rgba(60,64,74,.08)}
.lt-navidad2 .ltg-bens li{display:flex;align-items:center;gap:14px;padding:15px 0;font-weight:600;font-size:16px;overflow-wrap:anywhere}
.lt-navidad2 .ltg-bens li+li{border-top:1px solid var(--g-line)}
.lt-navidad2 .ltg-bens .ltg-ic{flex:none;width:22px;height:22px;color:var(--g-red)}
.lt-navidad2 .ltb-pays li{padding:10px 18px;border-radius:12px;background:var(--g-paper);font-weight:600;box-shadow:0 4px 12px rgba(60,64,74,.07)}
.lt-navidad2 .ltb-faq details{background:var(--g-paper);border-radius:16px}
.lt-navidad2 .ltb-faq summary::after{color:var(--g-red)}
.lt-navidad2 .ltb-faq p{color:var(--g-mut)}
.lt-navidad2 .ltb-links{justify-content:flex-start}
.lt-navidad2 .ltb-link{background:var(--g-paper);border-radius:12px;box-shadow:0 4px 12px rgba(60,64,74,.07)}
/* pie: cinta con moño */
.lt-navidad2 .ltb-foot{position:relative;margin-top:30px;padding-top:70px;background:var(--g-paper);color:var(--g-mut)}
.lt-navidad2 .ltb-foot::before{content:"";position:absolute;left:0;right:0;top:0;height:18px;background:${GF_RIBH}}
.lt-navidad2 .ltg-fbow{position:absolute;left:50%;top:-22px;width:96px;height:58px;margin-left:-48px}
.lt-navidad2 .ltg-felices{margin:0 0 6px!important;font-size:28px;font-weight:800;letter-spacing:-.03em;color:var(--g-ink)}
.lt-navidad2 .ltb-made a{color:var(--g-ink);font-weight:600}
/* cabecera tipo perfil */
.lt-navidad2 .ltp{color:var(--g-ink)}
.lt-navidad2 .ltp-ring{background:var(--g-red)}
.lt-navidad2 .ltp-avatar-in{border-color:#fff}
.lt-navidad2 .ltp-tag,.lt-navidad2 .ltp-meta{color:var(--g-mut);opacity:1}
.lt-navidad2 .ltp-social{background:#fff;border:1px solid var(--g-line);color:var(--g-ink)}
.lt-navidad2.ltb-pm .ltg-hero{padding-top:18px}
/* oferta con cuenta regresiva */
.lt-navidad2 .lt-promo-in{background:var(--g-ink);color:#fff;border-radius:16px}
.lt-navidad2 .lt-promo-tag{background:var(--g-red);color:#fff}
.lt-navidad2 .lt-promo-u{background:#fff;color:var(--g-ink)}
.lt-navidad2 .lt-promo-btn{background:var(--g-red);color:#fff}
/* confeti de cinta al tocar (VIP) */
.ltg-burst{position:fixed;z-index:60;width:0;height:0;pointer-events:none}
.ltg-burst i{position:absolute;left:-3px;top:-6px;width:6px;height:12px;border-radius:2px;background:#E0242F;animation:ltg-burst .8s cubic-bezier(.2,.7,.3,1) forwards}
.ltg-burst i:nth-child(3n){background:#C9CCD2}
.ltg-burst i:nth-child(4n){background:#16181C}
@keyframes ltg-burst{0%{opacity:1;transform:translate(0,0) rotate(0) scale(.4)}100%{opacity:0;transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(1)}}
@media (max-width:360px){.lt-navidad2 .ltg-ctabar small{display:none}.lt-navidad2 .ltg-ctabar{justify-content:center}}
@media (max-width:420px){.lt-navidad2 .ltb-headcta span{display:none}.lt-navidad2 .ltg-ctabar{font-size:15.5px;padding:14px 14px}.lt-navidad2 .ltg-ctabar small{font-size:13px}}
`;

  function renderNavidad2(root, d, ctx) {
    LC.injectCss('navidad2', CSS_NAVIDAD2);
    const cl = setup(root, ctx, d, 'navidad2');
    const pm = !!(ctx.profileMode || d.coverUrl || d.logoUrl) && typeof ctx.profileHeader === 'function';
    if (pm) { root.classList.add('ltb-pm'); root.classList.add('lt-light-profile'); }
    const { plans, combos } = visible(d, ctx);
    const wa = d.whatsapp ? ctx.buy('tus planes') : '';
    const ids = ctx.platformIds || platformIds(plans, combos);
    const from = ctx.minPrice ? `<small>desde <b>${ctx.esc(ctx.minPrice)}</b></small>` : '';
    const cta = wa
      ? `<a class="ltg-ctabar" data-lt-btn="main" href="${ctx.esc(wa)}" target="_blank" rel="noopener"><span class="ltg-cl">${ctx.linkIcon('whatsapp')}<span${ed(ctx, 'ctaText')}>${ctx.esc(d.ctaText)}</span></span>${from}</a>`
      : `<button type="button" class="ltg-ctabar" data-goto="plans"><span class="ltg-cl">Ver planes</span>${from}</button>`;
    const cd = nvCountdown(new Date());
    const countTxt = cd.hide ? '' : cd.msg ? `<p class="ltg-count"><b>${cd.msg}</b></p>` : `<p class="ltg-count" role="timer">Faltan <b>${cd.d} ${cd.d === 1 ? 'día' : 'días'}</b> ${cd.label}</p>`;
    const six = ids.slice(0, 6);
    const gtag = six.length ? `<div class="ltg-gtag" aria-hidden="true"><div class="ltg-glogos">${six.map(p => logoHtml(ctx, p, 'ltb-logo')).join('')}</div><p>${ids.length > 6 ? `y ${ids.length - 6} más` : 'Para ver todo el año'}${ctx.minPrice ? `, desde <b>${ctx.esc(ctx.minPrice)}</b>` : ''}</p></div>` : '';
    const strip = ids.length ? `<div class="ltg-strip"><span>${ids.slice(0, 5).map(p => logoHtml(ctx, p, 'ltb-logo')).join('')}</span>${ids.length} ${ids.length === 1 ? 'plataforma' : 'plataformas'}</div>` : '';
    const html =
      (pm ? ctx.profileHeader() : `<div class="ltg-top">${header(ctx, d, wa)}</div>`) + promo(ctx) +
      `<section class="ltg-hero" data-lt-hero><div class="ltb-wrap"><div class="ltg-box">` +
      `<span class="ltg-rv" aria-hidden="true"></span><span class="ltg-rh" aria-hidden="true"></span>${GF_BOW('ltg-bow')}` +
      `<div class="ltg-txt"><span class="ltg-label">Edición Navidad</span>` +
      `<h1 class="ltb-h1"${ed(ctx, 'heroTitle')}>${ctx.esc(d.heroTitle || LC.DEFAULTS.heroTitle)}</h1><p class="ltb-sub"${ed(ctx, 'heroSubtitle')}>${ctx.esc(d.heroSubtitle || LC.DEFAULTS.heroSubtitle)}</p>` +
      cta + (plans.length && wa ? '<button type="button" class="ltg-more" data-goto="plans">Ver precios</button>' : '') + countTxt +
      `</div>${gtag}</div>${strip}</div></section>` +
      (plans.length ? gfSec('plans', 'Elige tu regalo', `<div class="ltg-grid">${plans.map((p, i) => gfPlanCard(ctx, p, i)).join('')}</div>`) : '') +
      (combos.length ? gfSec('combos', 'Combos para regalar', `<div class="ltg-crow">${combos.map((c, i) => gfComboCard(ctx, c, i)).join('')}</div>`) : '') +
      (d.reviews && d.reviews.length ? gfSec('reviews', 'Lo que dicen nuestros clientes', reviewsHtml(ctx, d, false)) : '') +
      (d.benefits.length ? gfSec('benefits', '¿Por qué elegirnos?', `<ul class="ltg-bens" data-rv>${d.benefits.map((b, i) => `<li>${luc('gift')}<span${ed(ctx, `benefits.${i}`)}>${ctx.esc(b)}</span></li>`).join('')}</ul>`) : '') +
      (d.paymentMethods.length ? gfSec('pays', 'Paga como quieras', `<ul class="ltb-pays" data-rv>${d.paymentMethods.map((p, i) => `<li${ed(ctx, `paymentMethods.${i}`)}>${ctx.esc(p)}</li>`).join('')}</ul>`) : '') +
      (d.faq.length ? gfSec('faq', 'Preguntas frecuentes', `<div class="ltb-faq">${d.faq.map((f, i) => `<details data-rv style="--i:${i}"><summary><span${ed(ctx, `faq.${i}.q`)}>${ctx.esc(f.q)}</span></summary><p${ed(ctx, `faq.${i}.a`)}>${ctx.esc(f.a)}</p></details>`).join('')}</div>`) : '') +
      (d.links.length ? gfSec('links', 'Síguenos', `<div class="ltb-links" data-rv>${d.links.map(l => `<a class="ltb-link" href="${ctx.esc(l.url)}" target="_blank" rel="noopener">${ctx.linkIcon(l.type)}<span>${ctx.esc(ctx.linkLabel(l))}</span></a>`).join('')}</div>`) : '') +
      footer(ctx, d, `${GF_BOW('ltg-fbow')}<p class="ltg-felices">Felices fiestas</p>`) + fab(ctx, wa);
    root.innerHTML = html;
    gfBurst(root, ctx, cl);
    motionKit(root, ctx, cl);
  }
  /** Respuesta al tocar un botón de compra (VIP): saltan tiritas de cinta desde el dedo. Solo transform/opacity. */
  function gfBurst(root, ctx, cl) {
    if (ctx.preview || ctx.reducedMotion || ctx.noMotion) return;
    const down = e => {
      const b = e.target && e.target.closest ? e.target.closest('.ltb-btn,.ltg-ctabar,.ltb-headcta') : null;
      if (!b || !root.contains(b) || b.classList.contains('is-off')) return;
      const layer = root.ownerDocument.createElement('div');
      layer.className = 'ltg-burst'; layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
      let h = '';
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + Math.random() * .4, dist = 40 + Math.random() * 50;
        h += `<i style="--x:${(Math.cos(a) * dist).toFixed(0)}px;--y:${(Math.sin(a) * dist - 24).toFixed(0)}px;--r:${(Math.random() * 540 - 270).toFixed(0)}deg"></i>`;
      }
      layer.innerHTML = h; root.appendChild(layer);
      G.setTimeout(() => layer.remove(), 850);
    };
    root.addEventListener('pointerdown', down, { passive: true });
    cl.push(() => root.removeEventListener('pointerdown', down));
  }

  LC.registerTemplate({
    id: 'navidad2', name: 'Navidad Regalo', description: 'Blanca y gris con cinta roja: tu página es una caja de regalo y cada plan, un regalito',
    seasonal: true, vipOnly: true, fallback: 'pop',
    tags: ['festiva', 'navidad', 'animada', 'clara'], preview: { bg: '#ECEDEF', fg: '#16181C', accent: '#E0242F' }, render: renderNavidad2
  });
  // =====================================================================
  // NAVIDAD PREMIUM (id navidad3) — basada en el diseño de referencia de Rafa:
  // cabecera roja con borde ondulado dorado, ramas de pino, tarjeta de perfil, regalo,
  // planes en tarjetas blancas con precio en píldora, combos rojos, pie rojo con onda dorada.
  // Imágenes propias (rama y regalo, webp con transparencia) junto a este archivo en js/img/.
  // =====================================================================
  const NV3_IMG = (() => {
    try { const s = G.document && G.document.currentScript && G.document.currentScript.src; if (s) return new URL('img/', s).href; } catch (_) {}
    return '/js/img/';
  })();
  const NV3_GOLD = 'linear-gradient(180deg,#fff1b8 0%,#f3c94f 45%,#c9901f 100%)';
  const NV3_ICO = {
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    zap: '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    gift: '<path d="M12 7v14"/><path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"/><rect x="3" y="7" width="18" height="4" rx="1"/>',
    card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'
  };
  const nv3i = (k, cls = 'ltz-ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NV3_ICO[k]}</svg>`;
  /** Onda con filo dorado (como la cinta del banner de referencia). top=true: la onda va arriba (pie). */
  const NV3_WAVE = (cls, top) => {
    const d = top ? 'M0 40C140 6 260 4 380 26S620 44 800 30 1060 0 1200 30V80H0Z' : 'M0 0H1200V40C1060 70 940 76 800 56S560 36 400 54 140 76 0 44Z';
    const edge = top ? 'M0 40C140 6 260 4 380 26S620 44 800 30 1060 0 1200 30' : 'M0 44C140 76 300 72 400 54S620 36 800 56 1060 70 1200 40';
    return `<svg class="${cls}" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ltzGd${top ? 't' : 'b'}" x1="0" x2="1"><stop offset="0" stop-color="#c9901f"/><stop offset=".3" stop-color="#f6d469"/><stop offset=".55" stop-color="#d9a52c"/><stop offset=".8" stop-color="#f6d469"/><stop offset="1" stop-color="#c9901f"/></linearGradient></defs>` +
      (top ? `<path d="${d}" fill="#b40d1c"/>` : `<path d="${d}" fill="#fff"/>`) +
      `<path d="${edge}" fill="none" stroke="url(#ltzGd${top ? 't' : 'b'})" stroke-width="7" vector-effect="non-scaling-stroke"/></svg>`;
  };
  /** Guirnalda de luces navideñas (cable ondulado con focos que titilan). viewBox 1200x60. */
  const NV3_LIGHTS = (cls) => {
    const cols = ['#ff3b4a', '#ffd34d', '#3fd17a', '#ffffff', '#ff8a3d'];
    const n = 22, b = [];
    for (let i = 0; i < n; i++) {
      const x = 20 + i * (1160 / (n - 1)), y = 14 + Math.sin(i / (n - 1) * Math.PI * 4) * 10 + 8, c = cols[i % cols.length];
      b.push(`<g class="ltz-bulb" style="--k:${i % 6};--c:${c}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((i % 2 ? 1 : -1) * 12)})"><circle class="ltz-glow" cx="0" cy="13" r="12" fill="${c}"/><rect x="-3.5" y="0" width="7" height="6" rx="1.5" fill="#3b3f46"/><ellipse cx="0" cy="13" rx="5.5" ry="8.5" fill="${c}"/><ellipse cx="-1.8" cy="10" rx="1.6" ry="3" fill="#fff" opacity=".7"/></g>`);
    }
    let w = 'M0 14'; for (let i = 0; i <= 24; i++) { const x = i * 50, y = 14 + Math.sin(i / 24 * Math.PI * 4) * 10 + 8; w += `L${x} ${y.toFixed(1)}`; }
    return `<svg class="${cls}" viewBox="0 0 1200 60" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><path d="${w}" fill="none" stroke="#2f3238" stroke-width="2"/>${b.join('')}</svg>`;
  };
  /** Destellos dorados de 4 puntas repartidos (x%, y%, tamaño px, retraso). */
  const NV3_SPARKS = list => `<div class="ltz-sparks" aria-hidden="true">${list.map(([x, y, z, k]) => `<i style="left:${x}%;top:${y}%;--z:${z}px;--k:${k}"></i>`).join('')}</div>`;
  /** Trineo con renos (silueta dorada) que cruza la cabecera de vez en cuando. viewBox 260x70. */
  const NV3_SLEIGH = `<svg class="ltz-sleigh" viewBox="0 0 260 70" aria-hidden="true"><g fill="#f6d469">` +
    `<path d="M14 30h44c6 0 9-5 10-11h4c-1 12-7 21-18 21H18c-6 0-8-5-4-10z"/><path d="M8 50h66c8 0 12-4 12-9" fill="none" stroke="#f6d469" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M26 44v6M58 44v6" stroke="#f6d469" stroke-width="3"/><circle cx="36" cy="16" r="6"/><path d="M28 30c0-8 4-12 8-12s8 4 8 12z"/><path d="M33 10l3-7 4 6z"/>` +
    [120, 175, 230].map(x => `<g transform="translate(${x} 0)"><ellipse cx="0" cy="34" rx="15" ry="7"/><path d="M10 31l8-12 5 2-6 12z"/><ellipse cx="22" cy="18" rx="6" ry="4"/><path d="M-10 39l-5 12M-4 40l-2 13M6 40l5 12M11 38l9 11" stroke="#f6d469" stroke-width="2.6" stroke-linecap="round"/><path d="M20 14l-3-9M20 10l-6-3M23 14l3-9M25 9l5-3" stroke="#f6d469" stroke-width="1.8" stroke-linecap="round" fill="none"/></g>`).join('') +
    `<path d="M70 28C90 26 100 30 106 32" stroke="#f6d469" stroke-width="1.4" fill="none"/></g>` +
    `<g class="ltz-trail" fill="#fff">${[[2, 34, 2.2], [-12, 30, 1.6], [-26, 36, 1.8], [-40, 31, 1.2], [-54, 35, 1.4]].map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}"/>`).join('')}</g></svg>`;
  /** Guirnalda de pino con esferas y moño entre secciones. viewBox 1200x90. */
  const NV3_SWAG = `<svg class="ltz-swag" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true">` +
    `<path d="M-10 8Q300 78 600 8Q900 78 1210 8" fill="none" stroke="#145a2e" stroke-width="22" stroke-linecap="round"/>` +
    `<path d="M-10 8Q300 78 600 8Q900 78 1210 8" fill="none" stroke="#1f7a3f" stroke-width="16" stroke-dasharray="2 5" stroke-linecap="round"/>` +
    `<path d="M-10 8Q300 78 600 8Q900 78 1210 8" fill="none" stroke="#3aa35d" stroke-width="9" stroke-dasharray="1 7" stroke-linecap="round"/></svg>`;
  const NV3_SWAGDECO = `<div class="ltz-swagd" aria-hidden="true"><i class="ltz-sb r" style="left:25%"></i><i class="ltz-sb g" style="left:75%"></i><i class="ltz-sb s" style="left:12%"></i><i class="ltz-sb s" style="left:88%"></i>` +
    `<svg class="ltz-sbow" viewBox="0 0 120 72"><defs><linearGradient id="ltzBw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5361"/><stop offset=".6" stop-color="#d4172a"/><stop offset="1" stop-color="#8f0915"/></linearGradient></defs><path d="M54 38 42 70l9-4 4 6 9-32zM66 38l12 32-9-4-4 6-9-32z" fill="#a50d1d"/><path d="M60 34C36 0 2 6 8 28c5 16 32 12 52 6Z" fill="url(#ltzBw)"/><path d="M60 34C84 0 118 6 112 28c-5 16-32 12-52 6Z" fill="url(#ltzBw)"/><rect x="50" y="24" width="20" height="20" rx="6" fill="#e2313b" stroke="#7d0714" stroke-width="1.4"/></svg></div>`;
  const NV3_HAT = '<svg class="ltz-hat" viewBox="0 0 40 34" aria-hidden="true"><path d="M5 26C8 12 18 4 30 6c-4 4-6 10-6 18z" fill="#d4172a"/><path d="M30 6c4 1 6 4 6 8" stroke="#d4172a" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="36" cy="16" r="4" fill="#fff"/><rect x="2" y="23" width="26" height="8" rx="4" fill="#fff"/></svg>';
  const NV3_FLAKE = '<svg viewBox="-12 -12 24 24"><path d="M0-11V11M-9.5-5.5L9.5 5.5M-9.5 5.5L9.5-5.5M0-7l-3-3M0-7l3-3M0 7l-3 3M0 7l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  /** Nieve suave sobre toda la página (copos SVG; posición, tamaño y ritmo fijos). */
  const NV3_PAGESNOW = (() => {
    let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    return `<div class="ltz-psnow" aria-hidden="true">${Array.from({ length: 16 }, (_, k) => { const sz = 10 + rnd() * 12, t = 12 + rnd() * 12; return `<i style="left:${((k + rnd()) / 16 * 100).toFixed(1)}%;--s:${sz.toFixed(0)}px;--t:${t.toFixed(1)}s;--d:${(-rnd() * t).toFixed(1)}s;--w:${(14 + rnd() * 30).toFixed(0)}px">${NV3_FLAKE}</i>`; }).join('')}</div>`;
  })();
  const nv3Head = (title, sub) => `<div class="ltz-hd" data-rv><h2 class="ltb-h2">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>`;
  function nv3Price(ctx, price, old, period, path, cls = 'ltz-pill') {
    const m = ctx.money(price), o = ctx.money(old);
    if (!m) return `<span class="${cls} is-ask"><strong${ed(ctx, path)}>Precio a consultar</strong></span>`;
    return `<span class="${cls}">${o ? `<s><span class="ltb-sr">Antes </span>${ctx.esc(o)}</s>` : ''}<strong${ed(ctx, path)}>${ctx.esc(m)}</strong>${period ? `<small>/ ${ctx.esc(period)}</small>` : ''}</span>`;
  }
  function nv3Plan(ctx, p, i) {
    const inf = ctx.platformInfo(p.platform);
    const desc = p.features.length ? p.features.map((f, k) => `<span${ed(ctx, `plans.${p.id}.features.${k}`)}>${ctx.esc(f)}</span>`).join('<i aria-hidden="true">·</i>') : `<span>${ctx.esc(ctx.typeLabel(p))}</span>`;
    const url = planBuy(ctx, p);
    return `<article class="ltz-plan" data-rv data-lt-card${itm(ctx, 'p', p.id)} style="--i:${i % 8}">` +
      `${p.badge ? `<span class="ltz-badge">${ctx.esc(p.badge)}</span>` : ''}` +
      `<div class="ltz-pl-a">${logoHtml(ctx, p.platform, 'ltb-logo', p.imageUrl, ctx.planTitle(p))}<h3${ed(ctx, `plans.${p.id}.title`)}>${ctx.esc(p.title || inf.name)}</h3></div>` +
      `<div class="ltz-pl-b"><p class="ltz-desc">${desc}</p><div class="ltz-buy">${nv3Price(ctx, p.price, p.oldPrice, p.period, `plans.${p.id}.price`)}` +
      `${url ? `<a class="ltz-go" data-lt-btn href="${ctx.esc(url)}" target="_blank" rel="noopener" aria-label="Pedir ${ctx.esc(p.title || inf.name)} por WhatsApp">${ctx.linkIcon('whatsapp')}<span>${ctx.money(p.price) ? 'Pedir' : 'Consultar'}</span></a>` : ''}</div></div></article>`;
  }
  function nv3Combo(ctx, c, i) {
    const names = c.platforms.map(x => ctx.platformInfo(x).name);
    const url = comboBuy(ctx, c);
    return `<article class="ltz-combo${c.imageUrl ? ' has-ph' : ''}" data-rv data-lt-card${itm(ctx, 'c', c.id)} style="--i:${i % 8}"><span class="ltz-cap" aria-hidden="true"></span><span class="ltz-csh" aria-hidden="true"></span>` +
      (c.imageUrl ? `<img class="ltz-cph" src="${ctx.esc(c.imageUrl)}" alt="" width="96" height="96" loading="lazy" decoding="async">` : `<span class="ltz-gift">${nv3i('gift')}</span>`) +
      `<div class="ltz-cm">${c.badge ? `<span class="ltz-cbadge">${ctx.esc(c.badge)}</span>` : ''}<h3${ed(ctx, `combos.${c.id}.name`)}>${ctx.esc(c.name)}</h3><p>${ctx.esc(names.join(' + '))}</p>` +
      `<div class="ltz-cbuy">${nv3Price(ctx, c.price, c.oldPrice, c.period, `combos.${c.id}.price`, 'ltz-pill ltz-gp')}` +
      `${url ? `<a class="ltz-cgo" data-lt-btn href="${ctx.esc(url)}" target="_blank" rel="noopener">${ctx.money(c.price) ? 'Pedir combo' : 'Consultar'}</a>` : ''}</div></div></article>`;
  }

  const CSS_NAVIDAD3 = `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Poppins:wght@400;500;600;700;800&family=Great+Vibes&display=swap');` + baseCss('navidad3') + `
.lt-navidad3{--z-red:#c8101f;--z-red2:#8f0915;--z-ink:#1c1d22;--z-mut:#5d6068;--z-line:#ececef;--z-bg:#f7f7f8;--z-green:#1f9d4b;--z-green2:#147a37;--z-sh:0 10px 28px rgba(40,10,14,.08);background:var(--z-bg);color:var(--z-ink);font-family:Poppins,"Segoe UI",system-ui,-apple-system,Roboto,sans-serif}
.lt-navidad3 .ltb-wrap{max-width:1060px}
/* banner rojo */
.lt-navidad3 .ltz-ban{position:relative;overflow:hidden;padding:44px 18px 92px;text-align:center;color:#fff;background:radial-gradient(ellipse 80% 90% at 50% 20%,#e01d2c 0%,#b40d1c 55%,#7d0712 100%)}
.lt-navidad3 .ltz-ban.has-cover{padding:20px 14px clamp(76px,9vw,104px)}
.lt-navidad3 .ltz-cov{position:relative;z-index:2;display:block;width:100%;max-width:920px;margin:0 auto;aspect-ratio:851/315;border-radius:18px;overflow:hidden;background:#7d0712;box-shadow:0 0 0 3px rgba(246,212,105,.85),0 18px 36px rgba(40,0,6,.45)}
.lt-navidad3 .ltz-cov img{width:100%;height:100%;object-fit:cover}
.lt-navidad3 .ltz-ban.has-cover .ltz-rama{width:clamp(120px,20vw,230px);top:-30px}
.lt-navidad3 .ltz-ban.has-cover .ltz-rama.l{left:-40px}.lt-navidad3 .ltz-ban.has-cover .ltz-rama.r{right:-40px}
.lt-navidad3 .ltz-ban.has-cover .ltz-ball{display:none}
@media (max-width:640px){.lt-navidad3 .ltz-ban.has-cover{padding:12px 10px 64px}.lt-navidad3 .ltz-cov{border-radius:14px}.lt-navidad3 .ltz-ban.has-cover .ltz-rama{width:110px;top:-26px}.lt-navidad3 .ltz-ban.has-cover .ltz-rama.l{left:-34px}.lt-navidad3 .ltz-ban.has-cover .ltz-rama.r{right:-34px}}
.lt-navidad3:not(.lt-static) .ltz-cov{animation:ltz-in .8s .05s cubic-bezier(.16,1,.3,1) both}
.lt-navidad3 .ltz-wave{position:absolute;left:0;right:0;bottom:-1px;width:100%;height:clamp(46px,7vw,80px);z-index:3}
.lt-navidad3 .ltz-ban-in{position:relative;z-index:4;max-width:640px;margin:0 auto}
.lt-navidad3 .ltz-t1{margin:0;font-family:Cinzel,Georgia,serif;font-weight:900;font-size:clamp(40px,10vw,74px);line-height:1;letter-spacing:.02em;text-shadow:0 4px 18px rgba(60,0,6,.45)}
.lt-navidad3 .ltz-t2{display:inline-block;margin:10px 0 14px;padding:6px 22px 8px;border-radius:999px;background:${NV3_GOLD};color:#7a0a12;font-family:Cinzel,Georgia,serif;font-weight:900;font-size:clamp(18px,4.6vw,32px);line-height:1.1;letter-spacing:.03em;box-shadow:0 6px 16px rgba(60,0,6,.35),inset 0 1px 0 rgba(255,255,255,.7)}
.lt-navidad3 .ltz-t3{margin:0 auto;max-width:34ch;font-size:clamp(15px,3.8vw,18px);line-height:1.45;color:#ffe3e5}
.lt-navidad3 .ltz-orn{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:14px;color:#f3c94f}
.lt-navidad3 .ltz-orn i{width:46px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#f3c94f)}
.lt-navidad3 .ltz-orn i:last-child{background:linear-gradient(90deg,#f3c94f,transparent)}
.lt-navidad3 .ltz-orn .ltz-ic{width:16px;height:16px;fill:currentColor;stroke:none}
.lt-navidad3 .ltz-rama{position:absolute;z-index:2;width:clamp(150px,28vw,300px);height:auto;pointer-events:none;filter:drop-shadow(0 8px 10px rgba(40,0,6,.35))}
.lt-navidad3 .ltz-rama.l{left:-6%;top:-22px;transform:scaleX(-1) rotate(8deg)}
.lt-navidad3 .ltz-rama.r{right:-6%;top:-22px;transform:rotate(8deg)}
.lt-navidad3 .ltz-ball{position:absolute;z-index:3;top:0;width:2px;background:rgba(255,230,170,.7);transform-origin:50% 0}
.lt-navidad3 .ltz-ball::after{content:"";position:absolute;left:50%;bottom:-26px;width:30px;height:30px;margin-left:-15px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#fff 0,var(--c1) 22%,var(--c2) 70%,#3d0206)}
.lt-navidad3 .ltz-ball.a{left:15%;height:96px;--c1:#ff5361;--c2:#a50b17}
.lt-navidad3 .ltz-ball.b{right:14%;height:70px;--c1:#ffe08a;--c2:#b97f12}
.lt-navidad3 .ltz-ball.c{right:24%;height:44px;--c1:#ffffff;--c2:#9aa3b1}
.lt-navidad3 .ltz-ball.c::after{width:22px;height:22px;margin-left:-11px;bottom:-19px}
.lt-navidad3 .ltz-ban.has-cover .ltz-ball{display:block}
.lt-navidad3 .ltz-ban.has-cover .ltz-ball.a{left:5%}.lt-navidad3 .ltz-ban.has-cover .ltz-ball.b{right:4%}.lt-navidad3 .ltz-ban.has-cover .ltz-ball.c{display:none}
@media (max-width:1100px){.lt-navidad3 .ltz-ban.has-cover .ltz-ball{display:none}}
/* luces */
.lt-navidad3 .ltz-lights{position:absolute;left:0;right:0;top:-4px;width:100%;height:clamp(40px,5vw,60px);z-index:5;pointer-events:none;overflow:visible}
.lt-navidad3 .ltz-glow{opacity:.35;filter:blur(5px)}
.lt-navidad3 .ltz-ban{padding-top:62px}
.lt-navidad3 .ltz-ban.has-cover{padding-top:50px}
@media (max-width:640px){.lt-navidad3 .ltz-ban{padding-top:52px}.lt-navidad3 .ltz-ban.has-cover{padding-top:40px}}
/* destellos */
.lt-navidad3 .ltz-sparks{position:absolute;inset:0;z-index:3;pointer-events:none}
.lt-navidad3 .ltz-sparks i{position:absolute;width:var(--z);height:var(--z);background:#ffe08a;clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);filter:drop-shadow(0 0 4px rgba(255,224,138,.9));opacity:.85}
.lt-navidad3 .ltz-main .ltz-sparks i{background:#e6b53a;filter:none;opacity:.7}
/* portada: brillo que la cruza una vez */
.lt-navidad3 .ltz-shine{position:absolute;z-index:2;top:0;bottom:0;left:-40%;width:30%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-18deg);pointer-events:none;opacity:0}
/* combos: nieve acumulada + brillo */
.lt-navidad3 .ltz-cap{position:absolute;left:0;right:0;top:0;height:12px;z-index:1;background:radial-gradient(circle at 10px 0,#fff 9px,transparent 9.5px) 0 0/22px 12px repeat-x,radial-gradient(circle at 5px 0,#fff 6px,transparent 6.5px) 9px 0/29px 9px repeat-x;opacity:.95;pointer-events:none}
.lt-navidad3 .ltz-combo{padding-top:24px}
.lt-navidad3 .ltz-csh{position:absolute;z-index:0;top:0;bottom:0;left:-60%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.22),transparent);transform:skewX(-18deg);pointer-events:none}
/* pie */
.lt-navidad3 .ltz-foot{overflow:visible}
.lt-navidad3 .ltz-fsw{position:absolute!important;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.lt-navidad3 .ltz-fsnow{opacity:.45}
.lt-navidad3 .ltz-frama{position:absolute;bottom:0;width:clamp(120px,18vw,220px);height:auto;pointer-events:none;opacity:.95}
.lt-navidad3 .ltz-frama.l{left:-30px;transform:scaleX(-1) rotate(-14deg)}
.lt-navidad3 .ltz-frama.r{right:-30px;transform:rotate(-14deg)}
@media (max-width:640px){.lt-navidad3 .ltz-frama{width:110px}.lt-navidad3 .ltz-frama.l{left:-40px}.lt-navidad3 .ltz-frama.r{right:-40px}}
/* aro del logo */
.lt-navidad3 .ltz-av{position:relative;background:none;isolation:isolate}
.lt-navidad3 .ltz-av::before{content:"";position:absolute;inset:0;border-radius:50%;z-index:-1;background:conic-gradient(#c9901f,#fff1b8,#f3c94f,#c9901f,#fff1b8,#c9901f)}
@media (max-width:640px){.lt-navidad3 .ltz-ball{display:none}.lt-navidad3 .ltz-rama.l{left:-22%}.lt-navidad3 .ltz-rama.r{right:-22%}.lt-navidad3 .ltz-ban{padding-top:38px}}
.lt-navidad3 .ltz-snow.ltz-snow2{background-image:radial-gradient(4px 4px at 60px 80px,rgba(255,255,255,.9) 50%,transparent 56%),radial-gradient(3.4px 3.4px at 220px 200px,rgba(255,255,255,.8) 50%,transparent 56%);background-size:300px 300px;top:-300px;opacity:.6}
.lt-navidad3 .ltz-snow{position:absolute;left:0;right:0;top:-260px;bottom:0;z-index:1;pointer-events:none;background-image:radial-gradient(2.2px 2.2px at 20px 30px,#fff 50%,transparent 55%),radial-gradient(1.8px 1.8px at 110px 140px,rgba(255,255,255,.85) 50%,transparent 55%),radial-gradient(2.6px 2.6px at 180px 70px,rgba(255,255,255,.8) 50%,transparent 55%),radial-gradient(1.6px 1.6px at 70px 210px,#fff 50%,transparent 55%);background-size:240px 260px;opacity:.75}
/* tarjeta de perfil */
.lt-navidad3 .ltz-prof{position:relative;z-index:5;display:flex;align-items:center;gap:16px;margin:-58px auto 0;max-width:1000px;padding:16px 18px;background:#fff;border-radius:22px;box-shadow:0 18px 40px rgba(60,10,16,.14)}
.lt-navidad3 .ltz-av{flex:none;width:clamp(76px,16vw,112px);aspect-ratio:1;border-radius:50%;padding:4px;background:${NV3_GOLD};margin-top:-46px;box-shadow:0 10px 22px rgba(60,10,16,.25)}
.lt-navidad3 .ltz-av>*{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;object-fit:cover;background:var(--z-red);color:#fff;font-weight:800;font-size:clamp(30px,6vw,44px);border:3px solid #fff}
.lt-navidad3 .ltz-pi{flex:1;min-width:0;padding-left:16px;border-left:2px solid var(--z-red)}
.lt-navidad3 .ltz-pi b{display:block;font-size:clamp(20px,4.6vw,30px);font-weight:800;line-height:1.1;letter-spacing:-.02em;overflow-wrap:anywhere}
.lt-navidad3 .ltz-pi small{display:block;margin-top:3px;font-size:14px;color:var(--z-mut);overflow-wrap:anywhere}
.lt-navidad3 .ltz-wa{flex:none;display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:999px;background:linear-gradient(180deg,#26b45a,var(--z-green2));color:#fff;font-weight:700;font-size:15px;text-decoration:none;box-shadow:0 6px 14px rgba(20,122,55,.3)}
.lt-navidad3 .ltz-wa svg{width:22px;height:22px}
@media (max-width:700px){.lt-navidad3 .ltz-prof{flex-wrap:wrap;margin:-50px 14px 0;gap:12px}.lt-navidad3 .ltz-wa{width:100%;justify-content:center}.lt-navidad3 .ltz-pi{padding-left:12px}}
/* bloque principal */
.lt-navidad3 .ltz-main{position:relative;overflow:hidden;padding:44px 18px 40px;text-align:center}
.lt-navidad3 .ltz-gift{display:none}
.lt-navidad3 .ltz-regalo{position:absolute;left:-30px;top:30px;width:clamp(150px,22vw,250px);height:auto;pointer-events:none;filter:drop-shadow(0 14px 16px rgba(40,10,14,.18))}
.lt-navidad3 .ltz-rama2{position:absolute;right:-50px;top:60px;width:clamp(150px,22vw,250px);height:auto;pointer-events:none;transform:rotate(-12deg)}
@media (max-width:760px){.lt-navidad3 .ltz-regalo{position:relative;left:auto;top:auto;display:block;margin:0 auto 6px;width:170px}.lt-navidad3 .ltz-rama2{width:140px;right:-58px;top:6px}}
.lt-navidad3 .ltz-main .ltb-h1{position:relative;margin:0 auto 12px;max-width:16ch;font-size:clamp(30px,6.4vw,50px);line-height:1.08;font-weight:800;letter-spacing:-.03em;overflow-wrap:break-word}
.lt-navidad3 .ltz-main .ltb-sub{position:relative;margin:0 auto 24px;max-width:44ch;font-size:clamp(15px,3.8vw,18px);line-height:1.5;color:var(--z-mut)}
.lt-navidad3 .ltz-cta{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:60px;padding:14px 34px;border-radius:999px;background:linear-gradient(180deg,#27b85c,var(--z-green2));color:#fff;font-weight:700;font-size:clamp(17px,4.4vw,21px);text-decoration:none;box-shadow:0 6px 0 #0e5c29,0 14px 26px rgba(20,122,55,.3);transition:transform .2s cubic-bezier(.3,1.6,.5,1),box-shadow .2s}
.lt-navidad3 .ltz-cta svg{width:28px;height:28px;flex:none}
.lt-navidad3 .ltz-cta:active{transform:translateY(4px);box-shadow:0 2px 0 #0e5c29}
.lt-navidad3 .ltz-from{display:block;margin-top:14px;font-size:14px;color:var(--z-mut)}
.lt-navidad3 .ltz-from b{color:var(--z-red)}
/* títulos de sección */
.lt-navidad3 .ltb-sec{padding:34px 0}
.lt-navidad3 .ltz-hd{text-align:center;margin:0 0 22px}
.lt-navidad3 .ltb-h2{display:flex;align-items:center;justify-content:center;gap:16px;margin:0;font-size:clamp(22px,5vw,32px);font-weight:800;letter-spacing:-.02em;line-height:1.15}
.lt-navidad3 .ltb-h2::before,.lt-navidad3 .ltb-h2::after{content:"";flex:0 1 80px;min-width:22px;height:2px;border-radius:2px;background:var(--z-red)}
.lt-navidad3 .ltz-hd p{margin:6px 0 0;font-size:14.5px;color:var(--z-mut)}
/* planes */
.lt-navidad3 .ltz-plans{display:grid;gap:14px}
@media (min-width:760px){.lt-navidad3 .ltz-plans{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}
.lt-navidad3 .ltz-plan{position:relative;display:flex;align-items:center;gap:16px;padding:16px 18px;background:#fff;border-radius:18px;box-shadow:var(--z-sh);min-width:0}
.lt-navidad3 .ltz-pl-a{flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;width:96px;padding-right:16px;border-right:1px solid var(--z-line);text-align:center}
.lt-navidad3 .ltz-pl-a .ltb-logo{width:58px;height:58px;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,.12)}
.lt-navidad3 .ltz-pl-a h3{margin:0;font-size:14.5px;font-weight:700;line-height:1.2;overflow-wrap:anywhere}
.lt-navidad3 .ltz-pl-b{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px}
.lt-navidad3 .ltz-desc{margin:0;font-size:14px;line-height:1.4;color:var(--z-mut);overflow-wrap:anywhere}
.lt-navidad3 .ltz-desc i{font-style:normal;margin:0 6px;color:#c4c6cc}
.lt-navidad3 .ltz-buy{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.lt-navidad3 .ltz-pill{display:inline-flex;align-items:baseline;flex-wrap:wrap;gap:4px 6px;padding:6px 14px;border-radius:999px;background:#fde8ea;color:var(--z-red)}
.lt-navidad3 .ltz-pill strong{font-size:18px;font-weight:800;letter-spacing:-.01em}
.lt-navidad3 .ltz-pill small{font-size:12px;font-weight:600;opacity:.8}
.lt-navidad3 .ltz-pill s{font-size:12.5px;opacity:.6}
.lt-navidad3 .ltz-pill.is-ask strong{font-size:14px}
.lt-navidad3 .ltz-go{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:999px;background:var(--z-green);color:#fff;font-weight:700;font-size:14px;text-decoration:none;transition:transform .2s cubic-bezier(.3,1.6,.5,1)}
.lt-navidad3 .ltz-go svg{width:17px;height:17px}
.lt-navidad3 .ltz-go:active,.lt-navidad3 .ltz-cgo:active{transform:scale(.95)}
.lt-navidad3 .ltz-badge{position:absolute;top:-9px;right:16px;padding:3px 12px;border-radius:999px;background:var(--z-red);color:#fff;font-size:11.5px;font-weight:700;box-shadow:0 4px 10px rgba(200,16,31,.3)}
/* combos */
.lt-navidad3 .ltz-combos{display:grid;gap:14px}
@media (min-width:760px){.lt-navidad3 .ltz-combos{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}
.lt-navidad3 .ltz-combo{position:relative;display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:18px;color:#fff;background:linear-gradient(135deg,#e01d2c,#a90b18 60%,#7d0712);box-shadow:0 12px 26px rgba(140,8,20,.28);overflow:hidden}
.lt-navidad3 .ltz-combo::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 60% 80% at 100% 0,rgba(255,255,255,.14),transparent 60%);pointer-events:none}
.lt-navidad3 .ltz-combo .ltz-gift{display:grid;place-items:center;flex:none;width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,.12);color:#f6d469}
.lt-navidad3 .ltz-combo .ltz-gift .ltz-ic{width:38px;height:38px;stroke-width:1.8}
.lt-navidad3 .ltz-cph{flex:none;width:72px;height:72px;border-radius:14px;object-fit:cover;border:2px solid rgba(255,255,255,.6)}
.lt-navidad3 .ltz-cm{position:relative;flex:1;min-width:0}
.lt-navidad3 .ltz-cm h3{margin:0;font-size:20px;font-weight:800;line-height:1.15;overflow-wrap:anywhere}
.lt-navidad3 .ltz-cm p{margin:3px 0 10px;font-size:13.5px;color:#ffd6d9;overflow-wrap:anywhere}
.lt-navidad3 .ltz-cbadge{display:inline-block;margin-bottom:6px;padding:2px 10px;border-radius:999px;background:rgba(255,255,255,.18);font-size:11.5px;font-weight:700}
.lt-navidad3 .ltz-cbuy{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.lt-navidad3 .ltz-gp{background:${NV3_GOLD};color:#6d0710}
.lt-navidad3 .ltz-cgo{display:inline-flex;align-items:center;padding:8px 16px;border-radius:999px;background:#fff;color:var(--z-red);font-weight:700;font-size:14px;text-decoration:none;transition:transform .2s cubic-bezier(.3,1.6,.5,1)}
/* beneficios */
.lt-navidad3 .ltz-bens{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 14px}
@media (min-width:760px){.lt-navidad3 .ltz-bens{grid-template-columns:repeat(4,minmax(0,1fr));gap:0}.lt-navidad3 .ltz-bens li+li{border-left:1px solid var(--z-line)}}
.lt-navidad3 .ltz-bens li{display:flex;align-items:center;gap:12px;padding:4px 14px;font-size:15px;font-weight:500;line-height:1.3;overflow-wrap:anywhere}
.lt-navidad3 .ltz-bens .ltz-ic{flex:none;width:36px;height:36px;color:var(--z-red);stroke-width:1.8}
/* reseñas */
.lt-navidad3 .ltz-revs{display:grid;grid-auto-flow:column;grid-auto-columns:min(86%,330px);gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 14px;scrollbar-width:thin}
@media (min-width:860px){.lt-navidad3 .ltz-revs{grid-auto-flow:row;grid-template-columns:repeat(3,minmax(0,1fr));overflow:visible}}
.lt-navidad3 .ltz-rev{margin:0;scroll-snap-align:start;display:grid;grid-template-columns:auto 1fr;gap:4px 14px;align-items:start;padding:18px;background:#fff;border-radius:18px;box-shadow:var(--z-sh)}
.lt-navidad3 .ltz-rav{grid-row:span 3;display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#e01d2c,#8f0915);color:#fff;font-weight:800;font-size:20px}
.lt-navidad3 .ltz-rev b{font-size:15.5px;overflow-wrap:anywhere}
.lt-navidad3 .ltz-st{display:flex;gap:2px;color:#f2b51d}
.lt-navidad3 .ltz-st .ltz-ic{width:16px;height:16px;fill:currentColor;stroke:none}
.lt-navidad3 .ltz-st .off{color:#dcdde1}
.lt-navidad3 .ltz-rev p{margin:2px 0 0;font-size:14px;line-height:1.45;color:var(--z-mut);overflow-wrap:anywhere}
/* pagos + preguntas */
.lt-navidad3 .ltz-two{display:grid;gap:30px}
@media (min-width:860px){.lt-navidad3 .ltz-two{grid-template-columns:1fr 1fr;gap:0}.lt-navidad3 .ltz-two>*+*{border-left:1px solid #e3c9cc;padding-left:34px}.lt-navidad3 .ltz-two>:first-child{padding-right:34px}}
.lt-navidad3 .ltz-h3{display:flex;align-items:center;gap:10px;margin:0 0 4px;font-size:21px;font-weight:800}
.lt-navidad3 .ltz-h3 .ltz-ic{width:26px;height:26px;color:var(--z-red)}
.lt-navidad3 .ltz-two p.ltz-note{margin:0 0 14px;font-size:14px;color:var(--z-mut)}
.lt-navidad3 .ltz-pays{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:10px}
.lt-navidad3 .ltz-pays li{min-width:92px;padding:14px 16px;border-radius:14px;background:#fff;box-shadow:var(--z-sh);text-align:center;font-weight:700;font-size:14.5px;overflow-wrap:anywhere}
.lt-navidad3 .ltb-faq{gap:8px;max-width:none}
.lt-navidad3 .ltb-faq details{background:#fff;border-radius:12px;box-shadow:0 4px 12px rgba(40,10,14,.05)}
.lt-navidad3 .ltb-faq summary{padding:13px 44px 13px 16px;font-weight:500;font-size:15px}
.lt-navidad3 .ltb-faq summary::after{content:"";width:9px;height:9px;border-right:2px solid var(--z-ink);border-bottom:2px solid var(--z-ink);transform:translateY(-70%) rotate(45deg)}
.lt-navidad3 .ltb-faq details[open] summary::after{transform:translateY(-30%) rotate(-135deg)}
.lt-navidad3 .ltb-faq p{padding:0 16px 14px;font-size:14px;color:var(--z-mut)}
/* redes */
.lt-navidad3 .ltz-soc{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:14px 18px}
.lt-navidad3 .ltz-soc>b{font-size:16px}
.lt-navidad3 .ltz-soc div{display:flex;gap:10px}
.lt-navidad3 .ltz-soc a{display:grid;place-items:center;width:46px;height:46px;border-radius:12px;background:#fff;box-shadow:var(--z-sh);color:var(--z-red);transition:transform .2s cubic-bezier(.3,1.6,.5,1)}
.lt-navidad3 .ltz-soc a svg{width:24px;height:24px}
/* pie rojo con onda dorada */
.lt-navidad3 .ltz-foot{position:relative;margin-top:60px;padding:40px 18px 104px;text-align:center;color:#ffe3e5;background:linear-gradient(180deg,#b40d1c 0%,#930915 70%,#7d0712 100%)}
.lt-navidad3 .ltz-foot .ltz-fwave{position:absolute;left:0;right:0;top:-79px;width:100%;height:80px}
.lt-navidad3 .ltz-fl{position:relative;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px 22px;margin:0 0 10px}
.lt-navidad3 .ltz-fl b{font-size:clamp(22px,5vw,30px);font-weight:800;color:#fff;letter-spacing:-.02em;overflow-wrap:anywhere}
.lt-navidad3 .ltz-fl span{font-family:"Great Vibes",cursive;font-size:clamp(30px,7vw,40px);color:#f6d469;line-height:1}
@media (min-width:600px){.lt-navidad3 .ltz-fl span{padding-left:22px;border-left:1px solid rgba(255,255,255,.4)}}
.lt-navidad3 .ltz-foot p{position:relative;margin:4px auto;max-width:56ch;font-size:14px}
.lt-navidad3 .ltz-foot .ltb-made a{color:#fff;font-weight:600}
@media (max-width:560px){.lt-navidad3 .ltz-plan{gap:12px;padding:14px}.lt-navidad3 .ltz-pl-a{width:76px;padding-right:12px}.lt-navidad3 .ltz-pl-a .ltb-logo{width:50px;height:50px;border-radius:14px}.lt-navidad3 .ltz-pl-a h3{font-size:13px}.lt-navidad3 .ltz-buy{gap:8px}.lt-navidad3 .ltz-pill{padding:5px 11px}.lt-navidad3 .ltz-pill strong{font-size:16px}.lt-navidad3 .ltz-go{margin-left:auto;padding:8px 12px}.lt-navidad3 .ltz-bens{grid-template-columns:1fr;gap:14px}.lt-navidad3 .ltz-bens li{padding:0 4px}.lt-navidad3 .ltb-h2{font-size:22px;gap:12px}.lt-navidad3 .ltb-h2::before,.lt-navidad3 .ltb-h2::after{flex:0 0 26px}.lt-navidad3 .ltz-combo{align-items:flex-start;padding:16px}.lt-navidad3 .ltz-combo .ltz-gift{width:52px;height:52px}.lt-navidad3 .ltz-combo .ltz-gift .ltz-ic{width:30px;height:30px}}
/* oferta con cuenta regresiva */
.lt-navidad3 .lt-promo{margin:0 14px}
.lt-navidad3 .lt-promo-in{background:#1c1d22;color:#fff;border-radius:16px}
.lt-navidad3 .lt-promo-tag,.lt-navidad3 .lt-promo-btn{background:${NV3_GOLD};color:#6d0710}
/* movimiento (solo VIP) */
.lt-navidad3:not(.lt-static) .ltz-snow{animation:ltz-snow 16s linear infinite}
@keyframes ltz-snow{to{transform:translate3d(0,260px,0)}}
.lt-navidad3:not(.lt-static) .ltz-ball{animation:ltz-swing 3.6s ease-in-out infinite alternate}
.lt-navidad3:not(.lt-static) .ltz-ball.b{animation-duration:4.2s;animation-delay:-1.4s}
@keyframes ltz-swing{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}
.lt-navidad3:not(.lt-static) .ltz-t1{animation:ltz-in .8s .05s cubic-bezier(.16,1,.3,1) both}
.lt-navidad3:not(.lt-static) .ltz-t2{animation:ltz-pop .7s .3s cubic-bezier(.3,1.6,.5,1) both}
.lt-navidad3:not(.lt-static) .ltz-t3,.lt-navidad3:not(.lt-static) .ltz-orn{animation:ltz-in .7s .45s cubic-bezier(.16,1,.3,1) both}
.lt-navidad3:not(.lt-static) .ltz-regalo{animation:ltz-float 4.5s ease-in-out infinite alternate}
.lt-navidad3:not(.lt-static) .ltz-cta{animation:ltz-beat 2.6s 1.5s ease-in-out infinite}
@keyframes ltz-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes ltz-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@keyframes ltz-float{from{transform:translateY(0) rotate(-2deg)}to{transform:translateY(-10px) rotate(2deg)}}
@keyframes ltz-beat{0%,70%,100%{transform:scale(1)}80%{transform:scale(1.04)}90%{transform:scale(.99)}}
@media (hover:hover){.lt-navidad3:not(.lt-static) .ltz-plan{transition:transform .3s cubic-bezier(.3,1.6,.5,1),box-shadow .3s}.lt-navidad3:not(.lt-static) .ltz-plan:hover{transform:translateY(-4px);box-shadow:0 16px 34px rgba(40,10,14,.13)}.lt-navidad3:not(.lt-static) .ltz-soc a:hover{transform:translateY(-3px)}}
/* trineo */
.lt-navidad3 .ltz-sleigh{position:absolute;z-index:2;top:30%;left:0;width:clamp(150px,20vw,240px);height:auto;opacity:0;pointer-events:none;filter:drop-shadow(0 0 6px rgba(246,212,105,.6))}
.lt-navidad3 .ltz-trail circle{opacity:.8}
/* guirnaldas entre secciones */
.lt-navidad3 .ltz-hasswag{padding-top:104px}
.lt-navidad3 .ltz-swag{position:absolute;left:0;right:0;top:0;width:100%;height:70px;filter:drop-shadow(0 6px 6px rgba(20,60,30,.18))}
.lt-navidad3 .ltz-swagd{position:absolute;left:0;right:0;top:0;height:110px;pointer-events:none}
.lt-navidad3 .ltz-sb{position:absolute;top:42px;width:2px;height:16px;margin-left:-1px;background:#c9a24a;transform-origin:50% 0}
.lt-navidad3 .ltz-sb::after{content:"";position:absolute;left:50%;top:14px;width:24px;height:24px;margin-left:-12px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#fff 0,var(--c1) 22%,var(--c2) 72%,#2a0204)}
.lt-navidad3 .ltz-sb.r{--c1:#ff5361;--c2:#a50b17}.lt-navidad3 .ltz-sb.g{--c1:#ffe08a;--c2:#b97f12}
.lt-navidad3 .ltz-sb.s{top:31px;height:12px;--c1:#ffffff;--c2:#9aa3b1}.lt-navidad3 .ltz-sb.s::after{width:18px;height:18px;margin-left:-9px;top:12px}
.lt-navidad3 .ltz-sbow{position:absolute;left:50%;top:-14px;width:90px;height:54px;margin-left:-45px;filter:drop-shadow(0 4px 4px rgba(60,0,8,.3))}
@media (max-width:640px){.lt-navidad3 .ltz-swag{height:50px}.lt-navidad3 .ltz-hasswag{padding-top:84px}.lt-navidad3 .ltz-sb{top:28px}.lt-navidad3 .ltz-sb.s{display:none}.lt-navidad3 .ltz-sbow{width:70px;height:42px;margin-left:-35px;top:-10px}}
/* luces suaves del bloque principal */
.lt-navidad3 .ltz-bokeh{position:absolute;inset:0;pointer-events:none;z-index:0}
.lt-navidad3 .ltz-bokeh i{position:absolute;width:var(--z);height:var(--z);margin:calc(var(--z) / -2) 0 0 calc(var(--z) / -2);border-radius:50%;background:radial-gradient(circle,var(--c),transparent 68%);opacity:.18}
.lt-navidad3 .ltz-main>:is(h1,p,a,button,span,div.ltz-count){position:relative;z-index:1}
/* nieve sobre el botón principal */
.lt-navidad3 .ltz-cta{overflow:hidden}
.lt-navidad3 .ltz-ccap{position:absolute;left:14px;right:14px;top:0;height:9px;background:radial-gradient(circle at 8px 0,#fff 7px,transparent 7.5px) 0 0/18px 9px repeat-x;opacity:.9;pointer-events:none}
/* cuenta regresiva */
.lt-navidad3 .ltz-count{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;margin:18px auto 0;font-size:14px;font-weight:600;color:var(--z-mut)}
.lt-navidad3 .ltz-count>span:not(.ltz-cl){display:grid;place-items:center;min-width:56px;padding:7px 6px 6px;border-radius:12px;background:#fff;box-shadow:0 6px 14px rgba(40,10,14,.08);border-top:3px solid var(--z-red)}
.lt-navidad3 .ltz-count b{font-size:22px;font-weight:800;color:var(--z-red);line-height:1}
.lt-navidad3 .ltz-count small{font-size:10.5px;color:var(--z-mut);margin-top:3px}
.lt-navidad3 .ltz-cmsg{font-family:"Great Vibes",cursive;font-size:38px;color:var(--z-red)}
/* gorro de Papá Noel en las reseñas */
.lt-navidad3 .ltz-rav{position:relative;overflow:visible}
.lt-navidad3 .ltz-hat{position:absolute;top:-17px;right:-10px;width:38px;height:32px;transform:rotate(18deg);filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))}
/* nieve sobre la página */
.lt-navidad3 .ltz-psnow{position:fixed;inset:0;z-index:30;pointer-events:none;overflow:hidden}
.lt-navidad3.ltb-preview .ltz-psnow{position:absolute}
.lt-navidad3 .ltz-psnow i{position:absolute;top:-30px;width:var(--s);height:var(--s);color:#fff;filter:drop-shadow(0 0 1px rgba(120,130,150,.9));opacity:.85}
.lt-navidad3 .ltz-psnow svg{display:block;width:100%;height:100%}
/* copos y estrellitas al tocar */
.ltz-burst{position:fixed;z-index:70;width:0;height:0;pointer-events:none}
.ltz-burst i{position:absolute;left:-7px;top:-7px;width:14px;height:14px;color:#fff;filter:drop-shadow(0 0 1px rgba(120,130,150,.9));animation:ltz-burst .85s cubic-bezier(.2,.7,.3,1) forwards}
.ltz-burst i.st{background:#f3c94f;clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);filter:none}
.ltz-burst svg{display:block;width:100%;height:100%}
@keyframes ltz-burst{0%{opacity:1;transform:translate(0,0) scale(.3) rotate(0)}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(1.1) rotate(var(--r))}}
/* ANIM extra (solo VIP) */
.lt-navidad3:not(.lt-static) .ltz-sleigh{animation:ltz-fly 16s 2.5s linear infinite}
@keyframes ltz-fly{0%{opacity:0;transform:translate(-30vw,30px) rotate(-6deg)}4%{opacity:1}36%{opacity:1;transform:translate(110vw,-20px) rotate(-10deg)}38%,100%{opacity:0;transform:translate(115vw,-24px) rotate(-10deg)}}
.lt-navidad3:not(.lt-static) .ltz-trail circle{animation:ltz-tr .6s ease-in-out infinite alternate}
.lt-navidad3:not(.lt-static) .ltz-trail circle:nth-child(2n){animation-delay:-.3s}
@keyframes ltz-tr{from{opacity:.2}to{opacity:1}}
.lt-navidad3:not(.lt-static) .ltz-sb{animation:ltz-swing 3.2s ease-in-out infinite alternate}
.lt-navidad3:not(.lt-static) .ltz-sb:nth-of-type(2n){animation-duration:3.8s;animation-delay:-1.2s}
.lt-navidad3:not(.lt-static) .ltz-bokeh i{animation:ltz-bk calc(7s + var(--k) * 1.3s) calc(var(--k) * -1.7s) ease-in-out infinite alternate}
@keyframes ltz-bk{from{opacity:.1;transform:translate(0,0) scale(.9)}to{opacity:.28;transform:translate(14px,-18px) scale(1.08)}}
.lt-navidad3:not(.lt-static) .ltz-regalo{animation:ltz-gin .9s .2s cubic-bezier(.3,1.6,.5,1) both,ltz-shake 6s 2s ease-in-out infinite}
@keyframes ltz-gin{from{opacity:0;transform:translateY(-40px) scale(.7) rotate(-8deg)}to{opacity:1;transform:none}}
@keyframes ltz-shake{0%,82%,100%{transform:rotate(0) translateY(0)}85%{transform:rotate(-5deg) translateY(-6px)}88%{transform:rotate(5deg) translateY(-8px)}91%{transform:rotate(-3deg) translateY(-4px)}94%{transform:rotate(2deg) translateY(0)}}
.lt-navidad3:not(.lt-static) .ltz-count b{animation:ltz-pop .5s .9s cubic-bezier(.3,1.6,.5,1) both}
.lt-navidad3:not(.lt-static) .ltz-hat{animation:ltz-hat 2.4s ease-in-out infinite alternate}
@keyframes ltz-hat{from{transform:rotate(14deg)}to{transform:rotate(24deg)}}
.lt-navidad3:not(.lt-static) .ltz-psnow i{animation:ltz-pfall var(--t) var(--d) linear infinite}
.lt-navidad3:not(.lt-static) .ltz-psnow svg{animation:ltz-psway calc(var(--t) / 3) var(--d) ease-in-out infinite alternate}
@keyframes ltz-pfall{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,110vh,0)}}
@keyframes ltz-psway{from{transform:translateX(calc(var(--w) * -.5)) rotate(-40deg)}to{transform:translateX(calc(var(--w) * .5)) rotate(40deg)}}
.lt-navidad3.ltb-preview:not(.lt-static) .ltz-psnow i{animation-name:ltz-pfallp}
@keyframes ltz-pfallp{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,900px,0)}}
.lt-navidad3:not(.lt-static) .ltz-snow2{animation:ltz-snow2 24s linear infinite}
@keyframes ltz-snow2{to{transform:translate3d(0,300px,0)}}
.lt-navidad3:not(.lt-static) .ltz-bulb{animation:ltz-bulb 1.8s calc(var(--k) * -.3s) ease-in-out infinite alternate}
.lt-navidad3:not(.lt-static) .ltz-bulb .ltz-glow{animation:ltz-glow 1.8s calc(var(--k) * -.3s) ease-in-out infinite alternate}
@keyframes ltz-bulb{from{opacity:.55}to{opacity:1}}
@keyframes ltz-glow{from{opacity:.1}to{opacity:.7}}
.lt-navidad3:not(.lt-static) .ltz-sparks i{animation:ltz-tw 2.6s calc(var(--k) * -.45s) ease-in-out infinite}
@keyframes ltz-tw{0%,100%{opacity:0;transform:scale(.2) rotate(0)}50%{opacity:1;transform:scale(1) rotate(45deg)}}
.lt-navidad3:not(.lt-static) .ltz-rama.l{animation:ltz-swl 5s ease-in-out infinite alternate;transform-origin:50% 0}
.lt-navidad3:not(.lt-static) .ltz-rama.r{animation:ltz-swr 5.6s ease-in-out infinite alternate;transform-origin:50% 0}
@keyframes ltz-swl{from{transform:scaleX(-1) rotate(8deg)}to{transform:scaleX(-1) rotate(3deg)}}
@keyframes ltz-swr{from{transform:rotate(8deg)}to{transform:rotate(3deg)}}
.lt-navidad3:not(.lt-static) .ltz-rama2{animation:ltz-sw2 6s ease-in-out infinite alternate;transform-origin:100% 50%}
@keyframes ltz-sw2{from{transform:rotate(-12deg)}to{transform:rotate(-6deg)}}
.lt-navidad3:not(.lt-static) .ltz-ball.c{animation-duration:3s;animation-delay:-.6s}
.lt-navidad3:not(.lt-static) .ltz-shine{animation:ltz-shine 1.4s .9s ease-in-out both}
@keyframes ltz-shine{0%{opacity:1;left:-40%}100%{opacity:1;left:130%}}
.lt-navidad3:not(.lt-static) .ltz-av::before{animation:ltz-spin 6s linear infinite}
@keyframes ltz-spin{to{transform:rotate(360deg)}}
.lt-navidad3:not(.lt-static) .ltz-gp,.lt-navidad3:not(.lt-static) .ltz-t2{background-size:100% 100%,200% 100%}
.lt-navidad3:not(.lt-static) .ltz-t2::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.6) 50%,transparent 70%) -150% 0/60% 100% no-repeat;animation:ltz-sweep 3.5s 1.2s ease-in-out infinite}
.lt-navidad3 .ltz-t2{position:relative;overflow:hidden}
@keyframes ltz-sweep{0%,60%{background-position:-150% 0}100%{background-position:250% 0}}
.lt-navidad3:not(.lt-static).ltb-rv .ltz-combo.is-in .ltz-csh{animation:ltz-csh 1.2s calc(var(--rvd,0ms) + .5s) ease-in-out both}
@keyframes ltz-csh{from{left:-60%}to{left:130%}}
.lt-navidad3:not(.lt-static).ltb-rv .ltz-combo.is-in .ltz-gift{animation:ltz-wig 1s calc(var(--rvd,0ms) + .7s) ease-in-out both}
@keyframes ltz-wig{0%,100%{transform:rotate(0)}20%{transform:rotate(-12deg) scale(1.08)}40%{transform:rotate(10deg)}60%{transform:rotate(-6deg)}80%{transform:rotate(3deg)}}
.lt-navidad3:not(.lt-static).ltb-rv .ltz-plan.is-in .ltz-pill{animation:ltz-pop .5s calc(var(--rvd,0ms) + .35s) cubic-bezier(.3,1.6,.5,1) both}
.lt-navidad3:not(.lt-static) .ltz-fsnow{animation:ltz-snow 18s linear infinite}
.lt-navidad3:not(.lt-static) .ltz-fl span{animation:ltz-glowtxt 2.8s ease-in-out infinite alternate}
@keyframes ltz-glowtxt{from{text-shadow:0 0 0 rgba(246,212,105,0)}to{text-shadow:0 0 14px rgba(246,212,105,.65)}}
${'.lt-navidad3'} .ltb-off :is(.ltz-sleigh,.ltz-sb,.ltz-bokeh i,.ltz-snow,.ltz-ball,.ltz-regalo,.ltz-cta,.ltz-bulb,.ltz-glow,.ltz-sparks i,.ltz-rama,.ltz-rama2),${'.lt-navidad3'} .ltb-off .ltz-t2::after{animation-play-state:paused!important}
`;

  function renderNavidad3(root, d, ctx) {
    LC.injectCss('navidad3', CSS_NAVIDAD3);
    const cl = setup(root, ctx, d, 'navidad3');
    const { plans, combos } = visible(d, ctx);
    const wa = d.whatsapp ? ctx.buy('tus planes') : '';
    const ini = ctx.esc((d.name.trim().charAt(0) || 'S').toUpperCase());
    const av = d.logoUrl ? `<img src="${ctx.esc(d.logoUrl)}" alt="" width="112" height="112" decoding="async">` : `<span aria-hidden="true">${ini}</span>`;
    // Con portada: la portada del cliente es la cabecera (enmarcada en rojo y dorado). Sin portada: "Tu Navidad en modo premium".
    const cover = d.coverUrl ? ' has-cover' : '';
    const stars = n => { const s = Math.min(5, Math.max(1, Math.round(Number(n)) || 5)); return `<span class="ltz-st" role="img" aria-label="${s} de 5 estrellas">${[1, 2, 3, 4, 5].map(k => nv3i('star', 'ltz-ic' + (k <= s ? '' : ' off'))).join('')}</span>`; };
    const benIco = ['shield', 'zap', 'tag', 'headphones'];
    const payFaq = (d.paymentMethods.length || d.faq.length) ? `<section class="ltb-sec ltb-sec-pays"><div class="ltb-wrap"><div class="ltz-two">` +
      (d.paymentMethods.length ? `<div data-rv><h2 class="ltz-h3">${nv3i('card')}Métodos de pago</h2><p class="ltz-note">Paga fácil y seguro desde donde estés.</p><ul class="ltz-pays">${d.paymentMethods.map((p, i) => `<li${ed(ctx, `paymentMethods.${i}`)}>${ctx.esc(p)}</li>`).join('')}</ul></div>` : '') +
      (d.faq.length ? `<div class="ltb-sec-faq" data-rv><h2 class="ltz-h3">${nv3i('help')}Preguntas frecuentes</h2><div class="ltb-faq">${d.faq.map((f, i) => `<details><summary><span${ed(ctx, `faq.${i}.q`)}>${ctx.esc(f.q)}</span></summary><p${ed(ctx, `faq.${i}.a`)}>${ctx.esc(f.a)}</p></details>`).join('')}</div></div>` : '') +
      `</div></div></section>` : '';
    const html =
      `<header class="ltz-ban${cover}" data-lt-hero><div class="ltz-snow" aria-hidden="true"></div><div class="ltz-snow ltz-snow2" aria-hidden="true"></div>${NV3_LIGHTS('ltz-lights')}` +
      NV3_SPARKS([[8, 38, 14, 0], [24, 70, 10, 1], [33, 22, 8, 2], [70, 30, 12, 3], [80, 66, 9, 4], [92, 42, 13, 5], [52, 80, 8, 2], [4, 74, 9, 4]]) +
      `<img class="ltz-rama l" src="${NV3_IMG}nv-rama.webp" alt="" width="460" height="310" decoding="async"><img class="ltz-rama r" src="${NV3_IMG}nv-rama.webp" alt="" width="460" height="310" decoding="async">` +
      `<span class="ltz-ball a" aria-hidden="true"></span><span class="ltz-ball b" aria-hidden="true"></span><span class="ltz-ball c" aria-hidden="true"></span>${NV3_SLEIGH}` +
      (d.coverUrl ? `<figure class="ltz-cov"><span class="ltz-shine" aria-hidden="true"></span><img src="${ctx.esc(d.coverUrl)}" alt="Portada de ${ctx.esc(d.name)}" width="851" height="315" decoding="async" fetchpriority="high"></figure>` :
      `<div class="ltz-ban-in"><p class="ltz-t1">Tu Navidad</p><p class="ltz-t2">en modo premium</p><p class="ltz-t3">Este diciembre disfruta de todas tus películas y series desde casa.</p><div class="ltz-orn" aria-hidden="true"><i></i>${nv3i('star')}<i></i></div></div>`) +
      `${NV3_WAVE('ltz-wave', false)}</header>` +
      `<div class="ltz-prof"><span class="ltz-av">${av}</span><div class="ltz-pi"><b${ed(ctx, 'name')}>${ctx.esc(d.name)}</b>${d.tagline ? `<small${ed(ctx, 'tagline')}>${ctx.esc(d.tagline)}</small>` : ''}</div>` +
      `${wa ? `<a class="ltz-wa" data-lt-btn href="${ctx.esc(wa)}" target="_blank" rel="noopener">${ctx.linkIcon('whatsapp')}<span>Atención por WhatsApp</span></a>` : ''}</div>` +
      promo(ctx) +
      `<section class="ltz-main"><div class="ltz-bokeh" aria-hidden="true">${[[8, 20, 140, '#ff4d5e'], [86, 14, 180, '#f6d469'], [70, 78, 120, '#ff4d5e'], [20, 82, 160, '#f6d469'], [50, 40, 220, '#ffd0d4']].map(([x, y, z, c], k) => `<i style="left:${x}%;top:${y}%;--z:${z}px;--c:${c};--k:${k}"></i>`).join('')}</div>${NV3_SPARKS([[18, 12, 12, 1], [84, 70, 10, 3], [10, 78, 8, 5], [90, 18, 9, 0]])}<img class="ltz-regalo" src="${NV3_IMG}nv-regalo.webp" alt="" width="640" height="421" decoding="async"><img class="ltz-rama2" src="${NV3_IMG}nv-rama.webp" alt="" width="460" height="310" loading="lazy" decoding="async">` +
      `<h1 class="ltb-h1"${ed(ctx, 'heroTitle')}>${ctx.esc(d.heroTitle || LC.DEFAULTS.heroTitle)}</h1><p class="ltb-sub"${ed(ctx, 'heroSubtitle')}>${ctx.esc(d.heroSubtitle || LC.DEFAULTS.heroSubtitle)}</p>` +
      (wa ? `<a class="ltz-cta" data-lt-btn="main" href="${ctx.esc(wa)}" target="_blank" rel="noopener"><span class="ltz-ccap" aria-hidden="true"></span>${ctx.linkIcon('whatsapp')}<span${ed(ctx, 'ctaText')}>${ctx.esc(d.ctaText)}</span></a>` : `<button type="button" class="ltz-cta" data-goto="plans">Ver planes</button>`) +
      (ctx.minPrice ? `<span class="ltz-from">Planes desde <b>${ctx.esc(ctx.minPrice)}</b></span>` : '') + nv3Count() + `</section>` +
      (plans.length ? `<section class="ltb-sec ltb-sec-plans"><div class="ltb-wrap">${nv3Head('Elige tu plataforma favorita', 'Cuentas originales, estables y al mejor precio.')}<div class="ltz-plans">${plans.map((p, i) => nv3Plan(ctx, p, i)).join('')}</div></div></section>` : '') +
      (combos.length ? `<section class="ltb-sec ltb-sec-combos ltz-hasswag">${NV3_SWAG}${NV3_SWAGDECO}<div class="ltb-wrap">${nv3Head('Combos navideños')}<div class="ltz-combos">${combos.map((c, i) => nv3Combo(ctx, c, i)).join('')}</div></div></section>` : '') +
      (d.benefits.length ? `<section class="ltb-sec ltb-sec-benefits"><div class="ltb-wrap">${nv3Head(`¿Por qué elegir ${ctx.esc(d.name)}?`)}<ul class="ltz-bens" data-rv>${d.benefits.map((b, i) => `<li>${nv3i(benIco[i % 4])}<span${ed(ctx, `benefits.${i}`)}>${ctx.esc(b)}</span></li>`).join('')}</ul></div></section>` : '') +
      (d.reviews && d.reviews.length ? `<section class="ltb-sec ltb-sec-reviews ltz-hasswag">${NV3_SWAG}${NV3_SWAGDECO}<div class="ltb-wrap">${nv3Head('Lo que dicen nuestros clientes')}<div class="ltz-revs" data-rv>${d.reviews.map((r, i) => { const nm = r.name || 'Cliente'; return `<figure class="ltz-rev"><span class="ltz-rav" aria-hidden="true">${ctx.esc((nm.trim().charAt(0) || 'C').toUpperCase())}${NV3_HAT}</span><b${r.name ? ed(ctx, `reviews.${i}.name`) : ''}>${ctx.esc(nm)}</b>${stars(r.stars)}<p${ed(ctx, `reviews.${i}.text`)}>${ctx.esc(r.text)}</p></figure>`; }).join('')}</div></div></section>` : '') +
      payFaq +
      (d.links.length ? `<section class="ltb-sec ltb-sec-links"><div class="ltb-wrap"><div class="ltz-soc" data-rv><b>Síguenos en nuestras redes</b><div>${d.links.map(l => `<a href="${ctx.esc(l.url)}" target="_blank" rel="noopener" aria-label="${ctx.esc(ctx.linkLabel(l))}">${ctx.linkIcon(l.type)}</a>`).join('')}</div></div></div></section>` : '') +
      `<footer class="ltz-foot ltb-foot" data-lt-foot>${NV3_WAVE('ltz-fwave', true)}<div class="ltz-fsw" aria-hidden="true"><div class="ltz-snow ltz-fsnow"></div></div>${NV3_SPARKS([[12, 30, 12, 0], [30, 70, 9, 2], [68, 22, 11, 4], [88, 60, 10, 1], [50, 12, 8, 3]])}<img class="ltz-frama l" src="${NV3_IMG}nv-rama.webp" alt="" width="460" height="310" loading="lazy" decoding="async"><img class="ltz-frama r" src="${NV3_IMG}nv-rama.webp" alt="" width="460" height="310" loading="lazy" decoding="async"><div class="ltz-fl"><b>${ctx.esc(d.name)}</b><span>¡Feliz Navidad!</span></div><p>Gracias por confiar en nosotros. Que esta Navidad esté llena de buenas historias y el mejor entretenimiento.</p><p>© ${new Date().getFullYear()} ${ctx.esc(d.name)}</p>${ctx.showBrand === false ? '' : '<p class="ltb-made">Hecho con <a href="https://disenosstreaming.com" target="_blank" rel="noopener">Diseños Streaming</a></p>'}</footer>` +
      fab(ctx, wa) + (ctx.noMotion || ctx.reducedMotion ? '' : NV3_PAGESNOW);
    root.innerHTML = html;
    const cbox = root.querySelector('.ltz-count');
    if (cbox) { const t = G.setInterval(() => { const c = nvCountdown(new Date()); if (!c.hide && !c.msg) cbox.querySelectorAll('[data-u]').forEach(e => { const v = e.dataset.u === 'd' ? c.d : e.dataset.u === 'h' ? c.h : c.mi; e.textContent = String(v).padStart(2, '0'); }); }, 30000); cl.push(() => G.clearInterval(t)); }
    nv3Burst(root, ctx, cl);
    motionKit(root, ctx, cl);
  }
  /** Cuenta regresiva para Navidad / Año Nuevo (se oculta fuera de temporada). */
  function nv3Count() {
    const c = nvCountdown(new Date());
    if (c.hide) return '';
    if (c.msg) return `<p class="ltz-count ltz-cmsg">${c.msg}</p>`;
    const b = (u, v, l) => `<span><b data-u="${u}">${String(v).padStart(2, '0')}</b><small>${l}</small></span>`;
    return `<div class="ltz-count" role="timer" aria-live="off"><span class="ltz-cl">Faltan</span>${b('d', c.d, c.d === 1 ? 'día' : 'días')}${b('h', c.h, 'horas')}${b('m', c.mi, 'min')}<span class="ltz-cl">${c.label}</span></div>`;
  }
  /** Al tocar un botón (VIP): copos y estrellitas doradas salen del dedo. Solo transform/opacity. */
  function nv3Burst(root, ctx, cl) {
    if (ctx.preview || ctx.reducedMotion || ctx.noMotion) return;
    const down = e => {
      const b = e.target && e.target.closest ? e.target.closest('[data-lt-btn],.ltb-btn') : null;
      if (!b || !root.contains(b)) return;
      const layer = root.ownerDocument.createElement('div');
      layer.className = 'ltz-burst'; layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
      let h = '';
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + Math.random() * .4, dist = 44 + Math.random() * 48;
        h += `<i class="${k % 2 ? 'st' : 'fl'}" style="--x:${(Math.cos(a) * dist).toFixed(0)}px;--y:${(Math.sin(a) * dist - 22).toFixed(0)}px;--r:${(Math.random() * 360).toFixed(0)}deg">${k % 2 ? '' : NV3_FLAKE}</i>`;
      }
      layer.innerHTML = h; root.appendChild(layer);
      G.setTimeout(() => layer.remove(), 900);
    };
    root.addEventListener('pointerdown', down, { passive: true });
    cl.push(() => root.removeEventListener('pointerdown', down));
  }

  LC.registerTemplate({
    id: 'navidad3', name: 'Navidad Premium', description: 'Cabecera roja con onda dorada, ramas de pino y regalo; planes en tarjetas blancas y combos rojos',
    seasonal: true, vipOnly: true, fallback: 'pop',
    tags: ['festiva', 'navidad', 'animada'], preview: { bg: '#c8101f', fg: '#ffffff', accent: '#f3c94f' }, render: renderNavidad3
  });
})(typeof window !== 'undefined' ? window : globalThis);
