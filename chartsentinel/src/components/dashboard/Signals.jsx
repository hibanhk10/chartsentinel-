import { useEffect, useMemo, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// Consumes the signals engine ported from chartsentinel-preregister/signals.js.
// First pass wires three of the richest endpoints:
//   - /api/signals/screener     — composite score ranked across all tickers
//   - /api/signals/seasonality  — average historical return by calendar day
//   - /api/signals/cot          — positioning Z-score for futures
//
// Deliberately kept tabular rather than a heavy charting UI — the point of
// landing this as a v1 is to prove the data is real and reachable. Charts,
// alerts, backtests, and market-mood visualisations come in a follow-up.

const SIGNAL_TABS = [
  { id: 'screener', label: 'Screener', icon: 'grid_view' },
  { id: 'seasonality', label: 'Seasonality', icon: 'calendar_month' },
  { id: 'cot', label: 'COT positioning', icon: 'trending_up' },
];

const AUTH_HEADERS = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function fetchJson(path) {
  const res = await fetch(`${API_CONFIG.baseURL}${path}`, {
    headers: { ...API_CONFIG.headers, ...AUTH_HEADERS() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function DashboardSignals() {
  const [activeTab, setActiveTab] = useState('screener');
  const [selectedTicker, setSelectedTicker] = useState('EURUSD=X');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-white">Signals</h1>
        <p className="mt-2 text-text-secondary max-w-2xl">
          Composite ranks across FX, crypto, and equities. Scores blend
          seasonality, commitment-of-traders positioning, and historical
          pattern matches. Not advice — see{' '}
          <a href="/risk" className="underline">
            Risk Disclaimer
          </a>
          .
        </p>
      </header>

      <nav className="flex gap-2 flex-wrap">
        {SIGNAL_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === t.id
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-white/5 text-text-secondary border border-white/5 hover:bg-white/10'
            }`}
          >
            <span className="material-icons text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === 'screener' && <ScreenerPanel onSelectTicker={setSelectedTicker} />}
      {activeTab === 'seasonality' && (
        <SeasonalityPanel ticker={selectedTicker} onTickerChange={setSelectedTicker} />
      )}
      {activeTab === 'cot' && <CotPanel />}
    </div>
  );
}

// ── Screener ────────────────────────────────────────────────────────────────

function ScreenerPanel({ onSelectTicker }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading', data: null, error: null });
    fetchJson('/signals/screener')
      .then((data) => active && setState({ status: 'ready', data, error: null }))
      .catch((err) => active && setState({ status: 'error', data: null, error: err.message }));
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') return <SkeletonRows />;
  if (state.status === 'error') return <ErrorBanner message={state.error} />;

  const rows = Array.isArray(state.data?.rankings) ? state.data.rankings : [];

  if (!rows.length) {
    return <EmptyState message="No screener data returned yet. Check back in a minute — the engine caches data for up to an hour between refreshes." />;
  }

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-text-muted text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left font-semibold px-4 py-3">Ticker</th>
            <th className="text-right font-semibold px-4 py-3">Composite</th>
            <th className="text-right font-semibold px-4 py-3">Season</th>
            <th className="text-right font-semibold px-4 py-3">COT</th>
            <th className="text-right font-semibold px-4 py-3">Pattern</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.ticker}
              onClick={() => onSelectTicker?.(row.ticker)}
              className="border-t border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 font-mono text-white">{row.ticker}</td>
              <td className={`px-4 py-3 text-right font-semibold ${scoreTint(row.composite)}`}>
                {fmt(row.composite)}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary">{fmt(row.seasonal)}</td>
              <td className="px-4 py-3 text-right text-text-secondary">{fmt(row.cot)}</td>
              <td className="px-4 py-3 text-right text-text-secondary">{fmt(row.pattern)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Seasonality ─────────────────────────────────────────────────────────────

function SeasonalityPanel({ ticker, onTickerChange }) {
  const [tickers, setTickers] = useState([]);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    fetchJson('/signals/tickers').then((t) => setTickers(t.all || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ticker) return;
    let active = true;
    setState({ status: 'loading', data: null, error: null });
    fetchJson(`/signals/seasonality/${encodeURIComponent(ticker)}`)
      .then((data) => active && setState({ status: 'ready', data, error: null }))
      .catch((err) => active && setState({ status: 'error', data: null, error: err.message }));
    return () => {
      active = false;
    };
  }, [ticker]);

  const today = useMemo(() => {
    const d = new Date();
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return state.data?.byDay?.find((row) => row.date === key) || null;
  }, [state.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label htmlFor="seasonality-ticker" className="text-sm text-text-secondary">
          Ticker
        </label>
        <select
          id="seasonality-ticker"
          value={ticker}
          onChange={(e) => onTickerChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {tickers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {state.status === 'loading' && <SkeletonRows />}
      {state.status === 'error' && <ErrorBanner message={state.error} />}

      {state.status === 'ready' && (
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            label="Today's historical average"
            value={today ? fmt(today.avgReturn * 100, '%') : '—'}
            sub={today ? `${today.samples} observations` : 'no match'}
            accent={scoreTint(today?.avgReturn ?? 0)}
          />
          <StatCard
            label="Best calendar day"
            value={
              state.data?.best
                ? `${state.data.best.date} · ${fmt(state.data.best.avgReturn * 100, '%')}`
                : '—'
            }
            sub={state.data?.best ? `${state.data.best.samples} observations` : ''}
            accent="text-emerald-300"
          />
          <StatCard
            label="Worst calendar day"
            value={
              state.data?.worst
                ? `${state.data.worst.date} · ${fmt(state.data.worst.avgReturn * 100, '%')}`
                : '—'
            }
            sub={state.data?.worst ? `${state.data.worst.samples} observations` : ''}
            accent="text-rose-300"
          />
        </div>
      )}
    </div>
  );
}

// ── COT positioning ─────────────────────────────────────────────────────────

function CotPanel() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    let active = true;
    fetchJson('/signals/cot')
      .then((data) => active && setState({ status: 'ready', data, error: null }))
      .catch((err) => active && setState({ status: 'error', data: null, error: err.message }));
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') return <SkeletonRows />;
  if (state.status === 'error') return <ErrorBanner message={state.error} />;

  const rows = Array.isArray(state.data?.assets) ? state.data.assets : [];
  if (!rows.length) return <EmptyState message="No COT data available right now." />;

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-text-muted text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left font-semibold px-4 py-3">Asset</th>
            <th className="text-right font-semibold px-4 py-3">Net spec</th>
            <th className="text-right font-semibold px-4 py-3">Z-score (3y)</th>
            <th className="text-right font-semibold px-4 py-3">Stance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.asset} className="border-t border-white/5">
              <td className="px-4 py-3 font-mono text-white">{row.asset}</td>
              <td className="px-4 py-3 text-right text-text-secondary">{fmt(row.netSpec)}</td>
              <td className={`px-4 py-3 text-right font-semibold ${scoreTint(row.zScore)}`}>
                {fmt(row.zScore)}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary">
                {cotStance(row.zScore)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Primitives ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
      <div className="text-xs uppercase tracking-wider text-text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accent || 'text-white'}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-text-muted">{sub}</div>}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 bg-white/[0.03] rounded-md" />
      ))}
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300">
      Failed to load signals: {message}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 text-sm text-text-secondary text-center">
      {message}
    </div>
  );
}

function fmt(n, suffix = '') {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return `${n.toFixed(decimals)}${suffix}`;
}

function scoreTint(n) {
  if (n == null || Number.isNaN(n)) return 'text-text-secondary';
  if (n > 0.5) return 'text-emerald-300';
  if (n < -0.5) return 'text-rose-300';
  return 'text-text-secondary';
}

function cotStance(z) {
  if (z == null || Number.isNaN(z)) return '—';
  if (z > 1.5) return 'Crowded long';
  if (z > 0.5) return 'Net long';
  if (z < -1.5) return 'Crowded short';
  if (z < -0.5) return 'Net short';
  return 'Neutral';
}
