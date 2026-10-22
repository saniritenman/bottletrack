import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceStorage } from './device-storage.js';

test('products survive reload through the device database when photo data fills localStorage', async () => {
  let persisted;
  const options = {
    getStorage: () => ({ getItem() { return null; }, setItem() { throw Error('QuotaExceededError'); } }),
    largeStorage: { async write(value) { persisted = structuredClone(value); }, async read() { return persisted; } },
  };
  const storage = createDeviceStorage(options);
  assert.equal(await storage.save({ products: [{ id: 'p1', name: 'Gin', photo: 'data:image/jpeg,photo' }] }), true);
  const reloaded = createDeviceStorage(options);
  assert.equal((await reloaded.readLarge()).products[0].name, 'Gin');
});

test('blocked browser storage does not crash and reports an unsaved local backup', async () => {
  const storage = createDeviceStorage({ getStorage() { throw Error('SecurityError'); }, largeStorage: {
    async read() { throw Error('Blocked'); }, async write() { throw Error('Blocked'); },
  } });
  assert.equal(storage.readSmall().products.length, 0);
  assert.equal((await storage.readLarge()).products.length, 0);
  assert.equal(await storage.save({ products: [] }), false);
});

test('slow device writes preserve the most recent edit', async () => {
  let persisted, release;
  const gate = new Promise(resolve => { release = resolve; });
  const storage = createDeviceStorage({ getStorage: () => null, largeStorage: {
    async read() { return persisted; },
    async write(value) { if (value.products[0].name === 'old') await gate; persisted = value; },
  } });
  const first = storage.save({ products: [{ id: 'p1', name: 'old' }] });
  const second = storage.save({ products: [{ id: 'p1', name: 'new' }] });
  release();
  await Promise.all([first, second]);
  assert.equal((await storage.readLarge()).products[0].name, 'new');
});
