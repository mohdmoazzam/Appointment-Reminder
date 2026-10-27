# Features

Appointment booking + WhatsApp reminders for clinics, salons, dental offices and coaching centers.

**Goals**

- Reduce no-shows with automatic reminders
- Prevent double bookings
- Cut down the time staff spend taking bookings over the phone

Status legend: ✅ done · 🚧 in progress · 📋 planned

---

## Platform (done)

| Feature | Status | Where |
| --- | --- | --- |
| Monorepo with pnpm workspaces (`apps/api`, `apps/web`) | ✅ | `pnpm-workspace.yaml` |
| NestJS API with global `/api` prefix | ✅ | `apps/api/src/main.ts` |
| Typed, validated environment config (fails fast on missing vars) | ✅ | `apps/api/src/config/env.config.ts` |
| PostgreSQL 16 via Docker Compose (host port 5434) | ✅ | `docker-compose.yml` |
| Prisma 7 client with `PrismaService` | ✅ | `apps/api/src/common/database/` |
| Health check: `GET /api/health` (API + DB status, 503 if DB down) | ✅ | `apps/api/src/health/` |
| Swagger UI at `/api/docs`, OpenAPI JSON at `/api/docs-json` | ✅ | `apps/api/src/config/swagger.config.ts` |
| CORS configured for the web app | ✅ | `CORS_ORIGIN` env var |
| React 19 + Vite web app, `/api/*` proxied to the API in dev | ✅ | `apps/web/` |
| Linting (oxlint), formatting (Prettier), tests (Vitest + e2e) | ✅ | root `package.json` |

## Web app (done)

| Feature | Status | Where |
| --- | --- | --- |
| Signup (business + owner), login, logout, session refresh with cross-tab sync | ✅ | `apps/web/src/features/auth/` |
| Accept staff invite from the shared link (`/invite/:token`) | ✅ | `apps/web/src/features/auth/pages/AcceptInvitePage.tsx` |
| Dashboard with setup checklist and team counts | ✅ | `apps/web/src/features/dashboard/` |
| Staff: list members, invite (shareable link), new link, revoke, change role, disable/enable | ✅ | `apps/web/src/features/staff/` |
| Business settings: profile, address, logo upload/replace/remove (owner only) | ✅ | `apps/web/src/features/business/` |
| Account: profile, signed-in devices, sign out one device or everywhere | ✅ | `apps/web/src/features/users/` |

---

## Product features (planned)

### 1. Business accounts & authentication 📋

- Business owner sign-up / login (JWT; `JWT_SECRET` is already in the env config)
- Business profile: name, type (clinic, salon, dental, coaching), address, timezone, logo
- Staff accounts with roles (owner, staff)

### 2. Services & staff ✅

| Feature | API | Web |
| --- | --- | --- |
| Services with name, duration and price (business currency, active/inactive) | `/services` (`apps/api/src/services/`) | Services page |
| Staff / providers, with the services each one offers | `staff_ids` on services, `GET/PUT /staff/:user_id/services` | Service dialog, staff member page |
| Working hours per staff member, with breaks; weekdays without hours are days off | `GET/PUT /staff/:user_id/working-hours` (`apps/api/src/schedules/`) | Staff member page |
| Time off (whole days) per staff member | `/staff/:user_id/time-off` | Staff member page |
| Holidays and business closures | `/closures` | Business settings |

Owners manage all of it; staff can view. Times are in the business's time zone, dates are
inclusive calendar days, and overlapping time off or closures are rejected.

### 3. Appointment booking ✅

| Feature | API | Web |
| --- | --- | --- |
| Staff books an appointment from the dashboard (customer, service, provider, time); "outside working hours" for walk-ins | `POST /appointments` (`apps/api/src/appointments/`) | Appointments page → New appointment |
| Public booking page per business (shareable link), no login | `/public/businesses/:slug/...` (`apps/api/src/booking/`) | `/book/:slug`; link in Business settings |
| Available slots from working sessions, closures, time off, service duration and existing bookings (15-minute steps, business time zone) | `GET /availability`, `AvailabilityService` | Slot picker |
| **Double-booking prevention**, enforced in the database by the exclusion constraint `appointments_no_overlap` (cancelled ones excluded) | migration `20261027044957_appointments` | 409 shown; free times refresh |
| Reschedule (time and/or staff) and cancel (optional reason) | `PATCH /appointments/:id/reschedule`, `POST /appointments/:id/status` | Appointments page |
| Statuses booked → confirmed → completed / cancelled / no-show; completed / no-show only once started; final states locked | `ALLOWED_TRANSITIONS` | Row actions |

Online bookings must be in the future and at most 60 days ahead. Not yet: customers cancelling
or rescheduling themselves (planned with WhatsApp replies, feature 5).

### 4. Customers 🚧

- ✅ Customer records (name, WhatsApp number, email), created on first booking and reused by phone
- ✅ Search customers by name or phone (`GET /customers`, used when booking)
- 📋 Customers page with notes and appointment history per customer

### 5. WhatsApp reminders 📋

- Booking confirmation message as soon as an appointment is created
- Automatic reminders before the appointment (e.g. 24 h and 2 h before; configurable)
- Customer replies to confirm or cancel from WhatsApp
- Message templates per business
- Delivery status tracking (sent, delivered, read, failed)
- Background job queue so reminders go out on time and failed sends are retried

### 6. Dashboard 📋

- Day / week calendar view of appointments
- Today's appointments at a glance
- Mark appointments as completed or no-show

### 7. Reports 📋

- No-show rate over time
- Bookings per service and per staff member
- Reminder delivery and confirmation rates

---

## Later ideas

- SMS or email fallback when WhatsApp delivery fails
- Waitlist: offer freed-up slots to waiting customers
- Recurring appointments (e.g. weekly coaching sessions)
- Multiple branches per business
- Online payments / deposits to further reduce no-shows
