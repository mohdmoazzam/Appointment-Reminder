import { ConflictException, GoneException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../common/crypto/crypto.service.js';
import { PrismaService } from '../common/database/prisma.service.js';
import type { user_role } from '../common/database/prisma/generated/client.js';
import type { AuthUser, CredentialsUser } from '../common/decorators/current-user.decorator.js';
import type { AcceptInviteDto, SignupDto } from '../common/dtos/auth.dto.js';
import { Helper } from '../common/helper.js';
import type { AppConfigService } from '../config/env.config.js';

export interface SessionMeta {
  user_agent?: string;
  ip?: string;
}

/** Returned by signup, login, invite accept and refresh. `id` is the user's id. */
export interface AuthTokens {
  id: string;
  access_token: string;
  refresh_token: string;
}

interface SessionUser {
  id: string;
  business_id: string;
  role: user_role;
}

const EMAIL_TAKEN = 'An account with this email already exists';
const INVITE_GONE = 'This invite is invalid or has expired';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    @Inject(ConfigService) private readonly config: AppConfigService,
  ) {}

  /** Used by LocalStrategy. Returns null for unknown email, wrong password or disabled user. */
  async validateUser(email: string, password: string): Promise<CredentialsUser | null> {
    const user = await this.prisma.users.findUnique({
      where: { email },
      select: { id: true, business_id: true, role: true, status: true, password_hash: true },
    });
    if (!user) {
      await this.crypto.verifyAgainstDummy(password);
      return null;
    }
    const valid = await this.crypto.verifyPassword(user.password_hash, password);
    if (!valid || user.status !== 'active') return null;
    return { user_id: user.id, business_id: user.business_id, role: user.role };
  }

  /** Creates the business and its first owner in one statement. */
  async signup(dto: SignupDto, meta: SessionMeta): Promise<AuthTokens> {
    if (await this.emailExists(dto.owner.email)) {
      throw new ConflictException(EMAIL_TAKEN);
    }
    const password_hash = await this.crypto.hashPassword(dto.owner.password);

    for (let attempt = 0; ; attempt++) {
      const slug = await this.availableSlug(dto.business.name);
      try {
        const business = await this.prisma.businesses.create({
          data: {
            ...dto.business,
            slug: slug,
            users: {
              create: {
                email: dto.owner.email,
                first_name: dto.owner.first_name,
                last_name: dto.owner.last_name,
                password_hash,
                role: 'owner',
                last_login_at: Helper.getCurrentTimestamp(),
              },
            },
          },
          select: {
            users: {
              select: {
                id: true,
                business_id: true,
                role: true,
              },
            },
          },
        });
        return this.issueSession(business.users[0], meta);
      } catch (error) {
        if (!Helper.isUniqueViolation(error)) throw error;
        if (await this.emailExists(dto.owner.email)) {
          throw new ConflictException(EMAIL_TAKEN);
        }

        if (attempt >= 3) throw error;
      }
    }
  }

  async login(auth: CredentialsUser, meta: SessionMeta): Promise<AuthTokens> {
    const user = await this.prisma.users.update({
      where: { id: auth.user_id },
      data: {
        last_login_at: Helper.getCurrentTimestamp(),
      },
      select: {
        id: true,
        business_id: true,
        role: true,
      },
    });
    return this.issueSession(user, meta);
  }

  /**
   * Rotates the session's refresh token in place and slides its expiry forward. Presenting
   * the token the session had before its last rotation means it was copied, so the session
   * is revoked.
   */
  async refresh(token: string, meta: SessionMeta): Promise<AuthTokens> {
    const token_hash = this.crypto.hashToken(token);
    const session = await this.prisma.sessions.findUnique({
      where: { refresh_token_hash: token_hash },
      include: { user: { select: { id: true, business_id: true, role: true, status: true } } },
    });
    if (!session) {
      const reused = await this.prisma.sessions.findUnique({
        where: { previous_token_hash: token_hash },
        select: { id: true },
      });
      if (reused) await this.revokeSessions({ id: reused.id });
      throw new UnauthorizedException();
    }
    if (session.revoked_at || Helper.isExpired(session.expires_at) || session.user.status !== 'active') {
      throw new UnauthorizedException();
    }

    const next = this.crypto.generateOpaqueToken();
    // Matching on the old hash makes the rotation atomic: of two concurrent refreshes, one wins.
    const rotated = await this.prisma.sessions.updateMany({
      where: { id: session.id, refresh_token_hash: token_hash, revoked_at: null },
      data: {
        refresh_token_hash: next.token_hash,
        previous_token_hash: token_hash,
        expires_at: this.sessionExpiry(),
        last_used_at: Helper.getCurrentTimestamp(),
        user_agent: meta.user_agent?.slice(0, 500),
        ip: meta.ip,
      },
    });
    if (rotated.count === 0) {
      await this.revokeSessions({ id: session.id });
      throw new UnauthorizedException();
    }

    return {
      id: session.user.id,
      access_token: await this.signAccessToken(session.user, session.id),
      refresh_token: next.token,
    };
  }

  /** Logs out the device the request came from. */
  async logout(auth: AuthUser): Promise<void> {
    await this.revokeSessions({ id: auth.session_id });
  }

  async previewInvite(token: string) {
    const invite = await this.findUsableInvite(token);
    return {
      email: invite.email,
      first_name: invite.first_name,
      last_name: invite.last_name,
      role: invite.role,
      expires_at: invite.expires_at,
      business: { name: invite.business.name },
    };
  }

  async acceptInvite(token: string, dto: AcceptInviteDto, meta: SessionMeta): Promise<AuthTokens> {
    const invite = await this.findUsableInvite(token);
    const password_hash = await this.crypto.hashPassword(dto.password);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.staff_invites.updateMany({
          where: {
            id: invite.id,
            accepted_at: null,
            expires_at: { gt: Helper.getCurrentTimestamp() },
          },
          data: { accepted_at: Helper.getCurrentTimestamp() },
        });
        if (claimed.count === 0) throw new GoneException(INVITE_GONE);
        return tx.users.create({
          data: {
            business_id: invite.business_id,
            email: invite.email,
            first_name: dto.first_name ?? invite.first_name,
            last_name: dto.last_name ?? invite.last_name,
            role: invite.role,
            password_hash,
            last_login_at: Helper.getCurrentTimestamp(),
          },
          select: {
            id: true,
            business_id: true,
            role: true,
          },
        });
      });
      return await this.issueSession(user, meta);
    } catch (error) {
      if (Helper.isUniqueViolation(error)) throw new ConflictException(EMAIL_TAKEN);
      throw error;
    }
  }

  /** Starts a new session (one per device) and returns its tokens. */
  private async issueSession(user: SessionUser, meta: SessionMeta): Promise<AuthTokens> {
    const { token, token_hash } = this.crypto.generateOpaqueToken();

    // The id comes from the database (uuidv7()), so the token is signed after the insert.
    const session = await this.prisma.sessions.create({
      data: {
        user_id: user.id,
        refresh_token_hash: token_hash,
        expires_at: this.sessionExpiry(),
        user_agent: meta.user_agent?.slice(0, 500),
        ip: meta.ip,
      },
      select: { id: true },
    });

    return {
      id: user.id,
      access_token: await this.signAccessToken(user, session.id),
      refresh_token: token,
    };
  }

  private signAccessToken(user: SessionUser, session_id: string): Promise<string> {
    return this.crypto.signAccessToken({
      sub: user.id,
      bid: user.business_id,
      sid: session_id,
      role: user.role,
    });
  }

  private sessionExpiry(): Date {
    return Helper.addDays(this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }));
  }

  /** Revokes the active sessions matching `where`; returns how many were revoked. */
  private async revokeSessions(where: { id?: string; user_id?: string }): Promise<number> {
    const { count } = await this.prisma.sessions.updateMany({
      where: { ...where, revoked_at: null },
      data: { revoked_at: Helper.getCurrentTimestamp() },
    });
    return count;
  }

  private async findUsableInvite(token: string) {
    const invite = await this.prisma.staff_invites.findUnique({
      where: { token_hash: this.crypto.hashToken(token) },
      include: { business: { select: { name: true } } },
    });
    if (!invite || invite.accepted_at || Helper.isExpired(invite.expires_at)) {
      throw new GoneException(INVITE_GONE);
    }
    return invite;
  }

  private async emailExists(email: string): Promise<boolean> {
    return !!(await this.prisma.users.findUnique({ where: { email }, select: { id: true } }));
  }

  /** "glow-salon", then "glow-salon-2", "glow-salon-3", ... */
  private async availableSlug(name: string): Promise<string> {
    const base = Helper.slugify(name);
    const taken = new Set(
      (
        await this.prisma.businesses.findMany({
          where: { slug: { startsWith: base } },
          select: { slug: true },
        })
      ).map((b) => b.slug),
    );
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) {
      if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
    }
  }
}
