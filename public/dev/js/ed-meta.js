/* ed-meta.js — metadatos de capas por cuenta (Diseños Streaming) */
(function (G) {
  'use strict';
  var MK = '⁣';                       // prefijo invisible en el nombre de la capa de control
  var Z0 = '​', Z1 = '‌', ZS = '‍';

  function h32(s) {
    var h = 0x811c9dc5;
    s = String(s || '');
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function enc(s) {
    return Array.from(String(s)).map(function (c) {
      return c.charCodeAt(0).toString(2).padStart(8, '0').replace(/0/g, Z0).replace(/1/g, Z1);
    }).join(ZS);
  }
  function dec(t) {
    var m = String(t || '').match(/[​‌‍]{8,}/);
    if (!m) return '';
    return m[0].split(ZS).map(function (b) {
      return String.fromCharCode(parseInt(b.replace(/​/g, '0').replace(/‌/g, '1'), 2));
    }).join('');
  }
  function isMark(l) { return !!l && typeof l.name === 'string' && l.name.charAt(0) === MK; }
  function bit(id, axis) { return ((Math.abs(Number(id) || 0) * 2) + axis) % 32; }

  // Solo capas sueltas, que no tocan los bordes del lienzo (así 1 px nunca deja una línea visible)
  function eligible(l, cw, ch) {
    if (!l || isMark(l) || l.type === 'frame' || l.groupId) return false;
    var x = +l.x, y = +l.y, w = +l.w, h = +l.h;
    if (![x, y, w, h].every(isFinite)) return false;
    return x > 2 && y > 2 && x + w < cw - 2 && y + h < ch - 2;
  }

  function day() {
    var d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }

  // Marca una plantilla para la cuenta que la abre. Devuelve una copia; no toca el original.
  function mark(tpl, user, tplId) {
    try {
      if (!tpl || !Array.isArray(tpl.layers) || !tpl.layers.length || !user || !user.uid) return tpl;
      if (tpl.layers.some(isMark)) return tpl;
      var code = h32(user.uid), cw = +tpl.canvasW || 800, ch = +tpl.canvasH || 800, maxId = 0;
      var layers = tpl.layers.map(function (l) {
        maxId = Math.max(maxId, Number(l && l.id) || 0);
        if (!eligible(l, cw, ch)) return l;
        var n = Object.assign({}, l);
        n.x = Math.round(+l.x) + ((code >>> bit(l.id, 0)) & 1);
        n.y = Math.round(+l.y) + ((code >>> bit(l.id, 1)) & 1);
        return n;
      });
      var email = String(user.email || '').trim() || ('uid ' + user.uid);
      layers.unshift({
        id: maxId + 1, type: 'text', name: MK + 'Texto', src: '',
        x: 4, y: Math.max(0, ch - 10), w: 160, h: 8,
        opacity: 0, visible: true, zIndex: 0, locked: true, rotation: 0,
        tp: {
          text: email + ' ' + enc(user.uid + '|' + day() + '|' + (tplId || '')),
          fontSize: 4, fontFamily: "'Plus Jakarta Sans'", fontWeight: '400', color: '#ffffff', align: 'left',
          strokeColor: '#000000', strokeWidth: 0, shadowBlur: 0, shadowColor: 'rgba(0,0,0,0)',
          innerShadow: 0, innerShadowColor: '#000000', innerShadowOpacity: 0, innerShadowAngle: 90,
          innerShadowDistance: 0, innerShadowChoke: 0, innerShadowBlur: 0
        }
      });
      return Object.assign({}, tpl, { layers: layers });
    } catch (_) { return tpl; }
  }

  // La capa de control no se puede tocar ni seleccionar en el lienzo
  function tame(layers) {
    try { (layers || []).forEach(function (l) { if (isMark(l) && l.el) { l.el.style.pointerEvents = 'none'; l.el.setAttribute('aria-hidden', 'true'); } }); } catch (_) {}
  }

  // ---- Lectura (solo para el panel de rastreo del admin) ----
  function read(copy, original, users) {
    var out = { email: '', uid: '', date: '', tplId: '', bits: 0, ranking: [] };
    var cl = (copy && copy.layers) || [];
    cl.forEach(function (l) {
      var t = l && l.tp && l.tp.text;
      if (t && /[​‌]/.test(t)) {
        var p = dec(t).split('|');
        out.uid = p[0] || ''; out.date = p[1] || ''; out.tplId = p[2] || '';
        out.email = t.replace(/[​‌‍]/g, '').trim();
      }
    });
    if (original && Array.isArray(original.layers) && users && users.length) {
      var cw = +original.canvasW || 800, ch = +original.canvasH || 800, byId = {};
      cl.forEach(function (l) { if (l && l.id != null) byId[l.id] = l; });
      var obs = [];
      original.layers.forEach(function (o) {
        if (!eligible(o, cw, ch)) return;
        var c = byId[o.id];
        if (!c) return;
        var dx = Math.round(+c.x) - Math.round(+o.x), dy = Math.round(+c.y) - Math.round(+o.y);
        if ((dx === 0 || dx === 1) && (dy === 0 || dy === 1)) { obs.push([bit(o.id, 0), dx]); obs.push([bit(o.id, 1), dy]); }
      });
      out.bits = obs.length;
      out.ranking = users.map(function (u) {
        var code = h32(u.uid), ok = 0;
        obs.forEach(function (b) { if (((code >>> b[0]) & 1) === b[1]) ok++; });
        return { uid: u.uid, email: u.email || '', ok: ok, total: obs.length };
      }).sort(function (a, b) { return b.ok - a.ok; }).slice(0, 8);
    }
    return out;
  }

  G.EdMeta = { mark: mark, tame: tame, isMark: isMark, read: read };
})(window);
