/* Diseños Streaming · Plantilla de landing "Azul Eléctrico" (azul): oscura con azul eléctrico, foto con brillo, ventajas en órbita
 * y nombre gigante cromado. Requiere js/landing-core.js (window.LandingCore). Sin dependencias.
 * CSS prefijado con .lt-azul; clases internas ltb- (comunes) y lta- (azul).
 */
(function (G) {
  'use strict';
  const LC = G.LandingCore;
  if (!LC) { if (G.console) G.console.warn('landing-templates-g: falta LandingCore'); return; }

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
  // AZUL ELÉCTRICO — oscuro con azul eléctrico: portada con texto a la izquierda y foto con brillo azul a la derecha,
  // anillos en órbita con las ventajas alrededor de una imagen central, carrusel de opiniones inclinado
  // y un título gigante cromado con el nombre de la tienda sobre una imagen de público.
  // Espacios para imágenes (PNG/webp en js/img/). Vacíos = cuadro con X para reemplazar.
  // =====================================================================
  const AZ_IMG = (() => {
    try { const s = G.document && G.document.currentScript && G.document.currentScript.src; if (s) return new URL('img/', s).href; } catch (_) {}
    return '/js/img/';
  })();
  const AZ_ART = {
    hero: 'sp-hero.webp',    // Spiderman con audífonos (portada)
    center: '',              // (sección de órbita retirada)
    crowd: 'sp-adv2.webp'    // Spiderman detrás del nombre gigante
  };
  const AZ_I = {
    play: '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" stroke="none"/>',
    zap: '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    tap: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" opacity=".45"/>'
  };
  const azi = (k, cls = 'lta-ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${AZ_I[k]}</svg>`;
  const azSpider = (cls = '') => `<svg class="lta-spider ${cls}" viewBox="0 0 200 240" fill="none" aria-hidden="true"><g stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M88 86 54 54 30 28"/><path d="M85 101 46 90 16 80"/><path d="M85 116 46 120 16 128"/><path d="M88 130 54 152 34 176"/><path d="M112 86 146 54 170 28"/><path d="M115 101 154 90 184 80"/><path d="M115 116 154 120 184 128"/><path d="M112 130 146 152 166 176"/></g><ellipse cx="100" cy="92" rx="13" ry="17" fill="#fff"/><path d="M88 106c0 34 6 64 12 78 6-14 12-44 12-78 0-8-24-8-24 0z" fill="#fff"/></svg>`;
  /** Resalta en caja azul las palabras del medio del título (como "logrando ingresos que" de la referencia). */
  function azMark(ctx, text) {
    const w = String(text || '').trim().split(/\s+/);
    if (w.length < 4) return `<span class="lta-mk"><span>${ctx.esc(w.join(' '))}</span></span>`;
    const b = w.length, a = Math.max(1, b - 3);
    return `${ctx.esc(w.slice(0, a).join(' '))} <span class="lta-mk"><span>${ctx.esc(w.slice(a, b).join(' '))}</span></span>${b < w.length ? ' ' + ctx.esc(w.slice(b).join(' ')) : ''}`;
  }
  const azArt = (key, cls, label, alt = '') => AZ_ART[key]
    ? `<img class="lta-art ${cls}" src="${AZ_IMG}${AZ_ART[key]}" alt="${alt}" decoding="async" loading="${key === 'hero' ? 'eager' : 'lazy'}">`
    : `<div class="lta-slot ${cls}" role="img" aria-label="${label}"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0L100 100M100 0L0 100" stroke="currentColor" stroke-width=".6" vector-effect="non-scaling-stroke"/></svg><span>${label}</span></div>`;
  function azPrice(ctx, price, old, period, path) {
    const m = ctx.money(price), o = ctx.money(old);
    if (!m) return `<div class="lta-price is-ask"><strong${ed(ctx, path)}>Precio a consultar</strong></div>`;
    return `<div class="lta-price">${o ? `<s><span class="ltb-sr">Antes </span>${ctx.esc(o)}</s>` : ''}<strong${ed(ctx, path)}>${ctx.esc(m)}</strong>${period ? `<small>/ ${ctx.esc(period)}</small>` : ''}</div>`;
  }
  function azPlan(ctx, p, i) {
    const inf = ctx.platformInfo(p.platform), url = planBuy(ctx, p);
    const feats = p.features.length ? `<ul class="lta-feats">${p.features.map((f, k) => `<li>${azi('check')}<span${ed(ctx, `plans.${p.id}.features.${k}`)}>${ctx.esc(f)}</span></li>`).join('')}</ul>` : '';
    return `<article class="ltb-card lta-card" data-rv data-lt-card${itm(ctx, 'p', p.id)} style="--i:${i % 8}">` +
      `${p.badge ? `<span class="lta-tag">${ctx.esc(p.badge)}</span>` : ''}` +
      `<div class="lta-ctop">${logoHtml(ctx, p.platform, 'ltb-logo', p.imageUrl, ctx.planTitle(p))}<div><h3 class="ltb-title"${ed(ctx, `plans.${p.id}.title`)}>${ctx.esc(p.title || inf.name)}</h3><span class="lta-sub">${ctx.esc(ctx.typeLabel(p))}</span></div></div>` +
      `${feats}<div class="lta-cbot">${azPrice(ctx, p.price, p.oldPrice, p.period, `plans.${p.id}.price`)}` +
      `${url ? `<a class="lta-btn lta-sm" data-lt-btn href="${ctx.esc(url)}" target="_blank" rel="noopener">${ctx.linkIcon('whatsapp')}<span>${ctx.money(p.price) ? 'Lo quiero' : 'Consultar'}</span></a>` : ''}</div></article>`;
  }
  function azCombo(ctx, c, i) {
    const url = comboBuy(ctx, c), names = c.platforms.map(x => ctx.platformInfo(x).name);
    return `<article class="ltb-card lta-card lta-combo" data-rv data-lt-card${itm(ctx, 'c', c.id)} style="--i:${i % 8}">` +
      `${c.badge ? `<span class="lta-tag">${ctx.esc(c.badge)}</span>` : ''}` +
      (c.imageUrl ? comboPhoto(ctx, c) : `<div class="lta-clogos">${c.platforms.map(x => logoHtml(ctx, x, 'ltb-logo')).join('')}</div>`) +
      `<h3 class="ltb-title"${ed(ctx, `combos.${c.id}.name`)}>${ctx.esc(c.name)}</h3><p class="lta-incl">${ctx.esc(names.join(' + '))}</p>` +
      `${azPrice(ctx, c.price, c.oldPrice, c.period, `combos.${c.id}.price`)}` +
      `${url ? `<a class="lta-btn" data-lt-btn href="${ctx.esc(url)}" target="_blank" rel="noopener">${ctx.linkIcon('whatsapp')}<span>${ctx.money(c.price) ? 'Quiero este combo' : 'Consultar precio'}</span></a>` : ''}</article>`;
  }
  const azHead = (html, sub, cls = '') => `<div class="lta-hd ${cls}" data-rv><h2 class="ltb-h2">${html}</h2>${sub ? `<p>${sub}</p>` : ''}</div>`;
  const azStripes = (cls = '') => `<span class="lta-str ${cls}" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;

  const CSS_AZUL = `@import url('https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@400;500;600;700;800;900&family=Unbounded:wght@600;800;900&display=swap');` + baseCss('azul') + `
.lt-azul{--a-bg:#02030c;--a-bg2:#050a26;--a-navy:#0a1250;--a-blue:#2340ff;--a-blue2:#3d5bff;--a-glow:#4d6bff;--a-ice:#9fb2ff;--a-tx:#f2f5ff;--a-mut:#a9b3d9;--a-line:rgba(110,135,255,.28);--a-red:#ff2b3d;--a-red2:#d20f22;--a-redglow:rgba(255,43,61,.55);background:var(--a-bg);color:var(--a-tx);font-family:Montserrat,"Segoe UI",system-ui,-apple-system,Roboto,sans-serif}
.lt-azul .ltb-wrap{max-width:1080px}
.lt-azul .ltb-h1,.lt-azul .ltb-h2,.lt-azul h3{font-weight:800;letter-spacing:-.02em}
.lt-azul .lta-ic{width:18px;height:18px;flex:none}
.lt-azul .lta-wide{font-family:Unbounded,Montserrat,sans-serif;letter-spacing:-.01em}
/* resaltado en caja azul */
.lt-azul .lta-mk{position:relative;display:inline;padding:0 .18em;-webkit-box-decoration-break:clone;box-decoration-break:clone;background:linear-gradient(90deg,var(--a-blue),#4b63ff);border-radius:.14em;box-shadow:0 0 22px rgba(35,64,255,.45)}
.lt-azul .lta-mk>span{position:relative}
/* rayas inclinadas //// */
.lt-azul .lta-str{display:inline-flex;gap:5px;transform:skewX(-28deg)}
.lt-azul .lta-str i{width:12px;height:12px;background:var(--a-red);opacity:.95}
.lt-azul .lta-str i:nth-child(2){opacity:.7}.lt-azul .lta-str i:nth-child(3){opacity:.5}.lt-azul .lta-str i:nth-child(4){opacity:.3}
/* botón principal */
.lt-azul .lta-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:54px;padding:14px 30px;border-radius:12px;border:0;background:linear-gradient(180deg,#ff3446,#d40f22);color:#fff;font-weight:800;font-size:16px;text-decoration:none;cursor:pointer;overflow:hidden;isolation:isolate;box-shadow:0 0 0 1px rgba(255,180,190,.4) inset,0 12px 30px var(--a-redglow),0 0 44px rgba(255,43,61,.35);transition:transform .25s cubic-bezier(.3,1.5,.5,1),box-shadow .25s}
.lt-azul .lta-btn svg{width:20px;height:20px;flex:none;position:relative;z-index:1}
.lt-azul .lta-btn span{position:relative;z-index:1}
.lt-azul .lta-btn::after{content:"";position:absolute;top:0;bottom:0;left:-70%;width:45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent);transform:skewX(-22deg);z-index:0}
@media (hover:hover){.lt-azul .lta-btn:hover{transform:translateY(-2px);box-shadow:0 0 0 1px rgba(255,180,190,.55) inset,0 16px 36px var(--a-redglow),0 0 60px rgba(255,43,61,.5)}}
.lt-azul .lta-btn.lta-sm{min-height:44px;padding:10px 18px;font-size:14px;border-radius:10px}
/* imagen o cuadro con X */
.lt-azul .lta-slot{position:relative;width:100%;height:100%;display:grid;place-items:center;border:1.5px dashed rgba(130,155,255,.55);border-radius:20px;background:rgba(35,64,255,.08);color:rgba(170,185,255,.5)}
.lt-azul .lta-slot svg{position:absolute;inset:0;width:100%;height:100%}
.lt-azul .lta-slot span{position:relative;padding:7px 14px;border-radius:999px;background:#0a1250;color:#dfe5ff;font-size:13px;font-weight:700;text-align:center;max-width:90%}
.lt-azul .lta-art{width:100%;height:100%;object-fit:contain;object-position:bottom}
/* barra superior */
.lt-azul .lta-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0 10px;position:relative;z-index:3}
.lt-azul .lta-pill{display:inline-flex;align-items:center;gap:9px;min-width:0;padding:7px 14px 7px 7px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(160,180,255,.22);font-size:13px;font-weight:600;color:#dbe2ff;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.lt-azul .lta-pill i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#fff;color:#0a1250;flex:none}
.lt-azul .lta-pill i svg{width:11px;height:11px;margin-left:2px}
.lt-azul .lta-pill b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.lt-azul .lta-who{display:flex;align-items:center;gap:10px;min-width:0;text-decoration:none;text-align:right}
.lt-azul .lta-who span{display:flex;flex-direction:column;min-width:0}
.lt-azul .lta-who b{font-size:14px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-azul .lta-who small{font-size:11.5px;color:var(--a-mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-azul .lta-who img,.lt-azul .lta-mono{width:42px;height:42px;border-radius:50%;object-fit:cover;flex:none;border:2px solid rgba(160,180,255,.5);box-shadow:0 0 16px rgba(35,64,255,.5)}
.lt-azul .lta-mono{display:grid;place-items:center;background:var(--a-blue);font-weight:900;font-size:18px}
/* portada */
.lt-azul .lta-hero{position:relative;overflow:hidden;background:radial-gradient(ellipse 60% 70% at 78% 38%,rgba(35,64,255,.55),transparent 62%),radial-gradient(ellipse 42% 42% at 10% 16%,rgba(255,43,61,.30),transparent 64%),radial-gradient(ellipse 50% 45% at 92% 8%,rgba(77,107,255,.5),transparent 70%),radial-gradient(ellipse 80% 50% at 10% 100%,rgba(16,32,170,.35),transparent 70%),linear-gradient(180deg,#040820 0%,#02030c 100%)}
.lt-azul .lta-hcov{position:absolute;inset:0;z-index:0;opacity:.16;-webkit-mask:linear-gradient(90deg,transparent 40%,#000 85%),linear-gradient(180deg,#000 40%,transparent);mask:linear-gradient(90deg,transparent 40%,#000 85%);mix-blend-mode:luminosity}
.lt-azul .lta-hcov img{width:100%;height:100%;object-fit:cover;filter:saturate(.6) hue-rotate(10deg)}
.lt-azul .lta-beams{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.lt-azul .lta-beams i{position:absolute;top:-20%;width:140px;height:140%;left:var(--x);background:linear-gradient(180deg,rgba(120,145,255,.0),rgba(120,145,255,.22),rgba(120,145,255,0));transform:rotate(var(--r));transform-origin:top center;filter:blur(8px);opacity:.75}
.lt-azul .lta-hin{position:relative;z-index:2;padding:26px 0 0}
.lt-azul .lta-htx{padding:22px 0 56px;min-width:0;max-width:700px}
.lt-azul .lta-brandw{display:block;margin:0 0 14px;font-size:clamp(20px,3vw,30px);line-height:.9;font-weight:900;text-transform:uppercase;background:linear-gradient(180deg,#fff 20%,#9fb2ff 60%,#4d6bff);-webkit-background-clip:text;background-clip:text;color:transparent;overflow-wrap:anywhere}
.lt-azul .lta-brandw small{display:block;font-family:Montserrat,sans-serif;font-size:11px;letter-spacing:.38em;font-weight:700;-webkit-text-fill-color:var(--a-ice);margin-bottom:4px}
.lt-azul .lta-hero .ltb-h1{margin:0 0 16px;font-size:clamp(28px,4.4vw,46px);line-height:1.14;overflow-wrap:anywhere}
.lt-azul .lta-hero .ltb-sub{margin:0 0 26px;max-width:46ch;font-size:15.5px;color:#c8d1f3;line-height:1.6}
.lt-azul .lta-note{display:flex;align-items:center;gap:8px;margin:14px 0 0;font-size:12.5px;color:var(--a-mut)}
.lt-azul .lta-note svg{width:16px;height:16px;color:var(--a-ice)}
.lt-azul .lta-note b{color:#fff}
.lt-azul .lta-hart{position:relative;align-self:end;aspect-ratio:9/10.5;width:100%;max-width:470px;margin-left:auto}
.lt-azul .lta-hart::before{content:"";position:absolute;left:8%;right:8%;top:10%;bottom:0;border-radius:50% 50% 0 0;background:radial-gradient(closest-side,rgba(60,90,255,.85),rgba(35,64,255,.35) 55%,transparent);filter:blur(30px)}
.lt-azul .lta-hart .lta-art{position:relative;z-index:1;filter:drop-shadow(0 0 1.5px rgba(160,180,255,.6)) drop-shadow(0 20px 30px rgba(0,0,20,.6))}
.lt-azul .lta-hart .lta-slot{position:relative;z-index:1;border-radius:24px 24px 0 0}
.lt-azul .lta-hbase{position:relative;z-index:2;display:flex;align-items:center;gap:14px;height:54px;margin-top:-1px;border-top:1px solid var(--a-line)}
.lt-azul .lta-hbase::before{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--a-line))}
.lt-azul .lta-hbase b{font-size:12px;font-weight:700;color:var(--a-mut);white-space:nowrap}
.lt-azul .lta-hbase b em{font-style:normal;color:#fff}
@media (max-width:859px){.lt-azul .lta-hin{grid-template-columns:1fr;gap:0;text-align:left}.lt-azul .lta-hart{order:-1;max-width:330px;margin:4px auto -8px}.lt-azul .lta-htx{padding:12px 0 40px}.lt-azul .lta-hart::before{filter:blur(24px)}}
/* órbita */
.lt-azul .lta-orbsec{position:relative;overflow:hidden;padding:70px 0 80px;background:radial-gradient(ellipse 55% 50% at 50% 55%,rgba(35,64,255,.35),transparent 70%),var(--a-bg)}
.lt-azul .lta-intro{max-width:600px;margin:0 auto 10px;text-align:center;font-size:15.5px;color:#c8d1f3;line-height:1.6}
.lt-azul .lta-intro .lta-mk{color:#fff;font-weight:700}
.lt-azul .lta-orbsec .lta-hd{text-align:center}
.lt-azul .lta-orbit{position:relative;display:grid;grid-template-columns:1fr minmax(240px,1.1fr) 1fr;align-items:center;gap:20px;margin-top:30px}
.lt-azul .lta-rings{position:absolute;left:50%;top:50%;width:min(860px,150%);aspect-ratio:1;transform:translate(-50%,-50%);pointer-events:none}
.lt-azul .lta-rings i{position:absolute;inset:calc(var(--k) * 11%);border-radius:50%;border:1px solid rgba(110,135,255,calc(.42 - var(--k) * .06))}
.lt-azul .lta-rings i::after{content:"";position:absolute;top:50%;left:-5px;width:9px;height:9px;margin-top:-4.5px;border-radius:50%;background:#8fa3ff;box-shadow:0 0 12px 3px rgba(77,107,255,.9)}
.lt-azul .lta-center{position:relative;z-index:2;aspect-ratio:4/3.2;display:grid;place-items:center}
.lt-azul .lta-center::before{content:"";position:absolute;inset:6%;border-radius:50%;background:radial-gradient(closest-side,rgba(77,107,255,.85),rgba(35,64,255,.25) 60%,transparent);filter:blur(22px)}
.lt-azul .lta-center .lta-art{position:relative;object-position:center;filter:drop-shadow(0 20px 40px rgba(0,0,30,.7))}
.lt-azul .lta-center .lta-slot{position:relative;border-radius:22px}
.lt-azul .lta-pts{list-style:none;margin:0;padding:0;display:grid;gap:44px;position:relative;z-index:2}
.lt-azul .lta-pts li{position:relative;display:flex;gap:14px;align-items:flex-start;font-size:14.5px;line-height:1.5;color:#dbe2ff}
.lt-azul .lta-pts.l li{flex-direction:row-reverse;text-align:right}
.lt-azul .lta-pts.l li:nth-child(2){margin-right:-34px}.lt-azul .lta-pts.r li:nth-child(2){margin-left:-34px}
.lt-azul .lta-dot{position:relative;flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(10,18,80,.9);border:1.5px solid rgba(255,90,105,.75);box-shadow:0 0 18px var(--a-redglow)}
.lt-azul .lta-dot::after{content:"";width:9px;height:9px;border-radius:50%;background:var(--a-red);box-shadow:0 0 10px var(--a-redglow)}
.lt-azul .lta-pts b{display:block;color:#fff;font-size:15.5px;margin-bottom:2px}
@media (max-width:859px){.lt-azul .lta-orbit{grid-template-columns:1fr;gap:26px}.lt-azul .lta-center{order:-1;max-width:330px;width:100%;margin:0 auto}.lt-azul .lta-pts{gap:18px}.lt-azul .lta-pts.l li{flex-direction:row;text-align:left}.lt-azul .lta-pts li:nth-child(2){margin:0!important}.lt-azul .lta-rings{top:150px;width:560px}}
.lt-azul .lta-advsec{position:relative;overflow:hidden;padding:60px 0 72px;background:radial-gradient(ellipse 65% 50% at 50% 0%,rgba(35,64,255,.3),transparent 70%),radial-gradient(ellipse 40% 40% at 88% 18%,rgba(255,43,61,.16),transparent 70%),var(--a-bg)}
.lt-azul .lta-advsec .lta-hd{text-align:center}
.lt-azul .lta-web{position:absolute;top:-14px;right:-16px;width:min(320px,44%);opacity:.3;pointer-events:none;z-index:0}
.lt-azul .lta-web-hero{top:0;right:0;left:auto;bottom:auto;width:min(360px,50%);opacity:.32;transform:scaleX(-1);transform-origin:top right}
.lt-azul .lta-hspider{display:grid;place-items:center;align-self:center}
.lt-azul .lta-hspider .lta-spider{width:min(84%,340px);height:auto;filter:drop-shadow(0 0 16px rgba(255,43,61,.6)) drop-shadow(0 0 42px rgba(35,64,255,.55))}
.lt-azul:not(.lt-static) .lta-hspider .lta-spider{animation:lta-float 5.5s ease-in-out infinite alternate}
.lt-azul .lta-advs{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:34px}
.lt-azul .lta-advc{position:relative;margin:0;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 0 22px;border-radius:22px;background:linear-gradient(168deg,rgba(35,64,255,.16),rgba(8,12,40,.92) 58%);border:1px solid var(--a-line);box-shadow:0 18px 42px rgba(0,0,22,.5);overflow:hidden;transition:transform .35s cubic-bezier(.3,1.5,.5,1),border-color .3s}
.lt-azul .lta-advc::after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;background:linear-gradient(90deg,var(--a-blue),var(--a-red))}
@media(hover:hover){.lt-azul .lta-advc:hover{transform:translateY(-6px);border-color:var(--a-red)}}
.lt-azul .lta-advimg{position:relative;width:100%;aspect-ratio:1/1;display:grid;place-items:end center}
.lt-azul .lta-advimg::before{content:"";position:absolute;left:50%;bottom:6%;width:74%;aspect-ratio:1;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side,var(--a-redglow),rgba(35,64,255,.32) 55%,transparent);filter:blur(20px)}
.lt-azul .lta-advimg img{position:relative;z-index:1;max-width:86%;max-height:96%;object-fit:contain;filter:drop-shadow(0 16px 26px rgba(0,0,22,.6))}
.lt-azul .lta-advc figcaption{padding:4px 16px 0}
.lt-azul .lta-advc b{font-size:16.5px;font-weight:800;color:#fff;line-height:1.3}
@media(max-width:859px){.lt-azul .lta-advs{grid-template-columns:1fr;gap:14px}.lt-azul .lta-advc{flex-direction:row;align-items:center;text-align:left;padding:8px 18px 8px 0}.lt-azul .lta-advimg{width:118px;flex:none;aspect-ratio:1}.lt-azul .lta-advc::after{display:none}.lt-azul .lta-advc figcaption{padding:0}}
/* encabezados */
.lt-azul .lta-hd{margin-bottom:28px}
.lt-azul .lta-hd .ltb-h2{margin:0;font-size:clamp(26px,4.6vw,40px)}
.lt-azul .lta-hd p{margin:10px 0 0;color:var(--a-mut);font-size:15px}
.lt-azul .lta-hd .lta-str{margin-right:12px;vertical-align:middle}
/* planes y combos */
.lt-azul .lta-plsec{background:linear-gradient(180deg,var(--a-bg),#040a2a 40%,var(--a-bg))}
.lt-azul .lta-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:18px}
.lt-azul .lta-card{padding:20px;border-radius:20px;background:linear-gradient(160deg,rgba(35,64,255,.16),rgba(8,12,40,.9) 45%);border:1px solid var(--a-line);box-shadow:0 18px 40px rgba(0,0,20,.45);transition:transform .3s cubic-bezier(.3,1.5,.5,1),border-color .3s,box-shadow .3s}
@media (hover:hover){.lt-azul .lta-card:hover{transform:translateY(-5px);border-color:rgba(130,155,255,.65);box-shadow:0 22px 50px rgba(0,0,30,.55),0 0 40px rgba(35,64,255,.3)}}
.lt-azul .lta-ctop{display:flex;align-items:center;gap:12px;min-width:0}
.lt-azul .lta-ctop>div{min-width:0}
.lt-azul .lta-sub{display:block;font-size:12.5px;color:var(--a-mut);margin-top:2px}
.lt-azul .lta-tag{position:absolute;top:-11px;right:16px;padding:4px 12px;border-radius:999px;background:var(--a-red);color:#fff;font-size:11.5px;font-weight:800;box-shadow:0 0 18px var(--a-redglow)}
.lt-azul .lta-feats{list-style:none;margin:0;padding:0;display:grid;gap:7px;font-size:13.5px;color:#c8d1f3}
.lt-azul .lta-feats li{display:flex;gap:8px;align-items:flex-start}
.lt-azul .lta-feats svg{width:16px;height:16px;color:var(--a-glow);flex:none;margin-top:2px}
.lt-azul .lta-cbot{margin-top:auto;display:flex;flex-direction:column;align-items:stretch;gap:12px}
.lt-azul .lta-cbot .lta-btn{width:100%}
.lt-azul .lta-cbot .lta-price{justify-content:flex-start}
.lt-azul .lta-price{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px}
.lt-azul .lta-price strong{font-size:30px;font-weight:900;line-height:1;letter-spacing:-.02em}
.lt-azul .lta-price s{font-size:14px;color:var(--a-mut)}
.lt-azul .lta-price small{font-size:13px;color:var(--a-mut);width:100%}
.lt-azul .lta-price.is-ask strong{font-size:17px}
.lt-azul .lta-clogos{display:flex;flex-wrap:wrap;gap:8px}
.lt-azul .lta-incl{margin:0;font-size:13.5px;color:var(--a-mut)}
.lt-azul .lta-combo .lta-btn{width:100%}
.lt-azul .lt-cats{--lt-cat-acc:#2340ff}
/* opiniones: carrusel inclinado */
.lt-azul .lta-rvsec{overflow:hidden}
.lt-azul .lta-rvhd{display:flex;align-items:flex-end;justify-content:space-between;gap:16px}
.lt-azul .lta-arrows{display:flex;gap:10px;flex:none}
.lt-azul .lta-arrows button{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:transparent;border:1.5px solid rgba(160,180,255,.4);color:#fff;cursor:pointer;transition:background .2s,border-color .2s}
.lt-azul .lta-arrows button:hover{background:rgba(35,64,255,.3);border-color:#8fa3ff}
.lt-azul .lta-arrows svg{width:20px;height:20px}
.lt-azul .lta-rvsec .ltb-revs{grid-auto-flow:column;grid-auto-columns:min(78%,300px);grid-template-columns:none;overflow-x:auto;padding:14px 18px 22px;margin:0 -18px;scrollbar-width:none}
.lt-azul .lta-rvsec .ltb-revs::-webkit-scrollbar{display:none}
.lt-azul .ltb-rev{border-radius:16px;background:linear-gradient(160deg,#0d1760,#060a2c 70%);border:1px solid var(--a-line);box-shadow:0 18px 36px rgba(0,0,20,.5);transform:skewX(-6deg);clip-path:polygon(6% 0,100% 0,94% 100%,0 100%);padding:22px 30px}
.lt-azul .ltb-rev>*{transform:skewX(6deg)}
.lt-azul .ltb-rav{background:var(--a-blue);color:#fff}
.lt-azul .lta-rvfoot{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:18px}
.lt-azul .lta-happy{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--a-mut)}
.lt-azul .lta-happy b{color:#fff}
.lt-azul .lta-avs{display:flex}
.lt-azul .lta-avs i{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:13px;color:#fff;background:linear-gradient(135deg,#3d5bff,#1622a8);border:2px solid var(--a-bg)}
.lt-azul .lta-avs i+i{margin-left:-10px}
/* ¿Quiénes somos? con título gigante */
.lt-azul .lta-big{position:relative;overflow:hidden;padding:70px 0 70px;text-align:center;background:linear-gradient(180deg,var(--a-bg) 0%,#050a2e 50%,var(--a-bg) 100%)}
.lt-azul .lta-bigq{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 0 4px;font-size:clamp(20px,3.2vw,28px);font-weight:800}
.lt-azul .lta-giant{position:relative;z-index:2;margin:0;font-family:Unbounded,Montserrat,sans-serif;font-weight:900;text-transform:uppercase;line-height:.95;letter-spacing:-.02em;font-size:clamp(34px,var(--gs,10vw),130px);overflow-wrap:anywhere;background:linear-gradient(180deg,#ffffff 0%,#dfe4f5 38%,#7d86a8 52%,#eef1ff 64%,#9aa5d6 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.35);filter:drop-shadow(0 6px 20px rgba(35,64,255,.55))}
.lt-azul .lta-crowd{position:relative;z-index:1;width:min(100%,1080px);aspect-ratio:16/6.2;margin:-6% auto 0;-webkit-mask:linear-gradient(180deg,transparent 0,#000 25%,#000 70%,transparent 100%);mask:linear-gradient(180deg,transparent 0,#000 25%,#000 70%,transparent 100%)}
.lt-azul .lta-crowd::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 60% 70% at 50% 30%,rgba(35,64,255,.6),transparent 70%)}
.lt-azul .lta-crowd .lta-art{position:relative;object-fit:cover;object-position:center top}
.lt-azul .lta-crowd .lta-slot{border-radius:0}
.lt-azul .lta-about{position:relative;z-index:2;max-width:640px;margin:10px auto 0;color:#c8d1f3;font-size:15.5px;line-height:1.7}
.lt-azul .lta-about p{margin:0 0 14px}
.lt-azul .lta-about .lta-btn{margin-top:12px}
/* cierre */
.lt-azul .ltb-sec-pays .ltb-pays li{padding:10px 18px;border-radius:12px;background:rgba(35,64,255,.12);border:1px solid var(--a-line);font-weight:700}
.lt-azul .ltb-faq details{border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--a-line)}
.lt-azul .ltb-faq p{color:#c8d1f3}
.lt-azul .ltb-link{border-radius:12px;background:rgba(35,64,255,.12);border:1px solid var(--a-line)}
.lt-azul .ltb-foot{position:relative;border-top:1px solid var(--a-line);color:var(--a-mut);padding-top:40px}
.lt-azul .ltb-foot::after{content:"";position:absolute;left:0;right:0;bottom:0;height:5px;background:linear-gradient(90deg,#1c2fe0,#4d6bff,#1c2fe0)}
.lt-azul .lta-fname{display:block;margin:0 0 16px;font-family:Unbounded,Montserrat,sans-serif;font-weight:900;font-size:clamp(22px,4vw,34px);text-transform:uppercase;letter-spacing:.04em;background:linear-gradient(180deg,#fff,#7d86a8);-webkit-background-clip:text;background-clip:text;color:transparent}
.lt-azul .ltb-made a{color:var(--a-ice)}
/* partículas azules */
.lt-azul .lta-dust{position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden}
.lt-azul .lta-dust i{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);border-radius:50%;background:#9fb2ff;box-shadow:0 0 8px 2px rgba(77,107,255,.8);opacity:.0}
/* ===== ANIMACIONES (VIP) ===== */
.lt-azul:not(.lt-static) .lta-btn::after{animation:lta-shine 3.6s 1.2s ease-in-out infinite}
@keyframes lta-shine{0%,55%{left:-70%}100%{left:130%}}
.lt-azul:not(.lt-static) [data-lt-btn="main"]{animation:lta-pulse 2.6s ease-in-out infinite}
@keyframes lta-pulse{0%,100%{box-shadow:0 0 0 1px rgba(150,170,255,.35) inset,0 12px 30px rgba(35,64,255,.45),0 0 44px rgba(35,64,255,.35)}50%{box-shadow:0 0 0 1px rgba(150,170,255,.55) inset,0 14px 36px rgba(35,64,255,.6),0 0 70px rgba(77,107,255,.6)}}
.lt-azul:not(.lt-static) .lta-beams i{animation:lta-beam var(--t) var(--d) ease-in-out infinite alternate}
@keyframes lta-beam{from{transform:rotate(var(--r)) translateX(-30px);opacity:.35}to{transform:rotate(calc(var(--r) + 9deg)) translateX(40px);opacity:.9}}
.lt-azul:not(.lt-static) .lta-hart::before{animation:lta-glow 4s ease-in-out infinite alternate}
.lt-azul:not(.lt-static) .lta-center::before{animation:lta-glow 3.2s ease-in-out infinite alternate}
@keyframes lta-glow{from{opacity:.7;transform:scale(.94)}to{opacity:1;transform:scale(1.05)}}
.lt-azul:not(.lt-static) .lta-hart .lta-art{animation:lta-float 6s ease-in-out infinite alternate}
.lt-azul:not(.lt-static) .lta-center .lta-art{animation:lta-float 5s ease-in-out infinite alternate}
@keyframes lta-float{from{translate:0 0}to{translate:0 -10px}}
.lt-azul:not(.lt-static) .lta-rings i{animation:lta-spin calc(30s + var(--k) * 12s) linear infinite}
.lt-azul:not(.lt-static) .lta-rings i:nth-child(even){animation-direction:reverse}
@keyframes lta-spin{to{transform:rotate(360deg)}}
.lt-azul:not(.lt-static) .lta-dot{animation:lta-ping 2.4s calc(var(--i,0) * .35s) ease-out infinite}
@keyframes lta-ping{0%{box-shadow:0 0 0 0 rgba(120,145,255,.75),0 0 18px rgba(77,107,255,.6)}70%,100%{box-shadow:0 0 0 14px rgba(120,145,255,0),0 0 18px rgba(77,107,255,.6)}}
.lt-azul:not(.lt-static) .lta-dust i{animation:lta-dust var(--t) var(--d) linear infinite}
@keyframes lta-dust{0%{opacity:0;transform:translate(0,0) scale(.6)}15%{opacity:.9}85%{opacity:.7}100%{opacity:0;transform:translate(var(--dx),-120px) scale(1)}}
.lt-azul:not(.lt-static) .lta-str i{animation:lta-str 1.6s calc(var(--k,0) * .12s) ease-in-out infinite}
.lt-azul .lta-str i:nth-child(1){--k:0}.lt-azul .lta-str i:nth-child(2){--k:1}.lt-azul .lta-str i:nth-child(3){--k:2}.lt-azul .lta-str i:nth-child(4){--k:3}
@keyframes lta-str{0%,100%{filter:brightness(1)}40%{filter:brightness(2.2)}}
.lt-azul:not(.lt-static) .lta-giant{background-size:100% 220%;animation:lta-chrome 6s ease-in-out infinite alternate}
@keyframes lta-chrome{from{background-position:0 0}to{background-position:0 100%}}
.lt-azul:not(.lt-static) .lta-pill i{animation:lta-play 2s ease-in-out infinite}
@keyframes lta-play{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.6)}60%{box-shadow:0 0 0 8px rgba(255,255,255,0)}}
/* entradas: resaltado que se pinta, puntos que llegan desde el centro */
.lt-azul:not(.lt-static).ltb-rv .is-in .lta-mk,.lt-azul:not(.lt-static) .lta-hero .lta-mk{animation:lta-mk .9s .35s cubic-bezier(.2,.8,.2,1) both}
@keyframes lta-mk{from{background-size:0% 100%;box-shadow:none}to{background-size:100% 100%}}
.lt-azul .lta-mk{background-repeat:no-repeat}
.lt-azul:not(.lt-static).ltb-rv .lta-pts.is-in li{animation:lta-pin .7s calc(var(--rvd,0ms) + var(--i,0) * 140ms) cubic-bezier(.16,1,.3,1) both}
@keyframes lta-pin{from{opacity:0;transform:translateX(var(--fx,0)) scale(.9)}to{opacity:1;transform:none}}
.lt-azul .lta-pts.l li{--fx:60px}.lt-azul .lta-pts.r li{--fx:-60px}
.lt-azul:not(.lt-static) .lta-htx>*{animation:lta-in .8s calc(var(--k,0) * .1s) cubic-bezier(.16,1,.3,1) both}
@keyframes lta-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
.lt-azul:not(.lt-static) .lta-hart{animation:lta-hin 1.1s .15s cubic-bezier(.16,1,.3,1) both}
@keyframes lta-hin{from{opacity:0;transform:translateX(40px) scale(.96)}to{opacity:1;transform:none}}
.lt-azul:not(.lt-static).ltb-rv .lta-giant[data-rv].is-in{animation:lta-gin 1s var(--rvd,0ms) cubic-bezier(.16,1,.3,1) both,lta-chrome 6s 1s ease-in-out infinite alternate}
@keyframes lta-gin{from{opacity:0;letter-spacing:.25em;filter:blur(8px) drop-shadow(0 6px 20px rgba(35,64,255,.55))}to{opacity:1;letter-spacing:-.02em;filter:blur(0) drop-shadow(0 6px 20px rgba(35,64,255,.55))}}
.lt-azul .ltb-off :is(.lta-btn,.lta-beams i,.lta-rings i,.lta-dot,.lta-dust i,.lta-str i,.lta-giant,.lta-pill i,.lta-art),.lt-azul .ltb-off :is(.lta-btn,.lta-hart,.lta-center)::after,.lt-azul .ltb-off :is(.lta-hart,.lta-center)::before,.lt-azul .lta-zz :is(.lta-dust i,.lta-rings i,.lta-beams i){animation-play-state:paused!important}
@media (max-width:520px){.lt-azul .lta-pill b{max-width:46vw}.lt-azul .lta-who small{display:none}.lt-azul .lta-dust i:nth-child(n+9){display:none}.lt-azul .lta-rvhd{align-items:center}.lt-azul .lta-arrows button{width:40px;height:40px}}
/* ===================== MEJORA DE DISEÑO · cómic / Spider-Verse ===================== */
.lt-azul .ltb-h1,.lt-azul .lta-hd .ltb-h2,.lt-azul .lta-giant,.lt-azul .lta-brandw{font-family:Anton,Montserrat,sans-serif;font-weight:400}
/* halftone de cómic en las secciones oscuras */
.lt-azul .lta-hero::after,.lt-azul .lta-advsec::after,.lt-azul .lta-big::after,.lt-azul .lta-plsec::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background-image:radial-gradient(rgba(255,255,255,.07) 1.1px,transparent 1.5px);background-size:14px 14px;opacity:.55}
.lt-azul .lta-plsec{position:relative;overflow:hidden}
.lt-azul .lta-hero .ltb-wrap,.lt-azul .ltb-sec .ltb-wrap{position:relative;z-index:3}
/* hilo rojo tipo telaraña arriba de las secciones */
.lt-azul .lta-advsec::before,.lt-azul .lta-plsec::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;z-index:2;background:linear-gradient(90deg,transparent,rgba(130,155,255,.4),var(--a-red) 50%,rgba(130,155,255,.4),transparent);opacity:.75}
/* PORTADA con más fuerza + acento rojo */
.lt-azul .lta-hero{background:radial-gradient(ellipse 52% 58% at 70% 32%,rgba(35,64,255,.5),transparent 60%),radial-gradient(ellipse 44% 44% at 88% 12%,rgba(255,40,58,.42),transparent 64%),radial-gradient(ellipse 70% 55% at 10% 104%,rgba(16,32,170,.42),transparent 70%),linear-gradient(180deg,#05081f,#02030c)}
.lt-azul .lta-web-hero{width:min(470px,60%);opacity:.42;filter:drop-shadow(0 0 12px rgba(120,150,255,.4))}
.lt-azul .lta-htx{max-width:820px}
.lt-azul .lta-brandw{font-size:clamp(26px,4.1vw,44px);line-height:.9;filter:drop-shadow(0 6px 22px rgba(35,64,255,.45))}
.lt-azul .lta-brandw small{font-family:Montserrat,sans-serif;-webkit-text-fill-color:#ff2b3d;letter-spacing:.42em}
.lt-azul .lta-hero .ltb-h1{font-size:clamp(36px,5.8vw,64px);line-height:1.02;margin-bottom:18px}
.lt-azul .lta-hero .ltb-sub{font-size:16.5px}
.lt-azul .lta-mk{background:linear-gradient(90deg,#ff2b3d,#d40f22);box-shadow:0 0 28px rgba(255,43,61,.5)}
/* botón con más presencia */
.lt-azul .lta-btn{min-height:60px;border-radius:14px;font-size:17px;padding:16px 36px}
/* TARJETAS tipo viñeta de cómic */
.lt-azul .lta-advc,.lt-azul .lta-card{border:1.5px solid rgba(130,155,255,.32);box-shadow:0 22px 50px rgba(0,0,22,.55),inset 0 1px 0 rgba(255,255,255,.08)}
.lt-azul .lta-advc{background:linear-gradient(168deg,rgba(35,64,255,.22),rgba(5,9,30,.96) 60%)}
.lt-azul .lta-advimg{background:radial-gradient(ellipse 85% 62% at 50% 100%,rgba(255,43,61,.22),transparent 72%)}
.lt-azul .lta-advc b{font-size:17px}
.lt-azul .lta-hd .ltb-h2{font-size:clamp(30px,5.2vw,46px);text-shadow:0 2px 26px rgba(0,0,30,.5)}
.lt-azul .lta-str i{box-shadow:0 0 8px rgba(255,43,61,.45)}
@media(hover:hover){.lt-azul .lta-advc:hover{transform:translateY(-8px) rotate(-.7deg);border-color:var(--a-red);box-shadow:0 28px 64px rgba(0,0,30,.6),0 0 46px rgba(255,43,61,.32)}.lt-azul .lta-card:hover{border-color:var(--a-red);box-shadow:0 24px 54px rgba(0,0,30,.58),0 0 40px rgba(255,43,61,.28)}}
/* ===================== VENTAJAS · personajes libres + acostado (consolidado limpio v16) ===================== */
/* eyebrow de rayas en cualquier encabezado de seccion */
.lt-azul .ltb-h2 .lta-str{margin-right:12px;vertical-align:middle}
.lt-azul .lta-plsec::before{display:none}
/* seccion ventajas: fondo + difuminado de la union hero(zona1) -> ventajas(zona2) */
.lt-azul .lta-advsec{position:relative;overflow:hidden;margin-top:-1px;padding:30px 0 72px;background:radial-gradient(ellipse 58% 42% at 50% 2%,rgba(35,64,255,.14),transparent 72%),radial-gradient(ellipse 40% 40% at 88% 18%,rgba(255,43,61,.12),transparent 70%),var(--a-bg)}
.lt-azul .lta-advsec .lta-hd{text-align:center}
.lt-azul .lta-advsec::before{display:block;content:"";position:absolute;top:0;left:0;right:0;height:220px;z-index:0;pointer-events:none;background:linear-gradient(to bottom,#05081f 0%,rgba(5,8,31,.55) 34%,rgba(2,3,12,0) 100%)}
.lt-azul .lta-advsec>.ltb-wrap{position:relative;z-index:3}
/* 3 personajes libres: misma base, mismo alto, texto encima, halo detras */
.lt-azul .lta-advs{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:40px;align-items:end}
.lt-azul .lta-advc{position:relative;margin:0;padding:0;display:block;text-align:center;background:none;border:0;box-shadow:none;overflow:visible;transition:transform .35s cubic-bezier(.3,1.4,.5,1)}
.lt-azul .lta-advc::after{display:none}
.lt-azul .lta-advc::before{content:"";position:absolute;left:50%;bottom:12%;width:86%;aspect-ratio:1;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(255,47,72,.56) 0%,rgba(86,70,255,.4) 44%,rgba(35,64,255,.12) 68%,transparent 82%);filter:blur(26px);z-index:0;pointer-events:none}
.lt-azul .lta-advimg{position:relative;z-index:1;width:100%;aspect-ratio:1.19/1;overflow:visible;background:none;display:block}
.lt-azul .lta-advimg::before,.lt-azul .lta-advimg::after{display:none}
.lt-azul .lta-advimg img{position:relative;z-index:1;width:100%;height:100%;object-fit:contain;object-position:bottom center;-webkit-mask:linear-gradient(180deg,#000 56%,rgba(0,0,0,.45) 82%,transparent 98%);mask:linear-gradient(180deg,#000 56%,rgba(0,0,0,.45) 82%,transparent 98%);filter:drop-shadow(0 14px 26px rgba(0,0,30,.65)) drop-shadow(0 0 22px rgba(255,43,61,.3))}
.lt-azul .lta-advc figcaption{position:absolute;left:0;right:0;bottom:1%;z-index:3;padding:0 6px}
.lt-azul .lta-advc b{display:inline-block;font-family:Anton,Montserrat,sans-serif;font-weight:400;font-size:clamp(16px,1.9vw,22px);line-height:1.05;color:#fff;letter-spacing:.012em;text-shadow:0 2px 2px rgba(0,0,0,.95),0 0 4px rgba(0,0,0,.9),0 0 18px rgba(255,43,61,.65),0 8px 18px rgba(0,0,0,.75);-webkit-text-stroke:.7px rgba(8,12,38,.95);paint-order:stroke fill}
@media(hover:hover){.lt-azul .lta-advc:hover{transform:translateY(-10px)}.lt-azul .lta-advc:hover .lta-advimg img{filter:drop-shadow(0 18px 30px rgba(0,0,30,.7)) drop-shadow(0 0 32px rgba(255,43,61,.55))}}
/* ventajas extra (4+): chips, nada se pierde */
.lt-azul .lta-advx{list-style:none;margin:30px auto 0;padding:0;max-width:740px;display:flex;flex-wrap:wrap;justify-content:center;gap:10px;position:relative;z-index:1}
.lt-azul .lta-advx li{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;background:rgba(35,64,255,.14);border:1px solid var(--a-line);font-size:13.5px;font-weight:700;color:#dbe2ff}
.lt-azul .lta-advx svg{width:16px;height:16px;color:var(--a-glow);flex:none}
/* Spiderman en hamaca: divisor a todo el ancho (full-bleed) + luz suave detras */
.lt-azul .lta-couch{position:relative;z-index:6;width:100%;max-width:none;margin:-22px 0 -30px;padding:0;text-align:center;pointer-events:none;isolation:isolate}
.lt-azul .lta-couch::before{content:"";position:absolute;left:50%;top:50%;width:min(70%,1000px);aspect-ratio:3.4/1;transform:translate(-50%,-50%);background:radial-gradient(ellipse closest-side,rgba(255,66,80,.4) 0%,rgba(95,110,255,.24) 48%,transparent 78%);filter:blur(50px);z-index:-1}
.lt-azul .lta-couch img{display:block;width:100%;max-width:100%;height:auto}
.lt-azul:not(.lt-static) .lta-couch img{animation:lta-float 6s ease-in-out infinite alternate}
/* filtros de categoria: que no se corten en movil */
@media(max-width:620px){.lt-azul .lt-cats{flex-wrap:wrap;justify-content:center;row-gap:8px}}
/* tablet */
@media(max-width:859px){.lt-azul .lta-couch{margin:-14px 0 -18px}.lt-azul .lta-advsec{padding-top:24px}.lt-azul .lta-advs{gap:8px;margin-top:30px}}
/* movil: ventajas en columna vertical, personaje mas bajo para menos scroll */
@media(max-width:620px){.lt-azul .lta-couch{margin:-8px 0 -10px}.lt-azul .lta-advsec{padding-top:18px}.lt-azul .lta-advs{grid-template-columns:1fr;gap:4px;max-width:300px;margin-left:auto;margin-right:auto}.lt-azul .lta-advimg{aspect-ratio:1.42/1}.lt-azul .lta-advc b{font-size:clamp(17px,6vw,23px)}.lt-azul .lta-advx{gap:8px;margin-top:22px}.lt-azul .lta-advx li{font-size:12.5px;padding:8px 13px}}
/* barra fija (movil): degradado superior para que el solape se lea intencional */
.lt-azul .lt-bbw::before{content:"";position:absolute;left:0;right:0;bottom:100%;height:42px;background:linear-gradient(to top,rgba(2,3,12,.92),rgba(2,3,12,0));pointer-events:none}
/* --- movimientos generales de la plantilla Spiderman activos tambien con "reducir movimiento"; solo se mantiene apagado el parpadeo rapido (.lta-str) por seguridad (WCAG: destellos = riesgo de convulsiones) --- */
@media (prefers-reduced-motion: reduce){
  .lt-root.lt-azul:not(.lt-static) .lta-couch img,
  .lt-root.lt-azul:not(.lt-static) .lta-hart .lta-art{animation:lta-float 6s ease-in-out infinite alternate!important}
  .lt-root.lt-azul:not(.lt-static) .lta-center .lta-art{animation:lta-float 5s ease-in-out infinite alternate!important}
  .lt-root.lt-azul:not(.lt-static) .lta-hart::before{animation:lta-glow 4s ease-in-out infinite alternate!important}
  .lt-root.lt-azul:not(.lt-static) .lta-center::before{animation:lta-glow 3.2s ease-in-out infinite alternate!important}
  .lt-root.lt-azul:not(.lt-static) [data-lt-btn="main"]{animation:lta-pulse 2.6s ease-in-out infinite!important}
  .lt-root.lt-azul:not(.lt-static) .lta-btn::after{animation:lta-shine 3.6s 1.2s ease-in-out infinite!important}
  .lt-root.lt-azul:not(.lt-static) .lta-beams i{animation:lta-beam var(--t) var(--d) ease-in-out infinite alternate!important}
  .lt-root.lt-azul:not(.lt-static) .lta-rings i{animation:lta-spin calc(30s + var(--k) * 12s) linear infinite!important}
  .lt-root.lt-azul:not(.lt-static) .lta-rings i:nth-child(even){animation-direction:reverse!important}
  .lt-root.lt-azul:not(.lt-static) .lta-dot{animation:lta-ping 2.4s calc(var(--i,0) * .35s) ease-out infinite!important}
  .lt-root.lt-azul:not(.lt-static) .lta-dust i{animation:lta-dust var(--t) var(--d) linear infinite!important}
  .lt-root.lt-azul:not(.lt-static) .lta-giant{animation:lta-chrome 6s ease-in-out infinite alternate!important}
  .lt-root.lt-azul:not(.lt-static) .lta-pill i{animation:lta-play 2s ease-in-out infinite!important}
  .lt-root.lt-azul:not(.lt-static) .lta-htx>*{animation:lta-in .8s calc(var(--k,0) * .1s) cubic-bezier(.16,1,.3,1) both!important}
  .lt-root.lt-azul:not(.lt-static) .lta-hart{animation:lta-hin 1.1s .15s cubic-bezier(.16,1,.3,1) both!important}
}
`;

  function renderAzul(root, d, ctx) {
    LC.injectCss('azul', CSS_AZUL);
    const cl = setup(root, ctx, d, 'azul');
    const pm = !!ctx.profileMode && typeof ctx.profileHeader === 'function';
    if (pm) root.classList.add('ltb-pm');
    const { plans, combos } = visible(d, ctx);
    const wa = d.whatsapp ? ctx.buy('tus planes') : '';
    const ids = ctx.platformIds || platformIds(plans, combos);
    const ini = ctx.esc((d.name.trim().charAt(0) || 'S').toUpperCase());
    const mark = d.logoUrl ? `<img src="${ctx.esc(d.logoUrl)}" alt="" width="42" height="42" decoding="async">` : `<span class="lta-mono" aria-hidden="true">${ini}</span>`;
    const cta = (label, path, main = true) => wa ? `<a class="lta-btn" data-lt-btn${main ? '="main"' : ''} href="${ctx.esc(wa)}" target="_blank" rel="noopener">${ctx.linkIcon('whatsapp')}<span${path ? ed(ctx, path) : ''}>${ctx.esc(label)}</span></a>` : `<button type="button" class="lta-btn" data-goto="plans"><span>Ver planes</span></button>`;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const fx = !(ctx.noMotion || ctx.reducedMotion);
    const dust = n => !fx ? '' : `<div class="lta-dust" aria-hidden="true">${Array.from({ length: n }, () => `<i style="--x:${(2 + rnd() * 96).toFixed(1)}%;--y:${(20 + rnd() * 78).toFixed(1)}%;--s:${(2 + rnd() * 3.5).toFixed(1)}px;--t:${(6 + rnd() * 7).toFixed(1)}s;--d:${(-rnd() * 12).toFixed(1)}s;--dx:${(rnd() * 60 - 30).toFixed(0)}px"></i>`).join('')}</div>`;
    const beams = !fx ? '' : `<div class="lta-beams" aria-hidden="true">${[[55, -16, 7, 0], [68, -8, 9, -3], [80, 6, 8, -5], [90, 14, 10, -2]].map(([x, r, t, dl]) => `<i style="--x:${x}%;--r:${r}deg;--t:${t}s;--d:${dl}s"></i>`).join('')}</div>`;
    const hoursTxt = ctx.hours247 === false ? `Atención: ${ctx.hours}` : 'Atención 24/7 por WhatsApp';
    // seis puntos alrededor de la órbita: 3 beneficios de la tienda + 3 datos fijos
    // seis puntos: primero los beneficios que escribió la tienda; se completan con datos fijos que no repitan uno ya escrito
    const pts = d.benefits.slice(0, 6).map((b, k) => [b, '', k]);
    const ptHtml = (list, off, side) => `<ul class="lta-pts ${side}" data-rv>${list.map(([t, s, bi], k) => `<li style="--i:${k + off}"><span class="lta-dot" aria-hidden="true"></span><span><b${bi != null && bi < d.benefits.length ? ed(ctx, `benefits.${bi}`) : ''}>${ctx.esc(t)}</b>${s ? ctx.esc(s) : ''}</span></li>`).join('')}</ul>`;
    const nApps = ids.length;
    const intro = `Con <span class="lta-mk"><span>${nApps ? `${nApps} ${nApps === 1 ? 'app disponible' : 'apps disponibles'}` : 'tus apps favoritas'}${ctx.minPrice ? ` desde ${ctx.esc(ctx.minPrice)}` : ''}</span></span>, ${ctx.esc(d.name)} es la forma más fácil de ver lo que te gusta, sin pagar de más.`;
    // título gigante: el tamaño se ajusta al largo del nombre
    const gName = String(d.name || 'Tu tienda').trim();
    const gs = Math.max(6, Math.min(16, 88 / (Math.max(5, gName.length) * .82))).toFixed(1) + 'vw';
    const revs = d.reviews && d.reviews.length ? d.reviews : [];
    const html =
      (pm ? ctx.profileHeader() : '') +
      `<section class="lta-hero" data-lt-hero>${!pm && d.coverUrl ? `<figure class="lta-hcov" aria-hidden="true"><img src="${ctx.esc(d.coverUrl)}" alt="" decoding="async" fetchpriority="high"></figure>` : ''}${beams}<img class="lta-web lta-web-hero" src="${AZ_IMG}sp-web2.webp" alt="" aria-hidden="true">${dust(14)}<div class="ltb-wrap">` +
      (pm ? '' : `<div class="lta-top"><span class="lta-pill"><i>${azi('play', '')}</i><b${ed(ctx, 'tagline')}>${ctx.esc(d.tagline || LC.DEFAULTS.tagline)}</b></span>` +
        `<a class="lta-who" href="#" data-goto="plans"><span><b${ed(ctx, 'name')}>${ctx.esc(d.name)}</b><small>${wa ? 'Atención por WhatsApp' : 'Planes de streaming'}</small></span>${mark}</a></div>`) +
      `<div class="lta-hin"><div class="lta-htx"><span class="lta-brandw lta-wide" style="--k:0"><small>TIENDA</small>${ctx.esc(gName)}</span>` +
      `<h1 class="ltb-h1" style="--k:1"${ed(ctx, 'heroTitle')}>${azMark(ctx, d.heroTitle || LC.DEFAULTS.heroTitle)}</h1>` +
      `<p class="ltb-sub" style="--k:2"${ed(ctx, 'heroSubtitle')}>${ctx.esc(d.heroSubtitle || LC.DEFAULTS.heroSubtitle)}</p>` +
      `<div style="--k:3">${cta(d.ctaText, 'ctaText')}</div>` +
      (ctx.minPrice ? `<p class="lta-note" style="--k:4">${azi('tap')}<span>Planes desde <b>${ctx.esc(ctx.minPrice)}</b></span></p>` : '') + `</div>` +
      `</div>` +
      `</div></section>` +
      promo(ctx) +
      `<div class="lta-couch" aria-hidden="true"><img src="${AZ_IMG}sp-couch4.webp" alt="" decoding="async" loading="lazy"></div>` +
      `<section class="ltb-sec ltb-sec-benefits lta-advsec"><img class="lta-web" src="${AZ_IMG}sp-web.webp" alt="" aria-hidden="true">${dust(10)}<div class="ltb-wrap">${azHead(`${azStripes()}¿Por qué comprar con nosotros?`)}<div class="lta-advs">${[0, 1, 2].map(i => `<figure class="lta-advc" data-rv style="--i:${i}"><div class="lta-advimg"><img src="${AZ_IMG}${['sp-ben1.webp', 'sp-ben2.webp', 'sp-ben3.webp'][i]}" alt="" loading="lazy" decoding="async"></div><figcaption><b${ed(ctx, `benefits.${i}`)}>${ctx.esc(d.benefits[i] || ['Precios bajos, sin pagar de más', 'Atención rápida por WhatsApp', 'Garantía y estabilidad asegurada'][i])}</b></figcaption></figure>`).join('')}</div>${d.benefits.length > 3 ? `<ul class="lta-advx" data-rv>${d.benefits.slice(3).map((b, k) => { const i = k + 3; return `<li>${azi('check')}<span${ed(ctx, `benefits.${i}`)}>${ctx.esc(b)}</span></li>`; }).join('')}</ul>` : ''}</div></section>` +
      (plans.length ? `<section class="ltb-sec ltb-sec-plans lta-plsec"><div class="ltb-wrap">${azHead(`${azStripes()}Elige tu plataforma`)}<div class="lta-grid">${plans.map((p, i) => azPlan(ctx, p, i)).join('')}</div></div></section>` : '') +
      (combos.length ? `<section class="ltb-sec ltb-sec-combos"><div class="ltb-wrap">${azHead(`${azStripes()}Combos para ahorrar más`)}<div class="lta-grid">${combos.map((c, i) => azCombo(ctx, c, i)).join('')}</div></div></section>` : '') +
      (revs.length ? `<section class="ltb-sec ltb-sec-reviews lta-rvsec"><div class="ltb-wrap"><div class="lta-rvhd">${azHead(`${azStripes()}Opiniones de nuestros clientes`)}` +
        `<div class="lta-arrows"><button type="button" data-az-dir="-1" aria-label="Anterior">${azi('arL', '')}</button><button type="button" data-az-dir="1" aria-label="Siguiente">${azi('arR', '')}</button></div></div>` +
        `${reviewsHtml(ctx, d)}<div class="lta-rvfoot">${cta(d.ctaText, '', false)}</div></div></section>` : '') +
      `<section class="ltb-sec ltb-sec-who lta-big">${dust(14)}<div class="ltb-wrap"><p class="lta-bigq" data-rv>${azStripes()}</p>` +
      `<h2 class="lta-giant" data-rv style="--gs:${gs}"${ed(ctx, 'name')}>${ctx.esc(gName)}</h2></div>` +
      `<div class="lta-crowd">${azArt('crowd', '', 'Imagen ancha (público o banner)')}</div>` +
      `<div class="ltb-wrap"><div class="lta-about" data-rv>${cta(d.ctaText, '', false)}</div></div></section>` +
      (d.paymentMethods.length ? sec('pays', `${azStripes()}Paga como quieras`, `<ul class="ltb-pays" data-rv>${d.paymentMethods.map((p, i) => `<li${ed(ctx, `paymentMethods.${i}`)}>${ctx.esc(p)}</li>`).join('')}</ul>`) : '') +
      faqSec(ctx, d, `${azStripes()}Preguntas frecuentes`) +
      linksSec(ctx, d, `${azStripes()}Síguenos en redes`) +
      footer(ctx, d, `<span class="lta-fname">${ctx.esc(gName)}</span>`) + fab(ctx, wa);
    root.innerHTML = html;
    motionKit(root, ctx, cl);
    azMotion(root, ctx, cl);
  }
  /** Flechas del carrusel de opiniones y pausa de partículas/anillos fuera de pantalla. */
  function azMotion(root, ctx, cl) {
    const track = root.querySelector('.lta-rvsec .ltb-revs');
    const onArrow = e => {
      const b = e.target && e.target.closest ? e.target.closest('[data-az-dir]') : null;
      if (!b || !track || !root.contains(b)) return;
      const card = track.children[0], step = card ? card.getBoundingClientRect().width + 16 : 300;
      track.scrollBy({ left: step * Number(b.getAttribute('data-az-dir')), behavior: ctx.reducedMotion ? 'auto' : 'smooth' });
    };
    root.addEventListener('click', onArrow);
    cl.push(() => root.removeEventListener('click', onArrow));
    if (ctx.noMotion || typeof G.IntersectionObserver !== 'function') return;
    const io = new G.IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('lta-zz', !en.isIntersecting)), { rootMargin: '120px 0px 120px 0px' });
    root.querySelectorAll('.lta-hero,.lta-orbsec,.lta-big').forEach(e => io.observe(e));
    cl.push(() => io.disconnect());
  }

  LC.registerTemplate({
    id: 'azul', parts: [{ k: 'hero', label: 'Foto de portada', sel: '.lta-hcov', x: true }, { k: 'crowd', label: 'Imagen ancha', sel: '.lta-crowd', x: true }, { k: 'dust', label: 'Luces y partículas', sel: '.lta-dust,.lta-beams' }],
    name: 'Spiderman', description: 'Azul con detalles rojos estilo Spiderman: foto con brillo, ventajas en órbita, opiniones en carrusel y tu nombre gigante.',
    tags: ['oscura', 'impactante', 'animada'], preview: { bg: '#05081f', fg: '#f2f5ff', accent: '#ff2b3d' }, render: renderAzul
  });
})(typeof window !== 'undefined' ? window : globalThis);
