import api from './api';

export const reportsService = {
  async getAllReports() {
    return api.get('/reports');
  },

  async getReportById(id) {
    return api.get(`/reports/${id}`);
  }
};
