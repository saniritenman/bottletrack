import { normalizeDatabase } from './product-model.js';

export function stableSignature(value) {
  const text = JSON.stringify(value, (key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(name => [name, item[name]])) : item);
  // These compact checksums are for the pending-list display, never for server conflict control.
  let first = 2166136261, second = 5381;
  for (let index = 0; index < text.length; index++) {
    first = Math.imul(first ^ text.charCodeAt(index), 16777619);
    second = Math.imul(second, 33) ^ text.charCodeAt(index);
  }
  return `${text.length}:${first >>> 0}:${second >>> 0}`;
}

export function syncBaseline(database) {
  const db = normalizeDatabase(database);
  return { products: Object.fromEntries(db.products.map(product => [product.id, { signature: stableSignature(product), name: product.name, barcode: product.barcode }])), deletedProducts: db.deletedProducts };
}

export function pendingUploads(database, baseline = null, status = 'waiting') {
  const db = normalizeDatabase(database);
  const previous = baseline?.products || {};
  const entries = db.products.filter(product => previous[product.id]?.signature !== stableSignature(product)).map(product => ({
    id: product.id, name: product.name, barcode: product.barcode, type: previous[product.id] ? 'updated' : 'created',
    at: product.updatedAt || product.createdAt || '', status,
  }));
  for (const [id, at] of Object.entries(db.deletedProducts)) {
    if (baseline?.deletedProducts?.[id] === at || db.products.some(product => product.id === id)) continue;
    const activity = db.activity.find(item => item.productId === id && item.type === 'deleted');
    entries.push({ id, name: previous[id]?.name || activity?.product || '', barcode: previous[id]?.barcode || activity?.barcode || '', type: 'deleted', at, status });
  }
  return entries.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
}
