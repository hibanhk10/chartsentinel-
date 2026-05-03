import { describe, expect, it } from 'vitest';
import { telegramService } from '../../src/services/telegram.service';

// Linking-token tests are now DB-backed (TelegramLinkToken table) and
// belong in an integration suite once we wire one up. The unit-test
// surface here is just the pure helpers — escapeHtml + the configuration
// probes — which don't need Prisma.

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
