import * as Sentry from '@sentry/react';

// Centralised Sentry init. Called once from main.jsx before React mounts.
// Stays quiet unless VITE_SENTRY_DSN is set — which means local dev without
// the env var makes zero outbound requests. That's intentional.

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask inputs by default — this is a finance product and we don't want
        // user credentials, screened tickers, or PII ending up in session replay.
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],

    // Traces: 10% of transactions in prod, 100% locally if DSN is wired to dev.
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session replay: only record 10% of normal sessions, but capture 100% of
    // sessions where an error occurred — errors are the thing worth replaying.
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0.0,
    replaysOnErrorSampleRate: 1.0,
  });
}

export { Sentry };
