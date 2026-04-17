import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import {
  createReportController,
  getAllReportsController,
  getReportByIdController,
} from '../controllers/reports.controller';

const router = Router();

router.get('/', authenticateToken, getAllReportsController);
router.get('/:id', authenticateToken, getReportByIdController);
router.post('/', authenticateToken, requireAdmin, createReportController);

export default router;
