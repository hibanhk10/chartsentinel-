import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API_CONFIG } from '../config/api';
import SEO from '../components/ui/SEO';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Token arrives in the URL — if it's missing we render the "broken link"
  // state instead of a form the user can't actually submit.
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirm) {
      setStatus('error');
      setErrorMessage("The two passwords don't match.");
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_CONFIG.baseURL}/auth/reset-password`, {
        method: 'POST',
        headers: API_CONFIG.headers,
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      setStatus('success');
      // Kick the user back to the login modal after a short beat so they
      // can see the success state.
      setTimeout(() => navigate('/?login=true'), 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Try again.');
    }
  };

  if (!token) {
    return (
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 py-32">
        <SEO title="Reset password" path="/reset-password" noindex />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center"
        >
          <h1 className="text-2xl font-bold mb-3">Reset link looks off</h1>
          <p className="text-white/60 text-sm mb-6">
            The token is missing from this URL. Reset links expire after 1 hour
            — if this one is old, you can request a fresh one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-5 py-2.5 bg-primary hover:bg-primary/90 rounded-lg font-medium transition-colors"
          >
            Request a new link
          </Link>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center px-6 py-32">
      <SEO title="Reset password" path="/reset-password" noindex />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
      >
        <h1 className="text-2xl font-bold mb-2">Pick a new password</h1>
        <p className="text-white/60 text-sm mb-8">
          Choose something you haven&apos;t used elsewhere. The link in your
          email is single-use and expires in 1 hour.
        </p>

        {status === 'success' ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-sm text-emerald-200">
              Password updated. Redirecting you to sign in…
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm text-white/70 mb-2">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm text-white/70 mb-2">
                Confirm new password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {status === 'loading' ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}
      </motion.div>
    </section>
  );
}
