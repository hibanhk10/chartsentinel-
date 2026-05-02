import { describe, expect, it } from 'vitest';
import { authenticator } from 'otplib';
import { totpService } from '../../src/services/totp.service';

// Pin the otplib options the service module sets at import time so the
// helper-generated codes here use the same step/window the service does.
authenticator.options = { step: 30, window: 1 };

describe('totpService.generateSetup', () => {
  it('returns a base32 secret, an otpauth URI, and a PNG data URL', async () => {
    const setup = await totpService.generateSetup('user@example.com');
    expect(setup.secret).toMatch(/^[A-Z2-7]+$/); // RFC 4648 base32
    expect(setup.otpauthUrl.startsWith('otpauth://totp/')).toBe(true);
    expect(setup.otpauthUrl.includes('ChartSentinel')).toBe(true);
    expect(setup.otpauthUrl.includes(encodeURIComponent('user@example.com'))).toBe(true);
    expect(setup.qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });
});

describe('totpService.verifyCode', () => {
  it('accepts the current code generated from the same secret', () => {
    const secret = authenticator.generateSecret();
    const code = authenticator.generate(secret);
    expect(totpService.verifyCode(secret, code)).toBe(true);
  });

  it('rejects an unrelated 6-digit code', () => {
    const secret = authenticator.generateSecret();
    expect(totpService.verifyCode(secret, '000000')).toBe(false);
  });

  it('returns false on empty inputs rather than throwing', () => {
    expect(totpService.verifyCode('', '123456')).toBe(false);
    expect(totpService.verifyCode('ANYSECRET', '')).toBe(false);
  });
});

describe('totpService.generateBackupCodes', () => {
  it('returns the requested number of plain codes plus matching hashes', async () => {
    const { plain, hashes } = await totpService.generateBackupCodes(10);
    expect(plain).toHaveLength(10);
    expect(hashes).toHaveLength(10);
    expect(new Set(plain).size).toBe(10); // all codes distinct
    for (const code of plain) expect(code).toMatch(/^[0-9a-f]+$/);
  });
});

describe('totpService.consumeBackupCode', () => {
  it('returns hashes minus the one that matched on success', async () => {
    const { plain, hashes } = await totpService.generateBackupCodes(3);
    const remaining = await totpService.consumeBackupCode(hashes, plain[1]);
    expect(remaining).not.toBeNull();
    expect(remaining).toHaveLength(2);
    // The remaining hashes correspond to the other two plaintext codes.
    const stillRedeemable = await totpService.consumeBackupCode(remaining!, plain[0]);
    expect(stillRedeemable).toHaveLength(1);
  });

  it('returns null when no stored hash matches', async () => {
    const { hashes } = await totpService.generateBackupCodes(3);
    expect(await totpService.consumeBackupCode(hashes, 'not-a-real-code')).toBeNull();
  });

  it('treats the same code redeemed twice as a miss the second time', async () => {
    const { plain, hashes } = await totpService.generateBackupCodes(2);
    const after = await totpService.consumeBackupCode(hashes, plain[0]);
    expect(after).not.toBeNull();
    // After spending the code, the original `hashes` array still contains it
    // (the caller is responsible for persisting `after`); but the spent code
    // must not validate against the *post-redemption* set.
    expect(await totpService.consumeBackupCode(after!, plain[0])).toBeNull();
  });
});
