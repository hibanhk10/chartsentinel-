import { Router } from 'express';
// @ts-ignore
import { createCheckoutSession, handleWebhook } from '../controllers/payment.controller';
import express from 'express';

const router = Router();

router.post('/create-checkout-session', express.json(), createCheckoutSession);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
