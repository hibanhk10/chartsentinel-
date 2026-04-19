import { Request, Response } from 'express';
import { z } from 'zod';
import { watchlistService } from '../services/watchlist.service';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

// Either threshold (or both) must be provided — a watchlist entry with
// no thresholds is just a bookmark and belongs elsewhere. Ranges here
// mirror the composite-score output (roughly -2 to +2 in practice; we
// allow -5/+5 to future-proof).
const upsertSchema = z
  .object({
    ticker: z.string().min(1).max(20),
    thresholdAbove: z.number().min(-5).max(5).optional().nullable(),
    thresholdBelow: z.number().min(-5).max(5).optional().nullable(),
  })
  .refine((v) => v.thresholdAbove != null || v.thresholdBelow != null, {
    message: 'Provide at least one of thresholdAbove or thresholdBelow.',
  });

export const listWatchlistController = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorised' });
    return;
  }
  const items = await watchlistService.list(req.user.id);
  res.json({ items });
};

export const upsertWatchlistController = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorised' });
    return;
  }
  try {
    const body = upsertSchema.parse(req.body);
    const item = await watchlistService.upsert(req.user.id, body);
    res.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid input.' });
      return;
    }
    throw error;
  }
};

export const deleteWatchlistController = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorised' });
    return;
  }
  const removed = await watchlistService.remove(req.user.id, req.params.id);
  if (!removed) {
    res.status(404).json({ error: 'Watchlist item not found.' });
    return;
  }
  res.json({ ok: true });
};
