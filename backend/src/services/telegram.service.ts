import crypto from 'crypto';
import env from '../config/env';
import prisma from '../config/db';

// Telegram Bot API client. Two responsibilities:
//   1. sendMessage(chatId, text) — outbound delivery for watchlist alerts
//   2. linking-token plumbing — short opaque ids the bot's /start handler
//      exchanges for a chatId attached to a real user
//
// Linking-token note: we used to mint a JWT here, but Telegram's deep-link
// /start parameter is capped at 64 chars [A-Za-z0-9_-] and a JWT both
// overflows the limit and contains '.' separators that get silently
// dropped. The bot then receives /start with no payload, no user
// attribution, and no link ever happens. The fix is a 24-char random
// id stored in TelegramLinkToken (10-min TTL, single-use).
//
// All outbound work is best-effort: the bot may be unconfigured, the
// network may be flaky, or Telegram may rate-limit. Callers that depend
// on delivery (the watchlist script) should fall back to email; callers
// that don't (audit-style notifications) can ignore the result.

const API_BASE = 'https://api.telegram.org';
const LINK_TOKEN_TTL_MS = 10 * 60 * 1000;

export const telegramService = {
  /** True iff the bot has been configured. Used by the linking endpoint
   *  to short-circuit with a clear error rather than minting a token the
   *  bot can never honour. */
  isConfigured(): boolean {
    return Boolean(env.TELEGRAM_BOT_TOKEN);
  },

  botUsername(): string | null {
    return env.TELEGRAM_BOT_USERNAME ?? null;
  },

  /** Mint a one-time linking token. Persists it server-side keyed to the
   *  requesting user id; the bot's /start handler swaps the token for the
   *  user id via consumeLinkToken below. 24 hex chars (96 bits) is way
   *  inside Telegram's 64-char start-param limit, easily fits the
   *  [A-Za-z0-9_-] alphabet, and is well past the brute-force threshold
   *  for a 10-minute TTL. */
  async generateLinkToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(12).toString('hex');
    const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);
    await prisma.telegramLinkToken.create({
      data: { token, userId, expiresAt },
    });
    return token;
  },

  /** Look up + delete a linking token. Returns the owning user id or null
   *  if the token is missing, expired, or already consumed. We always
   *  delete on read so a leaked token can't be reused, and we sweep any
   *  expired rows we encounter for the requesting user as a side effect.
   *  Caller translates null into a user-facing "this link expired"
   *  message; we never throw because the bot handler treats every error
   *  uniformly. */
  async consumeLinkToken(token: string): Promise<string | null> {
    try {
      // deleteMany so a missing or already-consumed token returns count=0
      // instead of throwing; we do a separate findUnique first to know
      // whether the row was valid before delete swallows it.
      const row = await prisma.telegramLinkToken.findUnique({ where: { token } });
      if (!row) return null;
      await prisma.telegramLinkToken.delete({ where: { token } });
      if (row.expiresAt.getTime() < Date.now()) return null;

      // Lazy sweep: clean up any other expired tokens owned by the same
      // user. Cheap because it's at most a handful of rows per user, and
      // it keeps the table bounded without a separate cron.
      await prisma.telegramLinkToken
        .deleteMany({
          where: { userId: row.userId, expiresAt: { lt: new Date() } },
        })
        .catch(() => undefined);

      return row.userId;
    } catch (err) {
      console.error('[telegram] consumeLinkToken failed:', err);
      return null;
    }
  },

  /** Send a plain-text message. Returns true on success, false on any
   *  failure (bot unconfigured, network error, Telegram non-200). The
   *  caller decides whether a false return is fatal — for watchlist
   *  alerts it isn't, because email is the durable channel. */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!env.TELEGRAM_BOT_TOKEN) return false;
    try {
      const resp = await fetch(`${API_BASE}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          // HTML keeps the message readable when we include the ticker as a
          // <b> tag without us having to escape every Markdown special char
          // in user-supplied symbol names. We still escape angle brackets
          // in the body before passing it in.
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        console.error(`[telegram] sendMessage HTTP ${resp.status}:`, body);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[telegram] sendMessage failed:', err);
      return false;
    }
  },

  /** Escape the three characters Telegram's HTML mode treats specially.
   *  Use on any text that came from user input or external data before
   *  splicing into a sendMessage body. */
  escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};
