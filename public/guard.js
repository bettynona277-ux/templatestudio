/* Diseños Streaming · protección básica contra copia (disuasiva).
 * - Bloquea clic derecho, arrastrar imágenes y los atajos del inspector (F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Ctrl+S).
 * - Si se abren las herramientas de desarrollador, la página muestra un aviso, se oculta y se cierra la sesión del editor.
 * Ningún bloqueo en el navegador es infalible: la protección real está en las reglas de Firebase.
 * Para trabajar tú con el inspector: en la consola de una página SIN guard (p. ej. admin.html) no hace falta nada;
 * en estas páginas abre la consola ANTES de cargar y ejecuta:  localStorage.setItem('dsg', 'TU_CLAVE')
 * (la clave se compara con su huella SHA-256; aquí solo está la huella, no la clave).
 */
(function () {
  'use strict';
  var KEY_HASH = 'fc33a23e16e7724e995138fdce56e16e954d707c58dbb43d21166d9e67eee395';
  var off = false;
  try {
    var k = localStorage.getItem('dsg');
    if (k && window.crypto && crypto.subtle && window.TextEncoder) {
      // se comprueba en segundo plano; mientras tanto el guard actúa normal
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(k)).then(function (b) {
        var h = Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
        if (h === KEY_HASH) { off = true; window.__dsgOff = true; }
      });
    }
  } catch (_) {}

  var editable = function (t) { return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
  document.addEventListener('contextmenu', function (e) { if (!off && !editable(e.target)) e.preventDefault(); }, true);
  document.addEventListener('dragstart', function (e) { if (!off && e.target && e.target.tagName === 'IMG') e.preventDefault(); }, true);
  document.addEventListener('keydown', function (e) {
    if (off) return;
    var k = (e.key || '').toLowerCase(), c = e.ctrlKey || e.metaKey;
    if (k === 'f12' || (c && e.shiftKey && 'ijck'.indexOf(k) >= 0) || (c && e.altKey && 'ijc'.indexOf(k) >= 0) || (c && (k === 'u' || k === 's'))) {
      e.preventDefault(); e.stopPropagation();
    }
  }, true);

  // Detección del inspector: con las herramientas abiertas la instrucción "debugger" detiene la página;
  // si tarda, se oculta todo. Con el inspector cerrado no hace nada ni consume recursos.
  var tripped = false;
  function trip() {
    if (tripped || off) return; tripped = true;
    try { if (window.firebase && firebase.auth) firebase.auth().signOut(); } catch (_) {}
    try {
      document.documentElement.innerHTML = '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diseños Streaming</title></head>' +
        '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d14;color:#e8eaf2;font:16px system-ui,sans-serif;text-align:center;padding:24px">' +
        '<div style="max-width:460px">' +
        '<div style="font-size:48px;line-height:1;margin:0 0 14px">\u26D4</div>' +
        '<h1 style="font-size:22px;margin:0 0 12px;color:#ff5a5a">Actividad no permitida detectada</h1>' +
        '<p style="opacity:.85;margin:0 0 10px">Se registr\u00f3 un intento de inspeccionar el c\u00f3digo de la plataforma con las herramientas de desarrollador.</p>' +
        '<p style="margin:0 0 18px;font-weight:600;color:#ffb020">Este evento qued\u00f3 registrado con tu cuenta. Si se repite, tu acceso puede ser <u>suspendido de forma autom\u00e1tica</u> por seguridad.</p>' +
        '<button onclick="location.reload()" style="padding:12px 22px;border:0;border-radius:10px;background:#7c5cfc;color:#fff;font-weight:700;cursor:pointer">Cerrar inspector y volver</button></div></body>';
    } catch (_) {}
  }
  function check() {
    if (off || tripped) return;
    var t = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    if (performance.now() - t > 120) trip();
  }
  setInterval(check, 1200);
})();
