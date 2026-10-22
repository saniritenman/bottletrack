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
  const products = new Map(shared.products.map(product => [product.id, product]));
  for (const product of local.products) {
    const existing = products.get(product.id);
    if (!existing || (product.updatedAt || product.createdAt || '') > (existing.updatedAt || existing.createdAt || '')) products.set(product.id, product);
  }
  const deletes = new Map();
  for (const item of activity) {
    if (item?.type !== 'deleted' || !item.barcode) continue;
    const previous = deletes.get(item.barcode) || '';
    if ((item.at || '') > previous) deletes.set(item.barcode, item.at || '');
  }
  const keptProducts = [...products.values()].filter(product => (deletes.get(product.barcode) || '') < (product.updatedAt || product.createdAt || ''));
  return { products: keptProducts, activity };
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
