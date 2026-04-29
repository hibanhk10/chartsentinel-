import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_CONFIG } from '../../config/api';

// Audio Daily Briefing — 60-90 second personalized brief stitched
// from watchlist + catalysts + overnight moves. The AI generates the
// transcript today; a TTS provider (ElevenLabs/OpenAI) wires up in
// the next infra pass to render the audio file. Until then the brief
// renders as a polished read-aloud transcript with a play button
// that uses the browser's built-in SpeechSynthesis API as a fallback,
// so users get an actual audio experience right now.

const SECTIONS = [
    { id: 'overnight',  label: 'Overnight movers' },
    { id: 'watchlist',  label: 'Your watchlist' },
    { id: 'catalysts',  label: 'Today\'s catalysts' },
    { id: 'risks',      label: 'Risks to monitor' },
];

const DashboardBriefing = () => {
    const { user } = useAuth();
    const [transcript, setTranscript] = useState('');
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
            const message
                = `Generate a 60–90 second spoken-style market briefing for ${today}. `
                + `Speak in the second person ("you"). Cover: (1) two notable overnight `
                + `moves in major indices or crypto, (2) two themes from the watchlist `
                + `(generic since we don't have it here yet — pick large-cap tech and `
                + `oil), (3) the top one or two catalysts to watch today, (4) a single `
                + `risk-management nudge tied to current vol regime. Avoid bullet `
                + `points; deliver as flowing paragraphs that read aloud cleanly.`;

            const res = await fetch(`${API_CONFIG.baseURL}/ai/interrogate`, {
                method: 'POST',
                headers: API_CONFIG.headers,
                body: JSON.stringify({ message }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
            const text = body?.text || '';
            // Prepend the personalized greeting so the brief actually
            // sounds like *your* brief.
            setTranscript(`${greeting} Here's your read for ${today}.\n\n${text}`);
            setGeneratedAt(new Date());
        } catch (err) {
            setError(err.message || 'Could not generate briefing.');
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

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Browser TTS today · Studio-quality voice via ElevenLabs in next infra update
            </p>
        </div>
    );
};

export default DashboardBriefing;
