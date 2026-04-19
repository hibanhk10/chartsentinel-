import { Router } from 'express';
import env from '../config/env';
import { healthController } from '../controllers/health.controller';

const router = Router();

router.get('/health', healthController);

// Verification endpoint — throws on purpose so we can confirm Sentry is
// receiving events end-to-end. Disabled in production so randoms can't
// fill the error log with noise.
if (env.NODE_ENV !== 'production') {
  router.get('/debug-sentry', () => {
    throw new Error('Sentry test from /api/debug-sentry');
  });
}

export default router;
