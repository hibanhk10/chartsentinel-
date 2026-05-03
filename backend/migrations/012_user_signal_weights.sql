-- ─────────────────────────────────────────────────────────────────────────
-- Per-user composite signal weights.
--
-- The composite score is currently a fixed blend:
--   seasonal 30% + cot 25% + pattern 30% + base 15%
-- Pro users want to tune this — e.g. a fundamentals-driven trader might
-- weight COT positioning higher and pattern matching to zero. Stored as
-- JSON so we can add new factor weights without another migration.
--
-- Null = use defaults. Saved value is normalised server-side so weights
-- always sum to 1.0 before scoring.
--
-- Run in Supabase once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS "signalWeights" JSONB;
