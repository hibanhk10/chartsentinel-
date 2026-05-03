import { Request, Response } from 'express';
import prisma from '../config/db';
import env from '../config/env';
import { telegramService } from '../services/telegram.service';
import { auditService, AUDIT_EVENTS, fingerprintFromRequest } from '../services/audit.service';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

// Two responsibilities here:
//   1. /api/telegram/link/start — auth'd. Mints a linking token and
//      returns the deep-link URL the user clicks to hit our bot's
//      /start handler with that token in the payload.
//   2. /api/telegram/webhook    — open. Telegram POSTs every update
//      from the bot to this endpoint (after we register the webhook
//      URL with Telegram). We only act on /start <token> messages —
//      everything else is acknowledged-and-ignored.

export const telegramLinkStartController = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return;
  }
  if (!telegramService.isConfigured() || !telegramService.botUsername()) {
    res.status(503).json({
      error: 'Telegram alerts are not enabled on this server. Reach out to support.',
    });
    return;
  }

  const token = await telegramService.generateLinkToken(req.user.id);
  res.json({
    botUsername: telegramService.botUsername(),
    deepLink: `https://t.me/${telegramService.botUsername()}?start=${token}`,
    expiresInSeconds: 600,
  });
};

// Authenticated unlink. Clears both telegramChatId and telegramUsername
// so the next watchlist run skips the Telegram path for this user.
export const telegramUnlinkController = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return;
  }
  await prisma.user.update({
    where: { id: req.user.id },
    data: { telegramChatId: null, telegramUsername: null },
  });
  const { ip, userAgent } = fingerprintFromRequest(req);
  auditService.record({
    event: AUDIT_EVENTS.TELEGRAM_UNLINKED,
    userId: req.user.id,
    ip,
    userAgent,
  });
  res.json({ ok: true });
};

// Telegram update payload. We only care about the message text and the
// from-user fields; everything else (entities, photo, location, etc.) is
// ignored. Typed loosely because the upstream schema is enormous.
interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id?: number | string };
    from?: { id?: number | string; username?: string };
  };
}

export const telegramWebhookController = async (req: Request, res: Response) => {
  // Match the secret header so a third party can't forge updates. The
  // header is set by Telegram when we register the webhook with the
  // matching secret_token; if we forgot to register it (or the env var
  // isn't set on this deploy) we fail closed.
  const provided = req.headers['x-telegram-bot-api-secret-token'];
  if (!env.TELEGRAM_WEBHOOK_SECRET || provided !== env.TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).json({ error: 'unauthorised' });
    return;
  }

  const update = (req.body ?? {}) as TelegramUpdate;
  const message = update.message;
  if (!message || !message.text || !message.chat?.id) {
    // No-op acknowledgement — Telegram retries on non-2xx, and we don't
    // want a parsing miss to spam our logs.
    res.json({ ok: true });
    return;
  }

  const text = message.text.trim();
  const chatId = String(message.chat.id);
  const username = message.from?.username ?? null;

  // Only /start <token> means anything to us. Telegram passes the token
  // as the rest of the line after /start when the user hits our deep link.
  const startMatch = text.match(/^\/start\s+(\S+)/);
  if (!startMatch) {
    // For a user typing /start cold (no token), reply with a hint.
    if (text === '/start') {
      await telegramService.sendMessage(
        chatId,
        'Hi! Open ChartSentinel → Settings → Telegram and tap "Connect" to link this chat to your account.'
      );
    }
    res.json({ ok: true });
    return;
  }

  const userId = await telegramService.consumeLinkToken(startMatch[1]);
  if (!userId) {
    await telegramService.sendMessage(
      chatId,
      'That linking link has expired. Open ChartSentinel → Settings and tap "Connect" again.'
    );
    res.json({ ok: true });
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { telegramChatId: chatId, telegramUsername: username },
  });

  const { ip, userAgent } = fingerprintFromRequest(req);
  auditService.record({
    event: AUDIT_EVENTS.TELEGRAM_LINKED,
    userId,
    ip,
    userAgent,
    metadata: { username },
  });

  await telegramService.sendMessage(
    chatId,
    'Linked. ChartSentinel will send watchlist alerts to this chat. You can disconnect from Settings any time.'
  );

  res.json({ ok: true });
};
