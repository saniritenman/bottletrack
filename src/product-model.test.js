import test from 'node:test';
import assert from 'node:assert/strict';
import { createProduct, normalizeDatabase, updateProduct } from './product-model.js';

const deps = { id: () => 'product-1', lotId: () => 'lot-1', now: () => '2026-10-20T10:00:00.000Z' };

test('creates a product with required fields', () => {
  const product = createProduct({ name: '  Gin  ', barcode: ' 123 ', size: '750ml', expiry: '2027-02-01', photo: 'data:image/jpeg,x' }, deps);
  assert.equal(product.name, 'Gin');
  assert.equal(product.barcode, '123');
  assert.equal(product.size, '750ml');
  assert.deepEqual(product.lots, [{ id: 'lot-1', expiry: '2027-02-01', createdAt: deps.now() }]);
  assert.equal(product.id, 'product-1');
  assert.equal(product.createdAt, deps.now());
});

test('creates a product with an expiration entry', () => {
  const product = createProduct({ name: 'Gin', barcode: '123', size: '500ml', expiry: '2027-02-01', photo: 'data:image/jpeg,x' }, deps);
  assert.deepEqual(product.lots, [{ id: 'lot-1', expiry: '2027-02-01', createdAt: deps.now() }]);
});

test('rejects a blank product name rather than silently failing to save', () => {
  assert.throws(() => createProduct({ name: '   ', barcode: '123', size: '500ml', expiry: '2027-02-01', photo: 'data:image/jpeg,x' }, deps), /name is required/i);
});

test('normalizes incomplete saved products so they cannot break the inventory view', () => {
  const normalized = normalizeDatabase({ products: [{ id: 'p1', name: 7, barcode: 123, lots: [null, {}, { expiry: 2027 }, { expiry: '2027-02-01', createdAt: 7 }] }] });
  assert.equal(normalized.activity.length, 0);
  assert.equal(normalized.products[0].name, '');
  assert.equal(normalized.products[0].barcode, '123');
  assert.deepEqual(normalized.products[0].lots, [{ expiry: '2027-02-01', createdAt: '' }]);
});

test('updates an existing product and preserves its other data', () => {
  const original = { id: 'p1', name: 'Gin', size: '500ml', barcode: '123', photo: 'data:image/png,x', lots: [], legacyField: true };
  const updated = updateProduct(original, { name: 'Gin Reserve', barcode: ' 456 ', size: '750ml', expiry: '2027-01-01', photo: original.photo }, deps);
  assert.equal(updated.id, 'p1');
  assert.equal(updated.name, 'Gin Reserve');
  assert.equal(updated.barcode, '456');
  assert.equal(updated.size, '750ml');
  assert.equal(updated.photo, original.photo);
  assert.equal(updated.legacyField, true);
  assert.equal(updated.lots[0].expiry, '2027-01-01');
});

test('saving a size change with the current expiry does not duplicate the expiry history', () => {
  const expiry = '2027-02-01';
  const original = { id: 'p1', name: 'Gin', size: '500ml', barcode: '123', photo: 'data:image/png,x', lots: [{ id: 'lot-old', expiry, createdAt: deps.now() }] };
  const updated = updateProduct(original, { name: 'Gin', barcode: '123', size: '750ml', expiry, photo: original.photo }, deps);
  assert.equal(updated.size, '750ml');
  assert.equal(updated.lots.length, 1);
  assert.equal(updated.lots[0].id, 'lot-old');
});

test('requires every product field when creating or updating', () => {
  const complete = { name: 'Gin', barcode: '123', size: '500ml', expiry: '2027-02-01', photo: 'data:image/png,x' };
  for (const field of Object.keys(complete)) {
    const incomplete = { ...complete, [field]: '' };
    assert.throws(() => createProduct(incomplete, deps));
    assert.throws(() => updateProduct({ ...complete, id: 'p1', lots: [] }, incomplete, deps));
  }
});
