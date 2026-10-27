import { ApiProperty } from '@nestjs/swagger';

/** Multipart body for POST /assets/upload. The file itself is validated in AssetsService. */
export class UploadAssetDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'PNG, JPEG, WebP or PDF, up to 5 MB' })
  file: unknown;
}
