import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { alert, briefing, explainScore, interrogate, sweep, usage } from '../controllers/ai.controller';
import { authenticateToken, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// AI endpoints can be expensive — Gemini is rate-limited and key-gated.
// 30 requests per 5 min per IP is generous for legitimate use (chat,
// occasional alerts) and tight enough to make scraping painful.
const aiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
});

// /sweep is server-side cached for 5 min, so even a hot homepage hits
// the rate limiter very lightly. Looser cap of 60 per 5 min keeps the
// public ticker functional even if a visitor refreshes a lot.
const sweepLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
});

router.get('/sweep', sweepLimiter, sweep);
router.post('/alert', aiLimiter, alert);
// `optionalAuth` lets the controller distinguish authed users (per-tier
// daily caps) from anonymous (per-IP cap) without forcing a login.
router.post('/interrogate', aiLimiter, optionalAuth, interrogate);
router.post('/explain-score', aiLimiter, optionalAuth, explainScore);
// Briefing requires a signed-in user — it personalises around their
// watchlist + portfolio, so anonymous calls have nothing to read.
router.post('/briefing', aiLimiter, authenticateToken, briefing);
router.get('/usage', optionalAuth, usage);

export default router;
