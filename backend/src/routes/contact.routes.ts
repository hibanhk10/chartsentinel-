import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { submitContactForm } from '../controllers/contact.controller';

const router = Router();

// Public endpoint → easy to spam. Limit each IP to 5 messages per 15 min.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages from this address. Try again later.' },
});

router.post('/', contactLimiter, submitContactForm);

export default router;
