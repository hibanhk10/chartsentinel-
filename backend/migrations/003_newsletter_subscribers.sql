-- Newsletter signups from the dashboard "Stay up to date" card.
-- Run in the Supabase SQL editor once.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_created_at_idx
    ON newsletter_subscribers ("createdAt" DESC);
