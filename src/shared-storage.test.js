import test from 'node:test';
import assert from 'node:assert/strict';

test('checks the small shared-inventory version without downloading product photos', async () => {
  const { fetchSharedDatabaseVersion } = await import('./shared-storage.js');
  const previousFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async url => {
    requestedUrl = String(url);
    return { ok: true, json: async () => [{ updated_at: '2026-10-22T10:00:00+00:00' }] };
  };
  try {
    assert.equal(await fetchSharedDatabaseVersion(), '2026-10-22T10:00:00+00:00');
    assert.match(requestedUrl, /select=updated_at/);
    assert.doesNotMatch(requestedUrl, /select=data/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('uses a version-conditional update and reports a concurrent change', async () => {
  const { saveSharedDatabase } = await import('./shared-storage.js');
  const previousFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), ...options };
    return { ok: true, json: async () => [] };
  };
  try {
    const result = await saveSharedDatabase({ products: [], activity: [] }, '2026-10-22T10:00:00+00:00');
    assert.equal(request.method, 'PATCH');
    assert.match(request.url, /updated_at=eq\./);
    assert.match(request.url, /select=updated_at/);
    assert.deepEqual(result, { saved: false, updatedAt: null });
  } finally {
    globalThis.fetch = previousFetch;
  }
});
