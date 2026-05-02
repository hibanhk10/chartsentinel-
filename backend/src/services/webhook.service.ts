import crypto from 'crypto';
import prisma from '../config/db';

// HMAC-signed webhook delivery for watchlist alerts. Best-effort by
// design: a failing webhook never blocks email or Telegram delivery,
// and three consecutive failures auto-disable the URL until the user
// updates it. This keeps one flaky customer endpoint from slowing the
// cron job down for everyone else.

// Failures past this threshold flip webhookDisabledAt and stop further
// attempts until the user re-saves the URL (which resets the counter).
const FAILURE_THRESHOLD = 3;

// Keep the request bounded — webhooks are best-effort and we'd rather
// the cron job stay snappy than wait on a slow receiver.
const REQUEST_TIMEOUT_MS = 8_000;

export type WebhookPayload = {
  type: 'watchlist.alert';
  triggers: Array<{
    ticker: string;
    score: number;
    direction: 'above' | 'below';
    threshold: number;
  }>;
  sentAt: string;
};

function hmacSign(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

export const webhookService = {
  // Generate a fresh secret. Called once when the user first sets a
  // webhook URL; rotated when they explicitly do so.
  generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  // Validate a candidate URL before persisting. We require https:// in
  // production so secrets aren't sent over plaintext, and we bar private
  // hostnames so the cron worker can't be tricked into hitting internal
  // services. Loopback is allowed in non-prod for local testing.
  validateUrl(url: string): { ok: true } | { ok: false; reason: string } {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { ok: false, reason: 'Not a valid URL.' };
    }
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      return { ok: false, reason: 'Webhook URLs must use https:// in production.' };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, reason: 'Only http:// and https:// are accepted.' };
    }
    const host = parsed.hostname.toLowerCase();
    const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    const isPrivate =
      host.endsWith('.internal') ||
      host.endsWith('.local') ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    if (process.env.NODE_ENV === 'production' && (isLoopback || isPrivate)) {
      return { ok: false, reason: 'Webhook URL points to a private network.' };
    }
    return { ok: true };
  },

  // POST a JSON payload to the user's webhook URL with an HMAC-SHA256
  // signature. Returns true on 2xx, false otherwise — the caller updates
  // failureCount accordingly. Never throws to the caller.
  async deliver(userId: string, payload: WebhookPayload): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        webhookUrl: true,
        webhookSecret: true,
        webhookFailureCount: true,
        webhookDisabledAt: true,
      },
    });
    if (!user?.webhookUrl || !user?.webhookSecret) return false;
    if (user.webhookDisabledAt) return false;

    const body = JSON.stringify(payload);
    const signature = hmacSign(body, user.webhookSecret);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let ok = false;
    try {
      const resp = await fetch(user.webhookUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-ChartSentinel-Signature': signature,
          'X-ChartSentinel-Event': payload.type,
          'User-Agent': 'ChartSentinel-Webhook/1.0',
        },
        body,
      });
      ok = resp.ok;
    } catch {
      ok = false;
    } finally {
      clearTimeout(timer);
    }

    await this.recordOutcome(userId, ok);
    return ok;
  },

  // Bookkeeping after a delivery attempt. Success resets the counter;
  // failure increments it and disables the URL once we hit the threshold.
  async recordOutcome(userId: string, success: boolean): Promise<void> {
    if (success) {
      await prisma.user.update({
        where: { id: userId },
        data: { webhookFailureCount: 0 },
      });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { webhookFailureCount: true },
    });
    const next = (user?.webhookFailureCount ?? 0) + 1;
    await prisma.user.update({
      where: { id: userId },
      data: {
        webhookFailureCount: next,
        webhookDisabledAt: next >= FAILURE_THRESHOLD ? new Date() : null,
      },
    });
  },

  // Used by the unit tests + by the future "send a test event" UI.
  // Exposed because the signature format is part of the public contract.
  signBody(body: string, secret: string): string {
    return hmacSign(body, secret);
  },
};
