import api from './api';

export const newsService = {
  async getAllNews() {
    return api.get('/news');
  },

  // Sentiment-scored variant of the same feed. Each article gains a
  // `sentiment` (-1 .. +1) and `sentimentLabel`. Aggregated mood is
  // returned alongside under `aggregate`. Slower than getAllNews on
  // the first call (LLM round-trip), cached server-side per URL hash
  // so subsequent calls are fast.
  async getNewsWithSentiment() {
    return api.get('/news/sentiment');
  },

  async getNewsById(id) {
    return api.get(`/news/${id}`);
  }
};
