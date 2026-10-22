import { normalizeDatabase } from './product-model.js';
import { stableSignature } from './pending-uploads.js';
import { deviceMetadata } from './device-storage.js';

const INDEX_KEY = 'bottletrack.backups.index.v1';
const prefix = 'bottletrack.backup.';
export function createBackupManager({ store = deviceMetadata, now = () => new Date(), limit = 14, intervalMs = 30 * 60 * 1000 } = {}) {
  let queue = Promise.resolve();
  let sequence = 0;
  const list = async () => {
    const index = await store.get(INDEX_KEY);
    return Array.isArray(index) ? index.filter(item => item?.id && typeof item.createdAt === 'string') : [];
  };
  return {
    list,
    async load(id) { const value = await store.get(prefix + id); return value?.data && Array.isArray(value.data.products) ? value : null; },
    capture(database, { force = false, reason = 'automatic' } = {}) {
      const snapshot = normalizeDatabase(database);
      queue = queue.catch(() => null).then(async () => {
        const index = await list();
        if (!force && !snapshot.products.length && !index.length) return null;
        const date = now(), createdAt = date.toISOString(), signature = stableSignature(snapshot);
        const last = index[0];
        if (!force && last && last.createdAt.slice(0, 10) === createdAt.slice(0, 10) && (last.signature === signature || date.getTime() - Date.parse(last.createdAt) < intervalMs)) return null;
        const id = `${date.getTime()}-${++sequence}-${Math.random().toString(36).slice(2, 8)}`;
        const metadata = { id, createdAt, count: snapshot.products.length, reason, signature };
        if (!await store.set(prefix + id, { ...metadata, data: snapshot })) throw new Error('Could not save an automatic backup on this device.');
        const next = [metadata, ...index];
        if (!await store.set(INDEX_KEY, next.slice(0, limit))) {
          await store.remove(prefix + id);
          throw new Error('Could not update the backup list.');
        }
        for (const old of next.slice(limit)) await store.remove(prefix + old.id);
        return metadata;
      });
      return queue;
    },
  };
}
