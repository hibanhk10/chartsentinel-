import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import api from '../services/api';
import SEO from '../components/ui/SEO';

// First-run wizard. Three steps:
//   1. Pick tickers (1-10) from a curated grid
//   2. Pick a composite-score threshold band
//   3. Confirm + submit
//
// On success the server sets users.onboardedAt; this page then routes the
// user into the dashboard. The DashboardPage useEffect re-checks the flag
// so a user who lands here directly (manual /onboarding) but has already
// finished gets bounced straight back.

const TICKER_OPTIONS = [
  { ticker: 'BTC-USD',    label: 'Bitcoin',         category: 'Crypto', icon: 'currency_bitcoin' },
  { ticker: 'ETH-USD',    label: 'Ethereum',        category: 'Crypto', icon: 'token' },
  { ticker: 'SOL-USD',    label: 'Solana',          category: 'Crypto', icon: 'auto_awesome' },
  { ticker: 'EURUSD=X',   label: 'EUR / USD',       category: 'Forex',  icon: 'euro' },
  { ticker: 'GBPUSD=X',   label: 'GBP / USD',       category: 'Forex',  icon: 'currency_pound' },
  { ticker: 'USDJPY=X',   label: 'USD / JPY',       category: 'Forex',  icon: 'currency_yen' },
  { ticker: 'SPY',        label: 'S&P 500 (SPY)',   category: 'Index',  icon: 'show_chart' },
  { ticker: 'QQQ',        label: 'Nasdaq 100 (QQQ)', category: 'Index', icon: 'trending_up' },
  { ticker: 'AAPL',       label: 'Apple',           category: 'Stocks', icon: 'apple' },
  { ticker: 'MSFT',       label: 'Microsoft',       category: 'Stocks', icon: 'computer' },
  { ticker: 'NVDA',       label: 'Nvidia',          category: 'Stocks', icon: 'memory' },
  { ticker: 'TSLA',       label: 'Tesla',           category: 'Stocks', icon: 'electric_car' },
];

const MIN_PICKS = 1;
const MAX_PICKS = 10;

const THRESHOLD_PRESETS = [
  { value: 25, label: 'Active',  description: 'Any meaningful signal — buy/sell as well as strong moves.' },
  { value: 60, label: 'Curated', description: 'Strong signals only. Best signal-to-noise for most users.' },
  { value: 80, label: 'Rare',    description: 'Only the loudest opportunities. A few alerts a week, max.' },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();

  const [step, setStep] = useState(1);
  const [picks, setPicks] = useState(new Set());
  const [threshold, setThreshold] = useState(60);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [hydrating, setHydrating] = useState(true);

  // Bounce back if the user already finished (or isn't logged in).
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/?login=true');
      return;
    }
    let active = true;
    api
      .get('/auth/me')
      .then((me) => {
        if (!active) return;
        if (me.onboardedAt) {
          navigate('/dashboard', { replace: true });
        } else {
          setHydrating(false);
        }
      })
      .catch(() => active && setHydrating(false));
    return () => {
      active = false;
    };
  }, [isAuthenticated, authLoading, navigate]);

  const togglePick = (ticker) => {
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else if (next.size < MAX_PICKS) {
        next.add(ticker);
      }
      return next;
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await authService.completeOnboarding(Array.from(picks), threshold);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Group ticker options by category for the picker grid. useMemo so the
  // grouping doesn't get rebuilt every keystroke on the (currently absent
  // but plausibly future-added) search.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const opt of TICKER_OPTIONS) {
      if (!map.has(opt.category)) map.set(opt.category, []);
      map.get(opt.category).push(opt);
    }
    return Array.from(map.entries());
  }, []);

  if (hydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-secondary">
        <span className="material-icons animate-spin text-3xl text-primary/60">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen bg-background-dark text-text-primary pt-28 pb-20 px-4">
      <SEO title="Set up your watchlist" path="/onboarding" noindex />
      <div className="max-w-3xl mx-auto">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-widest text-primary/80 font-bold mb-2">
            Step {step} of 3
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            {step === 1 && "Pick the tickers you actually trade."}
            {step === 2 && 'How loud should we be?'}
            {step === 3 && 'Last look.'}
          </h1>
          <p className="text-text-secondary mt-2 text-sm sm:text-base">
            {step === 1 && `Choose ${MIN_PICKS}–${MAX_PICKS}. We'll watch them for you and email when our composite signal crosses your threshold.`}
            {step === 2 && 'This is the composite-score band that triggers an alert. You can change it any time, per-ticker, from the Watchlist tab.'}
            {step === 3 && "Confirm and we'll set everything up. You can edit, add, or remove tickers later."}
          </p>
        </header>

        <ProgressBar step={step} />

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {grouped.map(([category, options]) => (
              <section key={category}>
                <h2 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">
                  {category}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {options.map((opt) => {
                    const selected = picks.has(opt.ticker);
                    const atCap = !selected && picks.size >= MAX_PICKS;
                    return (
                      <button
                        key={opt.ticker}
                        onClick={() => togglePick(opt.ticker)}
                        disabled={atCap}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                          selected
                            ? 'bg-primary/10 border-primary/40 text-white'
                            : 'bg-surface-dark border-white/10 text-text-secondary hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        <span
                          className={`material-icons text-lg ${selected ? 'text-primary' : 'text-text-muted'}`}
                        >
                          {opt.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">{opt.label}</span>
                          <span className="block text-[10px] text-text-muted truncate font-mono">
                            {opt.ticker}
                          </span>
                        </span>
                        {selected && <span className="material-icons text-primary text-base">check_circle</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <span className="text-xs text-text-muted">
                {picks.size}/{MAX_PICKS} selected
              </span>
              <button
                onClick={() => setStep(2)}
                disabled={picks.size < MIN_PICKS}
                className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Threshold
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid gap-3">
              {THRESHOLD_PRESETS.map((preset) => {
                const active = threshold === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => setThreshold(preset.value)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      active
                        ? 'bg-primary/10 border-primary/40 text-white'
                        : 'bg-surface-dark border-white/10 text-text-secondary hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="font-semibold text-sm uppercase tracking-wide">{preset.label}</span>
                      <span className={`text-xs font-mono ${active ? 'text-primary' : 'text-text-muted'}`}>
                        ±{preset.value}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{preset.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-text-secondary hover:text-white"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <section className="bg-surface-dark border border-white/5 rounded-xl p-5">
              <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">
                Watching
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(picks).map((ticker) => {
                  const opt = TICKER_OPTIONS.find((o) => o.ticker === ticker);
                  return (
                    <span
                      key={ticker}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-medium"
                    >
                      <span className="material-icons text-sm">{opt?.icon || 'show_chart'}</span>
                      {opt?.label || ticker}
                    </span>
                  );
                })}
              </div>
            </section>

            <section className="bg-surface-dark border border-white/5 rounded-xl p-5">
              <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                Alert when composite crosses
              </h3>
              <p className="text-white text-2xl font-bold tracking-wide">
                ±{threshold}
              </p>
              <p className="text-xs text-text-muted mt-1">
                Above +{threshold}: bullish alert. Below −{threshold}: bearish alert.
              </p>
            </section>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <button
                onClick={() => setStep(2)}
                className="text-sm text-text-secondary hover:text-white"
              >
                ← Back
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Setting up…' : 'Finish setup'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-text-muted">
          <span>
            Signed in as <span className="text-text-secondary">{user?.email || '—'}</span>
          </span>
          <button onClick={logout} className="hover:text-white">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ step }) => (
  <div className="flex items-center gap-2 mb-8">
    {[1, 2, 3].map((s) => (
      <div
        key={s}
        className={`flex-1 h-1 rounded-full transition-colors ${
          s <= step ? 'bg-primary' : 'bg-white/10'
        }`}
      />
    ))}
  </div>
);

export default OnboardingPage;
