import { Request } from 'express';
import prisma from '../config/db';

// Stable string identifiers for the events we record. Defined here so a
// typo in one call site doesn't silently fragment the history into two
// near-identical event names. Add new events here when wiring new call
// sites — never inline string literals at the record() callers.
export const AUDIT_EVENTS = {
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGIN_2FA_REQUIRED: 'auth.login.2fa_required',
  LOGIN_2FA_SUCCESS: 'auth.login.2fa_success',
  LOGIN_2FA_FAILURE: 'auth.login.2fa_failure',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset_requested',
  PASSWORD_RESET_COMPLETED: 'auth.password.reset_completed',
  TOTP_SETUP_STARTED: 'auth.totp.setup_started',
  TOTP_ENABLED: 'auth.totp.enabled',
  TOTP_DISABLED: 'auth.totp.disabled',
  TOTP_BACKUP_REDEEMED: 'auth.totp.backup_redeemed',
  REGISTER: 'auth.register',
  TELEGRAM_LINKED: 'auth.telegram.linked',
  TELEGRAM_UNLINKED: 'auth.telegram.unlinked',
} as const;

export type AuditEvent = (typeof AUDIT_EVENTS)[keyof typeof AUDIT_EVENTS];

interface RecordInput {
  event: AuditEvent;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Pulls the request fingerprint we record on every event. Trusts
 *  X-Forwarded-For only when express has been told to trust a proxy
 *  (set('trust proxy')) — otherwise req.ip already returns the socket IP
 *  and we use that. */
export function fingerprintFromRequest(req: Request): { ip: string | null; userAgent: string | null } {
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || null;
  const userAgent = (req.headers['user-agent'] as string | undefined) || null;
  return { ip, userAgent };
}

export const auditService = {
  /** Append a single event. Writes are best-effort: if the audit table is
   *  briefly unavailable, the parent operation (e.g. login) must still
   *  succeed. We log the failure but don't propagate it — losing one row
   *  in a forensic log is better than locking users out because the audit
   *  table is degraded. */
  async record({ event, userId, ip, userAgent, metadata }: RecordInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          event,
          userId: userId ?? null,
          ip: ip ?? null,
          userAgent: userAgent ?? null,
          // Prisma's Json type accepts undefined to mean "no value" — so
          // null and undefined produce the same row state.
          metadata: metadata == null ? undefined : (metadata as object),
        },
      });
    } catch (err) {
      console.error('[audit] write failed:', err);
    }
  },

  /** Paginated read for the admin viewer. Default sort is newest-first
   *  because that's what an oncall reviewer always wants. */
  async list(opts: { page?: number; limit?: number; event?: string; userId?: string } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (opts.event) where.event = opts.event;
    if (opts.userId) where.userId = opts.userId;

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      rows,
      page,
      limit,
      total,
      hasMore: skip + rows.length < total,
    };
  },
};
