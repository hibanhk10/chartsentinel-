import api from './api';

export const authService = {
  async register(userData) {
    return api.post('/auth/register', userData);
  },

  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    
    // Store token in localStorage
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken() {
    return localStorage.getItem('authToken');
  },

  isAuthenticated() {
    return !!this.getToken();
  }
};
