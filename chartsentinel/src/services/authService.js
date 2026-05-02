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

    // Two response shapes possible:
    //   { user, token }                              — normal login
    //   { requires2fa: true, challengeToken }        — 2FA gate
    // Persist only on the first; the second is handled by verifyTwoFactor.
    if (response.token && response.user) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  },

  // Exchange a 2FA challenge token + 6-digit (or backup) code for a session
  // JWT. Persists on success the same way login() does so the rest of the
  // app sees a normal authenticated session afterwards.
  async verifyTwoFactor(challengeToken, code) {
    const response = await api.post('/auth/2fa/verify', { challengeToken, code });
    if (response.token && response.user) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  // Begin TOTP setup — returns the otpauth URI + a PNG data URL of the QR.
  // The server has already persisted the candidate secret; the user proves
  // possession by submitting a code via enableTwoFactor below.
  async beginTwoFactorSetup() {
    return api.post('/auth/2fa/setup', {});
  },

  // Confirm setup. Returns { backupCodes } — shown to the user exactly once.
  async enableTwoFactor(code) {
    return api.post('/auth/2fa/enable', { code });
  },

  // Tear down 2FA. Requires both a fresh password and a current TOTP code
  // (or a still-valid backup code) so neither stolen credential alone can
  // turn the second factor off.
  async disableTwoFactor(password, code) {
    return api.post('/auth/2fa/disable', { password, code });
  },

  // Finalise first-run onboarding. Server creates watchlist items for each
  // ticker and stamps users.onboardedAt so the wizard never fires again.
  async completeOnboarding(tickers, threshold) {
    return api.post('/auth/onboarding/complete', { tickers, threshold });
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
