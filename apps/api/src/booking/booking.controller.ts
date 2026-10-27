import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PublicController } from '../common/base-controllers/public.controller.js';
import { PublicAvailabilityQueryDto, PublicBookingDto } from '../common/dtos/booking.dto.js';
import { PageOptionsDto } from '../common/dtos/common.dto.js';
import { BookingService } from './booking.service.js';

const MINUTE = 60_000;

/** The public booking page's API: no login, rate limited, scoped by the business's slug. */
@ApiTags('booking (public)')
@UseGuards(ThrottlerGuard)
@Controller('public/businesses/:slug')
export class BookingController extends PublicController {
  constructor(private readonly bookingService: BookingService) {
    super();
  }

  @Get()
  getBusiness(@Param('slug') slug: string) {
    return this.bookingService.getBusiness(slug);
  }

  @Get('services')
  listServices(@Param('slug') slug: string, @Query() query: PageOptionsDto) {
    return this.bookingService.listServices(slug, query);
  }

  @Get('availability')
  availability(@Param('slug') slug: string, @Query() query: PublicAvailabilityQueryDto) {
    return this.bookingService.findSlots(slug, query);
  }

  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @Post('appointments')
  book(@Param('slug') slug: string, @Body() dto: PublicBookingDto) {
    return this.bookingService.book(slug, dto);
  }
}
