import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';

/** The business's bookable services (name, duration, price) and who offers them. */
@Module({
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
