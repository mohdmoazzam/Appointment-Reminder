import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { BookingController } from './booking.controller.js';
import { BookingService } from './booking.service.js';

/** Online booking for customers, through the business's shareable /book/:slug page. */
@Module({
  imports: [AppointmentsModule, CustomersModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
