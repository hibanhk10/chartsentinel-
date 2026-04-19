import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerController,
  loginController,
  forgotPasswordController,
  resetPasswordController,
} from '../controllers/auth.controller';

const router = Router();

// The reset surface is a juicy target for enumeration + spam. A tight rate
// limit keyed on IP prevents an attacker from hammering /forgot-password
// with every email in a breach dump, and stops anyone from mailbombing a
// user by repeatedly requesting resets for their address.
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again in a bit.' },
});

router.post('/register', registerController);
router.post('/login', loginController);
router.post('/forgot-password', resetLimiter, forgotPasswordController);
router.post('/reset-password', resetLimiter, resetPasswordController);

export default router;
