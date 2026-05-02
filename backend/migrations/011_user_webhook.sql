-- ─────────────────────────────────────────────────────────────────────────
-- Per-user webhook delivery for watchlist alerts.
--
--   webhookUrl    — full URL the alert payload POSTs to. Must be HTTPS in
--                   production; the validator on the API checks this.
--   webhookSecret — random 32-byte hex string. Each outbound request
--                   carries an X-ChartSentinel-Signature header with the
--                   HMAC-SHA256 of the JSON body using this secret as the
--                   key, so the receiver can verify the request didn't
--                   come from a third party who just guessed the URL.
--   webhookFailureCount + webhookDisabledAt — automatic backoff state.
--                   Three consecutive failures suspends the URL until the
--                   user updates it; prevents one customer's flapping
--                   endpoint from delaying every cron run.
--
-- Run in Supabase once. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS "webhookUrl"           TEXT,
    ADD COLUMN IF NOT EXISTS "webhookSecret"        TEXT,
    ADD COLUMN IF NOT EXISTS "webhookFailureCount"  INT  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "webhookDisabledAt"    TIMESTAMPTZ;
