import { normalizeDatabase } from './product-model.js';

export const DATABASE_KEY = 'bottletrack.data.v1';
export function readPreference(key, fallback) {
  try { return globalThis.localStorage?.getItem(key) || fallback; } catch { return fallback; }
}
export function writePreference(key, value) {
  try { globalThis.localStorage?.setItem(key, value); } catch { /* Preferences must not prevent opening the inventory. */ }
}

let opening;
function openDatabase() {
  if (!opening) opening = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Device database unavailable')); return; }
    const request = indexedDB.open('bottletrack-device', 1);
    const timer = setTimeout(() => reject(new Error('Device database timed out')), 5000);
    request.onupgradeneeded = () => request.result.createObjectStore('inventory');
    request.onerror = () => { clearTimeout(timer); reject(request.error); };
    request.onblocked = () => { clearTimeout(timer); reject(new Error('Device database blocked')); };
    request.onsuccess = () => { clearTimeout(timer); resolve(request.result); };
  }).catch(error => { opening = null; throw error; });
  return opening;
}
async function indexedTransaction(mode, value) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('inventory', mode);
    const store = transaction.objectStore('inventory');
    const request = mode === 'readonly' ? store.get(DATABASE_KEY) : store.put(value, DATABASE_KEY);
    const timer = setTimeout(() => { try { transaction.abort(); } catch {} reject(new Error('Device save timed out')); }, 5000);
    transaction.oncomplete = () => { clearTimeout(timer); resolve(request.result); };
    transaction.onabort = transaction.onerror = () => { clearTimeout(timer); reject(transaction.error || new Error('Device save failed')); };
  });
}

export function createDeviceStorage({ getStorage = () => globalThis.localStorage, largeStorage = {
  read: () => indexedTransaction('readonly'), write: value => indexedTransaction('readwrite', value),
} } = {}) {
  let writes = Promise.resolve();
  return {
    readSmall() {
      try { return normalizeDatabase(JSON.parse(getStorage()?.getItem(DATABASE_KEY))); } catch { return normalizeDatabase(null); }
    },
    async readLarge() { try { return normalizeDatabase(await largeStorage.read()); } catch { return normalizeDatabase(null); } },
    save(database) {
      const snapshot = normalizeDatabase(database);
      let smallSaved = false;
      try { const storage = getStorage(); if (storage) { storage.setItem(DATABASE_KEY, JSON.stringify(snapshot)); smallSaved = true; } } catch {}
      // Serialize IndexedDB writes so an earlier, slow save cannot replace a newer one.
      writes = writes.then(async () => {
        try { await largeStorage.write(snapshot); return true; } catch { return smallSaved; }
      });
      return writes;
    },
  };
}
export const deviceStorage = createDeviceStorage();
