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

  /** `logo_asset_id` must be an image uploaded to this business via POST /assets/upload. */
  async update(business_id: string, dto: UpdateBusinessDto) {
    if (dto.logo_asset_id) {
      const asset = await this.prisma.assets.findFirst({
        where: { id: dto.logo_asset_id, business_id, mime_type: { startsWith: 'image/' } },
        select: { id: true },
      });
      if (!asset) throw new BadRequestException('logo_asset_id must be an image uploaded to this business');
    }

    const business = await this.prisma.businesses.update({
      where: { id: business_id },
      data: dto,
      include: businessInclude,
    });
    return toBusinessResponse(business);
  }
}
