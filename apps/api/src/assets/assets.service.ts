import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import { assetSelect } from '../common/database/selects.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { StorageService } from '../common/storage/storage.service.js';

export const MAX_ASSET_BYTES = 5 * 1024 * 1024;

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(auth: AuthUser, file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('file is required');
    // Trust the bytes, not the client-supplied mimetype.
    const mime_type = detectFileType(file.buffer);
    if (!mime_type) throw new BadRequestException('file must be a PNG, JPEG, WebP or PDF');

    const stored = await this.storage.upload(file.buffer, auth.business_id);
    try {
      return await this.prisma.assets.create({
        data: {
          business_id: auth.business_id,
          uploaded_by_id: auth.user_id,
          public_id: stored.public_id,
          resource_type: stored.resource_type,
          url: stored.url,
          mime_type,
          format: stored.format,
          bytes: stored.bytes,
          width: stored.width,
          height: stored.height,
          original_name: file.originalname.slice(0, 255),
        },
        select: assetSelect,
      });
    } catch (error) {
      // Don't leave an orphaned file in Cloudinary if the row couldn't be saved.
      await this.storage.remove(stored.public_id, stored.resource_type).catch(() => undefined);
      throw error;
    }
  }

  async get(auth: AuthUser, asset_id: string) {
    const asset = await this.prisma.assets.findFirst({
      where: {
        id: asset_id,
        business_id: auth.business_id,
      },
      select: assetSelect,
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  /** Owners can delete any asset in their business; staff only their own uploads. */
  async remove(auth: AuthUser, asset_id: string): Promise<void> {
    const asset = await this.prisma.assets.findFirst({
      where: {
        id: asset_id,
        business_id: auth.business_id,
      },
      select: {
        id: true,
        uploaded_by_id: true,
        public_id: true,
        resource_type: true,
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (auth.role !== 'owner' && asset.uploaded_by_id !== auth.user_id) {
      throw new ForbiddenException('You can only delete files you uploaded');
    }

    // The row goes first (a business logo or cover pointing at it is cleared by the FK); a failed
    // Cloudinary delete only leaves an unreachable file, which is logged.
    await this.prisma.assets.delete({
      where: { id: asset.id },
    });
    await this.storage.remove(asset.public_id, asset.resource_type).catch((error: unknown) => {
      this.logger.error(`Failed to delete ${asset.public_id} from Cloudinary`, error as Error);
    });
  }
}

function detectFileType(buf: Buffer): string | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  if (buf.length >= 5 && buf.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  return null;
}
