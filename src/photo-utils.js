export const MAX_PRODUCT_PHOTO_EDGE = 480;
export const MAX_PRODUCT_PHOTO_DISPLAY_LENGTH = 500_000;
// Includes base64 overhead: about 30 KB of JPEG becomes at most 40 KB to upload.
export const MAX_PRODUCT_PHOTO_UPLOAD_LENGTH = 40_000;

export function isDisplayableProductPhoto(photo) {
  return typeof photo === 'string' && photo.length > 0 && photo.length <= MAX_PRODUCT_PHOTO_DISPLAY_LENGTH;
}

export async function compressProductPhoto(file) {
  if (!file || !(file.type?.startsWith('image/') || !file.type && /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || ''))) throw new Error('Select an image file.');

  const { image, release } = await loadImage(file);
  try {
    const scale = Math.min(1, MAX_PRODUCT_PHOTO_EDGE / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare this image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.48, 0.38, 0.28, 0.2, 0.16]) {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not resize this image.')), 'image/jpeg', quality);
      });
      const dataUrl = await readAsDataURL(blob);
      if (dataUrl.length <= MAX_PRODUCT_PHOTO_UPLOAD_LENGTH) return dataUrl;
      canvas.width = Math.max(1, Math.round(canvas.width * 0.82));
      canvas.height = Math.max(1, Math.round(canvas.height * 0.82));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    const error = new Error('This photo is too large to store reliably.');
    error.code = 'PHOTO_TOO_LARGE';
    throw error;
  } finally {
    release();
  }
}

export async function compressStoredProductPhotos(database) {
  const products = [];
  for (const product of database?.products || []) {
    let photo = product.photo;
    if (typeof photo === 'string' && photo.startsWith('data:image/') && photo.length > MAX_PRODUCT_PHOTO_UPLOAD_LENGTH) {
      try {
        const response = await fetch(photo);
        if (response.ok) photo = await compressProductPhoto(await response.blob());
      } catch (error) {
        console.warn('Could not reduce an existing product photo:', error);
      }
    }
    products.push(photo === product.photo ? product : { ...product, photo });
  }
  return { ...database, products };
}

async function loadImage(file) {
  if (typeof globalThis.createImageBitmap === 'function') {
    try {
      const bitmap = await globalThis.createImageBitmap(file);
      return { image: bitmap, release: () => bitmap.close?.() };
    } catch {
      // Some browsers expose createImageBitmap but cannot decode every camera format.
    }
  }

  if (typeof globalThis.Image !== 'function' || !globalThis.URL?.createObjectURL) {
    throw new Error('This browser cannot open the selected image.');
  }

  const objectUrl = globalThis.URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new globalThis.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Could not open this image.'));
      element.src = objectUrl;
    });
    return { image, release: () => globalThis.URL.revokeObjectURL(objectUrl) };
  } catch (error) {
    globalThis.URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function readAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this image.'));
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(blob);
  });
}
