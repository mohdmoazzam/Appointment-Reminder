import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProtectedController } from '../common/base-controllers/protected.controller.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PageOptionsDto } from '../common/dtos/common.dto.js';
import { ListServicesDto } from '../common/dtos/services.dto.js';
import { CreateInviteDto, SetStaffServicesDto, UpdateStaffDto } from '../common/dtos/staff.dto.js';
import { StaffService } from './staff.service.js';

@ApiTags('staff')
@Controller('staff')
export class StaffController extends ProtectedController {
  constructor(private readonly staffService: StaffService) {
    super();
  }

  @Get()
  list(@CurrentUser() auth: AuthUser, @Query() query: PageOptionsDto) {
    return this.staffService.list(auth.business_id, query);
  }

  @Get('invites')
  listInvites(@CurrentUser() auth: AuthUser, @Query() query: PageOptionsDto) {
    return this.staffService.listInvites(auth.business_id, query);
  }

  @Roles('owner')
  @Post('invites')
  createInvite(@CurrentUser() auth: AuthUser, @Body() dto: CreateInviteDto) {
    return this.staffService.createInvite(auth, dto);
  }

  @Roles('owner')
  @Delete('invites/:invite_id')
  @HttpCode(204)
  revokeInvite(@CurrentUser() auth: AuthUser, @Param('invite_id', ParseUUIDPipe) invite_id: string) {
    return this.staffService.revokeInvite(auth.business_id, invite_id);
  }

  @Get(':user_id')
  get(@CurrentUser() auth: AuthUser, @Param('user_id', ParseUUIDPipe) user_id: string) {
    return this.staffService.get(auth.business_id, user_id);
  }

  @Get(':user_id/services')
  listServices(@CurrentUser() auth: AuthUser, @Param('user_id', ParseUUIDPipe) user_id: string, @Query() query: ListServicesDto) {
    return this.staffService.listServices(auth.business_id, user_id, query);
  }

  @Roles('owner')
  @Put(':user_id/services')
  @HttpCode(204)
  setServices(@CurrentUser() auth: AuthUser, @Param('user_id', ParseUUIDPipe) user_id: string, @Body() dto: SetStaffServicesDto) {
    return this.staffService.setServices(auth.business_id, user_id, dto);
  }

  @Roles('owner')
  @Patch(':user_id')
  update(@CurrentUser() auth: AuthUser, @Param('user_id', ParseUUIDPipe) user_id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(auth, user_id, dto);
  }

  @Roles('owner')
  @Delete(':user_id')
  @HttpCode(204)
  remove(@CurrentUser() auth: AuthUser, @Param('user_id', ParseUUIDPipe) user_id: string) {
    return this.staffService.remove(auth, user_id);
  }
}
