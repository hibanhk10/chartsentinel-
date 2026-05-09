-- ─────────────────────────────────────────────────────────────────────────
-- Subscription tier on the user record.
--
-- Until now `plan` lived only in the locally-cached user object — meaning
-- a user who upgraded on one device would see "Free Member" on every
-- other device they signed in to. Persisting it on the User row makes
-- the choice account-scoped and survives login across devices.
--
-- Allowed values: 'free' | 'pro' | 'ultimate'. We don't enforce that with
-- a CHECK constraint because Stripe will eventually own the value and we
-- want flexibility to add tiers without a follow-up migration.
--
-- Existing users default to 'free' (matching their isPaid=false default).
-- The legacy isPaid boolean stays on the schema for now so older code
-- paths keep working; future migration can drop it once the cutover is
-- complete.
--
-- Run in Supabase once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'free';

CREATE INDEX IF NOT EXISTS users_plan_idx ON users ("plan");
