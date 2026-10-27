import { http } from '@/lib/api/http-client';
import type { Asset } from '@/types/models';

/** Endpoints under /assets (apps/api/src/assets/assets.controller.ts). */

export function uploadAsset(file: File): Promise<Asset> {
  const formData = new FormData();
  formData.append('file', file);
  return http.post<Asset>('/assets/upload', formData);
}

/** Owners can delete any asset of the business; staff only their own uploads. */
export function deleteAsset(assetId: string): Promise<void> {
  return http.delete(`/assets/${assetId}`);
}
