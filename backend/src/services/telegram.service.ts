import jwt from 'jsonwebtoken';
import env from '../config/env';

// Telegram Bot API client. Two responsibilities:
//   1. sendMessage(chatId, text) — outbound delivery for watchlist alerts
//   2. linking-token plumbing — short-lived JWTs that the bot's /start
//      handler exchanges for a chatId attached to a real user
//
// All outbound work is best-effort: the bot may be unconfigured, the
// network may be flaky, or Telegram may rate-limit. Callers that depend
// on delivery (the watchlist script) should fall back to email; callers
// that don't (audit-style notifications) can ignore the result.

const API_BASE = 'https://api.telegram.org';
const LINK_TOKEN_TTL = '10m';

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

  /** Sign a one-time token that proves "this user wants to link a chat".
   *  Carries `purpose: 'telegram-link'` so it can never be used as a
   *  session token; the auth middleware already rejects anything with a
   *  non-session purpose claim, and the linking handler verifies the
   *  string explicitly. 10-minute TTL is plenty for the user to tap a
   *  deep link and hit /start. */
  generateLinkToken(userId: string): string {
    return jwt.sign(
      { id: userId, purpose: 'telegram-link' },
      env.JWT_SECRET,
      { expiresIn: LINK_TOKEN_TTL }
    );
  },

  /** Verify and decode a linking token. Returns the user id or null —
   *  callers translate null into a user-facing "this link expired"
   *  message. We never throw because the bot handler treats every error
   *  uniformly. */
  verifyLinkToken(token: string): string | null {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as {
        id?: string;
        purpose?: string;
      };
      if (payload.purpose !== 'telegram-link' || !payload.id) return null;
      return payload.id;
    } catch {
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
