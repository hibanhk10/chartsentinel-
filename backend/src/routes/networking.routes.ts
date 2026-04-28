import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
  listMembersController,
  getMyLocationController,
  updateMyLocationController,
} from '../controllers/networking.controller';

const router = Router();

// All routes require auth — the public roster is a member-only feature,
// not a publicly-crawlable endpoint. Anonymous traffic gets 401.
router.use(authenticateToken);

// Update is rate-limited so a leaked token can't spam-flip a user's
// location 1000 times/min. Reads are intentionally unrestricted within
// the auth layer.
const locationWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many location updates. Try again shortly.' },
});

router.get('/members', listMembersController);
router.get('/me/location', getMyLocationController);
router.patch('/me/location', locationWriteLimiter, updateMyLocationController);

export default router;
