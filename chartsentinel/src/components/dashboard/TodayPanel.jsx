import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_CONFIG } from '../../config/api';
import { fmtPercentPoints } from '../../lib/format';
import { scoreTint, signalForScore, SIGNAL_LABEL } from '../../lib/score-format';
import AnimatedNumber from '../ui/AnimatedNumber';
import Sparkline from '../ui/Sparkline';
import { StatGridSkeleton } from '../ui/Skeletons';
import api from '../../services/api';

// "Today" snapshot — what just changed and what to look at first.
// Lifts the burden of "where do I start?" off new dashboard visitors.
//
// Three sections:
//   1. Top conviction — three highest |score| from the screener
//   2. Biggest movers — three highest |dayChange|
//   3. Mood pulse    — fear-and-greed score with a one-line label
//
// Polls the screener every 5 min; the engine itself caches for an hour
// so this is just refreshing whichever slice is live in cache.

const POLL_MS = 5 * 60 * 1000;

function pickTopBy(rows, accessor, n = 3) {
    return [...rows].sort((a, b) => Math.abs(accessor(b)) - Math.abs(accessor(a))).slice(0, n);
}

const TickerTile = ({ row, onClick, kind }) => {
    const score = row.score ?? 0;
    const tint = scoreTint(score);
    const signal = row.signal ?? signalForScore(score);
    const label = SIGNAL_LABEL[signal] ?? signal;

    return (
        <button
            onClick={() => onClick?.(row.ticker)}
            className="premium-card rounded-xl p-4 text-left hover:bg-white/[0.06] transition-colors group"
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="font-mono text-white text-sm font-medium">{row.ticker}</div>
                    <div className="text-[10px] uppercase tracking-widest text-text-muted mt-0.5">
                        {label}
                    </div>
                </div>
                <Sparkline data={row.spark} width={70} height={22} />
            </div>
            <div className="flex items-end justify-between">
                <div className={`text-3xl font-bold font-mono ${tint}`}>
                    <AnimatedNumber
                        value={kind === 'mover' ? row.dayChange : score}
                        format={(v) =>
                            v == null || Number.isNaN(v)
                                ? '—'
                                : kind === 'mover'
                                  ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
                                  : `${v >= 0 ? '+' : ''}${Math.round(v)}`
                        }
                    />
                </div>
                <div className="text-xs text-text-muted">
                    {kind === 'mover'
                        ? `score ${score >= 0 ? '+' : ''}${Math.round(score)}`
                        : fmtPercentPoints(row.dayChange)}
                </div>
            </div>
        </button>
    );
};

const TodayPanel = ({ onJumpToTicker }) => {
    const [state, setState] = useState({ status: 'loading', data: null });
    // Personalised slice: user's watchlist tickers + insider clusters
    // landing on those tickers. Loaded separately so a 401 on watchlist
    // (anonymous viewer, dev mode) doesn't tank the public screener panel.
    const [personal, setPersonal] = useState({ watch: [], clusters: [] });

    useEffect(() => {
        let active = true;
        const fetchOnce = async () => {
            try {
                const res = await fetch(`${API_CONFIG.baseURL}/signals/screener`, {
                    headers: API_CONFIG.headers,
                });
                if (!res.ok) {
                    if (active) setState({ status: 'error', data: null });
                    return;
                }
                const data = await res.json();
                if (active) setState({ status: 'ready', data });
            } catch {
                if (active) setState({ status: 'error', data: null });
            }
        };
        fetchOnce();
        const id = setInterval(fetchOnce, POLL_MS);
        return () => {
            active = false;
            clearInterval(id);
        };
    }, []);

    // Pull watchlist + insider clusters once. We don't need to poll —
    // the screener poll covers the live data and watchlist contents
    // change on user action, not on a timer.
    useEffect(() => {
        let active = true;
        Promise.allSettled([api.get('/watchlist'), api.get('/insider/clusters')])
            .then(([wl, cl]) => {
                if (!active) return;
                setPersonal({
                    watch: wl.status === 'fulfilled' ? wl.value?.items ?? [] : [],
                    clusters: cl.status === 'fulfilled' ? cl.value?.clusters ?? [] : [],
                });
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    const { topConviction, topMovers, watchRows, watchClusters } = useMemo(() => {
        const rows = Array.isArray(state.data?.assets) ? state.data.assets : [];
        const watchTickers = new Set(personal.watch.map((w) => w.ticker));
        return {
            topConviction:
                rows.length === 0 ? [] : pickTopBy(rows, (r) => r.score ?? 0, 3),
            topMovers:
                rows.length === 0 ? [] : pickTopBy(rows, (r) => r.dayChange ?? 0, 3),
            watchRows: rows
                .filter((r) => watchTickers.has(r.ticker) && r.score != null)
                .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
                .slice(0, 3),
            watchClusters: personal.clusters
                .filter((c) => watchTickers.has(c.ticker))
                .slice(0, 3),
        };
    }, [state.data, personal]);

    if (state.status === 'loading') {
        return (
            <section className="space-y-4">
                <header>
                    <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                        Today
                    </div>
                    <h2 className="text-xl font-semibold text-white">What's moving</h2>
                </header>
                <StatGridSkeleton tiles={6} />
            </section>
        );
    }

    if (state.status === 'error' || topConviction.length === 0) {
        return null; // Silently hide — the rest of the Home page still renders.
    }

    return (
        <section className="space-y-6">
            <header>
                <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
                    Today
                </div>
                <h2 className="text-xl font-semibold text-white">What's moving</h2>
            </header>

            {/* Personalised slice — shown when the user has tickers
                on their watchlist. Pulls from the same screener cache
                so values stay consistent with the rest of the panel. */}
            {watchRows.length > 0 && (
                <div>
                    <h3 className="text-xs uppercase tracking-widest text-text-muted font-bold mb-3">
                        On your watchlist
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {watchRows.map((row) => (
                            <TickerTile key={row.ticker} row={row} kind="conviction" onClick={onJumpToTicker} />
                        ))}
                    </div>
                </div>
            )}

            {watchClusters.length > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                    <h3 className="text-xs uppercase tracking-widest text-emerald-300 font-bold mb-3">
                        Insider clusters on your watchlist
                    </h3>
                    <ul className="space-y-1.5">
                        {watchClusters.map((c) => (
                            <li key={c.ticker} className="flex items-center justify-between text-sm">
                                <Link to={`/t/${c.ticker}`} className="text-white font-bold hover:text-primary">
                                    {c.ticker}
                                </Link>
                                <span className="text-emerald-300 text-xs">
                                    {c.buyerCount} buyers · ${
                                        c.totalValue >= 1e6
                                            ? `${(c.totalValue / 1e6).toFixed(1)}M`
                                            : `${(c.totalValue / 1e3).toFixed(0)}K`
                                    }
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div>
                <h3 className="text-xs uppercase tracking-widest text-text-muted font-bold mb-3">
                    Highest conviction
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {topConviction.map((row) => (
                        <TickerTile key={row.ticker} row={row} kind="conviction" onClick={onJumpToTicker} />
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-xs uppercase tracking-widest text-text-muted font-bold mb-3">
                    Biggest 24h moves
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {topMovers.map((row) => (
                        <TickerTile key={row.ticker} row={row} kind="mover" onClick={onJumpToTicker} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TodayPanel;
