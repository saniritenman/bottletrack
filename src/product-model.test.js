import test from 'node:test';
import assert from 'node:assert/strict';
import { createProduct, normalizeDatabase, updateProduct } from './product-model.js';

const deps = { id: () => 'product-1', lotId: () => 'lot-1', now: () => '2026-10-20T10:00:00.000Z' };

test('creates a product without optional fields or expiration', () => {
  const product = createProduct({ name: '  Gin  ', barcode: ' 123 ' }, deps);
  assert.equal(product.name, 'Gin');
  assert.equal(product.barcode, '123');
  assert.deepEqual(product.lots, []);
  assert.equal(product.id, 'product-1');
  assert.equal(product.createdAt, deps.now());
});

test('creates a product with an expiration entry', () => {
  const product = createProduct({ name: 'Gin', expiry: '2027-02-01' }, deps);
  assert.deepEqual(product.lots, [{ id: 'lot-1', expiry: '2027-02-01', createdAt: deps.now() }]);
});

test('rejects a blank product name rather than silently failing to save', () => {
  assert.throws(() => createProduct({ name: '   ' }, deps), /name is required/i);
});

test('normalizes incomplete saved products so they cannot break the inventory view', () => {
  const normalized = normalizeDatabase({ products: [{ id: 'p1', name: 7, barcode: 123, lots: [null, {}, { expiry: 2027 }, { expiry: '2027-02-01', createdAt: 7 }] }] });
  assert.equal(normalized.activity.length, 0);
  assert.equal(normalized.products[0].name, '');
  assert.equal(normalized.products[0].barcode, '123');
  assert.deepEqual(normalized.products[0].lots, [{ expiry: '2027-02-01', createdAt: '' }]);
});

test('updates an existing product and preserves its other data', () => {
  const original = { id: 'p1', name: 'Gin', barcode: '123', photo: 'data:image/png,x', lots: [], legacyField: true };
  const updated = updateProduct(original, { name: 'Gin Reserve', barcode: ' 456 ', expiry: '2027-01-01' }, deps);
  assert.equal(updated.id, 'p1');
  assert.equal(updated.name, 'Gin Reserve');
  assert.equal(updated.barcode, '456');
  assert.equal(updated.photo, original.photo);
  assert.equal(updated.legacyField, true);
  assert.equal(updated.lots[0].expiry, '2027-01-01');
});
