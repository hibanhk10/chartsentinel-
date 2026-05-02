import { describe, expect, it } from 'vitest';
import { telegramService } from '../../src/services/telegram.service';

// JWT_SECRET is read from env at module load — vitest inherits the dev .env
// so the value is whatever the local backend uses. The token contents we
// care about (purpose claim, userId round-trip) don't depend on the
// specific secret value.

describe('telegramService.escapeHtml', () => {
  it('escapes the three Telegram-HTML special characters', () => {
    expect(telegramService.escapeHtml('a & b')).toBe('a &amp; b');
    expect(telegramService.escapeHtml('a < b')).toBe('a &lt; b');
    expect(telegramService.escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('leaves benign text untouched', () => {
    expect(telegramService.escapeHtml('AAPL +75')).toBe('AAPL +75');
  });

  it('escapes ampersand first so the &lt; / &gt; substitutions are not double-encoded', () => {
    // If we escaped < before & we would produce &amp;lt; for "<".
    expect(telegramService.escapeHtml('<&>')).toBe('&lt;&amp;&gt;');
  });
});

describe('telegramService linking token', () => {
  it('round-trips a userId on a freshly minted token', () => {
    const token = telegramService.generateLinkToken('user-abc');
    expect(telegramService.verifyLinkToken(token)).toBe('user-abc');
  });

  it('returns null on a string that is not a JWT', () => {
    expect(telegramService.verifyLinkToken('not-a-token')).toBeNull();
    expect(telegramService.verifyLinkToken('')).toBeNull();
  });

  it("returns null when the token's purpose isn't 'telegram-link'", async () => {
    // Mint a token by hand with a different purpose, using the same
    // secret as the service. We import jsonwebtoken at the top of the
    // test rather than using a vitest mock so the test verifies real
    // behaviour, not a stub.
    const jwt = (await import('jsonwebtoken')).default;
    const env = (await import('../../src/config/env')).default;
    const sessionToken = jwt.sign({ id: 'user-xyz', purpose: 'session' }, env.JWT_SECRET, {
      expiresIn: '1h',
    });
    expect(telegramService.verifyLinkToken(sessionToken)).toBeNull();
  });
});

describe('telegramService.isConfigured / botUsername', () => {
  it('is a boolean reflecting TELEGRAM_BOT_TOKEN presence', () => {
    // The exact value depends on whichever env this test runs under;
    // we just assert the type so a future refactor that returns
    // undefined/null instead of a boolean trips here.
    expect(typeof telegramService.isConfigured()).toBe('boolean');
  });

  it('botUsername returns string or null, never undefined', () => {
    const result = telegramService.botUsername();
    expect(result === null || typeof result === 'string').toBe(true);
  });
});
