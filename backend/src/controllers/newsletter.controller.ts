import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

const subscribeSchema = z.object({
  email: z.string().email().max(320),
});

export const subscribeController = async (req: Request, res: Response): Promise<void> => {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid email',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  try {
    // Idempotent: if the address is already on the list, treat as success.
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsed.data.email.toLowerCase() },
      update: {},
      create: { email: parsed.data.email.toLowerCase() },
    });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[newsletter] subscribe', err);
    res.status(500).json({ error: 'Could not save subscription.' });
  }
};
