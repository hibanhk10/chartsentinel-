-- ─────────────────────────────────────────────────────────────────────────
-- Sync Supabase schema with Prisma model (prisma/schema.prisma).
--
-- Drift found:
--   * users.isPaid column is missing (Prisma: Boolean @default(false))
--   * contact_messages table is missing (Prisma model: ContactMessage)
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Add the missing isPaid column to users.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN NOT NULL DEFAULT false;

-- 2. Create the contact_messages table referenced by the ContactMessage
--    Prisma model.
CREATE TABLE IF NOT EXISTS contact_messages (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "fullName" TEXT NOT NULL,
    email      TEXT NOT NULL,
    message    TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
