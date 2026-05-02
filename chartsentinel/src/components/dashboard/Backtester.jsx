import { useEffect, useMemo, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// Hits /api/backtest/:ticker which is already exposed by the signals
// extended engine. Renders an SVG equity curve, a buy-and-hold comparison,
// and the win-rate / drawdown / Sharpe scorecard. Read-only — the
// underlying engine handles caching server-side.

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

function fmtPct(n) {
    if (n == null || Number.isNaN(n)) return '—';
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function pctTint(n) {
    if (n == null || Number.isNaN(n)) return 'text-text-muted';
    if (n > 0) return 'text-emerald-300';
    if (n < 0) return 'text-red-300';
    return 'text-text-secondary';
}

// ── Equity curve SVG ──
function EquityCurve({ equity, initialCapital }) {
    if (!equity || equity.length < 2) {
        return (
            <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                Not enough sampled equity points to chart.
            </div>
        );
    }

    const W = 720;
    const H = 240;
    const PAD_X = 32;
    const PAD_Y = 16;

    const values = equity.map((p) => p.value);
    const minV = Math.min(initialCapital, ...values);
    const maxV = Math.max(initialCapital, ...values);
    const range = maxV - minV || 1;

    const xFor = (i) => PAD_X + (i / (equity.length - 1)) * (W - 2 * PAD_X);
    const yFor = (v) => H - PAD_Y - ((v - minV) / range) * (H - 2 * PAD_Y);

    const path = equity
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`)
        .join(' ');

    const baselineY = yFor(initialCapital);

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-64"
            role="img"
            aria-label="Equity curve"
        >
            <line
                x1={PAD_X}
                x2={W - PAD_X}
                y1={baselineY}
                y2={baselineY}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="4 4"
            />
            <path
                d={path}
                fill="none"
                stroke="rgb(99 102 241)"
                strokeWidth="2"
            />
            <text x={PAD_X} y={H - 2} fontSize="9" fill="rgba(255,255,255,0.4)">
                {new Date(equity[0].date).toLocaleDateString()}
            </text>
            <text
                x={W - PAD_X}
                y={H - 2}
                fontSize="9"
                fill="rgba(255,255,255,0.4)"
                textAnchor="end"
            >
                {new Date(equity[equity.length - 1].date).toLocaleDateString()}
            </text>
            <text x={4} y={baselineY - 4} fontSize="9" fill="rgba(255,255,255,0.4)">
                ${initialCapital.toLocaleString()}
            </text>
        </svg>
    );
}

// ── Stat tile ──
function Stat({ label, value, tint, hint }) {
    return (
        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-widest text-text-muted">{label}</div>
            <div className={`mt-1 text-2xl font-bold font-mono ${tint || 'text-white'}`}>
                {value}
            </div>
            {hint && <div className="mt-1 text-xs text-text-muted">{hint}</div>}
        </div>
    );
}

// ── Recent trades table ──
function TradesTable({ trades }) {
    if (!trades || trades.length === 0) {
        return (
            <p className="text-sm text-text-muted py-4">
                No trades fired with these thresholds — try widening them.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto -mx-4">
            <table className="min-w-full text-xs">
                <thead className="text-text-muted border-b border-white/5">
                    <tr>
                        <th className="text-left px-4 py-2 font-medium">Date</th>
                        <th className="text-left px-3 py-2 font-medium">Side</th>
                        <th className="text-right px-3 py-2 font-medium">Price</th>
                        <th className="text-right px-3 py-2 font-medium">Score at fire</th>
                        <th className="text-right px-4 py-2 font-medium">P/L</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {trades.map((t, i) => (
                        <tr key={i} className="text-text-secondary">
                            <td className="px-4 py-2 text-text-muted">
                                {new Date(t.date).toLocaleDateString()}
                            </td>
                            <td
                                className={`px-3 py-2 font-mono uppercase ${
                                    t.type === 'buy' ? 'text-emerald-300' : 'text-red-300'
                                }`}
                            >
                                {t.type}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                                {t.price?.toFixed?.(2) ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{t.score ?? '—'}</td>
                            <td className={`px-4 py-2 text-right font-mono ${pctTint(t.pnl)}`}>
                                {t.pnl != null ? fmtPct(t.pnl) : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const DEFAULT_BUY = 25;
const DEFAULT_SELL = -10;

const DashboardBacktester = () => {
    const [tickers, setTickers] = useState([]);
    const [ticker, setTicker] = useState('');
    const [buyThreshold, setBuyThreshold] = useState(DEFAULT_BUY);
    const [sellThreshold, setSellThreshold] = useState(DEFAULT_SELL);

    const [state, setState] = useState({ status: 'idle', data: null, error: null });

    useEffect(() => {
        fetchJson('/signals/tickers')
            .then((t) => {
                const list = t.all || [];
                setTickers(list);
                // Pick a sensible default — BTC if present, else the first ticker.
                const preferred = list.find((x) => x.toUpperCase().includes('BTC')) || list[0];
                if (preferred) setTicker(preferred);
            })
            .catch(() => {});
    }, []);

    const runBacktest = async () => {
        if (!ticker) return;
        setState({ status: 'loading', data: null, error: null });
        try {
            const params = new URLSearchParams({
                buy: String(buyThreshold),
                sell: String(sellThreshold),
            });
            const data = await fetchJson(
                `/backtest/${encodeURIComponent(ticker)}?${params.toString()}`,
            );
            setState({ status: 'ready', data, error: null });
        } catch (err) {
            setState({ status: 'error', data: null, error: err.message });
        }
    };

    const stats = useMemo(() => {
        if (state.status !== 'ready' || !state.data) return null;
        const d = state.data;
        return {
            totalReturn: d.totalReturn,
            buyAndHoldReturn: d.buyAndHoldReturn,
            alpha: d.alpha,
            winRate: d.winRate,
            maxDrawdown: d.maxDrawdown,
            sharpeApprox: d.sharpeApprox,
            totalTrades: d.totalTrades,
            wins: d.wins,
            losses: d.losses,
            finalCapital: d.finalCapital,
            initialCapital: d.initialCapital,
        };
    }, [state]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-4xl font-bold tracking-tight text-white">Backtester</h1>
                <p className="mt-2 text-text-secondary max-w-2xl">
                    Replay the composite-score strategy against five years of historical
                    prices. Pick a ticker, set the thresholds at which you would buy and
                    sell, and we&apos;ll show you the equity curve and key metrics.
                    Informational only — not investment advice.
                </p>
            </header>

            <section className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
                <div className="grid gap-4 md:grid-cols-4">
                    <div>
                        <label htmlFor="bt-ticker" className="block text-xs text-text-secondary mb-1.5">
                            Ticker
                        </label>
                        <select
                            id="bt-ticker"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
                        >
                            <option value="">Pick…</option>
                            {tickers.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="bt-buy" className="block text-xs text-text-secondary mb-1.5">
                            Buy when score ≥
                        </label>
                        <input
                            id="bt-buy"
                            type="number"
                            step="5"
                            min="0"
                            max="100"
                            value={buyThreshold}
                            onChange={(e) => setBuyThreshold(Number(e.target.value))}
                            className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="bt-sell" className="block text-xs text-text-secondary mb-1.5">
                            Sell when score ≤
                        </label>
                        <input
                            id="bt-sell"
                            type="number"
                            step="5"
                            min="-100"
                            max="0"
                            value={sellThreshold}
                            onChange={(e) => setSellThreshold(Number(e.target.value))}
                            className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={runBacktest}
                            disabled={!ticker || state.status === 'loading'}
                            className="w-full px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-md text-sm font-medium transition-colors"
                        >
                            {state.status === 'loading' ? 'Running…' : 'Run backtest'}
                        </button>
                    </div>
                </div>
                <p className="mt-3 text-xs text-text-muted">
                    Default thresholds (+25 / -10) match the engine&apos;s buy /
                    weak-sell bands. Backtest covers the last ~5 years of daily price
                    data. The composite score series is reconstructed from price data
                    only — COT and pattern signals are approximated within the engine.
                </p>
            </section>

            {state.status === 'idle' && (
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 text-sm text-text-secondary text-center">
                    Run a backtest to see how this strategy would have performed.
                </div>
            )}

            {state.status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300">
                    {state.error}
                </div>
            )}

            {state.status === 'ready' && stats && (
                <>
                    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <Stat
                            label="Strategy return"
                            value={fmtPct(stats.totalReturn)}
                            tint={pctTint(stats.totalReturn)}
                            hint={`$${stats.finalCapital?.toLocaleString()} from $${stats.initialCapital?.toLocaleString()}`}
                        />
                        <Stat
                            label="Buy & hold"
                            value={fmtPct(stats.buyAndHoldReturn)}
                            tint={pctTint(stats.buyAndHoldReturn)}
                            hint="Same window, no trading"
                        />
                        <Stat
                            label="Alpha"
                            value={fmtPct(stats.alpha)}
                            tint={pctTint(stats.alpha)}
                            hint="Strategy - buy & hold"
                        />
                        <Stat
                            label="Win rate"
                            value={`${Math.round((stats.winRate ?? 0) * 100)}%`}
                            hint={`${stats.wins}W / ${stats.losses}L · ${stats.totalTrades} trades`}
                        />
                        <Stat
                            label="Max drawdown"
                            value={fmtPct(-(stats.maxDrawdown ?? 0))}
                            tint="text-red-300"
                            hint="Largest peak-to-trough drop"
                        />
                        <Stat
                            label="Sharpe (approx)"
                            value={(stats.sharpeApprox ?? 0).toFixed(2)}
                            hint="Return / drawdown ratio"
                        />
                    </section>

                    <section className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
                            Equity curve
                        </h2>
                        <EquityCurve
                            equity={state.data.equity}
                            initialCapital={stats.initialCapital}
                        />
                    </section>

                    <section className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">
                            Recent trades
                        </h2>
                        <p className="text-xs text-text-muted mb-3">
                            Showing the last {state.data.trades?.length || 0} trades from the run.
                        </p>
                        <TradesTable trades={state.data.trades} />
                    </section>
                </>
            )}
        </div>
    );
};

export default DashboardBacktester;
