-- ─────────────────────────────────────────────────────────────────────────
-- Add public community-map fields to users.
--
-- Members opt in via the Networking dashboard. Only rows with
-- locationOptIn=true AND a non-null displayName + lat/lng are surfaced
-- by GET /api/networking/members. Coordinates are city-centroid values
-- supplied by the curated picker on the frontend — we do not geocode
-- user-typed strings server-side.
--
-- Run in the Supabase SQL editor once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS "displayName"   TEXT,
    ADD COLUMN IF NOT EXISTS "roleTag"       TEXT,
    ADD COLUMN IF NOT EXISTS "city"          TEXT,
    ADD COLUMN IF NOT EXISTS "country"       TEXT,
    ADD COLUMN IF NOT EXISTS "lat"           DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "lng"           DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "locationOptIn" BOOLEAN NOT NULL DEFAULT false;

-- Composite index: the public-roster query filters by locationOptIn and
-- requires non-null lat/lng, so order by (locationOptIn, lat) keeps the
-- planner happy on what is otherwise a full table scan.
CREATE INDEX IF NOT EXISTS users_location_optin_idx
    ON users ("locationOptIn", "lat")
    WHERE "locationOptIn" = true AND "lat" IS NOT NULL;
