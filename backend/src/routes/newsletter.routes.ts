import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { subscribeController } from '../controllers/newsletter.controller';

const router = Router();

// Public endpoint — protect against spam and list-bombing.
const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many subscriptions from this IP. Try again later.' },
});

router.post('/', subscribeLimiter, subscribeController);

export default router;
