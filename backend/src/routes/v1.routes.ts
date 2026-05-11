import { Router, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authenticateApiKey, ApiKeyRequest } from '../middlewares/api-key.middleware';
import {
  fetchRecentForm4s,
  detectClusterBuys,
  loadClusterHistory,
} from '../services/insider.service';
// Engine endpoints are registered directly on the express app via
// registerSignalRoutes — we re-expose a curated subset under /v1 by
// proxying the same handlers, but we can also just call out to the
// public /api/signals/* layer since it's already routed on the same
// host. The cleaner play for the first cut: forward to internal
// services where they exist, otherwise call back via fetch.

const router = Router();

// Programmatic clients should be able to hit the API hard, but a key
// minted on Ultimate isn't a license to DDoS our upstream Yahoo / SEC
// feeds. 600 / 5 min ≈ 2 req/s which matches typical "developer tier"
// quotas elsewhere. Per-key rate-limiting via the API key header so a
// shared-IP setup (CI, CGI) doesn't collide.
const v1Limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // API-key callers get pinned to their key so a shared-IP setup
  // (CI, NAT) doesn't accidentally pool quota across teams. Anonymous
  // requests fall through to ipKeyGenerator which folds IPv6 /64s
  // into a single bucket — the express-rate-limit recommended fix
  // for ERR_ERL_KEY_GEN_IPV6.
  keyGenerator: (req) => {
    const key = req.headers['x-api-key'];
    if (typeof key === 'string' && key.length > 0) return `k:${key}`;
    return `ip:${ipKeyGenerator(req.ip ?? '')}`;
  },
  message: { error: 'API rate limit hit. Slow down.' },
});

router.use(v1Limiter);
router.use(authenticateApiKey);

// Lazy-load engine so a v1 import doesn't drag the engine module into
// modules that don't use it.
async function getEngine() {
  return import('../signals/engine.js');
}

// ── /api/v1/me — quick sanity check + plan echo ──
router.get('/me', (req: ApiKeyRequest, res: Response) => {
  res.json({
    id: req.apiUser!.id,
    email: req.apiUser!.email,
    plan: req.apiUser!.plan,
  });
});

// ── /api/v1/score/:ticker — composite score for one ticker ──
router.get('/score/:ticker', async (req: Request, res: Response) => {
  try {
    const engine = await getEngine();
    const ticker = req.params.ticker;
    const data = await engine.computeScoreForTicker(ticker);
    if (!data) {
      res.status(404).json({ error: 'No data for this ticker.' });
      return;
    }
    res.json(data);
  } catch (err) {
    console.error('[v1] score', err);
    res.status(500).json({ error: 'Failed to compute score.' });
  }
});

// ── /api/v1/history/:ticker — daily price bars ──
router.get('/history/:ticker', async (req: Request, res: Response) => {
  try {
    const engine = await getEngine();
    const ticker = req.params.ticker;
    const years = Math.min(Math.max(parseInt(String(req.query.years), 10) || 1, 1), 5);
    const bars = await engine.fetchYahooHistory(ticker, years);
    if (!bars || bars.length === 0) {
      res.status(404).json({ error: 'No price data.' });
      return;
    }
    res.json({ ticker, years, bars });
  } catch (err) {
    console.error('[v1] history', err);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

// ── /api/v1/insider/clusters — recent insider clusters ──
router.get('/insider/clusters', async (_req: Request, res: Response) => {
  try {
    const trades = await fetchRecentForm4s();
    const clusters = detectClusterBuys(trades);
    res.json({ clusters });
  } catch (err) {
    console.error('[v1] insider clusters', err);
    res.status(500).json({ error: 'Failed to compute clusters.' });
  }
});

// ── /api/v1/insider/history — historical cluster events ──
router.get('/insider/history', async (req: Request, res: Response) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days), 10) || 30, 1), 365);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 50, 1), 500);
    const events = await loadClusterHistory(days, limit);
    res.json({ events, windowDays: days });
  } catch (err) {
    console.error('[v1] insider history', err);
    res.status(500).json({ error: 'Failed to load history.' });
  }
});

export default router;
