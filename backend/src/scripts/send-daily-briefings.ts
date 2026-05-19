// Daily personalised briefing emails. Runs as a standalone script so
// it can be scheduled independently of the API. Designed for Railway
// cron, GitHub Actions, or plain crontab.
//
// Usage:
//   npx tsx src/scripts/send-daily-briefings.ts                  # dev
//   node dist/scripts/send-daily-briefings.js                    # prod
//
// Railway cron suggestion: "0 12 * * 1-5" (weekday mornings, 12:00 UTC
// — adjust for your target timezone).
//
// Design:
// - Loops every user with dailyBriefingEmail=true.
// - Calls composeBriefing() — the same composer the dashboard endpoint
//   uses — so the email and the in-app brief stay aligned.
// - On LLM provider failure we log and SKIP that user rather than
//   sending a half-built email; the next run will retry.
// - One-by-one delivery with a small inter-user delay so we don't
//   slam the LLM provider or Resend.

import '../instrument';
import prisma from '../config/db';
import { composeBriefing } from '../services/briefing.service';
import { sendDailyBriefingEmail } from '../services/email.service';

const PER_USER_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const users = await prisma.user.findMany({
    where: { dailyBriefingEmail: true },
    select: { id: true, email: true },
  });

  console.log(`[daily-briefing] ${users.length} user(s) opted in`);
  if (users.length === 0) return;

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      const composed = await composeBriefing(user.id);
      if (!composed) {
        console.warn(`[daily-briefing] LLM unavailable for ${user.email} — skip`);
        skipped++;
        continue;
      }
      await sendDailyBriefingEmail(user.email, {
        transcript: composed.transcript,
        watchlist: composed.sources.watchlist,
        upcomingEvents: composed.sources.upcomingEvents,
        topExposure: composed.sources.topExposure,
      });
      sent++;
      console.log(`[daily-briefing] sent to ${user.email}`);
    } catch (err) {
      failed++;
      console.error(
        `[daily-briefing] failed for ${user.email}:`,
        (err as Error).message,
      );
    }
    await sleep(PER_USER_DELAY_MS);
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `[daily-briefing] done in ${elapsed}s — sent=${sent} failed=${failed} skipped=${skipped}`,
  );
}

main()
  .catch((err) => {
    console.error('[daily-briefing] fatal', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
