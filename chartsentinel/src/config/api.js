const isProduction = import.meta.env.PROD;
const VITE_API_URL = import.meta.env.VITE_API_URL;

if (isProduction && !VITE_API_URL) {
  console.warn('VITE_API_URL is not defined in production environment!');
}

const API_BASE_URL = VITE_API_URL || 'http://localhost:3000/api';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const createApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};
