import { useEffect, useMemo, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// Anomaly Feed — wired to /api/signals/anomalies which scans the
// platform's universe and returns rows where today's return or volume
// is >2σ from the trailing-30d mean. ?narrate=true asks the LLM to
// caption the top rows in one batched call. Captions are cached
// server-side for 20 min so a refresh doesn't re-bill.

const TYPES = [
    { id: 'all',    label: 'All' },
    { id: 'price',  label: 'Price' },
    { id: 'volume', label: 'Volume' },
];

const TYPE_CLASS = {
    price:  'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
    volume: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

function fmtPct(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return `${sign}${(n * 100).toFixed(2)}%`;
}

function fmtZ(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    return `σ ${n.toFixed(1)}`;
}

function intensityTone(z) {
    if (z === null || z === undefined) return 'text-text-muted';
    if (z >= 4) return 'text-red-400';
    if (z >= 3) return 'text-amber-400';
    return 'text-emerald-400';
}

const DashboardAnomalies = () => {
    const [filter, setFilter] = useState('all');
    const [state, setState] = useState({ status: 'loading', rows: [], scanned: 0, threshold: 2 });
    const [narrate, setNarrate] = useState(true);

    useEffect(() => {
        let active = true;
        setState((s) => ({ ...s, status: 'loading' }));
        fetch(
            `${API_CONFIG.baseURL}/signals/anomalies?threshold=2&limit=25&narrate=${narrate}`,
            { headers: API_CONFIG.headers },
        )
            .then(async (r) => {
                const body = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
                return body;
            })
            .then((body) => {
                if (!active) return;
                setState({
                    status: 'ready',
                    rows: Array.isArray(body.rows) ? body.rows : [],
                    scanned: body.scanned || 0,
                    threshold: body.threshold || 2,
                });
            })
            .catch((err) => {
                if (!active) return;
                setState({ status: 'error', rows: [], scanned: 0, threshold: 2, error: err.message });
            });
        return () => {
            active = false;
        };
    }, [narrate]);

    const visible = useMemo(() => {
        if (filter === 'all') return state.rows;
        return state.rows.filter((r) => r.type === filter);
    }, [state.rows, filter]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Anomaly Feed
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-text-primary leading-tight mb-3">
                    What's out of distribution.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Live scan of the covered universe. Z-scores compare today's return and
                    volume to each ticker's own trailing-30-day history — a 3.0+ reading
                    means today is in the top 0.13% of that ticker's prints.
                </p>
            </header>

            <div className="flex flex-wrap gap-2 items-center">
                {TYPES.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setFilter(t.id)}
                        className={`px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-full border transition-colors ${
                            filter === t.id
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
                <label className="ml-auto flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-text-muted cursor-pointer">
                    <input
                        type="checkbox"
                        checked={narrate}
                        onChange={(e) => setNarrate(e.target.checked)}
                        className="accent-primary"
                    />
                    AI captions
                </label>
            </div>

            {state.status === 'loading' && (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            )}

            {state.status === 'error' && (
                <p className="text-red-400 text-sm">Failed to load anomalies: {state.error}</p>
            )}

            {state.status === 'ready' && visible.length === 0 && (
                <div className="bg-surface-dark border border-white/5 rounded-2xl p-8 text-center">
                    <p className="text-text-muted text-sm">
                        Nothing crossed the threshold in the latest scan. Markets are quiet —
                        or at least, no ticker in the covered universe printed more than
                        {' '}{state.threshold}σ vs its own history today.
                    </p>
                </div>
            )}

            {state.status === 'ready' && visible.length > 0 && (
                <div className="space-y-3">
                    {visible.map((a) => {
                        const tc = TYPE_CLASS[a.type] || TYPE_CLASS.price;
                        return (
                            <div
                                key={`${a.ticker}-${a.asOf}`}
                                className="bg-surface-dark border border-white/5 rounded-2xl p-4 hover:border-white/15 transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <span
                                        className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${tc}`}
                                    >
                                        {a.type}
                                    </span>
                                    <span className="text-base font-bold text-primary">{a.ticker}</span>
                                    <span className="text-xs text-text-secondary tabular-nums">
                                        {fmtPct(a.return)}
                                    </span>
                                    <span
                                        className={`ml-auto text-[10px] font-mono font-bold tabular-nums ${intensityTone(
                                            a.maxZ,
                                        )}`}
                                    >
                                        {fmtZ(a.maxZ)}
                                    </span>
                                    <span className="text-[10px] text-text-muted">
                                        {a.asOf ? new Date(a.asOf).toLocaleDateString() : '—'}
                                    </span>
                                </div>
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    {a.caption ? (
                                        a.caption
                                    ) : (
                                        <>
                                            Return z {fmtZ(a.returnZ)} · Volume z {fmtZ(a.volumeZ)}.
                                            Unusual print relative to {a.ticker}'s own trailing-30d
                                            distribution.
                                        </>
                                    )}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                {state.status === 'ready'
                    ? `${state.scanned} tickers scanned · threshold ${state.threshold}σ`
                    : 'Scanning…'}
            </p>
        </div>
    );
};

export default DashboardAnomalies;
