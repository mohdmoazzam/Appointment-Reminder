import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicController } from '../common/base-controllers/public.controller.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController extends PublicController {
  constructor(private readonly healthService: HealthService) {
    super();
  }

  @Get()
  async check() {
    const health = await this.healthService.check();
    if (health.status !== 'ok') throw new ServiceUnavailableException(health);
    return health;
  }
}
