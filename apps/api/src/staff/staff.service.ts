import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../common/crypto/crypto.service.js';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Prisma } from '../common/database/prisma/generated/client.js';
import { serviceInclude, toServiceResponse, userSelect } from '../common/database/selects.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { PageDto, PageMetaDto, type PageOptionsDto } from '../common/dtos/common.dto.js';
import type { ListServicesDto } from '../common/dtos/services.dto.js';
import type { CreateInviteDto, SetStaffServicesDto, UpdateStaffDto } from '../common/dtos/staff.dto.js';
import { Helper } from '../common/helper.js';
import type { AppConfigService } from '../config/env.config.js';

const inviteSelect = {
  id: true,
  email: true,
  first_name: true,
  last_name: true,
  role: true,
  invited_by_id: true,
  expires_at: true,
  created_at: true,
} as const;

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    @Inject(ConfigService) private readonly config: AppConfigService,
  ) {}

  /** Staff accounts in the business, ordered by when they joined. */
  async list(business_id: string, query: PageOptionsDto) {
    const where = { business_id } satisfies Prisma.usersWhereInput;
    const [total, data] = await this.prisma.$transaction([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        select: userSelect,
        orderBy: { created_at: query.order },
        skip: query.skip,
        take: query.take,
      }),
    ]);
    const pageMeta = new PageMetaDto({ count: total, pageOptionsDto: query });
    return new PageDto(data, pageMeta);
  }

  async get(business_id: string, user_id: string) {
    const user = await this.prisma.users.findFirst({
      where: { id: user_id, business_id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('Staff member not found');
    return user;
  }

  /** Services the staff member offers, alphabetical by default. */
  async listServices(business_id: string, user_id: string, query: ListServicesDto) {
    await this.get(business_id, user_id);
    const where = {
      business_id,
      is_active: query.is_active,
      staff_services: { some: { user_id } },
    } satisfies Prisma.servicesWhereInput;
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

  /** Replaces the set of services the staff member offers. */
  async setServices(business_id: string, user_id: string, dto: SetStaffServicesDto): Promise<void> {
    await this.get(business_id, user_id);
    const found = await this.prisma.services.count({
      where: { id: { in: dto.service_ids }, business_id },
    });
    if (found !== dto.service_ids.length) {
      throw new BadRequestException('service_ids must only contain services of this business');
    }

    await this.prisma.$transaction([
      this.prisma.staff_services.deleteMany({ where: { user_id } }),
      this.prisma.staff_services.createMany({
        data: dto.service_ids.map((service_id) => ({ user_id, service_id })),
      }),
    ]);
  }

  /** Invites that are still pending (not accepted, not expired), newest first by default. */
  async listInvites(business_id: string, query: PageOptionsDto) {
    const where = {
      business_id,
      accepted_at: null,
      expires_at: { gt: Helper.getCurrentTimestamp() },
    } satisfies Prisma.staff_invitesWhereInput;
    const [total, data] = await this.prisma.$transaction([
      this.prisma.staff_invites.count({ where }),
      this.prisma.staff_invites.findMany({
        where,
        select: inviteSelect,
        orderBy: { created_at: query.order },
        skip: query.skip,
        take: query.take,
      }),
    ]);
    const pageMeta = new PageMetaDto({ count: total, pageOptionsDto: query });
    return new PageDto(data, pageMeta);
  }

  /** No email service yet, so the link is returned for the owner to share. */
  async createInvite(auth: AuthUser, dto: CreateInviteDto) {
    const existing = await this.prisma.users.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) throw new ConflictException('An account with this email already exists');

    const { token, token_hash } = this.crypto.generateOpaqueToken();
    const expires_at = Helper.addDays(this.config.get('INVITE_TTL_DAYS', { infer: true }));
    const [, invite] = await this.prisma.$transaction([
      // Re-inviting replaces any pending invite, so only the newest link works.
      this.prisma.staff_invites.deleteMany({
        where: {
          business_id: auth.business_id,
          email: dto.email,
          accepted_at: null,
        },
      }),
      this.prisma.staff_invites.create({
        data: {
          business_id: auth.business_id,
          email: dto.email,
          first_name: dto.first_name,
          last_name: dto.last_name,
          role: dto.role ?? 'staff',
          token_hash,
          invited_by_id: auth.user_id,
          expires_at,
        },
        select: inviteSelect,
      }),
    ]);
    return { ...invite, invite_url: `${this.config.get('APP_URL', { infer: true })}/invite/${token}` };
  }

  async revokeInvite(business_id: string, invite_id: string) {
    const { count } = await this.prisma.staff_invites.deleteMany({
      where: { id: invite_id, business_id, accepted_at: null },
    });
    if (count === 0) throw new NotFoundException('Invite not found');
  }

  /**
   * Changes role and/or status. Runs serializable so two owners demoting each other at the
   * same time can't leave the business without an active owner.
   */
  update(auth: AuthUser, user_id: string, dto: UpdateStaffDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const target = await tx.users.findFirst({
          where: { id: user_id, business_id: auth.business_id },
          select: { role: true, status: true },
        });
        if (!target) throw new NotFoundException('Staff member not found');

        const role = dto.role ?? target.role;
        const status = dto.status ?? target.status;

        if (user_id === auth.user_id && status === 'disabled') {
          throw new ConflictException("You can't disable your own account");
        }
        const wasActiveOwner = target.role === 'owner' && target.status === 'active';
        if (wasActiveOwner && (role !== 'owner' || status !== 'active')) {
          const owners = await tx.users.count({
            where: { business_id: auth.business_id, role: 'owner', status: 'active' },
          });
          if (owners <= 1) {
            throw new ConflictException('A business must keep at least one active owner');
          }
        }

        const user = await tx.users.update({
          where: { id: user_id },
          data: { role, status },
          select: userSelect,
        });
        if (status === 'disabled' && target.status !== 'disabled') {
          await tx.sessions.updateMany({
            where: { user_id, revoked_at: null },
            data: { revoked_at: Helper.getCurrentTimestamp() },
          });
        }
        return user;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  /** Soft delete: the account is disabled so appointment history keeps its author. */
  async remove(auth: AuthUser, user_id: string) {
    await this.update(auth, user_id, { status: 'disabled' });
  }
}
