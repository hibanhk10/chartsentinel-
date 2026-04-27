import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { alert, interrogate, sweep } from '../controllers/ai.controller';

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
router.post('/interrogate', aiLimiter, interrogate);

export default router;
