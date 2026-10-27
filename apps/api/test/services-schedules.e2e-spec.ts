import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/common/database/prisma.service.js';
import { StorageService } from './../src/common/storage/storage.service.js';

const PASSWORD = 'correct-horse-battery';

describe('Services, working hours, time off & closures (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdBusinessIds: string[] = [];

  const http = () => request(app.getHttpServer());
  const email = () => `e2e-${randomUUID()}@example.com`;

  async function signup() {
    const res = await http()
      .post('/auth/signup')
      .send({
        business: { name: 'E2E Clinic', type: 'clinic', timezone: 'Asia/Kolkata' },
        owner: { first_name: 'Olivia', last_name: 'Owner', email: email(), password: PASSWORD },
      })
      .expect(201);
    const token = res.body.access_token as string;
    const me = await http().get('/users/me').auth(token, { type: 'bearer' }).expect(200);
    createdBusinessIds.push(me.body.business.id);
    return { token, user_id: res.body.id as string };
  }

  async function addStaff(ownerToken: string) {
    const invite = await http()
      .post('/staff/invites')
      .auth(ownerToken, { type: 'bearer' })
      .send({ email: email(), first_name: 'Sam', last_name: 'Stylist' })
      .expect(201);
    const inviteToken = new URL(invite.body.invite_url).pathname.split('/').pop()!;
    const accepted = await http().post(`/auth/invites/${inviteToken}/accept`).send({ password: PASSWORD }).expect(200);
    return { token: accepted.body.access_token as string, user_id: accepted.body.id as string };
  }

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      // No test here uploads files; the real Cloudinary client must never be used.
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

  it('creates, lists, updates and deletes services with their staff', async () => {
    const owner = await signup();
    const staff = await addStaff(owner.token);
    const auth = { type: 'bearer' } as const;

    const created = await http()
      .post('/services')
      .auth(owner.token, auth)
      .send({ name: '  Haircut ', duration_minutes: 30, price: 450.5, staff_ids: [staff.user_id] })
      .expect(201);
    expect(created.body).toMatchObject({
      name: 'Haircut',
      duration_minutes: 30,
      price: '450.50',
      is_active: true,
      description: null,
    });
    expect(created.body.staff).toEqual([{ id: staff.user_id, first_name: 'Sam', last_name: 'Stylist', status: 'active' }]);

    // Names are unique per business.
    await http().post('/services').auth(owner.token, auth).send({ name: 'Haircut', duration_minutes: 45, price: 500 }).expect(409);
    // Validation: duration bounds, price decimals, unknown fields.
    await http().post('/services').auth(owner.token, auth).send({ name: 'X', duration_minutes: 2, price: 1 }).expect(400);
    await http().post('/services').auth(owner.token, auth).send({ name: 'X', duration_minutes: 30, price: 1.234 }).expect(400);
    await http().post('/services').auth(owner.token, auth).send({ name: 'X', duration_minutes: 30, price: 1, colour: 'red' }).expect(400);

    await http()
      .post('/services')
      .auth(owner.token, auth)
      .send({ name: 'Beard trim', duration_minutes: 15, price: 150, is_active: false })
      .expect(201);

    const all = await http().get('/services?order=asc').auth(staff.token, auth).expect(200);
    expect(all.body.data.map((s: { name: string }) => s.name)).toEqual(['Beard trim', 'Haircut']);
    const active = await http().get('/services?is_active=true').auth(staff.token, auth).expect(200);
    expect(active.body.meta.count).toBe(1);

    // Staff can read but not manage.
    await http().patch(`/services/${created.body.id}`).auth(staff.token, auth).send({ price: 1 }).expect(403);

    const updated = await http()
      .patch(`/services/${created.body.id}`)
      .auth(owner.token, auth)
      .send({ price: 499, description: 'Wash and cut', staff_ids: [] })
      .expect(200);
    expect(updated.body).toMatchObject({ price: '499.00', description: 'Wash and cut', staff: [] });

    await http().delete(`/services/${created.body.id}`).auth(owner.token, auth).expect(204);
    await http().get(`/services/${created.body.id}`).auth(owner.token, auth).expect(404);
  });

  it('sets the services a staff member offers', async () => {
    const owner = await signup();
    const staff = await addStaff(owner.token);
    const auth = { type: 'bearer' } as const;

    const service = await http()
      .post('/services')
      .auth(owner.token, auth)
      .send({ name: 'Consultation', duration_minutes: 20, price: 300 })
      .expect(201);

    await http()
      .put(`/staff/${staff.user_id}/services`)
      .auth(owner.token, auth)
      .send({ service_ids: [service.body.id] })
      .expect(204);
    const offered = await http().get(`/staff/${staff.user_id}/services`).auth(staff.token, auth).expect(200);
    expect(offered.body.data.map((s: { id: string }) => s.id)).toEqual([service.body.id]);

    // A service from another business is rejected.
    const other = await signup();
    const foreign = await http()
      .post('/services')
      .auth(other.token, auth)
      .send({ name: 'Foreign', duration_minutes: 20, price: 1 })
      .expect(201);
    await http()
      .put(`/staff/${staff.user_id}/services`)
      .auth(owner.token, auth)
      .send({ service_ids: [foreign.body.id] })
      .expect(400);
    // …and so is another business's staff member.
    await http().get(`/staff/${staff.user_id}`).auth(other.token, auth).expect(404);

    const member = await http().get(`/staff/${staff.user_id}`).auth(owner.token, auth).expect(200);
    expect(member.body).toMatchObject({ id: staff.user_id, first_name: 'Sam' });
  });

  it('replaces weekly working hours and rejects overlapping intervals', async () => {
    const owner = await signup();
    const auth = { type: 'bearer' } as const;
    const path = `/staff/${owner.user_id}/working-hours`;

    // Monday 09:00–13:00 and 14:00–18:00 (a lunch break), Saturday morning.
    await http()
      .put(path)
      .auth(owner.token, auth)
      .send({
        intervals: [
          { day_of_week: 1, start_time: '14:00', end_time: '18:00' },
          { day_of_week: 1, start_time: '09:00', end_time: '13:00' },
          { day_of_week: 6, start_time: '10:00', end_time: '12:30' },
        ],
      })
      .expect(204);

    const res = await http().get(`${path}?order=asc&take=100`).auth(owner.token, auth).expect(200);
    expect(res.body.data.map(({ id: _id, ...rest }: Record<string, unknown>) => rest)).toEqual([
      { day_of_week: 1, start_time: '09:00', end_time: '13:00' },
      { day_of_week: 1, start_time: '14:00', end_time: '18:00' },
      { day_of_week: 6, start_time: '10:00', end_time: '12:30' },
    ]);

    const invalid = [
      [
        { day_of_week: 2, start_time: '09:00', end_time: '12:00' },
        { day_of_week: 2, start_time: '11:00', end_time: '15:00' },
      ],
      [{ day_of_week: 2, start_time: '12:00', end_time: '09:00' }],
      [{ day_of_week: 7, start_time: '09:00', end_time: '12:00' }],
      [{ day_of_week: 2, start_time: '9:00', end_time: '12:00' }],
      [{ day_of_week: 2, start_time: '09:00', end_time: '24:00' }],
    ];
    for (const intervals of invalid) {
      await http().put(path).auth(owner.token, auth).send({ intervals }).expect(400);
    }
    // The schedule from before is untouched by the rejected requests.
    const after = await http().get(`${path}?take=100`).auth(owner.token, auth).expect(200);
    expect(after.body.meta.count).toBe(3);

    await http().put(path).auth(owner.token, auth).send({ intervals: [] }).expect(204);
    const cleared = await http().get(path).auth(owner.token, auth).expect(200);
    expect(cleared.body.meta.count).toBe(0);
  });

  it('records time off and refuses overlaps', async () => {
    const owner = await signup();
    const staff = await addStaff(owner.token);
    const auth = { type: 'bearer' } as const;
    const path = `/staff/${staff.user_id}/time-off`;

    const created = await http()
      .post(path)
      .auth(owner.token, auth)
      .send({ starts_on: '2099-12-24', ends_on: '2099-12-26', reason: 'Holiday' })
      .expect(201);
    expect(created.body).toMatchObject({ starts_on: '2099-12-24', ends_on: '2099-12-26', reason: 'Holiday' });

    await http().post(path).auth(owner.token, auth).send({ starts_on: '2099-12-26', ends_on: '2099-12-28' }).expect(409);
    await http().post(path).auth(owner.token, auth).send({ starts_on: '2099-12-28', ends_on: '2099-12-27' }).expect(400);
    await http().post(path).auth(owner.token, auth).send({ starts_on: '2099-02-30', ends_on: '2099-03-01' }).expect(400);
    await http().post(path).auth(staff.token, auth).send({ starts_on: '2099-11-01', ends_on: '2099-11-01' }).expect(403);

    // Past time off is hidden by default; `from` shows it.
    await prisma.staff_time_off.create({
      data: {
        business_id: createdBusinessIds[0]!,
        user_id: staff.user_id,
        starts_on: new Date('2000-01-01T00:00:00Z'),
        ends_on: new Date('2000-01-02T00:00:00Z'),
      },
    });
    const upcoming = await http().get(path).auth(staff.token, auth).expect(200);
    expect(upcoming.body.data.map((t: { starts_on: string }) => t.starts_on)).toEqual(['2099-12-24']);
    const everything = await http().get(`${path}?from=1999-01-01&order=asc`).auth(staff.token, auth).expect(200);
    expect(everything.body.meta.count).toBe(2);

    await http().delete(`${path}/${created.body.id}`).auth(owner.token, auth).expect(204);
    await http().delete(`${path}/${created.body.id}`).auth(owner.token, auth).expect(404);
  });

  it('manages business closures', async () => {
    const owner = await signup();
    const auth = { type: 'bearer' } as const;

    const diwali = await http()
      .post('/closures')
      .auth(owner.token, auth)
      .send({ name: 'Diwali', starts_on: '2099-11-08', ends_on: '2099-11-09' })
      .expect(201);
    await http()
      .post('/closures')
      .auth(owner.token, auth)
      .send({ name: 'Overlap', starts_on: '2099-11-09', ends_on: '2099-11-10' })
      .expect(409);
    await http()
      .post('/closures')
      .auth(owner.token, auth)
      .send({ name: 'Christmas', starts_on: '2099-12-25', ends_on: '2099-12-25' })
      .expect(201);

    // Updating a closure doesn't conflict with itself.
    const moved = await http().patch(`/closures/${diwali.body.id}`).auth(owner.token, auth).send({ ends_on: '2099-11-10' }).expect(200);
    expect(moved.body).toMatchObject({ name: 'Diwali', starts_on: '2099-11-08', ends_on: '2099-11-10' });

    const list = await http().get('/closures?order=asc').auth(owner.token, auth).expect(200);
    expect(list.body.data.map((c: { name: string }) => c.name)).toEqual(['Diwali', 'Christmas']);

    await http().delete(`/closures/${diwali.body.id}`).auth(owner.token, auth).expect(204);
    const after = await http().get('/closures').auth(owner.token, auth).expect(200);
    expect(after.body.meta.count).toBe(1);
  });

  it('lets the owner set the business currency', async () => {
    const owner = await signup();
    const auth = { type: 'bearer' } as const;

    const before = await http().get('/business').auth(owner.token, auth).expect(200);
    expect(before.body.currency).toBe('INR');
    const after = await http().patch('/business').auth(owner.token, auth).send({ currency: 'usd' }).expect(200);
    expect(after.body.currency).toBe('USD');
    await http().patch('/business').auth(owner.token, auth).send({ currency: 'XYZ' }).expect(400);
  });
});
