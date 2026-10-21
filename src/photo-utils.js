export const MAX_PRODUCT_PHOTO_EDGE = 1280;
export const MAX_PRODUCT_PHOTO_DISPLAY_LENGTH = 500_000;

export function isDisplayableProductPhoto(photo) {
  return typeof photo === 'string' && photo.length > 0 && photo.length <= MAX_PRODUCT_PHOTO_DISPLAY_LENGTH;
}

export async function compressProductPhoto(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Select an image file.');

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_PRODUCT_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not resize this image.')), 'image/jpeg', 0.78);
    });
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read this image.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap.close();
  }
}
