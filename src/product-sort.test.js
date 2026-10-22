import test from 'node:test';
import assert from 'node:assert/strict';
import { compareProducts } from './product-sort.js';

const products = [
  { id: 'missing', name: 'A', createdAt: '' },
  { id: 'morning', name: 'C', createdAt: '2026-10-22T07:00:00Z' },
  { id: 'afternoon', name: 'B', createdAt: '2026-10-22T18:00:00+03:00' },
  { id: 'yesterday', name: 'D', createdAt: '2026-10-21T23:00:00Z' },
];
test('upload sorting uses date and time, with unknown upload dates last', () => {
  assert.deepEqual([...products].sort((a, b) => compareProducts(a, b, 'newest')).map(item => item.id), ['afternoon', 'morning', 'yesterday', 'missing']);
  assert.deepEqual([...products].sort((a, b) => compareProducts(a, b, 'oldest')).map(item => item.id), ['yesterday', 'morning', 'afternoon', 'missing']);
});
test('upload order does not change when an older product is edited', () => {
  const edited = { ...products[3], updatedAt: '2026-10-25T00:00:00Z' };
  assert.ok(compareProducts(edited, products[2], 'newest') > 0);
});
