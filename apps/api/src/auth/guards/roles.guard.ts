import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';
import type { user_role } from '../../common/database/prisma/generated/client.js';

/** Runs after JwtAuthGuard (see ProtectedController); enforces @Roles() when present. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<user_role[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest<Request>().user as AuthUser | undefined;
    return !!user && roles.includes(user.role);
  }
}
