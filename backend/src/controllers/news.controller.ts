import { Request, Response } from 'express';
import { z } from 'zod';
import { NewsService } from '../services/news.service';

const newsService = new NewsService();

const idSchema = z.object({ id: z.string().min(1).max(50) });

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
