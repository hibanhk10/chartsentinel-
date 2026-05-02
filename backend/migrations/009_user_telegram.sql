-- ─────────────────────────────────────────────────────────────────────────
-- Telegram delivery channel for watchlist alerts.
--
--   telegramChatId — the numeric chat id Telegram assigns when a user
--                    hits /start in our bot. Set the moment we get a
--                    successful linking webhook, cleared when the user
--                    disconnects from the Settings page. Stored as text
--                    so very-large group/channel ids never overflow.
--   telegramUsername — the @handle the user had when they linked.
--                      Cosmetic only; we never look users up by it
--                      (chat ids are stable, usernames are not).
--
-- Run in the Supabase SQL editor once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS "telegramChatId"   TEXT,
    ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT;
