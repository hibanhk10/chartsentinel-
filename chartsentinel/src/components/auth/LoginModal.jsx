import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginModal = ({ isOpen, onClose, onSwitchToRegister }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, verifyTwoFactor, loading, error } = useAuth();

  // 2FA challenge state. When server responds with requires2fa, we hold
  // the challenge token in component state and switch the form into
  // code-entry mode. Stays in component state (not context) so it dies
  // with the modal — a half-completed login can't leak across pages.
  const [challengeToken, setChallengeToken] = useState(null);
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    try {
      const response = await login({ email, password });
      if (response.requires2fa) {
        setChallengeToken(response.challengeToken);
        return;
      }
      onClose();
      navigate('/dashboard');
    } catch {
      // Error is surfaced via the AuthContext error state
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLocalError(null);
    try {
      await verifyTwoFactor(challengeToken, code.trim());
      onClose();
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const cancelTwoFactor = () => {
    setChallengeToken(null);
    setCode('');
    setLocalError(null);
  };

  if (!isOpen) return null;

  const showError = localError || error;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background-dark text-white p-8 rounded-2xl max-w-md w-full mx-4 border border-white/10 relative">
        <h2 className="text-2xl font-bold mb-6">
          {challengeToken ? 'Two-factor code' : 'Login'}
        </h2>

        {showError && (
          <div className="bg-red-500 text-white p-3 rounded-lg mb-4">
            {showError}
          </div>
        )}

        {challengeToken ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-text-secondary">
              Open your authenticator app and enter the 6-digit code for
              ChartSentinel. You can also paste a backup code if you no
              longer have access to the app.
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">Code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary tracking-widest text-center text-lg"
                placeholder="123 456"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={cancelTwoFactor}
              className="w-full text-sm text-text-secondary hover:text-white"
            >
              Use a different account
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Password</label>
                <Link
                  to="/forgot-password"
                  onClick={onClose}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {!challengeToken && (
          <div className="mt-4 text-center">
            <p className="text-sm">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-primary hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <span className="material-icons">close</span>
        </button>
      </div>
    </div>
  );
};

export default LoginModal;
