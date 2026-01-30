const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const createApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};
