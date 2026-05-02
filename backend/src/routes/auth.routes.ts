import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerController,
  loginController,
  forgotPasswordController,
  resetPasswordController,
  meController,
  beginTwoFactorSetupController,
  enableTwoFactorController,
  disableTwoFactorController,
  verifyTwoFactorController,
} from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

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

// Tighter limit on the TOTP-verify exchange: a brute-force attempt at the
// 6-digit space is 1-in-a-million per try, which is too good given a real
// attacker who already has the password. 10/15min cuts the practical
// attempt rate to ~960/day.
const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many codes tried. Wait a bit and start the sign-in over.' },
});

router.post('/register', registerController);
router.post('/login', loginController);
router.post('/forgot-password', resetLimiter, forgotPasswordController);
router.post('/reset-password', resetLimiter, resetPasswordController);
router.get('/me', authenticateToken, meController);

// 2FA endpoints. Setup/enable/disable require a session JWT so an
// unauthenticated caller can't poke around. /verify is the one path that
// accepts an unauthenticated request — it consumes a challenge token
// instead.
router.post('/2fa/setup', authenticateToken, beginTwoFactorSetupController);
router.post('/2fa/enable', authenticateToken, enableTwoFactorController);
router.post('/2fa/disable', authenticateToken, disableTwoFactorController);
router.post('/2fa/verify', twoFactorLimiter, verifyTwoFactorController);

export default router;
