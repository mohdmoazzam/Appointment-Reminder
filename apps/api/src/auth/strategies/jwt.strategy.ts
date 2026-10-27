import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '../../common/crypto/crypto.service.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Helper } from '../../common/helper.js';
import type { AppConfigService } from '../../config/env.config.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
      algorithms: ['HS256'],
    });
  }

  /**
   * Re-reads the session and user so logout, logout-all, a disabled account or a role change
   * take effect immediately, not when the access token expires.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const session = await this.prisma.sessions.findUnique({
      where: { id: payload.sid },
      select: {
        user_id: true,
        revoked_at: true,
        expires_at: true,
        user: { select: { business_id: true, role: true, status: true } },
      },
    });
    if (
      !session ||
      session.user_id !== payload.sub ||
      session.revoked_at ||
      Helper.isExpired(session.expires_at) ||
      session.user.status !== 'active'
    ) {
      throw new UnauthorizedException();
    }
    return {
      user_id: payload.sub,
      business_id: session.user.business_id,
      session_id: payload.sid,
      role: session.user.role,
    };
  }
}
