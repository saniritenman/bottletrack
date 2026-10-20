export function createProduct(form, { id, lotId, now }) {
  const name = String(form?.name ?? '').trim();
  if (!name) throw new Error('Product name is required.');
  const stamp = now();
  const expiry = String(form.expiry ?? '').trim();
  const lots = expiry
    ? [{ id: lotId(), expiry, note: String(form.note ?? '').trim(), createdAt: stamp }]
    : [];

  return {
    id: id(),
    barcode: String(form.barcode ?? '').trim(),
    name,
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
  if (expiry) lots.unshift({ id: lotId(), expiry, note: String(form.note ?? '').trim(), createdAt: stamp });

  return {
    ...existing,
    name,
    barcode: String(form.barcode ?? '').trim(),
    photo: form.photo ?? existing.photo ?? '',
    lots,
    updatedAt: stamp,
  };
}
