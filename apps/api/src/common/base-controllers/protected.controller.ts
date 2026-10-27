import { Protected } from '../decorators/protected.decorator.js';

/** Base for controllers whose routes all need a valid access token (JwtAuthGuard + RolesGuard). */
@Protected()
export abstract class ProtectedController {}
