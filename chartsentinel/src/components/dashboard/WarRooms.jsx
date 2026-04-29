import { useEffect, useMemo, useState } from 'react';

// War Rooms — scheduled audio rooms that go live around major macro
// events. Today this surface is a calendar + RSVP scaffold with a
// transparent "joining live" CTA; real audio (LiveKit / Daily.co)
// drops in once the infra is wired. RSVPs persist in localStorage so
// users see their plan without a backend round-trip.

const STORAGE_KEY = 'cs.war-rooms.rsvp.v1';

// Curated upcoming rooms tied to real 2026 prints. Update each
// quarter; past rooms drop off automatically.
const ROOMS = [
    {
        id: 'fomc-may',
        title: 'FOMC Live Read',
        date: '2026-05-07T17:50:00Z',
        durationMin: 90,
        host: 'thames-pm',
        coHosts: ['alpine-vol'],
        topic: 'Decision tape, dot plot, presser. Rate path repricing in real time.',
        capacity: 200,
        attending: 78,
    },
    {
        id: 'cpi-may',
        title: 'CPI April Print',
        date: '2026-05-13T12:25:00Z',
        durationMin: 60,
        host: 'frankfurt-1',
        coHosts: ['mumbai-fx'],
        topic: 'Core sticky-services read. DXY/TLT first-15-minute playbook.',
        capacity: 200,
        attending: 41,
    },
    {
        id: 'nvda-q1',
        title: 'NVDA Earnings Tape',
        date: '2026-05-21T20:15:00Z',
        durationMin: 90,
        host: 'bay-trader',
        coHosts: ['hk-arb'],
        topic: 'Hyperscaler capex commentary, Blackwell GMs, AI capex ripple-through.',
        capacity: 300,
        attending: 162,
    },
    {
        id: 'fomc-jun',
        title: 'June FOMC + SEP',
        date: '2026-06-17T17:50:00Z',
        durationMin: 120,
        host: 'thames-pm',
        coHosts: ['alpine-vol', 'paulista-1'],
        topic: 'Quarterly SEP — dot plot risk both directions. Cross-asset positioning.',
        capacity: 300,
        attending: 95,
    },
    {
        id: 'boj-jun',
        title: 'BoJ Decision Live',
        date: '2026-06-13T02:55:00Z',
        durationMin: 60,
        host: 'tokyo-prop',
        coHosts: [],
        topic: 'YCC normalization path. JPY + JGB curve reaction.',
        capacity: 150,
        attending: 33,
    },
];

function loadRsvps() {
    try {
        const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return v && typeof v === 'object' ? v : {};
    } catch {
        return {};
    }
}

function saveRsvps(r) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
}

function useTimer() {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(t);
    }, []);
    return now;
}

const DashboardWarRooms = () => {
    const now = useTimer();
    const [rsvps, setRsvps] = useState(loadRsvps);

    const sorted = useMemo(
        () => [...ROOMS].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        []
    );

    const liveOrUpcoming = useMemo(() => {
        return sorted
            .map((r) => {
                const start = new Date(r.date).getTime();
                const end = start + r.durationMin * 60_000;
                const status
                    = now >= end ? 'past'
                    : now >= start ? 'live'
                    : 'upcoming';
                return { ...r, _status: status, _start: start, _end: end };
            })
            .filter((r) => r._status !== 'past');
    }, [sorted, now]);

    const toggleRsvp = (id) => {
        const next = { ...rsvps, [id]: !rsvps[id] };
        if (!next[id]) delete next[id];
        setRsvps(next);
        saveRsvps(next);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        War Rooms
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    Live, around the prints.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Audio rooms that open 5 minutes before a major print and run through
                    the immediate reaction. Veteran members host; everyone listens. RSVP
                    so you get a reminder when the room goes live.
                </p>
            </header>

            <section className="space-y-3">
                {liveOrUpcoming.length === 0 ? (
                    <p className="text-text-muted text-sm py-12 text-center">
                        No rooms scheduled in the next window.
                    </p>
                ) : (
                    liveOrUpcoming.map((r) => {
                        const isLive = r._status === 'live';
                        const minsTo = Math.max(0, Math.floor((r._start - now) / 60_000));
                        const dateLabel = new Date(r.date).toLocaleString(undefined, {
                            weekday: 'short', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                        });
                        const rsvpd = Boolean(rsvps[r.id]);
                        const fillPct = (r.attending / r.capacity) * 100;

                        return (
                            <div
                                key={r.id}
                                className={`bg-surface-dark border rounded-2xl p-5 transition-colors ${
                                    isLive ? 'border-red-500/40' : 'border-white/5 hover:border-white/15'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {isLive ? (
                                                <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/15 text-red-400 flex items-center gap-1.5">
                                                    <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                                                    Live now
                                                </span>
                                            ) : (
                                                <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted">
                                                    Starts in {minsTo < 60 ? `${minsTo}m` : `${Math.floor(minsTo / 60)}h ${minsTo % 60}m`}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-text-muted">{dateLabel}</span>
                                        </div>
                                        <h3 className="text-base font-bold text-white">{r.title}</h3>
                                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">{r.topic}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleRsvp(r.id)}
                                        className={`flex-shrink-0 px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg border transition-colors ${
                                            isLive
                                                ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                                                : rsvpd
                                                ? 'bg-primary/15 text-primary border-primary/40'
                                                : 'bg-primary text-white border-primary hover:bg-primary-dark'
                                        }`}
                                    >
                                        {isLive ? 'Join now' : rsvpd ? '✓ RSVP\'d' : 'RSVP'}
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 text-[10px] text-text-muted">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-icons text-sm">mic</span>
                                        <span>@{r.host}</span>
                                        {r.coHosts.length > 0 && (
                                            <span>+ {r.coHosts.map((c) => `@${c}`).join(', ')}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-auto">
                                        <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${Math.min(100, fillPct)}%` }} />
                                        </div>
                                        <span>{r.attending}/{r.capacity}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </section>

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Calendar + RSVP today · Live audio (LiveKit) wires in next infra update
            </p>
        </div>
    );
};

export default DashboardWarRooms;
