import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { createApiKey, listApiKeys, revokeApiKey } from '../services/api-key.service';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

const createSchema = z.object({
  label: z.string().trim().min(1).max(60),
});

// Plan tiers are persisted on the user record; we read it just-in-time
// rather than trusting the JWT payload so a plan-flip via /api/auth/plan
// is honored immediately.
async function requireUltimate(req: AuthedRequest, res: Response): Promise<boolean> {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return false;
  }
  const row = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { plan: true },
  });
  if (row?.plan !== 'ultimate') {
    res.status(403).json({
      error: 'API access requires the Ultimate plan.',
      code: 'PLAN_REQUIRED',
      requiredPlan: 'ultimate',
    });
    return false;
  }
  return true;
}

export const createApiKeyController = async (req: AuthedRequest, res: Response) => {
  if (!(await requireUltimate(req, res))) return;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid label.' });
    return;
  }
  try {
    const result = await createApiKey(req.user!.id, parsed.data.label);
    res.status(201).json({ key: result });
  } catch (err) {
    console.error('[api-key] create', err);
    res.status(500).json({ error: 'Could not mint key.' });
  }
};

export const listApiKeysController = async (req: AuthedRequest, res: Response) => {
  if (!(await requireUltimate(req, res))) return;
  try {
    const keys = await listApiKeys(req.user!.id);
    res.json({ keys });
  } catch (err) {
    console.error('[api-key] list', err);
    res.status(500).json({ error: 'Could not list keys.' });
  }
};

export const revokeApiKeyController = async (req: AuthedRequest, res: Response) => {
  if (!(await requireUltimate(req, res))) return;
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Key id required.' });
    return;
  }
  try {
    const ok = await revokeApiKey(req.user!.id, id);
    if (!ok) {
      res.status(404).json({ error: 'Key not found.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[api-key] revoke', err);
    res.status(500).json({ error: 'Could not revoke key.' });
  }
};
