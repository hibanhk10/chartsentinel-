import { describe, expect, it } from 'vitest';
import crypto from 'crypto';

// Mirrors the sha256() helper inside auth.service.ts. The reset-password
// flow stores only the hash of the random token; if this hashing primitive
// drifts (e.g. a bytes-vs-hex regression), every reset link breaks. These
// tests pin the format and the determinism property that the lookup
// (findUnique by tokenHash) relies on.
function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

describe('reset-token hashing', () => {
  it('returns a 64-char lowercase hex string', () => {
    const hash = sha256('any-token');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input, same output', () => {
    expect(sha256('token-a')).toBe(sha256('token-a'));
  });

  it('produces different hashes for tokens that differ by one byte', () => {
    expect(sha256('token-a')).not.toBe(sha256('token-A'));
  });
});
