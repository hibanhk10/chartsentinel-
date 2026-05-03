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
import { telegramService } from '../services/telegram.service';
import { webhookService } from '../services/webhook.service';
import { jobRunService, JOB_NAMES } from '../services/job-run.service';
import { computeScoreForTicker } from '../routes/signals.routes';

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

function formatTriggerLine(t: WatchlistAlertTrigger): string {
  // Plain-text variant used by both email subject lines and Telegram
  // bodies. Direction → arrow keeps it scannable on a phone notification.
  const arrow = t.direction === 'above' ? '▲' : '▼';
  return `${arrow} ${t.ticker} ${t.score >= 0 ? '+' : ''}${t.score} (crossed ${t.direction === 'above' ? '+' : ''}${t.threshold})`;
}

async function main() {
  return jobRunService.track(JOB_NAMES.WATCHLIST_CHECK, runWatchlistCheck);
}

async function runWatchlistCheck() {
  const items = await prisma.watchlistItem.findMany({
    include: {
      user: {
        select: { email: true, telegramChatId: true },
      },
    },
  });

  if (!items.length) {
    console.log('[watchlist] no items to evaluate.');
    return {
      message: 'no watchlist items',
      metadata: { evaluated: 0, triggered: 0 },
    };
  }

  // Memoise per-ticker composite scores — several users often watch the
  // same ticker and the engine's own cache is per-process so a second lookup
  // round-trips to upstream again.
  const scoresByTicker = new Map<string, number | null>();

  async function scoreFor(ticker: string): Promise<number | null> {
    if (scoresByTicker.has(ticker)) return scoresByTicker.get(ticker) ?? null;
    try {
      const result = await computeScoreForTicker(ticker);
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
    {
      userId: string;
      email: string;
      telegramChatId: string | null;
      triggers: WatchlistAlertTrigger[];
    }
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
        userId: item.userId,
        email: item.user.email,
        telegramChatId: item.user.telegramChatId ?? null,
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
    return {
      message: `evaluated ${items.length} items, no triggers`,
      metadata: { evaluated: items.length, triggered: 0 },
    };
  }

  let emailSent = 0;
  let emailFailed = 0;
  let telegramSent = 0;
  let telegramFailed = 0;
  let webhookSent = 0;
  let webhookFailed = 0;

  for (const { userId, email, telegramChatId, triggers } of triggersByUser.values()) {
    // Email is the durable channel — we attempt it for every user, even
    // if Telegram is also linked. A user who removes the bot from their
    // chat shouldn't silently miss alerts.
    try {
      await sendWatchlistAlertEmail(email, triggers);
      emailSent += 1;
    } catch (err) {
      emailFailed += 1;
      console.error(`[watchlist] email send failed for ${email}:`, err);
    }

    // Telegram is best-effort. The service short-circuits to false when
    // no bot token is configured, so this branch is a no-op in dev or on
    // deploys without the env var. On a real failure we already logged
    // the cause inside sendMessage().
    if (telegramChatId) {
      const lines = triggers.map(formatTriggerLine).join('\n');
      const ok = await telegramService.sendMessage(
        telegramChatId,
        `<b>ChartSentinel watchlist</b>\n${telegramService.escapeHtml(lines)}`
      );
      if (ok) telegramSent += 1;
      else telegramFailed += 1;
    }

    // Webhook is opt-in and HMAC-signed. Best-effort like Telegram —
    // a non-2xx response increments the user's failure counter inside
    // webhookService and auto-disables after three consecutive misses.
    const webhookOk = await webhookService.deliver(userId, {
      type: 'watchlist.alert',
      triggers: triggers.map((t) => ({
        ticker: t.ticker,
        score: t.score,
        direction: t.direction,
        threshold: t.threshold,
      })),
      sentAt: new Date().toISOString(),
    });
    if (webhookOk) webhookSent += 1;
    // The deliver() call returns false both when there's no URL configured
    // (silent no-op) and when delivery genuinely failed. We only count
    // genuine failures as failed — easiest signal: the user has a
    // configured URL. Skipped here to avoid an extra DB round-trip per
    // user; the in-service failureCount tracks real failures already.
  }

  console.log(
    `[watchlist] evaluated=${items.length} email_sent=${emailSent} email_failed=${emailFailed} telegram_sent=${telegramSent} telegram_failed=${telegramFailed} webhook_sent=${webhookSent} webhook_failed=${webhookFailed}`,
  );

  return {
    message: `${triggersByUser.size} users notified (${emailSent} email, ${telegramSent} telegram, ${webhookSent} webhook)`,
    metadata: {
      evaluated: items.length,
      triggered: triggersByUser.size,
      emailSent,
      emailFailed,
      telegramSent,
      telegramFailed,
      webhookSent,
      webhookFailed,
    },
  };
}

main()
  .catch((err) => {
    console.error('[watchlist] fatal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
