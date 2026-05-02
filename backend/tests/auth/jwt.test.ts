import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';

// Guards the contract AuthService.generateToken depends on: a token signed
// with one secret must verify only with that same secret, and tampering
// with the payload must invalidate the signature.
const SECRET = 'test-secret-which-is-at-least-32-characters-long!';

describe('JWT sign / verify', () => {
  it('round-trips a payload', () => {
    const token = jwt.sign({ id: 'u_1', email: 'a@b.co', role: 'user' }, SECRET, {
      expiresIn: '1h',
    });
    const decoded = jwt.verify(token, SECRET) as { id: string; email: string; role: string };
    expect(decoded.id).toBe('u_1');
    expect(decoded.email).toBe('a@b.co');
    expect(decoded.role).toBe('user');
  });

  it('rejects a token signed with a different secret', () => {
    const token = jwt.sign({ id: 'u_1' }, SECRET);
    expect(() => jwt.verify(token, 'a-different-secret-of-equal-length-okay!')).toThrow();
  });

  it('rejects a token whose payload was tampered with', () => {
    const token = jwt.sign({ id: 'u_1', role: 'user' }, SECRET);
    const [header, payload, signature] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    decoded.role = 'admin';
    const forgedPayload = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    const forgedToken = [header, forgedPayload, signature].join('.');

    expect(() => jwt.verify(forgedToken, SECRET)).toThrow();
  });
});
