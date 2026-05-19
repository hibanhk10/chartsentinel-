import { useEffect, useMemo, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// Smart Money Flow — wired to /api/signals/smart-money. Two real
// streams: SEC Form 4 (with cluster detection) and Congress STOCK Act
// disclosures. 13F + on-chain whale categories from the old mock are
// dropped — we don't have data providers wired for those yet, and a
// real page with a faked column hurts trust more than helps. Comes
// back in a future data update.

const SOURCES = [
    { id: 'all',              label: 'All',         match: () => true },
    { id: 'congress',         label: 'Congress',    match: (e) => e.source === 'congress' },
    { id: 'insider-cluster',  label: 'Clusters',    match: (e) => e.source === 'insider-cluster' },
    { id: 'insider-trade',    label: 'Insiders',    match: (e) => e.source === 'insider-trade' },
];

const sourceClasses = {
    congress:           'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
    'insider-cluster':  'text-amber-400 bg-amber-500/10 border-amber-500/30',
    'insider-trade':    'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

const actionClasses = {
    BUY: 'text-emerald-400',
    NEW: 'text-emerald-400',
    CLUSTER_BUY: 'text-amber-300',
    SELL: 'text-red-400',
    CUT: 'text-red-400',
};

function shortSource(s) {
    return SOURCES.find((x) => x.id === s)?.label || s;
}

function timeAgo(iso) {
    if (!iso) return '';
    const then = new Date(iso + 'T00:00:00Z').getTime();
    if (!Number.isFinite(then)) return '';
    const days = Math.floor((Date.now() - then) / 86_400_000);
    if (days <= 0) return 'Today';
    if (days === 1) return '1d ago';
    return `${days}d ago`;
}

function FlowRow({ entry }) {
    const sourceClass = sourceClasses[entry.source] || 'text-text-secondary bg-white/5 border-white/10';
    const actionClass = actionClasses[entry.action] || 'text-text-muted';
    const inner = (
        <>
            <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${sourceClass}`}>
                        {shortSource(entry.source)}
                    </span>
                    <span className="text-xs text-text-primary font-medium truncate">{entry.actor}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${entry.unusual}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-primary font-bold tabular-nums w-7 text-right">
                        {entry.unusual}
                    </span>
                </div>
            </div>
            <div className="flex items-baseline gap-3 mb-2">
                <span className={`text-[11px] uppercase tracking-widest font-black ${actionClass}`}>
                    {entry.action.replace('_', ' ')}
                </span>
                <span className="text-base font-bold text-primary">{entry.ticker}</span>
                <span className="text-xs text-text-secondary">{entry.amount}</span>
                <span className="ml-auto text-[10px] text-text-muted">{timeAgo(entry.date)}</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
                {entry.caption || entry.baseNote}
            </p>
        </>
    );

    const className = 'block bg-surface-dark border border-white/5 rounded-2xl p-4 hover:border-white/15 transition-colors';
    return entry.url ? (
        <a href={entry.url} target="_blank" rel="noreferrer noopener" className={className}>
            {inner}
        </a>
    ) : (
        <div className={className}>{inner}</div>
    );
}

const DashboardSmartMoney = () => {
    const [filter, setFilter] = useState('all');
    const [state, setState] = useState({ status: 'loading', entries: [], generatedAt: null });

    useEffect(() => {
        let active = true;
        fetch(`${API_CONFIG.baseURL}/signals/smart-money?narrate=true`, { headers: API_CONFIG.headers })
            .then(async (r) => {
                const body = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
                return body;
            })
            .then((body) => {
                if (!active) return;
                setState({
                    status: 'ready',
                    entries: Array.isArray(body.entries) ? body.entries : [],
                    generatedAt: body.generatedAt || null,
                });
            })
            .catch(() => active && setState({ status: 'error', entries: [], generatedAt: null }));
        return () => { active = false; };
    }, []);

    const visible = useMemo(() => {
        const f = SOURCES.find((s) => s.id === filter) || SOURCES[0];
        return state.entries.filter(f.match);
    }, [state.entries, filter]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Smart Money Flow
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-text-primary leading-tight mb-3">
                    Who's moving where.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Real-time SEC Form 4 insider trades (with cluster detection) plus
                    Congressional STOCK Act disclosures, ranked by how unusual each print is
                    relative to its source. AI captions explain why each row matters.
                </p>
            </header>

            <div className="flex flex-wrap gap-2">
                {SOURCES.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => setFilter(s.id)}
                        className={`px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-full border transition-colors ${
                            filter === s.id
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {state.status === 'loading' && (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            )}

            {state.status === 'error' && (
                <p className="text-red-400 text-sm">Failed to load smart-money feed.</p>
            )}

            {state.status === 'ready' && visible.length === 0 && (
                <div className="bg-surface-dark border border-white/5 rounded-2xl p-8 text-center">
                    <p className="text-text-muted text-sm">
                        No prints matching that filter in the latest snapshot. Insider
                        feeds refresh hourly; Congress filings often lag by 30-45 days
                        per STOCK Act reporting rules.
                    </p>
                </div>
            )}

            {state.status === 'ready' && visible.length > 0 && (
                <div className="space-y-3">
                    {visible.map((entry) => <FlowRow key={entry.id} entry={entry} />)}
                </div>
            )}

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                {state.generatedAt
                    ? `Updated ${new Date(state.generatedAt).toLocaleTimeString()} · 13F + on-chain feeds wire up in next data pass`
                    : 'Loading…'}
            </p>
        </div>
    );
};

export default DashboardSmartMoney;
