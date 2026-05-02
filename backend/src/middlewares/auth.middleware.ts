import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, env.JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    // 2FA challenge tokens are scoped to the /api/auth/2fa/verify exchange
    // — block them everywhere else so a stolen challenge can't read mail
    // or list watchlists. Tokens minted before the `purpose` field
    // existed have it undefined, so backward compatibility holds.
    const claims = user as { id: string; email: string; role: string; purpose?: string };
    if (claims.purpose === '2fa-challenge') {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    req.user = claims;
    next();
  });
};
