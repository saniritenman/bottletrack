const env = import.meta.env || {};
const endpoint = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const publicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '';

export const sharedStorageEnabled = Boolean(endpoint && publicKey);

function requestHeaders(extra = {}) {
  return { apikey: publicKey, 'Content-Type': 'application/json', ...extra };
}

export async function requestSharedJson(path, options = {}, timeoutMs = options.method ? 60000 : 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${endpoint}/rest/v1/bottletrack_state?${path}`, {
      ...options,
      cache: 'no-store',
      signal: controller.signal,
      headers: requestHeaders(options.headers),
    });
    if (!response.ok) throw new Error(`Shared inventory request failed (${response.status}).`);
    return response.status === 204 || options.headers?.Prefer?.includes('return=minimal') ? null : await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSharedDatabase() {
  const rows = await requestSharedJson('id=eq.1&select=data,updated_at');
  return rows[0] || null;
}

export async function fetchSharedDatabaseVersion() {
  const rows = await requestSharedJson('id=eq.1&select=updated_at');
  return rows[0]?.updated_at || null;
}

export async function initializeSharedDatabase(data) {
  await requestSharedJson('on_conflict=id', {
    method: 'POST',
    headers: requestHeaders({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
    body: JSON.stringify({ id: 1, data }),
  });
}

export async function saveSharedDatabase(data, expectedUpdatedAt) {
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
