import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import {
  overviewController,
  exportUsersController,
  exportSubscribersController,
  exportMessagesController,
} from '../controllers/admin.controller';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/overview', overviewController);

// Exports stream as Content-Disposition attachments so browsers save them
// with sensible filenames. No pagination — current data volumes are small;
// if that changes we swap to a streamed iterator.
router.get('/export/users.csv', exportUsersController);
router.get('/export/subscribers.csv', exportSubscribersController);
router.get('/export/messages.csv', exportMessagesController);

export default router;
