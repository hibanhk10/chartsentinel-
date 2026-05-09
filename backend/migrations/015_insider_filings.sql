-- ─────────────────────────────────────────────────────────────────────────
-- Persistent SEC Form 4 history + materialised cluster-buy events.
--
-- The live insider endpoint serves a rolling 5-min cache that holds at
-- most ~60 filings. Cluster-buy detection (≥3 distinct insiders buying
-- the same ticker inside a 14-day window) is statistically meaningful
-- only over weeks of accumulated data, so we snapshot Form 4s into
-- `insider_filings` on every snapshot run and re-detect over the last
-- 30 days. Each detected cluster is materialised into
-- `cluster_buy_events` so we can show a history timeline and backtest
-- against forward returns later.
--
-- formUrl is the SEC index page URL — a natural unique key that lets us
-- upsert without scanning by composite (filer, ticker, date) tuples that
-- aren't reliably unique.
--
-- (ticker, latestDate) is unique on the cluster table so re-running the
-- detector across overlapping windows doesn't duplicate the same event.
--
-- Run in Supabase once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS insider_filings (
    "id"                TEXT PRIMARY KEY,
    "formUrl"           TEXT NOT NULL UNIQUE,
    "filer"             TEXT NOT NULL,
    "ticker"            TEXT NOT NULL,
    "type"              TEXT NOT NULL,
    "shares"            DOUBLE PRECISION NOT NULL,
    "price"             DOUBLE PRECISION NOT NULL,
    "value"             DOUBLE PRECISION NOT NULL,
    "filingDate"        TIMESTAMPTZ NOT NULL,
    "capturedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
    "officerTitle"      TEXT,
    "isOfficer"         BOOLEAN NOT NULL DEFAULT false,
    "isDirector"        BOOLEAN NOT NULL DEFAULT false,
    "isTenPercentOwner" BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS insider_filings_ticker_date_idx
    ON insider_filings ("ticker", "filingDate" DESC);
CREATE INDEX IF NOT EXISTS insider_filings_date_idx
    ON insider_filings ("filingDate" DESC);

CREATE TABLE IF NOT EXISTS cluster_buy_events (
    "id"           TEXT PRIMARY KEY,
    "ticker"       TEXT NOT NULL,
    "buyerCount"   INTEGER NOT NULL,
    "totalValue"   DOUBLE PRECISION NOT NULL,
    "buyers"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "earliestDate" TIMESTAMPTZ NOT NULL,
    "latestDate"   TIMESTAMPTZ NOT NULL,
    "detectedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cluster_buy_events_ticker_latest_idx
    ON cluster_buy_events ("ticker", "latestDate");
CREATE INDEX IF NOT EXISTS cluster_buy_events_ticker_detected_idx
    ON cluster_buy_events ("ticker", "detectedAt" DESC);
CREATE INDEX IF NOT EXISTS cluster_buy_events_detected_idx
    ON cluster_buy_events ("detectedAt" DESC);
