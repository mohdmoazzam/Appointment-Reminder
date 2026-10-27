import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Prisma } from '../common/database/prisma/generated/client.js';
import { customerSelect } from '../common/database/selects.js';
import { PageDto, PageMetaDto } from '../common/dtos/common.dto.js';
import type { CustomerInputDto, ListCustomersDto } from '../common/dtos/customers.dto.js';
import { Helper } from '../common/helper.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Customers by last name, optionally filtered by name or phone. */
  async list(business_id: string, query: ListCustomersDto) {
    const where: Prisma.customersWhereInput = { business_id };
    if (query.search) {
      const phoneDigits = query.search.replace(/\D/g, '');
      where.OR = [
        { first_name: { contains: query.search, mode: 'insensitive' } },
        { last_name: { contains: query.search, mode: 'insensitive' } },
        ...(phoneDigits ? [{ phone: { contains: phoneDigits } }] : []),
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.customers.count({ where }),
      this.prisma.customers.findMany({
        where,
        select: customerSelect,
        orderBy: [{ last_name: query.order }, { first_name: query.order }],
        skip: query.skip,
        take: query.take,
      }),
    ]);
    const pageMeta = new PageMetaDto({ count: total, pageOptionsDto: query });
    return new PageDto(data, pageMeta);
  }

  async get(business_id: string, customer_id: string) {
    const customer = await this.prisma.customers.findFirst({
      where: { id: customer_id, business_id },
      select: customerSelect,
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  /**
   * The customer with this phone number, created if new. A returning customer keeps their
   * stored name (the business may have corrected it); a missing email is filled in.
   */
  async findOrCreate(business_id: string, input: CustomerInputDto): Promise<{ id: string }> {
    const phone = Helper.normalizePhone(input.phone);
    const existing = await this.prisma.customers.findUnique({
      where: { business_id_phone: { business_id, phone } },
      select: { id: true, email: true },
    });
    if (existing) {
      if (input.email && !existing.email) {
        await this.prisma.customers.update({ where: { id: existing.id }, data: { email: input.email } });
      }
      return { id: existing.id };
    }

    try {
      return await this.prisma.customers.create({
        data: {
          business_id,
          first_name: input.first_name,
          last_name: input.last_name,
          phone,
          email: input.email ?? null,
        },
        select: { id: true },
      });
    } catch (error) {
      // Two bookings by the same new customer at once: the other one created the record.
      if (!Helper.isUniqueViolation(error)) throw error;
      return this.prisma.customers.findUniqueOrThrow({
        where: { business_id_phone: { business_id, phone } },
        select: { id: true },
      });
    }
  }
}
