const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const stamps = value => Object.fromEntries(Object.entries(record(value)).filter(([, stamp]) => typeof stamp === 'string' && Number.isFinite(Date.parse(stamp))));
const newest = (left, right) => Object.fromEntries([...new Set([...Object.keys(left), ...Object.keys(right)])].map(key => [key, (left[key] || '') > (right[key] || '') ? left[key] : right[key]]));
const productStamp = product => product.updatedAt || product.createdAt || '';
export function nextChangeStamp(database) {
  const db = normalizeDatabase(database);
  const dates = [...db.products.map(productStamp), ...Object.values(db.deletedProducts), ...db.activity.map(item => item.at)];
  return new Date(Math.max(Date.now(), ...dates.map(date => (Date.parse(date) || 0) + 1))).toISOString();
}

export function normalizeDatabase(value) {
  const normalizeExpiry = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? '' : value;
  };
  const products = Array.isArray(value?.products)
    ? value.products
        .filter(product => product && typeof product === 'object' && !Array.isArray(product))
        .map(product => ({
          ...product,
          id: String(product.id || `legacy-${product.barcode || product.name || 'product'}`),
          name: typeof product.name === 'string' ? product.name : '',
          size: typeof product.size === 'string' ? product.size : '',
          barcode: product.barcode == null ? '' : String(product.barcode),
          photo: typeof product.photo === 'string' ? product.photo : '',
          createdAt: typeof product.createdAt === 'string' ? product.createdAt : '',
          ...(product.updatedAt && { updatedAt: typeof product.updatedAt === 'string' ? product.updatedAt : '' }),
          ...(product.deletedLots && { deletedLots: stamps(product.deletedLots) }),
          lots: Array.isArray(product.lots)
            ? product.lots
                .filter(lot => lot && typeof lot === 'object' && normalizeExpiry(lot.expiry))
                .map(lot => ({ ...lot, expiry: normalizeExpiry(lot.expiry), createdAt: typeof lot.createdAt === 'string' ? lot.createdAt : '' }))
            : [],
        }))
    : [];
  const activity = (Array.isArray(value?.activity) ? value.activity : []).filter(item => item && typeof item === 'object').map(item => ({ ...item, at: typeof item.at === 'string' ? item.at : '' }));
  return { products, activity, deletedProducts: stamps(value?.deletedProducts) };
}

export function removeProduct(database, productId, stamp = nextChangeStamp(database)) {
  const db = normalizeDatabase(database);
  return { ...db, products: db.products.filter(product => product.id !== productId), deletedProducts: { ...db.deletedProducts, [productId]: stamp } };
}

export function restoreProduct(database, product, stamp = nextChangeStamp(database)) {
  const db = normalizeDatabase(database);
  return { ...db, products: [{ ...product, updatedAt: stamp }, ...db.products.filter(item => item.id !== product.id)] };
}

export function removeExpiry(database, productId, lot, stamp = nextChangeStamp(database)) {
  const db = normalizeDatabase(database);
  return { ...db, products: db.products.map(product => product.id !== productId ? product : {
    ...product, updatedAt: stamp,
    deletedLots: { ...product.deletedLots, [lot.id || lot.expiry]: stamp },
    lots: product.lots.filter(item => (item.id || item.expiry) !== (lot.id || lot.expiry)),
  }) };
}

export function replaceInventory(database, backup, stamp = nextChangeStamp(database)) {
  const current = normalizeDatabase(database);
  const incoming = normalizeDatabase(backup);
  const deletedProducts = newest(current.deletedProducts, incoming.deletedProducts);
  for (const product of current.products) if (!incoming.products.some(item => item.id === product.id)) deletedProducts[product.id] = stamp;
  const products = incoming.products.map(product => {
    const previous = current.products.find(item => item.id === product.id);
    const deletedLots = newest(stamps(previous?.deletedLots), stamps(product.deletedLots));
    for (const lot of previous?.lots || []) if (!product.lots.some(item => (item.id || item.expiry) === (lot.id || lot.expiry))) deletedLots[lot.id || lot.expiry] = stamp;
    for (const lot of product.lots) delete deletedLots[lot.id || lot.expiry];
    return { ...product, lots: product.lots.map(lot => ({ ...lot, updatedAt: stamp })), updatedAt: stamp, deletedLots };
  });
  return { ...incoming, products, deletedProducts };
}

export function mergeDatabases(localValue, sharedValue) {
  const local = normalizeDatabase(localValue);
  const shared = normalizeDatabase(sharedValue);
  const activity = [...new Map([...shared.activity, ...local.activity].map(item => [
    item?.id || `${item?.type || ''}|${item?.barcode || ''}|${item?.at || ''}|${item?.detail || ''}`,
    item,
  ])).values()].sort((a, b) => (b?.at || '').localeCompare(a?.at || '')).slice(0, 100);
  const products = new Map(shared.products.map(product => [product.id, product]));
  for (const product of local.products) {
    const existing = products.get(product.id);
    if (!existing) { products.set(product.id, product); continue; }
    const winner = productStamp(product) > productStamp(existing) ? product : existing;
    const deletedLots = newest(stamps(existing.deletedLots), stamps(product.deletedLots));
    const lots = new Map();
    for (const lot of [...existing.lots, ...product.lots]) {
      const key = lot.id || lot.expiry;
      const previous = lots.get(key);
      if (!previous || (lot.updatedAt || lot.createdAt || '') > (previous.updatedAt || previous.createdAt || '')) lots.set(key, lot);
    }
    const merged = { ...winner, lots: [...lots.values()].filter(lot => !deletedLots[lot.id || lot.expiry] || deletedLots[lot.id || lot.expiry] < (lot.updatedAt || lot.createdAt || '')) };
    if (Object.keys(deletedLots).length) merged.deletedLots = deletedLots;
    products.set(product.id, merged);
  }
  const deletedProducts = newest(local.deletedProducts, shared.deletedProducts);
  for (const item of [...local.activity, ...shared.activity]) {
    if (item.type === 'deleted' && item.productId && (!deletedProducts[item.productId] || deletedProducts[item.productId] < item.at)) deletedProducts[item.productId] = item.at;
  }
  const deletes = new Map();
  for (const item of activity) {
    if (item?.type !== 'deleted' || item.productId || !item.barcode) continue;
    const previous = deletes.get(item.barcode) || '';
    if ((item.at || '') > previous) deletes.set(item.barcode, item.at || '');
  }
  const keptProducts = [...products.values()].filter(product => (!deletedProducts[product.id] || deletedProducts[product.id] < productStamp(product)) && (!deletes.has(product.barcode) || deletes.get(product.barcode) < productStamp(product)));
  return { products: keptProducts, activity, deletedProducts };
}

export function createProduct(form, { id, lotId, now }) {
  const fields = requiredProductFields(form);
  const stamp = now();
  const lots = [{ id: lotId(), expiry: fields.expiry, createdAt: stamp }];

  return {
    id: id(),
    ...fields,
    lots,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function updateProduct(existing, form, { now, lotId }) {
  const fields = requiredProductFields(form, existing.photo);
  const stamp = now();
  const lots = [...(existing.lots || [])];
  if (!lots.some(lot => lot.expiry === fields.expiry)) lots.unshift({ id: lotId(), expiry: fields.expiry, createdAt: stamp });

  return {
    ...existing,
    ...fields,
    lots,
    updatedAt: stamp,
  };
}

function requiredProductFields(form, fallbackPhoto = '') {
  const fields = {
    barcode: String(form?.barcode ?? '').trim(),
    name: String(form?.name ?? '').trim(),
    size: String(form?.size ?? '').trim(),
    expiry: String(form?.expiry ?? '').trim(),
    photo: String(form?.photo ?? fallbackPhoto ?? ''),
  };
  if (!fields.barcode) throw new Error('Product barcode is required.');
  if (!fields.name) throw new Error('Product name is required.');
  if (!fields.size) throw new Error('Bottle size is required.');
  if (!fields.expiry) throw new Error('Expiration date is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.expiry) || Number.isNaN(Date.parse(fields.expiry)) || new Date(fields.expiry).toISOString().slice(0, 10) !== fields.expiry) throw new Error('Expiration date is invalid.');
  if (!fields.photo) throw new Error('Product photo is required.');
  return fields;
}
