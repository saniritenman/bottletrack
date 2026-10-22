import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createSharedStorage } from './shared-storage.js';
import { createInventorySync, serializeInventory } from './inventory-sync.js';
import { normalizeDatabase, removeProduct, restoreProduct, removeExpiry, mergeDatabases } from './product-model.js';

const copy = value => JSON.parse(JSON.stringify(value));
const product = (id, updatedAt = '2026-10-22T10:00:00.000Z') => ({ id, name: id, barcode: id, size: '750ml', photo: 'data:image/jpeg,x', createdAt: updatedAt, updatedAt, lots: [] });
const db = (...products) => normalizeDatabase({ products, activity: [] });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function server(initial = db()) {
  let data = copy(initial), version = 1;
  const api = {
    writes: 0,
    offline: false,
    async fetchSharedDatabaseVersion() { if (api.offline) throw Error('Offline'); return String(version); },
    async fetchSharedDatabase() { if (api.offline) throw Error('Offline'); return { data: copy(data), updated_at: String(version) }; },
    async initializeSharedDatabase() {},
    async saveSharedDatabase(candidate, expected) {
      if (api.offline) throw Error('Offline');
      if (expected !== String(version)) return { saved: false };
      api.writes++;
      data = copy(candidate);
      return { saved: true, updatedAt: String(++version) };
    },
    get data() { return copy(data); },
  };
  return api;
}
function device(storage, initial = db()) {
  let data = copy(initial);
  const statuses = [];
  const errors = [];
  const controller = createInventorySync({ storage, getDatabase: () => data, onDatabase: value => { data = value; }, onStatus: status => statuses.push(status), onError: error => errors.push(String(error.cause || error)) });
  return { controller, statuses, errors, get data() { return data; }, set data(value) { data = normalizeDatabase(value); } };
}

test('two devices adding at the same time converge without losing either product', async () => {
  const cloud = server();
  const a = device(cloud, db(product('a'))), b = device(cloud, db(product('b')));
  assert.deepEqual(await Promise.all([a.controller.refresh(), b.controller.refresh()]), [true, true]);
  await Promise.all([a.controller.refresh(), b.controller.refresh()]);
  assert.equal(cloud.data.products.length, 2);
  assert.equal(serializeInventory(a.data), serializeInventory(b.data));
});

test('edits made during an upload are queued and confirmed before status becomes synced', async () => {
  const cloud = server();
  const entered = deferred(), release = deferred();
  const save = cloud.saveSharedDatabase;
  let inFlight = 0, maximum = 0;
  cloud.saveSharedDatabase = async (...args) => {
    maximum = Math.max(maximum, ++inFlight);
    if (cloud.writes === 0) { entered.resolve(); await release.promise; }
    try { return await save(...args); } finally { inFlight--; }
  };
  const phone = device(cloud, db(product('a')));
  const saving = phone.controller.localChanged();
  await entered.promise;
  phone.data = db(product('a'), product('b'));
  const second = phone.controller.localChanged();
  assert.equal(phone.statuses.includes('shared'), false);
  release.resolve();
  assert.equal(await saving, true);
  assert.equal(await second, true);
  assert.equal(maximum, 1);
  assert.equal(cloud.data.products.length, 2);
  assert.equal(phone.statuses.at(-1), 'shared');
});

test('an offline first connection preserves a new product across a simulated reload and retries', async () => {
  const cloud = server(); cloud.offline = true;
  const phone = device(cloud, db(product('offline')));
  assert.equal(await phone.controller.refresh(), false);
  assert.equal(phone.statuses.at(-1), 'error');
  const reloaded = device(cloud, copy(phone.data));
  cloud.offline = false;
  assert.equal(await reloaded.controller.refresh(), true);
  assert.equal(cloud.data.products[0].id, 'offline');
});

test('a lost save response is recovered without losing or duplicating the saved product', async () => {
  const cloud = server();
  const save = cloud.saveSharedDatabase;
  cloud.saveSharedDatabase = async (...args) => { await save(...args); throw Error('Connection lost after commit'); };
  const phone = device(cloud, db(product('a')));
  assert.equal(await phone.controller.refresh(), false);
  cloud.saveSharedDatabase = save;
  assert.equal(await phone.controller.refresh(), true);
  assert.equal(cloud.data.products.length, 1);
  assert.equal(cloud.writes, 1);
});

test('server JSON key reordering does not cause repeated full uploads', async () => {
  const cloud = server(db(product('a')));
  const phone = device(cloud, { activity: [], products: [{ ...product('a') }], deletedProducts: {} });
  await phone.controller.refresh();
  for (let index = 0; index < 4; index++) await phone.controller.refresh();
  assert.equal(cloud.writes, 0);
});

test('deletion survives old device copies, more than 100 activities, and preserves a duplicate barcode', async () => {
  const first = product('a'), duplicate = { ...product('b'), barcode: first.barcode };
  const old = db(first, duplicate);
  const deleted = removeProduct(old, first.id, '2026-10-22T11:00:00.000Z');
  deleted.activity = Array.from({ length: 110 }, (_, index) => ({ id: String(index), type: 'updated', at: '2026-10-22T12:00:00.000Z' }));
  const cloud = server(deleted);
  const phone = device(cloud, old);
  await phone.controller.refresh();
  assert.deepEqual(phone.data.products.map(item => item.id), ['b']);
  phone.data = restoreProduct(phone.data, first, '2026-10-22T13:00:00.000Z');
  await phone.controller.localChanged();
  assert.equal(cloud.data.products.length, 2);
});

test('concurrent date additions merge and removed dates stay removed', () => {
  const original = product('a');
  const first = { id: 'first', expiry: '2027-01-01', createdAt: original.updatedAt };
  const second = { id: 'second', expiry: '2027-02-01', createdAt: original.updatedAt };
  const a = db({ ...original, lots: [first] }), b = db({ ...original, lots: [second] });
  const merged = mergeDatabases(a, b);
  assert.equal(merged.products[0].lots.length, 2);
  const removed = removeExpiry(merged, original.id, first, '2026-10-22T11:00:00.000Z');
  assert.deepEqual(mergeDatabases(a, removed).products[0].lots.map(lot => lot.id), ['second']);
});

test('actual HTTP transport syncs two clients through version conflicts', async t => {
  let row = null, revision = 0;
  const http = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    assert.equal(request.headers.apikey, 'public-test-key');
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'GET') {
      response.end(JSON.stringify(row ? [url.searchParams.get('select') === 'updated_at' ? { updated_at: row.updated_at } : row] : []));
      return;
    }
    let body = ''; for await (const chunk of request) body += chunk;
    if (request.method === 'POST') {
      row ||= { ...JSON.parse(body), updated_at: String(++revision) };
      response.writeHead(201); response.end(); return;
    }
    if (url.searchParams.get('updated_at') !== `eq.${row.updated_at}`) { response.end('[]'); return; }
    row = { ...JSON.parse(body), updated_at: String(++revision) };
    response.end(JSON.stringify([{ updated_at: row.updated_at }]));
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { http.closeAllConnections(); http.close(resolve); }));
  const storage = createSharedStorage({ url: `http://127.0.0.1:${http.address().port}`, key: 'public-test-key' });
  const a = device(storage, db(product('a'))), b = device(storage, db(product('b')));
  const first = await Promise.all([a.controller.refresh(), b.controller.refresh()]);
  assert.deepEqual(first, [true, true], [...a.errors, ...b.errors].join('; '));
  await Promise.all([a.controller.refresh(), b.controller.refresh()]);
  assert.equal(row.data.products.length, 2);
  assert.equal(serializeInventory(a.data), serializeInventory(b.data));
});
