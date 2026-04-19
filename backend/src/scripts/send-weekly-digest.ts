// Weekly digest job. Runs as a standalone script so it can be scheduled by
// Railway cron, GitHub Actions, or a plain OS crontab without booting the
// full Express server.
//
// Usage locally:
//   npx tsx src/scripts/send-weekly-digest.ts
//
// Usage in Railway (one-off cron service with the same image as the API):
//   cron: "0 14 * * 1"   (every Monday 14:00 UTC / 17:00 EAT)
//   cmd:  node dist/scripts/send-weekly-digest.js
//
// Design notes:
// - Idempotent: pulls content by "published in the last 7 days" window, so
//   re-running within the same week sends the same digest — that's fine for
//   the "catch-up" use case. If you want strict once-per-week semantics,
//   add a sent-log table in a later iteration.
// - Per-subscriber loop with small delay between sends so Resend's per-second
//   rate limits don't kick back a 429 under a big subscriber list.
// - Errors for a single recipient are logged and do not halt the batch.

import '../instrument';
import prisma from '../config/db';
import { sendWeeklyDigestEmail } from '../services/email.service';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const SEND_SPACING_MS = 100; // ~10 messages/second — well under Resend defaults

async function main() {
  const since = new Date(Date.now() - WINDOW_MS);

  const [reports, news, subscribers] = await Promise.all([
    prisma.report.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.news.findMany({
      where: { publishedAt: { gte: since } },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    }),
    prisma.newsletterSubscriber.findMany({
      select: { email: true },
    }),
  ]);

  if (!reports.length && !news.length) {
    console.log('[digest] nothing new in the last 7 days — skipping send.');
    return;
  }

  if (!subscribers.length) {
    console.log('[digest] no subscribers — skipping send.');
    return;
  }

  const items = {
    reports: reports.map((r) => ({
      title: r.title,
      summary: r.summary,
      url: `${APP_URL}/dashboard?tab=reports&id=${r.id}`,
      date: r.createdAt,
    })),
    news: news.map((n) => ({
      title: n.title,
      // News has no summary field — derive a preview from the first ~180
      // chars of content so subscribers get useful context in the digest.
      summary: n.content.replace(/<[^>]+>/g, '').slice(0, 180).trim(),
      url: `${APP_URL}/dashboard?tab=news&id=${n.id}`,
      date: n.publishedAt,
    })),
  };

  console.log(
    `[digest] sending to ${subscribers.length} subscribers — ` +
      `${items.reports.length} reports, ${items.news.length} news items.`,
  );

  let sent = 0;
  let failed = 0;

  for (const { email } of subscribers) {
    try {
      await sendWeeklyDigestEmail(email, items);
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`[digest] send failed for ${email}:`, err);
    }
    await new Promise((r) => setTimeout(r, SEND_SPACING_MS));
  }

  console.log(`[digest] done — sent=${sent} failed=${failed}`);
}

main()
  .catch((err) => {
    console.error('[digest] fatal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
