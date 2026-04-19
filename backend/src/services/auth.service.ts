import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import env from '../config/env';
import { sendPasswordResetEmail, sendWelcomeEmail } from './email.service';

// Password-reset token lifetime. Short enough that a stolen email sitting in
// an unattended inbox is unlikely to be usable long after; long enough that
// someone can actually click the link on a phone in another room.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export class AuthService {
  async register(email: string, password: string) {
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
      { id, email, role },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }
}
