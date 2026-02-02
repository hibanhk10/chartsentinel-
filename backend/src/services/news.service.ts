import prisma from '../config/db';

export class NewsService {
  async getAllNews() {
    return prisma.news.findMany({
      orderBy: {
        publishedAt: 'desc',
      },
    });
  }

  async getNewsById(id: string) {
    const newsItem = await prisma.news.findUnique({
      where: { id },
    });

    if (!newsItem) {
      throw new Error('News item not found');
    }

    return newsItem;
  }
}
