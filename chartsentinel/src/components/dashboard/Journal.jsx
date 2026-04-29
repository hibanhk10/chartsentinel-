import { useMemo, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// AI Trade Journal — log entries / exits, get an LLM critique that
// surfaces patterns across the user's behavior. Persisted in
// localStorage (per-device for now); the backend wiring lands in the
// next migration so journals can sync across devices.

const STORAGE_KEY = 'cs.journal.v1';
const HABIT_KEY = 'cs.journal.habit';

const SIDES = ['LONG', 'SHORT'];
const STATUSES = [
    { id: 'open',   label: 'Open',   class: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' },
    { id: 'closed', label: 'Closed', class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { id: 'stopped', label: 'Stopped', class: 'text-red-400 bg-red-500/10 border-red-500/30' },
];

function loadEntries() {
    try {
        const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

function saveEntries(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function loadHabit() {
    try {
        return JSON.parse(localStorage.getItem(HABIT_KEY) || 'null');
    } catch {
        return null;
    }
}

function saveHabit(habit) {
    localStorage.setItem(HABIT_KEY, JSON.stringify(habit));
}

const blank = () => ({
    id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
    ticker: '',
    side: 'LONG',
    entry: '',
    exit: '',
    size: '',
    status: 'open',
    thesis: '',
    closedAt: null,
    createdAt: new Date().toISOString(),
});

const computePnL = (entry) => {
    if (entry.status === 'open' || !entry.exit) return null;
    const e = Number(entry.entry);
    const x = Number(entry.exit);
    const sz = Number(entry.size) || 1;
    if (!Number.isFinite(e) || !Number.isFinite(x) || e === 0) return null;
    const dirSign = entry.side === 'LONG' ? 1 : -1;
    const pct = ((x - e) / e) * 100 * dirSign;
    const dollars = (x - e) * sz * dirSign;
    return { pct, dollars };
};

const DashboardJournal = () => {
    const [entries, setEntries] = useState(loadEntries);
    const [draft, setDraft] = useState(blank());
    const [habit, setHabit] = useState(loadHabit);
    const [critiquing, setCritiquing] = useState(false);
    const [critiqueError, setCritiqueError] = useState(null);

    const addEntry = () => {
        if (!draft.ticker.trim() || !draft.entry) return;
        const next = [{ ...draft, ticker: draft.ticker.trim().toUpperCase() }, ...entries];
        setEntries(next);
        saveEntries(next);
        setDraft(blank());
    };

    const closeEntry = (id, status) => {
        const next = entries.map((e) => {
            if (e.id !== id) return e;
            return { ...e, status, closedAt: new Date().toISOString() };
        });
        setEntries(next);
        saveEntries(next);
    };

    const updateField = (id, key, value) => {
        const next = entries.map((e) => (e.id === id ? { ...e, [key]: value } : e));
        setEntries(next);
        saveEntries(next);
    };

    const removeEntry = (id) => {
        const next = entries.filter((e) => e.id !== id);
        setEntries(next);
        saveEntries(next);
    };

    const stats = useMemo(() => {
        const closed = entries.filter((e) => e.status !== 'open');
        const pnls = closed.map(computePnL).filter(Boolean);
        if (pnls.length === 0) return null;
        const wins = pnls.filter((p) => p.pct > 0).length;
        const winRate = (wins / pnls.length) * 100;
        const avgWin = pnls.filter((p) => p.pct > 0).reduce((acc, p) => acc + p.pct, 0) / Math.max(1, wins);
        const avgLoss = pnls.filter((p) => p.pct <= 0).reduce((acc, p) => acc + p.pct, 0) / Math.max(1, pnls.length - wins);
        const totalPct = pnls.reduce((acc, p) => acc + p.pct, 0);
        return { count: pnls.length, winRate, avgWin, avgLoss, totalPct };
    }, [entries]);

    const requestCritique = async () => {
        if (entries.length < 3) {
            setCritiqueError('Log at least 3 trades for a meaningful critique.');
            return;
        }
        setCritiquing(true);
        setCritiqueError(null);
        try {
            const summary = entries
                .slice(0, 25)
                .map((e) => {
                    const pnl = computePnL(e);
                    return (
                        `${e.ticker} ${e.side} entry=${e.entry} `
                        + (e.exit ? `exit=${e.exit} ` : 'open ')
                        + (pnl ? `pnl=${pnl.pct.toFixed(2)}% ` : '')
                        + `status=${e.status} thesis="${(e.thesis || '').slice(0, 80)}"`
                    );
                })
                .join('\n');

            const message
                = 'Review this trader\'s recent trade journal and identify two or three '
                + 'recurring patterns (specifically about entries, exits, sizing, or thesis '
                + 'framing). End with a single concrete habit they should try this week. '
                + 'Be direct and specific. Trades:\n\n' + summary;

            const res = await fetch(`${API_CONFIG.baseURL}/ai/interrogate`, {
                method: 'POST',
                headers: API_CONFIG.headers,
                body: JSON.stringify({ message }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
            const text = body?.text || 'No critique returned.';
            const next = { text, at: new Date().toISOString() };
            setHabit(next);
            saveHabit(next);
        } catch (err) {
            setCritiqueError(err.message || 'Critique failed.');
        } finally {
            setCritiquing(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        AI Trade Journal
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    Log it. Learn from it.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Record every entry, exit, and thesis. The AI scans the log and surfaces
                    behavior patterns — then suggests one specific habit to try this week.
                </p>
            </header>

            {stats && (
                <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: 'Closed',   value: stats.count,                                              tone: 'text-white' },
                        { label: 'Win rate', value: `${stats.winRate.toFixed(0)}%`,                            tone: stats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400' },
                        { label: 'Avg win',  value: `${stats.avgWin >= 0 ? '+' : ''}${stats.avgWin.toFixed(1)}%`, tone: 'text-emerald-400' },
                        { label: 'Avg loss', value: `${stats.avgLoss.toFixed(1)}%`,                             tone: 'text-red-400' },
                        { label: 'Total',    value: `${stats.totalPct >= 0 ? '+' : ''}${stats.totalPct.toFixed(1)}%`, tone: stats.totalPct >= 0 ? 'text-emerald-400' : 'text-red-400' },
                    ].map((s) => (
                        <div key={s.label} className="bg-surface-dark border border-white/5 rounded-xl p-3">
                            <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">{s.label}</p>
                            <p className={`text-lg font-bold tabular-nums ${s.tone}`}>{s.value}</p>
                        </div>
                    ))}
                </section>
            )}

            <section className="bg-surface-dark border border-white/5 rounded-2xl p-5 space-y-3">
                <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                    New entry
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    <input
                        value={draft.ticker}
                        onChange={(e) => setDraft({ ...draft, ticker: e.target.value })}
                        placeholder="Ticker"
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                    <select
                        value={draft.side}
                        onChange={(e) => setDraft({ ...draft, side: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    >
                        {SIDES.map((s) => <option key={s} value={s} className="bg-surface-dark">{s}</option>)}
                    </select>
                    <input
                        value={draft.entry}
                        onChange={(e) => setDraft({ ...draft, entry: e.target.value })}
                        placeholder="Entry"
                        inputMode="decimal"
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                    <input
                        value={draft.exit}
                        onChange={(e) => setDraft({ ...draft, exit: e.target.value })}
                        placeholder="Exit (opt)"
                        inputMode="decimal"
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                    <input
                        value={draft.size}
                        onChange={(e) => setDraft({ ...draft, size: e.target.value })}
                        placeholder="Size"
                        inputMode="decimal"
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                    <button
                        type="button"
                        onClick={addEntry}
                        className="bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        Log
                    </button>
                </div>
                <textarea
                    value={draft.thesis}
                    onChange={(e) => setDraft({ ...draft, thesis: e.target.value })}
                    placeholder="Thesis (1-2 lines): why are you in this trade?"
                    rows={2}
                    maxLength={240}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-text-muted/60 resize-none"
                />
            </section>

            <section className="bg-surface-dark border border-primary/20 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                        <h3 className="text-sm font-bold text-white mb-1">This week's habit</h3>
                        <p className="text-[11px] text-text-muted">
                            One concrete behavior the AI thinks is worth trying based on your journal.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={requestCritique}
                        disabled={critiquing}
                        className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                        {critiquing ? 'Reviewing…' : 'Get critique'}
                    </button>
                </div>
                {critiqueError && <p className="text-red-400 text-xs">{critiqueError}</p>}
                {habit?.text ? (
                    <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{habit.text}</p>
                ) : (
                    <p className="text-text-muted text-xs">No critique yet — log a few trades and ask the AI for a read.</p>
                )}
            </section>

            <section>
                <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">
                    Trades ({entries.length})
                </h3>
                {entries.length === 0 ? (
                    <p className="text-text-muted text-sm py-6">No entries yet.</p>
                ) : (
                    <div className="space-y-2">
                        {entries.map((e) => {
                            const pnl = computePnL(e);
                            const status = STATUSES.find((s) => s.id === e.status);
                            return (
                                <div key={e.id} className="bg-surface-dark border border-white/5 rounded-2xl p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-base font-bold text-primary">{e.ticker}</span>
                                        <span className={`text-[10px] uppercase tracking-widest font-bold ${e.side === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {e.side}
                                        </span>
                                        <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${status.class}`}>
                                            {status.label}
                                        </span>
                                        {pnl && (
                                            <span className={`ml-auto text-sm font-mono font-bold tabular-nums ${pnl.pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {pnl.pct >= 0 ? '+' : ''}{pnl.pct.toFixed(2)}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-text-secondary mb-2">
                                        <span>Entry <span className="text-white">{e.entry}</span></span>
                                        {e.exit && <span>Exit <span className="text-white">{e.exit}</span></span>}
                                        {e.size && <span>Size <span className="text-white">{e.size}</span></span>}
                                        <span className="text-text-muted text-[10px]">
                                            {new Date(e.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {e.thesis && (
                                        <p className="text-[11px] text-text-muted leading-relaxed mb-2">
                                            "{e.thesis}"
                                        </p>
                                    )}
                                    {e.status === 'open' && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <input
                                                placeholder="Exit price"
                                                inputMode="decimal"
                                                value={e.exit || ''}
                                                onChange={(ev) => updateField(e.id, 'exit', ev.target.value)}
                                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => closeEntry(e.id, 'closed')}
                                                className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] uppercase tracking-widest font-bold rounded-lg hover:bg-emerald-500/25"
                                            >
                                                Close
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => closeEntry(e.id, 'stopped')}
                                                className="px-3 py-1.5 bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] uppercase tracking-widest font-bold rounded-lg hover:bg-red-500/25"
                                            >
                                                Stopped
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeEntry(e.id)}
                                                className="ml-auto w-8 h-8 flex items-center justify-center text-text-muted hover:text-red-400"
                                            >
                                                <span className="material-icons text-base">delete_outline</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Local-only · cross-device sync via /api/journal in next backend update
            </p>
        </div>
    );
};

export default DashboardJournal;
