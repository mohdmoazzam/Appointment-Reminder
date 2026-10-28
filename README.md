# ShowUp

Appointment booking + WhatsApp reminder tool for clinics, salons, dental offices and coaching centers.
Aims to reduce no-shows, prevent double bookings and save time spent taking bookings over the phone.

## Stack

| Path       | What                                                   |
| ---------- | ------------------------------------------------------ |
| `apps/api` | NestJS 12 (ESM) + Prisma 7 (`@prisma/adapter-pg`)      |
| `apps/web` | React 19 + Vite 8 + TypeScript                         |
| Database   | PostgreSQL 16 via `docker-compose.yml` (host port 5434) |
| Queues     | Redis 7 via `docker-compose.yml` (host port 6380), BullMQ |

pnpm workspaces manage the monorepo.

## Getting started

```bash
pnpm install                      # also runs `prisma generate` for the API
cp apps/api/.env.example apps/api/.env
pnpm db:up                        # start Postgres and Redis in Docker
pnpm dev                          # API on :3000, web on :5173
```

The web dev server proxies `/api/*` to the API, so call `fetch('/api/...')` from React.

## Database (Prisma 7)

- Schema: `apps/api/prisma/schema.prisma` (no models yet)
- Config: `apps/api/prisma.config.ts` (connection URL lives here, not in the schema)
- The client is generated into `apps/api/src/generated/prisma` and injected through `PrismaService`

After adding models:

```bash
pnpm db:migrate     # prisma migrate dev
pnpm db:studio      # browse data
```

## Scripts

| Command       | Description                    |
| ------------- | ------------------------------ |
| `pnpm dev`    | Run API and web in watch mode  |
| `pnpm build`  | Build all apps                 |
| `pnpm lint`   | Lint all apps (oxlint)         |
| `pnpm test`   | API unit tests (vitest)        |
| `pnpm db:up` / `db:down` | Start / stop Postgres and Redis |

## Notifications

Everything the app sends people (emails, in-app notifications) goes through
`NotificationService.queueNotification` (`apps/api/src/common/services/notification.service.ts`),
which records the event and each delivery, then queues them on Redis (BullMQ). Each channel's
processor sends them and logs every attempt (`notification_deliveries`,
`notification_delivery_attempts`). How to add a new event is described at the top of that file.

In-app notifications are also pushed live: `GET /api/notifications/stream` is a server-sent
event stream (bearer token, so the web app reads it with `fetch`, not `EventSource`). Events go
through Redis pub/sub (`NotificationStreamService`), so they reach streams on any API instance.
The stream ends when the access token expires and the web app reconnects, refreshing the session.

Email goes through the provider set by `MAIL_PROVIDER` in `apps/api/.env`:

- `log` (default): prints emails to the API console, sends nothing.
- `brevo`: also set `BREVO_API_KEY` and `MAIL_FROM_EMAIL` (a sender verified in Brevo).

Another provider (e.g. AWS SES) is one new `MailTransport` in `apps/api/src/common/mail/transports/`.
