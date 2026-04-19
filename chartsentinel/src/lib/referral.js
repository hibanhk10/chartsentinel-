// Referral attribution. When a user arrives on the site with ?ref=CODE we
// capture it into localStorage — that way the attribution survives the user
// tabbing away, reading the site, and only signing up a day later. The
// RegisterModal / sales funnel read from here when submitting.

const STORAGE_KEY = 'chartsentinel:referralCode';
const PARAM_KEYS = ['ref', 'referral', 'referrer'];
// Ninety days is a standard affiliate-attribution window and covers the
// typical "I'll try it next week" gap between click and signup.
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export function captureReferralFromUrl() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  for (const key of PARAM_KEYS) {
    const value = params.get(key);
    if (value) {
      const code = value.trim().toUpperCase().slice(0, 32);
      if (code) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ code, capturedAt: Date.now() }),
        );
      }
      return;
    }
  }
}

export function readStoredReferralCode() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.code || !parsed?.capturedAt) return null;
    if (Date.now() - parsed.capturedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

export function clearStoredReferralCode() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
