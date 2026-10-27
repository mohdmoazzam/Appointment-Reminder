import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProtectedController } from '../common/base-controllers/protected.controller.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PageOptionsDto } from '../common/dtos/common.dto.js';
import { CreateTimeOffDto, ListDateRangesDto, SetWorkingHoursDto } from '../common/dtos/schedules.dto.js';
import { SchedulesService } from './schedules.service.js';

/** A staff member's weekly working hours and time off. Anyone in the business can read; owners edit. */
@ApiTags('schedules')
@Controller('staff/:user_id')
export class StaffScheduleController extends ProtectedController {
  constructor(private readonly schedulesService: SchedulesService) {
    super();
  }

  @Get('working-hours')
  listWorkingHours(@CurrentUser() auth: AuthUser, @Param('user_id', ParseUUIDPipe) user_id: string, @Query() query: PageOptionsDto) {
    return this.schedulesService.listWorkingHours(auth.business_id, user_id, query);
  }

  @Roles('owner')
  @Put('working-hours')
  @HttpCode(204)
  setWorkingHours(@CurrentUser() auth: AuthUser, @Param('user_id', ParseUUIDPipe) user_id: string, @Body() dto: SetWorkingHoursDto) {
    return this.schedulesService.setWorkingHours(auth.business_id, user_id, dto);
  }

  @Get('time-off')
  listTimeOff(@CurrentUser() auth: AuthUser, @Param('user_id', ParseUUIDPipe) user_id: string, @Query() query: ListDateRangesDto) {
    return this.schedulesService.listTimeOff(auth.business_id, user_id, query);
  }

  @Roles('owner')
  @Post('time-off')
  createTimeOff(@CurrentUser() auth: AuthUser, @Param('user_id', ParseUUIDPipe) user_id: string, @Body() dto: CreateTimeOffDto) {
    return this.schedulesService.createTimeOff(auth.business_id, user_id, dto);
  }

  @Roles('owner')
  @Delete('time-off/:time_off_id')
  @HttpCode(204)
  removeTimeOff(
    @CurrentUser() auth: AuthUser,
    @Param('user_id', ParseUUIDPipe) user_id: string,
    @Param('time_off_id', ParseUUIDPipe) time_off_id: string,
  ) {
    return this.schedulesService.removeTimeOff(auth.business_id, user_id, time_off_id);
  }
}
