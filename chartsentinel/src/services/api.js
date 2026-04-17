import { createApiUrl, API_CONFIG } from '../config/api';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
  }

  async request(endpoint, options = {}) {
    const url = createApiUrl(endpoint);
    const config = {
      headers: {
        ...API_CONFIG.headers,
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Backend shape varies — {error}, {message}, or zod {issues}.
        // Surface whichever is present so UI toasts can tell the user *why*.
        const body = await response.json().catch(() => ({}));
        const msg =
          body.error ||
          body.message ||
          (Array.isArray(body.issues) && body.issues.map((i) => i.message).join(', ')) ||
          `HTTP ${response.status}`;

        // If the server says our token is missing/invalid/expired, clear local
        // auth so the next render redirects to login instead of silently
        // reissuing the same bad request.
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }

        throw new Error(msg);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

export default new ApiService();
