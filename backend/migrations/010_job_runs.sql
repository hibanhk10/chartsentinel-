-- ─────────────────────────────────────────────────────────────────────────
-- Job-run history. One row per execution of a scheduled job (weekly
-- digest, watchlist alert checker, future cron tasks). Lets the admin tab
-- show "did the digest go out last Friday?" without anyone needing to
-- read Railway / cron logs.
--
-- name        — stable identifier, e.g. "weekly-digest" or
--               "watchlist-check". Used to filter and to roll up "show
--               the last run of each named job" in the dashboard.
-- status      — 'success' or 'failure'. Anything mid-flight is invisible
--               here because we only insert the row at completion.
-- startedAt / finishedAt — wall clock bounds. durationMs is denormalised
--               for read-heavy displays so the dashboard doesn't have to
--               compute it on every render.
-- message     — short human-readable summary on success ("3 emails
--               sent"), or the error message on failure.
-- metadata    — JSON for whatever else the caller wants to preserve
--               (counters, IDs, etc.).
--
-- Run in the Supabase SQL editor once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_runs (
    "id"          TEXT PRIMARY KEY,
    "name"        TEXT NOT NULL,
    "status"      TEXT NOT NULL,
    "startedAt"   TIMESTAMPTZ NOT NULL,
    "finishedAt"  TIMESTAMPTZ NOT NULL,
    "durationMs"  INT  NOT NULL,
    "message"     TEXT,
    "metadata"    JSONB
);

CREATE INDEX IF NOT EXISTS job_runs_name_started_idx
    ON job_runs ("name", "startedAt" DESC);

CREATE INDEX IF NOT EXISTS job_runs_started_idx
    ON job_runs ("startedAt" DESC);
