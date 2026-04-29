import { useEffect, useMemo, useState } from 'react';

// Catalyst Cockpit — calendar of upcoming macro/earnings catalysts with
// live countdowns and the implied move the options market is currently
// pricing in. Implied moves are mocked here (would come from an options
// data provider like OptionMetrics or Tradier); the dates and event
// types are real upcoming 2026 prints, so the countdown and ordering
// stay correct as the page is opened day-to-day.

const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'fed', label: 'Fed' },
    { id: 'data', label: 'Macro Data' },
    { id: 'earnings', label: 'Earnings' },
    { id: 'auction', label: 'Treasury' },
    { id: 'central', label: 'Other CBs' },
];

// Hand-curated calendar. Update each quarter; the component itself
// is self-pruning — past events drop off the list automatically.
const CATALYSTS = [
    { id: 'fomc-may',  date: '2026-05-07T18:00:00Z', category: 'fed',     title: 'FOMC Decision',     impliedMove: 1.4, assets: ['SPX', 'DXY', 'GOLD', 'BTC'], note: 'Markets price 64% no-cut, 36% 25bp cut. Dot plot revised upward last meeting.' },
    { id: 'nfp-may',   date: '2026-05-01T12:30:00Z', category: 'data',    title: 'US Nonfarm Payrolls', impliedMove: 0.8, assets: ['DXY', 'TLT', 'SPX'],          note: 'Consensus +175k. Revisions watched after last month\'s -45k benchmark cut.' },
    { id: 'cpi-may',   date: '2026-05-13T12:30:00Z', category: 'data',    title: 'US CPI (April)',     impliedMove: 1.1, assets: ['DXY', 'TLT', 'GOLD'],         note: 'Core YoY consensus 2.9%. Sticky-services component is the read.' },
    { id: 'aapl-q2',   date: '2026-05-01T20:30:00Z', category: 'earnings', title: 'AAPL Q2 Earnings',   impliedMove: 4.2, assets: ['AAPL', 'NDX'],                note: 'Services growth + China gross-margin guide are the swing factors.' },
    { id: 'nvda-q1',   date: '2026-05-21T20:20:00Z', category: 'earnings', title: 'NVDA Q1 Earnings',   impliedMove: 7.6, assets: ['NVDA', 'SOXX', 'NDX'],        note: 'Hyperscaler capex commentary set the tone for the entire AI complex.' },
    { id: 'ecb-jun',   date: '2026-06-04T11:45:00Z', category: 'central', title: 'ECB Decision',        impliedMove: 0.6, assets: ['EUR', 'BUND'],                note: 'Lagarde signalled patience; market prices ~25% chance of June cut.' },
    { id: 'fomc-jun',  date: '2026-06-17T18:00:00Z', category: 'fed',     title: 'FOMC + SEP',          impliedMove: 1.6, assets: ['SPX', 'DXY', 'GOLD'],        note: 'Quarterly Summary of Economic Projections — dot plot risk both directions.' },
    { id: 'boj-jun',   date: '2026-06-13T03:00:00Z', category: 'central', title: 'BoJ Decision',        impliedMove: 0.9, assets: ['JPY', 'NKY'],                 note: 'JGB yield-curve normalization path is the focus, not the policy rate.' },
    { id: 'tsy-10y',   date: '2026-05-13T17:00:00Z', category: 'auction', title: '10Y Treasury Auction', impliedMove: 0.3, assets: ['TLT', 'DXY'],                note: 'Bid-to-cover and indirect take a tell on foreign demand.' },
    { id: 'pce-may',   date: '2026-05-30T12:30:00Z', category: 'data',    title: 'US Core PCE',          impliedMove: 0.7, assets: ['DXY', 'TLT'],                note: 'Fed\'s preferred inflation measure. 6m annualized run-rate matters more than YoY.' },
];

function useCountdown(targetIso) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const diff = new Date(targetIso).getTime() - now;
    if (diff <= 0) return { past: true, days: 0, hours: 0, mins: 0 };
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    return { past: false, days, hours, mins };
}

function CatalystCard({ event }) {
    const cd = useCountdown(event.date);
    const moveColor
        = event.impliedMove >= 5 ? 'text-red-400 border-red-500/30 bg-red-500/10'
        : event.impliedMove >= 2 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
        : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

    return (
        <div className="bg-surface-dark border border-white/5 rounded-2xl p-5 hover:border-white/15 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">
                        {new Date(event.date).toLocaleString(undefined, {
                            weekday: 'short', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                        })}
                    </p>
                    <h4 className="text-base font-bold text-white leading-tight">{event.title}</h4>
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${moveColor}`}>
                    ±{event.impliedMove.toFixed(1)}%
                </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed mb-4">{event.note}</p>

            <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                    {event.assets.map((a) => (
                        <span key={a} className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                            {a}
                        </span>
                    ))}
                </div>
                <div className="text-right">
                    {cd.past ? (
                        <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Settled</span>
                    ) : (
                        <span className="text-[10px] font-mono text-white tabular-nums">
                            <span className="text-primary font-bold">{cd.days}</span>d{' '}
                            <span className="text-primary font-bold">{cd.hours}</span>h{' '}
                            <span className="text-primary font-bold">{cd.mins}</span>m
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

const DashboardCatalysts = () => {
    const [filter, setFilter] = useState('all');
    const [now, setNow] = useState(() => Date.now());

    // Tick once a minute so events that pass midnight roll off without a refresh.
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(t);
    }, []);

    const visible = useMemo(() => {
        const upcoming = CATALYSTS.filter((c) => new Date(c.date).getTime() > now);
        const filtered = filter === 'all' ? upcoming : upcoming.filter((c) => c.category === filter);
        return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filter, now]);

    const next = visible[0];
    const nextCd = useCountdown(next?.date || new Date().toISOString());

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Catalyst Cockpit
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    What's coming.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Macro prints, central-bank decisions, and earnings that move the market.
                    Implied moves come from the options surface; ±% is the one-day move
                    currently being priced.
                </p>
            </header>

            {next && !nextCd.past && (
                <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-surface-dark to-background-dark p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-icons text-primary text-base">schedule</span>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-primary">Next up</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{next.title}</h2>
                    <p className="text-text-secondary text-sm mb-4 max-w-xl">{next.note}</p>
                    <div className="flex items-center gap-6 font-mono">
                        {[
                            { label: 'Days', value: nextCd.days },
                            { label: 'Hrs',  value: nextCd.hours },
                            { label: 'Min',  value: nextCd.mins },
                        ].map((u) => (
                            <div key={u.label}>
                                <div className="text-3xl font-bold text-white tabular-nums">{u.value}</div>
                                <div className="text-[9px] uppercase tracking-widest text-text-muted font-bold">{u.label}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visible.map((event) => (
                    <CatalystCard key={event.id} event={event} />
                ))}
                {visible.length === 0 && (
                    <p className="col-span-full text-center text-text-muted text-sm py-12">
                        No upcoming catalysts in this category.
                    </p>
                )}
            </div>

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Implied moves are illustrative · feeds via OptionMetrics integration in Q3
            </p>
        </div>
    );
};

export default DashboardCatalysts;
