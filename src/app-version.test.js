import test from 'node:test';
import assert from 'node:assert/strict';
import { availableAppVersion } from './app-version.js';

test('an older Home Screen app detects a new deployment at the project URL', async () => {
  const version = await availableAppVersion('old-build', 'https://example.github.io/bottletrack/?appVersion=old-build', async (url, options) => {
    assert.equal(url.pathname, '/bottletrack/version.json');
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => ({ build: 'new-build' }) };
  });
  assert.equal(version, 'new-build');
});

test('the update check does not interrupt inventory use while offline or on the current build', async () => {
  assert.equal(await availableAppVersion('same', 'https://example.test/', async () => ({ ok: true, json: async () => ({ build: 'same' }) })), null);
  assert.equal(await availableAppVersion('same', 'https://example.test/', async () => { throw Error('Offline'); }), null);
});
