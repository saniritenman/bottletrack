import { mergeDatabases, normalizeDatabase } from './product-model.js';

export const serializeInventory = value => JSON.stringify(normalizeDatabase(value), (key, item) => {
  if (item && typeof item === 'object' && !Array.isArray(item)) return Object.fromEntries(Object.keys(item).sort().map(name => [name, item[name]]));
  return item;
});
const encode = serializeInventory;

// One queue owns the version marker, uploads, downloads and status for this device.
export function createInventorySync({ storage, getDatabase, onDatabase, onStatus, onError = () => {} }) {
  let acknowledged = null;
  let version = null;
  let running = null;
  let requested = false;
  let stopped = false;

  const apply = database => {
    if (!stopped && encode(getDatabase()) !== encode(database)) onDatabase(normalizeDatabase(database));
  };
  async function run() {
    let row = null;
    if (acknowledged === null || encode(getDatabase()) !== acknowledged) onStatus('loading');
    for (let attempt = 0; attempt < 8; attempt++) {
      requested = false;
      if (acknowledged === null || await storage.fetchSharedDatabaseVersion() !== version) {
        row = await storage.fetchSharedDatabase();
        if (!row) {
          await storage.initializeSharedDatabase(normalizeDatabase(getDatabase()));
          row = await storage.fetchSharedDatabase();
        }
        if (!row?.data || !Array.isArray(row.data.products) || !row.updated_at) throw new Error('The shared inventory response is invalid.');
        version = row.updated_at;
        acknowledged = encode(row.data);
      }
      if (stopped) return false;
      const current = normalizeDatabase(getDatabase());
      const candidate = mergeDatabases(current, JSON.parse(acknowledged));
      apply(candidate);
      const payload = encode(candidate);
      if (payload !== acknowledged) {
        const result = await storage.saveSharedDatabase(candidate, version);
        if (stopped) return false;
        if (!result.saved) { acknowledged = null; continue; }
        version = result.updatedAt;
        acknowledged = payload;
        // Keep changes the user made while this request was in flight.
        apply(mergeDatabases(getDatabase(), candidate));
      }
      if (encode(getDatabase()) === acknowledged && !requested) {
        onStatus('shared');
        return true;
      }
    }
    throw new Error('The inventory changed repeatedly. Your changes are queued for the next retry.');
  }

  function refresh() {
    if (stopped) return Promise.resolve(false);
    if (running) { requested = true; return running; }
    running = run().catch(error => {
      if (!stopped) { onStatus('error'); onError(error); }
      return false;
    }).finally(() => { running = null; });
    return running;
  }
  return {
    refresh,
    localChanged() {
      if (encode(getDatabase()) === acknowledged) return Promise.resolve(true);
      return refresh();
    },
    stop() { stopped = true; },
  };
}
