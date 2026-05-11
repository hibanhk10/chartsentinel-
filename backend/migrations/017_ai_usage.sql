-- ─────────────────────────────────────────────────────────────────────────
-- Daily AI prompt usage tracking, used to enforce tier-based caps on
-- /api/ai/explain-score and /api/ai/interrogate. One row per identity
-- per UTC day; the controller upserts + increments on every successful
-- LLM call and compares against the tier cap before responding.
--
-- `identity` is `u:<userId>` for authed callers, `ip:<sha256(ip)>` for
-- anonymous. We hash the IP rather than storing it raw so the table
-- doesn't double as a tracker. `day` is the ISO date in UTC.
--
-- Run in Supabase once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_usage (
    "id"        TEXT PRIMARY KEY,
    "identity"  TEXT NOT NULL,
    "day"       TEXT NOT NULL,
    "count"     INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_identity_day_idx
    ON ai_usage ("identity", "day");
CREATE INDEX IF NOT EXISTS ai_usage_day_idx
    ON ai_usage ("day");
