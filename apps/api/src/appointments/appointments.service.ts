import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { appointment_source, appointment_status, Prisma } from '../common/database/prisma/generated/client.js';
import { appointmentInclude, toAppointmentResponse } from '../common/database/selects.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import type {
  AvailabilityQueryDto,
  CreateAppointmentDto,
  ListAppointmentsDto,
  RescheduleAppointmentDto,
  UpdateAppointmentStatusDto,
} from '../common/dtos/appointments.dto.js';
import { PageDto, PageMetaDto, type PageOptionsDto } from '../common/dtos/common.dto.js';
import { Helper } from '../common/helper.js';
import { CustomersService } from '../customers/customers.service.js';
import { AvailabilityService, type Slot } from './availability.service.js';

/** Name of the database's exclusion constraint against double bookings (see the migration). */
const NO_OVERLAP_CONSTRAINT = 'appointments_no_overlap';
const SLOT_TAKEN = 'That time was just booked by someone else. Please choose another time.';

/**
 * Which status may follow which. booked → confirmed → completed / cancelled / no-show; booked
 * can also go straight to any of the last three. The final states can't be changed.
 */
const ALLOWED_TRANSITIONS: Record<appointment_status, appointment_status[]> = {
  booked: ['confirmed', 'completed', 'cancelled', 'no_show'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

/** Only appointments in these statuses can be moved. */
const RESCHEDULABLE: appointment_status[] = ['booked', 'confirmed'];

export interface BookInput {
  business_id: string;
  service_id: string;
  staff_id: string;
  starts_at: Date;
  customer_id: string;
  notes: string | null;
  source: appointment_source;
  created_by_id: string | null;
  ignore_schedule: boolean;
  require_future: boolean;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly customers: CustomersService,
  ) {}

  /** Free start times for a service on a day (dashboard: past times included, for the record). */
  async findSlots(business_id: string, query: AvailabilityQueryDto) {
    const slots = await this.availability.findSlots({
      business_id,
      service_id: query.service_id,
      date: query.date,
      staff_id: query.staff_id,
      ignore_appointment_id: query.ignore_appointment_id,
    });
    return paginateSlots(slots, query);
  }

  /** Appointments in a date range (business's time zone), soonest first by default order. */
  async list(business_id: string, query: ListAppointmentsDto) {
    const timeZone = await this.availability.getTimeZone(business_id);
    const where: Prisma.appointmentsWhereInput = {
      business_id,
      staff_id: query.staff_id,
      customer_id: query.customer_id,
      status: query.status ?? (query.exclude_cancelled ? { not: 'cancelled' } : undefined),
      starts_at: {
        gte: query.date_from ? Helper.zonedDayBounds(query.date_from, timeZone).start : undefined,
        lt: query.date_to ? Helper.zonedDayBounds(query.date_to, timeZone).end : undefined,
      },
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.appointments.count({ where }),
      this.prisma.appointments.findMany({
        where,
        include: appointmentInclude,
        // Same start time (e.g. a cancelled appointment and its replacement): oldest first.
        orderBy: [{ starts_at: query.order }, { created_at: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
    ]);
    const pageMeta = new PageMetaDto({ count: total, pageOptionsDto: query });
    return new PageDto(rows.map(toAppointmentResponse), pageMeta);
  }

  async get(business_id: string, appointment_id: string) {
    const appointment = await this.prisma.appointments.findFirst({
      where: { id: appointment_id, business_id },
      include: appointmentInclude,
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return toAppointmentResponse(appointment);
  }

  /** Booking from the dashboard, for an existing customer or one entered now. */
  async createFromDashboard(auth: AuthUser, dto: CreateAppointmentDto) {
    const customer_id = await this.resolveCustomer(auth.business_id, dto);
    return this.book({
      business_id: auth.business_id,
      service_id: dto.service_id,
      staff_id: dto.staff_id,
      starts_at: Helper.parseInstant(dto.starts_at),
      customer_id,
      notes: dto.notes || null,
      source: 'dashboard',
      created_by_id: auth.user_id,
      ignore_schedule: dto.ignore_schedule ?? false,
      require_future: false,
    });
  }

  /** Creates an appointment after checking the time is free. Shared by dashboard and online booking. */
  async book(input: BookInput) {
    const service = await this.availability.getService(input.business_id, input.service_id, {
      require_active: true,
    });
    const ends_at = Helper.addMinutes(input.starts_at, service.duration_minutes);
    await this.availability.assertBookable({
      business_id: input.business_id,
      service_id: service.id,
      staff_id: input.staff_id,
      starts_at: input.starts_at,
      ends_at,
      ignore_schedule: input.ignore_schedule,
      require_future: input.require_future,
    });

    try {
      const appointment = await this.prisma.appointments.create({
        data: {
          business_id: input.business_id,
          service_id: service.id,
          staff_id: input.staff_id,
          customer_id: input.customer_id,
          starts_at: input.starts_at,
          ends_at,
          price: service.price,
          notes: input.notes,
          source: input.source,
          created_by_id: input.created_by_id,
        },
        include: appointmentInclude,
      });
      return toAppointmentResponse(appointment);
    } catch (error) {
      // Another booking for the same time committed between our check and this insert.
      if (Helper.isConstraintViolation(error, NO_OVERLAP_CONSTRAINT)) throw new ConflictException(SLOT_TAKEN);
      throw error;
    }
  }

  /** Moves an appointment to another time and/or staff member, keeping its booked length. */
  async reschedule(business_id: string, appointment_id: string, dto: RescheduleAppointmentDto) {
    const current = await this.prisma.appointments.findFirst({
      where: { id: appointment_id, business_id },
      select: { id: true, status: true, service_id: true, staff_id: true, starts_at: true, ends_at: true },
    });
    if (!current) throw new NotFoundException('Appointment not found');
    if (!RESCHEDULABLE.includes(current.status)) {
      throw new ConflictException(`A ${current.status.replace('_', '-')} appointment can't be rescheduled`);
    }

    const staff_id = dto.staff_id ?? current.staff_id;
    const starts_at = Helper.parseInstant(dto.starts_at);
    const lengthMinutes = (current.ends_at.getTime() - current.starts_at.getTime()) / 60_000;
    const ends_at = Helper.addMinutes(starts_at, lengthMinutes);

    await this.availability.assertBookable({
      business_id,
      service_id: current.service_id,
      staff_id,
      starts_at,
      ends_at,
      ignore_appointment_id: current.id,
      ignore_schedule: dto.ignore_schedule ?? false,
      require_future: false,
    });

    try {
      const appointment = await this.prisma.appointments.update({
        where: { id: current.id },
        data: { staff_id, starts_at, ends_at },
        include: appointmentInclude,
      });
      return toAppointmentResponse(appointment);
    } catch (error) {
      if (Helper.isConstraintViolation(error, NO_OVERLAP_CONSTRAINT)) throw new ConflictException(SLOT_TAKEN);
      throw error;
    }
  }

  async updateStatus(business_id: string, appointment_id: string, dto: UpdateAppointmentStatusDto) {
    const current = await this.prisma.appointments.findFirst({
      where: { id: appointment_id, business_id },
      select: { id: true, status: true, starts_at: true },
    });
    if (!current) throw new NotFoundException('Appointment not found');

    if (!ALLOWED_TRANSITIONS[current.status].includes(dto.status)) {
      throw new ConflictException(`A ${label(current.status)} appointment can't be marked as ${label(dto.status)}`);
    }
    if ((dto.status === 'completed' || dto.status === 'no_show') && !Helper.isPast(current.starts_at)) {
      throw new ConflictException(`An appointment can't be marked as ${label(dto.status)} before it starts`);
    }
    if (dto.cancellation_reason && dto.status !== 'cancelled') {
      throw new BadRequestException('cancellation_reason is only allowed when cancelling');
    }

    // Matching on the old status makes the change atomic: two people changing it at once can't
    // both apply a transition from the same starting point.
    const { count } = await this.prisma.appointments.updateMany({
      where: { id: current.id, status: current.status },
      data: {
        status: dto.status,
        cancelled_at: dto.status === 'cancelled' ? Helper.getCurrentTimestamp() : undefined,
        cancellation_reason: dto.status === 'cancelled' ? (dto.cancellation_reason ?? null) : undefined,
      },
    });
    if (count === 0) throw new ConflictException('The appointment was changed by someone else. Please reload.');
    return this.get(business_id, current.id);
  }

  private async resolveCustomer(business_id: string, dto: CreateAppointmentDto): Promise<string> {
    if (dto.customer_id) {
      const customer = await this.prisma.customers.findFirst({
        where: { id: dto.customer_id, business_id },
        select: { id: true },
      });
      if (!customer) throw new BadRequestException('customer_id must be a customer of this business');
      return customer.id;
    }
    if (!dto.customer) throw new BadRequestException('Give either customer_id or customer');
    return (await this.customers.findOrCreate(business_id, dto.customer)).id;
  }
}

/**
 * Slots are computed in memory, so they're paginated in memory like every other list in the
 * API. A day has at most 96 fifteen-minute starts, so take=100 always returns the whole day.
 */
export function paginateSlots(slots: Slot[], query: PageOptionsDto) {
  const ordered = query.order === 'desc' ? [...slots].reverse() : slots;
  const page = ordered.slice(query.skip, query.skip + query.take);
  const pageMeta = new PageMetaDto({ count: slots.length, pageOptionsDto: query });
  return new PageDto(page, pageMeta);
}

/** "no_show" -> "no-show" for messages. */
function label(status: appointment_status): string {
  return status.replace('_', '-');
}
