import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import { businessInclude, toBusinessResponse, userSelect } from '../common/database/selects.js';
import type { Prisma } from '../common/database/prisma/generated/client.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { PageDto, PageMetaDto, type PageOptionsDto } from '../common/dtos/common.dto.js';
import { Helper } from '../common/helper.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(auth: AuthUser) {
    const user = await this.prisma.users.findUniqueOrThrow({
      where: { id: auth.user_id },
      select: { ...userSelect, business: { include: businessInclude } },
    });
    const { business, ...rest } = user;
    return {
      user: rest,
      business: toBusinessResponse(business),
    };
  }

  /**
   * The current user's logged-in devices, most recently used first by default; `current` marks
   * the one making this request.
   */
  async listSessions(auth: AuthUser, query: PageOptionsDto) {
    const where = {
      user_id: auth.user_id,
      revoked_at: null,
      expires_at: { gt: Helper.getCurrentTimestamp() },
    } satisfies Prisma.sessionsWhereInput;
    const [total, sessions] = await this.prisma.$transaction([
      this.prisma.sessions.count({ where }),
      this.prisma.sessions.findMany({
        where,
        select: {
          id: true,
          user_agent: true,
          ip: true,
          created_at: true,
          last_used_at: true,
          expires_at: true,
        },
        orderBy: { last_used_at: query.order },
        skip: query.skip,
        take: query.take,
      }),
    ]);
    const data = sessions.map((s) => ({ ...s, current: s.id === auth.session_id }));
    const pageMeta = new PageMetaDto({ count: total, pageOptionsDto: query });
    return new PageDto(data, pageMeta);
  }

  /** Logs out one of the current user's devices. */
  async revokeSession(auth: AuthUser, session_id: string): Promise<void> {
    const count = await this.revokeSessions({ id: session_id, user_id: auth.user_id });
    if (count === 0) throw new NotFoundException('Session not found');
  }

  /** Logs out every device, including this one. */
  async logoutAll(auth: AuthUser): Promise<void> {
    await this.revokeSessions({ user_id: auth.user_id });
  }

  private async revokeSessions(where: { id?: string; user_id: string }): Promise<number> {
    const { count } = await this.prisma.sessions.updateMany({
      where: { ...where, revoked_at: null },
      data: { revoked_at: Helper.getCurrentTimestamp() },
    });
    return count;
  }
}
