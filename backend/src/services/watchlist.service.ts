import prisma from '../config/db';

export interface WatchlistInput {
  ticker: string;
  thresholdAbove?: number | null;
  thresholdBelow?: number | null;
}

export const watchlistService = {
  list(userId: string) {
    return prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  // upsert on (userId, ticker) — adding a ticker you already follow just
  // updates the thresholds instead of creating a duplicate row.
  upsert(userId: string, input: WatchlistInput) {
    return prisma.watchlistItem.upsert({
      where: { userId_ticker: { userId, ticker: input.ticker } },
      create: {
        userId,
        ticker: input.ticker,
        thresholdAbove: input.thresholdAbove ?? null,
        thresholdBelow: input.thresholdBelow ?? null,
      },
      update: {
        thresholdAbove: input.thresholdAbove ?? null,
        thresholdBelow: input.thresholdBelow ?? null,
      },
    });
  },

  async remove(userId: string, id: string) {
    // Scope by userId so a user can't delete someone else's watchlist item by
    // guessing the CUID.
    const result = await prisma.watchlistItem.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  },
};
