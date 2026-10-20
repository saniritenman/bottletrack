const endpoint = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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

export async function initializeSharedDatabase(data) {
  const response = await fetch(`${endpoint}/rest/v1/bottletrack_state?on_conflict=id`, {
    method: 'POST',
    headers: requestHeaders({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
    body: JSON.stringify({ id: 1, data }),
  });
  if (!response.ok) throw new Error(`Shared inventory could not be initialized (${response.status}).`);
}

export async function saveSharedDatabase(data) {
  const response = await fetch(`${endpoint}/rest/v1/bottletrack_state?on_conflict=id`, {
    method: 'POST',
    headers: requestHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ id: 1, data }),
  });
  if (!response.ok) throw new Error(`Shared inventory could not be saved (${response.status}).`);
}
