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
