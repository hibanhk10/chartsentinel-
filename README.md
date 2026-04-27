# ChartSentinel

Composite trading-signal platform for FX, crypto, and equities. Combines
seasonality, Commitment-of-Traders positioning, and chart-pattern matching
into a single composite score, surfaces it through a real-time terminal,
mood/sentiment view, and AI interrogation layer, and emails users when
their watchlist tickers cross a threshold.

This repository is a monorepo with a React frontend and a Node/TypeScript
backend. The standalone `chartsentinel-preregister` site has been folded
in — every public surface and every API endpoint it exposed now lives
here.

```
chartsentinel/
├── chartsentinel/        # React 19 frontend (Vite)
├── backend/              # Express + TypeScript API (Prisma + Postgres)
├── package.json          # Root npm scripts that delegate to backend/
└── railway.json          # Railway deploy config
```

## Quick start

```bash
# Backend
cd backend && cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET (>=32 chars), GEMINI_API_KEY (optional)
npm install
npm run prisma:generate
npm run dev                # http://localhost:3000

# Frontend (in another shell)
cd chartsentinel && npm install
echo "VITE_API_URL=http://localhost:3000/api" > .env
npm run dev                # http://localhost:5173
```

The migration files in `backend/migrations/*.sql` need to be applied
once against the Supabase database via the SQL editor — the most recent
is `004_waitlist_entries.sql` for the merged-in screening form.

## Public routes (frontend)

| Route | Purpose |
|---|---|
| `/` | Marketing landing page (Hero, Reports, News, Pricing, Process, WhyUs, Intelligence, Footer) |
| `/waitlist` | Three-step institutional screening form (replaces the standalone preregister site) |
| `/funnel` | Stripe-checkout signup flow (currently disabled — see backend payments controller) |
| `/contact` | Contact form |
| `/forgot-password`, `/reset-password` | Password reset flow |
| `/terms`, `/privacy`, `/risk` | Legal pages |
| `/trust` | Institutional trust protocols (security positioning) |
| `/dashboard` | Authenticated app — see tabs below |

## Authenticated dashboard tabs

The dashboard persists the active tab in `?tab=…` so reload + bookmark
behaviour is intuitive.

| Tab | Surface |
|---|---|
| `home` | Welcome banner, Quick Access tiles linking to the four most-used surfaces, latest reports, newsletter subscribe |
| `signals` | Composite score screener — seasonality, COT, pattern match, mood, sectors, correlations, backtest |
| `terminal` | Live BTC/ETH/SOL chart, top-12 orderbook, recent-trades stream, 24h stats. Direct from Binance public APIs. |
| `mood` | Crypto Fear & Greed gauge (alternative.me) + Market Radar of 8 majors with live 24h price/% |
| `interrogation` | Genesis chat (Gemini-backed AI analyst with mock fallback) + ThreatMatrix panel |
| `watchlist` | User-defined ticker thresholds with email alerts when crossed |
| `reports`, `news` | Long-form content. Admins author via the Tiptap rich-text editor in the admin tab. |
| `referrals` | Personal referral code, usage count, earned rewards |
| `admin` | Admin-only: overview stats, CSV exports for users / subscribers / messages, content authoring |

## API endpoints (backend)

Mounted under `/api`. Public endpoints are rate-limited by IP.

### Auth (public, rate-limited)
- `POST /api/auth/register` · `POST /api/auth/login`
- `POST /api/auth/forgot-password` · `POST /api/auth/reset-password`

### Content
- `GET /api/reports` · `GET /api/reports/:id` · `POST /api/reports` (admin)
- `GET /api/news` · `GET /api/news/:id` · `POST /api/news` (admin)

### User-driven (auth required)
- `GET /api/watchlist` · `POST /api/watchlist` · `DELETE /api/watchlist/:id`
- `GET /api/referral`

### Public forms
- `POST /api/contact` (5/15min)
- `POST /api/newsletter` (5/15min)
- `POST /api/waitlist` (5/15min) — institutional screening, upsert-by-email

### Signals
- `GET /api/signals/composite/:ticker` · `/seasonality/:ticker` · `/cot/:ticker` and the extended-engine routes registered by `signals/extended.js`

### AI (rate-limited)
- `GET /api/ai/sweep` — macro market summary, server-cached 5min, RSS fallback
- `POST /api/ai/alert` — single-headline impact analysis, per-headline cache 1h
- `POST /api/ai/interrogate` — Genesis chat. Compliance-filtered, Gemini-backed, mock fallback when `GEMINI_API_KEY` is unset

### Payments (currently disabled)
- `POST /api/payments/create-checkout-session` · `POST /api/payments/webhook`

### Admin (auth + role check)
- `GET /api/admin/overview` · `/export/users.csv` · `/export/subscribers.csv` · `/export/messages.csv`

## Tech stack

**Frontend.** React 19, Vite 7, React Router 7, Tailwind CSS 3, Framer
Motion, GSAP, Lenis (smooth scroll), Three.js + React-Three-Fiber for the
hero canvas, lightweight-charts for the live trading chart, Tiptap for the
admin rich-text editor.

**Backend.** Express 4, Prisma 5 (Postgres on Supabase), Zod for input
validation, JWT (HS256, 24h expiry) + bcryptjs for auth, express-rate-limit,
Resend for transactional email (welcome, password reset, weekly digest,
watchlist alerts), Sentry for error tracking, optional Google Gemini for
the AI surface.

**Deploy.** Frontend on Vercel, backend on Railway, database on Supabase.

## Environment

The minimum env to boot the backend is documented in
`backend/.env.example`. Optional but recommended:

| Variable | Effect when set |
|---|---|
| `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` | Real transactional email instead of console-log mocks |
| `GEMINI_API_KEY` | Real AI replies on `/api/ai/*` instead of mock fallbacks |
| `SENTRY_DSN` | Error tracking on backend (and `VITE_SENTRY_DSN` on frontend) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Re-enables `/funnel` payment flow once payment requirements are finalized |
| `VITE_POSTHOG_KEY` | Frontend analytics |

## Database migrations

Migrations live in `backend/migrations/*.sql` and are applied manually
through the Supabase SQL editor. They're numbered in the order they
need to run:

```
001_pre_registrations.sql      # original preregister table (deprecated by 004)
002_sync_with_prisma.sql       # backfill to align legacy schema
003_newsletter_subscribers.sql # mailing list capture
004_waitlist_entries.sql       # /waitlist form (added with the merge)
```

## Project history

The `chartsentinel-preregister` repository was a separate marketing /
waitlist site running in parallel during pre-launch. As of 2026-04-27 it
has been folded into this monorepo: the `/screening` form became
`/waitlist`, the polished demo pages (`/terminal`, `/mood`,
`/interrogation`, `/trust`) became dashboard tabs and routes here, and
the AI endpoints (`/api/ai/{sweep,alert,interrogate}`) were ported
across. The standalone preregister deploy can now be torn down and its
domain pointed here.
