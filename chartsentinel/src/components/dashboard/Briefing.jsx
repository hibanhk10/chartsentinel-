import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

// Daily Briefing — wired to /api/ai/briefing, which pulls the user's
// watchlist + portfolio exposure + the next 7 days of macro events +
// recent headlines, and asks the LLM to compose a 4-paragraph brief.
// Server-side cached for 2 hours per user so a refresh inside the
// session is free; LLM only re-runs when the cache lapses or the user
// hits Regenerate.

const SECTIONS = [
    { id: 'overnight',  label: 'Overnight context' },
    { id: 'watchlist',  label: 'Your watchlist' },
    { id: 'catalysts',  label: 'Macro this week' },
    { id: 'risks',      label: 'Risk nudge' },
];

const DashboardBriefing = () => {
    const { user } = useAuth();
    const [transcript, setTranscript] = useState('');
    const [sources, setSources] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [speaking, setSpeaking] = useState(false);
    const [generatedAt, setGeneratedAt] = useState(null);

    const today = useMemo(() => new Date().toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric',
    }), []);

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
        const name = user?.name || user?.email?.split('@')[0] || 'Trader';
        return `Good ${part}, ${name}.`;
    }, [user]);

    const generate = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.post('/ai/briefing', {});
            const text = data?.transcript || '';
            setTranscript(`${greeting} Here's your read for ${today}.\n\n${text}`);
            setSources(data?.sources || null);
            setGeneratedAt(data?.generatedAt ? new Date(data.generatedAt) : new Date());
        } catch (err) {
            const code = err.response?.data?.code;
            if (code === 'AI_CAP_EXCEEDED') {
                setError("You've used today's AI prompts. Upgrade to keep generating briefings.");
            } else {
                setError(err.response?.data?.error || err.message || 'Could not generate briefing.');
            }
        } finally {
            setLoading(false);
        }
    };

    const speak = () => {
        if (!transcript) return;
        if (speaking) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }
        const utter = new SpeechSynthesisUtterance(transcript);
        utter.rate = 1.0;
        utter.pitch = 1.0;
        utter.onend = () => setSpeaking(false);
        utter.onerror = () => setSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
        setSpeaking(true);
    };

    // Stop speech when the tab unmounts so the user doesn't hear the
    // brief continuing while they're on the Signals page.
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Daily Briefing
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    {today}.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    A 60-second read of overnight moves, your watchlist, today's catalysts,
                    and the one risk worth watching. Generated fresh, read aloud on demand.
                </p>
            </header>

            <section className="bg-surface-dark border border-white/5 rounded-2xl p-6">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                    <button
                        type="button"
                        onClick={generate}
                        disabled={loading}
                        className="px-5 py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Generating…' : transcript ? 'Regenerate' : 'Generate brief'}
                    </button>
                    {transcript && (
                        <button
                            type="button"
                            onClick={speak}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-white/10"
                        >
                            <span className="material-icons text-base">
                                {speaking ? 'stop_circle' : 'play_circle'}
                            </span>
                            {speaking ? 'Stop' : 'Read aloud'}
                        </button>
                    )}
                    {generatedAt && (
                        <span className="text-[10px] uppercase tracking-widest text-text-muted ml-auto">
                            Generated {generatedAt.toLocaleTimeString()}
                        </span>
                    )}
                </div>

                {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

                {transcript ? (
                    <div className="bg-black/30 border border-white/5 rounded-xl p-5">
                        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                            {transcript}
                        </p>
                    </div>
                ) : (
                    <div className="bg-black/20 border border-dashed border-white/10 rounded-xl p-12 text-center">
                        <span className="material-icons text-4xl text-primary/60 mb-3">graphic_eq</span>
                        <p className="text-text-muted text-sm">Click "Generate brief" to start.</p>
                    </div>
                )}
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SECTIONS.map((s) => (
                    <div key={s.id} className="bg-surface-dark border border-white/5 rounded-xl p-3">
                        <p className="text-[9px] uppercase tracking-widest text-primary font-bold mb-1">{s.label}</p>
                        <p className="text-[11px] text-text-muted">Stitched into the brief</p>
                    </div>
                ))}
            </section>

            {sources && (
                <section className="bg-surface-dark border border-white/5 rounded-2xl p-5">
                    <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">
                        Inputs used
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
                        <div>
                            <p className="text-[9px] uppercase tracking-widest text-text-muted mb-1.5">Watchlist</p>
                            {sources.watchlist?.length ? (
                                <ul className="space-y-1">
                                    {sources.watchlist.slice(0, 5).map((w) => (
                                        <li key={w.ticker} className="text-text-secondary flex justify-between gap-2">
                                            <span className="font-bold text-text-primary">{w.ticker}</span>
                                            <span className="font-mono tabular-nums">
                                                {w.score === null || w.score === undefined ? '—' : `${w.score >= 0 ? '+' : ''}${w.score}`}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-text-muted">No tickers yet</p>
                            )}
                        </div>
                        <div>
                            <p className="text-[9px] uppercase tracking-widest text-text-muted mb-1.5">Top exposure</p>
                            {sources.topExposure?.length ? (
                                <ul className="space-y-1">
                                    {sources.topExposure.map((e) => (
                                        <li key={e.factor} className="text-text-secondary flex justify-between gap-2">
                                            <span className="uppercase font-bold text-text-primary">{e.factor}</span>
                                            <span className="font-mono tabular-nums">
                                                {(e.weight * 100).toFixed(0)}%
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-text-muted">No portfolio loaded</p>
                            )}
                        </div>
                        <div>
                            <p className="text-[9px] uppercase tracking-widest text-text-muted mb-1.5">Macro this week</p>
                            {sources.upcomingEvents?.length ? (
                                <ul className="space-y-1">
                                    {sources.upcomingEvents.slice(0, 4).map((e) => (
                                        <li key={`${e.type}-${e.date}`} className="text-text-secondary flex justify-between gap-2">
                                            <span className="uppercase font-bold text-text-primary">{e.type}</span>
                                            <span className="font-mono tabular-nums text-text-muted">
                                                {new Date(e.date + 'T12:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-text-muted">Nothing scheduled</p>
                            )}
                        </div>
                    </div>
                </section>
            )}

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Browser TTS today · Studio-quality voice via ElevenLabs in next infra update
            </p>
        </div>
    );
};

export default DashboardBriefing;
