import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import env from '../config/env';
import { sendPasswordResetEmail, sendWelcomeEmail } from './email.service';
import { referralService } from './referral.service';
import { totpService } from './totp.service';

// Password-reset token lifetime. Short enough that a stolen email sitting in
// an unattended inbox is unlikely to be usable long after; long enough that
// someone can actually click the link on a phone in another room.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export class AuthService {
  async register(email: string, password: string, referralCode?: string | null) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    // Attribute the referral if a code travelled through the register form.
    // Done inside register() so a transient referral cookie/query param
    // becomes durable on the first successful signup — we never want an
    // attribution that depends on the user staying logged in.
    if (referralCode) {
      await referralService.attributeRegistration(user.id, referralCode);
    }

    // Welcome email is best-effort — if it fails we still want the user to
    // land in their dashboard. Logged for the ops team, not surfaced to the
    // client.
    sendWelcomeEmail(user.email).catch((err) => {
      console.error('[auth] welcome email failed:', err);
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isPaid: user.isPaid,
      },
      token,
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // 2FA gate. When the user has TOTP enabled, the password check alone
    // isn't enough to mint a session token — we hand back a short-lived
    // challenge token instead. The frontend then collects the 6-digit code
    // and POSTs it to /api/auth/2fa/verify, which exchanges the challenge
    // for a real session JWT.
    if (user.totpEnabled) {
      const challengeToken = this.generateChallengeToken(user.id);
      return {
        requires2fa: true as const,
        challengeToken,
      };
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isPaid: user.isPaid,
      },
      token,
    };
  }

  // Exchanges a challenge token + TOTP (or backup) code for a session JWT.
  // Returning the same shape as login() means the frontend can use one
  // post-auth code path regardless of whether 2FA was involved.
  async verifyTwoFactor(challengeToken: string, code: string) {
    let payload: { id: string; purpose?: string };
    try {
      payload = jwt.verify(challengeToken, env.JWT_SECRET) as typeof payload;
    } catch {
      throw new Error('This sign-in attempt has expired. Start over.');
    }
    if (payload.purpose !== '2fa-challenge') {
      throw new Error('This sign-in attempt has expired. Start over.');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.totpEnabled || !user.totpSecret) {
      throw new Error('Two-factor is not configured for this account.');
    }

    const codeOk = totpService.verifyCode(user.totpSecret, code);
    if (!codeOk) {
      // Fall back to the backup-code path. Each redemption is one-shot:
      // on success we splice the matching hash out of the stored array,
      // so the same code can never be reused.
      const remaining = await totpService.consumeBackupCode(user.totpBackupCodes, code);
      if (!remaining) {
        throw new Error('That code did not match.');
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { totpBackupCodes: remaining },
      });
    }

    const token = this.generateToken(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isPaid: user.isPaid,
      },
      token,
    };
  }

  // Begin the TOTP setup flow. Persists the secret immediately so the
  // server can verify the first code in confirmTwoFactorSetup. The user's
  // `totpEnabled` flag stays false until that confirmation lands; an
  // abandoned setup leaves a dormant secret that will be overwritten by
  // the next setup attempt.
  async beginTwoFactorSetup(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');
    if (user.totpEnabled) {
      throw new Error('Two-factor is already enabled. Disable it first to re-enrol.');
    }

    const setup = await totpService.generateSetup(user.email);
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: setup.secret },
    });
    return {
      otpauthUrl: setup.otpauthUrl,
      qrDataUrl: setup.qrDataUrl,
    };
  }

  // Confirm the in-progress setup with a fresh code from the user's
  // authenticator. On success we flip totpEnabled and hand back ten
  // backup codes — shown to the user once, never recoverable later.
  async confirmTwoFactorSetup(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');
    if (user.totpEnabled) {
      throw new Error('Two-factor is already enabled.');
    }
    if (!user.totpSecret) {
      throw new Error('Start the setup flow first.');
    }
    if (!totpService.verifyCode(user.totpSecret, code)) {
      throw new Error('That code did not match.');
    }

    const { plain, hashes } = await totpService.generateBackupCodes();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: true,
        totpBackupCodes: hashes,
      },
    });

    return { backupCodes: plain };
  }

  // Returns the current user's profile + 2FA status. Used by the Settings
  // page to render the right primary action and by any client that wants
  // a fresh view of mutable flags (isPaid, totpEnabled, onboardedAt) after
  // the JWT was minted. The response shape is intentionally narrow — no
  // password hash, no TOTP secret, no backup codes.
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isPaid: user.isPaid,
      totpEnabled: user.totpEnabled,
      onboardedAt: user.onboardedAt,
    };
  }

  // Complete first-run onboarding. Bulk-creates watchlist items for the
  // chosen tickers (skipping any the user already follows — re-running
  // never produces duplicates) and sets onboardedAt so the frontend stops
  // routing back here. Wrapped in a transaction so a partial state — some
  // tickers added, onboardedAt unset — is impossible.
  async completeOnboarding(userId: string, tickers: string[], threshold: number) {
    if (tickers.length === 0) {
      throw new Error('Pick at least one ticker.');
    }

    // Symmetric thresholds: composite score above +threshold fires a
    // bullish alert, below -threshold fires a bearish one. Most users
    // don't need asymmetric bands at signup time, and the watchlist
    // edit UI lets them tune per-ticker later.
    const thresholdAbove = threshold;
    const thresholdBelow = -threshold;

    await prisma.$transaction([
      ...tickers.map((ticker) =>
        prisma.watchlistItem.upsert({
          where: { userId_ticker: { userId, ticker } },
          create: { userId, ticker, thresholdAbove, thresholdBelow },
          // Don't clobber per-ticker thresholds the user already set if
          // they ever come back through onboarding. Existing rows keep
          // their existing tuning.
          update: {},
        })
      ),
      prisma.user.update({
        where: { id: userId },
        data: { onboardedAt: new Date() },
      }),
    ]);
  }

  // Tear down 2FA. Requires the password (so a stolen session can't
  // disable it) plus a current TOTP code (so a stolen password alone
  // can't either). Either condition failing aborts.
  async disableTwoFactor(userId: string, password: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');
    if (!user.totpEnabled || !user.totpSecret) {
      throw new Error('Two-factor is not enabled on this account.');
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) throw new Error('Invalid credentials.');

    const codeOk = totpService.verifyCode(user.totpSecret, code);
    const backupOk = !codeOk
      ? (await totpService.consumeBackupCode(user.totpBackupCodes, code)) !== null
      : false;
    if (!codeOk && !backupOk) throw new Error('That code did not match.');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecret: null,
        totpEnabled: false,
        totpBackupCodes: [],
      },
    });
  }

  // Fire-and-forget: always resolves successfully, even if no user exists
  // for the given email. Callers (controllers) should never tell the client
  // whether the address was found — doing so leaks the member list and lets
  // attackers enumerate accounts through the reset form.
  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    // Invalidate any previous unused tokens so an attacker who captures an
    // old link can't use it after the user requests a fresh one.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // 32 bytes of randomness, URL-safe, stored hashed. The plaintext only
    // ever leaves the server inside the reset email.
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    await sendPasswordResetEmail(user.email, rawToken);
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = sha256(rawToken);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    // Keep error messages uniform so a client can't distinguish
    // "wrong token" from "used token" from "expired token". All three are
    // equally "this link doesn't work anymore".
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new Error('This reset link is invalid or has expired.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Single transaction: update password + mark token consumed. If either
    // side fails we don't want the user to end up in a half-reset state.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  private generateToken(id: string, email: string, role: string): string {
    return jwt.sign(
      { id, email, role, purpose: 'session' },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  // Short-lived JWT issued after a successful password check when the
  // user still owes a TOTP code. The auth middleware rejects anything
  // with `purpose === '2fa-challenge'`, so this token can do exactly one
  // thing: be exchanged at /api/auth/2fa/verify for a real session JWT.
  private generateChallengeToken(id: string): string {
    return jwt.sign(
      { id, purpose: '2fa-challenge' },
      env.JWT_SECRET,
      { expiresIn: '5m' }
    );
  }
}
