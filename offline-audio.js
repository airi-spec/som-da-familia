/* Offline + imports — NUNCA cacheia YouTube */
(function (global) {
  'use strict';
  const DB_NAME = 'sdf_audio_db';
  const DB_VER = 1;
  const STORE_IMPORTS = 'imports';
  const STORE_META = 'meta';
  const CACHE_AUDIO = 'sdf-audio-offline-v1';

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_IMPORTS)) {
          db.createObjectStore(STORE_IMPORTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function idbPut(store, value) {
    const db = await openDb();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    await txDone(tx);
  }

  async function idbGet(store, id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGetAll(store) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbDelete(store, id) {
    const db = await openDb();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    await txDone(tx);
  }

  function isYouTubeUrl(url) {
    if (!url) return false;
    try {
      const u = new URL(url, location.href);
      return /youtube\.com|youtu\.be|ytimg\.com|googlevideo\.com/i.test(u.hostname);
    } catch {
      return /youtube|youtu\.be/i.test(String(url));
    }
  }

  async function saveImportFile(file) {
    const id = 'imp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const buf = await file.arrayBuffer();
    const rec = {
      id,
      title: (file.name || 'Áudio').replace(/\.[^.]+$/, ''),
      artist: 'Importado',
      mime: file.type || 'audio/mpeg',
      blob: new Blob([buf], { type: file.type || 'audio/mpeg' }),
      addedAt: Date.now(),
      source: 'import',
    };
    await idbPut(STORE_IMPORTS, rec);
    return rec;
  }

  async function listImports() {
    return idbGetAll(STORE_IMPORTS);
  }

  async function getImport(id) {
    return idbGet(STORE_IMPORTS, id);
  }

  async function deleteImport(id) {
    return idbDelete(STORE_IMPORTS, id);
  }

  async function markOffline(trackId, url) {
    if (isYouTubeUrl(url)) throw new Error('YouTube não pode ser baixado neste app');
    const cache = await caches.open(CACHE_AUDIO);
    // SoundHelix e CDNs de áudio livre muitas vezes sem CORS legível:
    // usamos no-cors (resposta opaca) — o SW consegue servir o cache ao <audio>.
    let res;
    try {
      res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
    } catch (e) {
      res = await fetch(url, { mode: 'no-cors' });
    }
    await cache.put(url, res.clone ? res.clone() : res);
    await idbPut(STORE_META, { id: 'offline:' + trackId, trackId, url, at: Date.now() });
    // pede ao SW para garantir a mesma entrada
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_AUDIO', url: url });
    }
    return true;
  }

  async function isOffline(trackId) {
    return !!(await idbGet(STORE_META, 'offline:' + trackId));
  }

  async function listOfflineIds() {
    const all = await idbGetAll(STORE_META);
    return all.filter((x) => String(x.id).startsWith('offline:')).map((x) => x.trackId);
  }

  async function resolvePlayableUrl(track) {
    if (!track) return null;
    if (track.source === 'youtube' || track.youtubeId) return null;
    if (track.source === 'import' || String(track.id || '').startsWith('imp_')) {
      const rec = await getImport(track.id);
      if (!rec || !rec.blob) return null;
      return URL.createObjectURL(rec.blob);
    }
    // Para SoundHelix offline: manter URL original; o SW entrega do Cache Storage
    // (respostas opacas não viram blob URL utilizável).
    return track.url;
  }

  global.SDFOffline = {
    saveImportFile,
    listImports,
    getImport,
    deleteImport,
    markOffline,
    isOffline,
    listOfflineIds,
    resolvePlayableUrl,
    isYouTubeUrl,
    CACHE_AUDIO,
  };
})(window);
