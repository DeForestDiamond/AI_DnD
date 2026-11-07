const KEY = 'dnd-autosave';
const valid = state => state && typeof state === 'object' && state.character;

// Campaign transcripts outgrow localStorage. Keep one complete snapshot in
// IndexedDB, with a legacy fallback for browsers that cannot open the database.
export function createBrowserSaveStore({ getDB = () => globalThis.indexedDB, getStorage = () => globalThis.localStorage } = {}) {
  let opened, queue = Promise.resolve(), lastTime = 0;
  const enqueue = task => {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  };
  const database = () => {
    if (!opened) opened = new Promise((resolve,reject) => {
      const api = getDB();
      if (!api) { reject(new Error('IndexedDB unavailable')); return; }
      const request = api.open('dnd-campaign-saves',1);
      request.onupgradeneeded = () => request.result.createObjectStore('saves');
      request.onerror = () => reject(request.error || new Error('Cannot open browser save storage'));
      request.onblocked = () => reject(new Error('Browser save storage is blocked by another tab'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); opened = null; };
        resolve(db);
      };
    }).catch(error => { opened = null; throw error; });
    return opened;
  };
  const transaction = async (mode, action) => {
    const db = await database();
    return new Promise((resolve,reject) => {
      const tx = db.transaction('saves',mode);
      let value;
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('Browser save transaction failed'));
      const request = action(tx.objectStore('saves'));
      request.onsuccess = () => { value = request.result; };
    });
  };
  return {
    save(state) {
      // Capture now, before waiting for prior writes; later character mutations
      // must not change a snapshot already queued for persistence.
      let snapshot;
      try {
        lastTime = Math.max(Date.now(),lastTime+1);
        snapshot = structuredClone({...state,_savedAt:lastTime});
      } catch(error) { return Promise.reject(error); }
      return enqueue(async () => {
        try {
          await transaction('readwrite',store => store.put(snapshot,KEY));
          // Retire the smaller, older copy only AFTER the new commit succeeds.
          try { getStorage()?.removeItem(KEY); } catch { /* IndexedDB is durable */ }
          return {state:snapshot,backend:'indexedDB'};
        } catch(dbError) {
          try {
            const storage = getStorage();
            if (!storage) throw new Error('localStorage unavailable');
            storage.setItem(KEY,JSON.stringify(snapshot));
            return {state:snapshot,backend:'localStorage'};
          } catch(error) {
            throw new Error(`Browser autosave failed; the previous save was kept. Download a Full Save now. ${error.message || dbError.message}`);
          }
        }
      });
    },
    load() {
      return enqueue(async () => {
        let modern, legacy, dbError;
        try { modern = await transaction('readonly',store => store.get(KEY)); } catch(error) { dbError=error; }
        try {
          const raw = getStorage()?.getItem(KEY);
          if (raw) legacy = JSON.parse(raw);
        } catch(error) { if (!valid(modern)) throw error; }
        if (valid(legacy) && (!valid(modern) || (legacy._savedAt || 0) > (modern._savedAt || 0))) return legacy;
        if (valid(modern)) return modern;
        if (dbError && !valid(legacy)) throw dbError;
        return null;
      });
    },
    clear() {
      return enqueue(async () => {
        await transaction('readwrite',store=>store.delete(KEY));
        getStorage()?.removeItem(KEY);
      });
    },
  };
}

export const browserSaveStore = createBrowserSaveStore();
