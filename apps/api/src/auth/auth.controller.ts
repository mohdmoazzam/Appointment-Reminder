import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { PublicController } from '../common/base-controllers/public.controller.js';
import { CurrentUser, type AuthUser, type CredentialsUser } from '../common/decorators/current-user.decorator.js';
import { Protected } from '../common/decorators/protected.decorator.js';
import { AcceptInviteDto, LoginDto, RefreshTokenDto, SignupDto } from '../common/dtos/auth.dto.js';
import { AuthService, type SessionMeta } from './auth.service.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';

const MINUTE = 60_000;

@ApiTags('auth')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController extends PublicController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  @Post('signup')
  signup(@Body() dto: SignupDto, @Req() req: Request) {
    return this.authService.signup(dto, sessionMeta(req));
  }

  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  login(@Body() _dto: LoginDto, @CurrentUser() user: CredentialsUser, @Req() req: Request) {
    return this.authService.login(user, sessionMeta(req));
  }

  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refresh_token, sessionMeta(req));
  }

  /** Logs out this device. Other devices: see /users/me/sessions and /users/me/logout-all. */
  @Protected()
  @Post('logout')
  @HttpCode(204)
  logout(@CurrentUser() auth: AuthUser) {
    return this.authService.logout(auth);
  }

  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @Get('invites/:token')
  previewInvite(@Param('token') token: string) {
    return this.authService.previewInvite(token);
  }

  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @Post('invites/:token/accept')
  @HttpCode(200)
  acceptInvite(@Param('token') token: string, @Body() dto: AcceptInviteDto, @Req() req: Request) {
    return this.authService.acceptInvite(token, dto, sessionMeta(req));
  }
}

function sessionMeta(req: Request): SessionMeta {
  return { user_agent: req.get('user-agent'), ip: req.ip };
}
