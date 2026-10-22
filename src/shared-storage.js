const env = import.meta.env || {};
export function createSharedStorage({ url = '', key = '', fetchRequest = (...args) => fetch(...args) } = {}) {
const endpoint = url.trim().replace(/\/$/, '');
const publicKey = key.trim();

function requestHeaders(extra = {}) {
  return { apikey: publicKey, ...(publicKey.startsWith('eyJ') ? { Authorization: `Bearer ${publicKey}` } : {}), 'Content-Type': 'application/json', ...extra };
}

async function requestSharedJson(path, options = {}, timeoutMs = options.method ? 60000 : 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchRequest(`${endpoint}/rest/v1/bottletrack_state?${path}`, {
      ...options,
      cache: 'no-store',
      signal: controller.signal,
      headers: requestHeaders(options.headers),
    });
    if (!response.ok) {
      const error = new Error(`Shared inventory request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 || options.headers?.Prefer?.includes('return=minimal') ? null : await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSharedDatabase() {
  const rows = await requestSharedJson('id=eq.1&select=data,updated_at');
  return rows[0] || null;
}

async function fetchSharedDatabaseVersion() {
  const rows = await requestSharedJson('id=eq.1&select=updated_at');
  return rows[0]?.updated_at || null;
}

async function initializeSharedDatabase(data) {
  await requestSharedJson('on_conflict=id', {
    method: 'POST',
    headers: requestHeaders({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
    body: JSON.stringify({ id: 1, data }),
  });
}

async function saveSharedDatabase(data, expectedUpdatedAt) {
  if (!expectedUpdatedAt) throw new Error('A server version is required to save the inventory safely.');
  const conditional = Boolean(expectedUpdatedAt);
  const query = conditional
    ? `id=eq.1&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}&select=updated_at`
    : 'on_conflict=id&select=updated_at';
  const rows = await requestSharedJson(query, {
    method: conditional ? 'PATCH' : 'POST',
    headers: requestHeaders({ Prefer: conditional ? 'return=representation' : 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify({ id: 1, data }),
  });
  return rows[0]?.updated_at ? { saved: true, updatedAt: rows[0].updated_at } : { saved: false, updatedAt: null };
}

return { requestSharedJson, fetchSharedDatabase, fetchSharedDatabaseVersion, initializeSharedDatabase, saveSharedDatabase };
}
const url = env.VITE_SUPABASE_URL || '';
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '';
export const sharedStorageEnabled = Boolean(url.trim() && key.trim());
export const { requestSharedJson, fetchSharedDatabase, fetchSharedDatabaseVersion, initializeSharedDatabase, saveSharedDatabase } = createSharedStorage({ url, key });
