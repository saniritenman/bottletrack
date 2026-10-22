export function daysUntilExpiry(expiry, currentDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry || '') || !/^\d{4}-\d{2}-\d{2}$/.test(currentDate || '')) return null;
  const end = Date.parse(`${expiry}T00:00:00Z`), start = Date.parse(`${currentDate}T00:00:00Z`);
  return Number.isFinite(end) && Number.isFinite(start) ? Math.round((end - start) / 86400000) : null;
}

export function expiringWithin(product, days, currentDate) {
  return (product.lots || []).some(lot => {
    const remaining = daysUntilExpiry(lot.expiry, currentDate);
    return remaining !== null && remaining >= 0 && remaining <= days;
  });
}
