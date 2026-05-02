import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { webhookService } from '../../src/services/webhook.service';

describe('webhookService.signBody', () => {
  it('round-trips against an out-of-band HMAC computation', () => {
    const secret = 'test-secret';
    const body = JSON.stringify({ type: 'watchlist.alert', triggers: [] });
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(webhookService.signBody(body, secret)).toBe(expected);
  });

  it('produces different signatures for the same body under different secrets', () => {
    const body = '{"a":1}';
    expect(webhookService.signBody(body, 's1')).not.toBe(webhookService.signBody(body, 's2'));
  });
});

describe('webhookService.generateSecret', () => {
  it('returns a 64-character hex string', () => {
    const s = webhookService.generateSecret();
    expect(s).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns a fresh value on every call', () => {
    const a = webhookService.generateSecret();
    const b = webhookService.generateSecret();
    expect(a).not.toBe(b);
  });
});

describe('webhookService.validateUrl', () => {
  it('rejects nonsense', () => {
    expect(webhookService.validateUrl('not-a-url')).toEqual({
      ok: false,
      reason: expect.stringContaining('valid URL'),
    });
  });

  it('rejects file:// and other protocols', () => {
    const result = webhookService.validateUrl('file:///etc/passwd');
    expect(result.ok).toBe(false);
  });

  it('accepts http:// outside production', () => {
    // setup.ts pins NODE_ENV=test, so the production-only checks don't fire.
    expect(webhookService.validateUrl('http://example.com/hook')).toEqual({ ok: true });
  });

  it('accepts https:// always', () => {
    expect(webhookService.validateUrl('https://example.com/hook')).toEqual({ ok: true });
  });
});
