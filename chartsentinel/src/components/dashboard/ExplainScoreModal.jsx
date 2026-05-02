import { useEffect, useState } from 'react';
import api from '../../services/api';

// Plain-English breakdown of a composite score, powered by Gemini via the
// /api/ai/explain-score endpoint. The caller passes the same components it
// already rendered so we don't pay the upstream Yahoo / CFTC round-trip
// twice. Mounted as a portal-less overlay — the parent owns the
// open/closed state via the `data` prop (null = closed).
//
// Props:
//   data    — { ticker, score, signal, components: { seasonal, cot, pattern } }
//             or null. The shape matches what the screener / watchlist
//             rows already have in scope.
//   onClose — fired on backdrop click, ESC, or the close button.

const ExplainScoreModal = ({ data, onClose }) => {
    const [state, setState] = useState({ status: 'idle', text: null, error: null });

    useEffect(() => {
        if (!data) {
            // Reset to idle when the modal closes so the next open starts
            // clean. The lint rule about set-state-in-effect doesn't apply
            // when the value derives directly from props transitioning to
            // null — there is no cascade because nothing else re-derives.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setState({ status: 'idle', text: null, error: null });
            return;
        }

        let active = true;
        setState({ status: 'loading', text: null, error: null });

        api
            .post('/ai/explain-score', {
                ticker: data.ticker,
                score: Math.round(data.score ?? 0),
                signal: data.signal || 'neutral',
                components: {
                    seasonal: data.components?.seasonal ?? 0,
                    cot: data.components?.cot ?? 0,
                    pattern: data.components?.pattern ?? 0,
                },
            })
            .then((resp) => active && setState({ status: 'ready', text: resp.text, error: null }))
            .catch((err) => active && setState({ status: 'error', text: null, error: err.message }));

        return () => {
            active = false;
        };
    }, [data]);

    useEffect(() => {
        if (!data) return;
        const onKey = (e) => e.key === 'Escape' && onClose?.();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [data, onClose]);

    if (!data) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-background-dark border border-white/10 rounded-2xl p-6 max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-white">{data.ticker}</h3>
                        <p className="text-xs text-text-muted mt-1">
                            Composite {data.score >= 0 ? '+' : ''}{Math.round(data.score)} · {data.signal}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                    {[
                        { label: 'Seasonal', value: data.components?.seasonal ?? 0 },
                        { label: 'COT', value: data.components?.cot ?? 0 },
                        { label: 'Pattern', value: data.components?.pattern ?? 0 },
                    ].map((c) => (
                        <div
                            key={c.label}
                            className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2"
                        >
                            <div className="text-text-muted">{c.label}</div>
                            <div
                                className={`font-mono font-semibold ${
                                    c.value > 5 ? 'text-emerald-300' : c.value < -5 ? 'text-red-300' : 'text-text-secondary'
                                }`}
                            >
                                {c.value >= 0 ? '+' : ''}{Math.round(c.value)}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 min-h-[7rem]">
                    {state.status === 'loading' && (
                        <div className="space-y-2">
                            <div className="h-3 bg-white/5 rounded w-5/6 animate-pulse" />
                            <div className="h-3 bg-white/5 rounded w-4/6 animate-pulse" />
                            <div className="h-3 bg-white/5 rounded w-3/4 animate-pulse" />
                        </div>
                    )}

                    {state.status === 'error' && (
                        <p className="text-sm text-red-300">
                            Could not generate breakdown: {state.error}
                        </p>
                    )}

                    {state.status === 'ready' && (
                        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                            {state.text}
                        </p>
                    )}
                </div>

                <p className="text-[10px] text-text-muted mt-3">
                    Informational only — not investment advice. Generated from the
                    component contributions shown above.
                </p>
            </div>
        </div>
    );
};

export default ExplainScoreModal;
