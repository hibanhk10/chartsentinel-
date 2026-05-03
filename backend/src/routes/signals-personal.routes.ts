import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
  getMyWeights,
  setMyWeights,
  resetMyWeights,
  getMyScore,
} from '../controllers/signals-personal.controller';

const router = Router();

router.use(authenticateToken);

router.get('/weights', getMyWeights);
router.post('/weights', setMyWeights);
router.delete('/weights', resetMyWeights);

router.get('/score/:ticker', getMyScore);

export default router;
