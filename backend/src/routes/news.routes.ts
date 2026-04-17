import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { getAllNewsController, getNewsByIdController } from '../controllers/news.controller';

const router = Router();

router.get('/', authenticateToken, getAllNewsController);
router.get('/:id', authenticateToken, getNewsByIdController);

export default router;
