// Sentry must be initialised before any other module is imported so that
// its auto-instrumentation can hook into Express, Prisma, etc. Keep this
// file tiny and keep `import './instrument'` as the first line of server.ts.

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

// No DSN = Sentry stays quiet. That's the right behaviour for local dev
// and for environments that haven't been wired up yet.
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',

    // Traces: 10% in prod is a sensible default; 100% locally if SENTRY_DSN
    // happens to be set during dev (usually it won't be).
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling piggy-backs on the trace sample rate above.
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [nodeProfilingIntegration()],
  });
}
