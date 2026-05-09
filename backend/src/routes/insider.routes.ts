import { Router } from 'express';
import {
  getInsiderTradesController,
  getClusterBuysController,
  getClusterHistoryController,
  getCongressTradesController,
} from '../controllers/insider.controller';

const router = Router();

router.get('/trades', getInsiderTradesController);
router.get('/clusters', getClusterBuysController);
router.get('/clusters/history', getClusterHistoryController);
router.get('/congress', getCongressTradesController);

export default router;
