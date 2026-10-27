import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Prisma } from '../common/database/prisma/generated/client.js';
import { serviceInclude, toServiceResponse } from '../common/database/selects.js';
import { PageDto, PageMetaDto } from '../common/dtos/common.dto.js';
import type { CreateServiceDto, ListServicesDto, UpdateServiceDto } from '../common/dtos/services.dto.js';
import { Helper } from '../common/helper.js';

const NAME_TAKEN = 'A service with this name already exists';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** The business's services, alphabetical by default. */
  async list(business_id: string, query: ListServicesDto) {
    const where = { business_id, is_active: query.is_active } satisfies Prisma.servicesWhereInput;
    const [total, services] = await this.prisma.$transaction([
      this.prisma.services.count({ where }),
      this.prisma.services.findMany({
        where,
        include: serviceInclude,
        orderBy: { name: query.order },
        skip: query.skip,
        take: query.take,
      }),
    ]);
    const pageMeta = new PageMetaDto({ count: total, pageOptionsDto: query });
    return new PageDto(services.map(toServiceResponse), pageMeta);
  }

  async get(business_id: string, service_id: string) {
    const service = await this.prisma.services.findFirst({
      where: { id: service_id, business_id },
      include: serviceInclude,
    });
    if (!service) throw new NotFoundException('Service not found');
    return toServiceResponse(service);
  }

  async create(business_id: string, dto: CreateServiceDto) {
    const { staff_ids, ...fields } = dto;
    if (staff_ids?.length) await this.assertStaffInBusiness(business_id, staff_ids);

    try {
      const service = await this.prisma.services.create({
        data: {
          ...fields,
          business_id,
          staff_services: staff_ids?.length ? { createMany: { data: staff_ids.map((user_id) => ({ user_id })) } } : undefined,
        },
        include: serviceInclude,
      });
      return toServiceResponse(service);
    } catch (error) {
      if (Helper.isUniqueViolation(error)) throw new ConflictException(NAME_TAKEN);
      throw error;
    }
  }

  /** staff_ids, when present, replaces who offers the service. */
  async update(business_id: string, service_id: string, dto: UpdateServiceDto) {
    const { staff_ids, ...fields } = dto;
    await this.assertServiceInBusiness(business_id, service_id);
    if (staff_ids?.length) await this.assertStaffInBusiness(business_id, staff_ids);

    try {
      const service = await this.prisma.$transaction(async (tx) => {
        if (staff_ids) {
          await tx.staff_services.deleteMany({ where: { service_id } });
          if (staff_ids.length) {
            await tx.staff_services.createMany({
              data: staff_ids.map((user_id) => ({ user_id, service_id })),
            });
          }
        }
        return tx.services.update({
          where: { id: service_id },
          data: fields,
          include: serviceInclude,
        });
      });
      return toServiceResponse(service);
    } catch (error) {
      if (Helper.isUniqueViolation(error)) throw new ConflictException(NAME_TAKEN);
      throw error;
    }
  }

  /**
   * Deletes the service and who offers it. A service with appointments can't be deleted (the
   * appointments' foreign key refuses it) so their history stays intact; mark it inactive instead.
   */
  async remove(business_id: string, service_id: string): Promise<void> {
    try {
      const { count } = await this.prisma.services.deleteMany({ where: { id: service_id, business_id } });
      if (count === 0) throw new NotFoundException('Service not found');
    } catch (error) {
      if (Helper.isForeignKeyViolation(error)) {
        throw new ConflictException('This service has appointments, so it can’t be deleted. Mark it inactive instead.');
      }
      throw error;
    }
  }

  private async assertServiceInBusiness(business_id: string, service_id: string): Promise<void> {
    const service = await this.prisma.services.findFirst({
      where: { id: service_id, business_id },
      select: { id: true },
    });
    if (!service) throw new NotFoundException('Service not found');
  }

  /** Every id must be a user of this business (disabled users are allowed). */
  private async assertStaffInBusiness(business_id: string, user_ids: string[]): Promise<void> {
    const found = await this.prisma.users.count({ where: { id: { in: user_ids }, business_id } });
    if (found !== user_ids.length) {
      throw new BadRequestException('staff_ids must only contain staff members of this business');
    }
  }
}
