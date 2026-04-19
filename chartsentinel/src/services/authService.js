import api from './api';
import { clearStoredReferralCode, readStoredReferralCode } from '../lib/referral';

export const authService = {
  async register(userData) {
    // Attach the stored referral code (if any) to the register payload.
    // Done here rather than in every caller so sales-funnel, modal, and
    // any future signup paths all benefit without remembering to wire it.
    const referralCode = readStoredReferralCode();
    const payload = referralCode ? { ...userData, referralCode } : userData;

    const response = await api.post('/auth/register', payload);

    // Persist so the session survives a refresh or full-page nav.
    // Matches the behaviour of login() below.
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      // Attribution done; drop the cookie so a later signup on the same
      // browser can't re-use someone else's code.
      if (referralCode) clearStoredReferralCode();
    }

    return response;
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
