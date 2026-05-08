import { Router } from 'express';
import env from '../config/env';
import { healthController } from '../controllers/health.controller';
import { jobRunService } from '../services/job-run.service';

const router = Router();

router.get('/health', healthController);

// Unauthenticated public status payload for the /status page. Mirrors
// the admin job-runs summary but strips the message field (could leak
// internal counts / paths) and never returns IDs. Cron jobs are the
// signal here — if last digest run was 8 days ago, something's stuck.
router.get('/status', async (_req, res) => {
  try {
    const summary = await jobRunService.latestPerJob();
    res.json({
      status: 'ok',
      // Sanitised view: name, status, finishedAt, age. No message, no id.
      jobs: summary.map((row) => ({
        name: row.name,
        lastStatus: row.status,
        lastRunAt: row.finishedAt,
        durationMs: row.durationMs,
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[status]', err);
    res.status(500).json({ status: 'degraded', error: 'status lookup failed' });
  }
});

// Verification endpoint — throws on purpose so we can confirm Sentry is
// receiving events end-to-end. Disabled in production so randoms can't
// fill the error log with noise.
if (env.NODE_ENV !== 'production') {
  router.get('/debug-sentry', () => {
    throw new Error('Sentry test from /api/debug-sentry');
  });
}

export default router;
