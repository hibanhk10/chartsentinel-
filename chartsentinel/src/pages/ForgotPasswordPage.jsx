import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API_CONFIG } from '../config/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | sent | error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_CONFIG.baseURL}/auth/forgot-password`, {
        method: 'POST',
        headers: API_CONFIG.headers,
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      // Server always returns 200 whether or not the email is registered.
      // That's the whole point — never reveal which addresses are members.
      setStatus('sent');
    } catch (err) {
      console.error('Password reset request error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Try again.');
    }
  };

  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center px-6 py-32">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
      >
        <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
        <p className="text-white/60 text-sm mb-8">
          Enter your account email and we&apos;ll send you a link to pick a new
          password. The link expires in 1 hour.
        </p>

        {status === 'sent' ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-sm text-emerald-200">
              If an account exists for <strong>{email}</strong>, a reset link is
              on the way. Check your inbox (and the spam folder, just in case).
            </div>
            <Link
              to="/"
              className="block text-center text-sm text-white/70 hover:text-white transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm text-white/70 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
              {status === 'loading' ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="text-center text-sm text-white/50">
              Remembered it?{' '}
              <Link to="/?login=true" className="text-white hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </motion.div>
    </section>
  );
}
