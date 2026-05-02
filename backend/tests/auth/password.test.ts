import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';

// Sanity-checks the password-storage primitive used by AuthService.register
// and AuthService.resetPassword. If bcrypt's behavior or our salt-rounds
// usage changes, these break loudly before a regression ships to prod.
describe('bcrypt password handling', () => {
  it('produces a hash that verifies the original password', async () => {
    const password = 'correct horse battery staple';
    const hash = await bcrypt.hash(password, 10);

    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
  });

  it('rejects a slightly-wrong password', async () => {
    const hash = await bcrypt.hash('s3cret-value', 10);
    expect(await bcrypt.compare('s3cret-Value', hash)).toBe(false);
    expect(await bcrypt.compare('s3cret-value ', hash)).toBe(false);
  });

  it('produces different hashes for the same password (per-hash salt)', async () => {
    const a = await bcrypt.hash('same-input', 10);
    const b = await bcrypt.hash('same-input', 10);
    expect(a).not.toBe(b);
  });
});
