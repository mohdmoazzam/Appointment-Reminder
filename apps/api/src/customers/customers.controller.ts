import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProtectedController } from '../common/base-controllers/protected.controller.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { ListCustomersDto } from '../common/dtos/customers.dto.js';
import { CustomersService } from './customers.service.js';

/** Customers are created by booking; staff can look them up (e.g. when booking a returning one). */
@ApiTags('customers')
@Controller('customers')
export class CustomersController extends ProtectedController {
  constructor(private readonly customersService: CustomersService) {
    super();
  }

  @Get()
  list(@CurrentUser() auth: AuthUser, @Query() query: ListCustomersDto) {
    return this.customersService.list(auth.business_id, query);
  }

  @Get(':customer_id')
  get(@CurrentUser() auth: AuthUser, @Param('customer_id', ParseUUIDPipe) customer_id: string) {
    return this.customersService.get(auth.business_id, customer_id);
  }
}
