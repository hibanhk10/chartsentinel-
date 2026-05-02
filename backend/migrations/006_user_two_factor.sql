-- ─────────────────────────────────────────────────────────────────────────
-- Add TOTP-based two-factor authentication to users.
--
--   totpSecret        — base32-encoded shared secret. Set the moment a user
--                       starts the setup flow; only enforced after they
--                       confirm a valid code, at which point totpEnabled
--                       flips to true.
--   totpEnabled       — gate read by the login flow. When true, login
--                       returns a short-lived challenge token instead of
--                       a full session JWT until the 6-digit code is
--                       supplied at /api/auth/2fa/verify.
--   totpBackupCodes   — array of bcrypt hashes of one-time recovery codes
--                       handed to the user at enable-time. We hash because
--                       the column is essentially a second password — a DB
--                       leak shouldn't include plaintext bypass codes.
--                       Stored as TEXT[] so each redemption can splice the
--                       used hash out without touching the others.
--
-- Run in the Supabase SQL editor once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS "totpSecret"      TEXT,
    ADD COLUMN IF NOT EXISTS "totpEnabled"     BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "totpBackupCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
