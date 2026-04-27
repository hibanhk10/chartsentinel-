import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { submitWaitlist } from '../controllers/waitlist.controller';

const router = Router();

// Public endpoint, abuse-prone. Match the contact form's policy: 5 per 15
// min per IP. Lower than the preregister site's 10/15min because this
// host has fewer legitimate-burst patterns (one applicant fills the form
// once, not several teammates in sequence).
const waitlistLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many submissions from this address. Try again later.' },
});

router.post('/', waitlistLimiter, submitWaitlist);

export default router;
