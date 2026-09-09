'use strict';
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { createHash } = require('node:crypto');
const C = require('./core');
initializeApp();
const db = getFirestore();
const region = process.env.LANDING_REGION || 'us-central1';
const eventOptions = { region, retry: true, maxInstances: 10 };
const privateRef = uid => db.doc(`landing_private/${uid}`);
const catalogRef = slug => db.doc(`landing_catalogs/${slug}`);
const ownerRef = uid => db.doc(`users/${uid}`);
const settingsRef = uid => db.doc(`users/${uid}/gestor_config/settings`);
const accountCol = uid => db.collection(`users/${uid}/gestor_accounts`);
const clientCol = uid => db.collection(`users/${uid}/gestor_clients`);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const allowedOwner = data => !!data && data.active !== false && !['expired','vencido','inactive','inactivo','blocked','bloqueado'].includes(String(data.subscriptionStatus || data.status || '').toLowerCase());
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const cleanPrices = data => Object.fromEntries(Object.entries(data?.platformPrices || {}).slice(0, 120).map(([name,p]) => [name, { salePrice: C.money(p?.salePrice) }]));

function checkSize(state) {
  if (Buffer.byteLength(JSON.stringify(state)) > 750000) throw fail('Este catálogo supera el tamaño admitido. Contacta con soporte para ampliar su capacidad.', 422);
}
function payloadFor(state, owner, day = C.today()) {
  return state.published && allowedOwner(owner) ? C.publicCatalog(state.publishedConfig, state.inventory, state.prices, day) : { schemaVersion: 1, published: false };
}
// Called only after all transaction reads: transactions serialize concurrent changes.
function writeCatalog(tx, state, owner, existing) {
  if (!state.slug) return;
  const payload = payloadFor(state, owner), digest = hash(payload);
  if (existing?.digest === digest) return;
  tx.set(catalogRef(state.slug), { owner: state.owner, revision: Number(existing?.revision || 0) + 1, digest, payload });
}
async function bootstrap(uid) {
  return db.runTransaction(async tx => {
    const current = await tx.get(privateRef(uid));
    if (current.exists) return current.data();
    // One initial inventory read. Credentials and customer identities never enter the summary.
    const [accounts, clients, settings] = await Promise.all([tx.get(accountCol(uid)), tx.get(clientCol(uid)), tx.get(settingsRef(uid))]);
    const grouped = new Map();
    clients.forEach(doc => { const row = doc.data(); if (!grouped.has(row.accountId)) grouped.set(row.accountId, []); grouped.get(row.accountId).push(row); });
    const inventory = Object.create(null);
    accounts.forEach(doc => { inventory[doc.id] = C.accountSummary(doc.data(), grouped.get(doc.id) || []); });
    const state = { owner: uid, inventory, prices: cleanPrices(settings.data()), draft: C.sanitize({}), draftSlug: '', version: 0, published: false, initialized: true };
    checkSize(state); tx.create(privateRef(uid), state); return state;
  });
}
async function refreshAccounts(uid, ids) {
  const affected = [...new Set(ids)].filter(id => typeof id === 'string' && id.length > 0 && !id.includes('/'));
  if (!affected.length) return;
  await db.runTransaction(async tx => {
    const snap = await tx.get(privateRef(uid));
    if (!snap.exists) return; // No historical collection scan for sellers who have not enabled landing.
    const state = snap.data();
    const [owner, cat] = await Promise.all([tx.get(ownerRef(uid)), state.slug ? tx.get(catalogRef(state.slug)) : Promise.resolve(null)]);
    const rows = await Promise.all(affected.map(async id => {
      const account = await tx.get(accountCol(uid).doc(id));
      if (!account.exists) return [id, null];
      const clients = await tx.get(clientCol(uid).where('accountId', '==', id));
      return [id, C.accountSummary(account.data(), clients.docs.map(d => d.data()))];
    }));
    const next = Object.assign(Object.create(null), state.inventory);
    for (const [id, summary] of rows) { if (summary) next[id] = summary; else delete next[id]; }
    state.inventory = next; checkSize(state);
    if (hash(next) !== hash(snap.data().inventory)) tx.update(privateRef(uid), { inventory: next });
    writeCatalog(tx, state, owner.data(), cat?.data());
  });
}
async function refreshConfig(uid) {
  await db.runTransaction(async tx => {
    const snap = await tx.get(privateRef(uid)); if (!snap.exists) return;
    const state = snap.data();
    const [settings, owner, cat] = await Promise.all([tx.get(settingsRef(uid)), tx.get(ownerRef(uid)), state.slug ? tx.get(catalogRef(state.slug)) : Promise.resolve(null)]);
    const prices = cleanPrices(settings.data());
    if (hash(prices) !== hash(state.prices)) tx.update(privateRef(uid), { prices });
    state.prices = prices; writeCatalog(tx, state, owner.data(), cat?.data());
  });
}

function changed(before, after, names) { return names.some(name => JSON.stringify(before?.[name] ?? null) !== JSON.stringify(after?.[name] ?? null)); }
exports.landingAccountChanged = onDocumentWritten({ ...eventOptions, document: 'users/{uid}/gestor_accounts/{accountId}' }, async event => {
  const before = event.data?.before.data(), after = event.data?.after.data();
  if (!changed(before, after, ['platform','capacity','dueDate'])) return;
  await refreshAccounts(event.params.uid, [event.params.accountId]);
});
exports.landingClientChanged = onDocumentWritten({ ...eventOptions, document: 'users/{uid}/gestor_clients/{clientId}' }, async event => {
  const before = event.data?.before.data(), after = event.data?.after.data();
  if (!changed(before, after, ['accountId','state','fullAccountSale'])) return;
  await refreshAccounts(event.params.uid, [before?.accountId, after?.accountId]);
});
exports.landingPricesChanged = onDocumentWritten({ ...eventOptions, document: 'users/{uid}/gestor_config/settings' }, async event => {
  if (!changed(event.data?.before.data(), event.data?.after.data(), ['platformPrices'])) return;
  await refreshConfig(event.params.uid);
});
exports.landingOwnerChanged = onDocumentWritten({ ...eventOptions, document: 'users/{uid}' }, async event => {
  if (allowedOwner(event.data?.before.data()) !== allowedOwner(event.data?.after.data())) await refreshConfig(event.params.uid);
});

// Always load the latest catalog AFTER the object generation. An old invocation
// cannot overwrite a newer object: storage generation preconditions force a retry.
async function exportCatalog(slug) {
  const file = getStorage().bucket(process.env.LANDING_BUCKET || undefined).file(`landing-catalogs/${slug}.json`);
  for (let attempt = 0; attempt < 8; attempt++) {
    let generation = 0, storedRevision = -1;
    try { const [metadata] = await file.getMetadata(); generation = metadata.generation; storedRevision = Number(metadata.metadata?.revision ?? -1); }
    catch (err) { if (Number(err.code) !== 404) throw err; }
    const latest = await catalogRef(slug).get(); if (!latest.exists) return;
    const catalog = latest.data(); if (storedRevision >= catalog.revision) return;
    try {
      await file.save(JSON.stringify(catalog.payload), { resumable: false, preconditionOpts: { ifGenerationMatch: generation },
        metadata: { contentType: 'application/json; charset=utf-8', cacheControl: 'private, no-store', metadata: { revision: String(catalog.revision) } } });
      return;
    } catch (err) { if (Number(err.code) !== 412) throw err; }
  }
  throw new Error('Catalog export contention; retry event.');
}
exports.landingCatalogExport = onDocumentWritten({ ...eventOptions, document: 'landing_catalogs/{slug}' }, event => exportCatalog(event.params.slug));

// Expiry is derived from dates, even when nobody opens the gestor. Only summaries
// of published shops are read; the full inventory is not queried each day.
exports.landingExpireAccounts = onSchedule({ region, schedule: '0 0 * * *', timeZone: 'America/Lima', retryCount: 3, maxInstances: 1 }, async () => {
  let cursor;
  do {
    let query = db.collection('landing_private').where('published', '==', true).orderBy('__name__').limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const snapshot of page.docs) {
      await db.runTransaction(async tx => {
        const current = await tx.get(snapshot.ref); if (!current.exists || !current.data().slug) return;
        const state = current.data(); const [owner, cat] = await Promise.all([tx.get(ownerRef(snapshot.id)), tx.get(catalogRef(state.slug))]);
        writeCatalog(tx, state, owner.data(), cat.data());
      });
    }
    cursor = page.size === 100 ? page.docs[page.docs.length-1] : null;
  } while (cursor);
});

const origins = new Set(['https://disenosstreaming.com', 'https://www.disenosstreaming.com', ...(process.env.LANDING_ALLOWED_ORIGINS || '').split(',').filter(Boolean)]);
exports.landingApi = onRequest({ region, maxInstances: 20, timeoutSeconds: 120, memory: '512MiB' }, async (req, res) => {
  const origin = req.get('origin');
  const publicRoute = req.method === 'GET' && /^\/catalog\/[a-z0-9-]+\/?$/.test(req.path);
  res.set('Vary', 'Origin'); res.set('X-Content-Type-Options', 'nosniff'); res.set('Cache-Control', 'no-store');
  if (publicRoute) res.set('Access-Control-Allow-Origin', '*');
  else if (origin && origins.has(origin)) res.set('Access-Control-Allow-Origin', origin);
  else if (origin) return res.status(403).json({ error: 'Origen no autorizado.' });
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); res.set('Access-Control-Allow-Headers', 'Authorization,Content-Type'); return res.status(204).end();
  }
  try {
    if (publicRoute) {
      const slug = req.path.split('/')[2];
      if (!/^[a-z0-9][a-z0-9-]{2,38}[a-z0-9]$/.test(slug)) throw fail('Tienda no encontrada.', 404);
      const file = getStorage().bucket(process.env.LANDING_BUCKET || undefined).file(`landing-catalogs/${slug}.json`);
      let bytes; try { [bytes] = await file.download(); } catch (err) { if (Number(err.code) === 404) throw fail('Tienda no encontrada.', 404); throw err; }
      const payload = JSON.parse(bytes.toString('utf8'));
      res.set('Cache-Control', 'public, max-age=0, s-maxage=30');
      return res.status(payload.published ? 200 : 404).json(payload);
    }
    const route = req.path.replace(/^\/+|\/+$/g, '');
    if (!['editor','draft','publish','pause'].includes(route) || req.method !== (route === 'editor' ? 'GET' : 'POST')) throw fail('Ruta no encontrada.', 404);
    const token = req.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw fail('Inicia sesión para continuar.', 401);
    let auth; try { auth = await getAuth().verifyIdToken(token, true); } catch (_) { throw fail('La sesión venció. Vuelve a iniciar sesión.', 401); }
    const owner = await ownerRef(auth.uid).get(); if (!allowedOwner(owner.data())) throw fail('Tu cuenta no tiene acceso activo al gestor.', 403);
    if (route === 'editor') {
      const s = await bootstrap(auth.uid);
      return res.json({ draft: s.draft, draftSlug: s.draftSlug || '', inventory: s.inventory, prices: s.prices, version: s.version, published: s.published, slug: s.slug || '' });
    }
    if (!req.is('application/json') || Buffer.byteLength(JSON.stringify(req.body || {})) > 100000) throw fail('Solicitud inválida o demasiado grande.', 413);
    const config = route !== 'pause' ? C.sanitize(req.body.config) : null;
    const slug = String(req.body.slug || '').trim();
    if (route === 'publish') C.validate(config, slug);
    const result = await db.runTransaction(async tx => {
      const snap = await tx.get(privateRef(auth.uid)); if (!snap.exists) throw fail('Abre el editor antes de publicar.', 409);
      const s = snap.data();
      if (s.version !== req.body.expectedVersion) throw fail('Esta landing cambió en otra pestaña. Recarga antes de guardar para conservar esos cambios.', 409);
      const currentOwner = await tx.get(ownerRef(auth.uid)); if (!allowedOwner(currentOwner.data())) throw fail('Tu cuenta no tiene acceso activo al gestor.', 403);
      if (s.slug && route === 'publish' && s.slug !== slug) throw fail('La dirección queda fija después de la primera publicación.');
      const selectedSlug = s.slug || (route === 'publish' ? slug : '');
      const existing = selectedSlug ? await tx.get(catalogRef(selectedSlug)) : null;
      if (existing?.exists && existing.data().owner !== auth.uid) throw fail('Esta dirección ya está ocupada. Prueba con otra.', 409);
      s.version += 1;
      if (config) { s.draft = config; s.draftSlug = slug; }
      if (route === 'publish') { s.slug = selectedSlug; s.publishedConfig = config; s.published = true; }
      if (route === 'pause') s.published = false;
      checkSize(s); tx.set(privateRef(auth.uid), s);
      if (route !== 'draft') writeCatalog(tx, s, currentOwner.data(), existing?.data());
      return { version: s.version, published: s.published, slug: s.slug || '' };
    });
    return res.json(result);
  } catch (err) {
    if (!err.status && !/Escribe |Revisa |El enlace |Selecciona /.test(err.message)) console.error('Landing request failed', err.code || err.name);
    const status = err.status || (/Escribe |Revisa |El enlace |Selecciona /.test(err.message) ? 400 : 503);
    return res.status(status).json({ error: status < 500 ? err.message : 'No pudimos completar la operación. Vuelve a intentarlo.' });
  }
});
