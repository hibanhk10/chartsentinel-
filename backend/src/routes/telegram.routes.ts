import express, { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
  telegramLinkStartController,
  telegramUnlinkController,
  telegramWebhookController,
} from '../controllers/telegram.controller';

const router = Router();

// Linking is a session action — the user has to be signed in for us to know
// who owns the chat being linked. Unlink is the same.
router.post('/link/start', authenticateToken, telegramLinkStartController);
router.post('/unlink', authenticateToken, telegramUnlinkController);

// Webhook is open by HTTP standards but locked by the secret-token header
// the controller verifies. We mount express.json() locally because the
// global parser may already have run; using it twice is a no-op when the
// body has already been parsed and a guarantee otherwise.
router.post('/webhook', express.json({ limit: '256kb' }), telegramWebhookController);

export default router;
