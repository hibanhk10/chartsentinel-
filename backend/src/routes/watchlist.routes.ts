import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
  listWatchlistController,
  upsertWatchlistController,
  deleteWatchlistController,
  listAlertEventsController,
  markAlertsReadController,
} from '../controllers/watchlist.controller';

const router = Router();

// Every watchlist route requires a valid JWT — this is user-scoped data and
// has no use case for anonymous access.
router.use(authenticateToken);

router.get('/', listWatchlistController);
router.post('/', upsertWatchlistController);
router.delete('/:id', deleteWatchlistController);

// In-app alert feed for the dashboard notifications bell. Lives under
// /watchlist because the events are watchlist-scoped; auth middleware
// applied at the router level above.
router.get('/alerts', listAlertEventsController);
router.post('/alerts/mark-read', markAlertsReadController);

export default router;
