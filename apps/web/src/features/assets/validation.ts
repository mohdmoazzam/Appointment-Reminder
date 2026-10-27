/*
 * Client-side checks matching apps/api/src/assets/assets.service.ts, so an unsuitable file is
 * rejected before it is uploaded. The API checks the file's bytes as well.
 */

/** Same limit as MAX_ASSET_BYTES in the API. */
export const MAX_ASSET_BYTES = 5 * 1024 * 1024;

/** Images the API accepts (it also accepts PDF, which is no use as a logo). */
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** For an <input type="file" accept="...">. */
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',');

/** Returns an error message, or null if the file can be uploaded as an image. */
export function validateImageFile(file: File): string | null {
  if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Choose a PNG, JPEG or WebP image.';
  }
  if (file.size > MAX_ASSET_BYTES) {
    return `The image is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_ASSET_BYTES)}.`;
  }
  return null;
}

/** 1536 → "1.5 KB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
