import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProtectedController } from '../common/base-controllers/protected.controller.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UpdateBusinessDto } from '../common/dtos/business.dto.js';
import { BusinessService } from './business.service.js';

@ApiTags('business')
@Controller('business')
export class BusinessController extends ProtectedController {
  constructor(private readonly businessService: BusinessService) {
    super();
  }

  @Get()
  get(@CurrentUser() auth: AuthUser) {
    return this.businessService.get(auth.business_id);
  }

  @Patch()
  @Roles('owner')
  update(@CurrentUser() auth: AuthUser, @Body() dto: UpdateBusinessDto) {
    return this.businessService.update(auth.business_id, dto);
  }
}
