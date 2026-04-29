import { useEffect, useState } from 'react';

// Mentor Match — pairs newer members with veterans based on the role/
// city data the networking opt-in already collects. Today the panel
// shows a curated weekly pairing demo; production will hit
// /api/networking/mentor-match which builds pairings off the same
// public roster the Community Map renders.

const STORAGE_KEY = 'cs.mentor-match.profile.v1';

const ROLES = [
    'Macro', 'Quant', 'Equities', 'FX', 'Rates', 'Vol',
    'Crypto', 'Commodities', 'Energy', 'Systematic', 'Prop',
    'EM', 'Arb', 'Discretionary', 'Researcher', 'Member',
];

const STAGES = [
    { id: 'new',         label: 'New (<1y)' },
    { id: 'developing',  label: 'Developing (1-3y)' },
    { id: 'experienced', label: 'Experienced (3-7y)' },
    { id: 'veteran',     label: 'Veteran (7y+)' },
];

const TOPICS = [
    'Risk sizing', 'Thesis writing', 'Exit discipline',
    'Volatility regimes', 'Tape reading', 'Newsflow filtering',
    'Journaling habits', 'Position management', 'Macro framing',
];

// Curated demo cohort. Replace once /api/networking/mentor-match returns
// pairings off the public-roster + opt-in metadata.
const DEMO_PAIRINGS = [
    {
        id: 'p01',
        mentor: { handle: 'thames-pm',    role: 'Macro',     city: 'London, UK',         years: 14 },
        mentee: { handle: 'mumbai-fx',    role: 'FX',         city: 'Mumbai, IN',         years: 2 },
        focus: 'Macro framing',
        cadence: 'Weekly · 30 min',
    },
    {
        id: 'p02',
        mentor: { handle: 'alpine-vol',   role: 'Vol',        city: 'Zurich, CH',         years: 11 },
        mentee: { handle: 'paulista-1',   role: 'EM',         city: 'São Paulo, BR',      years: 3 },
        focus: 'Volatility regimes',
        cadence: 'Bi-weekly · 45 min',
    },
    {
        id: 'p03',
        mentor: { handle: 'tokyo-prop',   role: 'Prop',       city: 'Tokyo, JP',          years: 9 },
        mentee: { handle: 'soko-trader',  role: 'Crypto',     city: 'Lagos, NG',          years: 1 },
        focus: 'Risk sizing',
        cadence: 'Weekly · 20 min',
    },
];

function loadProfile() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
        return null;
    }
}

function saveProfile(p) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

const DashboardMentorMatch = () => {
    const initial = loadProfile() || {};
    const [stage, setStage] = useState(initial.stage || 'developing');
    const [role, setRole] = useState(initial.role || 'Macro');
    const [topics, setTopics] = useState(initial.topics || []);
    const [optedIn, setOptedIn] = useState(Boolean(initial.optedIn));
    const [feedback, setFeedback] = useState(null);

    useEffect(() => {
        saveProfile({ stage, role, topics, optedIn });
    }, [stage, role, topics, optedIn]);

    useEffect(() => {
        if (!feedback) return;
        const t = setTimeout(() => setFeedback(null), 2500);
        return () => clearTimeout(t);
    }, [feedback]);

    const toggleTopic = (t) =>
        setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

    const optIn = () => {
        if (topics.length === 0) {
            setFeedback({ type: 'error', message: 'Pick at least one focus topic.' });
            return;
        }
        setOptedIn(true);
        setFeedback({ type: 'success', message: 'You\'re in the next pairing round.' });
    };

    const optOut = () => {
        setOptedIn(false);
        setFeedback({ type: 'success', message: 'Removed from pairing pool.' });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Mentor Match
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    Pair up. Level up.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Weekly pairings between newer members and veterans, matched on focus
                    area and time-zone. Opt in once; the algorithm rotates pairings each
                    cycle so you meet a different perspective every couple of weeks.
                </p>
            </header>

            <section className="bg-surface-dark border border-white/5 rounded-2xl p-5 space-y-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-white">Your profile</h3>
                        <p className="text-[11px] text-text-muted">
                            Used to find the closest match. Updated profiles re-enter the next round.
                        </p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${
                        optedIn
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'bg-white/5 text-text-muted border border-white/10'
                    }`}>
                        {optedIn ? 'Opted in' : 'Not in pool'}
                    </span>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                        Career stage
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {STAGES.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setStage(s.id)}
                                className={`px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-full border transition-colors ${
                                    stage === s.id
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                        Primary role
                    </label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    >
                        {ROLES.map((r) => <option key={r} value={r} className="bg-surface-dark">{r}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                        Focus topics <span className="text-text-muted/60 normal-case">(pick up to 4)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {TOPICS.map((t) => {
                            const active = topics.includes(t);
                            const disabled = !active && topics.length >= 4;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => toggleTopic(t)}
                                    disabled={disabled}
                                    className={`px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-full border transition-colors ${
                                        active
                                            ? 'bg-primary text-white border-primary'
                                            : disabled
                                            ? 'bg-white/5 text-text-muted/40 border-white/5 cursor-not-allowed'
                                            : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    {t}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    {optedIn ? (
                        <button
                            type="button"
                            onClick={optOut}
                            className="px-5 py-2.5 bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-white/10"
                        >
                            Leave pool
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={optIn}
                            className="px-5 py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-primary-dark"
                        >
                            Join next round
                        </button>
                    )}
                    {feedback && (
                        <span className={`text-xs ${feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {feedback.message}
                        </span>
                    )}
                </div>
            </section>

            <section>
                <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">
                    Recent pairings (this week)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {DEMO_PAIRINGS.map((p) => (
                        <div key={p.id} className="bg-surface-dark border border-white/5 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] uppercase tracking-widest text-primary font-bold">
                                    Focus · {p.focus}
                                </span>
                                <span className="text-[10px] text-text-muted">{p.cadence}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[p.mentor, p.mentee].map((person, idx) => (
                                    <div key={idx} className="bg-black/30 border border-white/5 rounded-xl p-3">
                                        <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">
                                            {idx === 0 ? 'Mentor' : 'Mentee'}
                                        </p>
                                        <p className="text-sm font-bold text-white truncate">@{person.handle}</p>
                                        <p className="text-[10px] text-text-secondary mt-0.5">
                                            {person.role} · {person.city}
                                        </p>
                                        <p className="text-[10px] text-text-muted mt-0.5">{person.years}y experience</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Demo pairings · Live matcher off the public roster ships next
            </p>
        </div>
    );
};

export default DashboardMentorMatch;
