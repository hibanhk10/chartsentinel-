const isProduction = import.meta.env.PROD;
const VITE_API_URL = import.meta.env.VITE_API_URL;

if (isProduction && !VITE_API_URL) {
  // Fail loudly at module load instead of silently pointing every fetch at
  // localhost in a production bundle (every API call would look like a CORS
  // / network error to users).
  throw new Error(
    'VITE_API_URL is not defined in the production build — set it in your hosting provider before redeploying.'
  );
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
