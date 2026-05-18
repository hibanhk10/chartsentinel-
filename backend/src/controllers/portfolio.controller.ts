import { Request, Response } from 'express';
import { z } from 'zod';
import { portfolioService } from '../services/portfolio.service';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

const renameSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

const itemsSchema = z.object({
  items: z
    .array(
      z.object({
        ticker: z.string().trim().min(1).max(20),
        weight: z.number().positive().finite(),
      }),
    )
    .max(50),
});

function requireUser(req: AuthedRequest, res: Response): { id: string } | null {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return null;
  }
  return req.user;
}

export const listPortfolios = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  const list = await portfolioService.list(user.id);
  res.json({ portfolios: list });
};

export const createPortfolio = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    const { name } = createSchema.parse(req.body);
    const portfolio = await portfolioService.create(user.id, name);
    res.status(201).json({ portfolio });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create portfolio.' });
  }
};

export const renamePortfolio = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    const { name } = renameSchema.parse(req.body);
    const portfolio = await portfolioService.rename(user.id, req.params.id, name);
    res.json({ portfolio });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not rename portfolio.' });
  }
};

export const deletePortfolio = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    await portfolioService.remove(user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not delete portfolio.' });
  }
};

export const setPortfolioItems = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    const { items } = itemsSchema.parse(req.body);
    const portfolio = await portfolioService.setItems(user.id, req.params.id, items);
    res.json({ portfolio });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? 'Invalid request.' });
      return;
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not save items.' });
  }
};

export const scorePortfolio = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    const result = await portfolioService.score(user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not score portfolio.' });
  }
};

// Portfolio-level risk: pull each holding's price history, build the
// portfolio equity curve weighted by each item's weight, then run
// the same risk-metric pipeline single tickers use. Gives the user
// VaR / Sharpe / Sortino / max-drawdown numbers grounded in their
// actual basket weights.
export const portfolioRisk = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    const portfolio = await portfolioService.getOne(user.id, req.params.id);
    if (!portfolio) {
      res.status(404).json({ error: 'Portfolio not found.' });
      return;
    }
    if (portfolio.items.length === 0) {
      res.status(400).json({ error: 'Portfolio has no holdings yet.' });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engine: any = await import('../signals/engine.js');
    const { computeRiskMetrics } = await import('../lib/risk-metrics');

    // Fetch each ticker's bars in parallel — engine caches per
    // (ticker, years) so a portfolio with 7 holdings hits Yahoo at
    // most 7 times on a cold cache and 0 times when warm.
    const holdings = await Promise.all(
      portfolio.items.map(async (it) => {
        try {
          const bars = await engine.fetchYahooHistory(it.ticker, 3);
          return { ticker: it.ticker, weight: it.weight, bars: Array.isArray(bars) ? bars : [] };
        } catch {
          return { ticker: it.ticker, weight: it.weight, bars: [] };
        }
      }),
    );

    // Build the weighted equity curve. Normalise weights so they
    // sum to 1 (users tend to enter raw share counts; we'd rather
    // be forgiving than insist on percentages).
    const totalWeight = holdings.reduce((s, h) => s + h.weight, 0);
    if (totalWeight <= 0) {
      res.status(400).json({ error: 'Portfolio weights sum to zero.' });
      return;
    }
    const normWeights = holdings.map((h) => h.weight / totalWeight);

    // Align on common dates. Skip a ticker entirely if it has no
    // bars (delisted, illiquid). Re-normalise weights across the
    // survivors so the math stays honest.
    const alive = holdings
      .map((h, i) => ({ ...h, w: normWeights[i] }))
      .filter((h) => h.bars.length > 0);
    if (alive.length === 0) {
      res.status(400).json({ error: 'No price data available for any holding.' });
      return;
    }
    const aliveWeight = alive.reduce((s, h) => s + h.w, 0);
    for (const h of alive) h.w /= aliveWeight;

    // Common date axis = intersection of all surviving series.
    const dateSets = alive.map((h) => new Set(h.bars.map((b: { date: string }) => b.date)));
    const common = [...dateSets[0]].filter((d) => dateSets.every((s) => s.has(d))).sort();
    if (common.length < 30) {
      res.status(400).json({ error: 'Not enough overlapping history across holdings.' });
      return;
    }
    const closeMaps = alive.map(
      (h) => new Map(h.bars.map((b: { date: string; close: number }) => [b.date, b.close])),
    );

    // Synthetic equity curve indexed to 1.0 at the start. Each step
    // is the weighted simple-return of all holdings on that date.
    let equity = 1;
    const equityCurve = [{ date: common[0], close: equity }];
    for (let i = 1; i < common.length; i++) {
      const dToday = common[i];
      const dPrev = common[i - 1];
      let stepReturn = 0;
      for (let j = 0; j < alive.length; j++) {
        const today = closeMaps[j].get(dToday) ?? 0;
        const prev = closeMaps[j].get(dPrev) ?? 0;
        if (today > 0 && prev > 0) {
          stepReturn += alive[j].w * (today / prev - 1);
        }
      }
      equity *= 1 + stepReturn;
      equityCurve.push({ date: dToday, close: equity });
    }

    const metrics = computeRiskMetrics(equityCurve);
    res.json({
      portfolioId: portfolio.id,
      name: portfolio.name,
      holdings: alive.map((h) => ({ ticker: h.ticker, weight: h.w })),
      droppedHoldings: holdings
        .filter((h) => h.bars.length === 0)
        .map((h) => h.ticker),
      windowDays: common.length,
      metrics,
    });
  } catch (err) {
    console.error('[portfolio] risk', err);
    res.status(500).json({ error: 'Failed to compute portfolio risk.' });
  }
};

// Correlation matrix across every pair of holdings in the basket.
// Frontend renders this as a heatmap so the user can spot hidden
// concentration — "your 7 positions look diversified but they're
// all 0.9+ correlated to SPY".
export const portfolioCorrelations = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    const portfolio = await portfolioService.getOne(user.id, req.params.id);
    if (!portfolio) {
      res.status(404).json({ error: 'Portfolio not found.' });
      return;
    }
    if (portfolio.items.length < 2) {
      res.status(400).json({ error: 'Need at least 2 holdings to compute correlations.' });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engine: any = await import('../signals/engine.js');
    const { buildCorrelationMatrix } = await import('../lib/correlation');

    const series: Record<string, { date: string; close: number }[]> = {};
    await Promise.all(
      portfolio.items.map(async (it) => {
        try {
          const bars = await engine.fetchYahooHistory(it.ticker, 1);
          if (Array.isArray(bars) && bars.length > 0) {
            series[it.ticker] = bars.map((b: { date: string; close: number }) => ({
              date: b.date,
              close: b.close,
            }));
          }
        } catch {
          /* skip */
        }
      }),
    );
    const result = buildCorrelationMatrix(series);
    res.json({
      portfolioId: portfolio.id,
      name: portfolio.name,
      windowYears: 1,
      ...result,
    });
  } catch (err) {
    console.error('[portfolio] correlations', err);
    res.status(500).json({ error: 'Failed to compute correlations.' });
  }
};
