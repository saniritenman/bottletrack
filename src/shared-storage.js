const env = import.meta.env || {};
const endpoint = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const publicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '';

export const sharedStorageEnabled = Boolean(endpoint && publicKey);

function requestHeaders(extra = {}) {
  return { apikey: publicKey, 'Content-Type': 'application/json', ...extra };
}

export async function fetchSharedDatabase() {
  const response = await fetch(`${endpoint}/rest/v1/bottletrack_state?id=eq.1&select=data,updated_at`, { headers: requestHeaders() });
  if (!response.ok) throw new Error(`Shared inventory could not be loaded (${response.status}).`);
  const rows = await response.json();
  return rows[0] || null;
}

export async function fetchSharedDatabaseVersion() {
  const response = await fetch(`${endpoint}/rest/v1/bottletrack_state?id=eq.1&select=updated_at`, { headers: requestHeaders() });
  if (!response.ok) throw new Error(`Shared inventory version could not be checked (${response.status}).`);
  const rows = await response.json();
  return rows[0]?.updated_at || null;
}

export async function initializeSharedDatabase(data) {
  const response = await fetch(`${endpoint}/rest/v1/bottletrack_state?on_conflict=id`, {
    method: 'POST',
    headers: requestHeaders({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
    body: JSON.stringify({ id: 1, data }),
  });
  if (!response.ok) throw new Error(`Shared inventory could not be initialized (${response.status}).`);
}

export async function saveSharedDatabase(data, expectedUpdatedAt) {
  const conditional = Boolean(expectedUpdatedAt);
  const query = conditional
    ? `id=eq.1&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}&select=updated_at`
    : 'on_conflict=id&select=updated_at';
  const response = await fetch(`${endpoint}/rest/v1/bottletrack_state?${query}`, {
    method: conditional ? 'PATCH' : 'POST',
    headers: requestHeaders({ Prefer: conditional ? 'return=representation' : 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify({ id: 1, data }),
  });
  if (!response.ok) throw new Error(`Shared inventory could not be saved (${response.status}).`);
  const rows = await response.json();
  return rows[0]?.updated_at ? { saved: true, updatedAt: rows[0].updated_at } : { saved: false, updatedAt: null };
}
