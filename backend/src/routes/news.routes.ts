import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import {
  createNewsController,
  getAllNewsController,
  getNewsByIdController,
} from '../controllers/news.controller';

const router = Router();

router.get('/', authenticateToken, getAllNewsController);
router.get('/:id', authenticateToken, getNewsByIdController);
router.post('/', authenticateToken, requireAdmin, createNewsController);

export default router;
