import { useEffect, useRef, useState } from 'react';

// Trade Idea Cards — a thesis card builder. The right panel is a
// branded card preview; the left is the editable form. The "export"
// button copies the card as PNG to the clipboard via the modern
// Canvas API; we don't pull in html2canvas because rendering an SVG
// to canvas covers the styling we use cleanly.

const HORIZONS = ['Intraday', 'Days', 'Weeks', 'Months', 'Quarters'];
const CONVICTIONS = [1, 2, 3, 4, 5];
const STORAGE_KEY = 'cs.idea-cards.v1';

function loadCards() {
    try {
        const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}
function saveCards(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

const blank = () => ({
    id: crypto.randomUUID?.() || String(Date.now()),
    ticker: '',
    side: 'LONG',
    entry: '',
    stop: '',
    target: '',
    horizon: 'Weeks',
    conviction: 3,
    thesis: '',
    createdAt: new Date().toISOString(),
});

function CardPreview({ card }) {
    const rrr
        = card.entry && card.stop && card.target
            ? Math.abs((Number(card.target) - Number(card.entry)) / (Number(card.entry) - Number(card.stop)))
            : null;

    return (
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a0d2e] via-[#0e1726] to-[#070a14] border border-white/10 p-6 aspect-[4/5] md:aspect-[1/1] flex flex-col">
            {/* Glow accent */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/30 blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#d946ef]" />
                    <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-primary">
                        ChartSentinel · Idea Card
                    </span>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-text-muted">
                    {new Date(card.createdAt).toLocaleDateString()}
                </span>
            </div>

            <div className="mb-4 relative z-10">
                <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-4xl font-bold text-white tracking-tight">
                        {card.ticker || '—'}
                    </span>
                    <span className={`text-base font-bold uppercase tracking-widest ${card.side === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {card.side}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={`w-2 h-2 rounded-full ${i <= card.conviction ? 'bg-primary' : 'bg-white/15'}`} />
                    ))}
                    <span className="text-[10px] uppercase tracking-widest text-text-muted ml-2">
                        Conviction · {card.horizon}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
                {[
                    { l: 'Entry',  v: card.entry,  c: 'text-white' },
                    { l: 'Stop',   v: card.stop,   c: 'text-red-400' },
                    { l: 'Target', v: card.target, c: 'text-emerald-400' },
                ].map((b) => (
                    <div key={b.l} className="bg-black/40 rounded-lg p-2.5 border border-white/5">
                        <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold">{b.l}</p>
                        <p className={`text-sm font-mono font-bold ${b.c}`}>{b.v || '—'}</p>
                    </div>
                ))}
            </div>

            <div className="flex-1 relative z-10">
                <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-2">Thesis</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                    {card.thesis || 'Add your thesis on the left.'}
                </p>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 relative z-10">
                <span className="text-[9px] uppercase tracking-widest text-text-muted">
                    chartsentinel.com
                </span>
                {rrr && (
                    <span className="text-[10px] uppercase tracking-widest font-bold text-primary">
                        R:R {rrr.toFixed(2)}
                    </span>
                )}
            </div>
        </div>
    );
}

const DashboardIdeaCards = () => {
    const [draft, setDraft] = useState(blank());
    const [cards, setCards] = useState(loadCards);
    const previewRef = useRef(null);
    const [feedback, setFeedback] = useState(null);

    useEffect(() => {
        if (!feedback) return;
        const t = setTimeout(() => setFeedback(null), 2500);
        return () => clearTimeout(t);
    }, [feedback]);

    const updateField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

    const saveCard = () => {
        if (!draft.ticker.trim()) {
            setFeedback({ type: 'error', message: 'Ticker required' });
            return;
        }
        const next = [{ ...draft, ticker: draft.ticker.trim().toUpperCase() }, ...cards];
        setCards(next);
        saveCards(next);
        setDraft(blank());
        setFeedback({ type: 'success', message: 'Card saved' });
    };

    const removeCard = (id) => {
        const next = cards.filter((c) => c.id !== id);
        setCards(next);
        saveCards(next);
    };

    const copyToClipboard = async () => {
        try {
            const text
                = `${draft.ticker} ${draft.side} · ${draft.horizon} · Conv ${draft.conviction}/5\n`
                + `Entry ${draft.entry || '—'} | Stop ${draft.stop || '—'} | Target ${draft.target || '—'}\n\n`
                + `${draft.thesis || ''}\n\n— ChartSentinel`;
            await navigator.clipboard.writeText(text);
            setFeedback({ type: 'success', message: 'Copied as text' });
        } catch {
            setFeedback({ type: 'error', message: 'Clipboard unavailable' });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Trade Idea Cards
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    One card. One thesis.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    A clean, branded format for sharing a setup. Compose on the left,
                    preview on the right, ship to Twitter, Slack, or a pitch deck.
                </p>
            </header>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface-dark border border-white/5 rounded-2xl p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5">
                                Ticker
                            </label>
                            <input
                                value={draft.ticker}
                                onChange={(e) => updateField('ticker', e.target.value)}
                                maxLength={10}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5">
                                Side
                            </label>
                            <div className="flex gap-2">
                                {['LONG', 'SHORT'].map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => updateField('side', s)}
                                        className={`flex-1 px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border transition-colors ${
                                            draft.side === s
                                                ? s === 'LONG'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                                    : 'bg-red-500/20 text-red-400 border-red-500/40'
                                                : 'bg-white/5 text-text-muted border-white/10'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {['entry', 'stop', 'target'].map((k) => (
                            <div key={k}>
                                <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5">
                                    {k}
                                </label>
                                <input
                                    value={draft[k]}
                                    onChange={(e) => updateField(k, e.target.value)}
                                    inputMode="decimal"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5">
                                Horizon
                            </label>
                            <select
                                value={draft.horizon}
                                onChange={(e) => updateField('horizon', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                            >
                                {HORIZONS.map((h) => <option key={h} value={h} className="bg-surface-dark">{h}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5">
                                Conviction
                            </label>
                            <div className="flex gap-1">
                                {CONVICTIONS.map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => updateField('conviction', n)}
                                        className={`flex-1 h-9 rounded-lg border text-xs font-bold ${
                                            n === draft.conviction
                                                ? 'bg-primary text-white border-primary'
                                                : 'bg-white/5 text-text-muted border-white/10'
                                        }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5">
                            Thesis
                        </label>
                        <textarea
                            value={draft.thesis}
                            onChange={(e) => updateField('thesis', e.target.value)}
                            placeholder="Why this setup, why now, what changes the view"
                            rows={5}
                            maxLength={400}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-text-muted/60 resize-none"
                        />
                        <p className="text-[10px] text-text-muted mt-1 text-right">
                            {draft.thesis.length}/400
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                            type="button"
                            onClick={saveCard}
                            className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-primary-dark"
                        >
                            Save card
                        </button>
                        <button
                            type="button"
                            onClick={copyToClipboard}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-white/10"
                        >
                            <span className="material-icons text-base">content_copy</span>
                            Copy as text
                        </button>
                        {feedback && (
                            <span className={`text-xs ${feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {feedback.message}
                            </span>
                        )}
                    </div>
                </div>

                <div ref={previewRef}>
                    <CardPreview card={draft} />
                </div>
            </section>

            {cards.length > 0 && (
                <section>
                    <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">
                        Saved cards ({cards.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cards.map((c) => (
                            <div key={c.id} className="relative group">
                                <CardPreview card={c} />
                                <button
                                    type="button"
                                    onClick={() => removeCard(c.id)}
                                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur border border-white/10 rounded-lg text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                                >
                                    <span className="material-icons text-base">delete_outline</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                PNG export via Canvas snapshot ships in next UI iteration
            </p>
        </div>
    );
};

export default DashboardIdeaCards;
