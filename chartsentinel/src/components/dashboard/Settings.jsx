import { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import api from '../../services/api';
import { usePreferences } from '../../contexts/PreferencesContext';
import PlanGate from '../ui/PlanGate';
import CustomPinSettings from './CustomPinSettings';
import ApiKeysSettings from './ApiKeysSettings';
import ThemeToggle from '../ui/ThemeToggle';

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
  const { prefs, setDensity, setSound } = usePreferences();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState(null);
  const [hydrating, setHydrating] = useState(true);

  // The transient state machine described above.
  const [mode, setMode] = useState('idle');
  const [setupData, setSetupData] = useState(null); // { otpauthUrl, qrDataUrl }
  const [setupCode, setSetupCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  // Transient state for the Telegram section. linkData holds the deep-link
  // URL the server hands back; clearing it returns to the default view.
  const [telegramLinkData, setTelegramLinkData] = useState(null);

  // Webhook section state. Mirrors the GET /webhook response shape.
  // newSecret is set just-in-time after a successful save / rotate so we
  // can show the user the secret exactly once.
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [webhookDisabled, setWebhookDisabled] = useState(false);
  const [webhookFailures, setWebhookFailures] = useState(0);
  const [newWebhookSecret, setNewWebhookSecret] = useState(null);
  const [webhookInput, setWebhookInput] = useState('');

  // Daily AI briefing email opt-in. Default off; toggle hits
  // /auth/briefing-email and the cron script picks up the new state on
  // its next run.
  const [briefingEmailEnabled, setBriefingEmailEnabled] = useState(false);
  const [briefingEmailBusy, setBriefingEmailBusy] = useState(false);

  // Signal weights — sliders for the four composite components. Stored
  // raw on the server (e.g. 30/30/30/10) and normalised at scoring time,
  // so users see exactly the numbers they typed when they come back.
  const [signalWeights, setSignalWeights] = useState({
    seasonal: 30,
    cot: 25,
    pattern: 30,
    base: 15,
  });
  const [defaultWeights, setDefaultWeights] = useState({
    seasonal: 0.3,
    cot: 0.25,
    pattern: 0.3,
    base: 0.15,
  });
  const [weightsDirty, setWeightsDirty] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const refresh = async () => {
    try {
      const me = await api.get('/auth/me');
      setTwoFactorEnabled(!!me.totpEnabled);
      setTelegramLinked(!!me.telegramLinked);
      setTelegramUsername(me.telegramUsername ?? null);
      setWebhookConfigured(!!me.webhookConfigured);
      setWebhookDisabled(!!me.webhookDisabled);
      setBriefingEmailEnabled(!!me.dailyBriefingEmail);

      // Signal weights live on a separate endpoint — fetch alongside.
      try {
        const w = await api.get('/signals/me/weights');
        // Server returns normalised fractions; rescale to 0..100 for the
        // slider UI so users think in points, not decimals.
        const fromFractions = (obj) => ({
          seasonal: Math.round((obj?.seasonal ?? 0.3) * 100),
          cot: Math.round((obj?.cot ?? 0.25) * 100),
          pattern: Math.round((obj?.pattern ?? 0.3) * 100),
          base: Math.round((obj?.base ?? 0.15) * 100),
        });
        setSignalWeights(fromFractions(w.weights));
        setDefaultWeights(w.defaults || defaultWeights);
        setWeightsDirty(false);
      } catch {
        // Older deploy without the endpoint — keep local defaults.
      }

      // Webhook detail (URL + failureCount) lives on a separate endpoint
      // that requires auth. Fetch only when /me confirms one is set;
      // otherwise the columns stay at their defaults.
      if (me.webhookConfigured) {
        try {
          const w = await api.get('/webhook');
          setWebhookUrl(w.url || '');
          setWebhookFailures(w.failureCount || 0);
        } catch {
          // Silent: a hiccup here just leaves the URL blank in the
          // form. The user can re-enter and re-save.
        }
      } else {
        setWebhookUrl('');
        setWebhookFailures(0);
      }
    } catch {
      // /auth/me may not be wired in older deploys — fall back to the
      // cached user blob, which never knew about totpEnabled. Treats
      // missing data as "off", which is the safe display default.
      const cached = authService.getCurrentUser();
      setTwoFactorEnabled(!!(cached && cached.totpEnabled));
      setTelegramLinked(!!(cached && cached.telegramLinked));
      setTelegramUsername((cached && cached.telegramUsername) ?? null);
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

  const startTelegramLink = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await api.post('/telegram/link/start', {});
      setTelegramLinkData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Polls /auth/me for up to ~2 minutes after the user opens the deep link
  // so the linked-state UI flips on its own without the user needing to
  // refresh. The webhook handler on the backend is what actually sets the
  // chatId; this is just the frontend noticing.
  const refreshTelegramStatus = async () => {
    setBusy(true);
    setError(null);
    try {
      await refresh();
      if (telegramLinked) {
        setTelegramLinkData(null);
        setNotice('Telegram connected. Watchlist alerts will go there too.');
      }
    } finally {
      setBusy(false);
    }
  };

  const disconnectTelegram = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/telegram/unlink', {});
      await refresh();
      setNotice('Telegram disconnected.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveWebhook = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    setNewWebhookSecret(null);
    try {
      const resp = await api.post('/webhook', { url: webhookInput.trim() });
      setNewWebhookSecret(resp.secret);
      setWebhookInput('');
      await refresh();
      setNotice('Webhook saved. Copy the secret below — we won’t show it again.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const sendWebhookTest = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post('/webhook/test', {});
      setNotice('Test event delivered successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const updateWeight = (key, value) => {
    setSignalWeights((w) => ({ ...w, [key]: Number(value) }));
    setWeightsDirty(true);
  };

  const toggleBriefingEmail = async () => {
    const next = !briefingEmailEnabled;
    setBriefingEmailBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post('/auth/briefing-email', { enabled: next });
      setBriefingEmailEnabled(next);
      setNotice(next
        ? 'Daily briefing email turned on. First brief lands tomorrow morning.'
        : 'Daily briefing email turned off.');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not update.');
    } finally {
      setBriefingEmailBusy(false);
    }
  };

  const saveWeights = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // Server expects either fractions (0..1) or arbitrary positives that
      // it'll normalise. We send the raw slider values so the round-trip
      // is lossless — what the user typed comes back to them next visit.
      await api.post('/signals/me/weights', signalWeights);
      await refresh();
      setNotice('Signal mix saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resetWeights = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.delete('/signals/me/weights');
      await refresh();
      setNotice('Signal mix reset to defaults.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeWebhook = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.delete('/webhook');
      setNewWebhookSecret(null);
      await refresh();
      setNotice('Webhook removed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
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

      {/* Display preferences — density toggle. Stored in localStorage
          via PreferencesContext, applied to <html data-density> so any
          density-aware utility class can opt in without prop-drilling. */}
      <section className="rounded-2xl border border-white/5 bg-surface-dark p-6 mb-6">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="material-icons text-primary">view_compact</span>
            Display
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Tighten the layout when you want more on screen.
          </p>
        </header>
        <div className="flex gap-2">
          {[
            { id: 'comfortable', label: 'Comfortable', hint: 'Default' },
            { id: 'compact', label: 'Compact', hint: 'Power-user density' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setDensity(opt.id)}
              className={`flex-1 px-4 py-3 rounded-lg text-left text-sm transition-colors border ${
                prefs.density === opt.id
                  ? 'bg-primary/15 border-primary/40 text-white'
                  : 'bg-white/[0.03] border-white/10 text-text-secondary hover:bg-white/[0.05]'
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-widest mt-1">
                {opt.hint}
              </div>
            </button>
          ))}
        </div>

        {/* Theme switch — separate from density because the choice is
            stored in its own ThemeContext (data-theme attribute on
            <html>) rather than via PreferencesContext. Dark is the
            default; preference persists across sessions. */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-white">Theme</div>
            <div className="text-xs text-text-muted mt-0.5">
              Switch between dark and light surfaces.
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Sound toggle — opt-in audio cues for score changes and alert
            fires. Default off so the dashboard never makes a sound a
            user didn't ask for. The Web Audio API requires a user
            gesture before it'll play; the toggle button itself counts
            as that gesture, so a flip-on followed by an immediate test
            "tick" is reliable.  */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <div>
            <div className="text-sm text-white">Subtle sound cues</div>
            <div className="text-xs text-text-muted mt-0.5">
              Soft tick when scores update, chime on alert fire. Default off.
            </div>
          </div>
          <button
            onClick={async () => {
              const next = !prefs.sound;
              setSound(next);
              if (next) {
                // Lazy-import so the audio module isn't in every bundle.
                const { sound } = await import('../../lib/sound');
                sound.tick();
              }
            }}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              prefs.sound ? 'bg-primary' : 'bg-white/10'
            }`}
            aria-pressed={prefs.sound}
            aria-label="Toggle sound cues"
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                prefs.sound ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </section>

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

      <section className="mt-6 rounded-2xl border border-white/5 bg-surface-dark p-6">
        <header className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <span className="material-icons text-primary">mark_email_unread</span>
              Daily AI briefing email
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Weekday-morning email with your personalised 4-paragraph brief —
              watchlist scores, macro events this week, top exposure, and a risk
              nudge. Generated fresh each day.
            </p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
              briefingEmailEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-text-muted border border-white/10'
            }`}
          >
            {briefingEmailEnabled ? 'On' : 'Off'}
          </span>
        </header>
        <button
          type="button"
          onClick={toggleBriefingEmail}
          disabled={briefingEmailBusy}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors disabled:opacity-50 ${
            briefingEmailEnabled
              ? 'bg-white/5 border border-white/10 text-text-secondary hover:bg-white/10'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {briefingEmailBusy
            ? 'Saving…'
            : briefingEmailEnabled ? 'Turn off' : 'Turn on daily briefing'}
        </button>
      </section>

      <div className="mt-6">
      <PlanGate feature="custom-alerts-telegram" title="Telegram alerts are a Pro feature" description="Upgrade to Pro to receive watchlist alerts as Telegram messages on top of email.">
      <section className="rounded-2xl border border-white/5 bg-surface-dark p-6">
        <header className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="material-icons text-primary">send</span>
              Telegram alerts
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Get watchlist alerts as Telegram messages, on top of email.
              Faster and harder to miss on a phone.
            </p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
              telegramLinked
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-text-muted border border-white/10'
            }`}
          >
            {telegramLinked ? 'Linked' : 'Off'}
          </span>
        </header>

        {telegramLinked && (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Linked
              {telegramUsername ? (
                <> as <span className="font-mono text-white">@{telegramUsername}</span></>
              ) : null}
              . You can disconnect at any time — email alerts will keep
              working.
            </p>
            <button
              onClick={disconnectTelegram}
              disabled={busy}
              className="px-4 py-2 bg-red-500/15 text-red-200 border border-red-500/30 text-sm font-bold rounded-lg hover:bg-red-500/25 transition-colors disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Disconnect Telegram'}
            </button>
          </div>
        )}

        {!telegramLinked && !telegramLinkData && (
          <button
            onClick={startTelegramLink}
            disabled={busy}
            className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {busy ? 'Preparing…' : 'Connect Telegram'}
          </button>
        )}

        {!telegramLinked && telegramLinkData && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Open the link below — Telegram will start a chat with{' '}
              <span className="font-mono text-white">@{telegramLinkData.botUsername}</span>{' '}
              and we'll attach this account to that chat. The link expires
              in 10 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={telegramLinkData.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Open Telegram
              </a>
              <button
                onClick={refreshTelegramStatus}
                disabled={busy}
                className="px-4 py-2 bg-white/10 text-white font-medium rounded-lg hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                {busy ? 'Checking…' : "I've finished — check"}
              </button>
              <button
                onClick={() => setTelegramLinkData(null)}
                className="px-4 py-2 text-sm text-text-secondary hover:text-white"
              >
                Cancel
              </button>
            </div>
            <details className="text-xs text-text-muted">
              <summary className="cursor-pointer hover:text-white">
                Can't open Telegram? Use this URL manually
              </summary>
              <code className="block mt-2 break-all bg-black/40 p-2 rounded text-text-secondary">
                {telegramLinkData.deepLink}
              </code>
            </details>
          </div>
        )}
      </section>
      </PlanGate>
      </div>

      <div className="mt-6">
      <PlanGate feature="custom-alerts-webhook" title="Webhook delivery is a Pro feature" description="Upgrade to Pro to POST signed alert payloads to your own webhook for downstream automation.">
      <section className="rounded-2xl border border-white/5 bg-surface-dark p-6">
        <header className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="material-icons text-primary">webhook</span>
              Webhook alerts
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              POST watchlist alerts to your own endpoint. Each request carries an
              <code className="text-xs text-white bg-black/40 mx-1 px-1 rounded">X-ChartSentinel-Signature</code>
              HMAC-SHA256 header so you can verify the body wasn&apos;t forged.
            </p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
              webhookDisabled
                ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                : webhookConfigured
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/5 text-text-muted border border-white/10'
            }`}
          >
            {webhookDisabled ? 'Disabled' : webhookConfigured ? 'Active' : 'Off'}
          </span>
        </header>

        {webhookDisabled && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-200 mb-4">
            Auto-disabled after {webhookFailures} consecutive failures. Update
            the URL below to re-enable.
          </div>
        )}

        {webhookConfigured && webhookUrl && (
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 mb-4 text-sm">
            <div className="text-text-muted text-xs mb-1">Currently delivering to</div>
            <code className="text-white break-all">{webhookUrl}</code>
            {webhookFailures > 0 && !webhookDisabled && (
              <div className="text-amber-300 text-xs mt-2">
                {webhookFailures} recent failure{webhookFailures === 1 ? '' : 's'}.
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              Endpoint URL
            </label>
            <input
              type="url"
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              placeholder={webhookConfigured ? 'Paste a new URL to rotate' : 'https://example.com/hooks/chartsentinel'}
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-white/30"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveWebhook}
              disabled={busy || !webhookInput.trim()}
              className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {busy ? 'Saving…' : webhookConfigured ? 'Rotate URL & secret' : 'Save webhook'}
            </button>
            {webhookConfigured && !webhookDisabled && (
              <button
                onClick={sendWebhookTest}
                disabled={busy}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                Send test event
              </button>
            )}
            {webhookConfigured && (
              <button
                onClick={removeWebhook}
                disabled={busy}
                className="px-4 py-2 bg-red-500/15 text-red-200 border border-red-500/30 text-sm font-bold rounded-lg hover:bg-red-500/25 transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {newWebhookSecret && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-2">
              Save this secret now
            </div>
            <code className="block bg-black/40 text-white text-xs break-all p-2 rounded">
              {newWebhookSecret}
            </code>
            <p className="text-xs text-amber-200 mt-2">
              Use it as the HMAC-SHA256 key to verify each request body
              against the
              <code className="text-white bg-black/40 mx-1 px-1 rounded">X-ChartSentinel-Signature</code>
              header. We won&apos;t show this secret again — rotate the URL to
              get a new one.
            </p>
          </div>
        )}
      </section>
      </PlanGate>
      </div>

      <div className="mt-6">
      <PlanGate feature="custom-signal-weights" title="Custom signal weights are an Ultimate feature" description="Upgrade to Ultimate to tune how much each component contributes to your composite score.">
      <section className="rounded-2xl border border-white/5 bg-surface-dark p-6">
        <header className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="material-icons text-primary">tune</span>
              Signal mix
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Tune how much each component contributes to your composite
              score. Numbers are rescaled at scoring time so they don&apos;t
              need to add to 100.
            </p>
          </div>
          {weightsDirty && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Unsaved
            </span>
          )}
        </header>

        <div className="space-y-4">
          {[
            { key: 'seasonal', label: 'Seasonality', hint: 'Where we are in the historical seasonal pattern' },
            { key: 'cot', label: 'COT positioning', hint: 'How institutional traders are positioned (forex)' },
            { key: 'pattern', label: 'Pattern matching', hint: 'Similar historical price patterns and forward returns' },
            { key: 'base', label: 'Macro / base', hint: 'Background factor that smooths the blend' },
          ].map(({ key, label, hint }) => (
            <div key={key}>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor={`sw-${key}`} className="text-sm text-white">
                  {label}
                  <span className="text-text-muted text-xs ml-2">
                    default {Math.round((defaultWeights[key] ?? 0) * 100)}
                  </span>
                </label>
                <span className="font-mono text-white text-sm">
                  {signalWeights[key]}
                </span>
              </div>
              <input
                id={`sw-${key}`}
                type="range"
                min="0"
                max="100"
                step="5"
                value={signalWeights[key]}
                onChange={(e) => updateWeight(key, e.target.value)}
                className="w-full accent-primary"
              />
              <p className="text-[11px] text-text-muted mt-1">{hint}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <button
            onClick={saveWeights}
            disabled={busy || !weightsDirty}
            className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save mix'}
          </button>
          <button
            onClick={resetWeights}
            disabled={busy}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </section>
      </PlanGate>
      </div>

      <div className="mt-6">
      <PlanGate
        feature="api-access"
        title="Programmatic API access is an Ultimate feature"
        description="Mint API keys and hit /api/v1 endpoints directly from your own bots, CI, or dashboards. Rate-limited at 600 req / 5 min per key."
      >
      <section className="rounded-2xl border border-white/5 bg-surface-dark p-6">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="material-icons text-primary">vpn_key</span>
            API access
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Mint programmatic keys for /api/v1 access. Each key is shown exactly once at
            creation — copy it before navigating away.
          </p>
        </header>
        <ApiKeysSettings />
      </section>
      </PlanGate>
      </div>

      <div className="mt-6">
      <PlanGate
        feature="globe-custom-pin"
        title="Custom globe pin is a Pro feature"
        description="Pin a city + keyword onto the Global Intelligence Globe so your own region of interest glows the moment a live wire mentions it."
      >
      <section className="rounded-2xl border border-white/5 bg-surface-dark p-6">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="material-icons text-primary">push_pin</span>
            Custom globe pin
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Pin a city + keyword onto the Global Intelligence Globe. Your pin shows up alongside
            the canned hotspots and lights up whenever a live wire mentions it.
          </p>
        </header>
        <CustomPinSettings />
      </section>
      </PlanGate>
      </div>
    </div>
  );
};

export default Settings;
