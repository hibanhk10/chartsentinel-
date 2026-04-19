import { useEffect, useMemo, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// Consumes the signals engine ported from chartsentinel-preregister.
// Scores throughout are on a -100..+100 scale (except win rate which is
// 0..1 and returns which are already percentages).

const SIGNAL_TABS = [
  { id: 'screener', label: 'Screener', icon: 'grid_view' },
  { id: 'seasonality', label: 'Seasonality', icon: 'calendar_month' },
  { id: 'cot', label: 'COT positioning', icon: 'trending_up' },
  { id: 'mood', label: 'Market mood', icon: 'mood' },
  { id: 'sectors', label: 'Sector rotation', icon: 'donut_large' },
  { id: 'correlations', label: 'Correlations', icon: 'hub' },
  { id: 'backtest', label: 'Backtest', icon: 'history' },
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
      {activeTab === 'mood' && <MoodPanel />}
      {activeTab === 'sectors' && <SectorsPanel />}
      {activeTab === 'correlations' && <CorrelationsPanel />}
      {activeTab === 'backtest' && (
        <BacktestPanel ticker={selectedTicker} onTickerChange={setSelectedTicker} />
      )}
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

  // Backend: { timestamp, count, assets:[{ticker, score, signal, components:{seasonal,cot,pattern}, price, dayChange}] }
  const rows = Array.isArray(state.data?.assets) ? state.data.assets : [];

  if (!rows.length) {
    return (
      <EmptyState message="Screener data is warming up — the engine batches Yahoo requests and caches results for an hour. Try again in a minute." />
    );
  }

  return (
    <div className="border border-white/5 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-text-muted text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left font-semibold px-4 py-3">Ticker</th>
            <th className="text-right font-semibold px-4 py-3">Price</th>
            <th className="text-right font-semibold px-4 py-3">Day %</th>
            <th className="text-right font-semibold px-4 py-3">Composite</th>
            <th className="text-right font-semibold px-4 py-3">Signal</th>
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
              <td className="px-4 py-3 text-right text-text-secondary font-mono">
                {fmt(row.price)}
              </td>
              <td className={`px-4 py-3 text-right font-mono ${pctTint(row.dayChange)}`}>
                {row.dayChange == null ? '—' : `${row.dayChange > 0 ? '+' : ''}${row.dayChange.toFixed(2)}%`}
              </td>
              <td className={`px-4 py-3 text-right font-semibold ${scoreTint(row.score)}`}>
                {fmt(row.score)}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary text-xs">
                {signalLabel(row.signal)}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary">
                {fmt(row.components?.seasonal)}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary">
                {fmt(row.components?.cot)}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary">
                {fmt(row.components?.pattern)}
              </td>
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

  // Backend: { ticker, years:[...], totalDataPoints, curve:[{dayOfYear,avgReturn,winRate,dpo}], currentSignal }
  const summary = useMemo(() => {
    const curve = state.data?.curve;
    if (!Array.isArray(curve) || !curve.length) return null;

    const todayDOY = dayOfYearUTC(new Date());
    // Engine's curve uses 1-based dayOfYear; pick the nearest entry.
    const today = curve.reduce((best, pt) =>
      Math.abs(pt.dayOfYear - todayDOY) < Math.abs(best.dayOfYear - todayDOY) ? pt : best,
    curve[0]);
    const best = curve.reduce((a, b) => (a.avgReturn > b.avgReturn ? a : b), curve[0]);
    const worst = curve.reduce((a, b) => (a.avgReturn < b.avgReturn ? a : b), curve[0]);
    return { today, best, worst };
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

      {state.status === 'ready' && !summary && (
        <EmptyState message="No seasonality curve returned for this ticker yet." />
      )}

      {state.status === 'ready' && summary && (
        <>
          <div className="text-xs text-text-muted">
            Current seasonal signal:{' '}
            <span className={scoreTint(state.data?.currentSignal)}>
              {fmt(state.data?.currentSignal)}
            </span>{' '}
            · {state.data?.years?.length ?? 0} years of history
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <StatCard
              label={`Today (day ${summary.today.dayOfYear})`}
              value={fmtPct(summary.today.avgReturn)}
              sub={`Win rate ${fmtRatio(summary.today.winRate)}`}
              accent={pctTint(summary.today.avgReturn)}
            />
            <StatCard
              label={`Best day (${summary.best.dayOfYear})`}
              value={fmtPct(summary.best.avgReturn)}
              sub={`Win rate ${fmtRatio(summary.best.winRate)}`}
              accent="text-emerald-300"
            />
            <StatCard
              label={`Worst day (${summary.worst.dayOfYear})`}
              value={fmtPct(summary.worst.avgReturn)}
              sub={`Win rate ${fmtRatio(summary.worst.winRate)}`}
              accent="text-rose-300"
            />
          </div>
        </>
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

  // Backend: { data:[...], scores:{ EUR:{score,netPosition,trend,zScore}, GBP:{...}, ... } }
  const scores = state.data?.scores || {};
  const rows = Object.entries(scores)
    .map(([asset, s]) => ({ asset, ...s }))
    .filter((r) => r.score !== 0 || r.netPosition !== 0);

  if (!rows.length) {
    return <EmptyState message="CFTC hasn't returned fresh COT data yet — the Tuesday report cadence means it refreshes weekly." />;
  }

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-text-muted text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left font-semibold px-4 py-3">Currency</th>
            <th className="text-right font-semibold px-4 py-3">Net spec</th>
            <th className="text-right font-semibold px-4 py-3">Z-score</th>
            <th className="text-right font-semibold px-4 py-3">Score</th>
            <th className="text-right font-semibold px-4 py-3">Stance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.asset} className="border-t border-white/5">
              <td className="px-4 py-3 font-mono text-white">{row.asset}</td>
              <td className="px-4 py-3 text-right text-text-secondary font-mono">
                {fmt(row.netPosition)}
              </td>
              <td className={`px-4 py-3 text-right font-semibold ${scoreTint(row.zScore * 50)}`}>
                {row.zScore == null ? '—' : row.zScore.toFixed(2)}
              </td>
              <td className={`px-4 py-3 text-right font-semibold ${scoreTint(row.score)}`}>
                {fmt(row.score)}
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

// ── Market mood ─────────────────────────────────────────────────────────────

function MoodPanel() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    let active = true;
    fetchJson('/signals/mood')
      .then((data) => active && setState({ status: 'ready', data, error: null }))
      .catch((err) => active && setState({ status: 'error', data: null, error: err.message }));
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') return <SkeletonRows />;
  if (state.status === 'error') return <ErrorBanner message={state.error} />;

  // Backend: { score: 0..100, label, emoji, components: {vix, signals, momentum}, timestamp }
  const score = state.data?.score ?? null;
  const label = state.data?.label || '—';
  const emoji = state.data?.emoji || '';
  const components = state.data?.components || {};

  const componentRows = [
    { key: 'vix', name: 'Volatility (VIX)' },
    { key: 'signals', name: 'Signal distribution' },
    { key: 'momentum', name: 'Market momentum' },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <StatCard
        label="Market mood"
        value={score == null ? '—' : `${Math.round(score)}/100`}
        sub={`${emoji} ${label}`.trim()}
        accent={moodTint(score)}
      />
      <div className="md:col-span-2 bg-white/[0.03] border border-white/5 rounded-xl p-5">
        <div className="text-xs uppercase tracking-wider text-text-muted mb-4">Components</div>
        <ul className="space-y-2">
          {componentRows.map((c) => {
            const raw = components[c.key];
            return (
              <li key={c.key} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{c.name}</span>
                <span className={`font-mono ${moodTint(raw)}`}>
                  {raw == null ? '—' : `${Math.round(raw)}/100`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ── Sectors ─────────────────────────────────────────────────────────────────

function SectorsPanel() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    let active = true;
    fetchJson('/signals/sectors')
      .then((data) => active && setState({ status: 'ready', data, error: null }))
      .catch((err) => active && setState({ status: 'error', data: null, error: err.message }));
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') return <SkeletonRows />;
  if (state.status === 'error') return <ErrorBanner message={state.error} />;

  // Backend: { sectors:[{sector, score, signal, phase, dayChange, members:[...]}], timestamp }
  const rows = Array.isArray(state.data?.sectors) ? state.data.sectors : [];
  const hasData = rows.some((r) => (r.members?.length ?? 0) > 0);

  if (!rows.length || !hasData) {
    return <EmptyState message="Sector data depends on a warmed screener cache. Open the Screener tab first, then come back." />;
  }

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-text-muted text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left font-semibold px-4 py-3">Sector</th>
            <th className="text-right font-semibold px-4 py-3">Members</th>
            <th className="text-right font-semibold px-4 py-3">Avg day %</th>
            <th className="text-right font-semibold px-4 py-3">Avg score</th>
            <th className="text-right font-semibold px-4 py-3">Signal</th>
            <th className="text-right font-semibold px-4 py-3">Cycle phase</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.sector} className="border-t border-white/5">
              <td className="px-4 py-3 text-white">{row.sector}</td>
              <td className="px-4 py-3 text-right text-text-secondary">
                {row.members?.length ?? 0}
              </td>
              <td className={`px-4 py-3 text-right font-mono ${pctTint(row.dayChange)}`}>
                {row.dayChange == null
                  ? '—'
                  : `${row.dayChange > 0 ? '+' : ''}${row.dayChange.toFixed(2)}%`}
              </td>
              <td className={`px-4 py-3 text-right font-semibold ${scoreTint(row.score)}`}>
                {fmt(row.score)}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary text-xs">
                {signalLabel(row.signal)}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary text-xs capitalize">
                {row.phase || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Correlations ────────────────────────────────────────────────────────────

function CorrelationsPanel() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    let active = true;
    fetchJson('/signals/correlations')
      .then((data) => active && setState({ status: 'ready', data, error: null }))
      .catch((err) => active && setState({ status: 'error', data: null, error: err.message }));
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') return <SkeletonRows />;
  if (state.status === 'error') return <ErrorBanner message={state.error} />;

  // Backend: { tickers: [...], matrix: { a: { b: 0.93 } }, timestamp }
  const assets = Array.isArray(state.data?.tickers) ? state.data.tickers : [];
  const matrix = state.data?.matrix || {};

  if (!assets.length) {
    return <EmptyState message="No correlation matrix available yet — Yahoo data for at least one ticker is missing." />;
  }

  return (
    <div className="border border-white/5 rounded-xl overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-white/[0.03] text-text-muted uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2 text-left"></th>
            {assets.map((a) => (
              <th key={a} className="px-3 py-2 text-right font-mono">
                {a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assets.map((rowAsset) => (
            <tr key={rowAsset} className="border-t border-white/5">
              <td className="px-3 py-2 font-mono text-white">{rowAsset}</td>
              {assets.map((colAsset) => {
                const v = matrix[rowAsset]?.[colAsset];
                return (
                  <td
                    key={colAsset}
                    className={`px-3 py-2 text-right font-mono ${corrTint(v)}`}
                    title={`${rowAsset} vs ${colAsset}`}
                  >
                    {v == null ? '—' : v.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Backtest ────────────────────────────────────────────────────────────────

function BacktestPanel({ ticker, onTickerChange }) {
  const [tickers, setTickers] = useState([]);
  const [state, setState] = useState({ status: 'idle', data: null, error: null });

  useEffect(() => {
    fetchJson('/signals/tickers').then((t) => setTickers(t.all || [])).catch(() => {});
  }, []);

  const run = () => {
    if (!ticker) return;
    setState({ status: 'loading', data: null, error: null });
    fetchJson(`/backtest/${encodeURIComponent(ticker)}`)
      .then((data) => setState({ status: 'ready', data, error: null }))
      .catch((err) => setState({ status: 'error', data: null, error: err.message }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <label htmlFor="backtest-ticker" className="text-sm text-text-secondary">
          Ticker
        </label>
        <select
          id="backtest-ticker"
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
        <button
          onClick={run}
          disabled={state.status === 'loading'}
          className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-60 rounded-md text-sm font-medium transition-colors"
        >
          {state.status === 'loading' ? 'Running…' : 'Run backtest'}
        </button>
      </div>

      {state.status === 'error' && <ErrorBanner message={state.error} />}
      {state.status === 'ready' && state.data && (
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            label="Total return"
            // Backend already returns these as percentages (e.g. 7.97 = 7.97%).
            value={fmt(state.data.totalReturn ?? 0, '%')}
            sub={`${state.data.totalTrades ?? 0} trades · buy-and-hold ${fmt(state.data.buyAndHoldReturn ?? 0, '%')}`}
            accent={scoreTint(state.data.totalReturn ?? 0)}
          />
          <StatCard
            label="Win rate"
            value={fmt((state.data.winRate ?? 0) * 100, '%')}
            sub={`${state.data.wins ?? 0}W / ${state.data.losses ?? 0}L`}
          />
          <StatCard
            label="Max drawdown"
            value={fmt(state.data.maxDrawdown ?? 0, '%')}
            sub={state.data.sharpeApprox != null ? `Sharpe ${state.data.sharpeApprox.toFixed(2)}` : ''}
            accent="text-rose-300"
          />
        </div>
      )}
      {state.status === 'idle' && (
        <EmptyState message="Pick a ticker and click Run. Backtest simulates the composite-score strategy over the last 5 years of daily data." />
      )}
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

function fmtPct(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const v = n * 100;
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

function fmtRatio(r) {
  if (r == null || Number.isNaN(r)) return '—';
  return `${Math.round(r * 100)}%`;
}

// Score tint — signals engine emits values on a -100..+100 scale, so anything
// above +20 reads as meaningfully bullish, below -20 as bearish. Anything in
// between is genuinely noise.
function scoreTint(n) {
  if (n == null || Number.isNaN(n)) return 'text-text-secondary';
  if (n > 20) return 'text-emerald-300';
  if (n < -20) return 'text-rose-300';
  return 'text-text-secondary';
}

function pctTint(n) {
  if (n == null || Number.isNaN(n)) return 'text-text-secondary';
  if (n > 0.01) return 'text-emerald-300';
  if (n < -0.01) return 'text-rose-300';
  return 'text-text-secondary';
}

function moodTint(score) {
  if (score == null || Number.isNaN(score)) return 'text-text-secondary';
  if (score >= 70) return 'text-emerald-300'; // greed
  if (score <= 30) return 'text-rose-300'; // fear
  return 'text-amber-300';
}

// Correlation colour: strong positive (hot) = red tint, strong negative
// (cold) = blue tint, weak = muted. Intensity scales with magnitude.
function corrTint(v) {
  if (v == null || Number.isNaN(v)) return 'text-text-muted';
  const abs = Math.abs(v);
  if (abs >= 0.8) return v > 0 ? 'text-rose-300' : 'text-sky-300';
  if (abs >= 0.5) return v > 0 ? 'text-rose-200/80' : 'text-sky-200/80';
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

// Composite "signal" strings from the engine (strong_buy, buy, neutral, sell,
// strong_sell). Humanised inline so the table reads naturally.
function signalLabel(signal) {
  if (!signal) return '—';
  return signal.replace(/_/g, ' ');
}

// 1-based day of year, UTC to match the engine's parsing of YYYY-MM-DD dates.
function dayOfYearUTC(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / 86400000);
}
