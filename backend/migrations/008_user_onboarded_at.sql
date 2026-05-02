-- ─────────────────────────────────────────────────────────────────────────
-- Track whether a user has completed first-run onboarding.
--
--   onboardedAt — timestamp the user finished the wizard. Null means they
--                 haven't yet, so the frontend redirects them on next
--                 login. Once set, it never reverts (a user who skipped
--                 still needs to be carried through, but a user who
--                 finished should never be force-routed back).
--
-- Backfill: existing users are treated as already onboarded (set to
-- createdAt). They've already seen and configured the dashboard manually,
-- and forcing the wizard on them would be a worse experience than the
-- empty-dashboard problem we're trying to solve for new signups.
--
-- Run in the Supabase SQL editor once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS "onboardedAt" TIMESTAMPTZ;

-- Treat existing users as already onboarded so the wizard only fires for
-- genuinely new signups. WHERE clause makes this safe to re-run.
UPDATE users
SET "onboardedAt" = "createdAt"
WHERE "onboardedAt" IS NULL;
