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

export function createProduct(form, { id, lotId, now }) {
  const name = String(form?.name ?? '').trim();
  if (!name) throw new Error('Product name is required.');
  const stamp = now();
  const expiry = String(form.expiry ?? '').trim();
  const lots = expiry ? [{ id: lotId(), expiry, createdAt: stamp }] : [];

  return {
    id: id(),
    barcode: String(form.barcode ?? '').trim(),
    name,
    size: String(form.size ?? ''),
    photo: form.photo || '',
    lots,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function updateProduct(existing, form, { now, lotId }) {
  const name = String(form?.name ?? '').trim();
  if (!name) throw new Error('Product name is required.');
  const stamp = now();
  const lots = [...(existing.lots || [])];
  const expiry = String(form.expiry ?? '').trim();
  if (expiry) lots.unshift({ id: lotId(), expiry, createdAt: stamp });

  return {
    ...existing,
    name,
    size: String(form.size ?? existing.size ?? ''),
    barcode: String(form.barcode ?? '').trim(),
    photo: form.photo ?? existing.photo ?? '',
    lots,
    updatedAt: stamp,
  };
}
