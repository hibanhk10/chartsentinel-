import { useEffect, useMemo, useState } from 'react';

// Anomaly Feed — pure surprise detector. Statistical anomalies across
// equities, crypto, options, and breadth metrics. No thesis, no
// recommendation; just "this is unusual relative to its own history".
// Mock entries here mirror what the production scanner emits.

const TYPES = [
    { id: 'all',     label: 'All' },
    { id: 'options', label: 'Options' },
    { id: 'volume',  label: 'Volume' },
    { id: 'tech',    label: 'Technical' },
    { id: 'breadth', label: 'Breadth' },
];

const SEED = [
    {
        id: 'an01',
        type: 'options',
        title: 'Unusual call volume',
        ticker: 'AMD',
        zscore: 4.2,
        detail: 'May 16 $190 calls — 84,200 contracts vs 30d avg of 6,400. Open interest +312% intraday.',
        delta: '+312%',
        time: 'Just now',
    },
    {
        id: 'an02',
        type: 'volume',
        title: 'Volume spike, no news',
        ticker: 'TGT',
        zscore: 3.8,
        detail: 'TGT 2x ADV in first hour with no headline catalyst, no analyst note, no halt.',
        delta: '+218%',
        time: '8m ago',
    },
    {
        id: 'an03',
        type: 'tech',
        title: 'RSI divergence (bearish)',
        ticker: 'NVDA',
        zscore: 2.9,
        detail: 'Higher highs in price, lower highs in 14d RSI. 4 of last 5 instances led to 5d drawdown.',
        delta: '−',
        time: '14m ago',
    },
    {
        id: 'an04',
        type: 'breadth',
        title: 'Hindenburg Omen triggered',
        ticker: 'SPX',
        zscore: 3.4,
        detail: 'NYSE 52w highs + lows both above 2.2% of issues; McClellan oscillator negative.',
        delta: '⚠',
        time: '32m ago',
    },
    {
        id: 'an05',
        type: 'options',
        title: 'Put/call ratio collapse',
        ticker: 'QQQ',
        zscore: 2.6,
        detail: 'Daily put/call dropped to 0.41, lowest reading since Jan 2024. Skew flipped to discount.',
        delta: '−51%',
        time: '1h ago',
    },
    {
        id: 'an06',
        type: 'volume',
        title: 'Dark-pool print cluster',
        ticker: 'CRWD',
        zscore: 3.1,
        detail: '14 prints >50k shares in 90s window, 8.4% above NBBO mid. Suggests institutional accumulation.',
        delta: '+187%',
        time: '2h ago',
    },
    {
        id: 'an07',
        type: 'tech',
        title: 'Gamma squeeze setup',
        ticker: 'GME',
        zscore: 4.6,
        detail: 'Dealer gamma flipped negative; spot 4% below largest open-interest call wall ($30).',
        delta: '⚠',
        time: '3h ago',
    },
    {
        id: 'an08',
        type: 'breadth',
        title: 'Sector rotation break',
        ticker: 'XLE / XLK',
        zscore: 2.4,
        detail: '20d ratio breaking 18m downtrend channel. Mirrors Q4 2022 reversal setup.',
        delta: '↗',
        time: '4h ago',
    },
];

const typeClasses = {
    options: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30',
    volume:  'text-amber-400 bg-amber-500/10 border-amber-500/30',
    tech:    'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
    breadth: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

const DashboardAnomalies = () => {
    const [filter, setFilter] = useState('all');
    // Tiny tick so timestamps "feel" live.
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick((x) => x + 1), 30_000);
        return () => clearInterval(t);
    }, []);

    const visible = useMemo(() => {
        const base = filter === 'all' ? SEED : SEED.filter((s) => s.type === filter);
        return [...base].sort((a, b) => b.zscore - a.zscore);
    }, [filter]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Anomaly Feed
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    What's out of distribution.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Statistical surprises across price, volume, options, and breadth.
                    Z-score is calculated relative to each ticker's own 30-day history —
                    a 3.0+ reading means today is in the top 0.13% of that ticker's prints.
                </p>
            </header>

            <div className="flex flex-wrap gap-2">
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
            </div>

            <div className="space-y-3">
                {visible.map((a) => {
                    const tc = typeClasses[a.type];
                    const intensity
                        = a.zscore >= 4 ? 'text-red-400'
                        : a.zscore >= 3 ? 'text-amber-400'
                        : 'text-emerald-400';
                    return (
                        <div key={a.id} className="bg-surface-dark border border-white/5 rounded-2xl p-4 hover:border-white/15 transition-colors">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${tc}`}>
                                    {TYPES.find((t) => t.id === a.type)?.label || a.type}
                                </span>
                                <span className="text-base font-bold text-primary">{a.ticker}</span>
                                <span className="text-xs text-white font-medium">{a.title}</span>
                                <span className={`ml-auto text-[10px] font-mono font-bold tabular-nums ${intensity}`}>
                                    σ {a.zscore.toFixed(1)}
                                </span>
                                <span className="text-[10px] text-text-muted">{a.time}</span>
                            </div>
                            <p className="text-xs text-text-secondary leading-relaxed">{a.detail}</p>
                        </div>
                    );
                })}
            </div>

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Sample anomalies · Live scanner connects to options + tape feeds in next data update
            </p>
        </div>
    );
};

export default DashboardAnomalies;
