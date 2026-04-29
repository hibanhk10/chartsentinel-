import { useMemo, useState } from 'react';

// Conviction Pulse — members log directional conviction (1–10) on a
// ticker; the panel aggregates consensus + dispersion. Per-user votes
// persist in localStorage today; the production version writes to the
// `conviction_votes` table (one row per user/ticker, upserted) and the
// aggregates come from a periodic SQL rollup.

const STORAGE_KEY = 'cs.conviction.v1';
const TICKERS = ['BTC', 'ETH', 'SPX', 'NDX', 'NVDA', 'AAPL', 'GOLD', 'DXY', 'TLT', 'CL'];

// Synthetic baseline so the consensus is non-empty for a fresh user.
// Replace once /api/conviction/aggregate ships.
const BASELINE = {
    BTC:  { up: 142, down: 38, avg: 7.1 },
    ETH:  { up: 98,  down: 31, avg: 6.4 },
    SPX:  { up: 71,  down: 92, avg: 4.8 },
    NDX:  { up: 88,  down: 64, avg: 5.7 },
    NVDA: { up: 56,  down: 81, avg: 4.2 },
    AAPL: { up: 102, down: 41, avg: 6.6 },
    GOLD: { up: 124, down: 22, avg: 7.8 },
    DXY:  { up: 33,  down: 88, avg: 3.5 },
    TLT:  { up: 47,  down: 75, avg: 4.1 },
    CL:   { up: 81,  down: 54, avg: 5.9 },
};

function loadVotes() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}
function saveVotes(votes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
}

const DashboardConviction = () => {
    const [activeTicker, setActiveTicker] = useState(TICKERS[0]);
    const [votes, setVotes] = useState(loadVotes);
    const [conviction, setConviction] = useState(() => votes[TICKERS[0]]?.score ?? 5);
    // Track the ticker the slider was last synced to. When activeTicker
    // changes we reset the slider during render — this is React's
    // documented "adjusting state during rendering" pattern, which
    // avoids the setState-in-effect cascade.
    const [syncedTicker, setSyncedTicker] = useState(activeTicker);
    if (syncedTicker !== activeTicker) {
        setSyncedTicker(activeTicker);
        setConviction(votes[activeTicker]?.score ?? 5);
    }

    const submit = (direction) => {
        const next = {
            ...votes,
            [activeTicker]: {
                direction,
                score: conviction,
                at: new Date().toISOString(),
            },
        };
        setVotes(next);
        saveVotes(next);
    };

    const aggregate = useMemo(() => {
        // Compose baseline + the user's own vote into a single tally so
        // their input visibly nudges consensus.
        const base = BASELINE[activeTicker] || { up: 0, down: 0, avg: 5 };
        const mine = votes[activeTicker];
        const up = base.up + (mine?.direction === 'up' ? 1 : 0);
        const down = base.down + (mine?.direction === 'down' ? 1 : 0);
        const total = up + down;
        const baselineSum = base.avg * (base.up + base.down);
        const mySum = mine ? mine.score : 0;
        const avg = total > 0 ? (baselineSum + mySum) / total : 0;
        const dispersion = Math.min(10, Math.abs(up - down) === total ? 0 : (Math.min(up, down) / Math.max(1, Math.max(up, down))) * 10);
        return { up, down, total, avg, dispersion };
    }, [activeTicker, votes]);

    const upPct = aggregate.total > 0 ? (aggregate.up / aggregate.total) * 100 : 50;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Conviction Pulse
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    Where the room stands.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Vote your conviction on a ticker. The aggregate shows directional
                    consensus and how dispersed it is — high dispersion means the room
                    doesn't agree, which is itself a signal.
                </p>
            </header>

            <section>
                <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">Tickers</p>
                <div className="flex flex-wrap gap-2">
                    {TICKERS.map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setActiveTicker(t)}
                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full border transition-colors ${
                                activeTicker === t
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vote panel */}
                <div className="bg-surface-dark border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-white mb-1">Your vote on {activeTicker}</h3>
                    <p className="text-[11px] text-text-muted mb-4">
                        Drag the slider, then pick a direction. You can change it anytime.
                    </p>

                    <div className="mb-5">
                        <div className="flex items-baseline justify-between mb-2">
                            <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Conviction</span>
                            <span className="text-2xl font-bold text-primary tabular-nums">{conviction}/10</span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={conviction}
                            onChange={(e) => setConviction(Number(e.target.value))}
                            className="w-full accent-fuchsia-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => submit('up')}
                            className={`p-4 rounded-xl border text-sm font-bold uppercase tracking-widest transition-colors ${
                                votes[activeTicker]?.direction === 'up'
                                    ? 'bg-emerald-500/25 text-emerald-400 border-emerald-500/40'
                                    : 'bg-white/5 text-text-secondary border-white/10 hover:bg-emerald-500/10'
                            }`}
                        >
                            ▲ Up
                        </button>
                        <button
                            type="button"
                            onClick={() => submit('down')}
                            className={`p-4 rounded-xl border text-sm font-bold uppercase tracking-widest transition-colors ${
                                votes[activeTicker]?.direction === 'down'
                                    ? 'bg-red-500/25 text-red-400 border-red-500/40'
                                    : 'bg-white/5 text-text-secondary border-white/10 hover:bg-red-500/10'
                            }`}
                        >
                            ▼ Down
                        </button>
                    </div>

                    {votes[activeTicker] && (
                        <p className="text-[10px] text-text-muted mt-3">
                            Last vote {new Date(votes[activeTicker].at).toLocaleString()}
                        </p>
                    )}
                </div>

                {/* Aggregate panel */}
                <div className="bg-surface-dark border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-white mb-1">Room consensus on {activeTicker}</h3>
                    <p className="text-[11px] text-text-muted mb-5">
                        {aggregate.total} {aggregate.total === 1 ? 'vote' : 'votes'} · avg conviction {aggregate.avg.toFixed(1)}/10
                    </p>

                    <div className="mb-4">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-bold mb-1">
                            <span className="text-emerald-400">Up · {aggregate.up}</span>
                            <span className="text-red-400">Down · {aggregate.down}</span>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500" style={{ width: `${upPct}%` }} />
                            <div className="h-full bg-red-500" style={{ width: `${100 - upPct}%` }} />
                        </div>
                        <p className="text-[10px] text-text-muted mt-1.5 text-center">
                            {upPct.toFixed(0)}% bullish
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                        <div>
                            <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">Avg conviction</p>
                            <p className="text-2xl font-bold text-white tabular-nums">{aggregate.avg.toFixed(1)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">Dispersion</p>
                            <p className={`text-2xl font-bold tabular-nums ${aggregate.dispersion > 6 ? 'text-amber-400' : 'text-cyan-300'}`}>
                                {aggregate.dispersion.toFixed(1)}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Local votes today · Backend rollup of community votes ships next
            </p>
        </div>
    );
};

export default DashboardConviction;
