import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Prisma } from '../common/database/prisma/generated/client.js';
import { toClosureResponse, toTimeOffResponse, toWorkingHoursResponse } from '../common/database/selects.js';
import type { PageOptionsDto } from '../common/dtos/common.dto.js';
import { PageDto, PageMetaDto } from '../common/dtos/common.dto.js';
import {
  MAX_DATE_RANGE_DAYS,
  MAX_INTERVALS_PER_DAY,
  type CreateClosureDto,
  type CreateTimeOffDto,
  type ListDateRangesDto,
  type SetWorkingHoursDto,
  type UpdateClosureDto,
} from '../common/dtos/schedules.dto.js';
import { Helper } from '../common/helper.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface MinuteInterval {
  day_of_week: number;
  start_minute: number;
  end_minute: number;
}

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Working hours -----------------------------------------------------------------------------

  /** The weekly schedule, Sunday first by default (`order` applies to the day). */
  async listWorkingHours(business_id: string, user_id: string, query: PageOptionsDto) {
    await this.assertStaffInBusiness(business_id, user_id);
    const where = { user_id } satisfies Prisma.working_hoursWhereInput;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.working_hours.count({ where }),
      this.prisma.working_hours.findMany({
        where,
        orderBy: [{ day_of_week: query.order }, { start_minute: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
    ]);
    const pageMeta = new PageMetaDto({ count: total, pageOptionsDto: query });
    return new PageDto(rows.map(toWorkingHoursResponse), pageMeta);
  }

  /** Replaces the whole weekly schedule. An empty list means no regular working hours. */
  async setWorkingHours(business_id: string, user_id: string, dto: SetWorkingHoursDto): Promise<void> {
    await this.assertStaffInBusiness(business_id, user_id);
    const intervals = toValidatedIntervals(dto);

    await this.prisma.$transaction([
      this.prisma.working_hours.deleteMany({ where: { user_id } }),
      this.prisma.working_hours.createMany({
        data: intervals.map((interval) => ({ ...interval, user_id })),
      }),
    ]);
  }

  // --- Time off ----------------------------------------------------------------------------------

  /** Time off ending on or after `from` (default: today for the business), soonest first. */
  async listTimeOff(business_id: string, user_id: string, query: ListDateRangesDto) {
    await this.assertStaffInBusiness(business_id, user_id);
    const from = query.from ?? (await this.todayForBusiness(business_id));
    const where = {
      user_id,
      ends_on: { gte: Helper.parseDateOnly(from) },
    } satisfies Prisma.staff_time_offWhereInput;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.staff_time_off.count({ where }),
      this.prisma.staff_time_off.findMany({
        where,
        orderBy: { starts_on: query.order },
        skip: query.skip,
        take: query.take,
      }),
    ]);
    const pageMeta = new PageMetaDto({ count: total, pageOptionsDto: query });
    return new PageDto(rows.map(toTimeOffResponse), pageMeta);
  }

  async createTimeOff(business_id: string, user_id: string, dto: CreateTimeOffDto) {
    await this.assertStaffInBusiness(business_id, user_id);
    assertValidRange(dto.starts_on, dto.ends_on);

    const overlapping = await this.prisma.staff_time_off.findFirst({
      where: { user_id, ...overlapsRange(dto.starts_on, dto.ends_on) },
      select: { id: true },
    });
    if (overlapping) throw new ConflictException('This time off overlaps existing time off');

    const row = await this.prisma.staff_time_off.create({
      data: {
        business_id,
        user_id,
        starts_on: Helper.parseDateOnly(dto.starts_on),
        ends_on: Helper.parseDateOnly(dto.ends_on),
        reason: dto.reason || null,
      },
    });
    return toTimeOffResponse(row);
  }

  async removeTimeOff(business_id: string, user_id: string, time_off_id: string): Promise<void> {
    const { count } = await this.prisma.staff_time_off.deleteMany({
      where: { id: time_off_id, user_id, business_id },
    });
    if (count === 0) throw new NotFoundException('Time off not found');
  }

  // --- Business closures -------------------------------------------------------------------------

  /** Closures ending on or after `from` (default: today for the business), soonest first. */
  async listClosures(business_id: string, query: ListDateRangesDto) {
    const from = query.from ?? (await this.todayForBusiness(business_id));
    const where = {
      business_id,
      ends_on: { gte: Helper.parseDateOnly(from) },
    } satisfies Prisma.business_closuresWhereInput;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.business_closures.count({ where }),
      this.prisma.business_closures.findMany({
        where,
        orderBy: { starts_on: query.order },
        skip: query.skip,
        take: query.take,
      }),
    ]);
    const pageMeta = new PageMetaDto({ count: total, pageOptionsDto: query });
    return new PageDto(rows.map(toClosureResponse), pageMeta);
  }

  async createClosure(business_id: string, dto: CreateClosureDto) {
    assertValidRange(dto.starts_on, dto.ends_on);
    await this.assertNoOverlappingClosure(business_id, dto.starts_on, dto.ends_on);

    const row = await this.prisma.business_closures.create({
      data: {
        business_id,
        name: dto.name,
        starts_on: Helper.parseDateOnly(dto.starts_on),
        ends_on: Helper.parseDateOnly(dto.ends_on),
      },
    });
    return toClosureResponse(row);
  }

  async updateClosure(business_id: string, closure_id: string, dto: UpdateClosureDto) {
    const existing = await this.prisma.business_closures.findFirst({
      where: { id: closure_id, business_id },
    });
    if (!existing) throw new NotFoundException('Closure not found');

    const starts_on = dto.starts_on ?? Helper.formatDateOnly(existing.starts_on);
    const ends_on = dto.ends_on ?? Helper.formatDateOnly(existing.ends_on);
    assertValidRange(starts_on, ends_on);
    await this.assertNoOverlappingClosure(business_id, starts_on, ends_on, closure_id);

    const row = await this.prisma.business_closures.update({
      where: { id: closure_id },
      data: {
        name: dto.name,
        starts_on: Helper.parseDateOnly(starts_on),
        ends_on: Helper.parseDateOnly(ends_on),
      },
    });
    return toClosureResponse(row);
  }

  async removeClosure(business_id: string, closure_id: string): Promise<void> {
    const { count } = await this.prisma.business_closures.deleteMany({
      where: { id: closure_id, business_id },
    });
    if (count === 0) throw new NotFoundException('Closure not found');
  }

  // --- Helpers -----------------------------------------------------------------------------------

  private async assertStaffInBusiness(business_id: string, user_id: string): Promise<void> {
    const user = await this.prisma.users.findFirst({
      where: { id: user_id, business_id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Staff member not found');
  }

  private async assertNoOverlappingClosure(business_id: string, starts_on: string, ends_on: string, exclude_id?: string): Promise<void> {
    const overlapping = await this.prisma.business_closures.findFirst({
      where: { business_id, id: exclude_id ? { not: exclude_id } : undefined, ...overlapsRange(starts_on, ends_on) },
      select: { name: true },
    });
    if (overlapping) throw new ConflictException(`This overlaps the closure "${overlapping.name}"`);
  }

  private async todayForBusiness(business_id: string): Promise<string> {
    const business = await this.prisma.businesses.findUniqueOrThrow({
      where: { id: business_id },
      select: { timezone: true },
    });
    return Helper.todayInTimeZone(business.timezone);
  }
}

/** Rows whose inclusive [starts_on, ends_on] range shares at least one day with the given one. */
function overlapsRange(starts_on: string, ends_on: string) {
  return {
    starts_on: { lte: Helper.parseDateOnly(ends_on) },
    ends_on: { gte: Helper.parseDateOnly(starts_on) },
  };
}

function assertValidRange(starts_on: string, ends_on: string): void {
  const days = Helper.daysBetween(starts_on, ends_on);
  if (days < 0) throw new BadRequestException('ends_on must be on or after starts_on');
  if (days >= MAX_DATE_RANGE_DAYS) {
    throw new BadRequestException(`A date range can't be longer than ${MAX_DATE_RANGE_DAYS} days`);
  }
}

/**
 * Converts "HH:mm" intervals to minutes and checks each day: every interval ends after it
 * starts, no two overlap, and there are at most MAX_INTERVALS_PER_DAY.
 */
function toValidatedIntervals(dto: SetWorkingHoursDto): MinuteInterval[] {
  const intervals = dto.intervals.map((interval) => ({
    day_of_week: interval.day_of_week,
    start_minute: Helper.timeOfDayToMinutes(interval.start_time),
    end_minute: Helper.timeOfDayToMinutes(interval.end_time),
  }));

  for (let day = 0; day < 7; day++) {
    const dayIntervals = intervals.filter((interval) => interval.day_of_week === day).sort((a, b) => a.start_minute - b.start_minute);

    if (dayIntervals.length > MAX_INTERVALS_PER_DAY) {
      throw new BadRequestException(`${DAY_NAMES[day]} can have at most ${MAX_INTERVALS_PER_DAY} intervals`);
    }
    for (const [index, interval] of dayIntervals.entries()) {
      if (interval.end_minute <= interval.start_minute) {
        throw new BadRequestException(`On ${DAY_NAMES[day]}, every interval must end after it starts`);
      }
      const previous = dayIntervals[index - 1];
      if (previous && interval.start_minute < previous.end_minute) {
        throw new BadRequestException(`Working hours on ${DAY_NAMES[day]} overlap`);
      }
    }
  }
  return intervals;
}
