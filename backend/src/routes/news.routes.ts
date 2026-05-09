import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import {
  createNewsController,
  getAllNewsController,
  getNewsByIdController,
} from '../controllers/news.controller';

const router = Router();

// GET endpoints are public — the homepage News section renders for
// anonymous visitors and the source is live RSS, not gated content.
router.get('/', getAllNewsController);
router.get('/:id', getNewsByIdController);
router.post('/', authenticateToken, requireAdmin, createNewsController);

export default router;
