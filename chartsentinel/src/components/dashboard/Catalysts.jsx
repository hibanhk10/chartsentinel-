import { useEffect, useMemo, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// Catalyst Cockpit — pulls /api/signals/catalysts which wraps the
// macro calendar (FOMC, CPI, NFP, ECB, BoE) with optional LLM-
// generated one-line captions per event. Implied moves are gone — we
// don't have a live options data provider, and a faked column on a
// real page hurts the user's trust more than helps. Replaced with the
// AI caption + an event-type chip that maps to its colour tier.

const CATEGORIES = [
    { id: 'all',  label: 'All', types: null },
    { id: 'fed',  label: 'Fed', types: ['fomc'] },
    { id: 'cpi',  label: 'Inflation', types: ['cpi'] },
    { id: 'jobs', label: 'Jobs', types: ['nfp'] },
    { id: 'cb',   label: 'Other CBs', types: ['ecb', 'boe'] },
];

const TYPE_META = {
    fomc: { label: 'FOMC', tone: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-400/30' },
    cpi:  { label: 'CPI',  tone: 'text-amber-300 bg-amber-500/15 border-amber-400/30' },
    nfp:  { label: 'NFP',  tone: 'text-sky-300 bg-sky-500/15 border-sky-400/30' },
    ecb:  { label: 'ECB',  tone: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30' },
    boe:  { label: 'BoE',  tone: 'text-red-300 bg-red-500/15 border-red-400/30' },
};

function useCountdown(targetIso) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(t);
    }, []);
    const diff = new Date(targetIso + 'T12:00:00Z').getTime() - now;
    if (diff <= 0) return { past: true, days: 0, hours: 0 };
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    return { past: false, days, hours };
}

function CatalystCard({ event }) {
    const cd = useCountdown(event.date);
    const meta = TYPE_META[event.type] || {
        label: event.type.toUpperCase(),
        tone: 'text-text-primary bg-white/10 border-white/15',
    };

    return (
        <div className="bg-surface-dark border border-white/5 rounded-2xl p-5 hover:border-white/15 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">
                        {new Date(event.date + 'T12:00:00Z').toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                        })}
                    </p>
                    <h4 className="text-base font-bold text-text-primary leading-tight">
                        {event.label}
                    </h4>
                </div>
                <span
                    className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${meta.tone}`}
                >
                    {meta.label}
                </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed mb-4 min-h-[2.5rem]">
                {event.caption || event.notes || 'Watch the print and any forward-guidance shift.'}
            </p>

            <div className="flex items-center justify-end">
                {cd.past ? (
                    <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
                        Settled
                    </span>
                ) : (
                    <span className="text-[10px] font-mono text-text-primary tabular-nums">
                        <span className="text-primary font-bold">{cd.days}</span>d{' '}
                        <span className="text-primary font-bold">{cd.hours}</span>h
                    </span>
                )}
            </div>
        </div>
    );
}

const DashboardCatalysts = () => {
    const [filter, setFilter] = useState('all');
    const [state, setState] = useState({ status: 'loading', events: [] });

    useEffect(() => {
        let active = true;
        fetch(`${API_CONFIG.baseURL}/signals/catalysts?days=120&narrate=true`, {
            headers: API_CONFIG.headers,
        })
            .then(async (r) => {
                const body = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
                return body;
            })
            .then((body) => {
                if (!active) return;
                setState({
                    status: 'ready',
                    events: Array.isArray(body.events) ? body.events : [],
                });
            })
            .catch(() => active && setState({ status: 'error', events: [] }));
        return () => {
            active = false;
        };
    }, []);

    const visible = useMemo(() => {
        const cat = CATEGORIES.find((c) => c.id === filter);
        if (!cat || !cat.types) return state.events;
        return state.events.filter((e) => cat.types.includes(e.type));
    }, [state.events, filter]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Catalyst Cockpit
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-text-primary leading-tight mb-3">
                    What's on the tape.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Live macro calendar — FOMC decisions, US CPI + NFP, ECB and BoE meetings.
                    Each event carries an AI-generated "what to watch" caption so you know the
                    setup before the print lands.
                </p>
            </header>

            <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => setFilter(c.id)}
                        className={`px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-full border transition-colors ${
                            filter === c.id
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'
                        }`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            {state.status === 'loading' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-44 bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            )}

            {state.status === 'error' && (
                <p className="text-red-400 text-sm">Failed to load catalysts.</p>
            )}

            {state.status === 'ready' && visible.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visible.map((e) => (
                        <CatalystCard key={`${e.type}-${e.date}`} event={e} />
                    ))}
                </div>
            )}

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Macro events generated from official central-bank calendars · AI captions cached 6h
            </p>
        </div>
    );
};

export default DashboardCatalysts;
