import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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
    const [state, setState] = useState({ status: 'idle', text: null, error: null, usage: null, capExceeded: false });
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!data) {
            // Reset to idle when the modal closes so the next open starts
            // clean.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setState({ status: 'idle', text: null, error: null, usage: null, capExceeded: false });
            return;
        }

        let active = true;
        setState({ status: 'loading', text: null, error: null, usage: null, capExceeded: false });

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
            .then(
                (resp) =>
                    active &&
                    setState({
                        status: 'ready',
                        text: resp.text,
                        error: null,
                        usage: resp.usage ?? null,
                        capExceeded: false,
                    }),
            )
            .catch((err) => {
                if (!active) return;
                // The backend returns 429 with a structured body when the
                // daily cap is hit. api.js surfaces the error message; we
                // detect by content for now since the body itself is
                // dropped by the throw helper.
                const exhausted = /cap reached/i.test(err.message || '');
                setState({
                    status: 'error',
                    text: null,
                    error: err.message,
                    usage: null,
                    capExceeded: exhausted,
                });
            });

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
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-background-dark border border-white/10 rounded-2xl p-5 sm:p-6 max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto"
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

                    {state.status === 'error' && !state.capExceeded && (
                        <p className="text-sm text-red-300">
                            Could not generate breakdown: {state.error}
                        </p>
                    )}

                    {state.status === 'error' && state.capExceeded && (
                        <div className="text-sm text-text-secondary">
                            <p className="mb-3">
                                You've used today's free AI prompts. Upgrade to keep asking, or wait
                                until tomorrow when your daily budget resets.
                            </p>
                            <Link
                                to={isAuthenticated ? '/upgrade?to=pro' : '/funnel'}
                                className="inline-block text-[10px] uppercase tracking-widest font-bold text-white bg-primary rounded-full px-3 py-1.5 hover:bg-primary-dark transition-colors"
                            >
                                Upgrade for more prompts
                            </Link>
                        </div>
                    )}

                    {state.status === 'ready' && (
                        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                            {state.text}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between mt-3 gap-3">
                    <p className="text-[10px] text-text-muted">
                        Informational only — not investment advice.
                    </p>
                    {state.usage && (
                        <p className="text-[10px] text-text-muted tabular-nums">
                            <span className="text-primary font-bold">{state.usage.remaining}</span>
                            <span> / {state.usage.cap} prompts left today</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExplainScoreModal;
