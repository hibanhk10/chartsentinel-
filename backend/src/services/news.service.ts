import prisma from '../config/db';
import { fetchLiveNews, findLiveArticleById, type NewsArticle } from './news-feed.service';

// Public surface returns live RSS aggregations; the DB-backed `Prisma News`
// model is reserved for the admin-curated `createNews` path. Mixing them
// would mean re-publishing curated copy alongside an ever-changing wire
// feed, so they stay separate: live for visitors, curated for ops.
export class NewsService {
  async getAllNews(): Promise<NewsArticle[]> {
    return fetchLiveNews();
  }

  async getNewsById(id: string): Promise<NewsArticle | null> {
    return findLiveArticleById(id);
  }

  async createNews(data: { title: string; content: string }) {
    return prisma.news.create({ data });
  }
}
