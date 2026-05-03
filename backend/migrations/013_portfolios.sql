-- ─────────────────────────────────────────────────────────────────────────
-- Portfolios — a named basket of (ticker, weight) per user. Lets a user
-- define an actual portfolio and get a weighted composite across it,
-- instead of checking each holding one ticker at a time.
--
-- Two-table model:
--   portfolios       — header row (name, owner)
--   portfolio_items  — child rows (ticker, weight, parent portfolio)
--
-- Weights are decimals (0..1). The aggregator normalises before scoring
-- so a portfolio with raw weights summing to >1 or <1 still produces a
-- meaningful composite — same pattern as the signal-mix sliders.
--
-- Run in Supabase once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portfolios (
    "id"        TEXT PRIMARY KEY,
    "userId"    TEXT NOT NULL REFERENCES users("id") ON DELETE CASCADE,
    "name"      TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolios_user_idx ON portfolios ("userId");

CREATE TABLE IF NOT EXISTS portfolio_items (
    "id"          TEXT PRIMARY KEY,
    "portfolioId" TEXT NOT NULL REFERENCES portfolios("id") ON DELETE CASCADE,
    "ticker"      TEXT NOT NULL,
    "weight"      DOUBLE PRECISION NOT NULL,
    UNIQUE ("portfolioId", "ticker")
);

CREATE INDEX IF NOT EXISTS portfolio_items_portfolio_idx
    ON portfolio_items ("portfolioId");
