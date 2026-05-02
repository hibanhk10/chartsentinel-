import { Prisma } from '@prisma/client';
import prisma from '../config/db';

// Stable job names. Keep in sync with the script that records the run —
// adding a typo'd name silently fragments history into two rows.
export const JOB_NAMES = {
  WEEKLY_DIGEST: 'weekly-digest',
  WATCHLIST_CHECK: 'watchlist-check',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

type JobResult = {
  message?: string;
  metadata?: Prisma.InputJsonValue;
};

// Wraps an async job and inserts one row at completion. Either branch records
// — success carries whatever the job returned, failure carries the error
// message. Recording is best-effort: if the DB itself is the failure, we log
// loudly but never mask the original job error.
export const jobRunService = {
  async track<T extends JobResult | void>(name: JobName, fn: () => Promise<T>): Promise<T> {
    const startedAt = new Date();
    try {
      const result = await fn();
      const finishedAt = new Date();
      await safeRecord({
        name,
        status: 'success',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        message: result?.message ?? null,
        metadata: result?.metadata ?? null,
      });
      return result;
    } catch (err) {
      const finishedAt = new Date();
      await safeRecord({
        name,
        status: 'failure',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        message: err instanceof Error ? err.message : String(err),
        metadata: null,
      });
      throw err;
    }
  },

  // Latest run for each known job. Used by the admin dashboard for the
  // at-a-glance "what's healthy / what's stale" view.
  async latestPerJob() {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        status: string;
        startedAt: Date;
        finishedAt: Date;
        durationMs: number;
        message: string | null;
      }>
    >`
      SELECT DISTINCT ON ("name")
        "id", "name", "status", "startedAt", "finishedAt", "durationMs", "message"
      FROM job_runs
      ORDER BY "name", "startedAt" DESC
    `;
    return rows;
  },

  // Paginated history for the full-table view. Filter by job name when
  // present; otherwise show all jobs interleaved newest-first.
  async list({
    page,
    limit,
    name,
  }: {
    page: number;
    limit: number;
    name?: string;
  }) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const where = name ? { name } : {};
    const [rows, total] = await Promise.all([
      prisma.jobRun.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      prisma.jobRun.count({ where }),
    ]);

    return {
      rows,
      total,
      page: safePage,
      limit: safeLimit,
      hasMore: skip + rows.length < total,
    };
  },
};

async function safeRecord(data: {
  name: string;
  status: string;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  message: string | null;
  metadata: Prisma.InputJsonValue | null;
}) {
  try {
    // Prisma's nullable JSON columns refuse plain `null` — they want either
    // an InputJsonValue or the explicit Prisma.JsonNull sentinel. Splitting
    // the call lets the type narrow correctly in each branch.
    if (data.metadata == null) {
      const { metadata: _m, ...rest } = data;
      await prisma.jobRun.create({ data: { ...rest, metadata: Prisma.JsonNull } });
    } else {
      await prisma.jobRun.create({ data: { ...data, metadata: data.metadata } });
    }
  } catch (err) {
    // Don't let a failed audit row mask a successful job, or — worse —
    // turn a real job failure into an opaque "DB write failed" error.
    console.error('[job-run] failed to record run:', err);
  }
}
