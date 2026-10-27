import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/common/database/prisma.service.js';
import type { StaffInvitePayload } from './../src/common/dtos/notifications.dto.js';
import { NotificationEventsEnum } from './../src/common/enums.js';
import { MAIL_TRANSPORT, type MailMessage, type MailTransport, type SentMail } from './../src/common/mail/mail.types.js';
import { NotificationService } from './../src/common/services/notification.service.js';
import { StorageService, type StoredFile } from './../src/common/storage/storage.service.js';
import { waitFor } from './wait-for.js';

const PASSWORD = 'correct-horse-battery';
// Smallest valid PNG header + IHDR; enough for magic-byte detection.
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
const PDF = Buffer.from('%PDF-1.4\n%%EOF');

/** Stands in for Cloudinary so tests never upload real files. */
class FakeStorage {
  removed: string[] = [];
  async upload(data: Buffer, folder: string): Promise<StoredFile> {
    const public_id = `test/${folder}/${randomUUID()}`;
    return {
      public_id,
      resource_type: data.subarray(0, 4).toString() === '%PDF' ? 'raw' : 'image',
      url: `https://res.cloudinary.test/${public_id}`,
      format: null,
      bytes: data.length,
      width: null,
      height: null,
    };
  }
  async remove(public_id: string): Promise<void> {
    this.removed.push(public_id);
  }
}

/** Records emails instead of sending them. Set `failing` to simulate the provider being down. */
class FakeMail implements MailTransport {
  sent: MailMessage[] = [];
  failing = false;
  async send(message: MailMessage): Promise<SentMail> {
    if (this.failing) throw new Error('provider down');
    this.sent.push(message);
    return { message_id: `fake-${this.sent.length}` };
  }
}

describe('Auth, business & staff (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: FakeStorage;
  let mail: FakeMail;
  const createdBusinessIds: string[] = [];

  const http = () => request(app.getHttpServer());
  const email = () => `e2e-${randomUUID()}@example.com`;

  async function me(token: string) {
    const res = await http().get('/users/me').auth(token, { type: 'bearer' }).expect(200);
    return res.body as { user: Record<string, any>; business: Record<string, any> };
  }

  async function signup(name = 'E2E Salon') {
    const ownerEmail = email();
    const res = await http()
      .post('/auth/signup')
      .send({
        business: { name, type: 'salon', timezone: 'Asia/Kolkata' },
        owner: { first_name: 'Olivia', last_name: 'Owner', email: ownerEmail, password: PASSWORD },
      })
      .expect(201);
    expect(Object.keys(res.body).sort()).toEqual(['access_token', 'id', 'refresh_token']);
    const token = res.body.access_token as string;
    const { user, business } = await me(token);
    createdBusinessIds.push(business.id);
    return { email: ownerEmail, token, refresh_token: res.body.refresh_token as string, user, business };
  }

  async function inviteAndAccept(ownerToken: string) {
    const staffEmail = email();
    const invite = await http()
      .post('/staff/invites')
      .auth(ownerToken, { type: 'bearer' })
      .send({ email: staffEmail, first_name: 'Sam', last_name: 'Stylist' })
      .expect(201);
    const token = new URL(invite.body.invite_url).pathname.split('/').pop()!;
    const accepted = await http().post(`/auth/invites/${token}/accept`).send({ password: PASSWORD }).expect(200);
    const { user } = await me(accepted.body.access_token);
    expect(user.id).toBe(accepted.body.id);
    return { inviteToken: token, token: accepted.body.access_token as string, user };
  }

  beforeEach(async () => {
    storage = new FakeStorage();
    mail = new FakeMail();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(storage)
      .overrideProvider(MAIL_TRANSPORT)
      .useValue(mail)
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

  it('signs up a business owner and returns the session', async () => {
    const owner = await signup('Glow Salon & Spa');

    expect(owner.user).toMatchObject({
      email: owner.email,
      first_name: 'Olivia',
      last_name: 'Owner',
      role: 'owner',
      status: 'active',
    });
    expect(owner.user).not.toHaveProperty('password_hash');
    // Ids come from the database's uuidv7(): version nibble is 7.
    const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(owner.user.id).toMatch(UUID_V7);
    expect(owner.business.id).toMatch(UUID_V7);
    expect(owner.business).toMatchObject({ type: 'salon', timezone: 'Asia/Kolkata', logo_url: null });
    expect(owner.business.slug).toMatch(/^glow-salon-spa/);
    expect(owner.business).not.toHaveProperty('logo_asset');

    await http().get('/users/me').expect(401);
  });

  it('rejects a duplicate email and invalid signup input', async () => {
    const owner = await signup();
    await http()
      .post('/auth/signup')
      .send({
        business: { name: 'Other', type: 'clinic', timezone: 'Asia/Kolkata' },
        owner: { first_name: 'X', last_name: 'Y', email: owner.email.toUpperCase(), password: PASSWORD },
      })
      .expect(409);

    await http()
      .post('/auth/signup')
      .send({
        business: { name: 'Bad', type: 'spaceship', timezone: 'Mars/Olympus' },
        owner: { first_name: 'X', email: 'not-an-email', password: 'short' },
      })
      .expect(400);
  });

  it('logs in with the same error for unknown email and wrong password', async () => {
    const owner = await signup();

    const wrong = await http().post('/auth/login').send({ email: owner.email, password: 'nope-nope' }).expect(401);
    const unknown = await http().post('/auth/login').send({ email: email(), password: PASSWORD }).expect(401);
    expect(wrong.body.message).toBe(unknown.body.message);

    const ok = await http().post('/auth/login').send({ email: owner.email, password: PASSWORD }).expect(200);
    expect(ok.body).toMatchObject({ id: owner.user.id });
    expect(ok.body.access_token).toBeTypeOf('string');
    expect(ok.body.refresh_token).toBeTypeOf('string');
  });

  it('rotates refresh tokens and revokes the session when an old one is reused', async () => {
    const owner = await signup();

    const first = await http().post('/auth/refresh').send({ refresh_token: owner.refresh_token }).expect(200);
    expect(first.body.id).toBe(owner.user.id);
    const rotated = first.body.refresh_token as string;
    expect(rotated).not.toBe(owner.refresh_token);
    await me(first.body.access_token);

    // Replaying the already-rotated token looks like theft: the whole session is revoked.
    await http().post('/auth/refresh').send({ refresh_token: owner.refresh_token }).expect(401);
    await http().post('/auth/refresh').send({ refresh_token: rotated }).expect(401);

    await http().post('/auth/refresh').send({}).expect(400);
  });

  it('logout ends this device’s session: access and refresh tokens stop working at once', async () => {
    const owner = await signup();
    const auth = { type: 'bearer' } as const;
    // @Protected() overrides the PublicController default.
    await http().post('/auth/logout').expect(401);
    await http().post('/auth/logout').auth(owner.token, auth).expect(204);
    await http().get('/users/me').auth(owner.token, auth).expect(401);
    await http().post('/auth/refresh').send({ refresh_token: owner.refresh_token }).expect(401);
  });

  it('lists devices, revokes one, and logs out of all devices', async () => {
    const owner = await signup();
    const auth = { type: 'bearer' } as const;
    const login = (device: string) =>
      http().post('/auth/login').set('User-Agent', device).send({ email: owner.email, password: PASSWORD }).expect(200);
    const phone = (await login('phone')).body;
    const tablet = (await login('tablet')).body;

    const list = await http().get('/users/me/sessions').auth(owner.token, auth).expect(200);
    expect(list.body.data).toHaveLength(3);
    expect(list.body.meta).toMatchObject({ page: 1, take: 25, count: 3, pageCount: 1, hasNextPage: false });
    expect(list.body.data.filter((s: { current: boolean }) => s.current)).toHaveLength(1);
    expect(list.body.data[0]).not.toHaveProperty('refresh_token_hash');

    // Paging: 2 per page -> page 2 holds the last one.
    const page2 = await http().get('/users/me/sessions?take=2&page=2').auth(owner.token, auth).expect(200);
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.meta).toMatchObject({ page: 2, take: 2, count: 3, pageCount: 2, hasPreviousPage: true, hasNextPage: false });
    await http().get('/users/me/sessions?take=101').auth(owner.token, auth).expect(400);
    await http().get('/users/me/sessions?page=0').auth(owner.token, auth).expect(400);
    await http().get('/users/me/sessions?order=sideways').auth(owner.token, auth).expect(400);

    // Revoke the phone from the laptop (signup session).
    const phoneSession = list.body.data.find((s: { current: boolean; user_agent: string }) => !s.current && s.user_agent === 'phone');
    await http().delete(`/users/me/sessions/${phoneSession.id}`).auth(owner.token, auth).expect(204);
    const after = await http().get('/users/me/sessions').auth(owner.token, auth).expect(200);
    expect(after.body.data).toHaveLength(2);
    expect(after.body.data.some((s: { id: string }) => s.id === phoneSession.id)).toBe(false);

    // Someone else's (or unknown) session id is a 404.
    const other = await signup('Other');
    await http().delete(`/users/me/sessions/${phoneSession.id}`).auth(other.token, auth).expect(404);

    await http().post('/users/me/logout-all').auth(tablet.access_token, auth).expect(204);
    for (const token of [owner.token, phone.access_token, tablet.access_token]) {
      await http().get('/users/me').auth(token, auth).expect(401);
    }
    await http().post('/auth/refresh').send({ refresh_token: owner.refresh_token }).expect(401);
  });

  it('lets the owner update the business profile with validation', async () => {
    const owner = await signup();

    const res = await http()
      .patch('/business')
      .auth(owner.token, { type: 'bearer' })
      .send({ name: 'Renamed', city: 'Pune', country: 'in', timezone: 'Europe/London' })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'Renamed', city: 'Pune', country: 'IN', timezone: 'Europe/London' });

    await http().patch('/business').auth(owner.token, { type: 'bearer' }).send({ timezone: 'Nowhere/City' }).expect(400);
    await http().patch('/business').auth(owner.token, { type: 'bearer' }).send({ name: null }).expect(400);
    // slug is not editable; unknown fields are rejected
    await http().patch('/business').auth(owner.token, { type: 'bearer' }).send({ slug: 'hijack' }).expect(400);
  });

  it('uploads assets, uses one as the business logo, and deletes it', async () => {
    const owner = await signup();
    const auth = { type: 'bearer' } as const;
    const upload = (token: string, data: Buffer, filename: string) =>
      http().post('/assets/upload').auth(token, auth).attach('file', data, { filename });

    const image = (await upload(owner.token, PNG, 'logo.png').expect(201)).body;
    expect(image).toMatchObject({ mime_type: 'image/png', original_name: 'logo.png', business_id: owner.business.id });
    expect(image.url).toMatch(/^https:\/\//);
    expect(image).not.toHaveProperty('public_id');

    // Content is checked by its bytes, whatever the filename says.
    await upload(owner.token, Buffer.from('<svg/>'), 'evil.png').expect(400);
    await http().post('/assets/upload').auth(owner.token, auth).expect(400);
    await http().post('/assets/upload').attach('file', PNG, { filename: 'x.png' }).expect(401);

    const pdf = (await upload(owner.token, PDF, 'price-list.pdf').expect(201)).body;
    expect(pdf.mime_type).toBe('application/pdf');

    await http().get(`/assets/${image.id}`).auth(owner.token, auth).expect(200);
    const other = await signup('Other');
    await http().get(`/assets/${image.id}`).auth(other.token, auth).expect(404);

    // Logo must be an image from the same business.
    const set = await http().patch('/business').auth(owner.token, auth).send({ logo_asset_id: image.id }).expect(200);
    expect(set.body.logo_url).toBe(image.url);
    await http().patch('/business').auth(owner.token, auth).send({ logo_asset_id: pdf.id }).expect(400);
    await http().patch('/business').auth(other.token, auth).send({ logo_asset_id: image.id }).expect(400);

    // Same rules for the cover image, which the public booking page shows too.
    const cover = (await upload(owner.token, PNG, 'cover.png').expect(201)).body;
    const withCover = await http().patch('/business').auth(owner.token, auth).send({ cover_asset_id: cover.id }).expect(200);
    expect(withCover.body).toMatchObject({ cover_url: cover.url, logo_url: image.url });
    expect(withCover.body).not.toHaveProperty('cover_asset');
    await http().patch('/business').auth(owner.token, auth).send({ cover_asset_id: pdf.id }).expect(400);
    const publicPage = await http().get(`/public/businesses/${owner.business.slug}`).expect(200);
    expect(publicPage.body.cover_url).toBe(cover.url);
    await http().patch('/business').auth(owner.token, auth).send({ cover_asset_id: null }).expect(200);
    expect((await me(owner.token)).business.cover_url).toBeNull();
    await http().delete(`/assets/${cover.id}`).auth(owner.token, auth).expect(204);

    // Staff can upload and delete their own files, but not the owner's.
    const staff = await inviteAndAccept(owner.token);
    const staffFile = (await upload(staff.token, PNG, 'mine.png').expect(201)).body;
    await http().delete(`/assets/${image.id}`).auth(staff.token, auth).expect(403);
    await http().delete(`/assets/${staffFile.id}`).auth(staff.token, auth).expect(204);

    // Deleting the logo asset removes it from storage and clears the logo.
    await http().delete(`/assets/${image.id}`).auth(owner.token, auth).expect(204);
    expect(storage.removed).toHaveLength(3);
    expect((await me(owner.token)).business.logo_url).toBeNull();
    await http().get(`/assets/${image.id}`).auth(owner.token, auth).expect(404);
  });

  it('invites staff who can read but not manage the business', async () => {
    const owner = await signup();
    const staff = await inviteAndAccept(owner.token);
    expect(staff.user).toMatchObject({ role: 'staff', business_id: owner.business.id });

    // An invite works once.
    await http().get(`/auth/invites/${staff.inviteToken}`).expect(410);
    await http().post(`/auth/invites/${staff.inviteToken}/accept`).send({ password: PASSWORD }).expect(410);

    await http().get('/business').auth(staff.token, { type: 'bearer' }).expect(200);
    await http().patch('/business').auth(staff.token, { type: 'bearer' }).send({ name: 'Mine' }).expect(403);
    await http()
      .post('/staff/invites')
      .auth(staff.token, { type: 'bearer' })
      .send({ email: email(), first_name: 'X', last_name: 'Y' })
      .expect(403);

    const list = await http().get('/staff').auth(staff.token, { type: 'bearer' }).expect(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.meta.count).toBe(2);

    // Oldest first with order=asc: the owner joined before the staff member.
    const asc = await http().get('/staff?order=asc&take=1').auth(staff.token, { type: 'bearer' }).expect(200);
    expect(asc.body.data[0].role).toBe('owner');
    expect(asc.body.meta).toMatchObject({ take: 1, pageCount: 2, hasNextPage: true });

    // The accepted invite is no longer pending; a fresh one is.
    const patEmail = email();
    const pat = await http()
      .post('/staff/invites')
      .auth(owner.token, { type: 'bearer' })
      .send({ email: patEmail, first_name: 'Pat', last_name: 'Pending' })
      .expect(201);
    const invites = await http().get('/staff/invites').auth(owner.token, { type: 'bearer' }).expect(200);
    expect(invites.body.data).toHaveLength(1);
    expect(invites.body.data[0]).toMatchObject({ first_name: 'Pat', last_name: 'Pending' });
    expect(invites.body.data[0]).not.toHaveProperty('token_hash');
    expect(invites.body.meta.count).toBe(1);

    // The invite is emailed (from the default template), with replies going to the owner who sent it.
    expect(pat.body.email_status).toBe('queued');
    const sent = await waitFor(async () => mail.sent.find((message) => message.to.email === patEmail));
    expect(sent.to).toEqual({ email: patEmail, name: 'Pat Pending' });
    expect(sent.replyTo).toEqual({ email: owner.email, name: 'Olivia Owner' });
    expect(sent.subject).toBe('Olivia Owner invited you to join E2E Salon');
    expect(sent.html).toContain(pat.body.invite_url);
    expect(sent.text).toContain(pat.body.invite_url);
    expect(sent.text).toContain('expires in 7 days');

    const delivery = await waitFor(() =>
      prisma.notification_deliveries.findFirst({
        where: { recipient_email: patEmail, status: 'sent' },
        include: { event: true, attempt_logs: true },
      }),
    );
    expect(delivery).toMatchObject({ channel: 'email', attempts: 1, provider_message_id: `fake-${mail.sent.indexOf(sent) + 1}`, recipient_user_id: null });
    expect(delivery.event).toMatchObject({ event: 'staff_invite', business_id: owner.business.id });
    expect(delivery.attempt_logs).toEqual([expect.objectContaining({ attempt: 1, succeeded: true })]);

    // The same idempotency key never notifies twice.
    const again = await app.get(NotificationService).queueNotification({
      event: NotificationEventsEnum.STAFF_INVITE,
      idempotency_key: delivery.event.idempotency_key,
      recipients: [{ email: patEmail, name: 'Pat Pending' }],
      payload: delivery.event.payload as unknown as StaffInvitePayload,
    });
    expect(again).toMatchObject({ duplicate: true, event_id: delivery.event_id });
  });

  it('still creates the invite when the email fails, logs the attempt and retries it', async () => {
    const owner = await signup('Glow <Salon>');
    mail.failing = true;
    const failingEmail = email();
    const res = await http()
      .post('/staff/invites')
      .auth(owner.token, { type: 'bearer' })
      .send({ email: failingEmail, first_name: 'Sam', last_name: 'Stylist' })
      .expect(201);
    expect(res.body).toMatchObject({ email_status: 'queued', invite_url: expect.stringContaining('/invite/') });

    // First attempt fails and is logged; the delivery stays queued for a retry with backoff.
    const delivery = await waitFor(() =>
      prisma.notification_deliveries.findFirst({
        where: { recipient_email: failingEmail, attempts: 1 },
        include: { attempt_logs: true },
      }),
    );
    expect(delivery).toMatchObject({ status: 'queued', error: 'provider down' });
    expect(delivery.attempt_logs).toEqual([expect.objectContaining({ attempt: 1, succeeded: false, error: 'provider down' })]);

    // Names are escaped in the HTML.
    mail.failing = false;
    const escapedEmail = email();
    await http()
      .post('/staff/invites')
      .auth(owner.token, { type: 'bearer' })
      .send({ email: escapedEmail, first_name: 'Sam', last_name: 'Stylist' })
      .expect(201);
    const sent = await waitFor(async () => mail.sent.find((message) => message.to.email === escapedEmail));
    expect(sent.html).toContain('Glow &lt;Salon&gt;');
    expect(sent.subject).toBe('Olivia Owner invited you to join Glow <Salon>');
  });

  it('never lets one business touch another business’s staff', async () => {
    const a = await signup('Business A');
    const b = await signup('Business B');

    await http().patch(`/staff/${a.user.id}`).auth(b.token, { type: 'bearer' }).send({ role: 'staff' }).expect(404);
    await http().delete(`/staff/${a.user.id}`).auth(b.token, { type: 'bearer' }).expect(404);
  });

  it('keeps at least one active owner and cuts off disabled staff immediately', async () => {
    const owner = await signup();
    const auth = { type: 'bearer' } as const;

    await http().patch(`/staff/${owner.user.id}`).auth(owner.token, auth).send({ role: 'staff' }).expect(409);
    await http().delete(`/staff/${owner.user.id}`).auth(owner.token, auth).expect(409);

    const staff = await inviteAndAccept(owner.token);
    await http().get('/users/me').auth(staff.token, auth).expect(200);

    await http().delete(`/staff/${staff.user.id}`).auth(owner.token, auth).expect(204);
    await http().get('/users/me').auth(staff.token, auth).expect(401);

    // Promote-then-demote: with two owners, one may step down.
    const second = await inviteAndAccept(owner.token);
    await http().patch(`/staff/${second.user.id}`).auth(owner.token, auth).send({ role: 'owner' }).expect(200);
    await http().patch(`/staff/${owner.user.id}`).auth(owner.token, auth).send({ role: 'staff' }).expect(200);
  });
});
