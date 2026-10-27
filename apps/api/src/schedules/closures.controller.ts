import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProtectedController } from '../common/base-controllers/protected.controller.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreateClosureDto, ListDateRangesDto, UpdateClosureDto } from '../common/dtos/schedules.dto.js';
import { SchedulesService } from './schedules.service.js';

/** Holidays and other days the whole business is closed. */
@ApiTags('schedules')
@Controller('closures')
export class ClosuresController extends ProtectedController {
  constructor(private readonly schedulesService: SchedulesService) {
    super();
  }

  @Get()
  list(@CurrentUser() auth: AuthUser, @Query() query: ListDateRangesDto) {
    return this.schedulesService.listClosures(auth.business_id, query);
  }

  @Roles('owner')
  @Post()
  create(@CurrentUser() auth: AuthUser, @Body() dto: CreateClosureDto) {
    return this.schedulesService.createClosure(auth.business_id, dto);
  }

  @Roles('owner')
  @Patch(':closure_id')
  update(@CurrentUser() auth: AuthUser, @Param('closure_id', ParseUUIDPipe) closure_id: string, @Body() dto: UpdateClosureDto) {
    return this.schedulesService.updateClosure(auth.business_id, closure_id, dto);
  }

  @Roles('owner')
  @Delete(':closure_id')
  @HttpCode(204)
  remove(@CurrentUser() auth: AuthUser, @Param('closure_id', ParseUUIDPipe) closure_id: string) {
    return this.schedulesService.removeClosure(auth.business_id, closure_id);
  }
}
