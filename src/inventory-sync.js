import { mergeDatabases, normalizeDatabase } from './product-model.js';
import { pendingUploads, syncBaseline } from './pending-uploads.js';

export const serializeInventory = value => JSON.stringify(normalizeDatabase(value), (key, item) => {
  if (item && typeof item === 'object' && !Array.isArray(item)) return Object.fromEntries(Object.keys(item).sort().map(name => [name, item[name]]));
  return item;
});
const encode = serializeInventory;

// One queue owns the version marker, uploads, downloads and status for this device.
export function createInventorySync({ storage, getDatabase, onDatabase, onStatus, onError = () => {}, initialBaseline = null, onPending = () => {}, onConfirmed = () => {} }) {
  let acknowledged = null;
  let version = null;
  let running = null;
  let requested = false;
  let stopped = false;
  let baseline = initialBaseline;
  const publishPending = status => { if (!stopped) onPending(pendingUploads(getDatabase(), baseline, status)); };
  const confirm = database => { baseline = syncBaseline(database); onConfirmed(baseline); publishPending('uploading'); };

  const apply = database => {
    if (!stopped && encode(getDatabase()) !== encode(database)) onDatabase(normalizeDatabase(database));
  };
  async function run() {
    let row = null;
    if (acknowledged === null || encode(getDatabase()) !== acknowledged) onStatus('loading');
    publishPending('uploading');
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
        if (!stopped) confirm(row.data);
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
        confirm(candidate);
        // Keep changes the user made while this request was in flight.
        apply(mergeDatabases(getDatabase(), candidate));
      }
      if (encode(getDatabase()) === acknowledged && !requested) {
        onStatus('shared');
        publishPending('waiting');
        return true;
      }
    }
    throw new Error('The inventory changed repeatedly. Your changes are queued for the next retry.');
  }

  function refresh() {
    if (stopped) return Promise.resolve(false);
    if (running) { requested = true; return running; }
    running = run().catch(error => {
      if (!stopped) { onStatus('error'); onError(error); publishPending('failed'); }
      return false;
    }).finally(() => { running = null; });
    return running;
  }
  return {
    refresh,
    localChanged() {
      publishPending(running ? 'uploading' : 'waiting');
      if (encode(getDatabase()) === acknowledged) return Promise.resolve(true);
      return refresh();
    },
    stop() { stopped = true; },
  };
}
