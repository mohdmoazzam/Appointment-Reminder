import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { PublicController } from './common/base-controllers/public.controller.js';

@Controller()
export class AppController extends PublicController {
  constructor(private readonly appService: AppService) {
    super();
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
