// Watchlist alert evaluator. Runs as a standalone script so it can be
// scheduled independently of the API. Designed for Railway cron, GitHub
// Actions, or plain crontab.
//
// Usage:
//   npx tsx src/scripts/check-watchlist-alerts.ts                # dev
//   node dist/scripts/check-watchlist-alerts.js                  # prod
//
// Railway cron suggestion: "*/30 * * * *" (every 30 min during market hours).
//
// Design:
// - Reads every WatchlistItem, groups by ticker so we only compute a
//   composite score once per ticker per run.
// - Emits an alert when the composite crosses a threshold in the right
//   direction (above crosses above from below; below crosses below from
//   above). We use the stored `lastScore` as the prior-run baseline, so a
//   score that stays above a threshold for multiple runs doesn't spam.
// - Per-user batching: if a user owns three tickers that all trip at once,
//   they get ONE email listing the three, not three separate emails.
// - Updates lastScore + lastNotifiedAt under all circumstances so the next
//   run has fresh baseline data.

import '../instrument';
import prisma from '../config/db';
import {
  sendWatchlistAlertEmail,
  type WatchlistAlertTrigger,
} from '../services/email.service';
import { computeCompositeScore } from '../routes/signals.routes';

type ScoredItem = {
  id: string;
  userId: string;
  ticker: string;
  newScore: number;
  priorScore: number | null;
  thresholdAbove: number | null;
  thresholdBelow: number | null;
};

function crossedThreshold(item: ScoredItem): WatchlistAlertTrigger | null {
  const { thresholdAbove, thresholdBelow, newScore, priorScore, ticker } = item;

  if (thresholdAbove != null) {
    const crossedUp =
      newScore >= thresholdAbove && (priorScore == null || priorScore < thresholdAbove);
    if (crossedUp) {
      return { ticker, score: newScore, direction: 'above', threshold: thresholdAbove };
    }
  }

  if (thresholdBelow != null) {
    const crossedDown =
      newScore <= thresholdBelow && (priorScore == null || priorScore > thresholdBelow);
    if (crossedDown) {
      return { ticker, score: newScore, direction: 'below', threshold: thresholdBelow };
    }
  }

  return null;
}

async function main() {
  const items = await prisma.watchlistItem.findMany({
    include: { user: { select: { email: true } } },
  });

  if (!items.length) {
    console.log('[watchlist] no items to evaluate.');
    return;
  }

  // Memoise per-ticker composite scores — several users often watch the
  // same ticker and the engine's own cache is per-process so a second lookup
  // round-trips to upstream again.
  const scoresByTicker = new Map<string, number | null>();

  async function scoreFor(ticker: string): Promise<number | null> {
    if (scoresByTicker.has(ticker)) return scoresByTicker.get(ticker) ?? null;
    try {
      const result = (await computeCompositeScore(ticker)) as {
        composite?: number;
      } | null;
      const value = result && typeof result.composite === 'number' ? result.composite : null;
      scoresByTicker.set(ticker, value);
      return value;
    } catch (err) {
      console.error(`[watchlist] score fetch failed for ${ticker}:`, err);
      scoresByTicker.set(ticker, null);
      return null;
    }
  }

  const triggersByUser = new Map<
    string,
    { email: string; triggers: WatchlistAlertTrigger[] }
  >();
  const now = new Date();

  for (const item of items) {
    const newScore = await scoreFor(item.ticker);
    if (newScore == null) continue;

    const scored: ScoredItem = {
      id: item.id,
      userId: item.userId,
      ticker: item.ticker,
      newScore,
      priorScore: item.lastScore,
      thresholdAbove: item.thresholdAbove,
      thresholdBelow: item.thresholdBelow,
    };

    const trigger = crossedThreshold(scored);
    if (trigger && item.user?.email) {
      const bucket = triggersByUser.get(item.userId) ?? {
        email: item.user.email,
        triggers: [],
      };
      bucket.triggers.push(trigger);
      triggersByUser.set(item.userId, bucket);
    }

    // Always refresh the stored score + timestamp, regardless of whether
    // we fired. This is what debounces future runs.
    await prisma.watchlistItem.update({
      where: { id: item.id },
      data: {
        lastScore: newScore,
        lastNotifiedAt: trigger ? now : item.lastNotifiedAt,
      },
    });
  }

  if (!triggersByUser.size) {
    console.log(`[watchlist] evaluated ${items.length} items — no triggers.`);
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const { email, triggers } of triggersByUser.values()) {
    try {
      await sendWatchlistAlertEmail(email, triggers);
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`[watchlist] email send failed for ${email}:`, err);
    }
  }

  console.log(
    `[watchlist] evaluated=${items.length} users_notified=${sent} failed=${failed}`,
  );
}

main()
  .catch((err) => {
    console.error('[watchlist] fatal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
