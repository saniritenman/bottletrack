import test from 'node:test';
import assert from 'node:assert/strict';
import { compressProductPhoto, compressStoredProductPhotos, isDisplayableProductPhoto, MAX_PRODUCT_PHOTO_EDGE, MAX_PRODUCT_PHOTO_DISPLAY_LENGTH, MAX_PRODUCT_PHOTO_UPLOAD_LENGTH } from './photo-utils.js';

test('keeps oversized legacy photos out of the mobile render tree', () => {
  assert.equal(isDisplayableProductPhoto('data:image/jpeg;base64,small'), true);
  assert.equal(isDisplayableProductPhoto('x'.repeat(MAX_PRODUCT_PHOTO_DISPLAY_LENGTH + 1)), false);
  assert.equal(isDisplayableProductPhoto(''), false);
});

test('leaves already-small saved photos unchanged during migration', async () => {
  const product = { id: 'p1', photo: 'data:image/jpeg;base64,small' };
  const database = { products: [product], activity: [] };
  assert.deepEqual(await compressStoredProductPhotos(database), database);
});

test('compresses large photos to a mobile-friendly maximum edge', async () => {
  const previous = {
    createImageBitmap: globalThis.createImageBitmap,
    document: globalThis.document,
    FileReader: globalThis.FileReader,
  };
  let canvasSize;
  let imageClosed = false;
  globalThis.createImageBitmap = async () => ({ width: 4032, height: 3024, close: () => { imageClosed = true; } });
  globalThis.document = {
    createElement: () => {
      const canvas = {
        getContext: () => ({ drawImage: () => {} }),
        toBlob: callback => callback(new Blob(['compressed'], { type: 'image/jpeg' })),
      };
      Object.defineProperty(canvas, 'width', { set(value) { this._width = value; }, get() { return this._width; } });
      Object.defineProperty(canvas, 'height', { set(value) { this._height = value; }, get() { return this._height; } });
      canvasSize = canvas;
      return canvas;
    },
  };
  globalThis.FileReader = class {
    readAsDataURL() { this.result = 'data:image/jpeg;base64,compressed'; this.onload(); }
  };

  try {
    const photo = await compressProductPhoto({ type: 'image/jpeg' });
    assert.equal(photo, 'data:image/jpeg;base64,compressed');
    assert.equal(canvasSize.width, MAX_PRODUCT_PHOTO_EDGE);
    assert.equal(canvasSize.height, Math.round(3024 * MAX_PRODUCT_PHOTO_EDGE / 4032));
    assert.equal(imageClosed, true);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test('rejects non-image files', async () => {
  await assert.rejects(compressProductPhoto({ type: 'text/plain' }), /Select an image file/);
});

test('falls back to an image element when createImageBitmap is unavailable', async () => {
  const previous = { createImageBitmap: globalThis.createImageBitmap, document: globalThis.document, FileReader: globalThis.FileReader, Image: globalThis.Image, URL: globalThis.URL };
  let revoked = false;
  globalThis.createImageBitmap = undefined;
  globalThis.URL = { createObjectURL: () => 'blob:test', revokeObjectURL: () => { revoked = true; } };
  globalThis.Image = class {
    width = 640;
    height = 480;
    set src(value) { this._src = value; queueMicrotask(() => this.onload()); }
  };
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: () => {} }), toBlob: callback => callback(new Blob(['small'], { type: 'image/jpeg' })) }),
  };
  globalThis.FileReader = class { readAsDataURL() { this.result = 'data:image/jpeg;base64,small'; this.onload(); } };

  try {
    assert.equal(await compressProductPhoto({ type: 'image/jpeg' }), 'data:image/jpeg;base64,small');
    assert.equal(revoked, true);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test('recompresses photos until their stored data fits the weak-connection upload limit', async () => {
  const previous = { createImageBitmap: globalThis.createImageBitmap, document: globalThis.document, FileReader: globalThis.FileReader };
  let encodes = 0;
  globalThis.createImageBitmap = async () => ({ width: 2400, height: 1600, close() {} });
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: () => {} }), toBlob: callback => {
      encodes += 1;
      callback(new Blob([new Uint8Array(encodes === 1 ? MAX_PRODUCT_PHOTO_UPLOAD_LENGTH * 2 : MAX_PRODUCT_PHOTO_UPLOAD_LENGTH / 2)], { type: 'image/jpeg' }));
    } }),
  };
  globalThis.FileReader = class { readAsDataURL(blob) { this.result = `data:image/jpeg;base64,${'x'.repeat(blob.size)}`; this.onload(); } };

  try {
    const photo = await compressProductPhoto({ type: 'image/jpeg' });
    assert.ok(photo.length <= MAX_PRODUCT_PHOTO_UPLOAD_LENGTH);
    assert.equal(encodes, 2);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test('downgrades older stored photos once and keeps product data intact', async () => {
  const previous = { createImageBitmap: globalThis.createImageBitmap, document: globalThis.document, FileReader: globalThis.FileReader, fetch: globalThis.fetch };
  let reads = 0;
  globalThis.fetch = async () => { reads++; return { ok: true, blob: async () => new Blob(['old photo'], { type: 'image/jpeg' }) }; };
  globalThis.createImageBitmap = async () => ({ width: 800, height: 600, close() {} });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }), toBlob: callback => callback(new Blob(['small'], { type: 'image/jpeg' })) }) };
  globalThis.FileReader = class { readAsDataURL() { this.result = 'data:image/jpeg;base64,small'; this.onload(); } };
  const original = { products: [{ id: 'p1', name: 'Gin', lots: [{ expiry: '2027-01-01' }], photo: `data:image/jpeg;base64,${'x'.repeat(120_000)}` }], deletedProducts: { old: '2026-10-22T10:00:00.000Z' }, activity: [] };
  try {
    const compacted = await compressStoredProductPhotos(original);
    assert.ok(compacted.products[0].photo.length <= 40_000);
    assert.deepEqual(compacted.products[0].lots, original.products[0].lots);
    assert.equal(compacted.products[0].id, 'p1');
    assert.deepEqual(compacted.deletedProducts, original.deletedProducts);
    assert.deepEqual(await compressStoredProductPhotos(compacted), compacted);
    assert.equal(reads, 1);
    assert.notEqual(original.products[0].photo, compacted.products[0].photo);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
