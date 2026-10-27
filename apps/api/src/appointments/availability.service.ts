import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Prisma } from '../common/database/prisma/generated/client.js';
import { Helper } from '../common/helper.js';

/** Slot start times are offered every 15 minutes from the start of each working session. */
export const SLOT_STEP_MINUTES = 15;

/** One bookable start time and the staff members free for the whole service at that time. */
export interface Slot {
  starts_at: Date;
  ends_at: Date;
  /** "HH:mm" in the business's time zone, for display. */
  start_time: string;
  staff_ids: string[];
}

export interface FindSlotsInput {
  business_id: string;
  service_id: string;
  /** "YYYY-MM-DD" in the business's time zone. */
  date: string;
  /** Only this staff member; otherwise everyone who offers the service. */
  staff_id?: string;
  /** Treat this appointment as not there (rescheduling it shouldn't collide with itself). */
  ignore_appointment_id?: string;
  /** Leave out slots starting before this instant (e.g. now, for online booking). */
  not_before?: Date;
}

export interface AssertBookableInput {
  business_id: string;
  service_id: string;
  staff_id: string;
  starts_at: Date;
  ends_at: Date;
  ignore_appointment_id?: string;
  /** Skip working hours, closures and time off (dashboard walk-ins). Overlaps are always checked. */
  ignore_schedule: boolean;
  /** Refuse times in the past (online booking). */
  require_future: boolean;
}

interface ServiceForBooking {
  id: string;
  name: string;
  duration_minutes: number;
  price: Prisma.Decimal;
}

/** Appointments in these statuses take up the staff member's time. */
const BLOCKING_STATUSES_FILTER = { not: 'cancelled' } as const;

/**
 * Works out when people can be booked. A staff member is free at a time when all of these hold:
 *   - the business isn't closed that day (business_closures)
 *   - they aren't on time off that day (staff_time_off)
 *   - the whole service fits inside one of their working sessions that weekday (working_hours)
 *   - it doesn't overlap another of their appointments that isn't cancelled
 * All of it in the business's time zone. The database enforces the last rule as well
 * (appointments_no_overlap), so two bookings racing for the same slot can't both succeed.
 */
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Free start times on one day, earliest first. */
  async findSlots(input: FindSlotsInput): Promise<Slot[]> {
    const timeZone = await this.getTimeZone(input.business_id);
    const service = await this.getService(input.business_id, input.service_id, { require_active: true });
    const staffIds = await this.getEligibleStaffIds(input.business_id, input.service_id, input.staff_id);
    if (staffIds.length === 0) return [];

    const dayValue = Helper.parseDateOnly(input.date);
    const { start: dayStart, end: dayEnd } = Helper.zonedDayBounds(input.date, timeZone);

    const [closure, timeOff, workingHours, busy] = await Promise.all([
      this.prisma.business_closures.findFirst({
        where: { business_id: input.business_id, starts_on: { lte: dayValue }, ends_on: { gte: dayValue } },
        select: { id: true },
      }),
      this.prisma.staff_time_off.findMany({
        where: { user_id: { in: staffIds }, starts_on: { lte: dayValue }, ends_on: { gte: dayValue } },
        select: { user_id: true },
      }),
      this.prisma.working_hours.findMany({
        where: { user_id: { in: staffIds }, day_of_week: Helper.dayOfWeek(input.date) },
        orderBy: { start_minute: 'asc' },
      }),
      this.prisma.appointments.findMany({
        where: {
          staff_id: { in: staffIds },
          status: BLOCKING_STATUSES_FILTER,
          starts_at: { lt: dayEnd },
          ends_at: { gt: dayStart },
          id: input.ignore_appointment_id ? { not: input.ignore_appointment_id } : undefined,
        },
        select: { staff_id: true, starts_at: true, ends_at: true },
      }),
    ]);
    if (closure) return [];

    const awayStaffIds = new Set(timeOff.map((entry) => entry.user_id));
    const slotsByStart = new Map<number, Slot>();

    for (const session of workingHours) {
      if (awayStaffIds.has(session.user_id)) continue;
      const staffBusy = busy.filter((appointment) => appointment.staff_id === session.user_id);

      for (let minute = session.start_minute; minute + service.duration_minutes <= session.end_minute; minute += SLOT_STEP_MINUTES) {
        const startsAt = Helper.zonedDateTime(input.date, minute, timeZone);
        const endsAt = Helper.addMinutes(startsAt, service.duration_minutes);
        if (input.not_before && startsAt < input.not_before) continue;
        if (staffBusy.some((appointment) => overlaps(appointment, startsAt, endsAt))) continue;

        const key = startsAt.getTime();
        const slot = slotsByStart.get(key) ?? {
          starts_at: startsAt,
          ends_at: endsAt,
          start_time: Helper.minutesToTimeOfDay(minute),
          staff_ids: [],
        };
        if (!slot.staff_ids.includes(session.user_id)) slot.staff_ids.push(session.user_id);
        slotsByStart.set(key, slot);
      }
    }

    return [...slotsByStart.values()].sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());
  }

  /**
   * Throws if the staff member can't take this appointment: 400 for an invalid request (the
   * staff member doesn't offer the service, a past time online), 409 when the time itself isn't
   * available (closed, time off, outside working hours, already booked).
   */
  async assertBookable(input: AssertBookableInput): Promise<void> {
    if (input.require_future && Helper.isPast(input.starts_at)) {
      throw new BadRequestException('That time has already passed');
    }

    const eligible = await this.getEligibleStaffIds(input.business_id, input.service_id, input.staff_id);
    if (eligible.length === 0) {
      throw new BadRequestException('This staff member is not available for this service');
    }

    if (!input.ignore_schedule) {
      await this.assertWithinSchedule(input);
    }

    const overlapping = await this.prisma.appointments.findFirst({
      where: {
        staff_id: input.staff_id,
        status: BLOCKING_STATUSES_FILTER,
        starts_at: { lt: input.ends_at },
        ends_at: { gt: input.starts_at },
        id: input.ignore_appointment_id ? { not: input.ignore_appointment_id } : undefined,
      },
      select: { id: true },
    });
    if (overlapping) throw new ConflictException('The staff member already has an appointment at that time');
  }

  /**
   * The service to book. Rescheduling passes require_active: false so an appointment for a
   * service that was since switched off can still be moved.
   */
  async getService(business_id: string, service_id: string, options: { require_active: boolean }): Promise<ServiceForBooking> {
    const service = await this.prisma.services.findFirst({
      where: { id: service_id, business_id },
      select: { id: true, name: true, duration_minutes: true, price: true, is_active: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (options.require_active && !service.is_active) {
      throw new BadRequestException('This service is not available for booking');
    }
    return service;
  }

  async getTimeZone(business_id: string): Promise<string> {
    const business = await this.prisma.businesses.findUniqueOrThrow({
      where: { id: business_id },
      select: { timezone: true },
    });
    return business.timezone;
  }

  /** Active staff who offer the service (only `staff_id`, if given). */
  private async getEligibleStaffIds(business_id: string, service_id: string, staff_id?: string): Promise<string[]> {
    const staff = await this.prisma.users.findMany({
      where: {
        business_id,
        status: 'active',
        id: staff_id,
        staff_services: { some: { service_id } },
      },
      select: { id: true },
      orderBy: { created_at: 'asc' },
    });
    return staff.map((member) => member.id);
  }

  private async assertWithinSchedule(input: AssertBookableInput): Promise<void> {
    const timeZone = await this.getTimeZone(input.business_id);
    const start = Helper.toZonedDateAndMinutes(input.starts_at, timeZone);
    const end = Helper.toZonedDateAndMinutes(input.ends_at, timeZone);
    // Sessions never cross midnight, so an appointment that does can't fit in one.
    const endMinute = end.date === start.date ? end.minutes : Number.POSITIVE_INFINITY;
    const dayValue = Helper.parseDateOnly(start.date);

    const [closure, timeOff, session] = await Promise.all([
      this.prisma.business_closures.findFirst({
        where: { business_id: input.business_id, starts_on: { lte: dayValue }, ends_on: { gte: dayValue } },
        select: { name: true },
      }),
      this.prisma.staff_time_off.findFirst({
        where: { user_id: input.staff_id, starts_on: { lte: dayValue }, ends_on: { gte: dayValue } },
        select: { id: true },
      }),
      this.prisma.working_hours.findFirst({
        where: {
          user_id: input.staff_id,
          day_of_week: Helper.dayOfWeek(start.date),
          start_minute: { lte: start.minutes },
          end_minute: { gte: endMinute === Number.POSITIVE_INFINITY ? 1440 : endMinute },
        },
        select: { id: true },
      }),
    ]);

    if (closure) throw new ConflictException(`The business is closed that day (${closure.name})`);
    if (timeOff) throw new ConflictException('The staff member is off that day');
    if (!session) throw new ConflictException("That time is outside the staff member's working hours");
  }
}

function overlaps(appointment: { starts_at: Date; ends_at: Date }, startsAt: Date, endsAt: Date): boolean {
  return appointment.starts_at < endsAt && appointment.ends_at > startsAt;
}
