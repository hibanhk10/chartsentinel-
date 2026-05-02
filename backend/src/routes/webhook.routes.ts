import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
  setWebhookUrl,
  removeWebhook,
  getWebhookStatus,
  sendTestWebhook,
} from '../controllers/webhook.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getWebhookStatus);
router.post('/', setWebhookUrl);
router.delete('/', removeWebhook);
router.post('/test', sendTestWebhook);

export default router;
