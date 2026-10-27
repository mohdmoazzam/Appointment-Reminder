import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { AvailabilityService } from './availability.service.js';

/** Appointments and the availability calculation behind them (also used by online booking). */
@Module({
  imports: [CustomersModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AvailabilityService],
  exports: [AppointmentsService, AvailabilityService],
})
export class AppointmentsModule {}
