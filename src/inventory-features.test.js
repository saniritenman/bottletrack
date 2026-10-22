import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingUploads, syncBaseline } from './pending-uploads.js';
import { createInventorySync } from './inventory-sync.js';
import { createBackupManager } from './automatic-backups.js';
import { daysUntilExpiry, expiringWithin } from './expiry-reminders.js';
import { createScanGate } from './scan-session.js';
import { normalizeDatabase, replaceInventory } from './product-model.js';

const product = (id, stamp = '2026-10-22T10:00:00.000Z') => ({ id, name: id, barcode: id, createdAt: stamp, updatedAt: stamp, lots: [], photo: 'data:image/jpeg,x' });
const db = (...products) => normalizeDatabase({ products });

test('pending list reports additions, edits and deletions relative to the confirmed server copy', () => {
  const baseline = syncBaseline(db(product('edited'), product('deleted'), product('same')));
  const local = db({ ...product('edited'), name: 'New name' }, product('same'), product('new'));
  local.deletedProducts.deleted = '2026-10-22T11:00:00.000Z';
  assert.deepEqual(new Set(pendingUploads(local, baseline).map(item => `${item.id}:${item.type}`)), new Set(['edited:updated', 'new:created', 'deleted:deleted']));
  assert.equal(pendingUploads(local, syncBaseline(local)).length, 0);
});

test('failed uploads remain visible after reload and Retry all clears them only after server confirmation', async () => {
  const initial = db(product('confirmed'));
  let data = db(product('confirmed'), product('new')), offline = true, pending = [];
  let server = initial;
  const storage = {
    async fetchSharedDatabase() { if (offline) throw Error('Offline'); return { data: server, updated_at: 'version' }; },
    async fetchSharedDatabaseVersion() { return 'version'; },
    async saveSharedDatabase(value) { server = value; return { saved: true, updatedAt: 'saved-version' }; },
  };
  const controller = createInventorySync({ storage, getDatabase: () => data, onDatabase: value => { data = value; }, onStatus() {}, initialBaseline: syncBaseline(initial), onPending: value => { pending = value; } });
  assert.equal(await controller.refresh(), false);
  assert.deepEqual(pending.map(item => [item.id, item.status]), [['new', 'failed']]);
  // The local inventory and baseline are the only state needed to reconstruct the list.
  assert.equal(pendingUploads(JSON.parse(JSON.stringify(data)), JSON.parse(JSON.stringify(syncBaseline(initial))))[0].id, 'new');
  offline = false;
  assert.equal(await controller.refresh(), true);
  assert.equal(pending.length, 0);
});

test('expiry reminders include today and the selected boundary, and exclude expired products', () => {
  const date = '2026-10-22';
  for (const [expiry, days] of [['2026-10-22', 0], ['2026-10-29', 7], ['2026-11-05', 14], ['2026-11-21', 30]]) {
    assert.equal(daysUntilExpiry(expiry, date), days);
    assert.equal(expiringWithin({ lots: [{ expiry }] }, days, date), true);
    if (days) assert.equal(expiringWithin({ lots: [{ expiry }] }, days - 1, date), false);
  }
  assert.equal(expiringWithin({ lots: [{ expiry: '2026-10-21' }] }, 30, date), false);
  assert.equal(daysUntilExpiry('2026-10-27', '2026-10-24'), 3); // Calendar days across a clock-change weekend.
});

test('continuous scanning suppresses a held barcode and accepts the next bottle', () => {
  const gate = createScanGate();
  assert.equal(gate.accept('A', 0), true);
  gate.resume(10000);
  for (let time = 10100; time <= 12000; time += 100) assert.equal(gate.accept('A', time), false);
  assert.equal(gate.accept('B', 12100), true);
  assert.equal(gate.accept('B', 12200), false);
  assert.equal(gate.accept('B', 14000), true); // Barcode left the frame long enough to scan again intentionally.
});

function backupFixture() {
  const values = new Map();
  let date = new Date('2026-10-22T10:00:00Z');
  const store = { async get(key) { return structuredClone(values.get(key)); }, async set(key, value) { values.set(key, structuredClone(value)); return true; }, async remove(key) { values.delete(key); } };
  return { store, values, manager: createBackupManager({ store, now: () => date, limit: 3 }), advance(ms) { date = new Date(date.getTime() + ms); } };
}

test('automatic backups are throttled, dated, pruned and readable after reopening', async () => {
  const fixture = backupFixture();
  const { manager } = fixture;
  assert.ok(await manager.capture(db(product('first'))));
  fixture.advance(1000);
  assert.equal(await manager.capture(db(product('second'))), null);
  for (let index = 0; index < 4; index++) { fixture.advance(31 * 60000); await manager.capture(db(product(String(index)))); }
  const reopened = createBackupManager({ store: fixture.store });
  const index = await reopened.list();
  assert.equal(index.length, 3);
  assert.equal((await reopened.load(index[0].id)).data.products[0].id, '3');
  assert.equal(fixture.values.size, 4); // Three snapshots plus the small index.
});

test('restoring an older backup preserves a dated copy of the current inventory first', async () => {
  const { manager } = backupFixture();
  const saved = await manager.capture(db(product('old')));
  const target = await manager.load(saved.id);
  await manager.capture(db(product('current')), { force: true, reason: 'before-restore' });
  const restored = replaceInventory(db(product('current')), target.data);
  assert.equal(restored.products[0].id, 'old');
  const newest = (await manager.list())[0];
  assert.equal(newest.reason, 'before-restore');
  assert.equal((await manager.load(newest.id)).data.products[0].id, 'current');
});

test('backup storage failures preserve the existing backup index', async () => {
  const fixture = backupFixture();
  await fixture.manager.capture(db(product('original')));
  const previous = await fixture.manager.list();
  fixture.store.set = async () => false;
  await assert.rejects(fixture.manager.capture(db(product('next')), { force: true }));
  assert.deepEqual(await fixture.manager.list(), previous);
});

test('a failed backup-index write cleans up the unfinished snapshot', async () => {
  const fixture = backupFixture();
  await fixture.manager.capture(db(product('original')));
  const previous = await fixture.manager.list();
  const write = fixture.store.set;
  fixture.store.set = async (key, value) => key.endsWith('index.v1') ? false : write(key, value);
  await assert.rejects(fixture.manager.capture(db(product('new')), { force: true }));
  assert.deepEqual(await fixture.manager.list(), previous);
  assert.equal(fixture.values.size, 2);
});
