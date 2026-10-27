# Web app

React 19 + TypeScript, built with Vite. Talks to the NestJS API in `apps/api`.

```bash
pnpm dev:web      # from the repo root; http://localhost:5173 (proxies /api to :3000)
pnpm --filter web build
pnpm --filter web lint
```

The API's address is set by `VITE_API_BASE_URL` in `.env` (copy `.env.example`). If it's unset,
the app uses `/api` through the Vite dev proxy.

## Libraries

| Concern        | Library                                   |
| -------------- | ----------------------------------------- |
| Routing        | React Router (data router, lazy pages)    |
| Server state   | TanStack Query                            |
| Forms          | react-hook-form + zod                     |
| Styling        | Tailwind CSS v4 (`brand-*` = accent colour, set in `src/index.css`) |
| Dates          | dayjs (same as the API)                   |

## Folder structure

```
src/
  app/            App providers, router, paths, app-level pages (404, error boundary)
  components/
    ui/           Generic building blocks: Button, TextField, Card, Dialog, Table, ...
    layout/       App shell: sidebar, top bar, user menu
    toast/        Toast notifications (useToast)
  features/       One folder per API module, mirroring apps/api/src
    auth/         Login, signup, invites, session context and route guards
    users/        Current user, account page, signed-in devices
    business/     Business profile and logo
    staff/        Team members and invites
    assets/       File uploads
    services/     Services (name, duration, price) and who offers them
    schedules/    Working hours with breaks, staff time off, business closures
    appointments/ Day view, booking, rescheduling, statuses
    customers/    Customer search (records are created by booking)
    booking/      Public booking page (/book/:slug), no login
    dashboard/    Home page
  lib/            Framework-free helpers (HTTP client, auth tokens, dates, validation)
  types/          Shapes of API responses and enums (mirror the Prisma schema)
```

Each feature folder uses the same files:

- `api.ts` – one function per endpoint, no React
- `queries.ts` – query keys and TanStack Query hooks (`useStaffMembers`, `useUpdateStaff`, ...)
- `schemas.ts` – zod form schemas plus mappers from form values to request bodies
- `types.ts` – request/response types specific to the feature
- `components/`, `pages/`

## Authentication

- The **access token** lives in memory only; the **refresh token** is stored in
  `localStorage` (the API does not use cookies).
- `lib/api/http-client.ts` attaches the access token. On a 401 it refreshes the session once
  and retries; if the refresh is rejected the session is expired and the user lands on login.
- The API rotates refresh tokens and revokes a session when an old token is reused, so
  `lib/auth/session.ts` serialises refreshes (one per tab, and across tabs via a Web Lock).
- `features/auth/context/AuthProvider.tsx` exposes `useAuth()`; pages behind `RequireAuth` use
  `useCurrentUser()` for the user, business and `isOwner`.
- Sign-out in one tab signs out the other tabs too; signing in as another user reloads them.

## Debugging tips

- Every failed request rejects with an `ApiError` (`status`, `messages`); status `0` means the
  server couldn't be reached.
- Install the TanStack Query devtools to inspect cache keys; they are defined in each
  feature's `queries.ts`.
