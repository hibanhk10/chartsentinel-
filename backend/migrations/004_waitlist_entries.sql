-- Waitlist applications migrated in from the standalone preregister site.
-- Pre-launch capture form lives at /waitlist on the main app; this table
-- holds approvals for manual invitation to the live product before
-- Stripe is wired up.
-- Run in the Supabase SQL editor once.

CREATE TABLE IF NOT EXISTS waitlist_entries (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    "fullName"  TEXT NOT NULL,
    institution TEXT,
    aum         TEXT,
    source      TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    metadata    JSONB DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS waitlist_entries_created_at_idx
    ON waitlist_entries ("createdAt" DESC);
