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
    return prisma.news.findUnique({
      where: { id },
    });
  }

  async createNews(data: { title: string; content: string }) {
    return prisma.news.create({ data });
  }
}
