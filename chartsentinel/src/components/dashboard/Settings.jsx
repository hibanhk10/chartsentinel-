import { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import api from '../../services/api';

// Account settings — currently houses the 2FA setup / disable flow. The
// component manages four UI states locally:
//
//   idle       — show the current 2FA status + the relevant primary action
//   setup      — a candidate secret has been minted; show QR + first-code form
//   backup     — setup confirmed, show the one-time backup codes
//   disabling  — confirm-with-password+code form
//
// The TOTP feature flag flows out of GET /api/auth/me (added below) so we
// don't have to teach AuthContext about it; the page just refetches after
// each successful state transition.

const Settings = () => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  // The transient state machine described above.
  const [mode, setMode] = useState('idle');
  const [setupData, setSetupData] = useState(null); // { otpauthUrl, qrDataUrl }
  const [setupCode, setSetupCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const refresh = async () => {
    try {
      const me = await api.get('/auth/me');
      setTwoFactorEnabled(!!me.totpEnabled);
    } catch {
      // /auth/me may not be wired in older deploys — fall back to the
      // cached user blob, which never knew about totpEnabled. Treats
      // missing data as "off", which is the safe display default.
      const cached = authService.getCurrentUser();
      setTwoFactorEnabled(!!(cached && cached.totpEnabled));
    } finally {
      setHydrating(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const startSetup = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await authService.beginTwoFactorSetup();
      setSetupData(data);
      setMode('setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { backupCodes: codes } = await authService.enableTwoFactor(setupCode.trim());
      setBackupCodes(codes);
      setMode('backup');
      setSetupCode('');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const finishBackup = () => {
    setBackupCodes([]);
    setSetupData(null);
    setMode('idle');
    setNotice('Two-factor is on. New sign-ins will ask for a code.');
  };

  const startDisable = () => {
    setError(null);
    setMode('disabling');
  };

  const confirmDisable = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authService.disableTwoFactor(disablePassword, disableCode.trim());
      setDisablePassword('');
      setDisableCode('');
      setMode('idle');
      setNotice('Two-factor is off.');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancelTransient = () => {
    setMode('idle');
    setError(null);
    setSetupCode('');
    setDisablePassword('');
    setDisableCode('');
  };

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setNotice('Backup codes copied.');
    } catch {
      setNotice('Copy failed — select and copy manually.');
    }
  };

  if (hydrating) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <span className="material-icons animate-spin text-3xl text-primary/60">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-2">Account settings</h1>
      <p className="text-sm text-text-secondary mb-8">
        Security and preferences for your ChartSentinel account.
      </p>

      <section className="rounded-2xl border border-white/5 bg-surface-dark p-6">
        <header className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="material-icons text-primary">verified_user</span>
              Two-factor authentication
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Adds a 6-digit code from your phone authenticator on top of your
              password. Strongly recommended.
            </p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
              twoFactorEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-text-muted border border-white/10'
            }`}
          >
            {twoFactorEnabled ? 'On' : 'Off'}
          </span>
        </header>

        {notice && (
          <div className="mb-4 text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 p-3 rounded-lg">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-4 text-sm bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-lg">
            {error}
          </div>
        )}

        {mode === 'idle' && !twoFactorEnabled && (
          <button
            onClick={startSetup}
            disabled={busy}
            className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {busy ? 'Preparing...' : 'Turn on two-factor'}
          </button>
        )}

        {mode === 'idle' && twoFactorEnabled && (
          <button
            onClick={startDisable}
            className="px-4 py-2 bg-red-500/15 text-red-200 border border-red-500/30 text-sm font-bold rounded-lg hover:bg-red-500/25 transition-colors"
          >
            Turn off two-factor
          </button>
        )}

        {mode === 'setup' && setupData && (
          <form onSubmit={confirmSetup} className="space-y-4">
            <p className="text-sm text-text-secondary">
              Scan this QR code with Google Authenticator, 1Password, Authy,
              or any TOTP-compatible app, then enter the 6-digit code it
              shows for ChartSentinel.
            </p>
            <div className="flex flex-col items-center gap-3 bg-white/5 p-4 rounded-lg">
              <img
                src={setupData.qrDataUrl}
                alt="Two-factor QR code"
                className="w-48 h-48 bg-white rounded-md"
              />
              <details className="w-full text-xs text-text-muted">
                <summary className="cursor-pointer hover:text-white">
                  Can't scan? Use the setup URI manually
                </summary>
                <code className="block mt-2 break-all bg-black/40 p-2 rounded text-text-secondary">
                  {setupData.otpauthUrl}
                </code>
              </details>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Code from the app
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                placeholder="123 456"
                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary tracking-widest text-center text-lg"
                required
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy || setupCode.length < 6}
                className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {busy ? 'Confirming...' : 'Confirm and turn on'}
              </button>
              <button
                type="button"
                onClick={cancelTransient}
                className="px-4 py-2 text-sm text-text-secondary hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {mode === 'backup' && backupCodes.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              <strong className="text-white">Save these backup codes now.</strong>{' '}
              Each one is a one-time bypass for the authenticator app. We
              don't store them in plain text — once you close this view, we
              can't show them again.
            </p>
            <div className="grid grid-cols-2 gap-2 bg-black/40 p-4 rounded-lg font-mono text-sm">
              {backupCodes.map((code) => (
                <div key={code} className="text-text-secondary tracking-wider">
                  {code}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyBackupCodes}
                className="flex-1 py-2 bg-white/10 text-white font-medium rounded-lg hover:bg-white/15 transition-colors"
              >
                <span className="material-icons text-sm align-middle mr-2">content_copy</span>
                Copy all
              </button>
              <button
                onClick={finishBackup}
                className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                I've saved them
              </button>
            </div>
          </div>
        )}

        {mode === 'disabling' && (
          <form onSubmit={confirmDisable} className="space-y-4">
            <p className="text-sm text-text-secondary">
              Enter your password and a current 6-digit code (or a backup
              code) to disable two-factor.
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary tracking-widest text-center text-lg"
                placeholder="123 456"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-500/90 transition-colors disabled:opacity-50"
              >
                {busy ? 'Disabling...' : 'Disable two-factor'}
              </button>
              <button
                type="button"
                onClick={cancelTransient}
                className="px-4 py-2 text-sm text-text-secondary hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

export default Settings;
