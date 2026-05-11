-- ─────────────────────────────────────────────────────────────────────────
-- Historical record of watchlist alerts that fired. Powers the in-app
-- notifications bell on the dashboard. Each row is one (user, ticker)
-- threshold crossing — `direction` is "above" or "below" depending on
-- which side of the band the composite score crossed. `readAt` is
-- null until the user opens the bell dropdown and marks them seen.
--
-- Cascade delete on user closure so account removal sweeps the feed.
--
-- Run in Supabase once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_events (
    "id"          TEXT PRIMARY KEY,
    "userId"      TEXT NOT NULL REFERENCES users("id") ON DELETE CASCADE,
    "ticker"      TEXT NOT NULL,
    "direction"   TEXT NOT NULL,
    "threshold"   DOUBLE PRECISION NOT NULL,
    "score"       DOUBLE PRECISION NOT NULL,
    "triggeredAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "readAt"      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS alert_events_user_time_idx
    ON alert_events ("userId", "triggeredAt" DESC);
CREATE INDEX IF NOT EXISTS alert_events_user_unread_idx
    ON alert_events ("userId", "readAt");
