import { Router } from 'express';
import { getAllReportsController, getReportByIdController } from '../controllers/reports.controller';

const router = Router();

router.get('/', getAllReportsController);
router.get('/:id', getReportByIdController);

export default router;
