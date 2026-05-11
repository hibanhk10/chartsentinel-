import { Request, Response, NextFunction } from 'express';
import { verifyApiKey } from '../services/api-key.service';

export interface ApiKeyRequest extends Request {
  apiUser?: { id: string; email: string; role: string; plan: string };
}

// Authenticates an Ultimate-tier user from the `X-Api-Key` header. The
// JWT-based auth middleware still works on /api/* for cookie/session
// callers; this is the parallel path for programmatic clients hitting
// /api/v1/*.
export const authenticateApiKey = async (
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction,
) => {
  const key = req.headers['x-api-key'];
  const plaintext = Array.isArray(key) ? key[0] : key;
  if (!plaintext) {
    res.status(401).json({ error: 'Missing X-Api-Key header.' });
    return;
  }
  const user = await verifyApiKey(plaintext);
  if (!user) {
    res.status(403).json({ error: 'Invalid API key.' });
    return;
  }
  if (user.plan !== 'ultimate') {
    // Defence in depth — keys can only be minted on Ultimate, but if
    // a user downgraded after minting we revoke effective access here.
    res.status(403).json({ error: 'API access requires the Ultimate plan.' });
    return;
  }
  req.apiUser = user;
  next();
};
