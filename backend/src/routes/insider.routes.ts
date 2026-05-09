import { Router } from 'express';
import {
  getInsiderTradesController,
  getClusterBuysController,
  getClusterHistoryController,
  getClusterPerformanceController,
  getCongressTradesController,
} from '../controllers/insider.controller';

const router = Router();

router.get('/trades', getInsiderTradesController);
router.get('/clusters', getClusterBuysController);
router.get('/clusters/history', getClusterHistoryController);
router.get('/clusters/performance', getClusterPerformanceController);
router.get('/congress', getCongressTradesController);

export default router;
