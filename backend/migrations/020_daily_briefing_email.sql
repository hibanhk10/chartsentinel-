-- ─────────────────────────────────────────────────────────────────────────
-- Daily AI briefing email opt-in. Off by default — users explicitly
-- enable it from Settings, then a cron job (send-daily-briefings.ts)
-- generates each opted-in user's personalised brief and emails it
-- every weekday morning.
--
-- Run in Supabase once. Idempotent — uses IF NOT EXISTS.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "dailyBriefingEmail" BOOLEAN NOT NULL DEFAULT false;
