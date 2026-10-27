import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Requires a valid access token. Applied via ProtectedController / @Protected(). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
