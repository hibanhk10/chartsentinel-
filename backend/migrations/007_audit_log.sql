-- ─────────────────────────────────────────────────────────────────────────
-- Audit log for security-relevant events.
--
-- One row per event we want a tamper-evident record of: logins, 2FA
-- enrolment changes, password resets, and (when admin write actions land)
-- destructive admin operations. Read-only by design — no ON UPDATE / ON
-- DELETE triggers because the table isn't authoritative state, just an
-- append-only history.
--
--   userId    — who the event is about (logging-in user, target of an
--               admin action). Nullable so we can record events that
--               failed before a user could be identified, and so deleting
--               a user doesn't cascade away their audit history.
--   event     — namespaced string ('auth.login.success', 'auth.totp.enabled').
--               Indexed alongside createdAt for efficient "show me all
--               failed logins last 24h" queries.
--   ip / ua   — request metadata for forensics.
--   metadata  — JSON for event-specific extras (e.g. {reason:'wrong_code'}).
--
-- Run in the Supabase SQL editor once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
    "id"        TEXT PRIMARY KEY,
    "userId"    TEXT,
    "event"     TEXT NOT NULL,
    "ip"        TEXT,
    "userAgent" TEXT,
    "metadata"  JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_created_idx
    ON audit_logs ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS audit_logs_event_created_idx
    ON audit_logs ("event", "createdAt" DESC);
