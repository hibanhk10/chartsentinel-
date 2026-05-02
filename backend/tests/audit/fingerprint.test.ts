import { describe, expect, it } from 'vitest';
import { Request } from 'express';
import { fingerprintFromRequest, AUDIT_EVENTS } from '../../src/services/audit.service';

// Minimal Request stand-in. Cast through unknown so we don't have to
// satisfy every Express field — the function only reads ip / socket / headers.
function fakeRequest(parts: Partial<{ ip: string; socket: { remoteAddress?: string }; headers: Record<string, string> }>): Request {
  return {
    ip: parts.ip,
    socket: parts.socket ?? {},
    headers: parts.headers ?? {},
  } as unknown as Request;
}

describe('fingerprintFromRequest', () => {
  it('prefers req.ip over the socket remote address', () => {
    const fp = fingerprintFromRequest(
      fakeRequest({ ip: '1.2.3.4', socket: { remoteAddress: '5.6.7.8' } })
    );
    expect(fp.ip).toBe('1.2.3.4');
  });

  it('falls back to socket.remoteAddress when req.ip is missing', () => {
    const fp = fingerprintFromRequest(
      fakeRequest({ socket: { remoteAddress: '5.6.7.8' } })
    );
    expect(fp.ip).toBe('5.6.7.8');
  });

  it('returns nulls when no IP or UA is recoverable', () => {
    const fp = fingerprintFromRequest(fakeRequest({}));
    expect(fp.ip).toBeNull();
    expect(fp.userAgent).toBeNull();
  });

  it('lifts the user-agent header into the userAgent field', () => {
    const fp = fingerprintFromRequest(
      fakeRequest({ headers: { 'user-agent': 'Mozilla/5.0 (probe)' } })
    );
    expect(fp.userAgent).toBe('Mozilla/5.0 (probe)');
  });
});

describe('AUDIT_EVENTS', () => {
  it('declares unique stable string identifiers — no duplicates from a copy-paste', () => {
    const values = Object.values(AUDIT_EVENTS);
    expect(new Set(values).size).toBe(values.length);
    for (const v of values) expect(v).toMatch(/^[a-z0-9_.]+$/);
  });
});
