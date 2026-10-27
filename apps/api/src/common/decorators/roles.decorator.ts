import { SetMetadata } from '@nestjs/common';
import type { user_role } from '../database/prisma/generated/client.js';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles (checked by the global RolesGuard). */
export const Roles = (...roles: user_role[]) => SetMetadata(ROLES_KEY, roles);
