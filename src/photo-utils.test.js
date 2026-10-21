import test from 'node:test';
import assert from 'node:assert/strict';
import { compressProductPhoto, isDisplayableProductPhoto, MAX_PRODUCT_PHOTO_EDGE, MAX_PRODUCT_PHOTO_DISPLAY_LENGTH } from './photo-utils.js';

test('keeps oversized legacy photos out of the mobile render tree', () => {
  assert.equal(isDisplayableProductPhoto('data:image/jpeg;base64,small'), true);
  assert.equal(isDisplayableProductPhoto('x'.repeat(MAX_PRODUCT_PHOTO_DISPLAY_LENGTH + 1)), false);
  assert.equal(isDisplayableProductPhoto(''), false);
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
    assert.equal(canvasSize.height, 960);
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

test('recompresses photos until their stored data fits the display limit', async () => {
  const previous = { createImageBitmap: globalThis.createImageBitmap, document: globalThis.document, FileReader: globalThis.FileReader };
  let encodes = 0;
  globalThis.createImageBitmap = async () => ({ width: 2400, height: 1600, close() {} });
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: () => {} }), toBlob: callback => {
      encodes += 1;
      callback(new Blob([new Uint8Array(encodes === 1 ? 500_000 : 100_000)], { type: 'image/jpeg' }));
    } }),
  };
  globalThis.FileReader = class { readAsDataURL(blob) { this.result = `data:image/jpeg;base64,${'x'.repeat(blob.size)}`; this.onload(); } };

  try {
    const photo = await compressProductPhoto({ type: 'image/jpeg' });
    assert.ok(photo.length <= MAX_PRODUCT_PHOTO_DISPLAY_LENGTH);
    assert.equal(encodes, 2);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
