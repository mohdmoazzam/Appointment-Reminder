# Appointment Reminder

Appointment booking + WhatsApp reminder tool for clinics, salons, dental offices and coaching centers.
Aims to reduce no-shows, prevent double bookings and save time spent taking bookings over the phone.

## Stack

| Path       | What                                                   |
| ---------- | ------------------------------------------------------ |
| `apps/api` | NestJS 12 (ESM) + Prisma 7 (`@prisma/adapter-pg`)      |
| `apps/web` | React 19 + Vite 8 + TypeScript                         |
| Database   | PostgreSQL 16 via `docker-compose.yml` (host port 5434) |

pnpm workspaces manage the monorepo.

## Getting started

```bash
pnpm install                      # also runs `prisma generate` for the API
cp apps/api/.env.example apps/api/.env
pnpm db:up                        # start Postgres in Docker
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
| `pnpm db:up` / `db:down` | Start / stop Postgres |
