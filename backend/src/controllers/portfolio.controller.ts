import { Request, Response } from 'express';
import { z } from 'zod';
import { portfolioService } from '../services/portfolio.service';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

const renameSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

const itemsSchema = z.object({
  items: z
    .array(
      z.object({
        ticker: z.string().trim().min(1).max(20),
        weight: z.number().positive().finite(),
      }),
    )
    .max(50),
});

function requireUser(req: AuthedRequest, res: Response): { id: string } | null {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in first.' });
    return null;
  }
  return req.user;
}

export const listPortfolios = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  const list = await portfolioService.list(user.id);
  res.json({ portfolios: list });
};

export const createPortfolio = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    const { name } = createSchema.parse(req.body);
    const portfolio = await portfolioService.create(user.id, name);
    res.status(201).json({ portfolio });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create portfolio.' });
  }
};

export const renamePortfolio = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    const { name } = renameSchema.parse(req.body);
    const portfolio = await portfolioService.rename(user.id, req.params.id, name);
    res.json({ portfolio });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not rename portfolio.' });
  }
};

export const deletePortfolio = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    await portfolioService.remove(user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not delete portfolio.' });
  }
};

export const setPortfolioItems = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    const { items } = itemsSchema.parse(req.body);
    const portfolio = await portfolioService.setItems(user.id, req.params.id, items);
    res.json({ portfolio });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? 'Invalid request.' });
      return;
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not save items.' });
  }
};

export const scorePortfolio = async (req: AuthedRequest, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    const result = await portfolioService.score(user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not score portfolio.' });
  }
};
