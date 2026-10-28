import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentsService, paginateSlots, type BookInput } from '../appointments/appointments.service.js';
import { AvailabilityService } from '../appointments/availability.service.js';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Prisma } from '../common/database/prisma/generated/client.js';
import { publicBusinessSelect, toPublicBusinessResponse } from '../common/database/selects.js';
import type { PublicAvailabilityQueryDto, PublicBookingDto } from '../common/dtos/booking.dto.js';
import { PageDto, PageMetaDto, type PageOptionsDto } from '../common/dtos/common.dto.js';
import { NotificationEventsEnum } from '../common/enums.js';
import { Helper } from '../common/helper.js';
import { NotificationService } from '../common/services/notification.service.js';
import { CustomersService } from '../customers/customers.service.js';

/** Customers can book from today up to this many days ahead. */
export const ONLINE_BOOKING_WINDOW_DAYS = 60;

type BookedAppointment = Awaited<ReturnType<AppointmentsService['book']>>;

const NO_LONGER_AVAILABLE = 'That time is no longer available. Please choose another time.';

/** Only active services with at least one active staff member offering them can be booked online. */
const bookableServicesWhere = (business_id: string) =>
  ({
    business_id,
    is_active: true,
    staff_services: { some: { user: { status: 'active' } } },
  }) satisfies Prisma.servicesWhereInput;

/**
 * The public booking page: anyone with the business's link (/book/:slug) can see its services
 * and free times, and book. Everything here is scoped by the slug and only exposes what a
 * customer needs (no staff emails, no other customers).
 */
@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly appointments: AppointmentsService,
    private readonly customers: CustomersService,
    private readonly notifications: NotificationService,
  ) {}

  async getBusiness(slug: string) {
    const business = await this.prisma.businesses.findUnique({ where: { slug }, select: publicBusinessSelect });
    if (!business) throw new NotFoundException('Business not found');
    return { ...toPublicBusinessResponse(business), booking_window_days: ONLINE_BOOKING_WINDOW_DAYS };
  }

  /** Bookable services, alphabetical by default, each with the staff who offer it. */
  async listServices(slug: string, query: PageOptionsDto) {
    const business = await this.findBusiness(slug);
    const where = bookableServicesWhere(business.id);
    const [total, services] = await this.prisma.$transaction([
      this.prisma.services.count({ where }),
      this.prisma.services.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          duration_minutes: true,
          price: true,
          staff_services: {
            where: { user: { status: 'active' } },
            select: { user: { select: { id: true, first_name: true, last_name: true } } },
            orderBy: { user: { first_name: 'asc' } },
          },
        },
        orderBy: { name: query.order },
        skip: query.skip,
        take: query.take,
      }),
    ]);
    const data = services.map(({ staff_services, price, ...service }) => ({
      ...service,
      price: price.toFixed(2),
      staff: staff_services.map((link) => link.user),
    }));
    const pageMeta = new PageMetaDto({ count: total, pageOptionsDto: query });
    return new PageDto(data, pageMeta);
  }

  /** Free start times on a day; only future times within the booking window. */
  async findSlots(slug: string, query: PublicAvailabilityQueryDto) {
    const business = await this.findBusiness(slug);
    this.assertWithinBookingWindow(query.date, business.timezone);
    await this.assertServiceBookable(business.id, query.service_id);

    const slots = await this.availability.findSlots({
      business_id: business.id,
      service_id: query.service_id,
      date: query.date,
      staff_id: query.staff_id,
      not_before: Helper.getCurrentTimestamp(),
    });
    return paginateSlots(slots, query);
  }

  /**
   * Books for a customer. Without a staff_id, whoever is free at that time is tried in turn,
   * so losing a race for one staff member still books another if anyone is free.
   */
  async book(slug: string, dto: PublicBookingDto) {
    const business = await this.findBusiness(slug);
    await this.assertServiceBookable(business.id, dto.service_id);
    const starts_at = Helper.parseInstant(dto.starts_at);
    const { date } = Helper.toZonedDateAndMinutes(starts_at, business.timezone);
    this.assertWithinBookingWindow(date, business.timezone);

    const candidates = dto.staff_id ? [dto.staff_id] : await this.staffFreeAt(business.id, dto.service_id, date, starts_at);
    if (candidates.length === 0) throw new ConflictException(NO_LONGER_AVAILABLE);

    const customer = await this.customers.findOrCreate(business.id, dto.customer);
    const base: Omit<BookInput, 'staff_id'> = {
      business_id: business.id,
      service_id: dto.service_id,
      starts_at,
      customer_id: customer.id,
      notes: dto.notes || null,
      source: 'online',
      created_by_id: null,
      ignore_schedule: false,
      require_future: true,
    };

    let lastConflict: ConflictException | undefined;
    for (const staff_id of candidates) {
      try {
        const appointment = await this.appointments.book({ ...base, staff_id });
        await this.notifyBusiness(business, appointment);
        return {
          id: appointment.id,
          status: appointment.status,
          starts_at: appointment.starts_at,
          ends_at: appointment.ends_at,
          price: appointment.price,
          service: { name: appointment.service.name, duration_minutes: appointment.service.duration_minutes },
          staff: { first_name: appointment.staff.first_name, last_name: appointment.staff.last_name },
          customer: { first_name: appointment.customer.first_name },
        };
      } catch (error) {
        if (!(error instanceof ConflictException)) throw error;
        lastConflict = error;
      }
    }
    throw dto.staff_id && lastConflict ? lastConflict : new ConflictException(NO_LONGER_AVAILABLE);
  }

  /** Tells the staff member who was booked, and the owners, in the app. */
  private async notifyBusiness(business: { id: string; timezone: string }, appointment: BookedAppointment): Promise<void> {
    const owners = await this.prisma.users.findMany({
      where: {
        business_id: business.id,
        role: 'owner',
        status: 'active',
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    });
    const staffName = `${appointment.staff.first_name} ${appointment.staff.last_name}`;
    await this.notifications.queueNotification({
      event: NotificationEventsEnum.ONLINE_BOOKING_RECEIVED,
      business_id: business.id,
      idempotency_key: `${NotificationEventsEnum.ONLINE_BOOKING_RECEIVED}:${appointment.id}`,
      // queueNotification drops the staff member if they're also an owner (same user_id).
      recipients: [
        { user_id: appointment.staff.id, name: staffName },
        ...owners.map((owner) => ({ user_id: owner.id, email: owner.email, name: `${owner.first_name} ${owner.last_name}` })),
      ],
      payload: {
        appointment_id: appointment.id,
        customer_name: `${appointment.customer.first_name} ${appointment.customer.last_name}`,
        service_name: appointment.service.name,
        staff_name: staffName,
        when: Helper.formatInZone(appointment.starts_at, business.timezone),
      },
    });
  }

  private async findBusiness(slug: string) {
    const business = await this.prisma.businesses.findUnique({
      where: { slug },
      select: {
        id: true,
        timezone: true,
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  private async assertServiceBookable(business_id: string, service_id: string): Promise<void> {
    const service = await this.prisma.services.findFirst({
      where: { ...bookableServicesWhere(business_id), id: service_id },
      select: { id: true },
    });
    if (!service) throw new NotFoundException('Service not found');
  }

  /** Today (business's time zone) up to ONLINE_BOOKING_WINDOW_DAYS ahead. */
  private assertWithinBookingWindow(date: string, timeZone: string): void {
    const today = Helper.todayInTimeZone(timeZone);
    const lastDay = Helper.addDaysToDateOnly(today, ONLINE_BOOKING_WINDOW_DAYS);
    if (date < today) throw new BadRequestException('That date has already passed');
    if (date > lastDay) {
      throw new BadRequestException(`Bookings can be made up to ${ONLINE_BOOKING_WINDOW_DAYS} days ahead`);
    }
  }

  /** Staff free for the whole service starting exactly at `starts_at`. */
  private async staffFreeAt(business_id: string, service_id: string, date: string, starts_at: Date) {
    const slots = await this.availability.findSlots({
      business_id,
      service_id,
      date,
      not_before: Helper.getCurrentTimestamp(),
    });
    return slots.find((slot) => slot.starts_at.getTime() === starts_at.getTime())?.staff_ids ?? [];
  }
}
