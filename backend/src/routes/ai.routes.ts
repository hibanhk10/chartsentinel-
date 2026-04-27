import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { interrogate } from '../controllers/ai.controller';

const router = Router();

// AI endpoints can be expensive — Gemini is rate-limited and key-gated.
// 30 messages per 5 min per IP is generous for legitimate chat usage
// and tight enough to make scraping/automation visibly painful.
const aiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
});

router.post('/interrogate', aiLimiter, interrogate);

export default router;
