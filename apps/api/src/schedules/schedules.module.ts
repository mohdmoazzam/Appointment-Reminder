import { Module } from '@nestjs/common';
import { ClosuresController } from './closures.controller.js';
import { SchedulesService } from './schedules.service.js';
import { StaffScheduleController } from './staff-schedule.controller.js';

/** When people can be booked: staff working hours and time off, and business closures. */
@Module({
  controllers: [StaffScheduleController, ClosuresController],
  providers: [SchedulesService],
})
export class SchedulesModule {}
