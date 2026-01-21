import { Router } from 'express';
import { getAllNewsController, getNewsByIdController } from '../controllers/news.controller';

const router = Router();

router.get('/', getAllNewsController);
router.get('/:id', getNewsByIdController);

export default router;
