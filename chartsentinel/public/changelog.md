# Changelog

Notable changes to ChartSentinel. Format roughly follows [Keep a
Changelog](https://keepachangelog.com/) and dates use ISO 8601.

## [1.1.0] — 2026-05-03

13 features across four phases (foundation, activation, differentiation,
pro-tier) plus a long-standing bug fix.

### Added — Foundation
- **Vitest skeleton + GitHub Actions CI** for the backend (`56` tests
  across auth, signals, telegram, webhook, and lib helpers).
- **TOTP two-factor authentication** with QR setup, 10 single-use backup
  codes, login-challenge flow, and a Settings UI section. Stored secrets
  are scoped to a single user; backup codes are bcrypt-hashed individually
  and spliced out on redemption.
- **Security audit log** (`AuditLog` model). Append-only history of
  logins, 2FA enrolment changes, password resets, and Telegram link/unlink
  events. Admin tab gets a paginated viewer with event-prefix filters.

### Added — Activation
- **First-run onboarding wizard** at `/onboarding`. Three steps: pick
  1-10 tickers from a curated grid, set a composite-score threshold,
  finish. Bulk-creates watchlist items and stamps `onboardedAt` so the
  dashboard guard knows the user is past the cliff.
- **Telegram alerts.** Watchlist alerts now deliver to a linked
  `@chat-id` alongside email. Linking flow uses a 10-min one-shot JWT
  exchanged via the bot's `/start` deep link. Bot is HMAC-validated via
  `X-Telegram-Bot-Api-Secret-Token`.
- **Job-status admin dashboard.** New `JobRun` model + `jobRunService.track()`
  wraps the `weekly-digest` and `watchlist-check` cron scripts. Admin
  tab gets per-job health cards (OK / Stale / Failed) and a paginated
  history table.

### Added — Differentiation
- **AI score-explainer.** `POST /api/ai/explain-score` takes a ticker
  + components and returns a 3-sentence Gemini breakdown. Server-cached
  15min by (ticker, rounded score). Surfaced as an `auto_awesome` button
  on every screener and watchlist row.
- **Backtester tab** over the existing `/api/backtest/:ticker` endpoint.
  Renders an SVG equity curve with a starting-capital baseline, a stat
  grid (return / buy-and-hold / alpha / win rate / max drawdown / Sharpe),
  and a recent-trades table.
- **Seasonality calendar.** New `computeSeasonalityCalendar()` helper
  buckets historical price data into 12 monthly cells with avg return,
  win rate, and best/worst-year extremes. Frontend renders a heatmap +
  detailed table.

### Added — Pro-tier
- **HMAC-signed watchlist webhooks.** Per-user `webhookUrl` +
  `webhookSecret`. Each delivery POSTs JSON with an
  `X-ChartSentinel-Signature` header (HMAC-SHA256 of the body) so the
  receiver can verify authenticity. Auto-disables after three
  consecutive failures; user re-saves the URL to re-enable.
- **Daily signal export.** `GET /api/signals/export.csv` streams the
  full screener as CSV. Reuses the screener cache; "Export today's
  snapshot" button on the Signals tab.
- **Adjustable signal mix.** Per-user composite weights as JSON
  (`signalWeights`). Settings UI has sliders for the four components
  (seasonal / cot / pattern / base). Weights are stored raw and
  normalised at scoring time, so a saved 30/30/30/10 round-trips
  losslessly. New `/api/signals/me/score/:ticker` uses them.
- **Portfolio mode.** `Portfolio` + `PortfolioItem` models. Per-user
  CRUD + `PUT /:id/items` (transactional replace) + `GET /:id/score`
  (parallel per-ticker scoring with weighted aggregate). Sub-scores use
  the user's saved signal-mix weights, so portfolio numbers live on the
  same scale as per-ticker scores elsewhere.

### Fixed
- **Watchlist alerts had been silently emitting NaN since launch.**
  `check-watchlist-alerts.ts` was calling `computeCompositeScore(ticker)`
  but the engine function takes `(seasonalSignal, cotScore, patternResult)`.
  String-as-number coerced to NaN, threshold checks were always false,
  no alerts ever fired. New `computeScoreForTicker()` orchestrator wraps
  the fetches and sub-signals into a single ticker-keyed call.
- **COT panel had been showing the empty-state message every day.** The
  CFTC fetcher pointed at dataset `jun7-fc8e` (Disaggregated Futures
  Only — agricultural commodities, last data Sept 2022). Switched to
  `gpe5-46if` (Traders in Financial Futures), which has fresh weekly
  data for EURO FX, BRITISH POUND, JAPANESE YEN, etc. Field mapping
  aggregates leveraged funds + asset managers as the "non-commercial"
  proxy; dealers stay as the commercial proxy.
- **Railway build failure on Phase 1+ deploys.** `@types/qrcode` was in
  `devDependencies`; Railway runs `npm install` with `NODE_ENV=production`
  set, which skips devDeps, and `tsc` failed with TS7016. Moved to
  `dependencies` (matches the pattern of `@types/bcryptjs`,
  `@types/cors`, etc.) and pinned Node 20 at the repo root via
  `nixpacks.toml` + `engines.node`.

### Migrations
Apply in order via the Supabase SQL editor before deploying:

```
006_user_two_factor.sql
007_audit_log.sql
008_user_onboarded_at.sql
009_user_telegram.sql
010_job_runs.sql
011_user_webhook.sql
012_user_signal_weights.sql
013_portfolios.sql
```

### Optional env vars
None of these are required to boot, but set them if you want the
corresponding feature to do something other than mock-fallback:

- `DIRECT_URL` — Postgres direct URL (set equal to `DATABASE_URL` if
  not using a pooler). Required by Prisma migrate.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`
  — Telegram delivery channel.

## Pre-1.1.0

Earlier releases didn't carry a CHANGELOG; the history is in
`git log` and the [GitHub
Releases](https://github.com/hibanhk10/chartsentinel-/releases) page.
