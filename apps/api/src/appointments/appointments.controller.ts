import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProtectedController } from '../common/base-controllers/protected.controller.js';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import {
  AvailabilityQueryDto,
  CreateAppointmentDto,
  ListAppointmentsDto,
  RescheduleAppointmentDto,
  UpdateAppointmentStatusDto,
} from '../common/dtos/appointments.dto.js';
import { AppointmentsService } from './appointments.service.js';

/** Booking and managing appointments from the dashboard. Owners and staff alike. */
@ApiTags('appointments')
@Controller()
export class AppointmentsController extends ProtectedController {
  constructor(private readonly appointmentsService: AppointmentsService) {
    super();
  }

  /** Free start times for a service on a day. One row per start time, with who is free then. */
  @Get('availability')
  availability(@CurrentUser() auth: AuthUser, @Query() query: AvailabilityQueryDto) {
    return this.appointmentsService.findSlots(auth.business_id, query);
  }

  @Get('appointments')
  list(@CurrentUser() auth: AuthUser, @Query() query: ListAppointmentsDto) {
    return this.appointmentsService.list(auth.business_id, query);
  }

  @Get('appointments/:appointment_id')
  get(@CurrentUser() auth: AuthUser, @Param('appointment_id', ParseUUIDPipe) appointment_id: string) {
    return this.appointmentsService.get(auth.business_id, appointment_id);
  }

  @Post('appointments')
  create(@CurrentUser() auth: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.createFromDashboard(auth, dto);
  }

  @Patch('appointments/:appointment_id/reschedule')
  reschedule(
    @CurrentUser() auth: AuthUser,
    @Param('appointment_id', ParseUUIDPipe) appointment_id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(auth.business_id, appointment_id, dto);
  }

  @Post('appointments/:appointment_id/status')
  @HttpCode(200)
  updateStatus(
    @CurrentUser() auth: AuthUser,
    @Param('appointment_id', ParseUUIDPipe) appointment_id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(auth.business_id, appointment_id, dto);
  }
}
