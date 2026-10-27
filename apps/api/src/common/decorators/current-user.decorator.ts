import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { user_role } from '../database/prisma/generated/client.js';

/** What JwtStrategy attaches to `req.user` for authenticated requests. */
export interface AuthUser {
  user_id: string;
  business_id: string;
  session_id: string;
  role: user_role;
}

/** What LocalStrategy attaches on login, before a session exists. */
export type CredentialsUser = Omit<AuthUser, 'session_id'>;

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest<Request>().user as AuthUser,
);
