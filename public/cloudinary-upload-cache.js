// Reuse only byte-identical uploads within this page and account/purpose scope.
// No image recompression, persistent image data, or cross-account reuse.
(function () {
  'use strict';
  const completed = new Map();
  const pending = new Map();
  const MAX_ENTRIES = 32;
  const TTL_MS = 30 * 60 * 1000;

  async function digest(content) {
    try {
      if (!globalThis.crypto?.subtle) return null;
      const bytes = typeof content === 'string'
        ? new TextEncoder().encode(content) : await content.arrayBuffer();
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) { return null; }
  }

  async function run(scope, content, upload) {
    const hash = await digest(content);
    // Without a collision-resistant digest, prefer an upload over a wrong image.
    if (!hash) return upload(null);
    const key = JSON.stringify([scope, content?.type || '', hash]);
    const hit = completed.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) {
      console.debug('[Cloudinary] Subida idéntica reutilizada');
      return hit.url;
    }
    completed.delete(key);
    if (pending.has(key)) {
      console.debug('[Cloudinary] Subida simultánea compartida');
      return pending.get(key);
    }
    const task = Promise.resolve().then(() => upload(hash)).then(url => {
      if (typeof url !== 'string' || !url.startsWith('https://')) {
        throw new Error('Cloudinary no devolviÃ³ una URL vÃ¡lida');
      }
      console.debug('[Cloudinary] URL de imagen disponible en caché de subidas');
      completed.set(key, { url, at: Date.now() });
      while (completed.size > MAX_ENTRIES) completed.delete(completed.keys().next().value);
      return url;
    }).finally(() => { pending.delete(key); });
    pending.set(key, task);
    return task;
  }

  window.dsCloudinaryUploads = { run };
})();
