import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/common/database/prisma.service.js';
import { StorageService } from './../src/common/storage/storage.service.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const PASSWORD = 'correct-horse-battery';
const TZ = 'Asia/Kolkata';
const auth = { type: 'bearer' } as const;

/** The next given weekday at least 2 days from today (business time zone), as YYYY-MM-DD. */
function upcoming(dayOfWeek: number): string {
  let day = dayjs().tz(TZ).add(2, 'day');
  while (day.day() !== dayOfWeek) day = day.add(1, 'day');
  return day.format('YYYY-MM-DD');
}

/** An instant at a local time on a date in the business time zone, as ISO. */
function at(date: string, time: string): string {
  return dayjs.tz(`${date} ${time}`, TZ).toISOString();
}

/** "HH:mm" (business time zone) of an ISO instant. */
function localTime(iso: string): string {
  return dayjs(iso).tz(TZ).format('HH:mm');
}

describe('Appointments & online booking (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdBusinessIds: string[] = [];
  const http = () => request(app.getHttpServer());

  /**
   * A clinic whose owner is also the doctor: 30-minute consultations, Mondays 10:00–14:00 and
   * 16:00–18:00 (a split day with a two-hour break).
   */
  async function setUpClinic() {
    const signup = await http()
      .post('/auth/signup')
      .send({
        business: { name: `E2E Clinic ${randomUUID().slice(0, 8)}`, type: 'clinic', timezone: TZ },
        owner: { first_name: 'Dee', last_name: 'Doctor', email: `e2e-${randomUUID()}@example.com`, password: PASSWORD },
      })
      .expect(201);
    const token = signup.body.access_token as string;
    const doctorId = signup.body.id as string;
    const me = await http().get('/users/me').auth(token, auth).expect(200);
    createdBusinessIds.push(me.body.business.id);

    const service = await http()
      .post('/services')
      .auth(token, auth)
      .send({ name: 'Consultation', duration_minutes: 30, price: 500, staff_ids: [doctorId] })
      .expect(201);
    await http()
      .put(`/staff/${doctorId}/working-hours`)
      .auth(token, auth)
      .send({
        intervals: [
          { day_of_week: 1, start_time: '10:00', end_time: '14:00' },
          { day_of_week: 1, start_time: '16:00', end_time: '18:00' },
        ],
      })
      .expect(204);

    return {
      token,
      doctorId,
      serviceId: service.body.id as string,
      slug: me.body.business.slug as string,
      businessId: me.body.business.id as string,
      monday: upcoming(1),
    };
  }

  async function slotTimes(token: string, serviceId: string, date: string, extra = '') {
    const res = await http()
      .get(`/availability?service_id=${serviceId}&date=${date}&order=asc&take=100${extra}`)
      .auth(token, auth)
      .expect(200);
    return (res.body.data as { starts_at: string }[]).map((slot) => localTime(slot.starts_at));
  }

  function bookFromDashboard(clinic: Awaited<ReturnType<typeof setUpClinic>>, time: string, extra: object = {}) {
    return http()
      .post('/appointments')
      .auth(clinic.token, auth)
      .send({
        service_id: clinic.serviceId,
        staff_id: clinic.doctorId,
        starts_at: at(clinic.monday, time),
        customer: { first_name: 'Priya', last_name: 'Patient', phone: '+91 98765 43210' },
        ...extra,
      });
  }

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(StorageService)
      .useValue({})
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    if (createdBusinessIds.length) {
      await prisma.businesses.deleteMany({ where: { id: { in: createdBusinessIds.splice(0) } } });
    }
    await app.close();
  });

  it('offers slots inside working sessions only, and removes booked ones', async () => {
    const clinic = await setUpClinic();

    const before = await slotTimes(clinic.token, clinic.serviceId, clinic.monday);
    // 10:00–13:30 every 15 min (15 slots) and 16:00–17:30 (7 slots); nothing in the 14–16 break.
    expect(before[0]).toBe('10:00');
    expect(before).toContain('13:30');
    expect(before).not.toContain('13:45');
    expect(before).not.toContain('14:00');
    expect(before).not.toContain('15:45');
    expect(before).toContain('16:00');
    expect(before.at(-1)).toBe('17:30');
    expect(before).toHaveLength(22);

    // Tuesday has no working hours.
    const tuesday = dayjs(clinic.monday).add(1, 'day').format('YYYY-MM-DD');
    expect(await slotTimes(clinic.token, clinic.serviceId, tuesday)).toEqual([]);

    const booked = await bookFromDashboard(clinic, '10:00').expect(201);
    expect(booked.body).toMatchObject({
      status: 'booked',
      source: 'dashboard',
      price: '500.00',
      service: { name: 'Consultation', duration_minutes: 30 },
      staff: { id: clinic.doctorId },
      customer: { first_name: 'Priya', phone: '+919876543210' },
    });
    expect(localTime(booked.body.ends_at)).toBe('10:30');

    const after = await slotTimes(clinic.token, clinic.serviceId, clinic.monday);
    expect(after).not.toContain('10:00');
    expect(after).not.toContain('10:15'); // 10:15–10:45 would overlap 10:00–10:30
    expect(after).toContain('10:30'); // back-to-back is fine
    expect(after).toHaveLength(20);
  });

  it('never double-books, even when two bookings race for the same slot', async () => {
    const clinic = await setUpClinic();
    await bookFromDashboard(clinic, '10:00').expect(201);

    // Overlapping a booked appointment.
    const overlap = await bookFromDashboard(clinic, '10:15').expect(409);
    expect(overlap.body.message).toMatch(/already has an appointment/);

    // Two requests at once: exactly one wins; the database constraint stops the other.
    const results = await Promise.all([bookFromDashboard(clinic, '11:00'), bookFromDashboard(clinic, '11:00')]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);

    // The rule holds in the database itself, not only in the API.
    const existing = await prisma.appointments.findFirstOrThrow({ where: { staff_id: clinic.doctorId } });
    const { id: _id, created_at: _c, updated_at: _u, ...copy } = existing;
    await expect(
      prisma.appointments.create({
        data: {
          ...copy,
          starts_at: dayjs(existing.starts_at).add(10, 'minute').toDate(),
          ends_at: dayjs(existing.ends_at).add(10, 'minute').toDate(),
        },
      }),
    ).rejects.toThrow(/appointments_no_overlap/);
  });

  it('respects working hours, closures and time off, unless the schedule is overridden', async () => {
    const clinic = await setUpClinic();

    const inBreak = await bookFromDashboard(clinic, '14:30').expect(409);
    expect(inBreak.body.message).toMatch(/outside the staff member's working hours/);
    // A consultation starting 13:45 would run past the 14:00 end of the session.
    await bookFromDashboard(clinic, '13:45').expect(409);
    // Walk-in outside hours, allowed explicitly from the dashboard.
    await bookFromDashboard(clinic, '14:30', { ignore_schedule: true }).expect(201);

    await http()
      .post(`/staff/${clinic.doctorId}/time-off`)
      .auth(clinic.token, auth)
      .send({ starts_on: clinic.monday, ends_on: clinic.monday })
      .expect(201);
    expect(await slotTimes(clinic.token, clinic.serviceId, clinic.monday)).toEqual([]);
    expect((await bookFromDashboard(clinic, '10:00').expect(409)).body.message).toMatch(/off that day/);

    const nextMonday = dayjs(clinic.monday).add(7, 'day').format('YYYY-MM-DD');
    await http()
      .post('/closures')
      .auth(clinic.token, auth)
      .send({ name: 'Holiday', starts_on: nextMonday, ends_on: nextMonday })
      .expect(201);
    expect(await slotTimes(clinic.token, clinic.serviceId, nextMonday)).toEqual([]);
  });

  it('reschedules and moves appointments through their statuses', async () => {
    const clinic = await setUpClinic();
    const booked = await bookFromDashboard(clinic, '10:00').expect(201);
    const id = booked.body.id as string;

    // Moving by 15 minutes overlaps its own old time, which is fine.
    const moved = await http()
      .patch(`/appointments/${id}/reschedule`)
      .auth(clinic.token, auth)
      .send({ starts_at: at(clinic.monday, '10:15') })
      .expect(200);
    expect(localTime(moved.body.starts_at)).toBe('10:15');
    expect(localTime(moved.body.ends_at)).toBe('10:45');
    // Rescheduling into the break is refused.
    await http()
      .patch(`/appointments/${id}/reschedule`)
      .auth(clinic.token, auth)
      .send({ starts_at: at(clinic.monday, '15:00') })
      .expect(409);
    // The freed slot shows up again when asking for times for this appointment.
    expect(await slotTimes(clinic.token, clinic.serviceId, clinic.monday, `&ignore_appointment_id=${id}`)).toContain('10:15');

    const status = (body: object) => http().post(`/appointments/${id}/status`).auth(clinic.token, auth).send(body);
    await status({ status: 'confirmed' }).expect(200);
    // Not before it has started.
    expect((await status({ status: 'completed' }).expect(409)).body.message).toMatch(/before it starts/);
    await status({ status: 'confirmed', cancellation_reason: 'x' }).expect(409); // confirmed → confirmed
    await status({ status: 'booked' }).expect(400); // not a settable status
    const cancelled = await status({ status: 'cancelled', cancellation_reason: 'Patient unwell' }).expect(200);
    expect(cancelled.body).toMatchObject({ status: 'cancelled', cancellation_reason: 'Patient unwell' });
    expect(cancelled.body.cancelled_at).toBeTruthy();
    await status({ status: 'confirmed' }).expect(409); // cancelled is final
    await http()
      .patch(`/appointments/${id}/reschedule`)
      .auth(clinic.token, auth)
      .send({ starts_at: at(clinic.monday, '11:00') })
      .expect(409);

    // A cancelled appointment frees its time.
    await bookFromDashboard(clinic, '10:15').expect(201);

    // Completed / no-show for an appointment that has started.
    const customer = await prisma.customers.findFirstOrThrow({ where: { business_id: clinic.businessId } });
    const past = await prisma.appointments.create({
      data: {
        business_id: clinic.businessId,
        service_id: clinic.serviceId,
        staff_id: clinic.doctorId,
        customer_id: customer.id,
        starts_at: dayjs().subtract(2, 'hour').toDate(),
        ends_at: dayjs().subtract(90, 'minute').toDate(),
        price: 500,
        source: 'dashboard',
      },
    });
    await http().post(`/appointments/${past.id}/status`).auth(clinic.token, auth).send({ status: 'no_show' }).expect(200);

    const list = await http()
      .get(`/appointments?date_from=${clinic.monday}&date_to=${clinic.monday}&order=asc`)
      .auth(clinic.token, auth)
      .expect(200);
    expect(list.body.data.map((a: { status: string }) => a.status)).toEqual(['cancelled', 'booked']);
    const active = await http()
      .get(`/appointments?date_from=${clinic.monday}&date_to=${clinic.monday}&exclude_cancelled=true`)
      .auth(clinic.token, auth)
      .expect(200);
    expect(active.body.meta.count).toBe(1);

    // A service with appointments can't be deleted.
    await http().delete(`/services/${clinic.serviceId}`).auth(clinic.token, auth).expect(409);
  });

  it('lets customers book online through the public page', async () => {
    const clinic = await setUpClinic();
    const base = `/public/businesses/${clinic.slug}`;

    const business = await http().get(base).expect(200);
    expect(business.body).toMatchObject({ timezone: TZ, currency: 'INR', booking_window_days: 60 });
    expect(business.body).not.toHaveProperty('id');
    await http().get('/public/businesses/no-such-business').expect(404);

    // An inactive service isn't offered.
    await http()
      .post('/services')
      .auth(clinic.token, auth)
      .send({ name: 'Old service', duration_minutes: 30, price: 1, is_active: false, staff_ids: [clinic.doctorId] })
      .expect(201);
    const services = await http().get(`${base}/services`).expect(200);
    expect(services.body.data).toHaveLength(1);
    expect(services.body.data[0]).toMatchObject({ name: 'Consultation', price: '500.00' });
    expect(services.body.data[0].staff[0]).toEqual({ id: clinic.doctorId, first_name: 'Dee', last_name: 'Doctor' });

    const slots = await http().get(`${base}/availability?service_id=${clinic.serviceId}&date=${clinic.monday}&take=100`).expect(200);
    expect(slots.body.meta.count).toBe(22);

    const customer = { first_name: 'Ravi', last_name: 'Kumar', phone: '+91 91234 56789' };
    const booked = await http()
      .post(`${base}/appointments`)
      .send({ service_id: clinic.serviceId, starts_at: at(clinic.monday, '16:00'), customer, notes: 'First visit' })
      .expect(201);
    expect(booked.body).toMatchObject({
      status: 'booked',
      price: '500.00',
      service: { name: 'Consultation' },
      staff: { first_name: 'Dee' },
      customer: { first_name: 'Ravi' },
    });
    expect(booked.body).not.toHaveProperty('customer.phone');

    // The same time again → taken; a returning customer (phone typed differently) is recognised.
    await http()
      .post(`${base}/appointments`)
      .send({ service_id: clinic.serviceId, starts_at: at(clinic.monday, '16:00'), customer })
      .expect(409);
    await http()
      .post(`${base}/appointments`)
      .send({
        service_id: clinic.serviceId,
        staff_id: clinic.doctorId,
        starts_at: at(clinic.monday, '17:00'),
        customer: { ...customer, phone: '+919123456789' },
      })
      .expect(201);
    const customers = await http().get('/customers?search=Ravi').auth(clinic.token, auth).expect(200);
    expect(customers.body.meta.count).toBe(1);

    // Outside working hours, in the past, or too far ahead → refused.
    await http()
      .post(`${base}/appointments`)
      .send({ service_id: clinic.serviceId, starts_at: at(clinic.monday, '15:00'), customer })
      .expect(409);
    const lastWeek = dayjs(clinic.monday).subtract(14, 'day').format('YYYY-MM-DD');
    await http().get(`${base}/availability?service_id=${clinic.serviceId}&date=${lastWeek}`).expect(400);
    const farAhead = dayjs(clinic.monday).add(70, 'day').format('YYYY-MM-DD');
    await http().get(`${base}/availability?service_id=${clinic.serviceId}&date=${farAhead}`).expect(400);

    const online = await http().get('/appointments?order=asc').auth(clinic.token, auth).expect(200);
    expect(online.body.data.map((a: { source: string }) => a.source)).toEqual(['online', 'online']);
    expect(online.body.data[0]).toMatchObject({ notes: 'First visit', created_by_id: null });
  });
});
