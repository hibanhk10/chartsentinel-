import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';

// 30-second TOTP step with a ±1-window tolerance — accepts the previous and
// next codes too so a user typing the digits at second 29 doesn't fail. The
// otplib defaults are reasonable; pinning here in case upstream defaults
// drift between minor versions.
authenticator.options = {
  step: 30,
  window: 1,
};

const ISSUER = 'ChartSentinel';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH_BYTES = 5; // 10 hex chars per code — enough entropy, easy to type

export interface TotpSetup {
  /** Base32 secret to persist on the user. Sent back to the client only at
   *  setup time so the QR code can be regenerated on a refresh; never
   *  exposed via any other endpoint. */
  secret: string;
  /** otpauth://… URI for users who prefer to copy/paste into their authenticator
   *  app instead of scanning. */
  otpauthUrl: string;
  /** PNG data URL of the QR code rendering the otpauthUrl. Inline-able into
   *  an <img src> on the setup screen. */
  qrDataUrl: string;
}

export const totpService = {
  /** Generate a fresh secret + QR for a user starting the setup flow. The
   *  caller is responsible for persisting `secret` on the user row before
   *  returning the QR to the client — otherwise the user scans a code that
   *  the server can't later verify. */
  async generateSetup(email: string): Promise<TotpSetup> {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, ISSUER, secret);
    const qrDataUrl = await qrcode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrDataUrl };
  },

  /** Constant-time-ish verification of a 6-digit code against the stored
   *  secret. Returns false on any malformed input rather than throwing —
   *  the controller treats false as "wrong code" and surfaces a uniform
   *  error to the client. */
  verifyCode(secret: string, code: string): boolean {
    if (!secret || !code) return false;
    try {
      return authenticator.verify({ token: code, secret });
    } catch {
      return false;
    }
  },

  /** Generate `count` random backup codes plus their bcrypt hashes. The
   *  plain codes are returned only here, once, and shown to the user
   *  exactly once. The hashes are what gets stored. */
  async generateBackupCodes(count = BACKUP_CODE_COUNT): Promise<{ plain: string[]; hashes: string[] }> {
    const plain: string[] = [];
    const hashes: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const code = crypto.randomBytes(BACKUP_CODE_LENGTH_BYTES).toString('hex');
      plain.push(code);
      // 10 rounds matches the password hashing in auth.service.ts so a
      // backup code isn't easier to crack than the underlying password.
      hashes.push(await bcrypt.hash(code, 10));
    }
    return { plain, hashes };
  },

  /** Try to redeem `submittedCode` against `storedHashes`. Returns the
   *  remaining hashes (the matched one removed) on success, or null if no
   *  hash matches — null tells the caller to reject the login attempt. */
  async consumeBackupCode(
    storedHashes: string[],
    submittedCode: string
  ): Promise<string[] | null> {
    if (!submittedCode) return null;
    const normalized = submittedCode.trim().toLowerCase();
    for (let i = 0; i < storedHashes.length; i += 1) {
      // bcrypt.compare is constant-time relative to its inputs, so iterating
      // doesn't leak which slot matched via timing.
      if (await bcrypt.compare(normalized, storedHashes[i])) {
        return [...storedHashes.slice(0, i), ...storedHashes.slice(i + 1)];
      }
    }
    return null;
  },
};
