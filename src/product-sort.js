export function compareProducts(a, b, order = 'name', language = 'en') {
  const byName = () => (a.name || '').localeCompare(b.name || '', language) || String(a.id || '').localeCompare(String(b.id || ''));
  if (order === 'newest' || order === 'oldest') {
    const first = Date.parse(a.createdAt), second = Date.parse(b.createdAt);
    if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : byName();
    if (!Number.isFinite(second)) return -1;
    return (order === 'newest' ? second - first : first - second) || byName();
  }
  if (order === 'date') return (a.nextLot?.expiry || '9999-12-31').localeCompare(b.nextLot?.expiry || '9999-12-31') || byName();
  return byName();
}
