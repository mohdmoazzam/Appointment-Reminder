import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProtectedController } from '../common/base-controllers/protected.controller.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreateServiceDto, ListServicesDto, UpdateServiceDto } from '../common/dtos/services.dto.js';
import { ServicesService } from './services.service.js';

@ApiTags('services')
@Controller('services')
export class ServicesController extends ProtectedController {
  constructor(private readonly servicesService: ServicesService) {
    super();
  }

  @Get()
  list(@CurrentUser() auth: AuthUser, @Query() query: ListServicesDto) {
    return this.servicesService.list(auth.business_id, query);
  }

  @Get(':service_id')
  get(@CurrentUser() auth: AuthUser, @Param('service_id', ParseUUIDPipe) service_id: string) {
    return this.servicesService.get(auth.business_id, service_id);
  }

  @Roles('owner')
  @Post()
  create(@CurrentUser() auth: AuthUser, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(auth.business_id, dto);
  }

  @Roles('owner')
  @Patch(':service_id')
  update(@CurrentUser() auth: AuthUser, @Param('service_id', ParseUUIDPipe) service_id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(auth.business_id, service_id, dto);
  }

  @Roles('owner')
  @Delete(':service_id')
  @HttpCode(204)
  remove(@CurrentUser() auth: AuthUser, @Param('service_id', ParseUUIDPipe) service_id: string) {
    return this.servicesService.remove(auth.business_id, service_id);
  }
}
