import { useEffect, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// 12-month calendar heatmap of average historical returns per ticker.
// Hits /api/signals/seasonality-calendar/:ticker, which buckets monthly
// returns over the lookback window. Read-only — pure visualisation.

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

const MONTH_LABELS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Map a return-percentage to a tailwind background class. We bucket rather
// than interpolate so adjacent months read distinctly even at small sizes,
// and we keep the bands symmetric around zero so a +2% month and a -2%
// month read as equally intense.
function tintForReturn(ret) {
    if (ret == null || Number.isNaN(ret)) return 'bg-white/[0.04]';
    if (ret > 4) return 'bg-emerald-500/40';
    if (ret > 2) return 'bg-emerald-500/25';
    if (ret > 0.5) return 'bg-emerald-500/15';
    if (ret < -4) return 'bg-red-500/40';
    if (ret < -2) return 'bg-red-500/25';
    if (ret < -0.5) return 'bg-red-500/15';
    return 'bg-white/[0.04]';
}

function fmtPct(n) {
    if (n == null || Number.isNaN(n)) return '—';
    return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

const DashboardSeasonalityCalendar = () => {
    const [tickers, setTickers] = useState([]);
    const [ticker, setTicker] = useState('');
    const [state, setState] = useState({ status: 'idle', data: null, error: null });

    useEffect(() => {
        fetchJson('/signals/tickers')
            .then((t) => {
                const list = t.all || [];
                setTickers(list);
                const preferred = list.find((x) => x.toUpperCase().includes('BTC')) || list[0];
                if (preferred) setTicker(preferred);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!ticker) return;
        let active = true;
        // Reset to loading when the ticker changes so the table doesn't show
        // the previous ticker's data while the new one fetches.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ status: 'loading', data: null, error: null });

        fetchJson(`/signals/seasonality-calendar/${encodeURIComponent(ticker)}`)
            .then((data) => active && setState({ status: 'ready', data, error: null }))
            .catch((err) => active && setState({ status: 'error', data: null, error: err.message }));

        return () => {
            active = false;
        };
    }, [ticker]);

    const months = state.data?.months || [];
    const best = months.length
        ? months.reduce((a, b) => (b.avgReturn > a.avgReturn ? b : a))
        : null;
    const worst = months.length
        ? months.reduce((a, b) => (b.avgReturn < a.avgReturn ? b : a))
        : null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-4xl font-bold tracking-tight text-white">
                    Seasonality calendar
                </h1>
                <p className="mt-2 text-text-secondary max-w-2xl">
                    Which months have historically been strongest for this ticker?
                    Each tile shows the average monthly return over the last decade
                    and the share of years that month closed positive. Hover for the
                    full breakdown.
                </p>
            </header>

            <section className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
                <div className="grid gap-4 md:grid-cols-3">
                    <div>
                        <label htmlFor="sc-ticker" className="block text-xs text-text-secondary mb-1.5">
                            Ticker
                        </label>
                        <select
                            id="sc-ticker"
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
                    {state.status === 'ready' && (
                        <>
                            <div className="md:col-span-2 flex items-center gap-6 text-xs text-text-muted">
                                <div>
                                    <span className="block text-text-secondary mb-1">Lookback</span>
                                    {state.data.years?.length || 0} years
                                </div>
                                {best && (
                                    <div>
                                        <span className="block text-text-secondary mb-1">Best month</span>
                                        <span className="text-emerald-300 font-mono">
                                            {MONTH_LABELS[best.month - 1]} · {fmtPct(best.avgReturn)}
                                        </span>
                                    </div>
                                )}
                                {worst && (
                                    <div>
                                        <span className="block text-text-secondary mb-1">Worst month</span>
                                        <span className="text-red-300 font-mono">
                                            {MONTH_LABELS[worst.month - 1]} · {fmtPct(worst.avgReturn)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </section>

            {state.status === 'loading' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="h-24 bg-white/[0.03] rounded-lg animate-pulse" />
                    ))}
                </div>
            )}

            {state.status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300">
                    {state.error}
                </div>
            )}

            {state.status === 'ready' && (
                <>
                    <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {months.map((m) => (
                            <div
                                key={m.month}
                                className={`rounded-lg border border-white/5 p-3 ${tintForReturn(m.avgReturn)}`}
                                title={`${MONTH_LABELS[m.month - 1]} · ${m.years} years sampled\nAvg ${fmtPct(m.avgReturn)} · Win ${Math.round((m.winRate ?? 0) * 100)}%\nBest year: ${fmtPct(m.bestYearReturn)}\nWorst year: ${fmtPct(m.worstYearReturn)}`}
                            >
                                <div className="text-[10px] uppercase tracking-widest text-text-muted">
                                    {MONTH_LABELS[m.month - 1]}
                                </div>
                                <div
                                    className={`mt-2 text-lg font-bold font-mono ${
                                        m.avgReturn > 0
                                            ? 'text-emerald-300'
                                            : m.avgReturn < 0
                                              ? 'text-red-300'
                                              : 'text-text-secondary'
                                    }`}
                                >
                                    {fmtPct(m.avgReturn)}
                                </div>
                                <div className="mt-1 text-[10px] text-text-muted">
                                    {Math.round((m.winRate ?? 0) * 100)}% green years
                                </div>
                            </div>
                        ))}
                    </section>

                    <section className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
                            Monthly detail
                        </h2>
                        <div className="overflow-x-auto -mx-5">
                            <table className="min-w-full text-xs">
                                <thead className="text-text-muted border-b border-white/5">
                                    <tr>
                                        <th className="text-left px-5 py-2 font-medium">Month</th>
                                        <th className="text-right px-3 py-2 font-medium">Avg return</th>
                                        <th className="text-right px-3 py-2 font-medium">Win rate</th>
                                        <th className="text-right px-3 py-2 font-medium">Best year</th>
                                        <th className="text-right px-3 py-2 font-medium">Worst year</th>
                                        <th className="text-right px-5 py-2 font-medium">Years sampled</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {months.map((m) => (
                                        <tr key={m.month} className="text-text-secondary hover:bg-white/[0.02]">
                                            <td className="px-5 py-2 font-mono text-white">
                                                {MONTH_LABELS[m.month - 1]}
                                            </td>
                                            <td
                                                className={`px-3 py-2 text-right font-mono ${
                                                    m.avgReturn > 0
                                                        ? 'text-emerald-300'
                                                        : m.avgReturn < 0
                                                          ? 'text-red-300'
                                                          : ''
                                                }`}
                                            >
                                                {fmtPct(m.avgReturn)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono">
                                                {Math.round((m.winRate ?? 0) * 100)}%
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-emerald-300">
                                                {fmtPct(m.bestYearReturn)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-red-300">
                                                {fmtPct(m.worstYearReturn)}
                                            </td>
                                            <td className="px-5 py-2 text-right font-mono text-text-muted">
                                                {m.years}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <p className="text-xs text-text-muted">
                        Past patterns don&apos;t repeat exactly. Use seasonality as
                        context, not as a trading rule.
                    </p>
                </>
            )}
        </div>
    );
};

export default DashboardSeasonalityCalendar;
