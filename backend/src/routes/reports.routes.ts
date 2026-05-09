import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import {
  createReportController,
  getAllReportsController,
  getReportByIdController,
} from '../controllers/reports.controller';

const router = Router();

// GETs are public — homepage Reports section renders for anonymous
// visitors and the source is live analysis RSS, not gated content.
router.get('/', getAllReportsController);
router.get('/:id', getReportByIdController);
router.post('/', authenticateToken, requireAdmin, createReportController);

export default router;
