import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
  listWatchlistController,
  upsertWatchlistController,
  deleteWatchlistController,
} from '../controllers/watchlist.controller';

const router = Router();

// Every watchlist route requires a valid JWT — this is user-scoped data and
// has no use case for anonymous access.
router.use(authenticateToken);

router.get('/', listWatchlistController);
router.post('/', upsertWatchlistController);
router.delete('/:id', deleteWatchlistController);

export default router;
