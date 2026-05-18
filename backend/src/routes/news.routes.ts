import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import {
  createNewsController,
  getAllNewsController,
  getNewsByIdController,
  getNewsSentimentController,
} from '../controllers/news.controller';

const router = Router();

// GET endpoints are public — the homepage News section renders for
// anonymous visitors and the source is live RSS, not gated content.
router.get('/', getAllNewsController);
// /sentiment must precede /:id so the literal path wins over the
// dynamic match — otherwise it'd be parsed as id="sentiment".
router.get('/sentiment', getNewsSentimentController);
router.get('/:id', getNewsByIdController);
router.post('/', authenticateToken, requireAdmin, createNewsController);

export default router;
