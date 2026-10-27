import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import { businessInclude, toBusinessResponse } from '../common/database/selects.js';
import type { UpdateBusinessDto } from '../common/dtos/business.dto.js';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async get(business_id: string) {
    const business = await this.prisma.businesses.findUniqueOrThrow({
      where: { id: business_id },
      include: businessInclude,
    });
    return toBusinessResponse(business);
  }

  /** `logo_asset_id` and `cover_asset_id` must be images uploaded to this business via POST /assets/upload. */
  async update(business_id: string, dto: UpdateBusinessDto) {
    await this.assertOwnImage(business_id, 'logo_asset_id', dto.logo_asset_id);
    await this.assertOwnImage(business_id, 'cover_asset_id', dto.cover_asset_id);

    const business = await this.prisma.businesses.update({
      where: { id: business_id },
      data: dto,
      include: businessInclude,
    });
    return toBusinessResponse(business);
  }

  private async assertOwnImage(business_id: string, field: string, asset_id: string | null | undefined) {
    if (!asset_id) return;
    const asset = await this.prisma.assets.findFirst({
      where: { id: asset_id, business_id, mime_type: { startsWith: 'image/' } },
      select: { id: true },
    });
    if (!asset) throw new BadRequestException(`${field} must be an image uploaded to this business`);
  }
}
