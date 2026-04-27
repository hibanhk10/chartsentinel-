# ChartSentinel Backend

Express + TypeScript API for ChartSentinel. Prisma over Postgres
(Supabase), JWT-based auth, transactional email via Resend, Gemini-
backed AI surface with mock fallback, and a ported JS signal engine
for the composite-score feed.

See the root [`README.md`](../README.md) for the full architecture
overview. This document covers backend-specific setup and the full
endpoint list.

## Setup

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET (>=32 chars), and any optional keys
npm run prisma:generate
npm run dev                # http://localhost:3000
```

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | no (default 3000) | HTTP listen port |
| `DATABASE_URL` | **yes** | Postgres connection string (pooled, e.g. Supabase pooler) |
| `JWT_SECRET` | **yes**, ≥32 chars | HMAC secret for auth tokens |
| `FRONTEND_URL` | yes in production | CORS origin allow-list (single origin) |
| `NODE_ENV` | no | `development` / `production` / `test` |
| `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` | no | Transactional email; no-ops without |
| `GEMINI_API_KEY` | no | Real AI replies on `/api/ai/*`; mocks otherwise |
| `SENTRY_DSN` | no | Error tracking; quiet without |

## Migrations

Migrations live in `migrations/*.sql` and are applied manually through
the Supabase SQL editor (numbered in order). Latest is
`004_waitlist_entries.sql` — apply it once before the `/api/waitlist`
endpoint is functional.

## API endpoints

Base URL: `/api`. Public endpoints carry IP-based rate limits.

### Health
- `GET /api/health`

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password` (5/15min)
- `POST /api/auth/reset-password` (5/15min)

### Content
- `GET /api/reports`, `GET /api/reports/:id`, `POST /api/reports` (admin)
- `GET /api/news`, `GET /api/news/:id`, `POST /api/news` (admin)

### User-driven (auth required)
- `GET /api/watchlist`, `POST /api/watchlist`, `DELETE /api/watchlist/:id`
- `GET /api/referral`

### Public forms (5/15min rate limit)
- `POST /api/contact` — contact form
- `POST /api/newsletter` — mailing list subscribe
- `POST /api/waitlist` — institutional screening (merged in from preregister site)

### Signals
- `GET /api/signals/composite/:ticker`
- `GET /api/signals/seasonality/:ticker`
- `GET /api/signals/cot/:ticker`
- Plus extended endpoints registered by `signals/extended.js` (mood, sectors, correlations, backtest)

### AI
- `GET /api/ai/sweep` — macro market summary (60/5min). Server-cached 5min, falls back to RSS when `GEMINI_API_KEY` is unset.
- `POST /api/ai/alert` — single-headline impact analysis (30/5min). Per-headline cache 1h.
- `POST /api/ai/interrogate` — Genesis chat (30/5min). Compliance-filtered, returns `{ text }` on every branch (success, mock, fallback).

### Payments (currently disabled — returns 503)
- `POST /api/payments/create-checkout-session`
- `POST /api/payments/webhook`

### Admin (auth + `role: admin` required)
- `GET /api/admin/overview`
- `GET /api/admin/export/users.csv`
- `GET /api/admin/export/subscribers.csv`
- `GET /api/admin/export/messages.csv`

## Project structure

```
src/
├── app.ts                    # Express app: CORS, routes, error handlers
├── server.ts                 # HTTP server boot
├── instrument.ts             # Sentry init (must be first import)
├── config/
│   ├── env.ts                # Zod-validated env loader
│   └── db.ts                 # Prisma client singleton
├── controllers/              # Request handlers (one file per resource)
├── services/                 # Business logic (auth, email, watchlist, referral, …)
├── middlewares/              # auth, admin role check, error handler
├── routes/                   # Route registrations
├── scripts/                  # Cron jobs: weekly digest, watchlist alerts
├── signals/                  # Ported JS engine: screener, seasonality, COT, backtest
└── utils/

prisma/
├── schema.prisma             # 9 models incl. WaitlistEntry (added with merge)
└── seed.ts                   # Demo content seeder

migrations/                   # Hand-applied Supabase SQL
```

## Scripts

- `npm run dev` — hot-reload dev server (tsx)
- `npm run build` — compile TS to `dist/`
- `npm start` — production server from `dist/server.js`
- `npm run prisma:generate` — regenerate Prisma client after schema changes
- `npm run prisma:migrate` — apply Prisma migrations against `DATABASE_URL`
- `npm run prisma:studio` — open Prisma Studio
- `npm run digest:prod` — send the weekly digest email (cron-driven, see `scripts/`)
- `npm run watchlist:check:prod` — evaluate watchlist thresholds and email alerts

## Tech stack

Express 4, TypeScript, Prisma 5, Postgres (Supabase), Zod for validation,
JWT (HS256) + bcryptjs for auth, express-rate-limit, Resend for email,
Sentry for error tracking, raw fetch against Gemini's REST API for the
AI surface (no SDK dep).
