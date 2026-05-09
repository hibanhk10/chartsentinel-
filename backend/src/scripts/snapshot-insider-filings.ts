// Insider filing snapshot job. Runs as a standalone script so it can be
// scheduled independently of the API. Designed for Railway cron, GitHub
// Actions, or plain crontab.
//
// Usage:
//   npx tsx src/scripts/snapshot-insider-filings.ts                # dev
//   node dist/scripts/snapshot-insider-filings.js                  # prod
//
// Suggested schedule: hourly during US market hours, e.g. "30 13-21 * * 1-5".
// SEC publishes Form 4s throughout the trading day, so polling once an
// hour catches new filings without spamming EDGAR (we throttle to 8 req/s
// per their guidance regardless).
//
// What it does:
//   1. Pulls the last ~80 EDGAR Atom entries and resolves each Form 4 XML.
//   2. Upserts every parsed trade into `insider_filings` keyed by formUrl.
//   3. Re-runs the cluster-buy detector over the last 30 days of stored
//      filings and inserts any new (ticker, latestDate) pairs into
//      `cluster_buy_events`.
//   4. Records a JobRun row so the admin status page can see when this
//      last completed — and what it found.

import '../instrument';
import prisma from '../config/db';
import { runInsiderSnapshot } from '../services/insider.service';

async function main() {
  const startedAt = new Date();
  console.log(`[insider-snapshot] starting at ${startedAt.toISOString()}`);
  let result: Awaited<ReturnType<typeof runInsiderSnapshot>> | null = null;
  let errorMessage: string | null = null;
  try {
    result = await runInsiderSnapshot();
    console.log(
      `[insider-snapshot] fetched=${result.filingsFetched} inserted=${result.filingsInserted}` +
        ` skipped=${result.filingsSkipped} clusters_detected=${result.clustersDetected}` +
        ` clusters_inserted=${result.clustersInserted}`,
    );
  } catch (err) {
    errorMessage = (err as Error).message;
    console.error('[insider-snapshot] failed', err);
  }

  const finishedAt = new Date();
  await prisma.jobRun.create({
    data: {
      name: 'insider-snapshot',
      status: errorMessage ? 'failure' : 'success',
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      message: errorMessage,
      metadata: result ? (result as unknown as object) : undefined,
    },
  });

  await prisma.$disconnect();
  if (errorMessage) process.exit(1);
}

main().catch(async (err) => {
  console.error('[insider-snapshot] fatal', err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
