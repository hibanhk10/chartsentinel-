import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { webhookService } from '../services/webhook.service';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

const setUrlSchema = z.object({
  url: z.string().trim().url('Provide a full URL including https://'),
});

// Set or rotate the user's webhook URL. Generates a fresh HMAC secret
// every time so a leaked secret has a one-step revocation path. Returns
// the secret in the response body — the only point in the lifecycle
// where the user can see it; we never echo it again.
export const setWebhookUrl = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return;
  }
  try {
    const { url } = setUrlSchema.parse(req.body);
    const valid = webhookService.validateUrl(url);
    if (!valid.ok) {
      res.status(400).json({ error: valid.reason });
      return;
    }
    const secret = webhookService.generateSecret();
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        webhookUrl: url,
        webhookSecret: secret,
        webhookFailureCount: 0,
        webhookDisabledAt: null,
      },
    });
    res.json({ url, secret });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0]?.message ?? 'Invalid request.' });
      return;
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Could not set webhook.' });
  }
};

// Tear down the webhook. Clears the URL, secret, and any backoff state.
export const removeWebhook = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return;
  }
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      webhookUrl: null,
      webhookSecret: null,
      webhookFailureCount: 0,
      webhookDisabledAt: null,
    },
  });
  res.json({ ok: true });
};

// Status read for the Settings page. Doesn't return the secret — only
// whether one is configured and whether the auto-disable kicked in.
export const getWebhookStatus = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      webhookUrl: true,
      webhookFailureCount: true,
      webhookDisabledAt: true,
    },
  });
  res.json({
    url: user?.webhookUrl ?? null,
    disabled: !!user?.webhookDisabledAt,
    failureCount: user?.webhookFailureCount ?? 0,
  });
};

// Fire a synthetic event so the user can verify their receiver. Same
// signed shape as a real alert, just with a single canned trigger.
export const sendTestWebhook = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return;
  }
  const ok = await webhookService.deliver(req.user.id, {
    type: 'watchlist.alert',
    triggers: [
      { ticker: 'TEST', score: 75, direction: 'above', threshold: 60 },
    ],
    sentAt: new Date().toISOString(),
  });
  if (ok) {
    res.json({ ok: true });
  } else {
    res.status(502).json({ error: 'Delivery failed. Check your endpoint and try again.' });
  }
};
