-- ─────────────────────────────────────────────────────────────────────────
-- Programmatic API access keys. Ultimate-tier users mint these from
-- Settings; each key auths requests to /api/v1/* via the
-- X-Api-Key header. We store only the sha256 hash so a database leak
-- doesn't expose live keys, and we surface the plaintext exactly once
-- at creation time.
--
-- `prefix` is the first 8 chars of the plaintext, stored separately so
-- the dashboard can show "cs_live_a1b2c3d4…" without re-storing the
-- whole secret. `lastUsedAt` lets users see which keys are dormant.
-- Cascade delete on the user so account closure removes keys too.
--
-- Run in Supabase once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_keys (
    "id"          TEXT PRIMARY KEY,
    "userId"      TEXT NOT NULL REFERENCES users("id") ON DELETE CASCADE,
    "hashedKey"   TEXT NOT NULL UNIQUE,
    "prefix"      TEXT NOT NULL,
    "label"       TEXT NOT NULL,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "lastUsedAt"  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys ("userId");
CREATE INDEX IF NOT EXISTS api_keys_last_used_idx ON api_keys ("lastUsedAt" DESC NULLS LAST);
