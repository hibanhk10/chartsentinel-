import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { getAllReportsController, getReportByIdController } from '../controllers/reports.controller';

const router = Router();

// Reports are a paid / authenticated feature — keep them behind the
// auth middleware. Flip to public by removing authenticateToken below
// if you ever want to expose them.
router.get('/', authenticateToken, getAllReportsController);
router.get('/:id', authenticateToken, getReportByIdController);

export default router;
