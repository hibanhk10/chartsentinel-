import api from './api';

export const newsService = {
  async getAllNews() {
    return api.get('/news');
  },

  async getNewsById(id) {
    return api.get(`/news/${id}`);
  }
};
