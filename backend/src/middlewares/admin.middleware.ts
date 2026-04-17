import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

// Mount *after* authenticateToken — expects req.user to be populated.
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};
