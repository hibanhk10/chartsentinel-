import prisma from '../config/db';
import { computeScoreForTicker } from '../routes/signals.routes';
import { signalWeightsService } from './signal-weights.service';

// Portfolio aggregation: given a basket of (ticker, weight) holdings,
// compute a single weighted composite score across the basket. Sub-scores
// are evaluated against the user's saved signal-mix weights so the
// portfolio number lives on the same scale as the per-ticker scores
// they see elsewhere.
//
// Per-ticker scores are computed in parallel — the engine's own per-
// process cache absorbs duplicate ticker work across concurrent
// portfolios for the same user during the same minute.

export const portfolioService = {
  // Lists every portfolio the user owns with their items inlined. Used
  // by the dashboard list view; for the score view, the caller usually
  // wants getOne + score().
  async list(userId: string) {
    return prisma.portfolio.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { items: true },
    });
  },

  async getOne(userId: string, portfolioId: string) {
    return prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      include: { items: true },
    });
  },

  async create(userId: string, name: string) {
    return prisma.portfolio.create({
      data: { userId, name },
      include: { items: true },
    });
  },

  async rename(userId: string, portfolioId: string, name: string) {
    const owned = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      select: { id: true },
    });
    if (!owned) throw new Error('Portfolio not found.');
    return prisma.portfolio.update({
      where: { id: portfolioId },
      data: { name },
      include: { items: true },
    });
  },

  async remove(userId: string, portfolioId: string) {
    const owned = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      select: { id: true },
    });
    if (!owned) throw new Error('Portfolio not found.');
    await prisma.portfolio.delete({ where: { id: portfolioId } });
  },

  // Replaces the entire item set in a single transaction so the
  // (portfolioId, ticker) unique constraint can't trip on partially-
  // applied edits.
  async setItems(
    userId: string,
    portfolioId: string,
    items: Array<{ ticker: string; weight: number }>,
  ) {
    const owned = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      select: { id: true },
    });
    if (!owned) throw new Error('Portfolio not found.');

    await prisma.$transaction([
      prisma.portfolioItem.deleteMany({ where: { portfolioId } }),
      prisma.portfolioItem.createMany({
        data: items.map((it) => ({
          portfolioId,
          ticker: it.ticker.trim(),
          weight: it.weight,
        })),
      }),
    ]);

    return this.getOne(userId, portfolioId);
  },

  // Compute the basket-level composite. Returns the per-ticker results
  // alongside the aggregate so the UI can render both views without a
  // second round-trip.
  async score(userId: string, portfolioId: string) {
    const portfolio = await this.getOne(userId, portfolioId);
    if (!portfolio) throw new Error('Portfolio not found.');

    if (portfolio.items.length === 0) {
      return {
        portfolio,
        aggregate: { score: 0, signal: 'neutral', sampledItems: 0 },
        items: [],
      };
    }

    const userWeights = await signalWeightsService.forUser(userId);

    const scored = await Promise.all(
      portfolio.items.map(async (it) => {
        try {
          const result = await computeScoreForTicker(it.ticker, userWeights);
          return {
            ticker: it.ticker,
            weight: it.weight,
            score: result?.composite ?? null,
            signal: result?.signal ?? null,
            components: result?.components ?? null,
          };
        } catch {
          return { ticker: it.ticker, weight: it.weight, score: null, signal: null, components: null };
        }
      }),
    );

    // Aggregate weighted average of the items that scored. Skip nulls
    // (failed fetches) so one Yahoo hiccup doesn't drop the whole
    // portfolio score to zero.
    const sampled = scored.filter((s) => typeof s.score === 'number');
    const totalWeight = sampled.reduce((a, s) => a + s.weight, 0);
    let aggregateScore = 0;
    if (totalWeight > 0) {
      aggregateScore =
        sampled.reduce((a, s) => a + (s.score as number) * s.weight, 0) / totalWeight;
    }
    const rounded = Math.round(aggregateScore);

    let signal = 'neutral';
    if (rounded >= 60) signal = 'strong_buy';
    else if (rounded >= 25) signal = 'buy';
    else if (rounded <= -60) signal = 'strong_sell';
    else if (rounded <= -25) signal = 'sell';

    return {
      portfolio,
      aggregate: { score: rounded, signal, sampledItems: sampled.length },
      items: scored,
    };
  },
};
