export class NewsService {
  async getAllNews() {
    return [
      {
        id: '1',
        title: 'Breaking: Market Hits Record High',
        content: 'Stock markets reached unprecedented levels today...',
        publishedAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Economic Policy Updates',
        content: 'New economic policies announced by government...',
        publishedAt: new Date().toISOString(),
      },
    ];
  }

  async getNewsById(id: string) {
    return {
      id,
      title: `News Article ${id}`,
      content: 'Full content for news article ' + id,
      publishedAt: new Date().toISOString(),
    };
  }
}
