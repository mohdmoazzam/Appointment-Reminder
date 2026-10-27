import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProtectedController } from '../common/base-controllers/protected.controller.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { PageOptionsDto } from '../common/dtos/common.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController extends ProtectedController {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  @Get('me')
  me(@CurrentUser() auth: AuthUser) {
    return this.usersService.me(auth);
  }

  @Get('me/sessions')
  listSessions(@CurrentUser() auth: AuthUser, @Query() query: PageOptionsDto) {
    return this.usersService.listSessions(auth, query);
  }

  @Delete('me/sessions/:session_id')
  @HttpCode(204)
  revokeSession(@CurrentUser() auth: AuthUser, @Param('session_id', ParseUUIDPipe) session_id: string) {
    return this.usersService.revokeSession(auth, session_id);
  }

  @Post('me/logout-all')
  @HttpCode(204)
  logoutAll(@CurrentUser() auth: AuthUser) {
    return this.usersService.logoutAll(auth);
  }
}
