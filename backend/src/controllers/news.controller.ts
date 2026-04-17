import { Request, Response } from 'express';
import { z } from 'zod';
import { NewsService } from '../services/news.service';

const newsService = new NewsService();

const idSchema = z.object({ id: z.string().min(1).max(50) });

const createNewsSchema = z.object({
  title: z.string().trim().min(3).max(200),
  content: z.string().trim().min(10).max(20_000),
});

export const getAllNewsController = async (_req: Request, res: Response): Promise<void> => {
  try {
    const news = await newsService.getAllNews();
    res.json(news);
  } catch (error) {
    console.error('[news] getAll', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getNewsByIdController = async (req: Request, res: Response): Promise<void> => {
  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid news id' });
    return;
  }
  try {
    const newsItem = await newsService.getNewsById(parsed.data.id);
    if (!newsItem) {
      res.status(404).json({ error: 'News item not found' });
      return;
    }
    res.json(newsItem);
  } catch (error) {
    console.error('[news] getById', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createNewsController = async (req: Request, res: Response): Promise<void> => {
  const parsed = createNewsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid news payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }
  try {
    const newsItem = await newsService.createNews(parsed.data);
    res.status(201).json(newsItem);
  } catch (error) {
    console.error('[news] create', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
