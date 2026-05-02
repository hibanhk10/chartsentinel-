import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

const authService = new AuthService();

// Six-digit TOTP codes are the common case; some authenticators emit eight.
// Backup codes are 10 hex characters. Allowing 6-12 covers all three with
// one schema and one error message.
const codeSchema = z.string().trim().min(6).max(12);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  // Optional referral code — flows through to the referral service on
  // successful registration. Loose validation; bad codes are silently
  // ignored rather than rejecting the signup.
  referralCode: z.string().max(32).optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email(),
  // Keep in sync with registerSchema so client-side and server-side
  // validation stay consistent.
  password: z.string().min(6),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6),
});

export const registerController = async (req: Request, res: Response) => {
  try {
    const { email, password, referralCode } = registerSchema.parse(req.body);
    const result = await authService.register(email, password, referralCode);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    // Always succeeds — never leak whether an email is registered. The
    // service handles the lookup + send internally.
    await authService.requestPasswordReset(email);
    res.json({
      ok: true,
      message: 'If an account exists for that email, a reset link is on the way.',
    });
  } catch (error) {
    // Validation errors are the only reason we 400 here; any internal
    // failure logs via Sentry and still 200s to the client to preserve
    // the no-enumeration property.
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'A valid email is required.' });
      return;
    }
    console.error('[auth] forgotPassword error:', error);
    res.json({
      ok: true,
      message: 'If an account exists for that email, a reset link is on the way.',
    });
  }
};

export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password);
    res.json({ ok: true, message: 'Password updated. You can sign in now.' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const meController = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Sign in first.' });
      return;
    }
    const me = await authService.getMe(req.user.id);
    res.json(me);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Lookup failed.' });
  }
};

// ── Two-factor (TOTP) ──────────────────────────────────────────────────────

const verify2faSchema = z.object({
  challengeToken: z.string().min(10),
  code: codeSchema,
});

const enable2faSchema = z.object({ code: codeSchema });

const disable2faSchema = z.object({
  password: z.string().min(6),
  code: codeSchema,
});

export const beginTwoFactorSetupController = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Sign in first.' });
      return;
    }
    const setup = await authService.beginTwoFactorSetup(req.user.id);
    res.json(setup);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Setup failed.' });
  }
};

export const enableTwoFactorController = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Sign in first.' });
      return;
    }
    const { code } = enable2faSchema.parse(req.body);
    const result = await authService.confirmTwoFactorSetup(req.user.id, code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Could not enable 2FA.' });
  }
};

export const disableTwoFactorController = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Sign in first.' });
      return;
    }
    const { password, code } = disable2faSchema.parse(req.body);
    await authService.disableTwoFactor(req.user.id, password, code);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Could not disable 2FA.' });
  }
};

export const verifyTwoFactorController = async (req: Request, res: Response) => {
  try {
    const { challengeToken, code } = verify2faSchema.parse(req.body);
    const result = await authService.verifyTwoFactor(challengeToken, code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Verification failed.' });
  }
};
