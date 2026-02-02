import { Request, Response } from 'express';
import { NewsService } from '../services/news.service';

const newsService = new NewsService();

export const getAllNewsController = async (_req: Request, res: Response) => {
  try {
    const news = await newsService.getAllNews();
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getNewsByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newsItem = await newsService.getNewsById(id);
    res.json(newsItem);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
