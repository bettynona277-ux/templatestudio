'use strict';
// Entrega de plantillas del editor (una por una, marcadas por cuenta, con límite y registro).
// Ruta: GET /api/landing/template?id=<templateId>  (Authorization: Bearer <idToken>)
const { FieldValue } = require('firebase-admin/firestore');
const EdMeta = require('./edmeta');

// Límites de plantillas DISTINTAS por cuenta (volver a abrir la misma no cuenta).
const LIMIT_HOUR = 15;
const LIMIT_DAY = 25;

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const limaDay = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const limaHour = () => limaDay() + 'T' + new Date().toLocaleString('en-GB', { timeZone: 'America/Lima', hour: '2-digit', hour12: false }).slice(0, 2);

async function serveTemplate(db, auth, req) {
  const id = String(req.query.id || '').trim();
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) throw fail('Plantilla no válida.', 400);

  const [adminSnap, userSnap] = await Promise.all([db.doc(`admins/${auth.uid}`).get(), db.doc(`users/${auth.uid}`).get()]);
  const isAdmin = adminSnap.exists;
  if (!isAdmin) {
    // Igual que isActiveClient() en las reglas: cuenta creada por el admin y no desactivada.
    if (!userSnap.exists || (userSnap.data() || {}).active === false) throw fail('Tu cuenta no tiene acceso a las plantillas.', 403);
    if ((userSnap.data() || {}).templateCatalogGroup === 'Ratas') {
      const link = await db.doc(`template_link_access/${id}`).get();
      const groups = (link.exists && link.data().allowedGroups) || [];
      if (!groups.includes('Ratas')) throw fail('Esta plantilla no está habilitada para tu cuenta.', 403);
    }
  }

  const tplSnap = await db.doc(`templates/${id}`).get();
  if (!tplSnap.exists) throw fail('Esta plantilla ya no existe.', 404);
  const data = tplSnap.data() || {};

  if (!isAdmin) {
    const ip = String(req.get('x-forwarded-for') || req.ip || '').split(',')[0].trim();
    const ua = String(req.get('user-agent') || '').slice(0, 300);
    const email = auth.email || (userSnap.data() || {}).email || '';
    const counterRef = db.doc(`template_access_counters/${auth.uid}`);
    const isNew = await db.runTransaction(async tx => {
      const c = (await tx.get(counterRef)).data() || {};
      const day = limaDay(), hour = limaHour();
      const dayIds = c.day === day ? (c.dayIds || []) : [];
      const hourIds = c.hour === hour ? (c.hourIds || []) : [];
      if (dayIds.includes(id)) return false; // ya la abrió hoy: no cuenta
      if (hourIds.length >= LIMIT_HOUR || dayIds.length >= LIMIT_DAY) {
        tx.set(counterRef, { blockedAt: Date.now(), blockedCount: FieldValue.increment(1), email }, { merge: true });
        tx.set(db.collection('template_alerts').doc(), { uid: auth.uid, email, tplId: id, ip, ua, at: Date.now(), dayCount: dayIds.length, hourCount: hourIds.length, reason: 'limite' });
        throw fail('Abriste muchas plantillas en poco tiempo. Espera un momento e inténtalo de nuevo.', 429);
      }
      tx.set(counterRef, { day, dayIds: [...dayIds, id], hour, hourIds: [...hourIds, id], email, lastAt: Date.now() }, { merge: true });
      return true;
    });
    if (isNew) {
      await db.collection('template_access').add({ uid: auth.uid, email, tplId: id, tplName: data.name || '', ip, ua, at: Date.now() });
    }
  }

  let template = data.template && Array.isArray(data.template.layers) ? data.template : (Array.isArray(data.layers) ? data : null);
  if (template && !isAdmin) template = EdMeta.mark(template, { uid: auth.uid, email: auth.email || (userSnap.data() || {}).email || '' }, id);
  return { id, name: data.name || '', thumb: data.thumb || '', status: data.status || '', category: data.category || '', template, marked: !isAdmin };
}

module.exports = { serveTemplate, LIMIT_HOUR, LIMIT_DAY };
