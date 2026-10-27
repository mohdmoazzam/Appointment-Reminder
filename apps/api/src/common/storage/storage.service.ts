import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import type { AppConfigService } from '../../config/env.config.js';

export interface StoredFile {
  public_id: string;
  resource_type: string;
  url: string;
  format: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
}

/**
 * File storage backed by Cloudinary. Callers only see `StoredFile`, so the provider can be
 * swapped without touching them.
 */
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(@Inject(ConfigService) config: AppConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME', { infer: true }),
      api_key: config.get('CLOUDINARY_API_KEY', { infer: true }),
      api_secret: config.get('CLOUDINARY_API_SECRET', { infer: true }),
      secure: true,
    });
    this.root = config.get('CLOUDINARY_FOLDER', { infer: true });
  }

  /** Uploads under `<CLOUDINARY_FOLDER>/<folder>`; Cloudinary picks image vs raw (e.g. PDF). */
  upload(data: Buffer, folder: string): Promise<StoredFile> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `${this.root}/${folder}`, resource_type: 'auto' },
        (error, result?: UploadApiResponse) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
          resolve({
            public_id: result.public_id,
            resource_type: result.resource_type,
            url: result.secure_url,
            format: result.format ?? null,
            bytes: result.bytes,
            width: result.width ?? null,
            height: result.height ?? null,
          });
        },
      );
      stream.end(data);
    });
  }

  async remove(public_id: string, resource_type: string): Promise<void> {
    await cloudinary.uploader.destroy(public_id, { resource_type, invalidate: true });
  }
}
