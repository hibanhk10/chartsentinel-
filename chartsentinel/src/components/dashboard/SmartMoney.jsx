import { useMemo, useState } from 'react';

// Smart Money Flow — aggregated tracker for institutional, insider,
// political, and on-chain "whale" activity. Mock data here is hand-
// curated to look like a typical day's surprise feed; production wires
// to: Quiver Quant (congressional + insider), WhaleAlert (on-chain),
// 13F deltas (Whalewisdom). The component shape (one feed, ranked by
// "unusualness") is the contract those feeds will adapt to.

const SOURCES = [
    { id: 'all',           label: 'All' },
    { id: 'congress',      label: 'Congress' },
    { id: 'insider',       label: 'Insider' },
    { id: 'thirteen-f',    label: '13F' },
    { id: 'whale',         label: 'On-chain' },
];

const FLOW = [
    {
        id: 'a01',
        source: 'congress',
        actor: 'Rep. Khanna (D-CA)',
        action: 'BUY',
        ticker: 'PLTR',
        amount: '$50K – $100K',
        unusual: 92,
        note: 'Defense-tech disclosure 6 days after company guidance reset; first PLTR position.',
        time: '2h ago',
    },
    {
        id: 'a02',
        source: 'insider',
        actor: 'CEO, Toll Brothers (TOL)',
        action: 'SELL',
        ticker: 'TOL',
        amount: '$8.2M',
        unusual: 78,
        note: 'Largest CEO sale in 11 quarters. 10b5-1 plan amended in March.',
        time: '4h ago',
    },
    {
        id: 'a03',
        source: 'whale',
        actor: 'Wallet 0x4f2a…c891',
        action: 'BUY',
        ticker: 'ETH',
        amount: '$24M',
        unusual: 88,
        note: 'Dormant 3.2y. Funded from a Kraken withdrawal; immediately staked.',
        time: '6h ago',
    },
    {
        id: 'a04',
        source: 'thirteen-f',
        actor: 'Citadel Advisors',
        action: 'NEW',
        ticker: 'CRWD',
        amount: '+$340M (1.1M sh)',
        unusual: 71,
        note: 'New top-50 position in latest filing; concurrent put coverage on QQQ.',
        time: '1d ago',
    },
    {
        id: 'a05',
        source: 'congress',
        actor: 'Sen. Tuberville (R-AL)',
        action: 'BUY',
        ticker: 'NVDA',
        amount: '$15K – $50K',
        unusual: 64,
        note: '7th NVDA disclosure in 18 months; consistent with prior pattern.',
        time: '1d ago',
    },
    {
        id: 'a06',
        source: 'insider',
        actor: 'CFO, Snowflake (SNOW)',
        action: 'BUY',
        ticker: 'SNOW',
        amount: '$1.4M',
        unusual: 84,
        note: 'First open-market CFO buy since IPO. Filed Form 4 same day as purchase.',
        time: '2d ago',
    },
    {
        id: 'a07',
        source: 'thirteen-f',
        actor: 'Bridgewater Associates',
        action: 'CUT',
        ticker: 'NVDA',
        amount: '−$2.1B (4.7M sh)',
        unusual: 73,
        note: 'Trimmed 38% of NVDA stake; rotated proceeds into TLT and EM ETFs.',
        time: '2d ago',
    },
    {
        id: 'a08',
        source: 'whale',
        actor: 'Wallet bc1qxy…2nz4',
        action: 'SELL',
        ticker: 'BTC',
        amount: '$112M',
        unusual: 96,
        note: '2,340 BTC moved to Coinbase Prime after 5+ years dormant. Largest single move from this cohort this quarter.',
        time: '3d ago',
    },
];

const sourceClasses = {
    congress:    'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
    insider:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    'thirteen-f': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    whale:       'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30',
};

const actionClasses = {
    BUY:  'text-emerald-400',
    NEW:  'text-emerald-400',
    SELL: 'text-red-400',
    CUT:  'text-red-400',
};

function FlowRow({ entry }) {
    const sourceClass = sourceClasses[entry.source];
    const actionClass = actionClasses[entry.action] || 'text-text-muted';
    return (
        <div className="bg-surface-dark border border-white/5 rounded-2xl p-4 hover:border-white/15 transition-colors">
            <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${sourceClass}`}>
                        {SOURCES.find((s) => s.id === entry.source)?.label || entry.source}
                    </span>
                    <span className="text-xs text-white font-medium truncate">{entry.actor}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${entry.unusual}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-mono text-primary font-bold tabular-nums w-7 text-right">
                        {entry.unusual}
                    </span>
                </div>
            </div>

            <div className="flex items-baseline gap-3 mb-2">
                <span className={`text-[11px] uppercase tracking-widest font-black ${actionClass}`}>
                    {entry.action}
                </span>
                <span className="text-base font-bold text-primary">{entry.ticker}</span>
                <span className="text-xs text-text-secondary">{entry.amount}</span>
                <span className="ml-auto text-[10px] text-text-muted">{entry.time}</span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">{entry.note}</p>
        </div>
    );
}

const DashboardSmartMoney = () => {
    const [filter, setFilter] = useState('all');

    const visible = useMemo(() => {
        const base = filter === 'all' ? FLOW : FLOW.filter((f) => f.source === filter);
        return [...base].sort((a, b) => b.unusual - a.unusual);
    }, [filter]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Smart Money Flow
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    Who's moving where.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    13F deltas, insider buys, congressional disclosures, and on-chain whales —
                    in one feed, ranked by how unusual the move is for that actor.
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

            <div className="space-y-3">
                {visible.map((entry) => <FlowRow key={entry.id} entry={entry} />)}
            </div>

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Demo feed · Live wiring via Quiver + WhaleAlert + Whalewisdom in Q3
            </p>
        </div>
    );
};

export default DashboardSmartMoney;
