import { Request, Response } from 'express';
import { z } from 'zod';
import {
  fetchRecentForm4s,
  detectClusterBuys,
  loadClusterHistory,
  loadClusterPerformance,
} from '../services/insider.service';
import { fetchCongressTrades } from '../services/congress.service';

const querySchema = z.object({
  role: z.enum(['all', 'csuite', 'director', 'tenpct']).optional(),
  type: z.enum(['all', 'Buy', 'Sell']).optional(),
});

export const getInsiderTradesController = async (req: Request, res: Response): Promise<void> => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query' });
    return;
  }
  try {
    const all = await fetchRecentForm4s();
    const role = parsed.data.role ?? 'all';
    const type = parsed.data.type ?? 'all';

    const filtered = all.filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (role === 'csuite') return t.isOfficer;
      if (role === 'director') return t.isDirector;
      if (role === 'tenpct') return t.isTenPercentOwner;
      return true;
    });

    res.json({
      trades: filtered,
      source: 'SEC EDGAR Form 4',
      count: filtered.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[insider] getTrades', err);
    res.status(500).json({ error: 'Failed to fetch insider trades' });
  }
};

export const getClusterBuysController = async (_req: Request, res: Response): Promise<void> => {
  try {
    const trades = await fetchRecentForm4s();
    const clusters = detectClusterBuys(trades);
    res.json({ clusters, count: clusters.length, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error('[insider] clusterBuys', err);
    res.status(500).json({ error: 'Failed to compute cluster buys' });
  }
};

const historySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const getClusterHistoryController = async (req: Request, res: Response): Promise<void> => {
  const parsed = historySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query' });
    return;
  }
  try {
    const days = parsed.data.days ?? 30;
    const limit = parsed.data.limit ?? 50;
    const events = await loadClusterHistory(days, limit);
    res.json({ events, count: events.length, windowDays: days });
  } catch (err) {
    console.error('[insider] clusterHistory', err);
    res.status(500).json({ error: 'Failed to load cluster history' });
  }
};

export const getClusterPerformanceController = async (req: Request, res: Response): Promise<void> => {
  const parsed = historySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query' });
    return;
  }
  try {
    const days = parsed.data.days ?? 90;
    const limit = parsed.data.limit ?? 30;
    const events = await loadClusterPerformance(days, limit);
    res.json({ events, count: events.length, windowDays: days });
  } catch (err) {
    console.error('[insider] clusterPerformance', err);
    res.status(500).json({ error: 'Failed to load cluster performance' });
  }
};

export const getCongressTradesController = async (_req: Request, res: Response): Promise<void> => {
  try {
    const trades = await fetchCongressTrades();
    res.json({
      trades,
      source: 'House Stock Watcher + Senate Stock Watcher',
      count: trades.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[insider] congress', err);
    res.status(500).json({ error: 'Failed to fetch congress trades' });
  }
};
