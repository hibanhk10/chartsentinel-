import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { getReferralController } from '../controllers/referral.controller';

const router = Router();

router.use(authenticateToken);
router.get('/', getReferralController);

export default router;
