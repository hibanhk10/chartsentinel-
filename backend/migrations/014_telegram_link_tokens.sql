-- ─────────────────────────────────────────────────────────────────────────
-- Short opaque tokens for the Telegram /start linking flow.
--
-- Telegram's deep-link spec caps the /start parameter at 64 chars and
-- restricts the alphabet to [A-Za-z0-9_-]. The earlier implementation
-- handed out a signed JWT (~280 chars, contains dots) which Telegram
-- silently dropped — Chartsentinel_chatbot received a bare /start with
-- no payload, couldn't identify the user, and never linked anyone.
--
-- Each row maps a 24-char random token to the user that requested it,
-- with a 10-min expiry. Rows are deleted on consume; expired rows are
-- swept lazily by the consume path itself.
--
-- Run in Supabase once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS telegram_link_tokens (
    "token"     TEXT PRIMARY KEY,
    "userId"    TEXT NOT NULL REFERENCES users("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "expiresAt" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS telegram_link_tokens_user_idx
    ON telegram_link_tokens ("userId");
CREATE INDEX IF NOT EXISTS telegram_link_tokens_expires_idx
    ON telegram_link_tokens ("expiresAt");
