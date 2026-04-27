# ChartSentinel Frontend

React 19 + Vite app. Marketing landing page, three-step institutional
waitlist screening, and an authenticated dashboard with composite-score
signals, a live trading terminal, sentiment view, AI interrogation, and
watchlist alerts.

See the root [`README.md`](../README.md) for the full architecture
overview (frontend + backend together).

## Setup

```bash
npm install
echo "VITE_API_URL=http://localhost:3000/api" > .env
npm run dev                # http://localhost:5173
```

The backend at `VITE_API_URL` needs to be reachable for auth, content,
watchlist, AI, and waitlist endpoints. The Terminal and Mood tabs hit
Binance + alternative.me directly from the browser so they work without
the backend.

## Routes

```
/                          # Marketing landing page
/waitlist                  # Three-step institutional screening form
/funnel                    # Stripe checkout signup (currently disabled)
/contact                   # Contact form
/forgot-password           # Password reset request
/reset-password            # Password reset with token
/terms /privacy /risk      # Legal pages
/trust                     # Institutional trust protocols
/dashboard?tab=…           # Authenticated app — see tabs below
```

## Dashboard tabs

| Tab | What |
|---|---|
| `home` | Welcome banner, Quick Access tiles, latest reports, newsletter subscribe |
| `signals` | Composite score screener (seasonality + COT + pattern match + backtest) |
| `terminal` | Live BTC/ETH/SOL chart, top-12 orderbook, trades stream, 24h stats |
| `mood` | Crypto Fear & Greed gauge + Market Radar of 8 majors |
| `interrogation` | Genesis AI chat + ThreatMatrix panel |
| `watchlist` | Per-ticker threshold alerts |
| `reports`, `news`, `referrals`, `coaching`, `networking` | Long-form / community |
| `admin` | Admin-only: overview, CSV exports, content authoring |

## Tech stack

React 19, Vite 7, React Router 7, Tailwind CSS 3, Framer Motion, GSAP,
Lenis (smooth scroll), Three.js + React-Three-Fiber for the hero
canvas, lightweight-charts for the trading chart, Tiptap for the admin
rich-text editor, react-helmet-async for SEO, Sentry + PostHog
(optional) for observability.

## Build

```bash
npm run build              # Vite production build into dist/
npm run preview            # Serve the build locally
```

Frontend ships to Vercel; the backend ships to Railway. See
`vercel.json` (in this directory) and `railway.json` (in the repo
root) for deploy configs.

## Notes on the merge

Several premium UI surfaces (BreakingNewsTicker, ThreatMatrix,
MarketRadar, the live Terminal panel, Genesis chat) were originally
built on the standalone `chartsentinel-preregister` site. They've been
ported here as JSX (lucide-react replaced with inline SVGs, hex
literals replaced with the main app's Tailwind theme tokens) so the
preregister site can be deprecated. The `/waitlist` route specifically
replaces the preregister's `/screening` and posts to
`POST /api/waitlist` on this app's backend. See the root README's
"Project history" section for context.
