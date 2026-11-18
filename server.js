const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.svg':'image/svg+xml','.ico':'image/x-icon',
  '.otf':'font/otf','.ttf':'font/ttf',
  '.woff':'font/woff','.woff2':'font/woff2',
  '.webp':'image/webp','.gif':'image/gif'
};

function rawRGBAtoPNG(pixelData, width, height) {
  const data = Buffer.isBuffer(pixelData) ? pixelData : Buffer.from(pixelData);
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * (1 + width * 4) + 1 + x * 4;
      raw[di]=data[si]; raw[di+1]=data[si+1]; raw[di+2]=data[si+2]; raw[di+3]=data[si+3];
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 6 });
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = crc32.table || (crc32.table = (() => {
      const t = new Uint32Array(256);
      for (let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c;}
      return t;
    })());
    for (let i=0;i<buf.length;i++) crc=table[(crc^buf[i])&0xFF]^(crc>>>8);
    return (crc^0xFFFFFFFF)>>>0;
  }
  function chunk(type, data) {
    const t=Buffer.from(type), len=Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcBuf=Buffer.concat([t,data]), c=Buffer.alloc(4); c.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len,t,data,c]);
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4);
  ihdr[8]=8; ihdr[9]=6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr), chunk('IDAT',compressed), chunk('IEND',Buffer.alloc(0))
  ]);
}

async function parsePSDBuffer(psdBuf) {
  const agPsd = require('ag-psd');
  const { createCanvas } = require('canvas');
  agPsd.initializeCanvas(createCanvas);
  const psd = agPsd.readPsd(psdBuf, {
    skipLayerImageData: false,
    skipCompositeImageData: true,
    skipThumbnail: true,
  });
  const width = psd.width, height = psd.height;
  const layers = [];

  function hexColor(r,g,b){
    return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  }

  function readTextFontName(style){
    const candidates = [
      style.fontFamily, style.fontName, style.fontPostScriptName,
      style.font?.name, style.font?.family, style.font?.postScriptName,
      style.font?.fontFamily, style.font?.fontName, style.font?.fontPostScriptName,
    ].filter(Boolean);
    return String(candidates[0] || '').trim();
  }

  function cssFontFamily(fontName){
    const raw = String(fontName || '').replace(/[_-]+/g, ' ').trim();
    const n = raw.toLowerCase();
    if (!raw) return "'Poppins'";
    if (n.includes('bebas')) return "'Bebas Neue', sans-serif";
    if (n.includes('montserrat')) return "'Montserrat'";
    if (n.includes('poppins')) return "'Poppins'";
    if (n.includes('jakarta')) return "'Plus Jakarta Sans'";
    if (n.includes('horizon')) return "'Horizon'";
    if (n.includes('akira')) return "'Akira Expanded'";
    if (n.includes('podium')) return "'Podium Sharp'";
    if (n.includes('impact')) return 'Impact';
    if (n.includes('arial')) return 'Arial';
    if (n.includes('georgia')) return 'Georgia';
    if (n.includes('times')) return "'Times New Roman'";
    const cleaned = raw
      .replace(/\b(regular|italic|bold|black|heavy|medium|semibold|semi bold|extrabold|extra bold|light|thin)\b/ig, '')
      .replace(/\s+/g, ' ')
      .trim() || raw;
    return `'${cleaned.replace(/'/g, "\\'")}'`;
  }

  function fontWeightFromStyle(style, fontName){
    const explicit = style.fontWeight || style.weight;
    if (explicit) return String(explicit);
    if (style.bold || style.fauxBold) return '700';
    const n = String(fontName || '').toLowerCase();
    if (/black|heavy|extra\s*black/.test(n)) return '900';
    if (/extra\s*bold|ultra\s*bold/.test(n)) return '800';
    if (/semi\s*bold|demi\s*bold/.test(n)) return '600';
    if (/medium/.test(n)) return '500';
    if (/light/.test(n)) return '300';
    if (/thin|hairline/.test(n)) return '100';
    if (/bold/.test(n)) return '700';
    return '400';
  }

  function isItalicStyle(style, fontName){
    const styleName = String(style.fontStyle || style.style || style.font?.style || '').toLowerCase();
    const n = String(fontName || '').toLowerCase();
    return !!(style.italic || style.fauxItalic || /italic|oblique/.test(styleName) || /italic|oblique/.test(n));
  }

  function rotationFromTransform(transform){
    const m = Array.isArray(transform) ? transform : null;
    if (!m || m.length < 4) return 0;
    const a = Number(m[0]), b = Number(m[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    return Math.round((Math.atan2(b, a) * 180 / Math.PI) * 100) / 100;
  }

  function scaleFromTransform(transform){
    const m = Array.isArray(transform) ? transform : null;
    if (!m || m.length < 4) return 1;
    const a = Number(m[0]), b = Number(m[1]), c = Number(m[2]), d = Number(m[3]);
    const sx = Math.hypot(a, b);
    const sy = Math.hypot(c, d);
    const s = Math.max(sx || 0, sy || 0);
    return Number.isFinite(s) && s > 0 ? s : 1;
  }

  function unitValue(v){
    if (typeof v === 'number') return v;
    if (v && typeof v.value === 'number') return v.value;
    return null;
  }

  function textBoundsFromData(textData){
    const candidates = [
      textData?.bounds,
      textData?.boundingBox,
      textData?.boxBounds,
      textData?.textPath?.bounds,
    ];
    for (const b of candidates) {
      if (!b) continue;
      if (Array.isArray(b) && b.length >= 4) {
        const vals = b.map(unitValue);
        if (vals.every(v => Number.isFinite(v))) {
          const width = Math.max(Math.abs(vals[2] - vals[0]), Math.abs(vals[3] - vals[1]));
          const height = Math.min(Math.abs(vals[2] - vals[0]), Math.abs(vals[3] - vals[1]));
          if (width > 0 && height > 0) return { left: 0, top: 0, width, height };
        }
      } else {
        const top = unitValue(b.top), left = unitValue(b.left), right = unitValue(b.right), bottom = unitValue(b.bottom);
        if ([top,left,right,bottom].every(v => Number.isFinite(v)) && right > left && bottom > top) {
          return { left, top, width: right-left, height: bottom-top };
        }
      }
    }
    return null;
  }

  function estimateTextBox(text, fontSize, lineHeight, letterSpacing){
    const lines = String(text || '').split(/\r?\n/);
    const longestWordChars = Math.max(1, ...lines.flatMap(line => line.split(/\s+/).map(w => [...w].length)));
    const avgChar = fontSize * 0.62;
    const minWordWidth = (longestWordChars * avgChar) + Math.max(12, fontSize * 0.8);
    return {
      width: Math.ceil(minWordWidth),
      height: Math.ceil(Math.max(fontSize * (lineHeight || 1.2), lines.length * fontSize * (lineHeight || 1.2))),
    };
  }

  function processLayer(layer) {
    if (layer.children) { layer.children.forEach(processLayer); return; }
    const name = layer.name || 'Layer';
    if (name === '<group>' || name.startsWith('//')) return;

    const x=layer.left||0, y=layer.top||0;
    const w=(layer.right||0)-(layer.left||0), h=(layer.bottom||0)-(layer.top||0);
    const visible = layer.hidden !== true;
    const rawOpacity = layer.opacity !== undefined ? layer.opacity : 255;
    const opacity = rawOpacity <= 1 ? rawOpacity : rawOpacity / 255;
    const isText = !!layer.text;

    let src=null, textContent=null, fontSize=24, fontColor='#ffffff', fontWeight='400', textAlign='left', fontFamily="'Poppins'", italic=false, rotation=0, lineHeight=1.2, letterSpacing=0;
    let textBox = null;
    let textTransformScale = 1;

    if (isText) {
      const t = layer.text;
      textTransformScale = scaleFromTransform(t.transform || layer.transform);
      textContent = (t.text||name).replace(/\r/g,'\n').trim();
      textBox = textBoundsFromData(t);
      const style = t.style||{};
      const firstRun = (t.styleRuns&&t.styleRuns[0]) ? t.styleRuns[0].style : {};
      const ms = {...style,...firstRun};
      const fontName = readTextFontName(ms);
      const baseFontSize = Number(ms.fontSize) || fontSize;
      fontSize = Math.max(1, Math.round(baseFontSize * textTransformScale));
      if (ms.leading && Number(ms.leading) > 1) lineHeight = Math.max(0.7, Math.round((Number(ms.leading) / Math.max(1, baseFontSize)) * 100) / 100);
      if (ms.tracking || ms.letterSpacing) {
        const rawSpacing = Number(ms.tracking || ms.letterSpacing) || 0;
        letterSpacing = Math.abs(rawSpacing) > 10 ? Math.round((fontSize * rawSpacing / 1000) * 100) / 100 : rawSpacing;
      }
      fontFamily = cssFontFamily(fontName);
      fontWeight = fontWeightFromStyle(ms, fontName);
      italic = isItalicStyle(ms, fontName);
      rotation = rotationFromTransform(t.transform || layer.transform);
      if (ms.fillColor) { const c=ms.fillColor; if(c.r!==undefined) fontColor=hexColor(c.r,c.g,c.b); }
      else if (ms.color) { const c=ms.color; if(c.r!==undefined) fontColor=hexColor(c.r,c.g,c.b); }
      const para = t.paragraphStyle||(t.paragraphStyleRuns&&t.paragraphStyleRuns[0]?.style)||{};
      if (para.justification==='right') textAlign='right';
      else if (para.justification==='center') textAlign='center';
    } else {
      try {
        if (w > 0 && h > 0 && layer.canvas) {
          // ag-psd renders layer to canvas when initializeCanvas is set
          src = 'data:image/png;base64,' + layer.canvas.toBuffer('image/png').toString('base64');
        } else if (w > 0 && h > 0 && layer.imageData) {
          const img = layer.imageData;
          const png = rawRGBAtoPNG(img.data, img.width||w, img.height||h);
          src = 'data:image/png;base64,' + png.toString('base64');
        }
      } catch(e) { console.warn('Layer export failed:', name, e.message); }
    }

    if (src !== null || isText) {
      let outX = x, outY = y, outW = w || 200, outH = h || 50;
      if (isText) {
        const estimate = estimateTextBox(textContent || name, fontSize, lineHeight, letterSpacing);
        if (textBox) {
          outW = Math.max(outW, Math.round((textBox.width || 0) * textTransformScale), estimate.width);
          outH = Math.max(outH, Math.round((textBox.height || 0) * textTransformScale), estimate.height);
        } else {
          outW = Math.max(outW, estimate.width);
          outH = Math.max(outH, estimate.height);
        }
      }
      layers.push({ id:layers.length, name, isText, visible, x:outX, y:outY, width:outW, height:outH, w:outW, h:outH, opacity, src, textContent, fontSize, fontColor, fontFamily, fontWeight, italic, textAlign, rotation, lineHeight, letterSpacing });
    }
  }

  if (psd.children) psd.children.forEach(processLayer);
  // Assign z-index: first layer in array = bottom, last = top (matches Photoshop order)
  layers.forEach((l, i) => { l.zIndex = i; });
  console.log(`ag-psd: ${layers.length} layers from ${width}x${height}`);
  return { width, height, layers };
}

function findHermesPython() {
  const candidates = [];
  if (process.env.HERMES_PYTHON) candidates.push(process.env.HERMES_PYTHON);
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const roots = [];
    const packages = path.join(localAppData, 'Packages');
    if (fs.existsSync(packages)) {
      for (const name of fs.readdirSync(packages)) {
        if (name.toLowerCase().startsWith('openai.codex_')) roots.push(path.join(packages, name, 'LocalCache', 'Local', 'hermes', 'installs'));
      }
    }
    roots.push(path.join(localAppData, 'hermes', 'installs'));
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      for (const install of fs.readdirSync(root)) {
        const factsPath = path.join(root, install, 'facts.json');
        try {
          const facts = JSON.parse(fs.readFileSync(factsPath, 'utf8'));
          const recorded = facts?.packages?.venv?.environment;
          if (recorded) candidates.push(path.join(recorded, 'Scripts', 'python.exe'));
        } catch { /* fall through to discovery */ }
        const envRoot = path.join(root, install, 'environments');
        if (!fs.existsSync(envRoot)) continue;
        for (const env of fs.readdirSync(envRoot)) candidates.push(path.join(envRoot, env, 'venv', 'Scripts', 'python.exe'));
      }
    }
  }
  return candidates.find(fs.existsSync) || null;
}

function findHermesRuntimePython() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const packages = path.join(localAppData, 'Packages');
  const roots = [];
  if (fs.existsSync(packages)) {
    for (const name of fs.readdirSync(packages)) {
      if (name.toLowerCase().startsWith('openai.codex_')) {
        roots.push(path.join(packages, name, 'LocalCache', 'Local', 'hermes'));
      }
    }
  }
  roots.push(path.join(localAppData, 'hermes'));
  const matches = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const tools = path.join(root, 'tools');
    if (!fs.existsSync(tools)) continue;
    for (const name of fs.readdirSync(tools)) {
      if (name.startsWith('python-')) matches.push(path.join(tools, name, 'python.exe'));
    }
  }
  return matches.find(fs.existsSync) || null;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > 256 * 1024) { reject(new Error('Solicitud demasiado grande')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

function runHermes(prompt) {
  return new Promise((resolve, reject) => {
    const python = findHermesRuntimePython() || findHermesPython();
    if (!python) { reject(new Error('No se encontró el entorno Python de Hermes.')); return; }
    const localAppData = process.env.LOCALAPPDATA || '';
    const packages = path.join(localAppData, 'Packages');
    const codex = fs.existsSync(packages) ? fs.readdirSync(packages).find(name => name.toLowerCase().startsWith('openai.codex_')) : null;
    const packageHome = codex ? path.join(packages, codex, 'LocalCache', 'Local', 'hermes') : '';
    const home = process.env.HERMES_HOME || packageHome || path.join(localAppData, 'hermes');
    let repo = process.env.HERMES_REPO || path.join(packageHome, 'hermes-agent');
    if (!repo && process.env.LOCALAPPDATA) {
      if (codex) repo = path.join(packages, codex, 'LocalCache', 'Local', 'hermes', 'hermes-agent');
    }
    if (!repo || !fs.existsSync(repo)) { reject(new Error('No se encontró el código instalado de Hermes.')); return; }
    const bootstrap = "import sys,runpy; sys.path.insert(0, sys.argv[1]); sys.argv=['hermes','-z',sys.argv[2]]; runpy.run_module('hermes_cli.main', run_name='__main__')";
    const args = python.includes(`${path.sep}tools${path.sep}`)
      ? ['-I', '-c', bootstrap, repo, prompt]
      : ['-m', 'hermes_cli.main', '-z', prompt];
    const child = spawn(python, args, {
      cwd: repo,
      env: { ...process.env, HERMES_HOME: home, PYTHONIOENCODING: 'utf-8' },
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Hermes no respondió en 45 segundos. Revisa el proveedor gratuito o vuelve a intentarlo.')); }, 45000);
    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => { stderr += data.toString(); });
    child.on('error', err => { clearTimeout(timer); reject(err); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error((stderr || stdout || `Hermes terminó con código ${code}`).trim()));
      else resolve((stdout || stderr).trim());
    });
  });
}

async function runHermesPipeline(message, onStage) {
  const base = [
    'Trabajas dentro del cockpit de Hermes.',
    'Responde en español, con pasos concretos.',
    'No simules acciones: usa las herramientas y reporta lo que realmente ocurrió.',
    'Antes de enviar mensajes, borrar datos, pagar o cambiar información sensible, pide confirmación explícita.',
  ].join(' ');
  onStage('planning');
  const plan = await runHermes(`${base}\n\nROL: Planificador. Analiza esta tarea, identifica la web y los datos necesarios, y crea un plan breve. No ejecutes todavía.\nTAREA: ${message}`);
  onStage('executing');
  const execution = await runHermes(`${base}\n\nROL: Ejecutor. Realiza la tarea usando navegador y herramientas. Sigue este plan:\n${plan}\n\nTAREA ORIGINAL: ${message}`);
  onStage('verifying');
  const verification = await runHermes(`${base}\n\nROL: Verificador y corrector. Comprueba si la tarea quedó realmente hecha. Si falta algo, corrígelo con herramientas cuando sea seguro; si requiere autorización, detente y dilo. Devuelve un resumen breve y honesto.\nTAREA ORIGINAL: ${message}\nPLAN:\n${plan}\nRESULTADO DEL EJECUTOR:\n${execution}`);
  return verification;
}

const hermesJobs = new Map();

// ---------- Tiendas públicas de revendedores: /s/<slug> ----------
// Sirve public/tienda.html con Open Graph inyectado (vista previa en WhatsApp).
const TIENDA_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
const TIENDA_FIRESTORE = {
  projectId: 'plantillas-bfaeb',
  apiKey: 'AIzaSyA2zuPnReyy7eeTC8Lw_UfkfSg96-V5UnY', // clave web pública (la misma de landing-core.js)
  collection: 'public_catalogs'
};
const TIENDA_CACHE_MS = 60 * 1000;
const TIENDA_NOTFOUND_CACHE_MS = 120 * 1000;
const tiendaCache = new Map();
const TIENDA_ORIGIN = String(process.env.PUBLIC_ORIGIN || 'https://disenosstreaming.com').replace(/\/+$/, '');
// Misma lista que RESERVED en public/js/landing-core.js.
const TIENDA_RESERVED = new Set(['admin', 'api', 'dev', 'gestor', 'login', 'editor', 'tienda', 'landing', 's', 'www', 'app', 'soporte', 'help', 'disenosstreaming', 'js', 'logos', 'icons', 'fonts', 'docs', 'functions', 'scripts', 'assets', 'css', 'offline', 'index', 'manifest', 'sw', 'backup', 'catalogo', 'publicidad', 'precios', 'contacto', 'registro', 'cuenta', 'mi-landing', 'mi-pagina']);
const tiendaValidTarget = v => typeof v === 'string' && v.length >= 3 && TIENDA_SLUG_RE.test(v) && !TIENDA_RESERVED.has(v);

// Límite simple por IP en /s/: pasado el límite se sirve el HTML sin OG y sin consultar Firestore.
const TIENDA_RATE_MAX = 60;
const TIENDA_RATE_WINDOW_MS = 60 * 1000;
const tiendaRate = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, r] of tiendaRate) if (r.reset <= now) tiendaRate.delete(ip);
}, TIENDA_RATE_WINDOW_MS).unref();
function tiendaAllowed(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';
  const now = Date.now();
  let r = tiendaRate.get(ip);
  if (!r || r.reset <= now) { r = { count: 0, reset: now + TIENDA_RATE_WINDOW_MS }; tiendaRate.set(ip, r); }
  r.count++;
  return r.count <= TIENDA_RATE_MAX;
}

function tiendaFromRest(v) {
  if (v === null || typeof v !== 'object') return v === undefined ? null : v;
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return String(v.stringValue);
  if ('booleanValue' in v) return v.booleanValue === true || v.booleanValue === 'true';
  if ('integerValue' in v) { const n = Number(v.integerValue); return Number.isSafeInteger(n) ? n : String(v.integerValue); }
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('timestampValue' in v) return String(v.timestampValue);
  if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(tiendaFromRest);
  if ('mapValue' in v) {
    const out = {}; const f = (v.mapValue && v.mapValue.fields) || {};
    for (const k of Object.keys(f)) if (k !== '__proto__') out[k] = tiendaFromRest(f[k]);
    return out;
  }
  return null;
}

// Devuelve { found:true, data } | { found:false } | null (error / timeout).
async function tiendaFetch(slug) {
  const hit = tiendaCache.get(slug);
  if (hit && hit.expires > Date.now()) return hit.value;
  const url = `https://firestore.googleapis.com/v1/projects/${TIENDA_FIRESTORE.projectId}/databases/(default)/documents/` +
    `${TIENDA_FIRESTORE.collection}/${encodeURIComponent(slug)}?key=${TIENDA_FIRESTORE.apiKey}`;
  let value = null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2500), headers: { Referer: 'https://disenosstreaming.com/' } });
    if (r.status === 404) value = { found: false };
    else if (r.ok) { const doc = await r.json(); value = doc && doc.fields ? { found: true, data: tiendaFromRest({ mapValue: { fields: doc.fields } }), fields: doc.fields } : { found: false }; }
  } catch (err) {
    console.warn('Tienda OG fetch:', err.message);
  }
  if (value) {
    value.t = Date.now(); // momento de la lectura: la tienda lo usa para no volver a leer Firestore
    if (tiendaCache.size > 500) tiendaCache.delete(tiendaCache.keys().next().value);
    tiendaCache.set(slug, { value, expires: Date.now() + (value.found ? TIENDA_CACHE_MS : TIENDA_NOTFOUND_CACHE_MS) });
  }
  return value;
}

const tiendaEsc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tiendaText = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
function tiendaImage(v, kind) {
  let u;
  try { u = new URL(String(v || '')); } catch { return ''; }
  if (u.protocol !== 'https:' || u.username || u.password) return '';
  // Cloudinary: versión ligera y con el tamaño que WhatsApp/Facebook esperan.
  if (u.hostname === 'res.cloudinary.com' && /\/image\/upload\//.test(u.pathname)) {
    const t = kind === 'cover' ? 'c_fill,w_1200,h_630,q_auto,f_jpg' : 'c_pad,w_600,h_600,b_white,q_auto,f_jpg';
    // Quita el f_auto,q_auto/ que ya trae la URL (f_auto podría servir webp/avif a los rastreadores).
    u.pathname = u.pathname.replace(/\/image\/upload\/(?:[fq]_auto(?:,[fq]_auto)*\/)+/, '/image/upload/')
      .replace('/image/upload/', `/image/upload/${t}/`);
  }
  return u.href;
}

function tiendaOrigin() { return TIENDA_ORIGIN; }

// Inserta los datos de la tienda en el HTML (<!--TIENDA_DATA-->) para que el navegador del visitante
// no tenga que leer Firestore: así cada tienda gasta como máximo 1 lectura por minuto (caché del servidor).
function tiendaInjectData(html, slug, result, extra = {}) {
  if (!html.includes('<!--TIENDA_DATA-->')) return html;
  // Dominio propio: siempre se inyecta al menos {slug, host} (en "/" la tienda no puede leer el slug de la ruta).
  const base = extra.host ? { slug, host: extra.host } : { slug };
  let payload = null;
  if (result && extra.unavailable) payload = { ...base, t: result.t || Date.now(), unavailable: true };
  else if (result && result.found) payload = result.fields ? { ...base, t: result.t || Date.now(), doc: { fields: result.fields } } : null;
  else if (result) payload = { ...base, t: result.t || Date.now(), notFound: true };
  if (!payload && extra.host) payload = base;
  if (!payload) return html.replace('<!--TIENDA_DATA-->', '');
  const json = JSON.stringify(payload).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return html.replace('<!--TIENDA_DATA-->', () => `<script>window.__TIENDA__=${json}</script>`);
}

function tiendaInjectOg(html, data, slug, origin, pageUrlIn) {
  const name = tiendaText(data.name, 80) || 'Tienda de streaming';
  const desc = tiendaText(data.tagline, 120) || tiendaText(data.heroSubtitle, 200) || `Planes de streaming de ${name}. Pide por WhatsApp.`;
  const image = tiendaImage(data.coverUrl, 'cover') || tiendaImage(data.logoUrl, 'logo') || `${origin}/icons/icon-512.png`;
  const color = /^#[0-9a-f]{6}$/i.test(String(data.theme && data.theme.primary || '')) ? data.theme.primary : '';
  const pageUrl = pageUrlIn || `${origin}/${slug}`;
  const tags = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${tiendaEsc(name)}">`,
    `<meta property="og:title" content="${tiendaEsc(name)}">`,
    `<meta property="og:description" content="${tiendaEsc(desc)}">`,
    `<meta property="og:url" content="${tiendaEsc(pageUrl)}">`,
    `<meta property="og:image" content="${tiendaEsc(image)}">`,
    `<meta property="og:image:alt" content="${tiendaEsc(name)}">`,
    `<meta property="og:locale" content="es_LA">`,
    `<meta name="twitter:card" content="${data.coverUrl ? 'summary_large_image' : 'summary'}">`,
    `<link rel="canonical" href="${tiendaEsc(pageUrl)}">`
  ].join('\n');
  // Reemplazos con función: evita que "$&", "$'"… del texto del usuario se interpreten.
  let out = html.replace('<!--TIENDA_OG-->', () => tags)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${tiendaEsc(name)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${tiendaEsc(desc)}">`);
  if (color) out = out.replace(/<meta name="theme-color" content="[^"]*">/, () => `<meta name="theme-color" content="${color}">`);
  return out;
}

// opts.short: petición a /<slug> (enlace corto). Si la tienda no existe, devuelve false
// para que el servidor siga con los archivos estáticos (no rompe otras rutas).
// Plan VIP vencido (vip === true y vipUntil ya pasó): la tienda no se muestra.
// vipUntil null/ausente = sin vencimiento; un valor que no sea un número positivo cuenta como vencido (falla cerrado).
function tiendaVipExpired(data, now = Date.now()) {
  if (!data || data.vip !== true) return false;
  const u = data.vipUntil;
  if (u === null || u === undefined || u === '') return false;
  const n = Number(u);
  return !(Number.isFinite(n) && n > 0) || n <= now;
}
// La tienda no se muestra (sin datos del revendedor): VIP vencido o cuenta inhabilitada por el admin.
const tiendaUnavailable = data => tiendaVipExpired(data) || !!(data && data.enabled === false && data.pausedByAdmin === true && !data.redirectTo);
const TIENDA_GENERIC = { name: 'Tienda de streaming', tagline: 'Cuentas y perfiles de streaming con atención por WhatsApp.' };

// opts.host: dominio propio (plan VIP). La tienda se sirve en https://<host>/ con OG canónico de ese dominio.
async function serveTienda(req, res, rawSlug, url, opts = {}) {
  let slug = '';
  try { slug = decodeURIComponent(rawSlug); } catch { slug = ''; }
  const lower = slug.toLowerCase();
  if (opts.dev || opts.host) slug = lower;
  else if (lower !== slug && TIENDA_SLUG_RE.test(lower)) {
    res.writeHead(301, { Location: `/${lower}`, 'Cache-Control': 'no-cache' }); res.end(); return true;
  }
  let html;
  // Si falta public/tienda.html (producción aún sin la tienda), se usa la de /dev/ con sus scripts de /dev/js/.
  let useDev = !!opts.dev;
  try { html = await fs.promises.readFile(path.join(__dirname, 'public', useDev ? 'dev' : '', 'tienda.html'), 'utf8'); }
  catch {
    try { if (useDev) throw 0; html = await fs.promises.readFile(path.join(__dirname, 'public', 'dev', 'tienda.html'), 'utf8'); useDev = true; }
    catch { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Tienda no disponible'); return true; }
  }
  let status = 200;
  const origin = opts.host ? `https://${opts.host}` : tiendaOrigin();
  if (!TIENDA_SLUG_RE.test(slug)) status = 404;
  else {
    const allowed = tiendaAllowed(req);
    let result = allowed ? await tiendaFetch(slug) : null;
    // Enlace corto a algo que no es una tienda: dejar que siga el flujo normal del sitio.
    if (opts.short && result && !result.found) return false;
    let data = (result && result.found && result.data) || {};
    // Enlace viejo ("lápida" tras cambiar el slug): un solo salto; ?r=1 evita bucles.
    const target = data.redirectTo;
    if (opts.host) {
      // Dominio propio: no se redirige fuera del dominio; se sirve aquí mismo la tienda nueva (un solo salto).
      if (result && result.found && tiendaValidTarget(target) && target !== slug) {
        const next = await tiendaFetch(target);
        if (next && next.found && !(next.data && next.data.redirectTo)) { slug = target; result = next; data = next.data || {}; }
      }
    } else if (!opts.dev && result && result.found && tiendaValidTarget(target) && target !== slug && !url.searchParams.has('r')) {
      res.writeHead(301, { Location: `/${target}?r=1`, 'Cache-Control': 'no-cache' }); res.end(); return true;
    }
    // Subdominio VIP: solo para tiendas VIP; las demás van a su enlace normal en disenosstreaming.com.
    if (opts.sub && result && result.found && data.vip !== true) { redirectExternal(res, `${TIENDA_ORIGIN}/${encodeURIComponent(slug)}`); return true; }
    const pageUrl = opts.host ? `${origin}/` : undefined;
    const expired = !!(result && result.found && tiendaUnavailable(data));
    if (result && result.found) {
      // En pausa o VIP vencido: vista previa genérica, sin datos del revendedor.
      html = (data.enabled === false || expired)
        ? tiendaInjectOg(html, TIENDA_GENERIC, slug, origin, pageUrl)
        : tiendaInjectOg(html, data, slug, origin, pageUrl);
    } else if (result && !result.found) status = 404;
    html = tiendaInjectData(html, slug, result, { host: opts.host || '', unavailable: expired });
  }
  html = html.replace('<!--TIENDA_DATA-->', '');
  // Dominio propio servido con la tienda de /dev/: sus scripts están en /dev/js/.
  if (useDev && !opts.dev || opts.host && opts.dev) html = html.replace('<head>', () => '<head><script>window.__TIENDA_BASE__="/dev/"</script>');
  // Dominio propio: el mismo URL da otra página según X-Tienda-Host → que ninguna caché compartida la guarde.
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': opts.host ? 'private, no-cache' : 'no-cache', 'X-Content-Type-Options': 'nosniff' });
  res.end(req.method === 'HEAD' ? undefined : html);
  return true;
}

function serveStatic(req, res, url, fallbackIndex) {
  let filePath = url.pathname==='/' ? '/index.html' : url.pathname;
  // Decodifica %20 (logos con espacios) y bloquea rutas fuera de public/.
  try { filePath = decodeURIComponent(filePath); } catch { res.writeHead(400); res.end('Bad Request'); return; }
  if (filePath.includes('\0')) { res.writeHead(400); res.end('Bad Request'); return; }
  const publicRoot = path.join(__dirname,'public');
  filePath = path.join(publicRoot,filePath);
  if (filePath !== publicRoot && !filePath.startsWith(publicRoot + path.sep)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  try {
  fs.readFile(filePath,(err,data)=>{
    if (err) {
      // Dominio propio: un recurso que no existe es 404 (no la portada de disenosstreaming.com).
      if (!fallbackIndex) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); return; }
      fs.readFile(path.join(__dirname,'public','index.html'),(e2,d2)=>{
        if (e2){res.writeHead(404);res.end('Not found');return;}
        res.writeHead(200,{'Content-Type':'text/html'});res.end(d2);
      });
      return;
    }
    const ext=path.extname(filePath);
    const headers={'Content-Type':MIME[ext]||'application/octet-stream'};
    // /js/ y /logos/: caché de 1 h (los scripts llevan ?v=N) y gzip si el cliente lo acepta.
    if (/^\/(js|logos)\//.test(url.pathname)) {
      headers['Cache-Control']='public, max-age=3600';
      if (['.js','.css','.svg','.html'].includes(ext.toLowerCase())) {
        headers['Vary']='Accept-Encoding';
        if (/\bgzip\b/.test(String(req.headers['accept-encoding']||''))) {
          data=zlib.gzipSync(data); headers['Content-Encoding']='gzip';
        }
      }
    }
    res.writeHead(200,headers);
    res.end(data);
  });
  } catch (err) {
    console.error('Static error:', err.message);
    if (!res.headersSent) res.writeHead(400);
    res.end('Bad Request');
  }
}

// ---------- Dominio propio de la tienda (plan VIP) ----------
// Rafa tiene el dominio en Cloudflare; un Worker reenvía todo a https://disenosstreaming.com con la cabecera
// X-Tienda-Host: <dominio>. También funciona si el dominio apunta directo a Railway (cabecera Host).
// custom_domains/{host} = { slug, ownerUid } (lo escribe el admin; lectura pública por REST).
const OWN_HOSTS = new Set(['disenosstreaming.com', 'www.disenosstreaming.com', 'localhost']);
try { OWN_HOSTS.add(new URL(TIENDA_ORIGIN).hostname); } catch {}
String(process.env.OWN_HOSTS || '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean).forEach(h => OWN_HOSTS.add(h));
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const DOMAIN_CACHE_MS = 5 * 60 * 1000;
const DOMAIN_ERROR_CACHE_MS = 15 * 1000;
const domainCache = new Map();
function cleanHost(v) {
  let h = String(Array.isArray(v) ? v[0] : (v || '')).trim().toLowerCase();
  if (h.startsWith('[')) return h; // IPv6 literal
  return h.replace(/:\d+$/, '').replace(/\.+$/, '');
}
/** '' = sitio propio (comportamiento de siempre) | dominio de una tienda | '!' = host inválido. */
function customHostOf(req) {
  const h = cleanHost(req.headers['x-tienda-host']) || cleanHost(req.headers.host);
  if (!h || OWN_HOSTS.has(h) || h.startsWith('[') || /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || !h.includes('.')) return '';
  if (/(^|\.)railway\.app$/.test(h) || /(^|\.)disenosstreaming\.com$/.test(h) || /(^|\.)railway\.internal$/.test(h)) return '';
  return h.length <= 253 && DOMAIN_RE.test(h) ? h : '!';
}
// Límite de lecturas de custom_domains SIN caché (X-Tienda-Host lo puede mandar cualquiera: hosts aleatorios no
// deben convertirse en lecturas de Firestore ilimitadas). Por IP y global, por minuto.
const DOMAIN_LOOKUP_IP_MAX = 20;
const DOMAIN_LOOKUP_GLOBAL_MAX = 200;
const DOMAIN_CACHE_MAX = 5000;
const domainLookupRate = new Map();
let domainLookupGlobal = { count: 0, reset: 0 };
setInterval(() => {
  const now = Date.now();
  for (const [ip, r] of domainLookupRate) if (r.reset <= now) domainLookupRate.delete(ip);
  for (const [h, e] of domainCache) if (e.expires <= now) domainCache.delete(h);
}, 60 * 1000).unref();
function domainLookupAllowed(req) {
  const now = Date.now();
  if (domainLookupGlobal.reset <= now) domainLookupGlobal = { count: 0, reset: now + 60 * 1000 };
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';
  let r = domainLookupRate.get(ip);
  if (!r || r.reset <= now) { r = { count: 0, reset: now + 60 * 1000 }; domainLookupRate.set(ip, r); }
  if (r.count >= DOMAIN_LOOKUP_IP_MAX || domainLookupGlobal.count >= DOMAIN_LOOKUP_GLOBAL_MAX) return false;
  r.count++; domainLookupGlobal.count++;
  return true;
}
/** { slug } | { missing:true } | null (error de red) | { limited:true }. Caché 5 min (también "no existe"). */
async function customDomainLookup(host, req) {
  const hit = domainCache.get(host);
  if (hit && hit.expires > Date.now()) return hit.value;
  if (req && !domainLookupAllowed(req)) return { limited: true };
  const url = `https://firestore.googleapis.com/v1/projects/${TIENDA_FIRESTORE.projectId}/databases/(default)/documents/` +
    `custom_domains/${encodeURIComponent(host)}?key=${TIENDA_FIRESTORE.apiKey}`;
  let value = null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2500), headers: { Referer: 'https://disenosstreaming.com/' } });
    if (r.status === 404) value = { missing: true };
    else if (r.ok) {
      const doc = await r.json();
      const slug = String(tiendaFromRest(doc && doc.fields && doc.fields.slug) || '').toLowerCase();
      value = TIENDA_SLUG_RE.test(slug) ? { slug } : { missing: true };
    }
  } catch (err) {
    console.warn('Dominio propio:', host, err.message);
  }
  if (domainCache.size >= DOMAIN_CACHE_MAX) domainCache.delete(domainCache.keys().next().value);
  domainCache.set(host, { value, expires: Date.now() + (value ? DOMAIN_CACHE_MS : DOMAIN_ERROR_CACHE_MS) });
  return value;
}
// Subdominios VIP gratis: <slug>.planesvip.com muestra la tienda <slug> (sin custom_domains: el slug es el subdominio).
// Más bases separadas por coma en la variable SUBDOMAIN_BASES de Railway.
const SUBDOMAIN_BASES = ['planesvip.com'].concat(String(process.env.SUBDOMAIN_BASES || '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean));
const SUB_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
/** { base, label } si host es <label>.<base> o la base misma (label ''); si no, null. */
function subdomainOf(host) {
  for (const base of SUBDOMAIN_BASES) {
    if (host === base) return { base, label: '' };
    if (host.endsWith('.' + base)) return { base, label: host.slice(0, -(base.length + 1)) };
  }
  return null;
}
// Redirección a una URL que el Worker NO debe reescribir al dominio de la tienda (X-Tienda-External).
function redirectExternal(res, location, code = 302) {
  res.writeHead(code, { Location: location, 'Cache-Control': 'no-store', 'X-Tienda-External': '1' }); res.end();
}
// Mientras public/tienda.html (producción) sea la versión vieja (sin <!--TIENDA_DATA-->), los dominios propios y
// subdominios usan la de /dev/ con sus scripts de /dev/js/. Al pasar la nueva a producción cambia solo.
let tiendaProdReady = null;
async function customTiendaFromDev() {
  if (tiendaProdReady === null || Date.now() - tiendaProdReady.t > 60000) {
    let ok = false;
    try { ok = (await fs.promises.readFile(path.join(__dirname, 'public', 'tienda.html'), 'utf8')).includes('<!--TIENDA_DATA-->'); } catch {}
    tiendaProdReady = { ok, t: Date.now() };
  }
  return !tiendaProdReady.ok;
}
// Recursos que se sirven tal cual en el dominio propio (todo lo demás muestra la tienda).
const CUSTOM_STATIC_RE = /^\/(?:(?:dev\/)?(?:js|logos|icons|fonts)\/.+|favicon[^/]*|sw\.js|manifest\.(?:json|webmanifest)|robots\.txt)$/;
function simplePage(res, status, title, text, req) {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<meta name="robots" content="noindex"><title>${tiendaEsc(title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;` +
    `background:#0b0b12;color:#f5f5fa;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:center;padding:24px;box-sizing:border-box}` +
    `h1{font-size:1.3rem;margin:0 0 8px}p{color:#b7b7c9;margin:0}</style></head><body><main><h1>${tiendaEsc(title)}</h1><p>${tiendaEsc(text)}</p></main></body></html>`;
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(req && req.method === 'HEAD' ? undefined : html);
}
async function serveCustomDomain(req, res, url, host) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end('Método no permitido'); return;
  }
  if (host === '!') { simplePage(res, 404, 'Dominio no configurado', 'Este dominio no está conectado a ninguna tienda.', req); return; }
  if (CUSTOM_STATIC_RE.test(url.pathname)) { serveStatic(req, res, url, false); return; }
  const fromDev = await customTiendaFromDev();
  // Subdominio VIP: <slug>.planesvip.com (la base sola y www van a la web principal).
  const sub = subdomainOf(host);
  if (sub) {
    if (!sub.label || sub.label === 'www') { redirectExternal(res, TIENDA_ORIGIN + '/'); return; }
    if (!SUB_LABEL_RE.test(sub.label)) { simplePage(res, 404, 'Tienda no encontrada', 'Revisa que el enlace esté bien escrito.', req); return; }
    await serveTienda(req, res, sub.label, url, { host, sub: true, dev: fromDev }); return;
  }
  const map = await customDomainLookup(host, req);
  if (!map || map.limited) { res.setHeader('Retry-After', '10'); simplePage(res, 503, 'Tienda no disponible', 'No pudimos cargar la tienda. Vuelve a intentarlo en unos segundos.', req); return; }
  if (map.missing) { simplePage(res, 404, 'Dominio no configurado', 'Este dominio no está conectado a ninguna tienda.', req); return; }
  await serveTienda(req, res, map.slug, url, { host, dev: fromDev });
}

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, `http://localhost:${PORT}`); }
  catch { res.writeHead(400); res.end('Bad Request'); return; }
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method==='OPTIONS') { res.writeHead(200); res.end(); return; }

  // Dominio propio de una tienda VIP (p. ej. berthastreaming.com): todo se resuelve aquí.
  // En disenosstreaming.com (y localhost / *.railway.app) customHostOf devuelve '' y nada cambia.
  const customHost = customHostOf(req);
  if (customHost) { await serveCustomDomain(req, res, url, customHost); return; }

  // The landing editor uses this same-origin route. Railway keeps the Firebase
  // Function URL in LANDING_API_URL, so it is never exposed in public JS.
  if (url.pathname.startsWith('/api/landing/')) {
    const base = process.env.LANDING_API_URL;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (!base) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'La publicación aún no está conectada. Configura LANDING_API_URL en Railway.' }));
      return;
    }
    try {
      const target = new URL(base.replace(/\/$/, '') + url.pathname.slice('/api/landing'.length));
      target.search = url.search;
      const headers = {};
      for (const name of ['authorization', 'content-type', 'origin']) {
        if (req.headers[name]) headers[name] = req.headers[name];
      }
      const body = ['GET', 'HEAD'].includes(req.method) ? undefined : req;
      const upstream = await fetch(target, { method: req.method, headers, body, duplex: body ? 'half' : undefined });
      const responseBody = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': upstream.headers.get('cache-control') || 'no-store'
      });
      res.end(responseBody);
    } catch (err) {
      console.error('Landing proxy error:', err.message);
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'No se pudo conectar con el servicio de landing.' }));
    }
    return;
  }

  if (req.method==='POST' && url.pathname==='/api/parse-psd') {
    try {
      const chunks=[]; let total=0;
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
        total += chunk.length;
        if (total > 200*1024*1024) { res.writeHead(413); res.end(JSON.stringify({error:'Max 200MB'})); return; }
      }
      const body = Buffer.concat(chunks);
      const ct = req.headers['content-type']||'';
      const boundary = ct.split('boundary=')[1];
      let psdBuf = body;
      if (boundary) {
        const em = Buffer.from('\r\n--'+boundary);
        let hdrEnd=-1;
        for (let i=0;i<Math.min(body.length,4000);i++) {
          if (body[i]===13&&body[i+1]===10&&body[i+2]===13&&body[i+3]===10){hdrEnd=i+4;break;}
        }
        if (hdrEnd<0) throw new Error('Bad multipart');
        let dataEnd=body.length;
        for (let i=hdrEnd;i<body.length-em.length;i++) {
          if (body.slice(i,i+em.length).equals(em)){dataEnd=i;break;}
        }
        psdBuf = body.slice(hdrEnd,dataEnd);
      }
      console.log(`Processing PSD: ${(psdBuf.length/1024/1024).toFixed(1)}MB`);
      const result = await parsePSDBuffer(psdBuf);
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify(result));
    } catch(err) {
      console.error('PSD error:',err.message);
      res.writeHead(500,{'Content-Type':'application/json'});
      res.end(JSON.stringify({error:err.message}));
    }
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/hermes/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const job = hermesJobs.get(url.pathname.slice('/api/hermes/'.length));
    if (!job) { res.writeHead(404); res.end(JSON.stringify({ error: 'Tarea no encontrada.' })); return; }
    res.writeHead(200); res.end(JSON.stringify(job));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/browser/start') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const script = path.join(__dirname, 'agente-local', 'Iniciar-Chrome-Agente.ps1');
    if (!fs.existsSync(script)) {
      res.writeHead(500); res.end(JSON.stringify({ error: 'No se encontró el iniciador del navegador de trabajo.' })); return;
    }
    try {
      const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-Port', '9222', '-SkipOllama'], {
        cwd: path.dirname(script), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
      });
      let output = '';
      child.stdout.on('data', chunk => { output += chunk.toString(); });
      child.stderr.on('data', chunk => { output += chunk.toString(); });
      const timer = setTimeout(() => { child.kill(); }, 40000);
      child.on('close', async code => {
        clearTimeout(timer);
        try {
          const probe = await fetch('http://127.0.0.1:9222/json/version');
          const info = await probe.json();
          res.writeHead(200); res.end(JSON.stringify({ ok: true, port: 9222, browser: info.Browser || 'Chrome', output: output.trim() }));
        } catch {
          res.writeHead(502); res.end(JSON.stringify({ error: 'El navegador no abrió el puerto de control.', output: output.trim(), code }));
        }
      });
      child.on('error', error => { clearTimeout(timer); res.writeHead(500); res.end(JSON.stringify({ error: error.message })); });
    } catch (error) { res.writeHead(500); res.end(JSON.stringify({ error: error.message })); }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/hermes') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const body = await readJsonBody(req);
      const message = String(body.message || '').trim();
      if (!message) { res.writeHead(400); res.end(JSON.stringify({ error: 'Escribe o dicta una instrucción.' })); return; }
      const system = [
        'Eres el coordinador del cockpit de Hermes.',
        'Responde en español, de forma breve y hablada.',
        'Usa navegador y herramientas cuando la tarea lo requiera.',
        'Antes de enviar mensajes, borrar datos, pagar o cambiar información sensible, pide confirmación explícita.',
        'Si una acción no se pudo realizar, dilo claramente y no la simules.',
      ].join(' ');
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      hermesJobs.set(id, { id, status: 'working', answer: null, error: null, createdAt: new Date().toISOString() });
      runHermesPipeline(message, stage => {
        const current = hermesJobs.get(id);
        if (current) hermesJobs.set(id, { ...current, stage });
      })
        .then(answer => hermesJobs.set(id, { ...hermesJobs.get(id), status: 'done', answer }))
        .catch(error => hermesJobs.set(id, { ...hermesJobs.get(id), status: 'error', error: error.message }))
        .finally(() => setTimeout(() => hermesJobs.delete(id), 15 * 60 * 1000));
      res.writeHead(202); res.end(JSON.stringify({ jobId: id, status: 'working' }));
    } catch (err) {
      console.error('Hermes cockpit error:', err.message);
      res.writeHead(500); res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Zona de pruebas: /dev/tienda.html?s=<slug> también recibe los datos inyectados por el servidor.
  if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/dev/tienda.html' && url.searchParams.get('s')) {
    await serveTienda(req, res, url.searchParams.get('s'), url, { dev: true }); return;
  }

  // Tienda pública del revendedor: /s/<slug> y /s/<slug>/
  if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname.startsWith('/s/')) {
    // Enlace antiguo /s/<slug>: redirige al enlace corto /<slug> (los QR ya impresos siguen funcionando).
    const m = url.pathname.match(/^\/s\/([^/]*)\/?$/);
    if (m) {
      let raw = ''; try { raw = decodeURIComponent(m[1]).toLowerCase(); } catch {}
      if (tiendaValidTarget(raw)) { res.writeHead(301, { Location: `/${raw}${url.search}`, 'Cache-Control': 'no-cache' }); res.end(); return; }
      await serveTienda(req, res, m[1], url); return;
    }
  }

  // Enlace corto: disenosstreaming.com/<slug>. Solo si no es un archivo o carpeta real
  // de public/ y la tienda existe en Firestore; si no, sigue el flujo normal.
  if ((req.method === 'GET' || req.method === 'HEAD')) {
    const sm = url.pathname.match(/^\/([A-Za-z0-9-]{3,40})\/?$/);
    if (sm && tiendaValidTarget(sm[1].toLowerCase())) {
      let isStatic = false;
      try { await fs.promises.access(path.join(__dirname, 'public', sm[1])); isStatic = true; } catch {}
      if (!isStatic && await serveTienda(req, res, sm[1], url, { short: true }) !== false) return;
    }
  }

  serveStatic(req, res, url, true);
});

server.listen(PORT,()=>console.log(`✦ TemplateStudio on port ${PORT} (ag-psd)`));
