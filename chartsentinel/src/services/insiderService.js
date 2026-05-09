import api from './api';

export const insiderService = {
  async getTrades({ role = 'all', type = 'all' } = {}) {
    const params = new URLSearchParams();
    if (role !== 'all') params.set('role', role);
    if (type !== 'all') params.set('type', type);
    const qs = params.toString();
    return api.get(`/insider/trades${qs ? `?${qs}` : ''}`);
  },
  async getClusterBuys() {
    return api.get('/insider/clusters');
  },
  async getClusterHistory({ days = 30, limit = 50 } = {}) {
    const params = new URLSearchParams();
    if (days !== 30) params.set('days', String(days));
    if (limit !== 50) params.set('limit', String(limit));
    const qs = params.toString();
    return api.get(`/insider/clusters/history${qs ? `?${qs}` : ''}`);
  },
  async getClusterPerformance({ days = 90, limit = 30 } = {}) {
    const params = new URLSearchParams();
    if (days !== 90) params.set('days', String(days));
    if (limit !== 30) params.set('limit', String(limit));
    const qs = params.toString();
    return api.get(`/insider/clusters/performance${qs ? `?${qs}` : ''}`);
  },
  async getCongressTrades() {
    return api.get('/insider/congress');
  },
};
