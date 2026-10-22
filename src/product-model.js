export function normalizeDatabase(value) {
  const normalizeExpiry = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? '' : value;
  };
  const products = Array.isArray(value?.products)
    ? value.products
        .filter(product => product && typeof product === 'object')
        .map(product => ({
          ...product,
          name: typeof product.name === 'string' ? product.name : '',
          size: typeof product.size === 'string' ? product.size : '',
          barcode: product.barcode == null ? '' : String(product.barcode),
          photo: typeof product.photo === 'string' ? product.photo : '',
          createdAt: typeof product.createdAt === 'string' ? product.createdAt : '',
          lots: Array.isArray(product.lots)
            ? product.lots
                .filter(lot => lot && typeof lot === 'object' && normalizeExpiry(lot.expiry))
                .map(lot => ({ ...lot, expiry: normalizeExpiry(lot.expiry), createdAt: typeof lot.createdAt === 'string' ? lot.createdAt : '' }))
            : [],
        }))
    : [];
  return { products, activity: Array.isArray(value?.activity) ? value.activity : [] };
}

export function mergeDatabases(localValue, sharedValue) {
  const local = normalizeDatabase(localValue);
  const shared = normalizeDatabase(sharedValue);
  const activity = [...new Map([...shared.activity, ...local.activity].map(item => [
    item?.id || `${item?.type || ''}|${item?.barcode || ''}|${item?.at || ''}|${item?.detail || ''}`,
    item,
  ])).values()].sort((a, b) => (b?.at || '').localeCompare(a?.at || '')).slice(0, 100);
  const sharedProducts = new Map(shared.products.map(product => [product.id, product]));
  const sharedDeletes = new Map();
  for (const item of shared.activity) {
    if (item?.type !== 'deleted' || !item.barcode) continue;
    const previous = sharedDeletes.get(item.barcode) || '';
    if ((item.at || '') > previous) sharedDeletes.set(item.barcode, item.at || '');
  }
  for (const product of local.products) {
    const existing = sharedProducts.get(product.id);
    if (existing) {
      if ((product.updatedAt || product.createdAt || '') > (existing.updatedAt || existing.createdAt || '')) sharedProducts.set(product.id, product);
      continue;
    }
    const productDate = product.updatedAt || product.createdAt || '';
    if ((sharedDeletes.get(product.barcode) || '') >= productDate) continue;
    sharedProducts.set(product.id, product);
  }
  return { products: [...sharedProducts.values()], activity };
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
  if (!fields.photo) throw new Error('Product photo is required.');
  return fields;
}
